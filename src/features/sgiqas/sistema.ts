import { randomUUID } from "node:crypto";
import { and, asc, eq, sql } from "drizzle-orm";
import { withTenant, type Tx } from "@/lib/db/tenant";
import { logAudit } from "@/lib/audit";
import { requireEntitlement } from "@/features/entitlement";
import { latestSetId } from "@/features/content-set";
import {
  company,
  qasIndicator,
  qasIndicatorDefault,
  qasMeasurement,
  qasRequirementState,
  qasSystem,
} from "@/lib/db/schema";
import {
  campoIndicatoreSchema,
  normeSchema,
  nuovoIndicatoreSchema,
  profiloSchema,
  requisitoSchema,
  rilevazioneSchema,
  sistemaSchema,
} from "./validation";
import type { z } from "zod";

// Il Sistema di gestione integrato QAS di un'azienda.
//
// Valgono le regole di ogni feature layer: `requireEntitlement` e audit su ogni
// mutazione, filtro `organization_id` ESPLICITO su ogni select oltre a RLS, aggiornamento
// per singolo campo, nessun derivato persistito.

export async function latestSgiQasSetId(): Promise<string> {
  return latestSetId("sgiqas", "Catalogo del sistema integrato non disponibile: esegui il seed dei contenuti");
}

