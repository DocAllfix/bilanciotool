import { randomUUID } from "node:crypto";
import { and, eq, sql } from "drizzle-orm";
import { withTenant, type Tx } from "@/lib/db/tenant";
import { logAudit } from "@/lib/audit";
import { requireEntitlement } from "@/features/entitlement";
import { latestSetId } from "@/features/content-set";
import { company, wbChannel, wbReport, wbRequirementState, wbSystem } from "@/lib/db/schema";
import {
  assettoSchema,
  campoCanaleSchema,
  campoFascicoloSchema,
  nuovoCanaleSchema,
  nuovoFascicoloSchema,
  profiloAssettoSchema,
  requisitoSchema,
} from "./validation";
import type { z } from "zod";

// La gestione delle segnalazioni di un'azienda.
//
// Valgono le regole di ogni feature layer di questo prodotto: `requireEntitlement` e
// audit su ogni mutazione, filtro `organization_id` ESPLICITO su ogni select oltre a
// RLS, aggiornamento per singolo campo, nessun derivato persistito.
//
// ⚠️ In più, e solo qui: la LETTURA di un fascicolo si registra. Vedi `queries.ts`.

export async function latestWbSetId(): Promise<string> {
  return latestSetId("wb", "Catalogo delle segnalazioni non disponibile: esegui il seed dei contenuti");
}

// ─── L'assetto ───────────────────────────────────────────────────────────────

export async function creaAssetto(
  userId: string,
  orgId: string,
  input: z.input<typeof assettoSchema>,
): Promise<string> {
  await requireEntitlement(userId, orgId, "write_data");
  const v = assettoSchema.parse(input);
  const setId = await latestWbSetId();
  const id = randomUUID();

  await withTenant({ userId, orgId }, async (tx) => {
    const [co] = await tx
      .select({ id: company.id, nome: company.nome })
      .from(company)
      .where(and(eq(company.id, v.companyId), eq(company.organizationId, orgId)));
    if (!co) throw new Error("Azienda inesistente o di un altro tenant");

    await tx.insert(wbSystem).values({
      id,
      organizationId: orgId,
      companyId: v.companyId,
      contentSetId: setId,
      ragione: co.nome,
      revisione: "1.0",
    });

    // ⚠️ Le tre forme di legge si creano insieme all'assetto, spente.
    //
    // Non è comodità: `statoCanale` distingue «non esiste» da «esiste ed è spenta», e
    // con l'elenco vuoto ogni azienda nuova comparirebbe con tre canali «mancanti» —
    // cioè col rimedio sbagliato, «istituirli», quando ciò che serve è descriverli e
    // accenderli. Nascendo spente, la scheda mostra tre caselle da riempire e il quadro
    // dice la verità: previsti, non ancora attivi.
    for (const forma of ["Scritta", "Orale", "Incontro diretto"] as const) {
      await tx.insert(wbChannel).values({ id: randomUUID(), organizationId: orgId, systemId: id, forma });
    }

    await logAudit(tx, {
      organizationId: orgId,
      userId,
      azione: "segnalazioni.assetto.create",
      entita: "wb_system",
      entitaId: id,
    });
  });
  return id;
}

export async function getAssetto(userId: string, orgId: string, companyId: string) {
  return withTenant({ userId, orgId }, async (tx) => {
    const [row] = await tx
      .select()
      .from(wbSystem)
      .where(and(eq(wbSystem.companyId, companyId), eq(wbSystem.organizationId, orgId)));
    return row ?? null;
  });
}

export async function aggiornaProfilo(
  userId: string,
  orgId: string,
  systemId: string,
  patch: z.input<typeof profiloAssettoSchema>,
): Promise<void> {
  await requireEntitlement(userId, orgId, "write_data");
  const v = profiloAssettoSchema.parse(patch);
  const campi = Object.entries(v).filter(([, val]) => val !== undefined);
  if (!campi.length) return;

  await withTenant({ userId, orgId }, async (tx) => {
    const agg = await tx
      .update(wbSystem)
      .set({ ...Object.fromEntries(campi), updatedAt: new Date() })
      .where(and(eq(wbSystem.id, systemId), eq(wbSystem.organizationId, orgId)))
      .returning({ id: wbSystem.id });
    if (!agg.length) throw new Error("Assetto inesistente o di un altro tenant");

    await logAudit(tx, {
      organizationId: orgId,
      userId,
      azione: "segnalazioni.profilo.set",
      entita: "wb_system",
      entitaId: systemId,
      dettagli: { campi: campi.map(([k]) => k) },
    });
  });
}

// ─── Il canale ───────────────────────────────────────────────────────────────

