import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { auditLog, orgEntitlement, wbChannel, wbReport, wbRequirementState, wbSystem } from "@/lib/db/schema";
import { creaStudio, pulisciStudio } from "./comune";
import {
  aggiornaProfilo,
  creaAssetto,
  creaFascicolo,
  eliminaFascicolo,
  setCampoCanale,
  setCampoFascicolo,
  setCampoRequisito,
} from "@/features/segnalazioni/sistema";
import { getFascicolo, getSegnalazioni } from "@/features/segnalazioni/queries";

// Il ciclo delle segnalazioni sui FATTI DEL DATABASE.
//
// I motori sono gia' provati dai loro test puri. Qui si prova l'altra meta': che i fatti
// scritti, riletti e passati ai motori diano gli stessi numeri — e le tre cose che in
// questo modulo esistono e negli altri no: il canale come censimento, il numero
// progressivo che non si ripete, e la lettura che si registra.

const RUN = Date.now();
let studio: Awaited<ReturnType<typeof creaStudio>>;
let systemId: string;

async function dati() {
  const d = await getSegnalazioni(studio.userId, studio.orgId, studio.companyId);
  if (!d?.assetto) throw new Error("l'assetto non risulta creato");
  return d;
}

beforeAll(async () => {
  studio = await creaStudio({ prefisso: "wbflow", run: RUN, nomeAzienda: "Molisana Trasporti S.r.l." });
  await db.insert(orgEntitlement).values({ organizationId: studio.orgId, status: "active" });
  systemId = await creaAssetto(studio.userId, studio.orgId, { companyId: studio.companyId });
});

afterAll(async () => {
  await db.delete(wbRequirementState).where(eq(wbRequirementState.organizationId, studio.orgId));
  await db.delete(wbReport).where(eq(wbReport.organizationId, studio.orgId));
  await db.delete(wbChannel).where(eq(wbChannel.organizationId, studio.orgId));
  await db.delete(wbSystem).where(eq(wbSystem.organizationId, studio.orgId));
  await pulisciStudio(studio.orgId, studio.userId);
});

describe("il canale nasce previsto e spento", () => {
  it("l'assetto crea le tre forme di legge, tutte non attive", async () => {
    const d = await dati();
    expect(d.canali.length).toBe(3);
    expect(d.canali.every((c) => !c.attiva)).toBe(true);
    // ⚠️ «previste e spente», non «mancanti»: il rimedio è accenderle, non istituirle.
    expect(d.canale.stato.dichiarateNonAttive).toEqual(["Scritta", "Orale", "Incontro diretto"]);
    expect(d.canale.stato.mancanti).toEqual([]);
    expect(d.canale.stato.conforme).toBe(false);
  });

  it("accendendo solo la forma scritta il canale resta non conforme", async () => {
    const d = await dati();
    const scritta = d.canali.find((c) => c.forma === "Scritta")!;
    await setCampoCanale(studio.userId, studio.orgId, scritta.id, { campo: "attiva", valore: true });

    const dopo = await dati();
    expect(dopo.canale.stato.conforme).toBe(false);
    expect(dopo.canale.stato.coperte).toEqual(["Scritta"]);
    expect(dopo.canale.stato.dichiarateNonAttive).toEqual(["Orale", "Incontro diretto"]);
  });

  it("con tutte e tre accese diventa conforme", async () => {
    const d = await dati();
    for (const c of d.canali.filter((x) => !x.attiva)) {
      await setCampoCanale(studio.userId, studio.orgId, c.id, { campo: "attiva", valore: true });
    }
    const dopo = await dati();
    expect(dopo.canale.stato.conforme).toBe(true);
    expect(dopo.canale.stato.mancanti).toEqual([]);
  });

  it("la consultazione sindacale si giudica sulle date scritte", async () => {
    const d = await dati();
    for (const c of d.canali) {
      await setCampoCanale(studio.userId, studio.orgId, c.id, { campo: "attivatoIl", valore: "2026-02-01" });
    }
    // Nessuna consultazione registrata, canali accesi: assente.
    expect((await dati()).canale.consultazione).toBe("assente");

    await aggiornaProfilo(studio.userId, studio.orgId, systemId, { consultazioneSindacale: "2026-03-01" });
    expect((await dati()).canale.consultazione).toBe("tardiva");

    await aggiornaProfilo(studio.userId, studio.orgId, systemId, { consultazioneSindacale: "2026-01-10" });
    expect((await dati()).canale.consultazione).toBe("ok");
  });

  it("la condivisione si giudica sul numero di addetti, e senza numero non si giudica", async () => {
    expect((await dati()).canale.condivisioneAmmessa).toBeNull();
    await aggiornaProfilo(studio.userId, studio.orgId, systemId, { addetti: "80" });
    expect((await dati()).canale.condivisioneAmmessa).toBe(true);
    await aggiornaProfilo(studio.userId, studio.orgId, systemId, { addetti: "1.200" });
    expect((await dati()).canale.condivisioneAmmessa).toBe(false);
  });
});

