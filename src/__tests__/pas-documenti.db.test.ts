import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { documentCodice, documentSnapshot, orgEntitlement, pasRischio } from "@/lib/db/schema";
import { creaStudio, pulisciStudio, type Studio } from "./comune";
import { avviaSistema, creaRiga, setCampoRiga, setCampoSistema, setMisura } from "@/features/pas/sistema";
import { publishPasSnapshot, TIPI_PAS } from "@/features/documents/snapshot";
import { DOCUMENTI, SENZA_ESERCIZIO, TIPI_DOCUMENTO } from "@/features/documents/tipi";
import { MODULI_AZIENDA } from "@/features/companies/moduli";
import { createElement as h } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { DocumentoPas } from "@/components/documento/documento-pas";
import { SENZA_IMMAGINI } from "@/components/documento/copertina";

// I quattro documenti del sistema di gestione sociale.
//
// ⚠️ Passano dalla strozzatura `salvaSnapshot`, e questo file lo PROVA: marchio, edizione dei
// contenuti, codice di verifica. E prova la regola del perimetro: dai registri nello snapshot
// entrano SOLO conteggi. Il collegamento del portale cliente serve tutti i documenti
// pubblicati dell'azienda, e l'oggetto di un reclamo — che parla di un lavoratore — finirebbe
// lì dentro. L'eccezione dichiarata sono le decisioni del riesame, che sono il verbale.

const url = process.env.DATABASE_URL;
const RUN = Date.now();
const OGGI = "2026-10-16";
const ESERCIZIO = 2026;
const NOME = "Officine dei documenti S.r.l.";
// Testi che NON devono comparire in nessuno snapshot: se ci sono, il perimetro è rotto.
const SEGRETI = {
  oggettoReclamo: `oggetto-riservato-${RUN}`,
  istruttoria: `istruttoria-riservata-${RUN}`,
  descrizioneNc: `descrizione-nc-riservata-${RUN}`,
  causaNc: `causa-nc-riservata-${RUN}`,
  argomentiConsultazione: `argomenti-riservati-${RUN}`,
  sintesiAudit: `sintesi-audit-riservata-${RUN}`,
};
const DECISIONE = `Azione decisa ${RUN}`;

describe("il registro dei quattro documenti", () => {
  it("sono tipi registrati, NON annuali, con pastiglie distinte, e li produce il percorso pas24000", () => {
    expect([...MODULI_AZIENDA.find((m) => m.href === "pas24000")!.documenti].sort()).toEqual([...TIPI_PAS].sort());
    for (const t of TIPI_PAS) {
      expect(TIPI_DOCUMENTO).toContain(t);
      expect(DOCUMENTI[t].mostraAnno, `${t} non deve essere annuale`).toBe(false);
    }
    const brevi = Object.values(DOCUMENTI).map((d) => d.breve);
    expect(new Set(brevi).size, "due tipi con la stessa pastiglia nel filtro dei documenti").toBe(brevi.length);
    const file = Object.values(DOCUMENTI).map((d) => d.file);
    expect(new Set(file).size, "due tipi con lo stesso nome di file").toBe(file.length);
  });
});

