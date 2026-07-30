import { db } from "@/lib/db";
import { withTenant } from "@/lib/db/tenant";
import { atecoSuggestion, materialityAssessment, reportProject } from "@/lib/db/schema";
import { logAudit } from "@/lib/audit";
import { requireEntitlement } from "@/features/entitlement";
import { assessMateriality } from "@/lib/calc/report/materiality";
import { eq } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { punteggioMaterialitaSchema } from "./validation";
import { z } from "zod";

// Doppia materialità (passo 2). L'esito (temi materiali) si CALCOLA sempre da
// punteggi+soglia via src/lib/calc: mai persistito.

export async function setTopicScore(
  userId: string,
  orgId: string,
  projectId: string,
  input: z.input<typeof punteggioMaterialitaSchema>,
): Promise<void> {
  await requireEntitlement(userId, orgId, "write_data");
  const v = punteggioMaterialitaSchema.parse(input);
  await withTenant({ userId, orgId }, async (tx) => {
    const [p] = await tx.select({ id: reportProject.id }).from(reportProject).where(eq(reportProject.id, projectId));
    if (!p) throw new Error("Progetto inesistente o di un altro tenant");
    await tx
      .insert(materialityAssessment)
      .values({
        id: randomUUID(),
        organizationId: orgId,
        projectId,
        topicKey: v.topicKey,
        scoreImpact: v.scoreImpact,
        scoreFinancial: v.scoreFinancial,
        nota: v.nota || null,
      })
      .onConflictDoUpdate({
        target: [materialityAssessment.projectId, materialityAssessment.topicKey],
        set: { scoreImpact: v.scoreImpact, scoreFinancial: v.scoreFinancial, nota: v.nota || null },
      });
    await logAudit(tx, {
      organizationId: orgId,
      userId,
      azione: "report.materialita.set",
      entita: "materiality_assessment",
      entitaId: `${projectId}:${v.topicKey}`,
      dettagli: { imp: v.scoreImpact, fin: v.scoreFinancial },
    });
  });
}

// Aggiornamento di UN SOLO campo, atomico lato DB: il client non manda mai lo
// stato "completo" (potrebbe essere stantio e cancellare l'altro punteggio —
// race trovata dal gate e2e di Fase 7).
export async function setTopicScoreField(
  userId: string,
  orgId: string,
  projectId: string,
  input: { topicKey: string; campo: "imp" | "fin"; valore: number | null },
): Promise<void> {
  await requireEntitlement(userId, orgId, "write_data");
  const topicKey = z.string().regex(/^T\d{2}$/).parse(input.topicKey);
  const valore = input.valore === null ? null : z.number().int().min(1).max(5).parse(input.valore);
  const colonna = input.campo === "imp" ? "scoreImpact" : "scoreFinancial";
  await withTenant({ userId, orgId }, async (tx) => {
    const [p] = await tx.select({ id: reportProject.id }).from(reportProject).where(eq(reportProject.id, projectId));
    if (!p) throw new Error("Progetto inesistente o di un altro tenant");
    await tx
      .insert(materialityAssessment)
      .values({ id: randomUUID(), organizationId: orgId, projectId, topicKey, [colonna]: valore })
      .onConflictDoUpdate({
        target: [materialityAssessment.projectId, materialityAssessment.topicKey],
        set: { [colonna]: valore }, // SOLO il campo toccato: l'altro resta com'è nel DB
      });
    await logAudit(tx, {
      organizationId: orgId,
      userId,
      azione: "report.materialita.set",
      entita: "materiality_assessment",
      entitaId: `${projectId}:${topicKey}`,
      dettagli: { [input.campo]: valore },
    });
  });
}

export async function getMateriality(userId: string, orgId: string, projectId: string) {
  const { soglia, valutazioni } = await withTenant({ userId, orgId }, async (tx) => {
    const [p] = await tx.select({ soglia: reportProject.sogliaMaterialita }).from(reportProject).where(eq(reportProject.id, projectId));
    if (!p) throw new Error("Progetto inesistente o di un altro tenant");
    const valutazioni = await tx.select().from(materialityAssessment).where(eq(materialityAssessment.projectId, projectId));
    return { soglia: Number(p.soglia), valutazioni };
  });
  const scores = Object.fromEntries(valutazioni.map((v) => [v.topicKey, { imp: v.scoreImpact, fin: v.scoreFinancial }]));
  return { soglia, valutazioni, esito: assessMateriality(scores, soglia) };
}

// Suggerimenti rule-based per macro-settore ATECO (tabella curata, niente AI):
// punteggi INDICATIVI di partenza che l'utente conferma o corregge, mai applicati
// in automatico.
export async function getAtecoSuggestions(codiceAteco: string, contentSetId: string) {
  const lettera = /^\d/.test(codiceAteco.trim())
    ? codiceAtecoToMacro(codiceAteco.trim())
    : codiceAteco.trim().charAt(0).toUpperCase();
  if (!lettera) return null;
  const rows = await db
    .select()
    .from(atecoSuggestion)
    .where(eq(atecoSuggestion.setId, contentSetId));
  return rows.find((r) => r.macroSettore === lettera) ?? null;
}

// Mappa divisione ATECO (prime 2 cifre) → sezione. Copre le sezioni per cui
// abbiamo suggerimenti curati; le altre restano senza proposta.
function codiceAtecoToMacro(codice: string): string | null {
  const div = Number(codice.slice(0, 2));
  if (!Number.isFinite(div)) return null;
  if (div >= 1 && div <= 3) return "A";
  if (div >= 10 && div <= 33) return "C";
  if (div >= 41 && div <= 43) return "F";
  if (div >= 45 && div <= 47) return "G";
  if (div >= 49 && div <= 53) return "H";
  if (div >= 55 && div <= 56) return "I";
  if (div >= 58 && div <= 63) return "J";
  if (div >= 69 && div <= 75) return "M";
  return null;
}
