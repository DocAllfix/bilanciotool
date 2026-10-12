import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  company,
  gdprAttivita,
  gdprDocumento,
  gdprFornitore,
  gdprMisura,
  gdprSystem,
  gdprTrattamento,
  gdprViolazione,
  orgEntitlement,
} from "@/lib/db/schema";
import { creaStudio, pulisciStudio, type Studio } from "./comune";
import {
  aggiungiTrattamentoTipo,
  avviaSistema,
  caricaDocumentiTipo,
  caricaPianoTipo,
  creaRiga,
  inserisciModelloPolitica,
  setCampoRequisito,
  setCampoRiga,
  setCampoSistema,
  setContenutoPolitica,
  setCriterio,
  setMisura,
  setParametro,
} from "@/features/gdpr/sistema";
import { leggiPercorsoGdpr, type PercorsoGdprAvviato } from "@/features/gdpr/queries";
import { quadroDa } from "@/features/gdpr/quadro";
import { avanzamento } from "@/lib/calc/gdpr/avanzamento";
import { daErrore } from "@/features/esito";

// Il percorso Protezione dei dati, sul database vero. Ogni prova è il caso che il
// prototipo — o una reimplementazione sbrigativa — sbaglierebbe: il secondo campo che
// cancella il primo, il catalogo caricato due volte, il «di cui» oltre il totale, l'ora
// della violazione letta nel fuso sbagliato.

const url = process.env.DATABASE_URL;
const RUN = Date.now();
const OGGI = "2026-10-12";

