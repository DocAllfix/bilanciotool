import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { briberyPartner, briberySystem, documentSnapshot, orgEntitlement } from "@/lib/db/schema";
import { creaStudio, pulisciStudio } from "./comune";
import {
  aggiornaProfilo,
  creaSistema,
  creaSocio,
  eliminaSocio,
  setCampoRequisito,
  setCampoSocio,
} from "@/features/anticorruzione/sistema";
import { getAnticorruzione, obblighiDelSocio } from "@/features/anticorruzione/queries";
import { publishMatricePcSnapshot, publishRelazionePcSnapshot } from "@/features/documents/snapshot";

// Il ciclo completo del modulo ISO 37001 sui FATTI DEL DATABASE.
//
// Il motore è già provato dai suoi test puri contro il golden del prototipo. Qui si
// prova l'altra metà: che i fatti scritti nel database, riletti e passati al motore,
// producano gli stessi numeri. È il punto in cui una colonna mappata sul campo
// sbagliato si vedrebbe — e non si vedrebbe in nessun test puro.

/** Il modello con il sistema garantito: `getAnticorruzione` restituisce l'azienda anche
 *  quando il sistema non c'e', e qui i test lo pretendono invece di ipotizzarlo. */
async function dati(userId: string, orgId: string, companyId: string) {
  const d = await getAnticorruzione(userId, orgId, companyId);
  if (!d?.sistema) throw new Error("il sistema non risulta creato");
  return d;
}

const RUN = Date.now();
let studio: Awaited<ReturnType<typeof creaStudio>>;
let systemId: string;

beforeAll(async () => {
  studio = await creaStudio({ prefisso: "pc", run: RUN, nomeAzienda: "Meccanica Sarda S.p.A." });
  await db.insert(orgEntitlement).values({ organizationId: studio.orgId, status: "active" });
  systemId = await creaSistema(studio.userId, studio.orgId, { companyId: studio.companyId });
});

afterAll(async () => {
  await pulisciStudio(studio.orgId, studio.userId);
});

describe("sistema", () => {
  it("congela il catalogo alla creazione e eredita la ragione sociale", async () => {
    const [s] = await db.select().from(briberySystem).where(eq(briberySystem.id, systemId));
    expect(s!.contentSetId).toBe("iso37001-v1");
    // La ragione sociale NON si richiede di nuovo: è il primo segnaposto del corpus, e
    // chiederla due volte è il modo più facile per farla divergere dal portafoglio.
    expect(s!.ragione).toBe("Meccanica Sarda S.p.A.");
    expect(s!.revisione).toBe("1.0");
  });

  it("un'azienda ha un sistema solo", async () => {
    await expect(creaSistema(studio.userId, studio.orgId, { companyId: studio.companyId })).rejects.toThrow();
  });

  it("il profilo si aggiorna a toppe parziali, senza toccare il resto", async () => {
    await aggiornaProfilo(studio.userId, studio.orgId, systemId, { direzione: "Ing. Cabras" });
    await aggiornaProfilo(studio.userId, studio.orgId, systemId, { funzionePc: "Dott.ssa Melis" });
    const [s] = await db.select().from(briberySystem).where(eq(briberySystem.id, systemId));
    // La prima toppa non è stata cancellata dalla seconda: è il difetto che questo
    // progetto ha già pagato tre volte (materialità, costi, quantità).
    expect(s!.direzione).toBe("Ing. Cabras");
    expect(s!.funzionePc).toBe("Dott.ssa Melis");
    expect(s!.ragione).toBe("Meccanica Sarda S.p.A.");
  });

  it("rifiuta un valore fuori dal dominio chiuso", async () => {
    await expect(
      aggiornaProfilo(studio.userId, studio.orgId, systemId, {
        organoGov: "Forse" as unknown as "Sì",
      }),
    ).rejects.toThrow();
  });
});

