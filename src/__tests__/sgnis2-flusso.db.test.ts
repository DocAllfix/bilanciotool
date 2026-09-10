import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { and, eq } from "drizzle-orm";

import { db } from "@/lib/db";
import {
  orgEntitlement,
  nis2Assessment,
  nis2ControlState,
  nis2Indicator,
  nis2IndicatorReading,
  nis2PhaseState,
  nis2Profile,
  nis2RequirementState,
  nis2System,
  company,
} from "@/lib/db/schema";
import { creaStudio, pulisciStudio, type Studio } from "./comune";
import { aggiornaAssetto, creaSistema } from "@/features/nis2/profilo";
import {
  caricaIndicatoriBase,
  creaIndicatore,
  getSistema,
  setCampoControllo,
  setCampoFase,
  setCampoIndicatore,
  setRilevazione,
} from "@/features/sgnis2/sistema";

// IL SISTEMA DI GESTIONE NIS2: controlli, roadmap, indicatori.
//
// ⚠️ Il test che conta di piu' e' «un controllo attuato con la verifica scaduta torna da
// verificare». E' la regola meno ovvia del modulo e l'unica che un lettore distratto
// toglierebbe credendo di semplificare: senza, un sistema di gestione resta verde sulla
// carta mentre smette di esistere, e un'ispezione ACN se ne accorge in dieci minuti
// chiedendo l'ultima evidenza.

const url = process.env.DATABASE_URL;
const run = Date.now();

/** Congelato: un test che dipende dall'orologio diventa rosso da solo a mezzanotte. */
const OGGI = new Date("2026-09-07T10:00:00.000Z");

