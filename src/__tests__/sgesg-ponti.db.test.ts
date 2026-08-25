import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  documentSnapshot,
  ghgActivityRow,
  ghgInventory,
  materialityAssessment,
  orgEntitlement,
  reportProject,
  sgesgFase,
  sgesgProgramma,
  sgesgSchedaDato,
} from "@/lib/db/schema";
import { creaStudio, pulisciStudio } from "./comune";
import { latestContentSetId } from "@/features/ghg/inventories";
import { creaProgramma, getProgramma } from "@/features/sgesg/programma";
import { pontiDelProgramma } from "@/features/sgesg/ponti";

// I ponti dalle fasi del metodo ai percorsi che esistono gia'.
//
// ⚠️ Il fatto che questo file esiste per provare e' UNO: **il ponte legge e non scrive
// mai**. E' la stessa forma del ponte GHG → Bilancio, ed e' la ragione per cui il dato
// non finisce in due posti. Il secondo fatto e' che il ponte **non avanza la fase**: lo
// stato della fase e' una dichiarazione del consulente, e dedurla da un dato tecnico gli
// toglierebbe di mano un giudizio che e' suo.

const RUN = Date.now();
const ANNO = 2025;
let A: Awaited<ReturnType<typeof creaStudio>>;
let setGhg = "";
let setReport = "";

async function pulisci(orgId: string) {
  await db.delete(sgesgSchedaDato).where(eq(sgesgSchedaDato.organizationId, orgId));
  await db.delete(sgesgFase).where(eq(sgesgFase.organizationId, orgId));
  await db.delete(sgesgProgramma).where(eq(sgesgProgramma.organizationId, orgId));
  await db.delete(documentSnapshot).where(eq(documentSnapshot.organizationId, orgId));
  await db.delete(materialityAssessment).where(eq(materialityAssessment.organizationId, orgId));
  await db.delete(reportProject).where(eq(reportProject.organizationId, orgId));
  await db.delete(ghgInventory).where(eq(ghgInventory.organizationId, orgId));
}

beforeAll(async () => {
  setGhg = await latestContentSetId("ghg");
  setReport = await latestContentSetId("report");
  A = await creaStudio({ prefisso: "pon-a", run: RUN, nomeAzienda: "Azienda dei ponti" });
  await db.insert(orgEntitlement).values({ organizationId: A.orgId, status: "active" });
  await creaProgramma(A.userId, A.orgId, { companyId: A.companyId, anno: ANNO });
});

afterAll(async () => {
  await pulisci(A.orgId);
  await pulisciStudio(A.orgId, A.userId);
});

describe("i tre ponti", () => {
  it("senza i percorsi, dicono «non ancora avviato» e non inventano numeri", async () => {
    const p = await pontiDelProgramma(A.userId, A.orgId, A.companyId, ANNO);
    expect(p.map((x) => x.faseKey)).toEqual(["proc02", "proc04", "proc06"]);
    expect(p.every((x) => x.stato === "mancante")).toBe(true);
    // ⚠️ `null` e non «0 temi su 18»: un percorso che non esiste non ha un conteggio, e
    // scrivere zero direbbe «avviato e vuoto», che e' un'altra cosa.
    expect(p.every((x) => x.dettaglio === null)).toBe(true);
  });

  it("avviando l'inventario, la fase 04 passa a «avviato, ancora vuoto»", async () => {
    await db.insert(ghgInventory).values({
      id: randomUUID(), organizationId: A.orgId, companyId: A.companyId,
      anno: ANNO, annoBase: ANNO, contentSetId: setGhg,
    });
    const p = await pontiDelProgramma(A.userId, A.orgId, A.companyId, ANNO);
    const p04 = p.find((x) => x.faseKey === "proc04")!;
    expect(p04.stato).toBe("vuoto");
    expect(p04.dettaglio).toContain("0 voci");
  });

  it("con le voci passa «in lavorazione», e con il documento pubblicato «pronto»", async () => {
    const [inv] = await db.select().from(ghgInventory).where(eq(ghgInventory.organizationId, A.orgId));
    await db.insert(ghgActivityRow).values({
      id: randomUUID(), organizationId: A.orgId, inventoryId: inv.id,
      // `um` e' NOT NULL: una voce di attivita' senza unita' di misura non e' una voce.
      categoryKey: "C1", sourceTypeKey: "S01", um: "kWh", quantita: "100", fe: "2.5",
    });
    let p = await pontiDelProgramma(A.userId, A.orgId, A.companyId, ANNO);
    expect(p.find((x) => x.faseKey === "proc04")!.stato).toBe("in-corso");

    await db.insert(documentSnapshot).values({
      id: randomUUID(), organizationId: A.orgId, companyId: A.companyId,
      tipo: "ghg", anno: ANNO, versione: 1, dati: { prova: true }, publishedBy: A.userId,
    });
    p = await pontiDelProgramma(A.userId, A.orgId, A.companyId, ANNO);
    const p04 = p.find((x) => x.faseKey === "proc04")!;
    expect(p04.stato).toBe("pronto");
    expect(p04.dettaglio).toContain("rapporto pubblicato");
  });

  it("la materialita' conta i temi con ALMENO uno dei due punteggi", async () => {
    // ⚠️ Non entrambi: nella doppia materialita' i due assi si compilano in momenti
    // diversi, e pretenderli tutti e due direbbe «non avviato» a chi ha finito meta'
    // del lavoro.
    const projId = randomUUID();
    await db.insert(reportProject).values({
      id: projId, organizationId: A.orgId, companyId: A.companyId, anno: ANNO, contentSetId: setReport,
    });
    let p = await pontiDelProgramma(A.userId, A.orgId, A.companyId, ANNO);
    expect(p.find((x) => x.faseKey === "proc02")!.stato).toBe("vuoto");

    await db.insert(materialityAssessment).values({
      id: randomUUID(), organizationId: A.orgId, projectId: projId, topicKey: "T01", scoreImpact: 4,
    });
    p = await pontiDelProgramma(A.userId, A.orgId, A.companyId, ANNO);
    const p02 = p.find((x) => x.faseKey === "proc02")!;
    expect(p02.stato).toBe("in-corso");
    expect(p02.dettaglio).toBe("1 temi su 18 valutati");
  });
});