describe("soci in affari e livello di rischio", () => {
  let socioId: string;

  it("si crea con il solo nome", async () => {
    socioId = await creaSocio(studio.userId, studio.orgId, systemId, { nome: "Intermediaria Adriatica S.r.l." });
    const [p] = await db.select().from(briberyPartner).where(eq(briberyPartner.id, socioId));
    expect(p!.nome).toBe("Intermediaria Adriatica S.r.l.");
    expect(p!.stato).toBe("Attivo");
    // Nessuna dimensione valutata: NULL, non zero e non uno.
    expect(p!.dimPaese).toBeNull();
  });

  it("una sola dimensione a 4 porta a Critico — il caso limite del prototipo", async () => {
    await setCampoSocio(studio.userId, studio.orgId, socioId, { campo: "dimPaese", valore: 4 });
    const d = await dati(studio.userId, studio.orgId, studio.companyId);
    const s = d.soci.find((x) => x.id === socioId)!;
    // Se la media si facesse su quattro dimensioni sarebbe 1,0 → Basso, e a questo
    // socio non si chiederebbe nemmeno la due diligence.
    expect(s.livello).toBe("Critico");
    expect(s.sopraSoglia).toBe(true);
    expect(s.frequenzaDD).toBe(12);
  });

  it("i precedenti per corruzione portano a Critico qualunque sia la media", async () => {
    const altro = await creaSocio(studio.userId, studio.orgId, systemId, { nome: "Fornitura Minima S.r.l." });
    for (const campo of ["dimPaese", "dimPubbliciUfficiali", "dimNatura", "dimValore"] as const) {
      await setCampoSocio(studio.userId, studio.orgId, altro, { campo, valore: 1 });
    }
    let d = await dati(studio.userId, studio.orgId, studio.companyId);
    expect(d.soci.find((x) => x.id === altro)!.livello).toBe("Basso");

    await setCampoSocio(studio.userId, studio.orgId, altro, { campo: "flagPrecedenti", valore: true });
    d = await dati(studio.userId, studio.orgId, studio.companyId);
    expect(d.soci.find((x) => x.id === altro)!.livello).toBe("Critico");

    await eliminaSocio(studio.userId, studio.orgId, altro);
  });

  it("gli obblighi si assolvono uno per volta, e «Non applicabile» sulle clausole assolve", async () => {
    const oggi = new Date("2026-08-22T00:00:00Z");
    const stato = async () => {
      const [p] = await db.select().from(briberyPartner).where(eq(briberyPartner.id, socioId));
      return obblighiDelSocio(p!, oggi);
    };

    expect((await stato()).filter((o) => !o.assolto).length).toBe(5);

    await setCampoSocio(studio.userId, studio.orgId, socioId, { campo: "dueDiligenceIl", valore: "2026-06-01" });
    await setCampoSocio(studio.userId, studio.orgId, socioId, { campo: "politicaComunicata", valore: "Sì" });
    await setCampoSocio(studio.userId, studio.orgId, socioId, { campo: "impegni", valore: "Non fattibile, motivato" });
    await setCampoSocio(studio.userId, studio.orgId, socioId, { campo: "controlli", valore: "Adeguati" });
    expect((await stato()).filter((o) => !o.assolto).map((o) => o.obbligo.chiave)).toEqual(["clau"]);

    // ⚠️ SCOSTAMENTO VOLUTO dal prototipo: là «Non applicabile» lasciava l'obbligo
    // aperto nella scheda del socio, mentre l'indicatore lo contava assolto.
    await setCampoSocio(studio.userId, studio.orgId, socioId, { campo: "clausole", valore: "Non applicabile" });
    expect((await stato()).filter((o) => !o.assolto)).toHaveLength(0);
  });

  it("la provvigione dichiarata nel campo fa scattare la verifica del corrispettivo", async () => {
    // ⚠️ SCOSTAMENTO VOLUTO: il prototipo guardava solo il flag, quindi chi sceglieva
    // «A provvigione» senza spuntarlo non aveva l'obbligo.
    const prima = await dati(studio.userId, studio.orgId, studio.companyId);
    const n = prima.soci.find((x) => x.id === socioId)!.obblighi;

    await setCampoSocio(studio.userId, studio.orgId, socioId, { campo: "remunerazione", valore: "A provvigione" });
    const dopo = await dati(studio.userId, studio.orgId, studio.companyId);
    expect(dopo.soci.find((x) => x.id === socioId)!.obblighi).toBe(n + 1);
  });

  it("un rapporto cessato esce dagli indicatori ma resta nell'elenco", async () => {
    await setCampoSocio(studio.userId, studio.orgId, socioId, { campo: "stato", valore: "Cessato" });
    const d = await dati(studio.userId, studio.orgId, studio.companyId);
    expect(d.indicatori.sociTotali).toBe(1);
    expect(d.indicatori.sociAttivi).toBe(0);
    expect(d.indicatori.sopraSoglia).toBe(0);
    await setCampoSocio(studio.userId, studio.orgId, socioId, { campo: "stato", valore: "Attivo" });
  });

  it("una data non valida si rifiuta all'ingresso", async () => {
    // `new Date("2026-13-45")` non lancia: restituisce un Invalid Date, e quel valore
    // ha già fermato un pagamento in produzione. Qui si ferma dove costa un messaggio.
    await expect(
      setCampoSocio(studio.userId, studio.orgId, socioId, { campo: "dueDiligenceIl", valore: "2026-13-45" }),
    ).rejects.toThrow();
  });
});

