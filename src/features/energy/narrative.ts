import { randomUUID } from "node:crypto";
import { and, asc, eq } from "drizzle-orm";
import { withTenant } from "@/lib/db/tenant";
import { energyBalance, energyMedia, energyNarrative } from "@/lib/db/schema";
import { logAudit } from "@/lib/audit";
import { requireEntitlement } from "@/features/entitlement";
import { conteggioParole, sanificaTiptap } from "@/features/report/validation";
import { deleteObject, signedUrl } from "@/lib/storage";
import { z } from "zod";

// Capitoli discorsivi del bilancio energetico. La sanificazione Tiptap è la
// stessa già usata dal bilancio di sostenibilità: quello che entra nel database
// è già la whitelist che il documento renderizzerà.

const mediaSchema = z.object({
  tipo: z.enum(["img", "chart"]),
  storageKey: z.string().nullable().optional(),
  chartKey: z.string().nullable().optional(),
  didascalia: z.string().nullable().optional(),
  credito: z.string().nullable().optional(),
  larghezza: z.enum(["piena", "meta"]).default("piena"),
});

export async function listChapters(userId: string, orgId: string, balanceId: string) {
  return withTenant({ userId, orgId }, async (tx) => {
    const capitoli = await tx
      .select()
      .from(energyNarrative)
      .where(eq(energyNarrative.balanceId, balanceId));
    const media = capitoli.length
      ? await tx
          .select()
          .from(energyMedia)
          .where(eq(energyMedia.organizationId, orgId))
          .orderBy(asc(energyMedia.posizione))
      : [];
    const perCapitolo = new Map<string, typeof media>();
    for (const m of media) {
      if (!capitoli.some((c) => c.id === m.narrativeId)) continue;
      const arr = perCapitolo.get(m.narrativeId) ?? [];
      arr.push(m);
      perCapitolo.set(m.narrativeId, arr);
    }
    return capitoli.map((c) => ({ ...c, media: perCapitolo.get(c.id) ?? [] }));
  });
}

export async function saveChapter(
  userId: string,
  orgId: string,
  balanceId: string,
  templateKey: string,
  contenuto: unknown,
): Promise<void> {
  await requireEntitlement(userId, orgId, "write_data");
  const pulito = sanificaTiptap(contenuto);

  await withTenant({ userId, orgId }, async (tx) => {
    const [b] = await tx.select({ id: energyBalance.id }).from(energyBalance).where(eq(energyBalance.id, balanceId));
    if (!b) throw new Error("Bilancio inesistente o di un altro tenant");

    const dove = and(eq(energyNarrative.balanceId, balanceId), eq(energyNarrative.templateKey, templateKey));
    const [esistente] = await tx.select({ id: energyNarrative.id }).from(energyNarrative).where(dove);

    if (esistente) {
      await tx.update(energyNarrative).set({ contenuto: pulito }).where(eq(energyNarrative.id, esistente.id));
    } else {
      await tx.insert(energyNarrative).values({
        id: randomUUID(),
        organizationId: orgId,
        balanceId,
        templateKey,
        contenuto: pulito,
      });
    }

    await logAudit(tx, {
      organizationId: orgId,
      userId,
      azione: "energy.capitolo.save",
      entita: "energy_narrative",
      entitaId: balanceId,
      dettagli: { capitolo: templateKey, parole: conteggioParole(pulito) },
    });
  });
}