describe.skipIf(!url)("NIS2: il sistema di gestione", () => {
  let S: Studio;

  beforeAll(async () => {
    S = await creaStudio({ prefisso: "sgnis2", run, nomeAzienda: "Reti Adriatiche S.p.A." });
    await db.insert(orgEntitlement).values({ organizationId: S.orgId, status: "active" });
    await creaSistema(S.userId, S.orgId, S.companyId);
  });

  afterAll(async () => {
    await db.delete(nis2IndicatorReading).where(eq(nis2IndicatorReading.organizationId, S.orgId));
    await db.delete(nis2Indicator).where(eq(nis2Indicator.organizationId, S.orgId));
    await db.delete(nis2PhaseState).where(eq(nis2PhaseState.organizationId, S.orgId));
    await db.delete(nis2ControlState).where(eq(nis2ControlState.organizationId, S.orgId));
    await db.delete(nis2RequirementState).where(eq(nis2RequirementState.organizationId, S.orgId));
    await db.delete(nis2Assessment).where(eq(nis2Assessment.organizationId, S.orgId));
    await db.delete(nis2System).where(eq(nis2System.organizationId, S.orgId));
    await db.delete(nis2Profile).where(eq(nis2Profile.organizationId, S.orgId));
    await pulisciStudio(S.orgId, S.userId);
  });

  it("i 68 controlli arrivano dal catalogo, tutti da fare", async () => {
    const s = await getSistema(S.userId, S.orgId, S.companyId, OGGI);
    expect(s!.controlli).toHaveLength(68);
    // Nessuno toccato: l'attuazione e' zero e i controlli restano NEL denominatore.
    expect(s!.attuazione).toBe(0);
    expect(s!.controlli.every((c) => c.dichiarato === "vuoto")).toBe(true);
  });

  it("⚠️ UN CONTROLLO ATTUATO CON LA VERIFICA SCADUTA TORNA «DA VERIFICARE»", async () => {
    // G-01 ha frequenza 365 giorni. Verificato nel 2020, oggi e' scaduto da anni.
    await setCampoControllo(S.userId, S.orgId, S.companyId, {
      controlKey: "G-01",
      campo: "stato",
      valore: "attuato",
    });
    await setCampoControllo(S.userId, S.orgId, S.companyId, {
      controlKey: "G-01",
      campo: "ultimaVerifica",
      valore: "2020-01-01",
    });

    const s = await getSistema(S.userId, S.orgId, S.companyId, OGGI);
    const g1 = s!.controlli.find((c) => c.id === "G-01")!;
    // Dichiarato attuato…
    expect(g1.dichiarato).toBe("attuato");
    // …ma effettivamente no, e questa e' la differenza che il modulo esiste per fare.
    expect(g1.effettivo).toBe("da_verificare");
    expect(g1.prossima).toBe("2020-12-31");
  });

  it("verificato di recente, resta attuato", async () => {
    await setCampoControllo(S.userId, S.orgId, S.companyId, {
      controlKey: "G-01",
      campo: "ultimaVerifica",
      valore: "2026-09-01",
    });
    const s = await getSistema(S.userId, S.orgId, S.companyId, OGGI);
    expect(s!.controlli.find((c) => c.id === "G-01")!.effettivo).toBe("attuato");
  });

  it("attuato SENZA nessuna verifica registrata: «da verificare»", async () => {
    // ⚠️ Dichiarare attuato e non registrare mai una verifica e' la stessa cosa di una
    // verifica scaduta: nessuno ha guardato. Trattarlo come attuato premierebbe chi non
    // registra, che e' l'opposto di cio' che serve.
    await setCampoControllo(S.userId, S.orgId, S.companyId, {
      controlKey: "G-02",
      campo: "stato",
      valore: "attuato",
    });
    const s = await getSistema(S.userId, S.orgId, S.companyId, OGGI);
    expect(s!.controlli.find((c) => c.id === "G-02")!.effettivo).toBe("da_verificare");
  });

  it("salvare un campo del controllo non ne azzera un altro", async () => {
    await setCampoControllo(S.userId, S.orgId, S.companyId, {
      controlKey: "G-03",
      campo: "stato",
      valore: "in_attuazione",
    });
    await setCampoControllo(S.userId, S.orgId, S.companyId, {
      controlKey: "G-03",
      campo: "responsabile",
      valore: "IT Manager",
    });
    await setCampoControllo(S.userId, S.orgId, S.companyId, {
      controlKey: "G-03",
      campo: "evidenza",
      valore: "Delibera 12/2026",
    });

    const [riga] = await db
      .select()
      .from(nis2ControlState)
      .where(
        and(eq(nis2ControlState.companyId, S.companyId), eq(nis2ControlState.controlKey, "G-03")),
      );
    expect(riga.stato).toBe("in_attuazione");
    expect(riga.responsabile).toBe("IT Manager");
    expect(riga.evidenza).toBe("Delibera 12/2026");
  });

  it("«non applicabile» esce dal denominatore dell'attuazione", async () => {
    const prima = (await getSistema(S.userId, S.orgId, S.companyId, OGGI))!.attuazione;
    await setCampoControllo(S.userId, S.orgId, S.companyId, {
      controlKey: "G-04",
      campo: "stato",
      valore: "non_applicabile",
    });
    const dopo = (await getSistema(S.userId, S.orgId, S.companyId, OGGI))!.attuazione;
    // Un controllo in meno nel denominatore: la percentuale non puo' scendere.
    expect(dopo).toBeGreaterThanOrEqual(prima);
  });

  it("un controllo che il catalogo non conosce viene RIFIUTATO", async () => {
    await expect(
      setCampoControllo(S.userId, S.orgId, S.companyId, {
        controlKey: "Z-99",
        campo: "stato",
        valore: "attuato",
      }),
    ).rejects.toThrow(/sconosciuto/i);
  });

  it("la roadmap ha cinque fasi che coprono i dodici capi una volta ciascuno", async () => {
    const s = await getSistema(S.userId, S.orgId, S.companyId, OGGI);
    const fasi = s!.roadmap.fasi;
    expect(fasi).toHaveLength(5);
    const coperti = fasi.flatMap((f) => f.capitoli);
    expect(new Set(coperti).size).toBe(coperti.length);
    expect(coperti).toHaveLength(12);
    // L'avanzamento di una fase viene dai controlli dei suoi capi.
    expect(fasi[0].avanzamento.applicabili).toBeGreaterThan(0);
  });

  it("⚠️ i termini della roadmap non dipendono dal fuso in cui gira il codice", async () => {
    await aggiornaAssetto(S.userId, S.orgId, S.companyId, { comunicazioneIl: "2026-01-15" });
    const s = await getSistema(S.userId, S.orgId, S.companyId, OGGI);
    // Il prototipo dava 2026-10-14 a Roma e 2026-10-15 in UTC: due scadenze diverse per
    // lo stesso dato, fra il portatile del consulente e le funzioni su Vercel.
    expect(s!.roadmap.termini.notifica).toBe("2026-10-15");
    expect(s!.roadmap.termini.misure).toBe("2027-07-15");
    expect(s!.roadmap.giorni.notifica).toBe(38);
  });

  it("senza comunicazione dall'Autorita' non ci sono termini, e non sono zero", async () => {
    await aggiornaAssetto(S.userId, S.orgId, S.companyId, { comunicazioneIl: "" });
    const s = await getSistema(S.userId, S.orgId, S.companyId, OGGI);
    expect(s!.roadmap.termini.notifica).toBeNull();
    expect(s!.roadmap.giorni.notifica).toBeNull();
    // La registrazione annuale invece c'e' sempre: non dipende dalla comunicazione.
    expect(s!.roadmap.termini.registrazione).toBe("2027-02-28");
    await aggiornaAssetto(S.userId, S.orgId, S.companyId, { comunicazioneIl: "2026-01-15" });
  });

  it("lo stato di una fase si dichiara, e una fase inventata viene rifiutata", async () => {
    await setCampoFase(S.userId, S.orgId, S.companyId, {
      phaseKey: "f1",
      campo: "stato",
      valore: "in_corso",
    });
    const s = await getSistema(S.userId, S.orgId, S.companyId, OGGI);
    expect(s!.roadmap.fasi.find((f) => f.key === "f1")!.stato!.stato).toBe("in_corso");

    await expect(
      setCampoFase(S.userId, S.orgId, S.companyId, {
        phaseKey: "f9",
        campo: "stato",
        valore: "completata",
      }),
    ).rejects.toThrow(/sconosciuta/i);
  });

  it("i diciannove indicatori di base si copiano, e rilanciare non sovrascrive", async () => {
    const aggiunti = await caricaIndicatoriBase(S.userId, S.orgId, S.companyId);
    expect(aggiunti).toBe(19);

    // Il consulente tara il target sull'azienda…
    const s = await getSistema(S.userId, S.orgId, S.companyId, OGGI);
    const g1 = s!.indicatori.find((i) => i.codice === "G-01")!;
    await setCampoIndicatore(S.userId, S.orgId, S.companyId, {
      id: g1.id,
      campo: "target",
      valore: "85",
    });

    // …e un secondo caricamento non glielo riporta a quello di catalogo.
    const ancora = await caricaIndicatoriBase(S.userId, S.orgId, S.companyId);
    expect(ancora).toBe(0);
    const dopo = await getSistema(S.userId, S.orgId, S.companyId, OGGI);
    expect(dopo!.indicatori.find((i) => i.codice === "G-01")!.target).toBe("85");
  });

  it("un indicatore col codice gia' usato viene rifiutato", async () => {
    await expect(
      creaIndicatore(S.userId, S.orgId, S.companyId, { codice: "G-01", nome: "Doppione" }),
    ).rejects.toThrow(/gi[àa] un indicatore/i);
  });

  it("le rilevazioni producono stato, andamento e scostamento", async () => {
    const s = await getSistema(S.userId, S.orgId, S.companyId, OGGI);
    const ind = s!.indicatori.find((i) => i.codice === "M-01")!;
    // Copertura MFA: target 100, soglia 95, crescente.
    for (const [periodo, valore] of [
      ["2026-01", "80"],
      ["2026-02", "92"],
      ["2026-03", "97"],
    ] as const) {
      await setRilevazione(S.userId, S.orgId, S.companyId, {
        indicatorId: ind.id,
        periodo,
        valore,
      });
    }

    const dopo = await getSistema(S.userId, S.orgId, S.companyId, OGGI);
    const m1 = dopo!.indicatori.find((i) => i.codice === "M-01")!;
    expect(m1.ultima!.periodo).toBe("2026-03");
    expect(m1.ultima!.valore).toBe(97);
    // 97 sotto il target di 100 ma sopra la soglia di 95.
    expect(m1.statoCalcolato).toBe("in_attenzione");
    expect(m1.andamento).toBe(1);
    expect(m1.scostamento).toBe(-3);
  });

  it("⚠️ il VERSO rovescia il giudizio a parita' di numeri", async () => {
    const s = await getSistema(S.userId, S.orgId, S.companyId, OGGI);
    // H-01 è il tasso di clic nel phishing: scendere è un risultato.
    const h1 = s!.indicatori.find((i) => i.codice === "H-01")!;
    expect(h1.verso).toBe("decrescente");
    await setRilevazione(S.userId, S.orgId, S.companyId, {
      indicatorId: h1.id,
      periodo: "2026-03",
      valore: "3",
    });
    const dopo = await getSistema(S.userId, S.orgId, S.companyId, OGGI);
    // Target 5, valore 3: per un indicatore da far scendere è un successo.
    expect(dopo!.indicatori.find((i) => i.codice === "H-01")!.statoCalcolato).toBe("a_target");
  });

  it("un valore che non e' un numero non entra", async () => {
    const s = await getSistema(S.userId, S.orgId, S.companyId, OGGI);
    const ind = s!.indicatori[0];
    await expect(
      setRilevazione(S.userId, S.orgId, S.companyId, {
        indicatorId: ind.id,
        periodo: "2026-04",
        valore: "circa novanta",
      }),
    ).rejects.toThrow();
  });

  it("senza il sistema avviato, le mutazioni non passano", async () => {
    // ⚠️ Una seconda azienda dello stesso studio, che il sistema non l'ha aperto: un
    // controllo non deve potersi scrivere su un percorso che non esiste. Senza questo, la
    // riga esisterebbe e la percentuale d'attuazione la conterebbe, su un'azienda che
    // nella schermata non ha nemmeno il modulo.
    const altra = `az-sgnis2-altra-${run}`;
    await db.insert(company).values({ id: altra, organizationId: S.orgId, nome: "Senza sistema" });
    try {
      await expect(
        setCampoControllo(S.userId, S.orgId, altra, {
          controlKey: "G-01",
          campo: "stato",
          valore: "attuato",
        }),
      ).rejects.toThrow(/non è stato avviato/i);

      const righe = await db
        .select()
        .from(nis2ControlState)
        .where(eq(nis2ControlState.companyId, altra));
      expect(righe).toHaveLength(0);
    } finally {
      await db.delete(company).where(eq(company.id, altra));
    }
  });
});