export async function creaCanale(
  userId: string,
  orgId: string,
  systemId: string,
  input: z.input<typeof nuovoCanaleSchema>,
): Promise<string> {
  await requireEntitlement(userId, orgId, "write_data");
  const v = nuovoCanaleSchema.parse(input);
  const id = randomUUID();

  await withTenant({ userId, orgId }, async (tx) => {
    await pretendiAssetto(tx, orgId, systemId);
    await tx.insert(wbChannel).values({
      id,
      organizationId: orgId,
      systemId,
      forma: v.forma,
      descrizione: v.descrizione ?? null,
    });
    await logAudit(tx, {
      organizationId: orgId,
      userId,
      azione: "segnalazioni.canale.create",
      entita: "wb_channel",
      entitaId: id,
      dettagli: { forma: v.forma },
    });
  });
  return id;
}

export async function setCampoCanale(
  userId: string,
  orgId: string,
  canaleId: string,
  input: z.input<typeof campoCanaleSchema>,
): Promise<void> {
  await requireEntitlement(userId, orgId, "write_data");
  const v = campoCanaleSchema.parse(input);

  await withTenant({ userId, orgId }, async (tx) => {
    const agg = await tx
      .update(wbChannel)
      .set({ [v.campo]: v.valore, updatedAt: new Date() })
      .where(and(eq(wbChannel.id, canaleId), eq(wbChannel.organizationId, orgId)))
      .returning({ id: wbChannel.id });
    if (!agg.length) throw new Error("Canale inesistente o di un altro tenant");

    await logAudit(tx, {
      organizationId: orgId,
      userId,
      azione: "segnalazioni.canale.set",
      entita: "wb_channel",
      entitaId: canaleId,
      dettagli: { campo: v.campo },
    });
  });
}

export async function eliminaCanale(userId: string, orgId: string, canaleId: string): Promise<void> {
  await requireEntitlement(userId, orgId, "write_data");
  await withTenant({ userId, orgId }, async (tx) => {
    const via = await tx
      .delete(wbChannel)
      .where(and(eq(wbChannel.id, canaleId), eq(wbChannel.organizationId, orgId)))
      .returning({ id: wbChannel.id, forma: wbChannel.forma });
    if (!via.length) throw new Error("Canale inesistente o di un altro tenant");

    await logAudit(tx, {
      organizationId: orgId,
      userId,
      azione: "segnalazioni.canale.delete",
      entita: "wb_channel",
      entitaId: canaleId,
      dettagli: { forma: via[0].forma },
    });
  });
}

// ─── Il fascicolo ────────────────────────────────────────────────────────────

export async function creaFascicolo(
  userId: string,
  orgId: string,
  systemId: string,
  input: z.input<typeof nuovoFascicoloSchema>,
): Promise<{ id: string; numero: number }> {
  await requireEntitlement(userId, orgId, "write_data");
  const v = nuovoFascicoloSchema.parse(input);
  const id = randomUUID();

  const numero = await withTenant({ userId, orgId }, async (tx) => {
    // ⚠️ Il blocco sulla riga dell'assetto serve a una cosa sola: mettere in fila due
    // inserimenti simultanei. Senza, due gestori che aprono un fascicolo nello stesso
    // istante leggono lo stesso massimo, e uno dei due si prende una violazione di
    // unicità in faccia — cioè un errore incomprensibile mentre registra una
    // segnalazione appena arrivata. Il vincolo resta ed è la rete: questo è il modo di
    // non farla mai toccare.
    const [assetto] = await tx
      .select({ id: wbSystem.id })
      .from(wbSystem)
      .where(and(eq(wbSystem.id, systemId), eq(wbSystem.organizationId, orgId)))
      .for("update");
    if (!assetto) throw new Error("Assetto inesistente o di un altro tenant");

    const [{ prossimo }] = await tx
      .select({ prossimo: sql<number>`coalesce(max(${wbReport.numero}), 0) + 1` })
      .from(wbReport)
      .where(and(eq(wbReport.systemId, systemId), eq(wbReport.organizationId, orgId)));

    await tx.insert(wbReport).values({
      id,
      organizationId: orgId,
      systemId,
      numero: prossimo,
      dataRicezione: v.dataRicezione,
      canale: v.canale,
      anonima: v.anonima,
    });

    // ⚠️ L'audit NON porta l'oggetto della segnalazione, e non è una svista: il registro
    // è consultabile da chi amministra lo studio, il fascicolo no. Registrare qui il
    // contenuto lo farebbe uscire dal perimetro delle persone autorizzate passando da
    // una porta che nessuno guarda.
    await logAudit(tx, {
      organizationId: orgId,
      userId,
      azione: "segnalazioni.fascicolo.create",
      entita: "wb_report",
      entitaId: id,
      dettagli: { numero: prossimo },
    });
    return prossimo;
  });

  return { id, numero };
}