describe.skipIf(!url)("pubblicazione dei quattro documenti", () => {
  let S: Studio;
  let sys: string;

  beforeAll(async () => {
    S = await creaStudio({ prefisso: "pas-doc", run: RUN, nomeAzienda: NOME });
    await db.insert(orgEntitlement).values({ organizationId: S.orgId, status: "active" });
    sys = await avviaSistema(S.userId, S.orgId, { companyId: S.companyId });
    await setCampoSistema(S.userId, S.orgId, sys, "direzione", "Amministratore unico");

    // Un rischio alto senza misure, così il manuale ha una riga da segnalare.
    const [r] = await db.select().from(pasRischio).where(eq(pasRischio.systemId, sys)).limit(1);
    await setCampoRiga(S.userId, S.orgId, "rischio", r.id, "probabilita", "4");
    await setCampoRiga(S.userId, S.orgId, "rischio", r.id, "gravita", "5");

    // Tre fornitori, uno solo con la clausola: la quota è 33,3%, cioè un decimale vero da
    // stampare all'italiana. Senza, il controllo sulla virgola non avrebbe niente da vedere.
    for (let i = 0; i < 3; i++) {
      const fo = await creaRiga(S.userId, S.orgId, sys, "fornitore", OGGI);
      await setCampoRiga(S.userId, S.orgId, "fornitore", fo, "nome", `Fornitore ${i + 1}`);
      if (i === 0) await setCampoRiga(S.userId, S.orgId, "fornitore", fo, "clausola", true);
    }

    // Indicatori con un ingresso mancante: il divario di genere non deve uscire 100%.
    await setMisura(S.userId, S.orgId, sys, { anno: ESERCIZIO, chiave: "lav_tot", valore: "48" });
    await setMisura(S.userId, S.orgId, sys, { anno: ESERCIZIO, chiave: "lav_don", valore: "14" });
    await setMisura(S.userId, S.orgId, sys, { anno: ESERCIZIO, chiave: "re_uom", valore: "31.200" });

    const rec = await creaRiga(S.userId, S.orgId, sys, "reclamo", OGGI);
    await setCampoRiga(S.userId, S.orgId, "reclamo", rec, "oggetto", SEGRETI.oggettoReclamo);
    await setCampoRiga(S.userId, S.orgId, "reclamo", rec, "istruttoria", SEGRETI.istruttoria);
    const nc = await creaRiga(S.userId, S.orgId, sys, "nonConformita", OGGI);
    await setCampoRiga(S.userId, S.orgId, "nonConformita", nc, "descrizione", SEGRETI.descrizioneNc);
    await setCampoRiga(S.userId, S.orgId, "nonConformita", nc, "cause", SEGRETI.causaNc);
    const co = await creaRiga(S.userId, S.orgId, sys, "consultazione", OGGI);
    await setCampoRiga(S.userId, S.orgId, "consultazione", co, "argomenti", SEGRETI.argomentiConsultazione);
    const au = await creaRiga(S.userId, S.orgId, sys, "audit", OGGI);
    await setCampoRiga(S.userId, S.orgId, "audit", au, "sintesi", SEGRETI.sintesiAudit);
    const ri = await creaRiga(S.userId, S.orgId, sys, "riesame", OGGI);
    await setCampoRiga(S.userId, S.orgId, "riesame", ri, "azioni", DECISIONE);
  });

  afterAll(async () => {
    const snap = await db.select({ id: documentSnapshot.id }).from(documentSnapshot).where(eq(documentSnapshot.organizationId, S.orgId));
    for (const s of snap) await db.delete(documentCodice).where(eq(documentCodice.snapshotId, s.id));
    await db.delete(documentSnapshot).where(eq(documentSnapshot.organizationId, S.orgId));
    await pulisciStudio(S.orgId, S.userId);
  });

  it("si pubblicano tutti e quattro, nella serie senza esercizio, col marchio, l'edizione e il codice", async () => {
    for (const tipo of TIPI_PAS) {
      const id = await publishPasSnapshot(S.userId, S.orgId, S.companyId, tipo, ESERCIZIO);
      const [snap] = await db.select().from(documentSnapshot).where(eq(documentSnapshot.id, id));
      expect(snap.tipo).toBe(tipo);
      expect(snap.anno).toBe(SENZA_ESERCIZIO);
      expect(snap.versione).toBe(1);
      const d = snap.dati as Record<string, unknown>;
      expect(d).toHaveProperty("marchio");
      expect(d.edizione).toBe("pas-v1");
      expect(d.esercizio).toBe(ESERCIZIO);
      const [cod] = await db.select().from(documentCodice).where(eq(documentCodice.snapshotId, id));
      expect(cod?.tipo).toBe(tipo);
    }
  });

  it("ogni snapshot si rende: nome giusto, nessun «undefined», «NaN», «null», punto decimale o 100% inventato", async () => {
    const tutti = await db.select().from(documentSnapshot).where(eq(documentSnapshot.organizationId, S.orgId));
    expect(tutti).toHaveLength(TIPI_PAS.length);
    for (const s of tutti) {
      const html = renderToStaticMarkup(h(DocumentoPas, { dati: s.dati as never, immagini: SENZA_IMMAGINI, tipo: s.tipo as (typeof TIPI_PAS)[number] }));
      expect(html, s.tipo).toContain(NOME);
      expect(html, `${s.tipo} stampa «undefined»`).not.toMatch(/undefined/);
      expect(html, `${s.tipo} stampa «NaN»`).not.toMatch(/NaN/);
      expect(html, `${s.tipo} stampa «null»`).not.toMatch(/>null</);
      expect(html, `${s.tipo} stampa una percentuale col punto`).not.toMatch(/\d\.\d+%/);
      // Plurali: «1 rischi», «1 fornitori», «1 interventi» sono la firma del plurale attaccato.
      expect(html, `${s.tipo} sbaglia un plurale`).not.toMatch(/\b1 (rischi|fornitori|interventi|rilievi|giorni)\b/);
      if (s.tipo === "manuale_pas") {
        // Il divario di genere, senza la retribuzione delle donne, NON è 100%: è un trattino.
        expect(html).not.toMatch(/Divario retributivo di genere[^%]*100/);
        expect(html).toContain("33,3%");
        expect(html).toContain("29,2");
      }
    }
  });

  it("dei registri entrano SOLO conteggi, ma le decisioni del riesame sì", async () => {
    const tutti = await db.select().from(documentSnapshot).where(eq(documentSnapshot.organizationId, S.orgId));
    for (const s of tutti) {
      const testo = JSON.stringify(s.dati);
      for (const [nome, segreto] of Object.entries(SEGRETI)) {
        expect(testo.includes(segreto), `${s.tipo} contiene ${nome}`).toBe(false);
      }
      const d = s.dati as { registri: { corrente: { reclami: number; nonConformita: number; consultazioni: number } } };
      expect([d.registri.corrente.reclami, d.registri.corrente.nonConformita, d.registri.corrente.consultazioni]).toEqual([1, 1, 1]);
    }
    const [verbale] = tutti.filter((s) => s.tipo === "riesame_pas");
    expect(JSON.stringify(verbale.dati)).toContain(DECISIONE);
  });

  it("ripubblicare crea la versione 2, e la prima resta com'era", async () => {
    const [v1] = await db
      .select()
      .from(documentSnapshot)
      .where(and(eq(documentSnapshot.organizationId, S.orgId), eq(documentSnapshot.tipo, "manuale_pas")));
    await setCampoSistema(S.userId, S.orgId, sys, "direzione", "Consiglio di amministrazione");
    const id2 = await publishPasSnapshot(S.userId, S.orgId, S.companyId, "manuale_pas", ESERCIZIO);
    const [v2] = await db.select().from(documentSnapshot).where(eq(documentSnapshot.id, id2));
    expect(v2.versione).toBe(2);
    expect((v2.dati as { profilo: { direzione: string } }).profilo.direzione).toBe("Consiglio di amministrazione");
    const [ancora] = await db.select().from(documentSnapshot).where(eq(documentSnapshot.id, v1.id));
    expect((ancora.dati as { profilo: { direzione: string } }).profilo.direzione).toBe("Amministratore unico");
  });

  it("un esercizio fuori scala è rifiutato prima di scrivere", async () => {
    await expect(publishPasSnapshot(S.userId, S.orgId, S.companyId, "riesame_pas", 0)).rejects.toThrow(/Esercizio/);
  });
});
