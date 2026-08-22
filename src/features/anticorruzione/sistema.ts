import { randomUUID } from "node:crypto";
import { and, asc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { withTenant } from "@/lib/db/tenant";
import { logAudit } from "@/lib/audit";
import { requireEntitlement } from "@/features/entitlement";
import { latestSetId } from "@/features/content-set";
import {
  briberyChapter,
  briberyDimension,
  briberyFlag,
  briberyPartner,
  briberyRequirement,
  briberyRequirementState,
  briberySystem,
  company,
} from "@/lib/db/schema";
import { campoSocioSchema, nuovoSocioSchema, profiloSchema, requisitoSchema, sistemaSchema } from "./validation";
import type { z } from "zod";

// Il sistema di gestione anticorruzione di un'azienda.
//
// Regole che valgono per ogni funzione di questo file, e che non sono decorazione:
// - ogni mutazione passa da `requireEntitlement(write_data)` e lascia una riga di audit;
// - ogni SELECT porta il filtro `organization_id` ESPLICITO oltre a RLS. In sviluppo la
//   connessione è privilegiata e le policy non scattano: senza il filtro applicativo, una
//   query mostrerebbe le aziende di tutti gli studi e in produzione RLS lo coprirebbe,
//   lasciando il difetto lì. La difesa sta in tutti e due gli strati;
// - niente derivati persistiti: il livello di rischio e gli obblighi si CALCOLANO da
//   `src/lib/calc/anticorruzione` a ogni lettura.

export async function latestAnticorruzioneSetId(): Promise<string> {
  return latestSetId("iso37001", "Catalogo ISO 37001 non disponibile: esegui il seed dei contenuti");
}

export async function creaSistema(
  userId: string,
  orgId: string,
  input: z.input<typeof sistemaSchema>,
): Promise<string> {
  await requireEntitlement(userId, orgId, "write_data");
  const v = sistemaSchema.parse(input);
  const setId = await latestAnticorruzioneSetId();
  const id = randomUUID();

  await withTenant({ userId, orgId }, async (tx) => {
    const [co] = await tx
      .select({ id: company.id, nome: company.nome })
      .from(company)
      .where(and(eq(company.id, v.companyId), eq(company.organizationId, orgId)));
    if (!co) throw new Error("Azienda inesistente o di un altro tenant");

    await tx.insert(briberySystem).values({
      id,
      organizationId: orgId,
      companyId: v.companyId,
      // Congelato qui: un catalogo nuovo non cambia un sistema già avviato.
      contentSetId: setId,
      // La ragione sociale si eredita dall'anagrafica dell'azienda: è il primo
      // segnaposto del corpus (`[Nome Organizzazione]`), e chiederla di nuovo
      // significherebbe farla divergere da quella del portafoglio.
      ragione: co.nome,
      revisione: "1.0",
    });

    await logAudit(tx, {
      organizationId: orgId,
      userId,
      azione: "anticorruzione.sistema.create",
      entita: "bribery_system",
      entitaId: id,
    });
  });
  return id;
}

export async function getSistema(userId: string, orgId: string, companyId: string) {
  return withTenant({ userId, orgId }, async (tx) => {
    const [row] = await tx
      .select()
      .from(briberySystem)
      .where(and(eq(briberySystem.companyId, companyId), eq(briberySystem.organizationId, orgId)));
    return row ?? null;
  });
}

/**
 * Aggiorna il profilo, campo per campo.
 *
 * Riceve una toppa parziale e non la riga intera: gli altri campi non escono mai dal
 * database, quindi non possono tornarci stantii.
 */
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
    const [s] = await tx
      .select({ id: briberySystem.id })
      .from(briberySystem)
      .where(and(eq(briberySystem.id, systemId), eq(briberySystem.organizationId, orgId)));
    if (!s) throw new Error("Sistema inesistente o di un altro tenant");

    const agg = await tx
      .update(briberySystem)
      .set({ ...Object.fromEntries(campi), updatedAt: new Date() })
      .where(and(eq(briberySystem.id, systemId), eq(briberySystem.organizationId, orgId)))
      .returning({ id: briberySystem.id });
    // ⚠️ Senza `.returning()` un UPDATE che non tocca nulla riesce in silenzio, e
    // l'audit scriverebbe «aggiornato» su un fatto che non è avvenuto.
    if (!agg.length) throw new Error("Nessuna riga aggiornata");

    await logAudit(tx, {
      organizationId: orgId,
      userId,
      azione: "anticorruzione.profilo.set",
      entita: "bribery_system",
      entitaId: systemId,
      dettagli: { campi: campi.map(([k]) => k) },
    });
  });
}

