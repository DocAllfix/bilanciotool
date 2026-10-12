import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { documentCodice, documentSnapshot, orgEntitlement } from "@/lib/db/schema";
import { creaStudio, pulisciStudio, type Studio } from "./comune";
import { avviaSistema, creaRiga, setCampoRiga, setCampoSistema } from "@/features/gdpr/sistema";
import { publishGdprSnapshot, TIPI_GDPR } from "@/features/documents/snapshot";
import { DOCUMENTI, SENZA_ESERCIZIO, TIPI_DOCUMENTO } from "@/features/documents/tipi";
import { MODULI_AZIENDA } from "@/features/companies/moduli";
import { createElement as h } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { DocumentoGdpr } from "@/components/documento/documento-gdpr";
import { SENZA_IMMAGINI } from "@/components/documento/copertina";

// I sei documenti della protezione dei dati.
//
// ⚠️ Passano dalla strozzatura `salvaSnapshot`, e questo file lo PROVA: marchio, edizione
// dei contenuti, codice di verifica. E prova la regola che vale solo per questo modulo:
// dai registri delle richieste e delle violazioni nello snapshot entrano SOLO conteggi.
// Il collegamento del portale cliente serve tutti i documenti pubblicati dell'azienda, e
// una descrizione di violazione o una nota su una richiesta finirebbe lì dentro.

const url = process.env.DATABASE_URL;
const RUN = Date.now();
const OGGI = "2026-10-12";
const ESERCIZIO = 2026;
// Testi che NON devono comparire in nessuno snapshot: se ci sono, il perimetro è rotto.
const SEGRETO_VIOLAZIONE = `descrizione-riservata-${RUN}`;
const SEGRETO_VALUTAZIONE = `valutazione-riservata-${RUN}`;
const SEGRETO_RICHIESTA = `nota-riservata-${RUN}`;
const SEGRETO_RIFERIMENTO = `RIF-${RUN}`;

describe("il registro dei sei documenti", () => {
  it("sono tipi registrati, NON annuali, con pastiglie distinte, e li produce il percorso gdpr", () => {
    expect([...MODULI_AZIENDA.find((m) => m.href === "gdpr")!.documenti].sort()).toEqual([...TIPI_GDPR].sort());
    for (const t of TIPI_GDPR) {
      expect(TIPI_DOCUMENTO).toContain(t);
      // Nel ramo annuale la seconda relazione non sarebbe la revisione 2 della prima.
      expect(DOCUMENTI[t].mostraAnno, `${t} non deve essere annuale`).toBe(false);
    }
    const brevi = Object.values(DOCUMENTI).map((d) => d.breve);
    expect(new Set(brevi).size, "due tipi con la stessa pastiglia nel filtro dei documenti").toBe(brevi.length);
  });
});

