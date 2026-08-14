import { withTenant } from "@/lib/db/tenant";
import { company, ghgTarget } from "@/lib/db/schema";
import { logAudit } from "@/lib/audit";
import { requireEntitlement } from "@/features/entitlement";
import { eq } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { obiettivoSchema } from "./validation";
import { nz, toFixedStr } from "@/lib/calc/shared/decimal";
import type { z } from "zod";

// Obiettivi di riduzione (passo 7): per azienda, valutati contro l'anno base.

export async function addTarget(userId: string, orgId: string, input: z.input<typeof obiettivoSchema>): Promise<string> {
  await requireEntitlement(userId, orgId, "write_data");
  const v = obiettivoSchema.parse(input);
  const id = randomUUID();
  await withTenant({ userId, orgId }, async (tx) => {
    const [co] = await tx.select({ id: company.id }).from(company).where(eq(company.id, v.companyId));
    if (!co) throw new Error("Azienda inesistente o di un altro tenant");
    await tx.insert(ghgTarget).values({
      id,
      organizationId: orgId,
      companyId: v.companyId,
      nome: v.nome,
      ambito: v.ambito,
      riduzionePct: toFixedStr(nz(v.riduzionePct)),
      annoTarget: v.annoTarget,
      note: v.note,
    });
    await logAudit(tx, { organizationId: orgId, userId, azione: "ghg.target.create", entita: "ghg_target", entitaId: id });
  });
  return id;
}

export async function deleteTarget(userId: string, orgId: string, targetId: string): Promise<void> {
  await requireEntitlement(userId, orgId, "write_data");
  await withTenant({ userId, orgId }, async (tx) => {
    const deleted = await tx.delete(ghgTarget).where(eq(ghgTarget.id, targetId)).returning({ id: ghgTarget.id });
    if (!deleted.length) throw new Error("Obiettivo inesistente o di un altro tenant");
    await logAudit(tx, { organizationId: orgId, userId, azione: "ghg.target.delete", entita: "ghg_target", entitaId: targetId });
  });
}
