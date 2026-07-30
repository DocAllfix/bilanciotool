import { withTenant } from "@/lib/db/tenant";
import { reportProject, topicManagement } from "@/lib/db/schema";
import { logAudit } from "@/lib/audit";
import { requireEntitlement } from "@/features/entitlement";
import { eq } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { gestioneTemaSchema } from "./validation";
import { getMateriality } from "./materiality";
import type { z } from "zod";

// Politiche/azioni/obiettivi per tema MATERIALE (passo 4, schema GRI 3-3/ESRS MDR).
// Si scrive solo sui temi sopra soglia: scrivere su un tema escluso è un errore
// di flusso, non un caso da salvare in silenzio.

export async function setTopicManagement(
  userId: string,
  orgId: string,
  projectId: string,
  input: z.input<typeof gestioneTemaSchema>,
): Promise<void> {
  await requireEntitlement(userId, orgId, "write_data");
  const v = gestioneTemaSchema.parse(input);
  const { esito } = await getMateriality(userId, orgId, projectId);
  if (!esito.materialKeys.includes(v.topicKey)) {
    throw new Error(`Il tema ${v.topicKey} non è materiale per questo progetto: completa prima la valutazione al passo 2`);
  }
  await withTenant({ userId, orgId }, async (tx) => {
    const [p] = await tx.select({ id: reportProject.id }).from(reportProject).where(eq(reportProject.id, projectId));
    if (!p) throw new Error("Progetto inesistente o di un altro tenant");
    await tx
      .insert(topicManagement)
      .values({
        id: randomUUID(),
        organizationId: orgId,
        projectId,
        topicKey: v.topicKey,
        politica: v.politica || null,
        azioni: v.azioni || null,
        target: v.target || null,
        annoBase: v.annoBase || null,
        annoTarget: v.annoTarget || null,
        responsabile: v.responsabile || null,
      })
      .onConflictDoUpdate({
        target: [topicManagement.projectId, topicManagement.topicKey],
        set: {
          politica: v.politica || null,
          azioni: v.azioni || null,
          target: v.target || null,
          annoBase: v.annoBase || null,
          annoTarget: v.annoTarget || null,
          responsabile: v.responsabile || null,
        },
      });
    await logAudit(tx, {
      organizationId: orgId,
      userId,
      azione: "report.gestione.set",
      entita: "topic_management",
      entitaId: `${projectId}:${v.topicKey}`,
    });
  });
}

export async function listTopicManagement(userId: string, orgId: string, projectId: string) {
  return withTenant({ userId, orgId }, (tx) =>
    tx.select().from(topicManagement).where(eq(topicManagement.projectId, projectId)),
  );
}
