import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { mogModel, mogProcess, mogScenario, orgEntitlement } from "@/lib/db/schema";
import { creaStudio, pulisciStudio } from "./comune";
import {
  aggiornaProfilo,
  aggiungiScenario,
  creaModello,
  creaProcesso,
  eliminaProcesso,
  setApplicabilita,
  setCampoRequisito,
  setCampoScenario,
} from "@/features/mog231/modello";
import { getMog231 } from "@/features/mog231/queries";

// Il ciclo del Modello 231 sui FATTI DEL DATABASE.
//
// Il motore e' gia' provato dalle cento combinazioni del golden. Qui si prova l'altra
// meta': che i fatti scritti, riletti e passati al motore diano gli stessi numeri. E'
// il punto in cui una colonna mappata sulla scala sbagliata si vedrebbe.

const RUN = Date.now();
let studio: Awaited<ReturnType<typeof creaStudio>>;
let modelId: string;

async function dati() {
  const d = await getMog231(studio.userId, studio.orgId, studio.companyId);
  if (!d?.modello) throw new Error("il Modello non risulta creato");
  return d;
}

beforeAll(async () => {
  studio = await creaStudio({ prefisso: "mog", run: RUN, nomeAzienda: "Costruzioni Lucane S.p.A." });
  await db.insert(orgEntitlement).values({ organizationId: studio.orgId, status: "active" });
  modelId = await creaModello(studio.userId, studio.orgId, { companyId: studio.companyId });
});

afterAll(async () => {
  await pulisciStudio(studio.orgId, studio.userId);
});

describe("modello", () => {
  it("congela il catalogo e eredita la ragione sociale", async () => {
    const [m] = await db.select().from(mogModel).where(eq(mogModel.id, modelId));
    expect(m!.contentSetId).toBe("mog231-v1");
    expect(m!.ragione).toBe("Costruzioni Lucane S.p.A.");
  });

  it("un'azienda ha un Modello solo", async () => {
    await expect(creaModello(studio.userId, studio.orgId, { companyId: studio.companyId })).rejects.toThrow();
  });

  it("il profilo si aggiorna a toppe parziali", async () => {
    await aggiornaProfilo(studio.userId, studio.orgId, modelId, { organoAmministrativo: "Consiglio di amministrazione" });
    await aggiornaProfilo(studio.userId, studio.orgId, modelId, { odvComposizione: "Collegiale, tre membri" });
    const [m] = await db.select().from(mogModel).where(eq(mogModel.id, modelId));
    expect(m!.organoAmministrativo).toBe("Consiglio di amministrazione");
    expect(m!.odvComposizione).toBe("Collegiale, tre membri");
    expect(m!.ragione).toBe("Costruzioni Lucane S.p.A.");
  });

  it("rifiuta una data non valida", async () => {
    await expect(
      aggiornaProfilo(studio.userId, studio.orgId, modelId, { dataAdozione: "2026-02-31" }),
    ).rejects.toThrow();
  });
});

