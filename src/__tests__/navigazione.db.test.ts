import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { randomUUID } from "node:crypto";
import { eq, inArray } from "drizzle-orm";
import { creaStudio, pulisciStudio } from "./comune";
import { latestContentSetId } from "@/features/ghg/inventories";
import { db } from "@/lib/db";
import {
  user, organization, member, orgEntitlement, company, auditLog, documentSnapshot, ghgInventory, reportProject,
} from "@/lib/db/schema";
import { MODULI_AZIENDA } from "@/features/companies/moduli";
import { getFascicolo, listCompanyNames, listDocumentiAzienda } from "@/features/companies/fascicolo";
import { getScadenzario } from "@/features/companies/scadenzario";
import { getStatiPortafoglio } from "@/features/companies/stati-moduli";
import { listArchivioDocumenti } from "@/features/documents/archivio";
import { getStorico } from "@/features/companies/storico";
import { SENZA_ESERCIZIO } from "@/features/documents/tipi";

// Fascicolo, scadenzario e archivio: le tre viste che ATTRAVERSANO il portafoglio.
//
// Esistono perché sono le uniche query che partono dall'organizzazione invece
// che da una radice già verificata, e sono quindi il punto naturale in cui una
// vista può mostrare i dati di un altro studio. È successo davvero: la prima
// versione dello scadenzario non filtrava per organizzazione, e in sviluppo (dove
// la connessione è privilegiata e le policy non scattano) mostrava le aziende di
// tutti. In produzione RLS avrebbe coperto il difetto, che sarebbe rimasto lì.
//
// Con `RLS_FORCE_ROLE=app_rls` questi test provano lo strato del database; senza,
// provano il filtro applicativo. Servono verdi in entrambi i modi.

const url = process.env.DATABASE_URL;
const RUN = Date.now();
const orgA = `org-nav-a-${RUN}`;
const orgB = `org-nav-b-${RUN}`;
const userA = `user-nav-a-${RUN}`;
const userB = `user-nav-b-${RUN}`;
const ANNO_VECCHIO = new Date().getFullYear() - 5;
let companyA = "";
let companyB = "";
let setGhg = "";
let setReport = "";

/** Gli identificativi qui sono decisi fuori (servono nelle asserzioni), quindi si passano
 *  invece di lasciarli comporre all'aiutante. L'entitlement resta esplicito. */
async function creaStudioNav(suffisso: string, nomeAzienda: string) {
  const s = await creaStudio({
    prefisso: `nav-${suffisso}`, run: RUN, nomeStudio: `Studio ${suffisso}`, nomeAzienda,
  });
  await db.insert(orgEntitlement).values({ organizationId: s.orgId, status: "active" });
  return s;
}

