import { randomUUID } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { withTenant, type Tx } from "@/lib/db/tenant";
import { logAudit } from "@/lib/audit";
import { requireEntitlement } from "@/features/entitlement";
import { latestSetId } from "@/features/content-set";
import { company, saCriterionState, saSystem } from "@/lib/db/schema";
import { criterioSchema, profiloSchema, sistemaSchema } from "./validation";
import type { z } from "zod";

// Il sistema SA8000/2026 di un'azienda.
//
// Valgono le regole di ogni feature layer: `requireEntitlement` e audit su ogni
// mutazione, filtro `organization_id` esplicito oltre a RLS, un campo per volta.

export async function latestSa8000SetId(): Promise<string> {
  return latestSetId("sa8000", "Catalogo SA8000/2026 non disponibile: esegui il seed dei contenuti");
}

export async function creaSistema(
  userId: string,
  orgId: string,
  input: z.input<typeof sistemaSchema>,
): Promise<string> {
  await requireEntitlement(userId, orgId, "write_data");
  const v = sistemaSchema.parse(input);
  const setId = await latestSa8000SetId();
  const id = randomUUID();

  await withTenant({ userId, orgId }, async (tx) => {
    const [co] = await tx
      .select({ id: company.id, nome: company.nome })
      .from(company)
      .where(and(eq(company.id, v.companyId), eq(company.organizationId, orgId)));
    if (!co) throw new Error("Azienda inesistente o di un altro tenant");

    await tx.insert(saSystem).values({
      id,
      organizationId: orgId,
      companyId: v.companyId,
      contentSetId: setId,
      ragione: co.nome,
      revisione: "1.0",
    });
    await logAudit(tx, {
      organizationId: orgId,
      userId,
      azione: "sa8000.sistema.create",
      entita: "sa_system",
      entitaId: id,
    });
  });
  return id;
}

export async function aggiornaProfilo(
  userId: string,
  orgId: string,
  systemId: string,
  patch: z.input<typeof profiloSchema>,
): Promise<void> {
  await requireEntitlement(userId, orgId, "write_data");
  const v = profiloSchema.parse(patch);
  const campi = Object.entries(v).filter(([, val]) => val !== undefined);
  if (!campi.length) return;

  await withTenant({ userId, orgId }, async (tx) => {
    const agg = await tx
      .update(saSystem)
      .set({ ...Object.fromEntries(campi), updatedAt: new Date() })
      .where(and(eq(saSystem.id, systemId), eq(saSystem.organizationId, orgId)))
      .returning({ id: saSystem.id });
    if (!agg.length) throw new Error("Sistema inesistente o di un altro tenant");

    await logAudit(tx, {
      organizationId: orgId,
      userId,
      azione: "sa8000.profilo.set",
      entita: "sa_system",
      entitaId: systemId,
      dettagli: { campi: campi.map(([k]) => k) },
    });
  });
}

export async function setCampoCriterio(
  userId: string,
  orgId: string,
  systemId: string,
  input: z.input<typeof criterioSchema>,
): Promise<void> {
  await requireEntitlement(userId, orgId, "write_data");
  const v = criterioSchema.parse(input);

  await withTenant({ userId, orgId }, async (tx) => {
    await pretendiSistema(tx, orgId, systemId);
    await tx
      .insert(saCriterionState)
      .values({
        id: randomUUID(),
        organizationId: orgId,
        systemId,
        criterionKey: v.criterionKey,
        [v.campo]: v.valore,
      })
      .onConflictDoUpdate({
        target: [saCriterionState.systemId, saCriterionState.criterionKey],
        set: { [v.campo]: v.valore, updatedAt: new Date() },
      });

    await logAudit(tx, {
      organizationId: orgId,
      userId,
      azione: "sa8000.criterio.set",
      entita: "sa_criterion_state",
      entitaId: `${systemId}:${v.criterionKey}`,
      dettagli: { campo: v.campo },
    });
  });
}

/** Il confine di tenant per le righe che non portano ancora un `organization_id`. */
async function pretendiSistema(tx: Tx, orgId: string, systemId: string) {
  const [row] = await tx
    .select({ id: saSystem.id, contentSetId: saSystem.contentSetId })
    .from(saSystem)
    .where(and(eq(saSystem.id, systemId), eq(saSystem.organizationId, orgId)));
  if (!row) throw new Error("Sistema inesistente o di un altro tenant");
  return row;
}
