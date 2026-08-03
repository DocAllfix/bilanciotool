import { randomUUID } from "node:crypto";
import { and, eq, inArray } from "drizzle-orm";
import { withTenant } from "@/lib/db/tenant";
import { company, energyDriverValue } from "@/lib/db/schema";
import { logAudit } from "@/lib/audit";
import { requireEntitlement } from "@/features/entitlement";
import { driverSchema, perNumeric } from "./validation";
import type { z } from "zod";

// Variabili di riferimento: i denominatori degli indicatori. Sono legate a
// azienda e anno, non al bilancio, perché servono anche per l'anno base, che
// può non avere un proprio esercizio aperto.

export async function listDriverValues(
  userId: string,
  orgId: string,
  companyId: string,
  anni: number[],
) {
  if (!anni.length) return [];
  return withTenant({ userId, orgId }, (tx) =>
    tx
      .select()
      .from(energyDriverValue)
      .where(and(eq(energyDriverValue.companyId, companyId), inArray(energyDriverValue.anno, anni))),
  );
}

export async function setDriverValue(
  userId: string,
  orgId: string,
  companyId: string,
  input: z.input<typeof driverSchema>,
): Promise<void> {
  await requireEntitlement(userId, orgId, "write_data");
  const v = driverSchema.parse(input);
  const valore = perNumeric(v.valore);

  await withTenant({ userId, orgId }, async (tx) => {
    const [co] = await tx.select({ id: company.id }).from(company).where(eq(company.id, companyId));
    if (!co) throw new Error("Azienda inesistente o di un altro tenant");

    const dove = and(
      eq(energyDriverValue.companyId, companyId),
      eq(energyDriverValue.anno, v.anno),
      eq(energyDriverValue.driverKey, v.driverKey),
    );

    if (valore === null) {
      await tx.delete(energyDriverValue).where(dove);
      return;
    }

    const [esistente] = await tx.select({ id: energyDriverValue.id }).from(energyDriverValue).where(dove);
    if (esistente) {
      await tx.update(energyDriverValue).set({ valore }).where(eq(energyDriverValue.id, esistente.id));
    } else {
      await tx.insert(energyDriverValue).values({
        id: randomUUID(),
        organizationId: orgId,
        companyId,
        anno: v.anno,
        driverKey: v.driverKey,
        valore,
      });
    }

    await logAudit(tx, {
      organizationId: orgId,
      userId,
      azione: "energy.driver.set",
      entita: "energy_driver_value",
      entitaId: companyId,
      dettagli: { anno: v.anno, variabile: v.driverKey },
    });
  });
}
