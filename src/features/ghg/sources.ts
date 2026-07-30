import { withTenant } from "@/lib/db/tenant";
import { ghgInventory, ghgSourceSelection } from "@/lib/db/schema";
import { logAudit } from "@/lib/audit";
import { requireEntitlement } from "@/features/entitlement";
import { eq } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { statoSorgenteSchema } from "./validation";
import type { z } from "zod";

// Registro sorgenti (passo 2): stato per ciascuna delle 25 sorgenti del catalogo.
// L'esclusione senza motivazione è bloccata dallo schema (requisito di norma).

export async function setSourceState(
  userId: string,
  orgId: string,
  inventoryId: string,
  input: z.input<typeof statoSorgenteSchema>,
): Promise<void> {
  await requireEntitlement(userId, orgId, "write_data");
  const v = statoSorgenteSchema.parse(input);
  await withTenant({ userId, orgId }, async (tx) => {
    const [inv] = await tx.select({ id: ghgInventory.id }).from(ghgInventory).where(eq(ghgInventory.id, inventoryId));
    if (!inv) throw new Error("Inventario inesistente o di un altro tenant");
    await tx
      .insert(ghgSourceSelection)
      .values({
        id: randomUUID(),
        organizationId: orgId,
        inventoryId,
        sourceTypeKey: v.sourceTypeKey,
        stato: v.stato,
        motivazione: v.motivazione || null,
      })
      .onConflictDoUpdate({
        target: [ghgSourceSelection.inventoryId, ghgSourceSelection.sourceTypeKey],
        set: { stato: v.stato, motivazione: v.motivazione || null },
      });
    await logAudit(tx, {
      organizationId: orgId,
      userId,
      azione: "ghg.source.set",
      entita: "ghg_source_selection",
      entitaId: `${inventoryId}:${v.sourceTypeKey}`,
      dettagli: { stato: v.stato },
    });
  });
}

export async function listSourceStates(userId: string, orgId: string, inventoryId: string) {
  return withTenant({ userId, orgId }, (tx) =>
    tx
      .select({
        sourceTypeKey: ghgSourceSelection.sourceTypeKey,
        stato: ghgSourceSelection.stato,
        motivazione: ghgSourceSelection.motivazione,
      })
      .from(ghgSourceSelection)
      .where(eq(ghgSourceSelection.inventoryId, inventoryId)),
  );
}
