import { withTenant } from "@/lib/db/tenant";
import { ghgChecklistStatus, ghgInventory } from "@/lib/db/schema";
import { logAudit } from "@/lib/audit";
import { requireEntitlement } from "@/features/entitlement";
import { eq } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { statoChecklistSchema } from "./validation";
import type { z } from "zod";

// Checklist di conformità (15 requisiti della norma, passo "verifica").

export async function setChecklistState(
  userId: string,
  orgId: string,
  inventoryId: string,
  input: z.input<typeof statoChecklistSchema>,
): Promise<void> {
  await requireEntitlement(userId, orgId, "write_data");
  const v = statoChecklistSchema.parse(input);
  await withTenant({ userId, orgId }, async (tx) => {
    const [inv] = await tx.select({ id: ghgInventory.id }).from(ghgInventory).where(eq(ghgInventory.id, inventoryId));
    if (!inv) throw new Error("Inventario inesistente o di un altro tenant");
    await tx
      .insert(ghgChecklistStatus)
      .values({
        id: randomUUID(),
        organizationId: orgId,
        inventoryId,
        requirementKey: v.requirementKey,
        stato: v.stato,
        nota: v.nota || null,
      })
      .onConflictDoUpdate({
        target: [ghgChecklistStatus.inventoryId, ghgChecklistStatus.requirementKey],
        set: { stato: v.stato, nota: v.nota || null },
      });
    await logAudit(tx, {
      organizationId: orgId,
      userId,
      azione: "ghg.checklist.set",
      entita: "ghg_checklist_status",
      entitaId: `${inventoryId}:${v.requirementKey}`,
      dettagli: { stato: v.stato },
    });
  });
}

export async function listChecklistStates(userId: string, orgId: string, inventoryId: string) {
  return withTenant({ userId, orgId }, (tx) =>
    tx
      .select({ requirementKey: ghgChecklistStatus.requirementKey, stato: ghgChecklistStatus.stato, nota: ghgChecklistStatus.nota })
      .from(ghgChecklistStatus)
      .where(eq(ghgChecklistStatus.inventoryId, inventoryId)),
  );
}
