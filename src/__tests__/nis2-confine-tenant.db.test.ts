import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { orgEntitlement, nis2Assessment, nis2Profile, nis2RequirementState, nis2System } from "@/lib/db/schema";
import { creaStudio, pulisciStudio, type Studio } from "./comune";
import {
  aggiornaAmbito,
  creaAutovalutazione,
  getQuadro,
  setCampoRequisito,
} from "@/features/nis2/profilo";

// IL CONFINE DI TENANT SENZA L'AIUTO DI RLS.
//
// ⚠️ Questo test gira anche con la connessione PRIVILEGIATA, cioe' quella dello sviluppo,
// dove le policy non scattano. E' voluto: se l'isolamento reggesse solo grazie a RLS, in
// sviluppo non lo vedrebbe nessuno — e per undici mesi in produzione le policy NON hanno
// scattato affatto, perche' al ruolo `app_rls` mancava `LOGIN`. La difesa sta in due
// strati, e questo prova quello applicativo.
//
// La prova di un divieto e' la riga che non compare, non il messaggio.
//
// ⚠️ MISURATO RIMETTENDO IL DIFETTO, e vale la pena saperlo: togliendo il filtro
// sull'organizzazione dalla lettura dell'azienda, di questi cinque test ne diventa rosso
// UNO SOLO — il primo. Gli altri tre continuano a passare, ma **per il motivo sbagliato**:
// le scritture falliscono lo stesso perche' il profilo di A non e' raggiungibile con
// l'organizzazione di B, e l'eccezione che esce dice «Profilo non creato» invece di
// «Azienda non trovata».
//
// Quindi il controllo che regge davvero e' quello sulla LETTURA. Chi un domani vedesse
// rossi solo quei tre non deve concludere che il confine tiene: deve rimettere il difetto
// e guardare quale asserzione cade.

const url = process.env.DATABASE_URL;
const run = Date.now();

describe.skipIf(!url)("NIS2: il confine di tenant senza l'aiuto di RLS", () => {
  let A: Studio;
  let B: Studio;

  beforeAll(async () => {
    A = await creaStudio({ prefisso: "nis2a", run, nomeAzienda: "Azienda di A" });
    B = await creaStudio({ prefisso: "nis2b", run, nomeAzienda: "Azienda di B" });
    for (const s of [A, B]) {
      await db.insert(orgEntitlement).values({ organizationId: s.orgId, status: "active" });
    }
    await creaAutovalutazione(A.userId, A.orgId, A.companyId);
    await aggiornaAmbito(A.userId, A.orgId, A.companyId, { settore: "Energia", dimensione: "grande" });
    await setCampoRequisito(A.userId, A.orgId, A.companyId, {
      requirementKey: "G.01",
      campo: "livello",
      valore: 4,
    });
  });

  afterAll(async () => {
    for (const s of [A, B]) {
      await db.delete(nis2RequirementState).where(eq(nis2RequirementState.organizationId, s.orgId));
      await db.delete(nis2Assessment).where(eq(nis2Assessment.organizationId, s.orgId));
      await db.delete(nis2System).where(eq(nis2System.organizationId, s.orgId));
      await db.delete(nis2Profile).where(eq(nis2Profile.organizationId, s.orgId));
      await pulisciStudio(s.orgId, s.userId);
    }
  });

  it("B non legge il quadro dell'azienda di A", async () => {
    const q = await getQuadro(B.userId, B.orgId, A.companyId, "autovalutazione");
    expect(q).toBeNull();
  });

  it("B non apre un percorso sull'azienda di A", async () => {
    await expect(creaAutovalutazione(B.userId, B.orgId, A.companyId)).rejects.toThrow();

    // ⚠️ La prova e' la riga che non compare: A ne ha una sola, e nessuna e' di B.
    const righe = await db
      .select()
      .from(nis2Assessment)
      .where(eq(nis2Assessment.companyId, A.companyId));
    expect(righe).toHaveLength(1);
    expect(righe[0].organizationId).toBe(A.orgId);
  });

  it("B non tocca l'ambito dell'azienda di A", async () => {
    await expect(
      aggiornaAmbito(B.userId, B.orgId, A.companyId, { settore: "Trasporti", dimensione: "micro" }),
    ).rejects.toThrow();

    const [profilo] = await db
      .select()
      .from(nis2Profile)
      .where(eq(nis2Profile.companyId, A.companyId));
    // Il dato di A e' intatto: il rifiuto non ha scritto niente.
    expect(profilo.settore).toBe("Energia");
    expect(profilo.dimensione).toBe("grande");
  });

  it("B non risponde a un requisito sull'azienda di A", async () => {
    await expect(
      setCampoRequisito(B.userId, B.orgId, A.companyId, {
        requirementKey: "G.01",
        campo: "livello",
        valore: 0,
      }),
    ).rejects.toThrow();

    const righe = await db
      .select()
      .from(nis2RequirementState)
      .where(eq(nis2RequirementState.companyId, A.companyId));
    expect(righe).toHaveLength(1);
    expect(righe[0].livello).toBe(4);
    expect(righe[0].organizationId).toBe(A.orgId);
  });

  it("A continua a lavorare sulla propria azienda", async () => {
    // ⚠️ Un confine che blocca anche il legittimo non e' un confine: e' un guasto. Senza
    // questo, un filtro scritto troppo stretto passerebbe i quattro test qui sopra.
    const q = await getQuadro(A.userId, A.orgId, A.companyId, "autovalutazione");
    expect(q).not.toBeNull();
    expect(q!.ambito!.classe).toBe("essenziale");
    expect(q!.conformita!.valutati).toBe(1);
  });
});