export async function addMedia(
  userId: string,
  orgId: string,
  balanceId: string,
  templateKey: string,
  input: z.input<typeof mediaSchema>,
): Promise<string> {
  await requireEntitlement(userId, orgId, "write_data");
  const v = mediaSchema.parse(input);
  // Perimetro di tenant: una chiave che non parte dall'organizzazione non può
  // essere accettata, altrimenti si leggerebbero file di un altro studio.
  if (v.tipo === "img" && (!v.storageKey || !v.storageKey.startsWith(`${orgId}/`))) {
    throw new Error("Chiave di archiviazione fuori dal perimetro dell'organizzazione");
  }

  const id = randomUUID();
  await withTenant({ userId, orgId }, async (tx) => {
    const dove = and(eq(energyNarrative.balanceId, balanceId), eq(energyNarrative.templateKey, templateKey));
    let [capitolo] = await tx.select({ id: energyNarrative.id }).from(energyNarrative).where(dove);
    if (!capitolo) {
      const [b] = await tx.select({ id: energyBalance.id }).from(energyBalance).where(eq(energyBalance.id, balanceId));
      if (!b) throw new Error("Bilancio inesistente o di un altro tenant");
      const nuovoId = randomUUID();
      await tx.insert(energyNarrative).values({
        id: nuovoId,
        organizationId: orgId,
        balanceId,
        templateKey,
        contenuto: { type: "doc", content: [] },
      });
      capitolo = { id: nuovoId };
    }

    const esistenti = await tx
      .select({ posizione: energyMedia.posizione })
      .from(energyMedia)
      .where(eq(energyMedia.narrativeId, capitolo.id));
    const posizione = esistenti.reduce((max, e) => Math.max(max, e.posizione), -1) + 1;

    await tx.insert(energyMedia).values({
      id,
      organizationId: orgId,
      narrativeId: capitolo.id,
      tipo: v.tipo,
      storageKey: v.storageKey ?? null,
      chartKey: v.chartKey ?? null,
      didascalia: v.didascalia ?? null,
      credito: v.credito ?? null,
      larghezza: v.larghezza,
      posizione,
    });

    await logAudit(tx, {
      organizationId: orgId,
      userId,
      azione: "energy.media.add",
      entita: "energy_media",
      entitaId: id,
      dettagli: { capitolo: templateKey, tipo: v.tipo },
    });
  });
  return id;
}

export async function removeMedia(userId: string, orgId: string, mediaId: string): Promise<void> {
  await requireEntitlement(userId, orgId, "write_data");
  const daPulire = await withTenant({ userId, orgId }, async (tx) => {
    const [m] = await tx.select().from(energyMedia).where(eq(energyMedia.id, mediaId));
    if (!m) throw new Error("Elemento inesistente o di un altro tenant");
    await tx.delete(energyMedia).where(eq(energyMedia.id, mediaId));
    await logAudit(tx, {
      organizationId: orgId,
      userId,
      azione: "energy.media.remove",
      entita: "energy_media",
      entitaId: mediaId,
    });
    return m.tipo === "img" ? m.storageKey : null;
  });
  // Il file si rimuove solo dopo che la transazione è andata a buon fine:
  // se fallisse, l'archivio resterebbe coerente con il database.
  if (daPulire) await deleteObject(orgId, daPulire).catch(() => undefined);
}

export async function updateMedia(
  userId: string,
  orgId: string,
  mediaId: string,
  patch: { didascalia?: string | null; credito?: string | null; larghezza?: "piena" | "meta"; posizione?: number },
): Promise<void> {
  await requireEntitlement(userId, orgId, "write_data");
  await withTenant({ userId, orgId }, async (tx) => {
    const agg = await tx
      .update(energyMedia)
      .set(patch)
      .where(eq(energyMedia.id, mediaId))
      .returning({ id: energyMedia.id });
    if (!agg.length) throw new Error("Elemento inesistente o di un altro tenant");
  });
}

/** URL firmati per le fotografie dei capitoli, generati alla lettura: i file non
 *  sono pubblici e un indirizzo copiato smette di funzionare alla scadenza. */
export async function resolveMediaUrls(
  orgId: string,
  media: { id: string; tipo: string; storageKey: string | null }[],
): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  await Promise.all(
    media
      .filter((m) => m.tipo === "img" && m.storageKey)
      .map(async (m) => {
        const url = await signedUrl(orgId, m.storageKey!).catch(() => null);
        if (url) out.set(m.id, url);
      }),
  );
  return out;
}
