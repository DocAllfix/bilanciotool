import { withTenant } from "@/lib/db/tenant";
import { db } from "@/lib/db";
import { company, contentSet, ghgInventory } from "@/lib/db/schema";
import { logAudit } from "@/lib/audit";
import { requireEntitlement } from "@/features/entitlement";
import { and, desc, eq } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { inventarioSchema, boundariesSchema, metaPeriodoSchema } from "./validation";
import type { z } from "zod";

// Inventari GHG: uno per azienda+anno. La versione dei contenuti metodologici
// (content_set) si congela alla creazione: gli aggiornamenti normativi futuri
// non riscrivono gli inventari esistenti.

export async function latestContentSetId(dominio: "ghg" | "report"): Promise<string> {
  const rows = await db
    .select({ id: contentSet.id })
    .from(contentSet)
    .where(eq(contentSet.dominio, dominio))
    .orderBy(desc(contentSet.versione))
    .limit(1);
  if (!rows.length) throw new Error(`Nessun content_set per il dominio ${dominio}: eseguire npm run db:seed`);
  return rows[0].id;
}

export async function createInventory(
  userId: string,
  orgId: string,
  input: z.input<typeof inventarioSchema>,
): Promise<string> {
  await requireEntitlement(userId, orgId, "write_data");
  const v = inventarioSchema.parse(input);
  const setId = await latestContentSetId("ghg");
  const id = randomUUID();
  await withTenant({ userId, orgId }, async (tx) => {
    const [co] = await tx.select({ id: company.id }).from(company).where(eq(company.id, v.companyId));
    if (!co) throw new Error("Azienda inesistente o di un altro tenant");
    await tx.insert(ghgInventory).values({
      id,
      organizationId: orgId,
      companyId: v.companyId,
      anno: v.anno,
      annoBase: v.annoBase ?? v.anno,
      gwpSetKey: v.gwpSetKey,
      contentSetId: setId,
    });
    await logAudit(tx, { organizationId: orgId, userId, azione: "ghg.inventory.create", entita: "ghg_inventory", entitaId: id });
  });
  return id;
}

export async function updateBoundaries(
  userId: string,
  orgId: string,
  inventoryId: string,
  input: z.input<typeof boundariesSchema>,
): Promise<void> {
  await requireEntitlement(userId, orgId, "write_data");
  const patch = boundariesSchema.parse(input);
  await withTenant({ userId, orgId }, async (tx) => {
    const [inv] = await tx.select({ boundaries: ghgInventory.boundaries }).from(ghgInventory).where(eq(ghgInventory.id, inventoryId));
    if (!inv) throw new Error("Inventario inesistente o di un altro tenant");
    const merged = { ...(inv.boundaries as Record<string, string>), ...patch };
    await tx.update(ghgInventory).set({ boundaries: merged }).where(eq(ghgInventory.id, inventoryId));
    await logAudit(tx, { organizationId: orgId, userId, azione: "ghg.boundaries.update", entita: "ghg_inventory", entitaId: inventoryId });
  });
}

export async function updatePeriodMeta(
  userId: string,
  orgId: string,
  inventoryId: string,
  input: z.input<typeof metaPeriodoSchema>,
): Promise<void> {
  await requireEntitlement(userId, orgId, "write_data");
  const v = metaPeriodoSchema.parse(input);
  await withTenant({ userId, orgId }, async (tx) => {
    const updated = await tx
      .update(ghgInventory)
      .set({
        ricavi: v.ricavi === undefined ? undefined : v.ricavi,
        fte: v.fte === undefined ? undefined : v.fte,
        produzione: v.produzione === undefined ? undefined : v.produzione,
        umProduzione: v.umProduzione,
      })
      .where(eq(ghgInventory.id, inventoryId))
      .returning({ id: ghgInventory.id });
    if (!updated.length) throw new Error("Inventario inesistente o di un altro tenant");
    await logAudit(tx, { organizationId: orgId, userId, azione: "ghg.meta.update", entita: "ghg_inventory", entitaId: inventoryId });
  });
}

export async function setBaseYear(userId: string, orgId: string, inventoryId: string, annoBase: number): Promise<void> {
  await requireEntitlement(userId, orgId, "write_data");
  await withTenant({ userId, orgId }, async (tx) => {
    const updated = await tx
      .update(ghgInventory)
      .set({ annoBase })
      .where(eq(ghgInventory.id, inventoryId))
      .returning({ id: ghgInventory.id });
    if (!updated.length) throw new Error("Inventario inesistente o di un altro tenant");
    await logAudit(tx, { organizationId: orgId, userId, azione: "ghg.baseyear.set", entita: "ghg_inventory", entitaId: inventoryId, dettagli: { annoBase } });
  });
}

export async function listInventories(userId: string, orgId: string, companyId: string) {
  return withTenant({ userId, orgId }, (tx) =>
    tx
      .select({ id: ghgInventory.id, anno: ghgInventory.anno, annoBase: ghgInventory.annoBase, gwpSetKey: ghgInventory.gwpSetKey })
      .from(ghgInventory)
      .where(eq(ghgInventory.companyId, companyId))
      .orderBy(desc(ghgInventory.anno)),
  );
}
