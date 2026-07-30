import { withTenant } from "@/lib/db/tenant";
import { company, kpiValue } from "@/lib/db/schema";
import { logAudit } from "@/lib/audit";
import { requireEntitlement } from "@/features/entitlement";
import { deriveKpi, DEFAULT_CONVERSION_FACTORS } from "@/lib/calc/report/derived-kpi";
import { and, eq, inArray } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { kpiValoreSchema } from "./validation";
import { nz, toFixedStr } from "@/lib/calc/shared/decimal";
import type { z } from "zod";

// Valori KPI (passo 3): per company+anno — l'anno precedente è un dato autonomo,
// il confronto biennale è una query. I ~30 derivati SI CALCOLANO SEMPRE.

export async function setKpiValue(
  userId: string,
  orgId: string,
  companyId: string,
  input: z.input<typeof kpiValoreSchema>,
): Promise<void> {
  await requireEntitlement(userId, orgId, "write_data");
  const v = kpiValoreSchema.parse(input);
  await withTenant({ userId, orgId }, async (tx) => {
    const [co] = await tx.select({ id: company.id }).from(company).where(eq(company.id, companyId));
    if (!co) throw new Error("Azienda inesistente o di un altro tenant");
    if (v.valore === null || v.valore === "") {
      await tx
        .delete(kpiValue)
        .where(and(eq(kpiValue.companyId, companyId), eq(kpiValue.anno, v.anno), eq(kpiValue.kpiKey, v.kpiKey)));
    } else {
      await tx
        .insert(kpiValue)
        .values({
          id: randomUUID(),
          organizationId: orgId,
          companyId,
          anno: v.anno,
          kpiKey: v.kpiKey,
          valore: toFixedStr(nz(v.valore)),
        })
        .onConflictDoUpdate({
          target: [kpiValue.companyId, kpiValue.anno, kpiValue.kpiKey],
          set: { valore: toFixedStr(nz(v.valore)) },
        });
    }
    await logAudit(tx, {
      organizationId: orgId,
      userId,
      azione: "report.kpi.set",
      entita: "kpi_value",
      entitaId: `${companyId}:${v.anno}:${v.kpiKey}`,
    });
  });
}

export async function getKpiYears(userId: string, orgId: string, companyId: string, anni: number[]) {
  const rows = await withTenant({ userId, orgId }, (tx) =>
    tx
      .select()
      .from(kpiValue)
      .where(and(eq(kpiValue.companyId, companyId), inArray(kpiValue.anno, anni))),
  );
  const perAnno: Record<number, Record<string, string>> = {};
  for (const a of anni) perAnno[a] = {};
  for (const r of rows) perAnno[r.anno][r.kpiKey] = r.valore;
  return perAnno;
}

// Input + derivati per un anno (il documento e la UI leggono da qui).
export async function getKpiWithDerived(userId: string, orgId: string, companyId: string, anno: number) {
  const valori = await getKpiYears(userId, orgId, companyId, [anno, anno - 1]);
  return {
    corrente: valori[anno],
    precedente: valori[anno - 1],
    derivati: deriveKpi(valori[anno], DEFAULT_CONVERSION_FACTORS),
    derivatiPrecedente: deriveKpi(valori[anno - 1], DEFAULT_CONVERSION_FACTORS),
  };
}
