import { randomUUID } from "node:crypto";
import { asc, eq } from "drizzle-orm";
import { withTenant } from "@/lib/db/tenant";
import { energyBalance, energyMeasure } from "@/lib/db/schema";
import { logAudit } from "@/lib/audit";
import { requireEntitlement } from "@/features/entitlement";
import { misuraSchema, perNumeric } from "./validation";
import type { z } from "zod";

// Interventi di miglioramento (passo 5).

export async function listMeasures(userId: string, orgId: string, balanceId: string) {
  return withTenant({ userId, orgId }, (tx) =>
    tx
      .select()
      .from(energyMeasure)
      .where(eq(energyMeasure.balanceId, balanceId))
      .orderBy(asc(energyMeasure.posizione), asc(energyMeasure.createdAt)),
  );
}

export async function addMeasure(
  userId: string,
  orgId: string,
  balanceId: string,
  input: z.input<typeof misuraSchema>,
): Promise<string> {
  await requireEntitlement(userId, orgId, "write_data");
  const v = misuraSchema.parse(input);
  const id = randomUUID();

  await withTenant({ userId, orgId }, async (tx) => {
    const [b] = await tx.select({ id: energyBalance.id }).from(energyBalance).where(eq(energyBalance.id, balanceId));
    if (!b) throw new Error("Bilancio inesistente o di un altro tenant");

    const esistenti = await tx
      .select({ posizione: energyMeasure.posizione })
      .from(energyMeasure)
      .where(eq(energyMeasure.balanceId, balanceId));
    const posizione = esistenti.reduce((max, e) => Math.max(max, e.posizione), -1) + 1;

    await tx.insert(energyMeasure).values({
      id,
      organizationId: orgId,
      balanceId,
      descrizione: v.descrizione,
      vettoreKey: v.vettoreKey,
      quantita: perNumeric(v.quantita),
      investimento: perNumeric(v.investimento),
      incentivo: perNumeric(v.incentivo),
      usoKey: v.usoKey ?? null,
      stato: v.stato ?? "proposto",
      annoPrevisto: v.annoPrevisto ?? null,
      note: v.note ?? null,
      posizione,
    });

    await logAudit(tx, {
      organizationId: orgId,
      userId,
      azione: "energy.intervento.create",
      entita: "energy_measure",
      entitaId: id,
    });
  });
  return id;
}

/** Aggiornamento per singolo campo: il client non rimanda mai l'intervento
 *  completo, così due modifiche ravvicinate non si sovrascrivono. */
export async function updateMeasure(
  userId: string,
  orgId: string,
  measureId: string,
  patch: Partial<z.input<typeof misuraSchema>>,
): Promise<void> {
  await requireEntitlement(userId, orgId, "write_data");
  const v = misuraSchema.partial().parse(patch);

  const set: Record<string, unknown> = {};
  if (v.descrizione !== undefined) set.descrizione = v.descrizione;
  if (v.vettoreKey !== undefined) set.vettoreKey = v.vettoreKey;
  if (v.quantita !== undefined) set.quantita = perNumeric(v.quantita);
  if (v.investimento !== undefined) set.investimento = perNumeric(v.investimento);
  if (v.incentivo !== undefined) set.incentivo = perNumeric(v.incentivo);
  if (v.usoKey !== undefined) set.usoKey = v.usoKey || null;
  if (v.stato !== undefined) set.stato = v.stato;
  if (v.annoPrevisto !== undefined) set.annoPrevisto = v.annoPrevisto;
  if (v.note !== undefined) set.note = v.note;
  if (!Object.keys(set).length) return;

  await withTenant({ userId, orgId }, async (tx) => {
    const agg = await tx
      .update(energyMeasure)
      .set(set)
      .where(eq(energyMeasure.id, measureId))
      .returning({ id: energyMeasure.id });
    if (!agg.length) throw new Error("Intervento inesistente o di un altro tenant");
    await logAudit(tx, {
      organizationId: orgId,
      userId,
      azione: "energy.intervento.update",
      entita: "energy_measure",
      entitaId: measureId,
      dettagli: { campi: Object.keys(set) },
    });
  });
}

export async function deleteMeasure(userId: string, orgId: string, measureId: string): Promise<void> {
  await requireEntitlement(userId, orgId, "write_data");
  await withTenant({ userId, orgId }, async (tx) => {
    const rimosso = await tx
      .delete(energyMeasure)
      .where(eq(energyMeasure.id, measureId))
      .returning({ id: energyMeasure.id });
    if (!rimosso.length) throw new Error("Intervento inesistente o di un altro tenant");
    await logAudit(tx, {
      organizationId: orgId,
      userId,
      azione: "energy.intervento.delete",
      entita: "energy_measure",
      entitaId: measureId,
    });
  });
}