describe("il numero progressivo non si riusa", () => {
  it("⚠️ dopo una cancellazione il numero successivo NON torna indietro", async () => {
    // È il difetto B6 del prototipo: `righe.length + 1` faceva sì che, cancellato il
    // secondo di tre fascicoli, il quarto nascesse col numero 3 — cioè con lo stesso
    // riferimento di un fascicolo esistente. I registri delle ritorsioni e degli accessi
    // rimandano al fascicolo per numero: da quel momento puntavano a due cose.
    const uno = await creaFascicolo(studio.userId, studio.orgId, systemId, {
      dataRicezione: "2026-01-10", canale: "Scritto informatico", anonima: false,
    });
    const due = await creaFascicolo(studio.userId, studio.orgId, systemId, {
      dataRicezione: "2026-01-12", canale: "Orale telefonico", anonima: true,
    });
    const tre = await creaFascicolo(studio.userId, studio.orgId, systemId, {
      dataRicezione: "2026-01-15", canale: "Incontro diretto", anonima: false,
    });
    expect([uno.numero, due.numero, tre.numero]).toEqual([1, 2, 3]);

    await eliminaFascicolo(studio.userId, studio.orgId, due.id);
    const quattro = await creaFascicolo(studio.userId, studio.orgId, systemId, {
      dataRicezione: "2026-01-20", canale: "Altro", anonima: false,
    });
    expect(quattro.numero).toBe(4);

    const numeri = (await dati()).fascicoli.map((f) => f.numero);
    expect(numeri).toEqual([1, 3, 4]);
  });

  it("⚠️ nemmeno cancellando l'ULTIMO: è il caso che `max + 1` non copriva", async () => {
    // Questo test è nato da un rosso del collaudo dell'interfaccia, non da un'intuizione.
    // La versione precedente calcolava `max(numero) + 1`: cancellando un fascicolo in
    // mezzo funzionava — ed è l'unico caso che questo file provava — ma cancellando il
    // PIÙ ALTO il massimo scendeva e il numero veniva riusato. Il vincolo di unicità non
    // poteva vederlo: la riga vecchia non esiste più, quindi non c'è nessun conflitto.
    //
    // Il danno è nei registri: ritorsioni, accessi ed eventi di riservatezza rimandano
    // al fascicolo per NUMERO, e il «5» nuovo erediterebbe in silenzio i rimandi del «5»
    // cancellato — cioè accessi e contestazioni attribuiti al caso sbagliato.
    const cinque = await creaFascicolo(studio.userId, studio.orgId, systemId, {
      dataRicezione: "2026-02-01", canale: "Altro", anonima: false,
    });
    await eliminaFascicolo(studio.userId, studio.orgId, cinque.id);

    const dopo = await creaFascicolo(studio.userId, studio.orgId, systemId, {
      dataRicezione: "2026-02-02", canale: "Altro", anonima: false,
    });
    expect(dopo.numero).toBeGreaterThan(cinque.numero);

    // E il contatore vive sull'assetto, non si deduce dalle righe rimaste.
    const [s] = await db.select().from(wbSystem).where(eq(wbSystem.id, systemId));
    expect(s.ultimoNumero).toBe(dopo.numero);
  });
});