export async function setCampoFascicolo(
  userId: string,
  orgId: string,
  reportId: string,
  input: z.input<typeof campoFascicoloSchema>,
): Promise<void> {
  await requireEntitlement(userId, orgId, "write_data");
  const v = campoFascicoloSchema.parse(input);
  const [campo] = Object.keys(v);

  await withTenant({ userId, orgId }, async (tx) => {
    const agg = await tx
      .update(wbReport)
      .set({ ...v, updatedAt: new Date() })
      .where(and(eq(wbReport.id, reportId), eq(wbReport.organizationId, orgId)))
      .returning({ id: wbReport.id, numero: wbReport.numero });
    if (!agg.length) throw new Error("Fascicolo inesistente o di un altro tenant");

    // Il nome del campo sì, il valore no: «ambito» è un'informazione di processo,
    // «i fatti segnalati» sono il contenuto.
    await logAudit(tx, {
      organizationId: orgId,
      userId,
      azione: "segnalazioni.fascicolo.set",
      entita: "wb_report",
      entitaId: reportId,
      dettagli: { numero: agg[0].numero, campo },
    });
  });
}

/**
 * L'eliminazione del fascicolo.
 *
 * ⚠️ Va tenuta distinta dalla CANCELLAZIONE per decorso del termine di cinque anni, che
 * è un adempimento e si registra nella scheda Conservazione. Questa è l'eliminazione di
 * qualcosa aperto per errore, e l'audit deve dire quale delle due è stata: a distanza di
 * anni, «il fascicolo 12 non c'è più» ha due spiegazioni, una dovuta e una da spiegare.
 */
export async function eliminaFascicolo(userId: string, orgId: string, reportId: string): Promise<void> {
  await requireEntitlement(userId, orgId, "write_data");
  await withTenant({ userId, orgId }, async (tx) => {
    const via = await tx
      .delete(wbReport)
      .where(and(eq(wbReport.id, reportId), eq(wbReport.organizationId, orgId)))
      .returning({ id: wbReport.id, numero: wbReport.numero });
    if (!via.length) throw new Error("Fascicolo inesistente o di un altro tenant");

    await logAudit(tx, {
      organizationId: orgId,
      userId,
      azione: "segnalazioni.fascicolo.delete",
      entita: "wb_report",
      entitaId: reportId,
      dettagli: { numero: via[0].numero, natura: "eliminazione, non cancellazione per decorso del termine" },
    });
  });
}

// ─── I requisiti ─────────────────────────────────────────────────────────────

export async function setCampoRequisito(
  userId: string,
  orgId: string,
  systemId: string,
  input: z.input<typeof requisitoSchema>,
): Promise<void> {
  await requireEntitlement(userId, orgId, "write_data");
  const v = requisitoSchema.parse(input);

  await withTenant({ userId, orgId }, async (tx) => {
    await pretendiAssetto(tx, orgId, systemId);
    await tx
      .insert(wbRequirementState)
      .values({
        id: randomUUID(),
        organizationId: orgId,
        systemId,
        requirementKey: v.requirementKey,
        [v.campo]: v.valore,
      })
      .onConflictDoUpdate({
        target: [wbRequirementState.systemId, wbRequirementState.requirementKey],
        set: { [v.campo]: v.valore, updatedAt: new Date() },
      });

    await logAudit(tx, {
      organizationId: orgId,
      userId,
      azione: "segnalazioni.requisito.set",
      entita: "wb_requirement_state",
      entitaId: `${systemId}:${v.requirementKey}`,
      dettagli: { campo: v.campo },
    });
  });
}

/**
 * Il confine di tenant, scritto una volta.
 *
 * Serve dove la riga che si sta creando NON porta un `organization_id` da confrontare
 * con la clausola `where` — un canale nuovo, uno stato di requisito nuovo. Senza, un
 * `systemId` di un altro studio verrebbe accettato dall'applicazione e fermato dalle
 * sole policy: in sviluppo la connessione è privilegiata e le policy non scattano,
 * quindi il difetto si vedrebbe solo in produzione. La difesa sta in tutti e due gli
 * strati.
 */
async function pretendiAssetto(tx: Tx, orgId: string, systemId: string) {
  const [row] = await tx
    .select({ id: wbSystem.id })
    .from(wbSystem)
    .where(and(eq(wbSystem.id, systemId), eq(wbSystem.organizationId, orgId)));
  if (!row) throw new Error("Assetto inesistente o di un altro tenant");
}
