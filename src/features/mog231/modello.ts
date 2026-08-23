import { randomUUID } from "node:crypto";
import { and, asc, eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import { withTenant } from "@/lib/db/tenant";
import { logAudit } from "@/lib/audit";
import { requireEntitlement } from "@/features/entitlement";
import { latestSetId } from "@/features/content-set";
import {
  company,
  mogCrime,
  mogCrimeApplicability,
  mogFamily,
  mogModel,
  mogPillar,
  mogProcess,
  mogRequirement,
  mogRequirementState,
  mogScenario,
} from "@/lib/db/schema";
import {
  applicabilitaSchema,
  campoProcessoSchema,
  campoScenarioSchema,
  modelloSchema,
  nuovoProcessoSchema,
  profiloSchema,
  requisitoSchema,
} from "./validation";
import type { z } from "zod";

// Il Modello 231 di un'azienda.
//
// Valgono le regole di ogni feature layer di questo prodotto: `requireEntitlement` e
// audit su ogni mutazione, filtro `organization_id` ESPLICITO su ogni select oltre a
// RLS, aggiornamento per singolo campo, nessun derivato persistito.

export async function latestMog231SetId(): Promise<string> {
  return latestSetId("mog231", "Catalogo del Modello 231 non disponibile: esegui il seed dei contenuti");
}

export async function creaModello(
  userId: string,
  orgId: string,
  input: z.input<typeof modelloSchema>,
): Promise<string> {
  await requireEntitlement(userId, orgId, "write_data");
  const v = modelloSchema.parse(input);
  const setId = await latestMog231SetId();
  const id = randomUUID();

  await withTenant({ userId, orgId }, async (tx) => {
    const [co] = await tx
      .select({ id: company.id, nome: company.nome })
      .from(company)
      .where(and(eq(company.id, v.companyId), eq(company.organizationId, orgId)));
    if (!co) throw new Error("Azienda inesistente o di un altro tenant");

    await tx.insert(mogModel).values({
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
      azione: "mog231.modello.create",
      entita: "mog_model",
      entitaId: id,
    });
  });
  return id;
}

export async function getModello(userId: string, orgId: string, companyId: string) {
  return withTenant({ userId, orgId }, async (tx) => {
    const [row] = await tx
      .select()
      .from(mogModel)
      .where(and(eq(mogModel.companyId, companyId), eq(mogModel.organizationId, orgId)));
    return row ?? null;
  });
}

export async function aggiornaProfilo(
  userId: string,
  orgId: string,
  modelId: string,
  patch: z.input<typeof profiloSchema>,
): Promise<void> {
  await requireEntitlement(userId, orgId, "write_data");
  const v = profiloSchema.parse(patch);
  const campi = Object.entries(v).filter(([, val]) => val !== undefined);
  if (!campi.length) return;

  await withTenant({ userId, orgId }, async (tx) => {
    const agg = await tx
      .update(mogModel)
      .set({ ...Object.fromEntries(campi), updatedAt: new Date() })
      .where(and(eq(mogModel.id, modelId), eq(mogModel.organizationId, orgId)))
      .returning({ id: mogModel.id });
    if (!agg.length) throw new Error("Modello inesistente o di un altro tenant");

    await logAudit(tx, {
      organizationId: orgId,
      userId,
      azione: "mog231.profilo.set",
      entita: "mog_model",
      entitaId: modelId,
      dettagli: { campi: campi.map(([k]) => k) },
    });
  });
}

// ─── Processi sensibili ──────────────────────────────────────────────────────

export async function creaProcesso(
  userId: string,
  orgId: string,
  modelId: string,
  input: z.input<typeof nuovoProcessoSchema>,
): Promise<string> {
  await requireEntitlement(userId, orgId, "write_data");
  const v = nuovoProcessoSchema.parse(input);
  const id = randomUUID();

  await withTenant({ userId, orgId }, async (tx) => {
    const [m] = await tx
      .select({ id: mogModel.id })
      .from(mogModel)
      .where(and(eq(mogModel.id, modelId), eq(mogModel.organizationId, orgId)));
    if (!m) throw new Error("Modello inesistente o di un altro tenant");

    await tx.insert(mogProcess).values({ id, organizationId: orgId, modelId, nome: v.nome });
    await logAudit(tx, {
      organizationId: orgId,
      userId,
      azione: "mog231.processo.create",
      entita: "mog_process",
      entitaId: id,
      dettagli: { nome: v.nome },
    });
  });
  return id;
}

export async function setCampoProcesso(
  userId: string,
  orgId: string,
  processId: string,
  input: z.input<typeof campoProcessoSchema>,
): Promise<void> {
  await requireEntitlement(userId, orgId, "write_data");
  const v = campoProcessoSchema.parse(input);

  await withTenant({ userId, orgId }, async (tx) => {
    const valore = v.valore === "" ? null : v.valore;
    const agg = await tx
      .update(mogProcess)
      .set({ [v.campo]: valore, updatedAt: new Date() })
      .where(and(eq(mogProcess.id, processId), eq(mogProcess.organizationId, orgId)))
      .returning({ id: mogProcess.id });
    if (!agg.length) throw new Error("Processo inesistente o di un altro tenant");

    await logAudit(tx, {
      organizationId: orgId,
      userId,
      azione: "mog231.processo.set",
      entita: "mog_process",
      entitaId: processId,
      dettagli: { campo: v.campo },
    });
  });
}

export async function eliminaProcesso(userId: string, orgId: string, processId: string): Promise<void> {
  await requireEntitlement(userId, orgId, "write_data");
  await withTenant({ userId, orgId }, async (tx) => {
    // Gli scenari se ne vanno in cascata: sono la valutazione DI QUESTO processo, e
    // senza il processo non vogliono dire niente.
    const via = await tx
      .delete(mogProcess)
      .where(and(eq(mogProcess.id, processId), eq(mogProcess.organizationId, orgId)))
      .returning({ id: mogProcess.id, nome: mogProcess.nome });
    if (!via.length) throw new Error("Processo inesistente o di un altro tenant");

    await logAudit(tx, {
      organizationId: orgId,
      userId,
      azione: "mog231.processo.delete",
      entita: "mog_process",
      entitaId: processId,
      dettagli: { nome: via[0]!.nome },
    });
  });
}

// ─── Scenari: processo × reato ───────────────────────────────────────────────

/**
 * Aggiunge un reato a un processo, cioè crea lo scenario.
 *
 * Nessun valore: lo scenario nasce NON valutato, e finché lo è risulta non accettabile.
 * Aggiungere un reato peggiora il cruscotto, ed è voluto.
 */
export async function aggiungiScenario(
  userId: string,
  orgId: string,
  processId: string,
  crimeKey: string,
): Promise<string> {
  await requireEntitlement(userId, orgId, "write_data");
  const id = randomUUID();

  await withTenant({ userId, orgId }, async (tx) => {
    const [p] = await tx
      .select({ id: mogProcess.id, modelId: mogProcess.modelId })
      .from(mogProcess)
      .where(and(eq(mogProcess.id, processId), eq(mogProcess.organizationId, orgId)));
    if (!p) throw new Error("Processo inesistente o di un altro tenant");

    // Il reato deve esistere nel catalogo CONGELATO di questo modello, non nel più
    // recente: un catalogo nuovo non deve rendere valutabili reati che il modello non ha.
    const [m] = await tx
      .select({ setId: mogModel.contentSetId })
      .from(mogModel)
      .where(and(eq(mogModel.id, p.modelId), eq(mogModel.organizationId, orgId)));
    if (!m) throw new Error("Modello inesistente o di un altro tenant");
    const [r] = await db
      .select({ key: mogCrime.key })
      .from(mogCrime)
      .where(and(eq(mogCrime.setId, m.setId), eq(mogCrime.key, crimeKey)));
    if (!r) throw new Error("Reato inesistente nel catalogo di questo modello");

    await tx.insert(mogScenario).values({ id, organizationId: orgId, processId, crimeKey });
    await logAudit(tx, {
      organizationId: orgId,
      userId,
      azione: "mog231.scenario.create",
      entita: "mog_scenario",
      entitaId: id,
      dettagli: { processId, crimeKey },
    });
  });
  return id;
}

export async function setCampoScenario(
  userId: string,
  orgId: string,
  scenarioId: string,
  input: z.input<typeof campoScenarioSchema>,
): Promise<void> {
  await requireEntitlement(userId, orgId, "write_data");
  const v = campoScenarioSchema.parse(input);

  await withTenant({ userId, orgId }, async (tx) => {
    const valore = typeof v.valore === "string" && v.valore === "" ? null : v.valore;
    const agg = await tx
      .update(mogScenario)
      .set({ [v.campo]: valore, updatedAt: new Date() })
      .where(and(eq(mogScenario.id, scenarioId), eq(mogScenario.organizationId, orgId)))
      .returning({ id: mogScenario.id });
    if (!agg.length) throw new Error("Scenario inesistente o di un altro tenant");

    await logAudit(tx, {
      organizationId: orgId,
      userId,
      azione: "mog231.scenario.set",
      entita: "mog_scenario",
      entitaId: scenarioId,
      dettagli: { campo: v.campo },
    });
  });
}

export async function eliminaScenario(userId: string, orgId: string, scenarioId: string): Promise<void> {
  await requireEntitlement(userId, orgId, "write_data");
  await withTenant({ userId, orgId }, async (tx) => {
    const via = await tx
      .delete(mogScenario)
      .where(and(eq(mogScenario.id, scenarioId), eq(mogScenario.organizationId, orgId)))
      .returning({ id: mogScenario.id, crimeKey: mogScenario.crimeKey });
    if (!via.length) throw new Error("Scenario inesistente o di un altro tenant");

    await logAudit(tx, {
      organizationId: orgId,
      userId,
      azione: "mog231.scenario.delete",
      entita: "mog_scenario",
      entitaId: scenarioId,
      dettagli: { crimeKey: via[0]!.crimeKey },
    });
  });
}

// ─── Applicabilità dei reati e requisiti ─────────────────────────────────────

export async function setApplicabilita(
  userId: string,
  orgId: string,
  modelId: string,
  input: z.input<typeof applicabilitaSchema>,
): Promise<void> {
  await requireEntitlement(userId, orgId, "write_data");
  const v = applicabilitaSchema.parse(input);

  await withTenant({ userId, orgId }, async (tx) => {
    const [m] = await tx
      .select({ id: mogModel.id })
      .from(mogModel)
      .where(and(eq(mogModel.id, modelId), eq(mogModel.organizationId, orgId)));
    if (!m) throw new Error("Modello inesistente o di un altro tenant");

    const valore = v.valore === "" ? null : v.valore;
    await tx
      .insert(mogCrimeApplicability)
      .values({ id: randomUUID(), organizationId: orgId, modelId, crimeKey: v.crimeKey, [v.campo]: valore })
      .onConflictDoUpdate({
        target: [mogCrimeApplicability.modelId, mogCrimeApplicability.crimeKey],
        set: { [v.campo]: valore, updatedAt: new Date() },
      });

    await logAudit(tx, {
      organizationId: orgId,
      userId,
      azione: "mog231.reato.set",
      entita: "mog_crime_applicability",
      entitaId: `${modelId}:${v.crimeKey}`,
      dettagli: { campo: v.campo },
    });
  });
}

export async function setCampoRequisito(
  userId: string,
  orgId: string,
  modelId: string,
  input: z.input<typeof requisitoSchema>,
): Promise<void> {
  await requireEntitlement(userId, orgId, "write_data");
  const v = requisitoSchema.parse(input);

  await withTenant({ userId, orgId }, async (tx) => {
    const [m] = await tx
      .select({ id: mogModel.id, setId: mogModel.contentSetId })
      .from(mogModel)
      .where(and(eq(mogModel.id, modelId), eq(mogModel.organizationId, orgId)));
    if (!m) throw new Error("Modello inesistente o di un altro tenant");

    const [r] = await db
      .select({ key: mogRequirement.key })
      .from(mogRequirement)
      .where(and(eq(mogRequirement.setId, m.setId), eq(mogRequirement.key, v.requirementKey)));
    if (!r) throw new Error("Requisito inesistente nel catalogo di questo modello");

    const valore = v.valore === "" ? null : v.valore;
    await tx
      .insert(mogRequirementState)
      .values({ id: randomUUID(), organizationId: orgId, modelId, requirementKey: v.requirementKey, [v.campo]: valore })
      .onConflictDoUpdate({
        target: [mogRequirementState.modelId, mogRequirementState.requirementKey],
        set: { [v.campo]: valore, updatedAt: new Date() },
      });

    await logAudit(tx, {
      organizationId: orgId,
      userId,
      azione: "mog231.requisito.set",
      entita: "mog_requirement_state",
      entitaId: `${modelId}:${v.requirementKey}`,
      dettagli: { campo: v.campo },
    });
  });
}

// ─── Letture ─────────────────────────────────────────────────────────────────

export async function listaProcessi(userId: string, orgId: string, modelId: string) {
  return withTenant({ userId, orgId }, async (tx) =>
    tx
      .select()
      .from(mogProcess)
      .where(and(eq(mogProcess.modelId, modelId), eq(mogProcess.organizationId, orgId)))
      .orderBy(asc(mogProcess.nome)),
  );
}

export async function listaScenari(userId: string, orgId: string, processIds: readonly string[]) {
  if (!processIds.length) return [];
  return withTenant({ userId, orgId }, async (tx) =>
    tx
      .select()
      .from(mogScenario)
      .where(and(inArray(mogScenario.processId, [...processIds]), eq(mogScenario.organizationId, orgId))),
  );
}

export async function listaApplicabilita(userId: string, orgId: string, modelId: string) {
  return withTenant({ userId, orgId }, async (tx) =>
    tx
      .select()
      .from(mogCrimeApplicability)
      .where(and(eq(mogCrimeApplicability.modelId, modelId), eq(mogCrimeApplicability.organizationId, orgId))),
  );
}

export async function listaRequisiti(userId: string, orgId: string, modelId: string) {
  return withTenant({ userId, orgId }, async (tx) =>
    tx
      .select()
      .from(mogRequirementState)
      .where(and(eq(mogRequirementState.modelId, modelId), eq(mogRequirementState.organizationId, orgId))),
  );
}

/** I cataloghi non portano `organization_id`: si leggono senza contesto di tenant. */
export async function getCatalogo(setId: string) {
  const [famiglie, reati, pilastri, requisiti] = await Promise.all([
    db.select().from(mogFamily).where(eq(mogFamily.setId, setId)).orderBy(asc(mogFamily.ordine)),
    db.select().from(mogCrime).where(eq(mogCrime.setId, setId)).orderBy(asc(mogCrime.ordine)),
    db.select().from(mogPillar).where(eq(mogPillar.setId, setId)).orderBy(asc(mogPillar.ordine)),
    db.select().from(mogRequirement).where(eq(mogRequirement.setId, setId)).orderBy(asc(mogRequirement.ordine)),
  ]);
  return { famiglie, reati, pilastri, requisiti };
}
