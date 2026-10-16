import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { company, orgEntitlement, pasAttivita, pasMisura, pasParte, pasRischio, pasSystem } from "@/lib/db/schema";
import { creaStudio, pulisciStudio, type Studio } from "./comune";
import {
  avviaSistema,
  caricaPianoTipo,
  creaRiga,
  eliminaRiga,
  inserisciModelloPolitica,
  setCampoRequisito,
  setCampoRiga,
  setCampoSistema,
  setContenutoPolitica,
  setMisura,
  setParametro,
} from "@/features/pas/sistema";
import { leggiPercorsoPas, type PercorsoPasAvviato } from "@/features/pas/queries";
import { datiVistaPas } from "@/features/pas/vista";
import { daErrore } from "@/features/esito";

// Il percorso Sistema di gestione sociale, sul database vero. Ogni prova è il caso che il
// prototipo — o una reimplementazione sbrigativa — sbaglierebbe: il secondo campo che
// cancella il primo, l'avvio che resuscita ciò che il consulente ha tolto, il «di cui» oltre
// il totale, un indicatore vuoto letto come zero.

const url = process.env.DATABASE_URL;
const RUN = Date.now();
const OGGI = "2026-10-16";

describe.skipIf(!url)("PAS 24000: il percorso sul database", () => {
  let S: Studio;
  let sys: string;

  beforeAll(async () => {
    S = await creaStudio({ prefisso: "pas", run: RUN, nomeAzienda: "Officine Prova S.r.l." });
    await db.insert(orgEntitlement).values({ organizationId: S.orgId, status: "active" });
    sys = await avviaSistema(S.userId, S.orgId, { companyId: S.companyId });
  });

  afterAll(async () => {
    await pulisciStudio(S.orgId, S.userId);
  });

  it("l'avvio crea le otto parti e i venti rischi tipo, una volta sola", async () => {
    const parti = await db.select().from(pasParte).where(eq(pasParte.systemId, sys));
    const rischi = await db.select().from(pasRischio).where(eq(pasRischio.systemId, sys));
    expect(parti).toHaveLength(8);
    expect(rischi).toHaveLength(20);
    // Il secondo «Avvia» restituisce la stessa radice e non resuscita ciò che è stato tolto.
    await eliminaRiga(S.userId, S.orgId, "parte", parti[0].id);
    expect(await avviaSistema(S.userId, S.orgId, { companyId: S.companyId })).toBe(sys);
    expect(await db.select().from(pasSystem).where(eq(pasSystem.companyId, S.companyId))).toHaveLength(1);
    expect(await db.select().from(pasParte).where(eq(pasParte.systemId, sys))).toHaveLength(7);
    // I rischi tipo nascono da valutare: il punteggio lo dà il consulente.
    expect(rischi.every((r) => r.probabilita === null && r.gravita === null)).toBe(true);
  });

  it("un campo non cancella l'altro, sulla radice e sulle righe", async () => {
    await setCampoSistema(S.userId, S.orgId, sys, "ccnl", "Metalmeccanica industria");
    await setCampoSistema(S.userId, S.orgId, sys, "responsabile", "Responsabile HR");
    const [s] = await db.select().from(pasSystem).where(eq(pasSystem.id, sys));
    expect([s.ccnl, s.responsabile]).toEqual(["Metalmeccanica industria", "Responsabile HR"]);

    const [r] = await db.select().from(pasRischio).where(eq(pasRischio.systemId, sys)).limit(1);
    await setCampoRiga(S.userId, S.orgId, "rischio", r.id, "probabilita", "3");
    await setCampoRiga(S.userId, S.orgId, "rischio", r.id, "gravita", "5");
    await setCampoRiga(S.userId, S.orgId, "rischio", r.id, "misure", "Audit di seconda parte");
    const [dopo] = await db.select().from(pasRischio).where(eq(pasRischio.id, r.id));
    expect([dopo.probabilita, dopo.gravita, dopo.misure, dopo.testo]).toEqual([3, 5, "Audit di seconda parte", r.testo]);
  });

  it("un campo fuori dal registro dei campi è rifiutato, e così un valore fuori elenco", async () => {
    const f = await creaRiga(S.userId, S.orgId, sys, "fornitore", OGGI);
    await expect(setCampoRiga(S.userId, S.orgId, "fornitore", f, "organizationId", "altro")).rejects.toThrow("Campo non modificabile");
    await expect(setCampoSistema(S.userId, S.orgId, sys, "companyId", "altra")).rejects.toThrow("Campo non modificabile");
    await expect(setCampoRiga(S.userId, S.orgId, "fornitore", f, "categoria", "Varie")).rejects.toThrow();
    const [r] = await db.select().from(pasRischio).where(eq(pasRischio.systemId, sys)).limit(1);
    await expect(setCampoRiga(S.userId, S.orgId, "rischio", r.id, "gravita", "6")).rejects.toThrow();
    await expect(setCampoRiga(S.userId, S.orgId, "rischio", r.id, "area", "A12")).rejects.toThrow();
  });

  it("il piano tipo si carica una volta sola, anche premendo due volte", async () => {
    expect((await caricaPianoTipo(S.userId, S.orgId, sys)).aggiunti).toBe(16);
    expect((await caricaPianoTipo(S.userId, S.orgId, sys)).aggiunti).toBe(0);
    expect(await db.select().from(pasAttivita).where(eq(pasAttivita.systemId, sys))).toHaveLength(16);
  });

  it("i contenuti della politica si accendono una volta e si spengono, senza rileggere la riga", async () => {
    await setContenutoPolitica(S.userId, S.orgId, sys, { chiave: "du", acceso: true });
    await setContenutoPolitica(S.userId, S.orgId, sys, { chiave: "du", acceso: true });
    await setContenutoPolitica(S.userId, S.orgId, sys, { chiave: "ssl", acceso: true });
    await setContenutoPolitica(S.userId, S.orgId, sys, { chiave: "du", acceso: false });
    const [s] = await db.select().from(pasSystem).where(eq(pasSystem.id, sys));
    expect(s.politicaContenuti).toEqual(["ssl"]);
  });

  it("un indicatore vuoto cancella la riga, il «di cui» non supera il totale, i numeri si leggono all'italiana", async () => {
    await setMisura(S.userId, S.orgId, sys, { anno: 2026, chiave: "lav_tot", valore: "48" });
    await setMisura(S.userId, S.orgId, sys, { anno: 2026, chiave: "lav_don", valore: "14" });
    await expect(setMisura(S.userId, S.orgId, sys, { anno: 2026, chiave: "lav_don", valore: "50" })).rejects.toThrow("non può superare il totale");
    // Anche nel verso opposto: abbassare il totale sotto la parte già scritta.
    await expect(setMisura(S.userId, S.orgId, sys, { anno: 2026, chiave: "lav_tot", valore: "10" })).rejects.toThrow("non può superare il totale");
    // «1.580» euro è milleseicento meno venti, non uno virgola cinquantotto: il difetto del prototipo.
    await setMisura(S.userId, S.orgId, sys, { anno: 2026, chiave: "re_min", valore: "1.580" });
    await setMisura(S.userId, S.orgId, sys, { anno: 2026, chiave: "re_uom", valore: "2.234,5" });
    const v = Object.fromEntries((await db.select().from(pasMisura).where(eq(pasMisura.systemId, sys))).map((m) => [m.indicatoreKey, Number(m.valore)]));
    expect(v).toMatchObject({ lav_tot: 48, lav_don: 14, re_min: 1580, re_uom: 2234.5 });
    await setMisura(S.userId, S.orgId, sys, { anno: 2026, chiave: "re_uom", valore: "" });
    expect((await db.select().from(pasMisura).where(eq(pasMisura.systemId, sys))).map((m) => m.indicatoreKey)).not.toContain("re_uom");
  });

  it("senza la retribuzione delle donne il divario di genere non esiste, non è 100%", async () => {
    await setMisura(S.userId, S.orgId, sys, { anno: 2026, chiave: "re_uom", valore: "2.200" });
    const p = (await leggiPercorsoPas(S.userId, S.orgId, S.companyId)) as PercorsoPasAvviato;
    const vista = datiVistaPas(p, 2026, OGGI);
    expect(vista.derivati.corrente.payGap).toBeNull();
    expect(vista.derivati.corrente.pctDonne).toBe(29.2);
  });

  it("le soglie restano ordinate, controllate sul valore salvato", async () => {
    await expect(setParametro(S.userId, S.orgId, sys, { campo: "paramAlto", valore: 8 })).rejects.toThrow("superare quella del medio");
    await expect(setParametro(S.userId, S.orgId, sys, { campo: "paramOreTotali", valore: 40 })).rejects.toThrow("sotto quello dell'orario ordinario");
    await setParametro(S.userId, S.orgId, sys, { campo: "paramOreOrdinarie", valore: 40 });
    await setParametro(S.userId, S.orgId, sys, { campo: "paramOreTotali", valore: 48 });
    const [s] = await db.select().from(pasSystem).where(eq(pasSystem.id, sys));
    expect([s.paramOreOrdinarie, s.paramOreTotali, s.paramAlto, s.paramMedio]).toEqual([40, 48, 15, 8]);
  });

  it("il modello di politica porta il nome dell'azienda, non il segnaposto", async () => {
    await inserisciModelloPolitica(S.userId, S.orgId, sys);
    const [s] = await db.select().from(pasSystem).where(eq(pasSystem.id, sys));
    expect(s.politicaTesto!.startsWith("Officine Prova S.r.l. ")).toBe(true);
    expect(s.politicaTesto).not.toContain("{nome}");
  });

  it("la lettura restituisce tutto, e il motore ci gira sopra", async () => {
    await setCampoRequisito(S.userId, S.orgId, sys, "4.1", "stato", "c");
    await setCampoRequisito(S.userId, S.orgId, sys, "4.1", "evidenza", "Analisi del contesto 2026");
    await setCampoRequisito(S.userId, S.orgId, sys, "A.2-9", "stato", "na");
    const p = (await leggiPercorsoPas(S.userId, S.orgId, S.companyId)) as PercorsoPasAvviato;
    expect(p.sistema.id).toBe(sys);
    expect(p.catalogo.requisiti).toHaveLength(98);
    const r = p.righe.requisiti.find((x) => x.requisitoKey === "4.1");
    expect([r?.stato, r?.evidenza]).toEqual(["c", "Analisi del contesto 2026"]);
    const v = datiVistaPas(p, 2026, OGGI);
    // Uno conforme e uno non pertinente su 98: l'indice NON è 100. Il non pertinente esce dal
    // denominatore, i 96 mai valutati pesano zero.
    expect(v.conformita.indice).toBe(1);
    expect(v.avanzamento.percentuale).toBeGreaterThan(0);
  });

  it("azienda archiviata: niente lavoro nuovo, gli aggiornamenti restano liberi", async () => {
    const f = await creaRiga(S.userId, S.orgId, sys, "fattore", OGGI);
    await db.update(company).set({ stato: "archived", archivedAt: new Date() }).where(eq(company.id, S.companyId));
    try {
      const prima = (await db.select().from(pasAttivita).where(eq(pasAttivita.systemId, sys))).length;
      await expect(creaRiga(S.userId, S.orgId, sys, "reclamo", OGGI)).rejects.toThrow("archiviata");
      await expect(setCampoRequisito(S.userId, S.orgId, sys, "4.2", "stato", "c")).rejects.toThrow("archiviata");
      await expect(setMisura(S.userId, S.orgId, sys, { anno: 2026, chiave: "ces", valore: "2" })).rejects.toThrow("archiviata");
      expect((await db.select().from(pasAttivita).where(eq(pasAttivita.systemId, sys))).length).toBe(prima);
      await setCampoRiga(S.userId, S.orgId, "fattore", f, "descrizione", "Aggiornato da archiviata");
      // Una radice NUOVA su un'azienda archiviata la ferma il database (0061).
      const altra = `az-pas-arch-${RUN}`;
      await db.insert(company).values({ id: altra, organizationId: S.orgId, nome: "Archiviata", stato: "archived", archivedAt: new Date() });
      const esito = daErrore(await avviaSistema(S.userId, S.orgId, { companyId: altra }).catch((e: unknown) => e));
      expect(esito.ok === false && esito.codice).toBe("azienda_archiviata");
    } finally {
      await db.update(company).set({ stato: "active", archivedAt: null }).where(eq(company.id, S.companyId));
    }
  });
});