describe("conformita' ai requisiti", () => {
  it("un requisito applicabile e non valutato pesa zero", async () => {
    const prima = await dati(studio.userId, studio.orgId, studio.companyId);
    const cap4 = prima.capitoli.find((c) => c.key === "4")!;
    expect(cap4.conformita).toBe(0);

    // Si valuta UN requisito del capitolo 4: la conformità del capitolo non diventa 100.
    const primo = prima.catalogo.requisiti.find((r) => r.chapterKey === "4")!;
    await setCampoRequisito(studio.userId, studio.orgId, systemId, {
      requirementKey: primo.key,
      campo: "stato",
      valore: "Conforme",
    });
    const dopo = await dati(studio.userId, studio.orgId, studio.companyId);
    const cap4b = dopo.capitoli.find((c) => c.key === "4")!;
    expect(cap4b.valutati).toBe(1);
    expect(cap4b.conformita).toBeGreaterThan(0);
    // ⚠️ Il prototipo qui direbbe 100. È lo scostamento documentato.
    expect(cap4b.conformita).toBeLessThan(100);
    expect(cap4b.conformita).toBe(Math.round(100 / cap4b.requisiti));
  });

  it("nota e stato sono campi distinti: scrivere l'una non cancella l'altro", async () => {
    const d = await dati(studio.userId, studio.orgId, studio.companyId);
    const r = d.catalogo.requisiti[0]!;
    await setCampoRequisito(studio.userId, studio.orgId, systemId, { requirementKey: r.key, campo: "stato", valore: "Conforme" });
    await setCampoRequisito(studio.userId, studio.orgId, systemId, { requirementKey: r.key, campo: "note", valore: "Verbale del 12 marzo" });
    const dopo = await dati(studio.userId, studio.orgId, studio.companyId);
    const s = dopo.statiRequisiti.find((x) => x.requirementKey === r.key)!;
    expect(s.stato).toBe("Conforme");
    expect(s.note).toBe("Verbale del 12 marzo");
  });

  it("rifiuta un requisito che non esiste nel catalogo di questo sistema", async () => {
    await expect(
      setCampoRequisito(studio.userId, studio.orgId, systemId, {
        requirementKey: "99.9.99",
        campo: "stato",
        valore: "Conforme",
      }),
    ).rejects.toThrow(/catalogo/i);
  });
});

describe("documenti", () => {
  it("pubblica la Relazione e la Matrice come revisioni senza esercizio", async () => {
    const rel = await publishRelazionePcSnapshot(studio.userId, studio.orgId, studio.companyId);
    const mat = await publishMatricePcSnapshot(studio.userId, studio.orgId, studio.companyId);

    const righe = await db
      .select()
      .from(documentSnapshot)
      .where(and(eq(documentSnapshot.companyId, studio.companyId), eq(documentSnapshot.organizationId, studio.orgId)));
    expect(righe).toHaveLength(2);
    for (const r of righe) {
      // Zero convenzionale: le revisioni formano una serie unica, e usare l'anno vero
      // spezzerebbe la numerazione al cambio di calendario.
      expect(r.anno).toBe(0);
      expect(r.versione).toBe(1);
    }
    expect(righe.map((r) => r.id).sort()).toEqual([rel, mat].sort());
  });

  it("la Matrice riporta TUTTI i requisiti, anche quelli non valutati", async () => {
    const [m] = await db
      .select()
      .from(documentSnapshot)
      .where(and(eq(documentSnapshot.companyId, studio.companyId), eq(documentSnapshot.tipo, "matrice_pc")));
    const dati = m!.dati as { capitoli: { requisiti: unknown[] }[]; requisitiTotali: number };
    const totale = dati.capitoli.reduce((a, c) => a + c.requisiti.length, 0);
    // Un elenco che mostrasse solo le risposte date racconterebbe un sistema completo
    // che non esiste: il vuoto è l'informazione più importante di un documento di
    // conformità.
    expect(totale).toBe(91);
    expect(dati.requisitiTotali).toBe(91);
  });

  it("lo snapshot non cambia quando cambiano i dati vivi", async () => {
    const [prima] = await db
      .select()
      .from(documentSnapshot)
      .where(and(eq(documentSnapshot.companyId, studio.companyId), eq(documentSnapshot.tipo, "relazione_pc")));
    const congelato = JSON.stringify(prima.dati);

    await aggiornaProfilo(studio.userId, studio.orgId, systemId, { direzione: "Dott. Sanna" });

    const [dopo] = await db
      .select()
      .from(documentSnapshot)
      .where(and(eq(documentSnapshot.companyId, studio.companyId), eq(documentSnapshot.tipo, "relazione_pc")));
    expect(JSON.stringify(dopo.dati)).toBe(congelato);
  });

  it("ripubblicare crea la revisione successiva", async () => {
    await publishRelazionePcSnapshot(studio.userId, studio.orgId, studio.companyId);
    const righe = await db
      .select()
      .from(documentSnapshot)
      .where(and(eq(documentSnapshot.companyId, studio.companyId), eq(documentSnapshot.tipo, "relazione_pc")));
    expect(righe.map((r) => r.versione).sort()).toEqual([1, 2]);
  });
});