describe.skipIf(!url)("pubblicazione dei sei documenti", () => {
  let S: Studio;
  let sys: string;

  beforeAll(async () => {
    S = await creaStudio({ prefisso: "gdpr-doc", run: RUN, nomeAzienda: "Meccanica dei documenti S.r.l." });
    await db.insert(orgEntitlement).values({ organizationId: S.orgId, status: "active" });
    sys = await avviaSistema(S.userId, S.orgId, { companyId: S.companyId });
    await setCampoSistema(S.userId, S.orgId, sys, "legale", "Amministratore unico");

    const t = await creaRiga(S.userId, S.orgId, sys, "trattamento", OGGI);
    await setCampoRiga(S.userId, S.orgId, "trattamento", t, "finalita", "Gestione del personale");

    const r = await creaRiga(S.userId, S.orgId, sys, "richiesta", OGGI);
    await setCampoRiga(S.userId, S.orgId, "richiesta", r, "note", SEGRETO_RICHIESTA);
    await setCampoRiga(S.userId, S.orgId, "richiesta", r, "riferimento", SEGRETO_RIFERIMENTO);

    const v = await creaRiga(S.userId, S.orgId, sys, "violazione", OGGI);
    await setCampoRiga(S.userId, S.orgId, "violazione", v, "conoscenzaIl", "2026-10-10T09:30");
    await setCampoRiga(S.userId, S.orgId, "violazione", v, "rischio", "Rischio");
    await setCampoRiga(S.userId, S.orgId, "violazione", v, "descrizione", SEGRETO_VIOLAZIONE);
    await setCampoRiga(S.userId, S.orgId, "violazione", v, "valutazione", SEGRETO_VALUTAZIONE);
  });

  afterAll(async () => {
    const snap = await db.select({ id: documentSnapshot.id }).from(documentSnapshot).where(eq(documentSnapshot.organizationId, S.orgId));
    for (const s of snap) await db.delete(documentCodice).where(eq(documentCodice.snapshotId, s.id));
    await db.delete(documentSnapshot).where(eq(documentSnapshot.organizationId, S.orgId));
    await pulisciStudio(S.orgId, S.userId);
  });

  it("si pubblicano tutti e sei, nella serie senza esercizio, col marchio, l'edizione e il codice", async () => {
    for (const tipo of TIPI_GDPR) {
      const id = await publishGdprSnapshot(S.userId, S.orgId, S.companyId, tipo, ESERCIZIO);
      const [snap] = await db.select().from(documentSnapshot).where(eq(documentSnapshot.id, id));
      expect(snap.tipo).toBe(tipo);
      expect(snap.anno).toBe(SENZA_ESERCIZIO);
      expect(snap.versione).toBe(1);
      const d = snap.dati as Record<string, unknown>;
      expect(d).toHaveProperty("marchio");
      expect(d.edizione).toBe("gdpr-v1");
      // L'esercizio della relazione sta DENTRO lo snapshot, non nella chiave.
      expect(d.esercizio).toBe(ESERCIZIO);
      const [cod] = await db.select().from(documentCodice).where(eq(documentCodice.snapshotId, id));
      expect(cod?.tipo).toBe(tipo);
    }
  });

  it("ogni snapshot si rende: titolo giusto, nessun «undefined», nessun «NaN»", async () => {
    // ⚠️ I PDF veri si provano nel collaudo della Fase 5; qui si coglie il template che si
    // rompe su un campo vuoto prima che lo veda un cliente. Lo snapshot è quasi vuoto di
    // proposito: è il caso in cui un template scritto sul dato pieno cede.
    const tutti = await db.select().from(documentSnapshot).where(eq(documentSnapshot.organizationId, S.orgId));
    for (const s of tutti) {
      const html = renderToStaticMarkup(
        h(DocumentoGdpr, { dati: s.dati as never, immagini: SENZA_IMMAGINI, tipo: s.tipo as (typeof TIPI_GDPR)[number] }),
      );
      expect(html, s.tipo).toContain("Meccanica dei documenti S.r.l.");
      expect(html, `${s.tipo} stampa «undefined»`).not.toMatch(/undefined/);
      expect(html, `${s.tipo} stampa «NaN»`).not.toMatch(/NaN/);
      expect(html, `${s.tipo} stampa «null»`).not.toMatch(/>null</);
    }
  });

  it("dei registri delle richieste e delle violazioni entrano SOLO conteggi", async () => {
    const tutti = await db.select().from(documentSnapshot).where(eq(documentSnapshot.organizationId, S.orgId));
    expect(tutti.length).toBeGreaterThanOrEqual(TIPI_GDPR.length);
    for (const s of tutti) {
      const testo = JSON.stringify(s.dati);
      for (const segreto of [SEGRETO_VIOLAZIONE, SEGRETO_VALUTAZIONE, SEGRETO_RICHIESTA, SEGRETO_RIFERIMENTO]) {
        expect(testo.includes(segreto), `${s.tipo} contiene «${segreto}»`).toBe(false);
      }
      // Ma i conteggi ci sono: il documento non ha taciuto che la violazione esiste.
      const d = s.dati as { registri: { corrente: { violazioni: number; richieste: number } } };
      expect(d.registri.corrente.violazioni).toBe(1);
      expect(d.registri.corrente.richieste).toBe(1);
    }
  });

  it("ripubblicare crea la versione 2, e la prima resta com'era", async () => {
    const [v1] = await db
      .select()
      .from(documentSnapshot)
      .where(and(eq(documentSnapshot.organizationId, S.orgId), eq(documentSnapshot.tipo, "registro_trattamenti")));
    await setCampoSistema(S.userId, S.orgId, sys, "legale", "Consiglio di amministrazione");
    const id2 = await publishGdprSnapshot(S.userId, S.orgId, S.companyId, "registro_trattamenti", ESERCIZIO);
    const [v2] = await db.select().from(documentSnapshot).where(eq(documentSnapshot.id, id2));
    expect(v2.versione).toBe(2);
    expect((v2.dati as { profilo: { legale: string } }).profilo.legale).toBe("Consiglio di amministrazione");
    const [ancora] = await db.select().from(documentSnapshot).where(eq(documentSnapshot.id, v1.id));
    expect((ancora.dati as { profilo: { legale: string } }).profilo.legale).toBe("Amministratore unico");
  });

  it("un esercizio fuori scala è rifiutato prima di scrivere", async () => {
    await expect(publishGdprSnapshot(S.userId, S.orgId, S.companyId, "relazione_privacy", 0)).rejects.toThrow(/Esercizio/);
  });
});
