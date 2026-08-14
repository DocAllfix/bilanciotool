import { withTenant } from "@/lib/db/tenant";
import { mediaAsset, narrativeSection, reportProject } from "@/lib/db/schema";
import { logAudit } from "@/lib/audit";
import { requireEntitlement } from "@/features/entitlement";
import { assertSegmentoChiave, deleteObject, immagineValida, parseDataUrl, uploadObject } from "@/lib/storage";
import { and, asc, eq } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { mediaSchema, sanificaTiptap } from "./validation";
import type { z } from "zod";

// Capitoli narrativi (passo 5). Il contenuto Tiptap si sanifica QUI: quello che
// entra nel DB è già la whitelist che il documento renderizzerà.

async function ensureSection(
  tx: Parameters<Parameters<typeof withTenant>[1]>[0],
  orgId: string,
  projectId: string,
  templateKey: string,
): Promise<string> {
  const [esiste] = await tx
    .select({ id: narrativeSection.id })
    .from(narrativeSection)
    .where(and(eq(narrativeSection.projectId, projectId), eq(narrativeSection.templateKey, templateKey)));
  if (esiste) return esiste.id;
  const id = randomUUID();
  await tx.insert(narrativeSection).values({ id, organizationId: orgId, projectId, templateKey });
  return id;
}

export async function saveChapter(
  userId: string,
  orgId: string,
  projectId: string,
  templateKey: string,
  contenuto: unknown,
): Promise<void> {
  await requireEntitlement(userId, orgId, "write_data");
  // `templateKey` e `projectId` finiscono DENTRO la chiave d'archivio, e arrivano dal
  // client: una server action e' un endpoint HTTP, il tipo `string` non esiste a runtime.
  // Si respingono qui, prima che entrino nella stringa.
  assertSegmentoChiave(templateKey, "Capitolo");
  assertSegmentoChiave(projectId, "Progetto");
  const pulito = sanificaTiptap(contenuto);
  await withTenant({ userId, orgId }, async (tx) => {
    const [p] = await tx.select({ id: reportProject.id }).from(reportProject).where(eq(reportProject.id, projectId));
    if (!p) throw new Error("Progetto inesistente o di un altro tenant");
    const sectionId = await ensureSection(tx, orgId, projectId, templateKey);
    await tx.update(narrativeSection).set({ contenuto: pulito }).where(eq(narrativeSection.id, sectionId));
    await logAudit(tx, { organizationId: orgId, userId, azione: "report.capitolo.save", entita: "narrative_section", entitaId: sectionId });
  });
}