export async function creaSistema(
  userId: string,
  orgId: string,
  input: z.input<typeof sistemaSchema>,
): Promise<string> {
  await requireEntitlement(userId, orgId, "write_data");
  const v = sistemaSchema.parse(input);
  const setId = await latestSgiQasSetId();
  const id = randomUUID();

  await withTenant({ userId, orgId }, async (tx) => {
    const [co] = await tx
      .select({ id: company.id, nome: company.nome })
      .from(company)
      .where(and(eq(company.id, v.companyId), eq(company.organizationId, orgId)));
    if (!co) throw new Error("Azienda inesistente o di un altro tenant");

    await tx.insert(qasSystem).values({
      id,
      organizationId: orgId,
      companyId: v.companyId,
      contentSetId: setId,
      // Tutte e tre nel perimetro: è il caso più comune, e togliere una norma è un gesto
      // consapevole. Il contrario — partire da una sola e doverle aggiungere — farebbe
      // sembrare il sistema più piccolo di quello che è.
      norme: ["Q", "A", "S"],
      ragione: co.nome,
      revisione: "1.0",
    });
    await logAudit(tx, {
      organizationId: orgId,
      userId,
      azione: "sgiqas.sistema.create",
      entita: "qas_system",
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
      .update(qasSystem)
      .set({ ...Object.fromEntries(campi), updatedAt: new Date() })
      .where(and(eq(qasSystem.id, systemId), eq(qasSystem.organizationId, orgId)))
      .returning({ id: qasSystem.id });
    if (!agg.length) throw new Error("Sistema inesistente o di un altro tenant");

    await logAudit(tx, {
      organizationId: orgId,
      userId,
      azione: "sgiqas.profilo.set",
      entita: "qas_system",
      entitaId: systemId,
      dettagli: { campi: campi.map(([k]) => k) },
    });
  });
}

/**
 * Le norme nel perimetro.
 *
 * ⚠️ Toglierne una NON cancella le valutazioni dei suoi requisiti, e la ragione è che
 * una norma si toglie dal perimetro anche per un anno — una certificazione sospesa, un
 * sito ceduto — e rimetterla dovrebbe ritrovare il lavoro fatto. Il perimetro decide
 * cosa si VEDE e cosa entra nell'indice, non cosa esiste.
 */
export async function setNorme(
  userId: string,
  orgId: string,
  systemId: string,
  norme: z.input<typeof normeSchema>,
): Promise<void> {
  await requireEntitlement(userId, orgId, "write_data");
  const v = normeSchema.parse(norme);

  await withTenant({ userId, orgId }, async (tx) => {
    const agg = await tx
      .update(qasSystem)
      .set({ norme: v, updatedAt: new Date() })
      .where(and(eq(qasSystem.id, systemId), eq(qasSystem.organizationId, orgId)))
      .returning({ id: qasSystem.id });
    if (!agg.length) throw new Error("Sistema inesistente o di un altro tenant");

    await logAudit(tx, {
      organizationId: orgId,
      userId,
      azione: "sgiqas.norme.set",
      entita: "qas_system",
      entitaId: systemId,
      dettagli: { norme: v },
    });
  });
}

export async function setCampoRequisito(
  userId: string,
  orgId: string,
  systemId: string,
  input: z.input<typeof requisitoSchema>,
): Promise<void> {
  await requireEntitlement(userId, orgId, "write_data");
  const v = requisitoSchema.parse(input);

  await withTenant({ userId, orgId }, async (tx) => {
    await pretendiSistema(tx, orgId, systemId);
    await tx
      .insert(qasRequirementState)
      .values({
        id: randomUUID(),
        organizationId: orgId,
        systemId,
        requirementKey: v.requirementKey,
        [v.campo]: v.valore,
      })
      .onConflictDoUpdate({
        target: [qasRequirementState.systemId, qasRequirementState.requirementKey],
        set: { [v.campo]: v.valore, updatedAt: new Date() },
      });

    await logAudit(tx, {
      organizationId: orgId,
      userId,
      azione: "sgiqas.requisito.set",
      entita: "qas_requirement_state",
      entitaId: `${systemId}:${v.requirementKey}`,
      dettagli: { campo: v.campo },
    });
  });
}

// ─── Indicatori ──────────────────────────────────────────────────────────────

export async function creaIndicatore(
  userId: string,
  orgId: string,
  systemId: string,
  input: z.input<typeof nuovoIndicatoreSchema>,
): Promise<string> {
  await requireEntitlement(userId, orgId, "write_data");
  const v = nuovoIndicatoreSchema.parse(input);
  const id = randomUUID();

  await withTenant({ userId, orgId }, async (tx) => {
    await pretendiSistema(tx, orgId, systemId);
    const [{ prossimo }] = await tx
      .select({ prossimo: sql<number>`coalesce(max(${qasIndicator.ordine}), -1) + 1` })
      .from(qasIndicator)
      .where(and(eq(qasIndicator.systemId, systemId), eq(qasIndicator.organizationId, orgId)));

    await tx.insert(qasIndicator).values({
      id,
      organizationId: orgId,
      systemId,
      nome: v.nome,
      ambito: v.ambito ?? null,
      ordine: prossimo,
    });
    await logAudit(tx, {
      organizationId: orgId,
      userId,
      azione: "sgiqas.indicatore.create",
      entita: "qas_indicator",
      entitaId: id,
    });
  });
  return id;
}

/**
 * I venti indicatori di partenza.
 *
 * ⚠️ Non duplica quelli già presenti con lo stesso codice, ed è la scelta del prototipo:
 * il gesto si può ripetere senza pensarci, e chi lo preme due volte non si ritrova
 * quaranta righe. Target e soglia arrivano dal catalogo come SUGGERIMENTO — vanno
 * adattati, e l'interfaccia lo dice.
 */
export async function caricaIndicatoriBase(
  userId: string,
  orgId: string,
  systemId: string,
): Promise<{ aggiunti: number }> {
  await requireEntitlement(userId, orgId, "write_data");

  return withTenant({ userId, orgId }, async (tx) => {
    const sistema = await pretendiSistema(tx, orgId, systemId);
    const [base, esistenti] = await Promise.all([
      tx
        .select()
        .from(qasIndicatorDefault)
        .where(eq(qasIndicatorDefault.setId, sistema.contentSetId))
        .orderBy(asc(qasIndicatorDefault.ordine)),
      tx
        .select({ codice: qasIndicator.codice })
        .from(qasIndicator)
        .where(and(eq(qasIndicator.systemId, systemId), eq(qasIndicator.organizationId, orgId))),
    ]);

    const gia = new Set(esistenti.map((e) => e.codice).filter(Boolean));
    const nuovi = base.filter((b) => !gia.has(b.key));
    if (!nuovi.length) return { aggiunti: 0 };

    await tx.insert(qasIndicator).values(
      nuovi.map((b, i) => ({
        id: randomUUID(),
        organizationId: orgId,
        systemId,
        codice: b.key,
        nome: b.nome,
        ambito: b.ambito,
        tipo: b.tipo,
        formula: b.formula,
        um: b.um,
        frequenza: b.frequenza,
        versoPositivo: b.versoPositivo,
        target: b.target,
        soglia: b.soglia,
        ordine: esistenti.length + i,
      })),
    );

    await logAudit(tx, {
      organizationId: orgId,
      userId,
      azione: "sgiqas.indicatori.base",
      entita: "qas_system",
      entitaId: systemId,
      dettagli: { aggiunti: nuovi.length },
    });
    return { aggiunti: nuovi.length };
  });
}

export async function setCampoIndicatore(
  userId: string,
  orgId: string,
  indicatorId: string,
  input: z.input<typeof campoIndicatoreSchema>,
): Promise<void> {
  await requireEntitlement(userId, orgId, "write_data");
  const v = campoIndicatoreSchema.parse(input);

  await withTenant({ userId, orgId }, async (tx) => {
    const agg = await tx
      .update(qasIndicator)
      .set({ [v.campo]: v.valore, updatedAt: new Date() })
      .where(and(eq(qasIndicator.id, indicatorId), eq(qasIndicator.organizationId, orgId)))
      .returning({ id: qasIndicator.id });
    if (!agg.length) throw new Error("Indicatore inesistente o di un altro tenant");

    await logAudit(tx, {
      organizationId: orgId,
      userId,
      azione: "sgiqas.indicatore.set",
      entita: "qas_indicator",
      entitaId: indicatorId,
      dettagli: { campo: v.campo },
    });
  });
}

export async function eliminaIndicatore(userId: string, orgId: string, indicatorId: string): Promise<void> {
  await requireEntitlement(userId, orgId, "write_data");
  await withTenant({ userId, orgId }, async (tx) => {
    const via = await tx
      .delete(qasIndicator)
      .where(and(eq(qasIndicator.id, indicatorId), eq(qasIndicator.organizationId, orgId)))
      .returning({ id: qasIndicator.id, nome: qasIndicator.nome });
    if (!via.length) throw new Error("Indicatore inesistente o di un altro tenant");

    await logAudit(tx, {
      organizationId: orgId,
      userId,
      azione: "sgiqas.indicatore.delete",
      entita: "qas_indicator",
      entitaId: indicatorId,
      dettagli: { nome: via[0].nome },
    });
  });
}

/**
 * Una rilevazione, per periodo.
 *
 * ⚠️ Una riga per periodo, con unicità: la serie storica è il valore metodologico di
 * questo modulo, e due valori per lo stesso mese renderebbero il grafico una domanda
 * senza risposta. Riscrivere lo stesso periodo aggiorna, non aggiunge.
 */
export async function setRilevazione(
  userId: string,
  orgId: string,
  input: z.input<typeof rilevazioneSchema>,
): Promise<void> {
  await requireEntitlement(userId, orgId, "write_data");
  const v = rilevazioneSchema.parse(input);

  await withTenant({ userId, orgId }, async (tx) => {
    const [ind] = await tx
      .select({ id: qasIndicator.id })
      .from(qasIndicator)
      .where(and(eq(qasIndicator.id, v.indicatorId), eq(qasIndicator.organizationId, orgId)));
    if (!ind) throw new Error("Indicatore inesistente o di un altro tenant");

    await tx
      .insert(qasMeasurement)
      .values({
        id: randomUUID(),
        organizationId: orgId,
        indicatorId: v.indicatorId,
        periodo: v.periodo,
        valore: v.valore,
        note: v.note ?? null,
      })
      .onConflictDoUpdate({
        target: [qasMeasurement.indicatorId, qasMeasurement.periodo],
        set: { valore: v.valore, note: v.note ?? null, updatedAt: new Date() },
      });

    await logAudit(tx, {
      organizationId: orgId,
      userId,
      azione: "sgiqas.rilevazione.set",
      entita: "qas_measurement",
      entitaId: `${v.indicatorId}:${v.periodo}`,
      dettagli: { periodo: v.periodo },
    });
  });
}

export async function eliminaRilevazione(
  userId: string,
  orgId: string,
  indicatorId: string,
  periodo: string,
): Promise<void> {
  await requireEntitlement(userId, orgId, "write_data");
  await withTenant({ userId, orgId }, async (tx) => {
    const via = await tx
      .delete(qasMeasurement)
      .where(
        and(
          eq(qasMeasurement.indicatorId, indicatorId),
          eq(qasMeasurement.periodo, periodo),
          eq(qasMeasurement.organizationId, orgId),
        ),
      )
      .returning({ id: qasMeasurement.id });
    if (!via.length) throw new Error("Rilevazione inesistente o di un altro tenant");

    await logAudit(tx, {
      organizationId: orgId,
      userId,
      azione: "sgiqas.rilevazione.delete",
      entita: "qas_measurement",
      entitaId: `${indicatorId}:${periodo}`,
    });
  });
}

/** Il confine di tenant per le righe che non portano ancora un `organization_id`. */
async function pretendiSistema(tx: Tx, orgId: string, systemId: string) {
  const [row] = await tx
    .select({ id: qasSystem.id, contentSetId: qasSystem.contentSetId, norme: qasSystem.norme })
    .from(qasSystem)
    .where(and(eq(qasSystem.id, systemId), eq(qasSystem.organizationId, orgId)));
  if (!row) throw new Error("Sistema inesistente o di un altro tenant");
  return row;
}
