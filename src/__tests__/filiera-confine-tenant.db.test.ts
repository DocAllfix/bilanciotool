import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { chainPartner, chainPartnerScore, chainProgram, orgEntitlement } from "@/lib/db/schema";
import { creaStudio, pulisciStudio } from "./comune";
import {
  aggiornaProfilo,
  creaPartner,
  creaProgramma,
  eliminaPartner,
  setCampoPartner,
  setFlag,
  setPunteggio,
} from "@/features/filiera/programma";
import { getFiliera } from "@/features/filiera/queries";

// Il confine fra due studi, provato dall'esterno.
//
// ⚠️ NON prova RLS: prova il FILTRO APPLICATIVO. In sviluppo la connessione è
// privilegiata e le policy non scattano, quindi se l'unica difesa fosse quella questi
// test passerebbero per il motivo sbagliato. Qui si verifica che lo studio B non riesca a
// toccare le righe di A **anche con le policy spente**.
//
// Ogni asserzione è stata messa in rosso togliendo il filtro `organization_id` dalla
// funzione corrispondente.

const RUN = Date.now();
let A: Awaited<ReturnType<typeof creaStudio>>;
let B: Awaited<ReturnType<typeof creaStudio>>;
let programmaA: string;
let partnerA: string;

beforeAll(async () => {
  A = await creaStudio({ prefisso: "filA", run: RUN, nomeAzienda: "Alfa Filiera S.p.A." });
  B = await creaStudio({ prefisso: "filB", run: RUN, nomeAzienda: "Beta Filiera S.r.l." });
  for (const s of [A, B]) {
    await db.insert(orgEntitlement).values({ organizationId: s.orgId, status: "active" });
  }
  programmaA = await creaProgramma(A.userId, A.orgId, { companyId: A.companyId });
  partnerA = await creaPartner(A.userId, A.orgId, programmaA, { nome: "Fornitore riservato di Alfa" });
});

afterAll(async () => {
  await pulisciStudio(A.orgId, A.userId);
  await pulisciStudio(B.orgId, B.userId);
});

describe("lo studio B non vede la filiera di A", () => {
  it("non la trova per companyId", async () => {
    expect(await getFiliera(B.userId, B.orgId, A.companyId)).toBeNull();
  });

  it("non ne elenca i partner dal proprio programma", async () => {
    const programmaB = await creaProgramma(B.userId, B.orgId, { companyId: B.companyId });
    expect(programmaB).toBeTruthy();
    const d = await getFiliera(B.userId, B.orgId, B.companyId);
    expect(d?.partner).toHaveLength(0);
  });
});

describe("lo studio B non scrive sulle righe di A", () => {
  it("non aggiorna il profilo del programma", async () => {
    await expect(aggiornaProfilo(B.userId, B.orgId, programmaA, { sede: "Intruso" })).rejects.toThrow();
    const [p] = await db.select().from(chainProgram).where(eq(chainProgram.id, programmaA));
    // La prova del divieto è la RIGA CHE NON CAMBIA, non il messaggio.
    expect(p!.sede).toBeNull();
  });

  it("non aggiunge un partner al programma di A", async () => {
    await expect(
      creaPartner(B.userId, B.orgId, programmaA, { nome: "Partner dell'intruso" }),
    ).rejects.toThrow();
    const righe = await db.select().from(chainPartner).where(eq(chainPartner.programId, programmaA));
    expect(righe).toHaveLength(1);
    expect(righe[0]!.nome).toBe("Fornitore riservato di Alfa");
  });

  it("non modifica né cancella un partner di A", async () => {
    await expect(
      setCampoPartner(B.userId, B.orgId, partnerA, { campo: "paese", valore: "Intruso" }),
    ).rejects.toThrow();
    await expect(eliminaPartner(B.userId, B.orgId, partnerA)).rejects.toThrow();
    const [p] = await db.select().from(chainPartner).where(eq(chainPartner.id, partnerA));
    expect(p!.paese).toBeNull();
  });

  it("non valuta un partner di A", async () => {
    await expect(
      setPunteggio(B.userId, B.orgId, partnerA, { genere: "dim", chiave: "rp", valore: 4 }),
    ).rejects.toThrow();
    const righe = await db
      .select()
      .from(chainPartnerScore)
      .where(eq(chainPartnerScore.partnerId, partnerA));
    expect(righe).toHaveLength(0);
  });

  it("non accende un fattore aggravante su un partner di A", async () => {
    await expect(setFlag(B.userId, B.orgId, partnerA, { chiave: "f_prov", acceso: true })).rejects.toThrow();
    const [p] = await db.select().from(chainPartner).where(eq(chainPartner.id, partnerA));
    expect(p!.flag).toEqual([]);
  });
});
