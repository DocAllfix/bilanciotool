import { withTenant } from "@/lib/db/tenant";
import { reportProject, topicManagement } from "@/lib/db/schema";
import { logAudit } from "@/lib/audit";
import { requireEntitlement } from "@/features/entitlement";
import { eq } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { gestioneTemaSchema } from "./validation";
import { getMateriality } from "./materiality";
import { z } from "zod";

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

/** I campi che il consulente puo' scrivere. Dominio CHIUSO, e non e' pignoleria. */
const CAMPI = ["politica", "azioni", "target", "annoBase", "annoTarget", "responsabile"] as const;
export type CampoGestione = (typeof CAMPI)[number];

/**
 * Scrive UN campo, e solo quello.
 *
 * ⚠️ QUARTA OCCORRENZA della regola piu' costosa di questo progetto: «mai rimandare la
 * riga intera da props». `setTopicManagement` scrive tutti e sei i campi con quello che
 * riceve, e il client gliela mandava tutta — letta dalle proprie props. Chi scriveva la
 * politica e subito dopo le azioni, prima che il rinfresco fosse atterrato, si vedeva
 * cancellare la politica appena scritta: le props portavano ancora il vuoto di prima.
 *
 * Era gia' successo con la quantita' dell'energetico, con l'impatto della materialita' e
 * con il contatto di riferimento. Qui il valore precedente non si rilegge nemmeno: non
 * serve, perche' `set` tocca una colonna sola e il resto della riga il database non lo
 * guarda. E' la forma di `setTopicScoreField`, scritta per lo stesso motivo nella Fase 7.
 *
 * ⚠️ Il nome del campo finisce dentro `set({ [campo]: … })`. Senza un dominio chiuso
 * sarebbe il client a scegliere quale colonna scrivere — `organizationId` compresa.
 */
export async function setTopicManagementField(
  userId: string,
  orgId: string,
  projectId: string,
  input: { topicKey: string; campo: CampoGestione; valore: string },
): Promise<void> {
  await requireEntitlement(userId, orgId, "write_data");
  const topicKey = z.string().regex(/^T\d{2}$/).parse(input.topicKey);
  const campo = z.enum(CAMPI).parse(input.campo);
  const valore = z.string().max(4000).parse(input.valore).trim() || null;

  const { esito } = await getMateriality(userId, orgId, projectId);
  if (!esito.materialKeys.includes(topicKey)) {
    throw new Error(
      `Il tema ${topicKey} non è materiale per questo progetto: completa prima la valutazione al passo 2`,
    );
  }

  await withTenant({ userId, orgId }, async (tx) => {
    const [p] = await tx.select({ id: reportProject.id }).from(reportProject).where(eq(reportProject.id, projectId));
    if (!p) throw new Error("Progetto inesistente o di un altro tenant");
    await tx
      .insert(topicManagement)
      .values({ id: randomUUID(), organizationId: orgId, projectId, topicKey, [campo]: valore })
      .onConflictDoUpdate({
        target: [topicManagement.projectId, topicManagement.topicKey],
        set: { [campo]: valore }, // SOLO il campo toccato: gli altri cinque restano nel DB
      });
    await logAudit(tx, {
      organizationId: orgId,
      userId,
      azione: "report.gestione.set",
      entita: "topic_management",
      entitaId: `${projectId}:${topicKey}`,
      dettagli: { campo },
    });
  });
}

export async function listTopicManagement(userId: string, orgId: string, projectId: string) {
  return withTenant({ userId, orgId }, (tx) =>
    tx.select().from(topicManagement).where(eq(topicManagement.projectId, projectId)),
  );
}
