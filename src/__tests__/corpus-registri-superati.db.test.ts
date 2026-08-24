import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { corpusRegister, corpusRegisterRow, orgEntitlement } from "@/lib/db/schema";
import { creaStudio, pulisciStudio } from "./comune";
import { aggiungiRiga } from "@/features/corpus/registri";
import { registriSuperati } from "@/features/corpus/registri-superati";
import { creaModello } from "@/features/mog231/modello";
import { creaAssetto } from "@/features/segnalazioni/sistema";

// I registri delle segnalazioni duplicati in 231 e ISO 37001.
//
// ⚠️ Il fatto che questo test difende: tre copie dello stesso dato personale
// ultra-sensibile in tre tabelle sono, di per sé, una violazione del principio di
// minimizzazione — e quella meno curata è quella che si compila per prima, perché è lì
// sotto gli occhi mentre si lavora al Modello.
//
// ⚠️ E il divieto si prova sulla RIGA CHE NON COMPARE, non sul messaggio: l'interfaccia
// nasconde il comando, ma la server action è un endpoint HTTP e deve rifiutare da sola.

const RUN = Date.now();
const REG_231 = "MOD-06.02";
let S: Awaited<ReturnType<typeof creaStudio>>;

beforeAll(async () => {
  S = await creaStudio({ prefisso: "sup", run: RUN, nomeAzienda: "Superati S.p.A." });
  await db.insert(orgEntitlement).values({ organizationId: S.orgId, status: "active" });
  await creaModello(S.userId, S.orgId, { companyId: S.companyId });
});

afterAll(async () => {
  await pulisciStudio(S.orgId, S.userId);
});

/** L'identificativo del registro nel corpus, cercato per `mod_code`. */
async function registerIdDi(modCode: string): Promise<string> {
  const [r] = await db
    .select({ registerId: corpusRegister.registerId })
    .from(corpusRegister)
    .where(and(eq(corpusRegister.contentSetId, "mog231-v1"), eq(corpusRegister.modCode, modCode)));
  if (!r) throw new Error(`registro ${modCode} assente dal corpus`);
  return r.registerId;
}

describe("finché il modulo Segnalazioni non è attivo", () => {
  it("il registro del 231 è scrivibile, perché è l'unico posto che l'ente ha", async () => {
    expect(await registriSuperati(S.userId, S.orgId, S.companyId, "mog231-v1")).toEqual(new Map());

    const registerId = await registerIdDi(REG_231);
    const riga = await aggiungiRiga(S.userId, S.orgId, {
      companyId: S.companyId,
      contentSetId: "mog231-v1",
      registerId,
      dati: {},
    });
    expect(riga.id).toBeTruthy();

    await db
      .delete(corpusRegisterRow)
      .where(and(eq(corpusRegisterRow.id, riga.id), eq(corpusRegisterRow.organizationId, S.orgId)));
  });
});

describe("quando il modulo Segnalazioni è attivo", () => {
  beforeAll(async () => {
    await creaAssetto(S.userId, S.orgId, { companyId: S.companyId });
  });

  it("il registro del 231 risulta superato, col rimando al modulo", async () => {
    const superati = await registriSuperati(S.userId, S.orgId, S.companyId, "mog231-v1");
    expect(superati.has(REG_231)).toBe(true);
    expect(superati.get(REG_231)!.rotta).toBe(`/aziende/${S.companyId}/segnalazioni`);
  });

  it("⚠️ e la scrittura viene RIFIUTATA dal server, non solo nascosta a schermo", async () => {
    const registerId = await registerIdDi(REG_231);
    const prima = await db
      .select()
      .from(corpusRegisterRow)
      .where(
        and(eq(corpusRegisterRow.registerId, registerId), eq(corpusRegisterRow.organizationId, S.orgId)),
      );

    await expect(
      aggiungiRiga(S.userId, S.orgId, {
        companyId: S.companyId,
        contentSetId: "mog231-v1",
        registerId,
        dati: {},
      }),
    ).rejects.toThrow(/sola lettura/);

    // La prova del divieto è la riga che non compare.
    const dopo = await db
      .select()
      .from(corpusRegisterRow)
      .where(
        and(eq(corpusRegisterRow.registerId, registerId), eq(corpusRegisterRow.organizationId, S.orgId)),
      );
    expect(dopo).toHaveLength(prima.length);
  });

  it("gli altri registri del 231 restano scrivibili", async () => {
    const superati = await registriSuperati(S.userId, S.orgId, S.companyId, "mog231-v1");
    expect(superati.size).toBe(1);
  });

  it("e i registri degli altri moduli non sono toccati", async () => {
    expect(await registriSuperati(S.userId, S.orgId, S.companyId, "sgiqas-v1")).toEqual(new Map());
    expect(await registriSuperati(S.userId, S.orgId, S.companyId, "filiera-v1")).toEqual(new Map());
  });
});
