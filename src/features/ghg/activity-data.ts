import { withTenant } from "@/lib/db/tenant";
import { ghgActivityRow, ghgInventory } from "@/lib/db/schema";
import { logAudit } from "@/lib/audit";
import { requireEntitlement } from "@/features/entitlement";
import { and, eq, isNotNull } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { rigaAttivitaSchema } from "./validation";
import { nz, toFixedStr } from "@/lib/calc/shared/decimal";
import type { z } from "zod";

// Dati di attività (passi 3-5). I valori NUMERIC si normalizzano alla scrittura
// (stringa decimale canonica): il DB non vede mai virgole o formati locali.

const normalizza = (v: z.output<typeof rigaAttivitaSchema>) => ({
  sourceTypeKey: v.sourceTypeKey,
  categoryKey: v.categoryKey,
  sede: v.sede,
  descrizione: v.descrizione,
  factorKey: v.factorKey,
  um: v.um,
  quantita: toFixedStr(nz(v.quantita)),
  fe: toFixedStr(nz(v.fe)),
  feMarket: v.feMarket === null || v.feMarket === "" ? null : toFixedStr(nz(v.feMarket)),
  quotaGo: v.quotaGo === null || v.quotaGo === "" ? null : toFixedStr(nz(v.quotaGo)),
  feBiogenic: v.feBiogenic === null || v.feBiogenic === "" ? null : toFixedStr(nz(v.feBiogenic)),
  dq: v.dq,
  incertezza: v.incertezza === null || v.incertezza === "" ? null : toFixedStr(nz(v.incertezza)),
  evidenza: v.evidenza,
  note: v.note,
});

export async function addActivityRow(
  userId: string,
  orgId: string,
  inventoryId: string,
  input: z.input<typeof rigaAttivitaSchema>,
): Promise<string> {
  await requireEntitlement(userId, orgId, "write_data");
  const v = rigaAttivitaSchema.parse(input);
  const id = randomUUID();
  await withTenant({ userId, orgId }, async (tx) => {
    const [inv] = await tx.select({ id: ghgInventory.id }).from(ghgInventory).where(eq(ghgInventory.id, inventoryId));
    if (!inv) throw new Error("Inventario inesistente o di un altro tenant");
    await tx.insert(ghgActivityRow).values({ id, organizationId: orgId, inventoryId, ...normalizza(v) });
    await logAudit(tx, { organizationId: orgId, userId, azione: "ghg.row.create", entita: "ghg_activity_row", entitaId: id });
  });
  return id;
}

export async function updateActivityRow(
  userId: string,
  orgId: string,
  rowId: string,
  input: z.input<typeof rigaAttivitaSchema>,
): Promise<void> {
  await requireEntitlement(userId, orgId, "write_data");
  const v = rigaAttivitaSchema.parse(input);
  await withTenant({ userId, orgId }, async (tx) => {
    const updated = await tx
      .update(ghgActivityRow)
      // Modificare una voce proposta la rende del consulente: la marca si spegne.
      .set({ ...normalizza(v), propostaMotivo: null })
      .where(eq(ghgActivityRow.id, rowId))
      .returning({ id: ghgActivityRow.id });
    if (!updated.length) throw new Error("Voce inesistente o di un altro tenant");
    await logAudit(tx, { organizationId: orgId, userId, azione: "ghg.row.update", entita: "ghg_activity_row", entitaId: rowId });
  });
}

export async function duplicateActivityRow(userId: string, orgId: string, rowId: string): Promise<string> {
  await requireEntitlement(userId, orgId, "write_data");
  const id = randomUUID();
  await withTenant({ userId, orgId }, async (tx) => {
    const [orig] = await tx.select().from(ghgActivityRow).where(eq(ghgActivityRow.id, rowId));
    if (!orig) throw new Error("Voce inesistente o di un altro tenant");
    const { id: _old, createdAt: _c, updatedAt: _u, ...resto } = orig;
    // La copia è una voce nuova del consulente: non porta la chiave della proposta (l'indice
    // unico la respingerebbe) né la marca.
    await tx.insert(ghgActivityRow).values({ ...resto, id, tipoKey: null, propostaMotivo: null });
    await logAudit(tx, { organizationId: orgId, userId, azione: "ghg.row.duplicate", entita: "ghg_activity_row", entitaId: id });
  });
  return id;
}

export async function deleteActivityRow(userId: string, orgId: string, rowId: string): Promise<void> {
  await requireEntitlement(userId, orgId, "write_data");
  await withTenant({ userId, orgId }, async (tx) => {
    const deleted = await tx.delete(ghgActivityRow).where(eq(ghgActivityRow.id, rowId)).returning({ id: ghgActivityRow.id });
    if (!deleted.length) throw new Error("Voce inesistente o di un altro tenant");
    await logAudit(tx, { organizationId: orgId, userId, azione: "ghg.row.delete", entita: "ghg_activity_row", entitaId: rowId });
  });
}

export async function listActivityRows(userId: string, orgId: string, inventoryId: string) {
  return withTenant({ userId, orgId }, (tx) =>
    tx.select().from(ghgActivityRow).where(eq(ghgActivityRow.inventoryId, inventoryId)),
  );
}

// "Copia dall'anno precedente" (funzione chiave del prototipo): duplica le voci
// dell'inventario sorgente in quello di destinazione AZZERANDO le quantità.
export async function copyRowsFromInventory(
  userId: string,
  orgId: string,
  fromInventoryId: string,
  toInventoryId: string,
): Promise<number> {
  await requireEntitlement(userId, orgId, "write_data");
  return withTenant({ userId, orgId }, async (tx) => {
    const [dest] = await tx.select({ id: ghgInventory.id }).from(ghgInventory).where(eq(ghgInventory.id, toInventoryId));
    if (!dest) throw new Error("Inventario di destinazione inesistente o di un altro tenant");
    // La copia sostituisce le PROPOSTE non toccate: chi copia l'esercizio prima ha scelto le
    // proprie voci, e le proposte a quantità zero lascerebbero doppioni. Le voci scritte o
    // modificate dal consulente non si toccano.
    await tx
      .delete(ghgActivityRow)
      .where(and(eq(ghgActivityRow.inventoryId, toInventoryId), isNotNull(ghgActivityRow.propostaMotivo), eq(ghgActivityRow.quantita, "0")));
    const rows = await tx.select().from(ghgActivityRow).where(eq(ghgActivityRow.inventoryId, fromInventoryId));
    for (const r of rows) {
      const { id: _o, createdAt: _c, updatedAt: _u, ...resto } = r;
      await tx.insert(ghgActivityRow).values({ ...resto, id: randomUUID(), inventoryId: toInventoryId, quantita: "0", tipoKey: null, propostaMotivo: null });
    }
    await logAudit(tx, {
      organizationId: orgId,
      userId,
      azione: "ghg.rows.copyFrom",
      entita: "ghg_inventory",
      entitaId: toInventoryId,
      dettagli: { fromInventoryId, copiate: rows.length },
    });
    return rows.length;
  });
}