describe("il ponte non tocca niente", () => {
  it("leggerlo non crea, non modifica e non cancella una riga", async () => {
    // ⚠️ La prova non e' che «non ci sono errori»: e' che il database sia identico prima
    // e dopo. Un ponte che scrivesse — anche solo per «tenere allineato» uno stato —
    // farebbe del percorso e della fase due verita' sullo stesso fatto.
    const fotografia = async () => ({
      inventari: (await db.select().from(ghgInventory).where(eq(ghgInventory.organizationId, A.orgId))).length,
      voci: (await db.select().from(ghgActivityRow).where(eq(ghgActivityRow.organizationId, A.orgId))).length,
      progetti: (await db.select().from(reportProject).where(eq(reportProject.organizationId, A.orgId))).length,
      temi: (await db.select().from(materialityAssessment).where(eq(materialityAssessment.organizationId, A.orgId)))
        .length,
      documenti: (await db.select().from(documentSnapshot).where(eq(documentSnapshot.organizationId, A.orgId)))
        .length,
      fasi: (await db.select().from(sgesgFase).where(eq(sgesgFase.organizationId, A.orgId))).length,
      programmi: (await db.select().from(sgesgProgramma).where(eq(sgesgProgramma.organizationId, A.orgId))).length,
    });

    const prima = await fotografia();
    for (let i = 0; i < 3; i++) await pontiDelProgramma(A.userId, A.orgId, A.companyId, ANNO);
    expect(await fotografia()).toEqual(prima);
  });

  it("un percorso PRONTO non conclude la fase da solo", async () => {
    // La fase 04 e' «pronta» dal punto di vista del ponte — l'inventario e' pubblicato —
    // ma la fase resta da avviare finche' il consulente non la chiude.
    const p = await pontiDelProgramma(A.userId, A.orgId, A.companyId, ANNO);
    expect(p.find((x) => x.faseKey === "proc04")!.stato).toBe("pronto");

    const v = (await getProgramma(A.userId, A.orgId, A.companyId, ANNO))!;
    expect(v.fasi.find((f) => f.key === "proc04")!.stato).toBe("da_avviare");
    expect(v.avanzamento.concluse).toBe(0);
  });
});

describe("confine fra studi", () => {
  it("i ponti di un'azienda di un altro studio non mostrano niente", async () => {
    const B = await creaStudio({ prefisso: "pon-b", run: RUN, nomeAzienda: "Azienda B" });
    await db.insert(orgEntitlement).values({ organizationId: B.orgId, status: "active" });
    const p = await pontiDelProgramma(B.userId, B.orgId, A.companyId, ANNO);
    // ⚠️ Tutti «mancanti»: i percorsi ci sono, ma non sono suoi. Un ponte che leggesse
    // senza filtrare l'organizzazione mostrerebbe i numeri di un altro studio, e in
    // sviluppo — dove la connessione e' privilegiata — nessuno se ne accorgerebbe.
    expect(p.every((x) => x.stato === "mancante")).toBe(true);
    expect(p.every((x) => x.dettaglio === null)).toBe(true);
    await pulisciStudio(B.orgId, B.userId);
  });
});