describe.skipIf(!url)("GDPR: il percorso sul database", () => {
  let S: Studio;
  let sys: string;

  beforeAll(async () => {
    S = await creaStudio({ prefisso: "gdpr", run: RUN, nomeAzienda: "Meccanica Prova S.r.l." });
    await db.insert(orgEntitlement).values({ organizationId: S.orgId, status: "active" });
    sys = await avviaSistema(S.userId, S.orgId, { companyId: S.companyId });
  });

  afterAll(async () => {
    await pulisciStudio(S.orgId, S.userId);
  });

  it("«Avvia» è idempotente: una radice sola, lo stesso id", async () => {
    const di_nuovo = await avviaSistema(S.userId, S.orgId, { companyId: S.companyId });
    expect(di_nuovo).toBe(sys);
    expect(await db.select().from(gdprSystem).where(eq(gdprSystem.companyId, S.companyId))).toHaveLength(1);
  });

  it("un campo non cancella l'altro, sulla radice e sulle righe", async () => {
    await setCampoSistema(S.userId, S.orgId, sys, "legale", "Amministratore unico");
    await setCampoSistema(S.userId, S.orgId, sys, "referente", "Responsabile HSE");
    const [s] = await db.select().from(gdprSystem).where(eq(gdprSystem.id, sys));
    expect([s.legale, s.referente]).toEqual(["Amministratore unico", "Responsabile HSE"]);

    const t = await creaRiga(S.userId, S.orgId, sys, "trattamento", OGGI);
    await setCampoRiga(S.userId, S.orgId, "trattamento", t, "finalita", "Paghe");
    await setCampoRiga(S.userId, S.orgId, "trattamento", t, "base", "Obbligo legale (6.1.c)");
    await setCampoRiga(S.userId, S.orgId, "trattamento", t, "conservazione", "10 anni");
    const [r] = await db.select().from(gdprTrattamento).where(eq(gdprTrattamento.id, t));
    expect([r.finalita, r.base, r.conservazione]).toEqual(["Paghe", "Obbligo legale (6.1.c)", "10 anni"]);
  });

  it("un campo fuori dal registro dei campi è rifiutato, anche se esiste nella tabella", async () => {
    const t = await creaRiga(S.userId, S.orgId, sys, "trattamento", OGGI);
    await expect(setCampoRiga(S.userId, S.orgId, "trattamento", t, "organizationId", "altro")).rejects.toThrow("Campo non modificabile");
    await expect(setCampoSistema(S.userId, S.orgId, sys, "companyId", "altra")).rejects.toThrow("Campo non modificabile");
    // Un valore fuori dall'elenco chiuso: lo ferma la validazione, prima del CHECK.
    await expect(setCampoRiga(S.userId, S.orgId, "trattamento", t, "base", "Perché sì")).rejects.toThrow();
  });

  it("il catalogo si carica una volta sola, anche premendo due volte", async () => {
    const primo = await aggiungiTrattamentoTipo(S.userId, S.orgId, sys, "videosorveglianza");
    const secondo = await aggiungiTrattamentoTipo(S.userId, S.orgId, sys, "videosorveglianza");
    expect(primo).toBeTruthy();
    expect(secondo).toBeNull();
    const video = await db.select().from(gdprTrattamento).where(and(eq(gdprTrattamento.systemId, sys), eq(gdprTrattamento.tipoKey, "videosorveglianza")));
    expect(video).toHaveLength(1);
    // Arriva già impostato dal catalogo, criteri di vaglio compresi.
    expect(video[0].criteri.sort()).toEqual(["monit", "vuln"]);

    expect((await caricaDocumentiTipo(S.userId, S.orgId, sys)).aggiunti).toBe(15);
    expect((await caricaDocumentiTipo(S.userId, S.orgId, sys)).aggiunti).toBe(0);
    expect(await db.select().from(gdprDocumento).where(eq(gdprDocumento.systemId, sys))).toHaveLength(15);
    expect((await caricaPianoTipo(S.userId, S.orgId, sys)).aggiunti).toBe(15);
    expect((await caricaPianoTipo(S.userId, S.orgId, sys)).aggiunti).toBe(0);
    expect(await db.select().from(gdprAttivita).where(eq(gdprAttivita.systemId, sys))).toHaveLength(15);
  });

  it("i criteri di vaglio si accendono una volta e si spengono, senza rileggere la riga", async () => {
    const t = await creaRiga(S.userId, S.orgId, sys, "trattamento", OGGI);
    await setCriterio(S.userId, S.orgId, t, { chiave: "monit", acceso: true });
    await setCriterio(S.userId, S.orgId, t, { chiave: "monit", acceso: true });
    await setCriterio(S.userId, S.orgId, t, { chiave: "sens", acceso: true });
    await setCriterio(S.userId, S.orgId, t, { chiave: "monit", acceso: false });
    const [r] = await db.select().from(gdprTrattamento).where(eq(gdprTrattamento.id, t));
    expect(r.criteri).toEqual(["sens"]);
    await setContenutoPolitica(S.userId, S.orgId, sys, { chiave: "pri", acceso: true });
    await setContenutoPolitica(S.userId, S.orgId, sys, { chiave: "pri", acceso: true });
    const [s] = await db.select().from(gdprSystem).where(eq(gdprSystem.id, sys));
    expect(s.politicaContenuti).toEqual(["pri"]);
  });

  it("un indicatore vuoto cancella la riga, e il «di cui» non supera il totale", async () => {
    await setMisura(S.userId, S.orgId, sys, { anno: 2026, chiave: "aut", valore: "30" });
    await setMisura(S.userId, S.orgId, sys, { anno: 2026, chiave: "aut_form", valore: "26" });
    await expect(setMisura(S.userId, S.orgId, sys, { anno: 2026, chiave: "aut_form", valore: "35" })).rejects.toThrow("non può superare il totale");
    // Anche nel verso opposto: abbassare il totale sotto la parte già scritta.
    await expect(setMisura(S.userId, S.orgId, sys, { anno: 2026, chiave: "aut", valore: "20" })).rejects.toThrow("non può superare il totale");
    // La virgola italiana è la virgola decimale, il punto delle migliaia si toglie.
    await setMisura(S.userId, S.orgId, sys, { anno: 2026, chiave: "cont", valore: "18.400" });
    await setMisura(S.userId, S.orgId, sys, { anno: 2026, chiave: "fo_ore", valore: "52,5" });
    const righe = await db.select().from(gdprMisura).where(eq(gdprMisura.systemId, sys));
    const v = Object.fromEntries(righe.map((m) => [m.indicatoreKey, Number(m.valore)]));
    expect(v).toMatchObject({ aut: 30, aut_form: 26, cont: 18400, fo_ore: 52.5 });
    await setMisura(S.userId, S.orgId, sys, { anno: 2026, chiave: "fo_ore", valore: "" });
    expect((await db.select().from(gdprMisura).where(eq(gdprMisura.systemId, sys))).map((m) => m.indicatoreKey)).not.toContain("fo_ore");
  });

  it("«Non dovuto» solo per il titolare autonomo, in entrambi i versi", async () => {
    const f = await creaRiga(S.userId, S.orgId, sys, "fornitore", OGGI);
    await expect(setCampoRiga(S.userId, S.orgId, "fornitore", f, "contratto", "Non dovuto")).rejects.toThrow("titolare autonomo");
    await setCampoRiga(S.userId, S.orgId, "fornitore", f, "qualifica", "Titolare autonomo");
    await setCampoRiga(S.userId, S.orgId, "fornitore", f, "contratto", "Non dovuto");
    await expect(setCampoRiga(S.userId, S.orgId, "fornitore", f, "qualifica", "Responsabile (art. 28)")).rejects.toThrow("titolare autonomo");
    const [r] = await db.select().from(gdprFornitore).where(eq(gdprFornitore.id, f));
    expect([r.qualifica, r.contratto]).toEqual(["Titolare autonomo", "Non dovuto"]);
  });

  it("l'istante di una violazione si legge in ora italiana, anche a cavallo dell'ora legale", async () => {
    const v = await creaRiga(S.userId, S.orgId, sys, "violazione", OGGI);
    await setCampoRiga(S.userId, S.orgId, "violazione", v, "conoscenzaIl", "2026-03-27T10:00");
    await setCampoRiga(S.userId, S.orgId, "violazione", v, "notificataIl", "2026-07-02T10:00");
    const [r] = await db.select().from(gdprViolazione).where(eq(gdprViolazione.id, v));
    expect(new Date(r.conoscenzaIl!).toISOString()).toBe("2026-03-27T09:00:00.000Z"); // UTC+1
    expect(new Date(r.notificataIl!).toISOString()).toBe("2026-07-02T08:00:00.000Z"); // UTC+2
    await expect(setCampoRiga(S.userId, S.orgId, "violazione", v, "conoscenzaIl", "2026-02-31T10:00")).rejects.toThrow();
  });

  it("le soglie restano ordinate: alto sopra medio, controllato sul valore salvato", async () => {
    await expect(setParametro(S.userId, S.orgId, sys, { campo: "paramAlto", valore: 8 })).rejects.toThrow("superare quella del medio");
    await setParametro(S.userId, S.orgId, sys, { campo: "paramMedio", valore: 6 });
    await setParametro(S.userId, S.orgId, sys, { campo: "paramAlto", valore: 12 });
    const [s] = await db.select().from(gdprSystem).where(eq(gdprSystem.id, sys));
    expect([s.paramAlto, s.paramMedio]).toEqual([12, 6]);
    await setParametro(S.userId, S.orgId, sys, { campo: "paramAlto", valore: 15 });
    await setParametro(S.userId, S.orgId, sys, { campo: "paramMedio", valore: 8 });
  });

  it("il modello di politica porta il nome dell'azienda, non il segnaposto", async () => {
    await inserisciModelloPolitica(S.userId, S.orgId, sys);
    const [s] = await db.select().from(gdprSystem).where(eq(gdprSystem.id, sys));
    expect(s.politicaTesto!.startsWith("Meccanica Prova S.r.l. tratta dati personali")).toBe(true);
    expect(s.politicaTesto).not.toContain("{nome}");
  });

  it("la lettura restituisce tutto, e il motore ci gira sopra", async () => {
    await setCampoRequisito(S.userId, S.orgId, sys, "P-01", "stato", "c");
    await setCampoRequisito(S.userId, S.orgId, sys, "P-01", "evidenza", "Registro dei trattamenti");
    const p = (await leggiPercorsoGdpr(S.userId, S.orgId, S.companyId)) as PercorsoGdprAvviato;
    expect(p.sistema.id).toBe(sys);
    expect(p.catalogo.requisiti).toHaveLength(99);
    const r = p.righe.requisiti.find((x) => x.requisitoKey === "P-01");
    expect([r?.stato, r?.evidenza]).toEqual(["c", "Registro dei trattamenti"]);
    const a = avanzamento(quadroDa(p), 2026, OGGI, new Date("2026-10-12T10:00:00Z"));
    expect(a.percentuale).toBeGreaterThan(0);
  });

  it("azienda archiviata: niente lavoro nuovo, gli aggiornamenti restano liberi", async () => {
    const t = await creaRiga(S.userId, S.orgId, sys, "trattamento", OGGI);
    await db.update(company).set({ stato: "archived", archivedAt: new Date() }).where(eq(company.id, S.companyId));
    try {
      await expect(creaRiga(S.userId, S.orgId, sys, "richiesta", OGGI)).rejects.toThrow("archiviata");
      await expect(caricaPianoTipo(S.userId, S.orgId, sys)).rejects.toThrow("archiviata");
      await expect(setCampoRequisito(S.userId, S.orgId, sys, "P-02", "stato", "c")).rejects.toThrow("archiviata");
      await setCampoRiga(S.userId, S.orgId, "trattamento", t, "nome", "Aggiornato da archiviata");
      // Una radice NUOVA su un'azienda archiviata la ferma il database (0061): il messaggio
      // arriva leggibile attraverso `daErrore`.
      const altra = `az-gdpr-arch-${RUN}`;
      await db.insert(company).values({ id: altra, organizationId: S.orgId, nome: "Archiviata", stato: "archived", archivedAt: new Date() });
      const esito = daErrore(await avviaSistema(S.userId, S.orgId, { companyId: altra }).catch((e: unknown) => e));
      expect(esito.ok === false && esito.codice).toBe("azienda_archiviata");
    } finally {
      await db.update(company).set({ stato: "active", archivedAt: null }).where(eq(company.id, S.companyId));
    }
  });
});
