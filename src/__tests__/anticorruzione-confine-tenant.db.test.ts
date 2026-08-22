import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { briberyPartner, briberySystem, orgEntitlement } from "@/lib/db/schema";
import { creaStudio, pulisciStudio } from "./comune";
import {
  aggiornaProfilo,
  creaSistema,
  creaSocio,
  eliminaSocio,
  getSistema,
  listaSoci,
  setCampoRequisito,
  setCampoSocio,
} from "@/features/anticorruzione/sistema";
import { getAnticorruzione } from "@/features/anticorruzione/queries";
import { publishRelazionePcSnapshot } from "@/features/documents/snapshot";

// Il confine fra due studi, provato dall'esterno.
//
// ⚠️ Questo file non prova RLS: prova il FILTRO APPLICATIVO. In sviluppo la connessione
// è privilegiata e le policy non scattano, quindi se l'unica difesa fosse RLS questi
// test passerebbero comunque — e passerebbero per il motivo sbagliato. Qui si verifica
// che lo studio B non riesca a toccare le righe di A **anche quando le policy sono
// spente**. RLS è il secondo strato, e ha i propri test in `rls.db.test.ts`.
//
// Ogni asserzione è stata messa in rosso di proposito togliendo il filtro
// `organization_id` dalla funzione corrispondente.

const RUN = Date.now();
let A: Awaited<ReturnType<typeof creaStudio>>;
let B: Awaited<ReturnType<typeof creaStudio>>;
let sistemaA: string;
let socioA: string;

beforeAll(async () => {
  A = await creaStudio({ prefisso: "pcA", run: RUN, nomeAzienda: "Alfa Costruzioni S.p.A." });
  B = await creaStudio({ prefisso: "pcB", run: RUN, nomeAzienda: "Beta Servizi S.r.l." });
  for (const s of [A, B]) {
    await db.insert(orgEntitlement).values({ organizationId: s.orgId, status: "active" });
  }
  sistemaA = await creaSistema(A.userId, A.orgId, { companyId: A.companyId });
  socioA = await creaSocio(A.userId, A.orgId, sistemaA, { nome: "Intermediario di Alfa" });
});

afterAll(async () => {
  await pulisciStudio(A.orgId, A.userId);
  await pulisciStudio(B.orgId, B.userId);
});

describe("lo studio B non vede il sistema di A", () => {
  it("non lo trova per companyId", async () => {
    // Anche conoscendo l'identificativo dell'azienda di A — che potrebbe averlo letto
    // in un indirizzo condiviso per sbaglio.
    expect(await getSistema(B.userId, B.orgId, A.companyId)).toBeNull();
  });

  it("non ne legge il modello completo", async () => {
    expect(await getAnticorruzione(B.userId, B.orgId, A.companyId)).toBeNull();
  });

  it("non ne elenca i soci in affari", async () => {
    const soci = await listaSoci(B.userId, B.orgId, sistemaA);
    expect(soci).toHaveLength(0);
  });
});

describe("lo studio B non scrive sulle righe di A", () => {
  it("non aggiorna il profilo", async () => {
    await expect(aggiornaProfilo(B.userId, B.orgId, sistemaA, { direzione: "Intruso" })).rejects.toThrow();
    const [s] = await db.select().from(briberySystem).where(eq(briberySystem.id, sistemaA));
    // La prova del divieto è la RIGA CHE NON CAMBIA, non il messaggio: un'azione può
    // fallire rumorosamente e aver scritto lo stesso.
    expect(s!.direzione).toBeNull();
  });

  it("non aggiunge un socio al sistema di A", async () => {
    await expect(creaSocio(B.userId, B.orgId, sistemaA, { nome: "Socio dell'intruso" })).rejects.toThrow();
    const soci = await db.select().from(briberyPartner).where(eq(briberyPartner.systemId, sistemaA));
    expect(soci).toHaveLength(1);
    expect(soci[0]!.nome).toBe("Intermediario di Alfa");
  });

  it("non modifica un socio di A", async () => {
    await expect(
      setCampoSocio(B.userId, B.orgId, socioA, { campo: "dimPaese", valore: 4 }),
    ).rejects.toThrow();
    const [p] = await db.select().from(briberyPartner).where(eq(briberyPartner.id, socioA));
    expect(p!.dimPaese).toBeNull();
  });

  it("non cancella un socio di A", async () => {
    await expect(eliminaSocio(B.userId, B.orgId, socioA)).rejects.toThrow();
    const [p] = await db.select().from(briberyPartner).where(eq(briberyPartner.id, socioA));
    expect(p).toBeDefined();
  });

  it("non valuta un requisito nel sistema di A", async () => {
    const d = await getAnticorruzione(A.userId, A.orgId, A.companyId);
    const chiave = d!.catalogo.requisiti[0]!.key;
    await expect(
      setCampoRequisito(B.userId, B.orgId, sistemaA, { requirementKey: chiave, campo: "stato", valore: "Conforme" }),
    ).rejects.toThrow();
    const dopo = await getAnticorruzione(A.userId, A.orgId, A.companyId);
    expect(dopo!.statiRequisiti).toHaveLength(0);
  });

  it("non pubblica un documento sull'azienda di A", async () => {
    await expect(publishRelazionePcSnapshot(B.userId, B.orgId, A.companyId)).rejects.toThrow();
  });
});
