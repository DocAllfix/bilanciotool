import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { mogModel, mogProcess, mogScenario, orgEntitlement } from "@/lib/db/schema";
import { creaStudio, pulisciStudio } from "./comune";
import {
  aggiornaProfilo,
  aggiungiScenario,
  creaModello,
  creaProcesso,
  eliminaProcesso,
  eliminaScenario,
  getModello,
  listaProcessi,
  setApplicabilita,
  setCampoProcesso,
  setCampoRequisito,
  setCampoScenario,
} from "@/features/mog231/modello";
import { getMog231 } from "@/features/mog231/queries";

// Il confine fra due studi, provato dall'esterno.
//
// ⚠️ NON prova RLS: prova il FILTRO APPLICATIVO. In sviluppo la connessione è
// privilegiata e le policy non scattano, quindi se l'unica difesa fosse quella questi
// test passerebbero per il motivo sbagliato. Qui si verifica che lo studio B non riesca
// a toccare le righe di A **anche con le policy spente**.
//
// Ogni asserzione è stata messa in rosso togliendo il filtro `organization_id` dalla
// funzione corrispondente.

const RUN = Date.now();
let A: Awaited<ReturnType<typeof creaStudio>>;
let B: Awaited<ReturnType<typeof creaStudio>>;
let modelloA: string;
let processoA: string;
let scenarioA: string;

beforeAll(async () => {
  A = await creaStudio({ prefisso: "mogA", run: RUN, nomeAzienda: "Alfa 231 S.p.A." });
  B = await creaStudio({ prefisso: "mogB", run: RUN, nomeAzienda: "Beta 231 S.r.l." });
  for (const s of [A, B]) {
    await db.insert(orgEntitlement).values({ organizationId: s.orgId, status: "active" });
  }
  modelloA = await creaModello(A.userId, A.orgId, { companyId: A.companyId });
  processoA = await creaProcesso(A.userId, A.orgId, modelloA, { nome: "Gare pubbliche di Alfa" });
  scenarioA = await aggiungiScenario(A.userId, A.orgId, processoA, "24");
});

afterAll(async () => {
  await pulisciStudio(A.orgId, A.userId);
  await pulisciStudio(B.orgId, B.userId);
});

describe("lo studio B non vede il Modello di A", () => {
  it("non lo trova per companyId", async () => {
    expect(await getModello(B.userId, B.orgId, A.companyId)).toBeNull();
  });

  it("non ne legge il modello completo", async () => {
    const d = await getMog231(B.userId, B.orgId, A.companyId);
    expect(d).toBeNull();
  });

  it("non ne elenca i processi sensibili", async () => {
    expect(await listaProcessi(B.userId, B.orgId, modelloA)).toHaveLength(0);
  });
});

describe("lo studio B non scrive sulle righe di A", () => {
  it("non aggiorna il profilo", async () => {
    await expect(aggiornaProfilo(B.userId, B.orgId, modelloA, { sede: "Intruso" })).rejects.toThrow();
    const [m] = await db.select().from(mogModel).where(eq(mogModel.id, modelloA));
    // La prova del divieto è la RIGA CHE NON CAMBIA, non il messaggio.
    expect(m!.sede).toBeNull();
  });

  it("non aggiunge un processo al Modello di A", async () => {
    await expect(creaProcesso(B.userId, B.orgId, modelloA, { nome: "Processo dell'intruso" })).rejects.toThrow();
    const p = await db.select().from(mogProcess).where(eq(mogProcess.modelId, modelloA));
    expect(p).toHaveLength(1);
    expect(p[0]!.nome).toBe("Gare pubbliche di Alfa");
  });

  it("non modifica ne' cancella un processo di A", async () => {
    await expect(
      setCampoProcesso(B.userId, B.orgId, processoA, { campo: "area", valore: "Intruso" }),
    ).rejects.toThrow();
    await expect(eliminaProcesso(B.userId, B.orgId, processoA)).rejects.toThrow();
    const [p] = await db.select().from(mogProcess).where(eq(mogProcess.id, processoA));
    expect(p!.area).toBeNull();
  });

  it("non aggiunge uno scenario a un processo di A", async () => {
    await expect(aggiungiScenario(B.userId, B.orgId, processoA, "25")).rejects.toThrow();
    const s = await db.select().from(mogScenario).where(eq(mogScenario.processId, processoA));
    expect(s).toHaveLength(1);
  });

  it("non valuta ne' cancella uno scenario di A", async () => {
    await expect(
      setCampoScenario(B.userId, B.orgId, scenarioA, { campo: "probabilita", valore: 4 }),
    ).rejects.toThrow();
    await expect(eliminaScenario(B.userId, B.orgId, scenarioA)).rejects.toThrow();
    const [s] = await db.select().from(mogScenario).where(eq(mogScenario.id, scenarioA));
    expect(s!.probabilita).toBeNull();
  });

  it("non dichiara applicabile un reato nel Modello di A", async () => {
    await expect(
      setApplicabilita(B.userId, B.orgId, modelloA, { crimeKey: "24", campo: "applicabile", valore: "Sì" }),
    ).rejects.toThrow();
    const d = await getMog231(A.userId, A.orgId, A.companyId);
    expect(d!.applicabilita).toHaveLength(0);
  });

  it("non valuta un requisito nel Modello di A", async () => {
    await expect(
      setCampoRequisito(B.userId, B.orgId, modelloA, {
        requirementKey: "P1.01",
        campo: "stato",
        valore: "Presente ed efficace",
      }),
    ).rejects.toThrow();
    const d = await getMog231(A.userId, A.orgId, A.companyId);
    expect(d!.statiRequisiti).toHaveLength(0);
  });
});