export async function addMedia(
  userId: string,
  orgId: string,
  projectId: string,
  templateKey: string,
  input: z.input<typeof mediaSchema> & { dataUrl?: string },
): Promise<string> {
  await requireEntitlement(userId, orgId, "write_data");
  // `templateKey` e `projectId` finiscono DENTRO la chiave d'archivio, e arrivano dal
  // client: una server action e' un endpoint HTTP, il tipo `string` non esiste a runtime.
  // Si respingono qui, prima che entrino nella stringa.
  assertSegmentoChiave(templateKey, "Capitolo");
  assertSegmentoChiave(projectId, "Progetto");
  const v = mediaSchema.parse(input);
  if (v.tipo === "chart" && !v.chartKey) throw new Error("Indica quale diagramma inserire");

  let storageKey: string | null = null;
  if (v.tipo === "img") {
    const parsed = input.dataUrl ? parseDataUrl(input.dataUrl) : null;
    if (!parsed) throw new Error("Fotografia non valida: atteso un dataURL base64");
    // Il tipo lo dichiara il client: si guardano i PRIMI BYTE. `image/svg+xml` passava
    // il vecchio `startsWith("image/")`, e un SVG contiene `<script>`.
    const immagine = immagineValida(parsed.buffer, parsed.contentType);
    if (!immagine) throw new Error("Serve un'immagine PNG, JPEG, WebP o GIF");
    if (parsed.buffer.length > 5_000_000) throw new Error("Immagine oltre 5 MB: ridimensionala");
    const ext = immagine.ext;
    storageKey = `${orgId}/reports/${projectId}/${templateKey}-${Date.now()}.${ext}`;
    // Si archivia col tipo VERIFICATO, non con quello dichiarato: e' l'header che
    // l'archivio restituira' al browser.
    await uploadObject(orgId, storageKey, parsed.buffer, immagine.contentType);
  }

  const id = randomUUID();
  try {
    await withTenant({ userId, orgId }, async (tx) => {
      const [p] = await tx.select({ id: reportProject.id }).from(reportProject).where(eq(reportProject.id, projectId));
      if (!p) throw new Error("Progetto inesistente o di un altro tenant");
      const sectionId = await ensureSection(tx, orgId, projectId, templateKey);
      const esistenti = await tx
        .select({ posizione: mediaAsset.posizione })
        .from(mediaAsset)
        .where(eq(mediaAsset.sectionId, sectionId));
      await tx.insert(mediaAsset).values({
        id,
        organizationId: orgId,
        sectionId,
        tipo: v.tipo,
        storageKey,
        chartKey: v.tipo === "chart" ? v.chartKey : null,
        didascalia: v.didascalia || null,
        credito: v.credito || null,
        larghezza: v.larghezza,
        posizione: esistenti.length,
      });
      await logAudit(tx, { organizationId: orgId, userId, azione: "report.media.add", entita: "media_asset", entitaId: id });
    });
  } catch (e) {
    // La transazione è fallita DOPO l'upload: niente file orfani.
    if (storageKey) await deleteObject(orgId, storageKey).catch(() => {});
    throw e;
  }
  return id;
}

export async function removeMedia(userId: string, orgId: string, mediaId: string): Promise<void> {
  await requireEntitlement(userId, orgId, "write_data");
  await withTenant({ userId, orgId }, async (tx) => {
    const [m] = await tx.select().from(mediaAsset).where(eq(mediaAsset.id, mediaId));
    if (!m) throw new Error("Elemento inesistente o di un altro tenant");
    await tx.delete(mediaAsset).where(eq(mediaAsset.id, mediaId));
    if (m.storageKey) await deleteObject(orgId, m.storageKey);
    await logAudit(tx, { organizationId: orgId, userId, azione: "report.media.remove", entita: "media_asset", entitaId: mediaId });
  });
}

export async function updateMedia(
  userId: string,
  orgId: string,
  mediaId: string,
  patch: { didascalia?: string; credito?: string; larghezza?: "full" | "half"; posizione?: number },
): Promise<void> {
  await requireEntitlement(userId, orgId, "write_data");
  await withTenant({ userId, orgId }, async (tx) => {
    const updated = await tx
      .update(mediaAsset)
      .set({
        ...(patch.didascalia !== undefined ? { didascalia: patch.didascalia || null } : {}),
        ...(patch.credito !== undefined ? { credito: patch.credito || null } : {}),
        ...(patch.larghezza !== undefined ? { larghezza: patch.larghezza } : {}),
        ...(patch.posizione !== undefined ? { posizione: patch.posizione } : {}),
      })
      .where(eq(mediaAsset.id, mediaId))
      .returning({ id: mediaAsset.id });
    if (!updated.length) throw new Error("Elemento inesistente o di un altro tenant");
  });
}

export async function listChapters(userId: string, orgId: string, projectId: string) {
  return withTenant({ userId, orgId }, async (tx) => {
    const sezioni = await tx.select().from(narrativeSection).where(eq(narrativeSection.projectId, projectId));
    const media = sezioni.length
      ? await tx
          .select()
          .from(mediaAsset)
          .where(eq(mediaAsset.organizationId, orgId))
          .orderBy(asc(mediaAsset.posizione))
      : [];
    return sezioni.map((s) => ({
      ...s,
      media: media.filter((m) => m.sectionId === s.id),
    }));
  });
}