// ─── Soci in affari ──────────────────────────────────────────────────────────

export async function creaSocio(
  userId: string,
  orgId: string,
  systemId: string,
  input: z.input<typeof nuovoSocioSchema>,
): Promise<string> {
  await requireEntitlement(userId, orgId, "write_data");
  const v = nuovoSocioSchema.parse(input);
  const id = randomUUID();

  await withTenant({ userId, orgId }, async (tx) => {
    const [s] = await tx
      .select({ id: briberySystem.id })
      .from(briberySystem)
      .where(and(eq(briberySystem.id, systemId), eq(briberySystem.organizationId, orgId)));
    if (!s) throw new Error("Sistema inesistente o di un altro tenant");

    await tx.insert(briberyPartner).values({ id, organizationId: orgId, systemId, nome: v.nome });
    await logAudit(tx, {
      organizationId: orgId,
      userId,
      azione: "anticorruzione.socio.create",
      entita: "bribery_partner",
      entitaId: id,
      dettagli: { nome: v.nome },
    });
  });
  return id;
}

/**
 * Un campo solo, atomico lato database.
 *
 * Il client manda `{campo, valore}` e nient'altro. Il valore precedente degli altri
 * campi resta dov'è: non passa dal browser, quindi non può tornare indietro stantio.
 */
export async function setCampoSocio(
  userId: string,
  orgId: string,
  socioId: string,
  input: z.input<typeof campoSocioSchema>,
): Promise<void> {
  await requireEntitlement(userId, orgId, "write_data");
  const v = campoSocioSchema.parse(input);

  await withTenant({ userId, orgId }, async (tx) => {
    // Il confine si verifica QUI e con il filtro esplicito, non ci si affida a RLS.
    const [p] = await tx
      .select({ id: briberyPartner.id })
      .from(briberyPartner)
      .where(and(eq(briberyPartner.id, socioId), eq(briberyPartner.organizationId, orgId)));
    if (!p) throw new Error("Socio in affari inesistente o di un altro tenant");

    // I testi vuoti diventano NULL: «campo mai compilato» e «campo svuotato» sono la
    // stessa cosa per chi legge, e due rappresentazioni diverse dello stesso stato
    // sono due modi di scrivere la stessa domanda in ogni query successiva.
    const valore = typeof v.valore === "string" && v.valore === "" ? null : v.valore;

    const agg = await tx
      .update(briberyPartner)
      .set({ [v.campo]: valore, updatedAt: new Date() })
      .where(and(eq(briberyPartner.id, socioId), eq(briberyPartner.organizationId, orgId)))
      .returning({ id: briberyPartner.id });
    if (!agg.length) throw new Error("Nessuna riga aggiornata");

    await logAudit(tx, {
      organizationId: orgId,
      userId,
      azione: "anticorruzione.socio.set",
      entita: "bribery_partner",
      entitaId: socioId,
      dettagli: { campo: v.campo },
    });
  });
}

export async function eliminaSocio(userId: string, orgId: string, socioId: string): Promise<void> {
  await requireEntitlement(userId, orgId, "write_data");
  await withTenant({ userId, orgId }, async (tx) => {
    const via = await tx
      .delete(briberyPartner)
      .where(and(eq(briberyPartner.id, socioId), eq(briberyPartner.organizationId, orgId)))
      .returning({ id: briberyPartner.id, nome: briberyPartner.nome });
    if (!via.length) throw new Error("Socio in affari inesistente o di un altro tenant");

    await logAudit(tx, {
      organizationId: orgId,
      userId,
      azione: "anticorruzione.socio.delete",
      entita: "bribery_partner",
      entitaId: socioId,
      dettagli: { nome: via[0]!.nome },
    });
  });
}

