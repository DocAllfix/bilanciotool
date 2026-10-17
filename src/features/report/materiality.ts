import { dbCorrente, withTenant } from "@/lib/db/tenant";
import { atecoSuggestion, materialityAssessment, reportProject } from "@/lib/db/schema";
import { logAudit } from "@/lib/audit";
import { requireEntitlement } from "@/features/entitlement";
import { assessMateriality } from "@/lib/calc/report/materiality";
import { and, eq, isNotNull } from "drizzle-orm";
import type { Tx } from "@/lib/db/tenant";
import { divisioneAteco, sezioneDellaDivisione } from "@/lib/calc/ateco";
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
        set: { scoreImpact: v.scoreImpact, scoreFinancial: v.scoreFinancial, nota: v.nota || null, propostaMotivo: null },
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
        // SOLO il campo toccato: l'altro resta com'è nel DB. Toccare un tema proposto lo rende
        // del consulente: la marca si spegne.
        set: { [colonna]: valore, propostaMotivo: null },
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

// Suggerimenti rule-based per sezione ATECO (tabella curata, niente AI): punteggi
// INDICATIVI di partenza. Dal 17 ottobre 2026 entrano nei temi ancora vuoti come PROPOSTE
// col motivo (`proponiMaterialita`): il consulente le conferma toccandole, o le corregge.
//
// ⚠️ Si legge la DIVISIONE, non la lettera scritta nel codice: con l'ATECO 2025 «K 62.10» è
// l'informatica, che nella tabella curata (scritta in ATECO 2007) sta sotto «J».
export async function getAtecoSuggestions(codiceAteco: string, contentSetId: string) {
  const div = divisioneAteco(codiceAteco);
  const lettera = div === null ? null : sezioneDellaDivisione(div);
  if (!lettera) return null;
  const rows = await dbCorrente()
    .select()
    .from(atecoSuggestion)
    .where(eq(atecoSuggestion.setId, contentSetId));
  return rows.find((r) => r.macroSettore === lettera) ?? null;
}

/**
 * La materialità proposta dal codice ATECO, nei temi ancora vuoti.
 *
 * ⚠️ Le stesse tre regole delle voci GHG: un tema toccato non si tocca più; cambiando ATECO
 * escono solo le proposte non toccate; si scrive solo dove non c'è niente.
 */
export async function proponiMaterialita(
  tx: Tx,
  userId: string,
  orgId: string,
  projectId: string,
  ateco: string | null | undefined,
): Promise<{ inserite: number; tolte: number }> {
  const [p] = await tx
    .select({ id: reportProject.id, contentSetId: reportProject.contentSetId })
    .from(reportProject)
    .where(and(eq(reportProject.id, projectId), eq(reportProject.organizationId, orgId)))
    .limit(1);
  if (!p) throw new Error("Progetto inesistente o di un altro tenant");
  const tolte = await tx
    .delete(materialityAssessment)
    .where(and(eq(materialityAssessment.projectId, projectId), isNotNull(materialityAssessment.propostaMotivo)))
    .returning({ id: materialityAssessment.id });
  const s = ateco ? await getAtecoSuggestions(ateco, p.contentSetId) : null;
  let inserite = 0;
  if (s) {
    const punteggi = s.punteggi as Record<string, { imp: number; fin: number }>;
    const righe = Object.entries(punteggi).map(([topicKey, v]) => ({
      id: randomUUID(),
      organizationId: orgId,
      projectId,
      topicKey,
      scoreImpact: v.imp,
      scoreFinancial: v.fin,
      propostaMotivo: `Proposta dal codice ATECO (${s.descrizione}): punteggio tipico del settore, da confermare o correggere.`,
    }));
    const r = await tx.insert(materialityAssessment).values(righe).onConflictDoNothing().returning({ id: materialityAssessment.id });
    inserite = r.length;
  }
  if (inserite || tolte.length) {
    await logAudit(tx, {
      organizationId: orgId,
      userId,
      azione: "report.materialita.proposte",
      entita: "report_project",
      entitaId: projectId,
      dettagli: { inserite, tolte: tolte.length },
    });
  }
  return { inserite, tolte: tolte.length };
}
