import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { randomUUID } from "node:crypto";
import { db } from "@/lib/db";
import {
  organization, member, orgEntitlement, company, energyBalance, energyNarrative,
  energyMedia, auditLog, user,
} from "@/lib/db/schema";
import { addMedia, saveChapter } from "@/features/energy/narrative";
import { latestEnergySetId } from "@/features/energy/balances";
import { eq } from "drizzle-orm";
import { creaStudio, pulisciStudio, type Studio } from "./comune";

// Il confine fra due studi sui capitoli del bilancio energetico, misurato con la
// connessione PRIVILEGIATA.
//
// Gira di proposito **senza** `RLS_FORCE_ROLE=app_rls`, cioè con le policy che non
// scattano: è l'unico modo di vedere lo strato applicativo da solo. Con RLS attivo questo
// test passerebbe comunque, e passerebbe per il motivo sbagliato.
//
// Il difetto che pinna: in `addMedia` la verifica «questo bilancio è mio» stava **dentro
// il ramo “il capitolo non esiste”**. Nel caso normale — il capitolo c'è già, perché lo
// si è appena scritto — non veniva eseguita mai. È la stessa forma corretta in
// `soa/declarations.ts`, rimasta qui.

const url = process.env.DATABASE_URL;
const RUN = Date.now();

let A: Studio;
let B: Studio;

/** L'entitlement resta QUI: `active` e' la premessa del test, non arredamento. */
async function studioAttivo(prefisso: string, nome: string): Promise<Studio> {
  const s = await creaStudio({ prefisso, run: RUN, nomeStudio: nome, nomeAzienda: `Cliente di ${nome}` });
  await db.insert(orgEntitlement).values({ organizationId: s.orgId, status: "active" });
  return s;
}

const PNG =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";

let bilancioDiA = "";

describe.skipIf(!url)("energetico: il confine di tenant senza l'aiuto di RLS", () => {
  beforeAll(async () => {
    A = await studioAttivo("eneA", "Studio Ene A");
    B = await studioAttivo("eneB", "Studio Ene B");
    bilancioDiA = randomUUID();
    await db.insert(energyBalance).values({
      id: bilancioDiA,
      organizationId: A.orgId,
      companyId: A.companyId,
      anno: 2025,
      annoBase: 2024,
      contentSetId: await latestEnergySetId(),
    });
    // Il capitolo esiste GIÀ: è la condizione che rendeva la verifica irraggiungibile.
    await saveChapter(A.userId, A.orgId, bilancioDiA, "sintesi", { type: "doc", content: [] });
  });

  afterAll(async () => {
    for (const s of [A, B]) {
      // Le tabelle del modulo PRIMA della coda comune: l'ordine lo impongono le chiavi
      // esterne, e solo il test sa quali ha sporcato.
      await db.delete(energyMedia).where(eq(energyMedia.organizationId, s.orgId));
      await db.delete(energyNarrative).where(eq(energyNarrative.organizationId, s.orgId));
      await db.delete(energyBalance).where(eq(energyBalance.organizationId, s.orgId));
      await pulisciStudio(s.orgId, s.userId);
    }
  });

  it("B non aggiunge media a un capitolo GIÀ ESISTENTE di A", async () => {
    await expect(
      addMedia(B.userId, B.orgId, bilancioDiA, "sintesi", { tipo: "img", dataUrl: PNG }),
    ).rejects.toThrow();

    const media = await db.select().from(energyMedia).where(eq(energyMedia.organizationId, B.orgId));
    expect(media, "nessun media di B deve esistere").toHaveLength(0);

    // La prova che conta: nemmeno agganciato al capitolo di A sotto altro nome.
    const suA = await db
      .select()
      .from(energyNarrative)
      .where(eq(energyNarrative.balanceId, bilancioDiA));
    expect(suA.every((r) => r.organizationId === A.orgId)).toBe(true);
  });

  it("B non scrive capitoli sul bilancio di A", async () => {
    await expect(
      saveChapter(B.userId, B.orgId, bilancioDiA, "obiettivi", { type: "doc", content: [] }),
    ).rejects.toThrow();
    const righe = await db
      .select()
      .from(energyNarrative)
      .where(eq(energyNarrative.balanceId, bilancioDiA));
    expect(righe.some((r) => r.templateKey === "obiettivi")).toBe(false);
  });

  it("A continua a lavorare sul proprio bilancio", async () => {
    // La difesa non deve aver chiuso la porta anche al proprietario.
    const id = await addMedia(A.userId, A.orgId, bilancioDiA, "sintesi", { tipo: "img", dataUrl: PNG });
    expect(id).toBeTruthy();
    const [m] = await db.select().from(energyMedia).where(eq(energyMedia.id, id));
    expect(m.organizationId).toBe(A.orgId);
    expect(m.storageKey).toMatch(/\.png$/);
  });
});