describe("il fascicolo si aggiorna un campo per volta", () => {
  let reportId: string;

  beforeAll(async () => {
    const f = await creaFascicolo(studio.userId, studio.orgId, systemId, {
      dataRicezione: "2026-03-25", canale: "Scritto informatico", anonima: false,
    });
    reportId = f.id;
  });

  it("un campo passa", async () => {
    await setCampoFascicolo(studio.userId, studio.orgId, reportId, { ambito: "Appalti pubblici" });
    const f = await getFascicolo(studio.userId, studio.orgId, reportId);
    expect(f?.ambito).toBe("Appalti pubblici");
  });

  it("⚠️ due campi insieme vengono RIFIUTATI", async () => {
    // Non è pignoleria: la scheda ha un pannello che ricalcola ammissibilità, ritorsione
    // e termini a ogni tocco, cioè la forma in cui questo progetto ha già preso lo
    // stesso difetto tre volte. Rimandare più campi da props stantie azzera quello
    // salvato un attimo prima. Il rifiuto rende la regola meccanica.
    await expect(
      setCampoFascicolo(studio.userId, studio.orgId, reportId, {
        ambito: "Salute pubblica",
        oggetto: "riscritto da props",
      }),
    ).rejects.toThrow();

    const f = await getFascicolo(studio.userId, studio.orgId, reportId);
    expect(f?.ambito, "il primo valore è sopravvissuto").toBe("Appalti pubblici");
  });

  it("una chiave che non è un campo del fascicolo viene rifiutata", async () => {
    // `.strict()`: senza, `organizationId` sarebbe scartata in silenzio. Scartata va
    // bene finché nessuno la usa; rifiutata resta vero anche dopo.
    await expect(
      setCampoFascicolo(studio.userId, studio.orgId, reportId, {
        organizationId: "org-di-un-altro",
      } as never),
    ).rejects.toThrow();
  });

  it("i termini di legge escono dalle stesse funzioni pure", async () => {
    // Il 25 marzo è il caso in cui il prototipo perdeva un giorno sul cambio d'ora.
    const { avvisoEntro, riscontroEntro } = await import("@/lib/calc/segnalazioni/termini");
    const f = await getFascicolo(studio.userId, studio.orgId, reportId);
    expect(avvisoEntro(f!.dataRicezione)).toBe("2026-04-01");
    expect(riscontroEntro(f!.dataRicezione, f!.avvisoReso)).toBe("2026-07-01");

    await setCampoFascicolo(studio.userId, studio.orgId, reportId, { avvisoReso: "2026-03-30" });
    const dopo = await getFascicolo(studio.userId, studio.orgId, reportId);
    // Reso l'avviso, i tre mesi decorrono da lì e non dalla scadenza dei sette giorni.
    expect(riscontroEntro(dopo!.dataRicezione, dopo!.avvisoReso)).toBe("2026-06-30");
  });

  it("⚠️ aprire il fascicolo LASCIA UNA RIGA nel registro", async () => {
    // È l'unica lettura del prodotto che scrive, e la ragione è che un registro degli
    // accessi compilato a mano dopo la contestazione non ha valore probatorio.
    const prima = await db
      .select()
      .from(auditLog)
      .where(and(eq(auditLog.organizationId, studio.orgId), eq(auditLog.azione, "segnalazioni.fascicolo.read")));

    await getFascicolo(studio.userId, studio.orgId, reportId);

    const dopo = await db
      .select()
      .from(auditLog)
      .where(and(eq(auditLog.organizationId, studio.orgId), eq(auditLog.azione, "segnalazioni.fascicolo.read")));
    expect(dopo.length).toBe(prima.length + 1);
    expect(dopo[dopo.length - 1].entitaId).toBe(reportId);
  });

  it("l'audit delle scritture porta il campo, mai il contenuto", async () => {
    // Il registro è consultabile da chi amministra lo studio, il fascicolo no:
    // registrare qui i fatti segnalati li farebbe uscire da una porta che nessuno guarda.
    await setCampoFascicolo(studio.userId, studio.orgId, reportId, {
      fatti: "SEGRETO-DA-NON-VEDERE-NEL-REGISTRO",
    });
    const righe = await db
      .select()
      .from(auditLog)
      .where(and(eq(auditLog.organizationId, studio.orgId), eq(auditLog.azione, "segnalazioni.fascicolo.set")));
    const testo = JSON.stringify(righe.map((r) => r.dettagli));
    expect(testo).toContain("fatti");
    expect(testo).not.toContain("SEGRETO-DA-NON-VEDERE-NEL-REGISTRO");
  });

  it("l'elenco dei fascicoli non porta il contenuto", async () => {
    // Se lo portasse, l'audit sulla lettura sarebbe una formalità: i fatti sarebbero
    // già usciti aprendo il registro, senza che nessuno risulti averli visti.
    const d = await dati();
    expect(JSON.stringify(d.fascicoli)).not.toContain("SEGRETO-DA-NON-VEDERE-NEL-REGISTRO");
  });
});

describe("la conformita' agli 82 requisiti", () => {
  it("senza valutazioni l'indice e' zero, non cento", async () => {
    // La regola comune: un requisito applicabile e non valutato pesa zero. Mediare sui
    // soli valutati farebbe salire l'indice man mano che si saltano i difficili.
    const d = await dati();
    expect(d.conformita.totale).toBe(82);
    expect(d.conformita.valutati).toBe(0);
    expect(d.conformita.indice).toBe(0);
  });

  it("«non applicabile» esce dal denominatore, «conforme» alza l'indice", async () => {
    const d = await dati();
    const capoA = d.requisiti.filter((r) => r.chapterKey === "A");
    expect(capoA.length).toBeGreaterThan(1);

    for (const r of capoA) {
      await setCampoRequisito(studio.userId, studio.orgId, systemId, {
        requirementKey: r.key, campo: "stato", valore: "Conforme",
      });
    }
    const dopo = await dati();
    const a = dopo.conformita.perCapitolo.find((c) => c.capitolo.key === "A")!;
    expect(a.indice).toBe(100);
    expect(a.valutati).toBe(capoA.length);

    // Un solo «non applicabile» non abbassa il capitolo: esce dal conto.
    await setCampoRequisito(studio.userId, studio.orgId, systemId, {
      requirementKey: capoA[0].key, campo: "stato", valore: "Non applicabile",
    });
    const dopo2 = await dati();
    expect(dopo2.conformita.perCapitolo.find((c) => c.capitolo.key === "A")!.indice).toBe(100);
  });
});