describe("processi e scenari", () => {
  let processId: string;
  let scenarioId: string;

  it("un processo nasce col solo nome", async () => {
    processId = await creaProcesso(studio.userId, studio.orgId, modelId, { nome: "Gare e appalti pubblici" });
    const [p] = await db.select().from(mogProcess).where(eq(mogProcess.id, processId));
    expect(p!.nome).toBe("Gare e appalti pubblici");
  });

  it("uno scenario nasce NON valutato, e non e' accettabile", async () => {
    scenarioId = await aggiungiScenario(studio.userId, studio.orgId, processId, "24");
    const d = await dati();
    const s = d.scenari.find((x) => x.id === scenarioId)!;
    // Aggiungere un reato peggiora il cruscotto finche' non lo si valuta: un rischio
    // non misurato non e' un rischio assente.
    expect(s.inerente).toBeNull();
    expect(s.residuo).toBeNull();
    expect(s.accettabile).toBe(false);
    expect(d.indicatori.nonAccettabili).toBe(1);
  });

  it("rifiuta un reato che non esiste nel catalogo del modello", async () => {
    await expect(aggiungiScenario(studio.userId, studio.orgId, processId, "999")).rejects.toThrow(/catalogo/i);
  });

  it("probabilita' e impatto producono il rischio inerente, e i presidi il residuo", async () => {
    await setCampoScenario(studio.userId, studio.orgId, scenarioId, { campo: "probabilita", valore: 4 });
    await setCampoScenario(studio.userId, studio.orgId, scenarioId, { campo: "impatto", valore: 4 });
    let s = (await dati()).scenari.find((x) => x.id === scenarioId)!;
    expect(s.inerente).toBe("Critico");
    // ⚠️ Presidi non dichiarati valgono «Assenti»: il residuo resta Critico.
    expect(s.residuo).toBe("Critico");
    expect(s.accettabile).toBe(false);

    await setCampoScenario(studio.userId, studio.orgId, scenarioId, { campo: "adeguatezza", valore: "Adeguati" });
    s = (await dati()).scenari.find((x) => x.id === scenarioId)!;
    expect(s.residuo).toBe("Medio");
    expect(s.accettabile).toBe(true);
  });

  it("l'adeguatezza resta NULL nel database anche se il motore la legge come «Assenti»", async () => {
    await setCampoScenario(studio.userId, studio.orgId, scenarioId, { campo: "adeguatezza", valore: null });
    const [riga] = await db.select().from(mogScenario).where(eq(mogScenario.id, scenarioId));
    // Due fatti diversi da raccontare in un documento: «non l'ho valutato» e «ho
    // valutato che non ci sono presidi». A confonderli e' il motore, non il dato.
    expect(riga!.adeguatezza).toBeNull();
    const s = (await dati()).scenari.find((x) => x.id === scenarioId)!;
    expect(s.residuo).toBe("Critico");
  });

  it("il livello di un processo e' il peggiore dei suoi scenari", async () => {
    const secondo = await aggiungiScenario(studio.userId, studio.orgId, processId, "25");
    await setCampoScenario(studio.userId, studio.orgId, secondo, { campo: "probabilita", valore: 1 });
    await setCampoScenario(studio.userId, studio.orgId, secondo, { campo: "impatto", valore: 1 });
    await setCampoScenario(studio.userId, studio.orgId, secondo, { campo: "adeguatezza", valore: "Adeguati" });
    const d = await dati();
    const p = d.processi.find((x) => x.id === processId)!;
    expect(p.scenari).toBe(2);
    // Uno Basso e uno Critico: il processo e' Critico, non Medio.
    expect(p.livello).toBe("Critico");
  });

  it("cancellare un processo porta via i suoi scenari", async () => {
    const altro = await creaProcesso(studio.userId, studio.orgId, modelId, { nome: "Da cancellare" });
    await aggiungiScenario(studio.userId, studio.orgId, altro, "24");
    await eliminaProcesso(studio.userId, studio.orgId, altro);
    const rimasti = await db.select().from(mogScenario).where(eq(mogScenario.processId, altro));
    expect(rimasti).toHaveLength(0);
  });
});

describe("reati e requisiti", () => {
  it("un reato applicabile senza scenari e' una lacuna dichiarata", async () => {
    // Il reato 25-septies non e' associato a nessun processo: il Modello dice che
    // riguarda l'ente ma non dice DOVE puo' essere commesso.
    await setApplicabilita(studio.userId, studio.orgId, modelId, {
      crimeKey: "25-septies",
      campo: "applicabile",
      valore: "Sì",
    });
    const d = await dati();
    expect(d.indicatori.reatiApplicabili).toBeGreaterThanOrEqual(1);
    expect(d.indicatori.applicabiliSenzaScenario).toBeGreaterThanOrEqual(1);
  });

  it("un presidio dovuto e non valutato pesa zero", async () => {
    const prima = await dati();
    const p1 = prima.pilastri.find((p) => p.key === "P1")!;
    expect(p1.idoneita).toBe(0);

    const primo = prima.catalogo.requisiti.find((r) => r.pillarKey === "P1")!;
    await setCampoRequisito(studio.userId, studio.orgId, modelId, {
      requirementKey: primo.key,
      campo: "stato",
      valore: "Presente ed efficace",
    });
    const dopo = await dati();
    const p1b = dopo.pilastri.find((p) => p.key === "P1")!;
    expect(p1b.valutati).toBe(1);
    // ⚠️ Il prototipo qui direbbe 100. E' lo scostamento documentato.
    expect(p1b.idoneita).toBe(Math.round(100 / p1b.requisiti));
    expect(p1b.idoneita).toBeLessThan(100);
  });

  it("rifiuta un requisito fuori dal catalogo del modello", async () => {
    await expect(
      setCampoRequisito(studio.userId, studio.orgId, modelId, {
        requirementKey: "Z9.99",
        campo: "stato",
        valore: "Assente",
      }),
    ).rejects.toThrow(/catalogo/i);
  });
});