export async function listaSoci(userId: string, orgId: string, systemId: string) {
  return withTenant({ userId, orgId }, async (tx) =>
    tx
      .select()
      .from(briberyPartner)
      .where(and(eq(briberyPartner.systemId, systemId), eq(briberyPartner.organizationId, orgId)))
      .orderBy(asc(briberyPartner.nome)),
  );
}

// ─── Requisiti ───────────────────────────────────────────────────────────────

/** Stato, nota o evidenza di un requisito: un campo per volta, come per i soci. */
export async function setCampoRequisito(
  userId: string,
  orgId: string,
  systemId: string,
  input: z.input<typeof requisitoSchema>,
): Promise<void> {
  await requireEntitlement(userId, orgId, "write_data");
  const v = requisitoSchema.parse(input);

  await withTenant({ userId, orgId }, async (tx) => {
    const [s] = await tx
      .select({ id: briberySystem.id, setId: briberySystem.contentSetId })
      .from(briberySystem)
      .where(and(eq(briberySystem.id, systemId), eq(briberySystem.organizationId, orgId)));
    if (!s) throw new Error("Sistema inesistente o di un altro tenant");

    // Il requisito deve esistere NEL CATALOGO CONGELATO di questo sistema, non in
    // quello più recente: altrimenti una versione nuova del catalogo renderebbe
    // scrivibili requisiti che questo sistema non ha mai avuto.
    const [r] = await tx
      .select({ key: briberyRequirement.key })
      .from(briberyRequirement)
      .where(and(eq(briberyRequirement.setId, s.setId), eq(briberyRequirement.key, v.requirementKey)));
    if (!r) throw new Error("Requisito inesistente nel catalogo di questo sistema");

    const valore = v.valore === "" ? null : v.valore;
    await tx
      .insert(briberyRequirementState)
      .values({
        id: randomUUID(),
        organizationId: orgId,
        systemId,
        requirementKey: v.requirementKey,
        [v.campo]: valore,
      })
      .onConflictDoUpdate({
        target: [briberyRequirementState.systemId, briberyRequirementState.requirementKey],
        // SOLO il campo toccato: gli altri restano com'erano nel database.
        set: { [v.campo]: valore, updatedAt: new Date() },
      });

    await logAudit(tx, {
      organizationId: orgId,
      userId,
      azione: "anticorruzione.requisito.set",
      entita: "bribery_requirement_state",
      entitaId: `${systemId}:${v.requirementKey}`,
      dettagli: { campo: v.campo },
    });
  });
}

export async function listaRequisiti(userId: string, orgId: string, systemId: string) {
  return withTenant({ userId, orgId }, async (tx) =>
    tx
      .select()
      .from(briberyRequirementState)
      .where(and(eq(briberyRequirementState.systemId, systemId), eq(briberyRequirementState.organizationId, orgId))),
  );
}

// ─── Catalogo (sola lettura) ─────────────────────────────────────────────────

/**
 * I cataloghi non portano `organization_id`: sono gli stessi per tutti gli studi, e si
 * leggono con la connessione dell'applicazione senza contesto di tenant. La policy
 * `<tabella>_read` li rende leggibili ad `app_rls`; scriverli richiede lo staff.
 */
export async function getCatalogo(setId: string) {
  const [capitoli, requisiti, dimensioni, fattori] = await Promise.all([
    db.select().from(briberyChapter).where(eq(briberyChapter.setId, setId)).orderBy(asc(briberyChapter.ordine)),
    db
      .select()
      .from(briberyRequirement)
      .where(eq(briberyRequirement.setId, setId))
      .orderBy(asc(briberyRequirement.ordine)),
    db.select().from(briberyDimension).where(eq(briberyDimension.setId, setId)).orderBy(asc(briberyDimension.ordine)),
    db.select().from(briberyFlag).where(eq(briberyFlag.setId, setId)).orderBy(asc(briberyFlag.ordine)),
  ]);
  return { capitoli, requisiti, dimensioni, fattori };
}
