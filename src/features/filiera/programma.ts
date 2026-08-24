import { randomUUID } from "node:crypto";
import { and, eq, sql } from "drizzle-orm";
import { withTenant, type Tx } from "@/lib/db/tenant";
import { logAudit } from "@/lib/audit";
import { requireEntitlement } from "@/features/entitlement";
import { latestSetId } from "@/features/content-set";
import { chainPartner, chainPartnerScore, chainProgram, company } from "@/lib/db/schema";
import {
  campoPartnerSchema,
  flagSchema,
  partnerNuovoSchema,
  profiloSchema,
  programmaSchema,
  punteggioSchema,
} from "./validation";
import type { z } from "zod";

// Il programma di due diligence di un'azienda, e i suoi partner.
//
// Valgono le regole di ogni feature layer: `requireEntitlement` e audit su ogni
// mutazione, filtro `organization_id` esplicito oltre a RLS, un campo per volta.

export async function latestFilieraSetId(): Promise<string> {
  return latestSetId("filiera", "Catalogo della filiera non disponibile: esegui il seed dei contenuti");
}

export async function creaProgramma(
  userId: string,
  orgId: string,
  input: z.input<typeof programmaSchema>,
): Promise<string> {
  await requireEntitlement(userId, orgId, "write_data");
  const v = programmaSchema.parse(input);
  const setId = await latestFilieraSetId();
  const id = randomUUID();

  await withTenant({ userId, orgId }, async (tx) => {
    const [co] = await tx
      .select({ id: company.id, nome: company.nome })
      .from(company)
      .where(and(eq(company.id, v.companyId), eq(company.organizationId, orgId)));
    if (!co) throw new Error("Azienda inesistente o di un altro tenant");

    await tx.insert(chainProgram).values({
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
      azione: "filiera.programma.create",
      entita: "chain_program",
      entitaId: id,
    });
  });
  return id;
}

export async function aggiornaProfilo(
  userId: string,
  orgId: string,
  programId: string,
  patch: z.input<typeof profiloSchema>,
): Promise<void> {
  await requireEntitlement(userId, orgId, "write_data");
  const v = profiloSchema.parse(patch);
  const campi = Object.entries(v).filter(([, val]) => val !== undefined);
  if (!campi.length) return;

  await withTenant({ userId, orgId }, async (tx) => {
    const agg = await tx
      .update(chainProgram)
      .set({ ...Object.fromEntries(campi), updatedAt: new Date() })
      .where(and(eq(chainProgram.id, programId), eq(chainProgram.organizationId, orgId)))
      .returning({ id: chainProgram.id });
    if (!agg.length) throw new Error("Programma inesistente o di un altro tenant");

    await logAudit(tx, {
      organizationId: orgId,
      userId,
      azione: "filiera.profilo.set",
      entita: "chain_program",
      entitaId: programId,
      dettagli: { campi: campi.map(([k]) => k) },
    });
  });
}

export async function creaPartner(
  userId: string,
  orgId: string,
  programId: string,
  input: z.input<typeof partnerNuovoSchema>,
): Promise<string> {
  await requireEntitlement(userId, orgId, "write_data");
  const v = partnerNuovoSchema.parse(input);
  const id = randomUUID();

  await withTenant({ userId, orgId }, async (tx) => {
    await pretendiProgramma(tx, orgId, programId);
    // L'ordine viene dal massimo, e non dal conteggio: cancellando un partner il
    // conteggio riuserebbe una posizione, e due partner finirebbero appaiati.
    const [{ prossimo }] = await tx
      .select({ prossimo: sql<number>`coalesce(max(${chainPartner.ordine}), -1) + 1` })
      .from(chainPartner)
      .where(and(eq(chainPartner.programId, programId), eq(chainPartner.organizationId, orgId)));

    await tx.insert(chainPartner).values({
      id,
      organizationId: orgId,
      programId,
      nome: v.nome,
      paese: v.paese ?? null,
      livello: v.livello ?? null,
      ordine: prossimo,
    });
    await logAudit(tx, {
      organizationId: orgId,
      userId,
      azione: "filiera.partner.create",
      entita: "chain_partner",
      entitaId: id,
    });
  });
  return id;
}

export async function setCampoPartner(
  userId: string,
  orgId: string,
  partnerId: string,
  input: z.input<typeof campoPartnerSchema>,
): Promise<void> {
  await requireEntitlement(userId, orgId, "write_data");
  const v = campoPartnerSchema.parse(input);

  await withTenant({ userId, orgId }, async (tx) => {
    const agg = await tx
      .update(chainPartner)
      // I due campi NUMERIC vogliono la stringa: Drizzle non converte, e passare un
      // numero a `numeric` lo farebbe transitare per il float.
      .set({
        [v.campo]:
          v.campo === "spesa" || v.campo === "quotaFatturato"
            ? v.valore === null
              ? null
              : String(v.valore)
            : v.valore,
        updatedAt: new Date(),
      })
      .where(and(eq(chainPartner.id, partnerId), eq(chainPartner.organizationId, orgId)))
      .returning({ id: chainPartner.id });
    if (!agg.length) throw new Error("Partner inesistente o di un altro tenant");

    await logAudit(tx, {
      organizationId: orgId,
      userId,
      azione: "filiera.partner.set",
      entita: "chain_partner",
      entitaId: partnerId,
      dettagli: { campo: v.campo },
    });
  });
}

