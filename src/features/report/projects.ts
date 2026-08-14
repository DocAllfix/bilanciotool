import { withTenant } from "@/lib/db/tenant";
import { company, reportProject } from "@/lib/db/schema";
import { logAudit } from "@/lib/audit";
import { requireEntitlement } from "@/features/entitlement";
import { latestContentSetId } from "@/features/ghg/inventories";
import { deleteObject, parseDataUrl, uploadObject, immagineValida } from "@/lib/storage";
import { and, desc, eq } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { progettoSchema, profiloSchema, sogliaSchema } from "./validation";
import { toFixedStr, nz } from "@/lib/calc/shared/decimal";
import type { z } from "zod";

// Progetti di bilancio: uno per azienda+anno, content_set congelato alla creazione.

export async function createReportProject(userId: string, orgId: string, input: z.input<typeof progettoSchema>): Promise<string> {
  await requireEntitlement(userId, orgId, "write_data");
  const v = progettoSchema.parse(input);
  const setId = await latestContentSetId("report");
  const id = randomUUID();
  await withTenant({ userId, orgId }, async (tx) => {
    const [co] = await tx.select({ id: company.id }).from(company).where(eq(company.id, v.companyId));
    if (!co) throw new Error("Azienda inesistente o di un altro tenant");
    await tx.insert(reportProject).values({
      id,
      organizationId: orgId,
      companyId: v.companyId,
      anno: v.anno,
      contentSetId: setId,
      ...(v.standard ? { standard: v.standard } : {}),
    });
    await logAudit(tx, { organizationId: orgId, userId, azione: "report.project.create", entita: "report_project", entitaId: id });
  });
  return id;
}

export async function updateProfilo(userId: string, orgId: string, projectId: string, patch: z.input<typeof profiloSchema>): Promise<void> {
  await requireEntitlement(userId, orgId, "write_data");
  const v = profiloSchema.parse(patch);
  await withTenant({ userId, orgId }, async (tx) => {
    const [p] = await tx.select({ profilo: reportProject.profilo }).from(reportProject).where(eq(reportProject.id, projectId));
    if (!p) throw new Error("Progetto inesistente o di un altro tenant");
    await tx
      .update(reportProject)
      .set({ profilo: { ...(p.profilo as Record<string, string>), ...v } })
      .where(eq(reportProject.id, projectId));
    await logAudit(tx, { organizationId: orgId, userId, azione: "report.profilo.update", entita: "report_project", entitaId: projectId });
  });
}

export async function updateStandardEPerimetro(
  userId: string,
  orgId: string,
  projectId: string,
  patch: { standard?: string; perimetro?: string },
): Promise<void> {
  await requireEntitlement(userId, orgId, "write_data");
  await withTenant({ userId, orgId }, async (tx) => {
    const updated = await tx
      .update(reportProject)
      .set(patch)
      .where(eq(reportProject.id, projectId))
      .returning({ id: reportProject.id });
    if (!updated.length) throw new Error("Progetto inesistente o di un altro tenant");
    await logAudit(tx, { organizationId: orgId, userId, azione: "report.impostazioni.update", entita: "report_project", entitaId: projectId });
  });
}

export async function setSoglia(userId: string, orgId: string, projectId: string, soglia: number): Promise<void> {
  await requireEntitlement(userId, orgId, "write_data");
  const v = sogliaSchema.parse(soglia);
  await withTenant({ userId, orgId }, async (tx) => {
    const updated = await tx
      .update(reportProject)
      .set({ sogliaMaterialita: toFixedStr(nz(v)) })
      .where(eq(reportProject.id, projectId))
      .returning({ id: reportProject.id });
    if (!updated.length) throw new Error("Progetto inesistente o di un altro tenant");
    await logAudit(tx, { organizationId: orgId, userId, azione: "report.soglia.set", entita: "report_project", entitaId: projectId, dettagli: { soglia: v } });
  });
}

// Logo e copertina dell'azienda: file su Storage (mai dataURL in colonna).
export async function setCompanyImage(
  userId: string,
  orgId: string,
  companyId: string,
  tipo: "logo" | "cover",
  dataUrl: string | null,
): Promise<void> {
  await requireEntitlement(userId, orgId, "write_data");
  const colonna = tipo === "logo" ? "logoStorageKey" : "coverStorageKey";
  await withTenant({ userId, orgId }, async (tx) => {
    const [co] = await tx.select().from(company).where(eq(company.id, companyId));
    if (!co) throw new Error("Azienda inesistente o di un altro tenant");
    const attuale = tipo === "logo" ? co.logoStorageKey : co.coverStorageKey;

    if (dataUrl === null) {
      if (attuale) await deleteObject(orgId, attuale);
      await tx.update(company).set({ [colonna]: null }).where(eq(company.id, companyId));
    } else {
      const parsed = parseDataUrl(dataUrl);
      if (!parsed) throw new Error("Immagine non valida: atteso un dataURL base64");
      // I primi byte, non il tipo dichiarato dal client: un SVG contiene `<script>`.
      const immagine = immagineValida(parsed.buffer, parsed.contentType);
      if (!immagine) throw new Error("Serve un'immagine PNG, JPEG, WebP o GIF");
      if (parsed.buffer.length > 3_000_000) throw new Error("Immagine oltre 3 MB: ridimensionala");
      const ext = immagine.ext;
      const key = `${orgId}/companies/${companyId}/${tipo}-${Date.now()}.${ext}`;
      await uploadObject(orgId, key, parsed.buffer, immagine.contentType);
      if (attuale) await deleteObject(orgId, attuale);
      await tx.update(company).set({ [colonna]: key }).where(eq(company.id, companyId));
    }
    await logAudit(tx, { organizationId: orgId, userId, azione: `company.${tipo}.set`, entita: "company", entitaId: companyId });
  });
}

export async function getReportProject(userId: string, orgId: string, companyId: string, anno: number) {
  return withTenant({ userId, orgId }, async (tx) => {
    const rows = await tx
      .select()
      .from(reportProject)
      .where(and(eq(reportProject.companyId, companyId), eq(reportProject.anno, anno)));
    return rows[0] ?? null;
  });
}

export async function listReportProjects(userId: string, orgId: string, companyId: string) {
  return withTenant({ userId, orgId }, (tx) =>
    tx
      .select({ id: reportProject.id, anno: reportProject.anno, standard: reportProject.standard })
      .from(reportProject)
      .where(eq(reportProject.companyId, companyId))
      .orderBy(desc(reportProject.anno)),
  );
}
