import { randomUUID } from "node:crypto";
import { and, asc, desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { withTenant } from "@/lib/db/tenant";
import { company, energyBalance, energyEndUse, energyEndUseState } from "@/lib/db/schema";
import { logAudit } from "@/lib/audit";
import { requireEntitlement } from "@/features/entitlement";
import { bilancioSchema, profiloSchema, type ProfiloEnergetico } from "./validation";
import { z } from "zod";
import { annoSchema } from "@/features/campi";
import { latestSetId } from "@/features/content-set";

// Bilanci energetici: un esercizio per azienda e anno. La metodologia in vigore
// si congela alla creazione (content_set), così l'aggiornamento annuale dei
// fattori non altera i bilanci già avviati.

export async function latestEnergySetId(): Promise<string> {
  return latestSetId("energy", "Contenuti metodologici del modulo energetico non disponibili");
}

export async function createBalance(
  userId: string,
  orgId: string,
  input: z.input<typeof bilancioSchema>,
): Promise<string> {
  await requireEntitlement(userId, orgId, "write_data");
  const v = bilancioSchema.parse(input);
  const setId = await latestEnergySetId();
  // Gli usi finali predefiniti si accendono alla creazione: un elenco di venti
  // righe di cui dodici a zero renderebbe il bilancio illeggibile.
  const predefiniti = await db
    .select({ key: energyEndUse.key })
    .from(energyEndUse)
    .where(and(eq(energyEndUse.setId, setId), eq(energyEndUse.predefinito, true)))
    .orderBy(asc(energyEndUse.ordine));

  const id = randomUUID();
  await withTenant({ userId, orgId }, async (tx) => {
    const [co] = await tx.select({ id: company.id }).from(company).where(eq(company.id, v.companyId));
    if (!co) throw new Error("Azienda inesistente o di un altro tenant");

    await tx.insert(energyBalance).values({
      id,
      organizationId: orgId,
      companyId: v.companyId,
      anno: v.anno,
      annoBase: v.annoBase ?? v.anno - 1,
      contentSetId: setId,
    });

    if (predefiniti.length) {
      await tx.insert(energyEndUseState).values(
        predefiniti.map((u) => ({
          id: randomUUID(),
          organizationId: orgId,
          balanceId: id,
          usoKey: u.key,
          attivo: true,
        })),
      );
    }

    await logAudit(tx, {
      organizationId: orgId,
      userId,
      azione: "energy.balance.create",
      entita: "energy_balance",
      entitaId: id,
      dettagli: { anno: v.anno },
    });
  });
  return id;
}

export async function listBalances(userId: string, orgId: string, companyId: string) {
  return withTenant({ userId, orgId }, (tx) =>
    tx
      .select({ id: energyBalance.id, anno: energyBalance.anno, annoBase: energyBalance.annoBase })
      .from(energyBalance)
      .where(eq(energyBalance.companyId, companyId))
      .orderBy(desc(energyBalance.anno)),
  );
}

export async function getBalance(userId: string, orgId: string, companyId: string, anno: number) {
  return withTenant({ userId, orgId }, async (tx) => {
    const [row] = await tx
      .select()
      .from(energyBalance)
      .where(and(eq(energyBalance.companyId, companyId), eq(energyBalance.anno, anno)));
    return row ?? null;
  });
}

/** Aggiornamento del profilo campo per campo: il client non manda mai l'oggetto
 *  completo, così due modifiche vicine non si sovrascrivono a vicenda. */
export async function updateProfilo(
  userId: string,
  orgId: string,
  balanceId: string,
  patch: ProfiloEnergetico,
): Promise<void> {
  await requireEntitlement(userId, orgId, "write_data");
  const v = profiloSchema.parse(patch);
  await withTenant({ userId, orgId }, async (tx) => {
    const [row] = await tx
      .select({ profilo: energyBalance.profilo })
      .from(energyBalance)
      .where(eq(energyBalance.id, balanceId));
    if (!row) throw new Error("Bilancio inesistente o di un altro tenant");
    const aggiornato = { ...(row.profilo as ProfiloEnergetico), ...v };
    await tx.update(energyBalance).set({ profilo: aggiornato }).where(eq(energyBalance.id, balanceId));
    await logAudit(tx, {
      organizationId: orgId,
      userId,
      azione: "energy.profilo.update",
      entita: "energy_balance",
      entitaId: balanceId,
      dettagli: { campi: Object.keys(v) },
    });
  });
}

export async function setAnnoBase(userId: string, orgId: string, balanceId: string, annoBase: number): Promise<void> {
  await requireEntitlement(userId, orgId, "write_data");
  const v = annoSchema.parse(annoBase);
  await withTenant({ userId, orgId }, async (tx) => {
    const agg = await tx
      .update(energyBalance)
      .set({ annoBase: v })
      .where(eq(energyBalance.id, balanceId))
      .returning({ id: energyBalance.id });
    if (!agg.length) throw new Error("Bilancio inesistente o di un altro tenant");
    await logAudit(tx, {
      organizationId: orgId,
      userId,
      azione: "energy.baseyear.set",
      entita: "energy_balance",
      entitaId: balanceId,
      dettagli: { annoBase: v },
    });
  });
}