export async function eliminaPartner(userId: string, orgId: string, partnerId: string): Promise<void> {
  await requireEntitlement(userId, orgId, "write_data");
  await withTenant({ userId, orgId }, async (tx) => {
    const via = await tx
      .delete(chainPartner)
      .where(and(eq(chainPartner.id, partnerId), eq(chainPartner.organizationId, orgId)))
      .returning({ id: chainPartner.id });
    if (!via.length) throw new Error("Partner inesistente o di un altro tenant");

    await logAudit(tx, {
      organizationId: orgId,
      userId,
      azione: "filiera.partner.delete",
      entita: "chain_partner",
      entitaId: partnerId,
    });
  });
}

/**
 * Un punteggio del partner: una dimensione del rischio inerente o un'area di maturità.
 *
 * ⚠️ `null` CANCELLA la riga, e non la mette a zero. «Non valutata» e «valutata 1» sono
 * due cose diverse per il motore — la media si fa sulle sole compilate — e conservare uno
 * zero le confonderebbe proprio dove il modello è più delicato.
 */
export async function setPunteggio(
  userId: string,
  orgId: string,
  partnerId: string,
  input: z.input<typeof punteggioSchema>,
): Promise<void> {
  await requireEntitlement(userId, orgId, "write_data");
  const v = punteggioSchema.parse(input);

  await withTenant({ userId, orgId }, async (tx) => {
    await pretendiPartner(tx, orgId, partnerId);

    if (v.valore === null) {
      await tx
        .delete(chainPartnerScore)
        .where(
          and(
            eq(chainPartnerScore.partnerId, partnerId),
            eq(chainPartnerScore.organizationId, orgId),
            eq(chainPartnerScore.genere, v.genere),
            eq(chainPartnerScore.chiave, v.chiave),
          ),
        );
    } else {
      await tx
        .insert(chainPartnerScore)
        .values({
          id: randomUUID(),
          organizationId: orgId,
          partnerId,
          genere: v.genere,
          chiave: v.chiave,
          valore: v.valore,
        })
        .onConflictDoUpdate({
          target: [chainPartnerScore.partnerId, chainPartnerScore.genere, chainPartnerScore.chiave],
          set: { valore: v.valore, updatedAt: new Date() },
        });
    }

    await logAudit(tx, {
      organizationId: orgId,
      userId,
      azione: "filiera.punteggio.set",
      entita: "chain_partner_score",
      entitaId: `${partnerId}:${v.genere}:${v.chiave}`,
      dettagli: { genere: v.genere, chiave: v.chiave },
    });
  });
}

/**
 * Accende o spegne un fattore aggravante.
 *
 * ⚠️ `array_append` / `array_remove` in una sola istruzione: il client non manda mai
 * l'elenco completo, quindi due comandi in rapida successione non si cancellano a
 * vicenda. È lo stesso motivo per cui le motivazioni della SoA sono un `text[]`.
 */
export async function setFlag(
  userId: string,
  orgId: string,
  partnerId: string,
  input: z.input<typeof flagSchema>,
): Promise<void> {
  await requireEntitlement(userId, orgId, "write_data");
  const v = flagSchema.parse(input);

  await withTenant({ userId, orgId }, async (tx) => {
    const agg = await tx
      .update(chainPartner)
      .set({
        flag: v.acceso
          ? sql`(select array(select distinct unnest(array_append(${chainPartner.flag}, ${v.chiave}::text))))`
          : sql`array_remove(${chainPartner.flag}, ${v.chiave}::text)`,
        updatedAt: new Date(),
      })
      .where(and(eq(chainPartner.id, partnerId), eq(chainPartner.organizationId, orgId)))
      .returning({ id: chainPartner.id });
    if (!agg.length) throw new Error("Partner inesistente o di un altro tenant");

    await logAudit(tx, {
      organizationId: orgId,
      userId,
      azione: "filiera.flag.set",
      entita: "chain_partner",
      entitaId: partnerId,
      dettagli: { chiave: v.chiave, acceso: v.acceso },
    });
  });
}

/** Il confine di tenant per le righe che non portano ancora un `organization_id`. */
async function pretendiProgramma(tx: Tx, orgId: string, programId: string) {
  const [row] = await tx
    .select({ id: chainProgram.id, contentSetId: chainProgram.contentSetId })
    .from(chainProgram)
    .where(and(eq(chainProgram.id, programId), eq(chainProgram.organizationId, orgId)));
  if (!row) throw new Error("Programma inesistente o di un altro tenant");
  return row;
}

async function pretendiPartner(tx: Tx, orgId: string, partnerId: string) {
  const [row] = await tx
    .select({ id: chainPartner.id, programId: chainPartner.programId })
    .from(chainPartner)
    .where(and(eq(chainPartner.id, partnerId), eq(chainPartner.organizationId, orgId)));
  if (!row) throw new Error("Partner inesistente o di un altro tenant");
  return row;
}