describe.skipIf(!url)("viste che attraversano il portafoglio", () => {
  beforeAll(async () => {
    // `contentSetId` RISOLTO, non il letterale "v1" che c'era prima: era l'unico test
    // destinato a rompersi il giorno in cui il catalogo corrente cambia versione.
    setGhg = await latestContentSetId("ghg");
    setReport = await latestContentSetId("report");

    companyA = (await creaStudioNav("a", "Azienda dello studio A")).companyId;
    companyB = (await creaStudioNav("b", "Azienda dello studio B")).companyId;

    // Studio A: un inventario fermo a cinque anni fa (deve finire in scadenzario)
    // e un bilancio dell'anno scorso mai pubblicato.
    await db.insert(ghgInventory).values({
      id: randomUUID(), organizationId: orgA, companyId: companyA, anno: ANNO_VECCHIO, annoBase: ANNO_VECCHIO, contentSetId: setGhg,
    });
    await db.insert(reportProject).values({
      id: randomUUID(), organizationId: orgA, companyId: companyA, anno: new Date().getFullYear() - 1, contentSetId: setReport,
    });

    // Studio B: le stesse cose, che NON devono comparire allo studio A.
    await db.insert(ghgInventory).values({
      id: randomUUID(), organizationId: orgB, companyId: companyB, anno: ANNO_VECCHIO, annoBase: ANNO_VECCHIO, contentSetId: setGhg,
    });
    await db.insert(documentSnapshot).values({
      id: randomUUID(), organizationId: orgB, companyId: companyB, tipo: "soa", anno: SENZA_ESERCIZIO,
      versione: 1, dati: { prova: true }, publishedBy: userB,
    });
  });

  afterAll(async () => {
    for (const [orgId, userId] of [[orgA, userA], [orgB, userB]]) {
      // Le tabelle di modulo PRIMA della coda comune: qui le aziende sono condivise fra
      // piu' righe, quindi non basta la cascata su `company`.
      await db.delete(documentSnapshot).where(eq(documentSnapshot.organizationId, orgId));
      await db.delete(reportProject).where(eq(reportProject.organizationId, orgId));
      await db.delete(ghgInventory).where(eq(ghgInventory.organizationId, orgId));
      await pulisciStudio(orgId, userId);
    }
  });

  it("il fascicolo elenca i moduli nell'ordine del registro, con lo stato di ciascuno", async () => {
    const f = (await getFascicolo(userA, orgA, companyA))!;
    expect(f.azienda.nome).toBe("Azienda dello studio A");
    // L'ordine e' quello del registro, che dal 22 agosto 2026 e' RAGGRUPPATO PER AREA:
    // GHG ed Energetico sono la stessa materia e stanno vicini. Prima era
    // ["ghg", "bilancio", "energetico", ...], e la differenza non e' cosmetica —
    // da questo elenco discendono card, barra laterale, guida e giro guidato.
    expect(f.voci.map((v) => v.modulo)).toEqual(["ghg", "energetico", "bilancio", "fornitore", "soa", "anticorruzione"]);
    // L'elenco qui sopra si puo' aggiornare distrattamente; questa no. Se un modulo
    // finisse lontano dai suoi, la sua area comparirebbe due volte a distanza — e nella
    // barra laterale si vedrebbero due intestazioni uguali separate da altre voci.
    const aree = f.voci.map((v) => MODULI_AZIENDA.find((m) => m.href === v.modulo)!.area);
    const blocchi = aree.filter((a, i) => i === 0 || aree[i - 1] !== a);
    expect(blocchi).toEqual([...new Set(aree)]);

    expect(f.voci.find((v) => v.modulo === "ghg")!.stato).toBe("in-corso");
    expect(f.voci.find((v) => v.modulo === "ghg")!.anno).toBe(ANNO_VECCHIO);
    expect(f.voci.find((v) => v.modulo === "energetico")!.stato).toBe("non-avviato");
    // Un modulo annuale già avviato porta dritto all'esercizio, senza redirect.
    expect(f.voci.find((v) => v.modulo === "ghg")!.href).toContain(`/ghg/${ANNO_VECCHIO}`);
    expect(f.voci.find((v) => v.modulo === "fornitore")!.href).toMatch(/\/fornitore$/);
  });

  it("il fascicolo di un'azienda di un altro studio non si apre", async () => {
    expect(await getFascicolo(userA, orgA, companyB)).toBeNull();
    expect(await getFascicolo(userB, orgB, companyA)).toBeNull();
  });

  it("lo scadenzario segnala l'esercizio arretrato e il lavoro non pubblicato", async () => {
    const voci = await getScadenzario(userA, orgA);
    const ghg = voci.find((v) => v.modulo === "ghg")!;
    expect(ghg.motivo).toBe("esercizio-mancante");
    expect(ghg.anno).toBe(new Date().getFullYear() - 1);
    const bil = voci.find((v) => v.modulo === "bilancio")!;
    expect(bil.motivo).toBe("da-pubblicare");
    // I moduli mai toccati restano nell'elenco come promemoria, in fondo.
    expect(voci.find((v) => v.modulo === "soa")!.motivo).toBe("mai-avviato");
    expect(voci.filter((v) => v.motivo === "mai-avviato").every((v) => v.priorita >= 30)).toBe(true);
  });

  it("lo scadenzario NON mostra le aziende di un altro studio", async () => {
    const voci = await getScadenzario(userA, orgA);
    expect(voci.every((v) => v.companyId === companyA)).toBe(true);
    expect(voci.some((v) => v.companyNome.includes("studio B"))).toBe(false);

    const altre = await getScadenzario(userB, orgB);
    expect(altre.every((v) => v.companyId === companyB)).toBe(true);
  });

  it("un esercizio dell'anno scorso non è un ritardo: si rendiconta adesso", async () => {
    const anno = new Date().getFullYear() - 1;
    const invId = randomUUID();
    await db.insert(ghgInventory).values({
      id: invId, organizationId: orgA, companyId: companyA, anno, annoBase: anno, contentSetId: setGhg,
    });
    try {
      const ghg = (await getScadenzario(userA, orgA)).find((v) => v.modulo === "ghg")!;
      expect(ghg.motivo).toBe("da-pubblicare");
      expect(ghg.anno).toBe(anno);
    } finally {
      await db.delete(ghgInventory).where(eq(ghgInventory.id, invId));
    }
  });

  it("l'archivio conta e filtra soltanto i documenti del proprio studio", async () => {
    const dellaB = await listArchivioDocumenti(userB, orgB, { tipo: null, area: null, companyId: null });
    expect(dellaB.totale).toBe(1);
    expect(dellaB.conteggiPerTipo.soa).toBe(1);
    expect(dellaB.aziende.map((a) => a.nome)).toEqual(["Azienda dello studio B"]);

    const dellaA = await listArchivioDocumenti(userA, orgA, { tipo: null, area: null, companyId: null });
    expect(dellaA.totale).toBe(0);
    expect(dellaA.documenti).toEqual([]);

    // Il filtro per tipo restringe l'elenco ma non il totale, che serve a dire
    // «ne hai 12, ne stai vedendo 3».
    const soloGhg = await listArchivioDocumenti(userB, orgB, { tipo: "ghg", area: null, companyId: null });
    expect(soloGhg.totale).toBe(1);
    expect(soloGhg.documenti.length).toBe(0);
  });

  it("i documenti di un'azienda non trapassano allo studio sbagliato", async () => {
    expect(await listDocumentiAzienda(userA, orgA, companyB)).toEqual([]);
    expect((await listDocumentiAzienda(userB, orgB, companyB)).length).toBe(1);
  });

  it("lo storico legge dagli snapshot e salta le serie con un punto solo", async () => {
    const fatti = [
      // Due esercizi di GHG, ognuno con due versioni: dell'esercizio deve
      // restare l'ULTIMA versione, non la prima.
      { anno: 2024, versione: 1, tot: "100.5" },
      { anno: 2024, versione: 2, tot: "120.5" },
      { anno: 2025, versione: 1, tot: "90.25" },
    ];
    const ids: string[] = [];
    for (const f of fatti) {
      const id = randomUUID();
      ids.push(id);
      await db.insert(documentSnapshot).values({
        id, organizationId: orgA, companyId: companyA, tipo: "ghg", anno: f.anno, versione: f.versione,
        dati: { risultati: { totL: f.tot } }, publishedBy: userA,
      });
    }
    // Una sola revisione di SoA: non fa un andamento, non deve comparire.
    const soloUno = randomUUID();
    ids.push(soloUno);
    await db.insert(documentSnapshot).values({
      id: soloUno, organizationId: orgA, companyId: companyA, tipo: "soa", anno: SENZA_ESERCIZIO, versione: 1,
      dati: { esito: { indice: 51 } }, publishedBy: userA,
    });

    try {
      const serie = await getStorico(userA, orgA, companyA);
      expect(serie.map((s) => s.tipo)).toEqual(["ghg"]);
      const ghg = serie[0];
      expect(ghg.perEsercizio).toBe(true);
      expect(ghg.punti.map((p) => p.x)).toEqual([2024, 2025]);
      // 120,5 e non 100,5: dell'esercizio conta l'ultima versione pubblicata.
      expect(ghg.punti.map((p) => p.valore)).toEqual([120.5, 90.25]);
      expect(ghg.punti[0].versione).toBe(2);
      // Il verso del miglioramento non e uguale per tutti: per le emissioni
      // scendere e un risultato, per un indice di maturita e il contrario.
      expect(ghg.meglioSe).toBe("scende");
    } finally {
      for (const id of ids) await db.delete(documentSnapshot).where(eq(documentSnapshot.id, id));
    }
  });

  it("per gli indici il miglioramento è verso l'alto, e le revisioni sono l'asse", async () => {
    const ids: string[] = [];
    for (const [versione, indice] of [[1, 44], [2, 58], [3, 71]] as const) {
      const id = randomUUID();
      ids.push(id);
      await db.insert(documentSnapshot).values({
        id, organizationId: orgA, companyId: companyA, tipo: "attestato", anno: SENZA_ESERCIZIO, versione,
        dati: { esito: { indice } }, publishedBy: userA,
      });
    }
    try {
      const serie = (await getStorico(userA, orgA, companyA)).find((s) => s.tipo === "attestato")!;
      expect(serie.meglioSe).toBe("sale");
      expect(serie.perEsercizio).toBe(false);
      expect(serie.punti.map((p) => p.x)).toEqual([1, 2, 3]);
      expect(serie.punti.map((p) => p.valore)).toEqual([44, 58, 71]);
    } finally {
      for (const id of ids) await db.delete(documentSnapshot).where(eq(documentSnapshot.id, id));
    }
  });

  it("lo storico di un'azienda non pesca dagli snapshot di un altro studio", async () => {
    expect(await getStorico(userA, orgA, companyB)).toEqual([]);
  });

  it("gli stati dei moduli distinguono avviato, pubblicato e mai toccato", async () => {
    const st = await getStatiPortafoglio(userA, orgA);
    const azienda = st.aziende.find((a) => a.id === companyA)!;
    const per = (m: string) => azienda.moduli.find((x) => x.modulo === m)!;
    expect(per("ghg").stato).toBe("in-corso");
    expect(per("bilancio").stato).toBe("in-corso");
    expect(per("energetico").stato).toBe("non-avviato");
    expect(per("soa").stato).toBe("non-avviato");
    // L'esercizio piu recente segue la radice, non il documento.
    expect(per("ghg").anno).toBe(ANNO_VECCHIO);
    // I moduli non annuali non hanno un esercizio, e non devono inventarselo.
    expect(per("fornitore").anno).toBeNull();
  });

  it("un documento pubblicato accende il modulo, anche di un esercizio vecchio", async () => {
    const id = randomUUID();
    await db.insert(documentSnapshot).values({
      id, organizationId: orgA, companyId: companyA, tipo: "ghg", anno: ANNO_VECCHIO, versione: 1,
      dati: { risultati: { totL: "10" } }, publishedBy: userA,
    });
    try {
      const st = await getStatiPortafoglio(userA, orgA);
      const ghg = st.aziende.find((a) => a.id === companyA)!.moduli.find((x) => x.modulo === "ghg")!;
      // «Pubblicato» risponde a «il servizio e stato erogato almeno una volta»,
      // non a «e aggiornato»: il ritardo lo dice lo scadenzario, non la casella.
      expect(ghg.stato).toBe("pubblicato");
      expect(ghg.annoPubblicato).toBe(ANNO_VECCHIO);
    } finally {
      await db.delete(documentSnapshot).where(eq(documentSnapshot.id, id));
    }
  });

  it("i servizi dello studio contano aziende, non somme, ed escludono la demo", async () => {
    const demoId = randomUUID();
    await db.insert(company).values({
      id: demoId, organizationId: orgA, nome: "Azienda dimostrativa", isDemo: true,
    });
    await db.insert(ghgInventory).values({
      id: randomUUID(), organizationId: orgA, companyId: demoId, anno: ANNO_VECCHIO,
      annoBase: ANNO_VECCHIO, contentSetId: setGhg,
    });
    try {
      const st = await getStatiPortafoglio(userA, orgA);
      // La demo compare fra le aziende (serve alle card) ma non nei servizi.
      expect(st.aziende.length).toBe(2);
      const ghg = st.servizi.find((x) => x.modulo === "ghg")!;
      expect(ghg.totale).toBe(1);
      expect(ghg.avviati).toBe(1);
      expect(ghg.pubblicati).toBe(0);
      const ene = st.servizi.find((x) => x.modulo === "energetico")!;
      expect(ene.avviati).toBe(0);
      // ⚠️ Una riga per OGNI modulo del registro, anche per quelli mai proposti: la
      // riga a zero e' un'informazione commerciale, non un buco. Si confrontano le
      // CHIAVI e non il numero — un numero fisso diventa rosso al primo modulo
      // aggiunto, per un motivo che col prodotto non c'entra, ed e' successo qui.
      // Il confronto sulle chiavi invece continua a catturare cio' che conta: che
      // nessun servizio sia stato filtrato via perche' a zero.
      expect([...st.servizi.map((x) => x.modulo)].sort()).toEqual([...MODULI_AZIENDA.map((m) => m.href)].sort());
    } finally {
      await db.delete(ghgInventory).where(eq(ghgInventory.companyId, demoId));
      await db.delete(company).where(eq(company.id, demoId));
    }
  });

  it("gli stati non attraversano gli studi", async () => {
    const st = await getStatiPortafoglio(userA, orgA);
    expect(st.aziende.every((a) => a.id === companyA)).toBe(true);
  });

  it("i nomi per la navigazione sono solo quelli del proprio studio", async () => {
    const nomi = await listCompanyNames(userA, orgA);
    expect(nomi.map((n) => n.nome)).toEqual(["Azienda dello studio A"]);
  });
});
