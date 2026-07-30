import { withTenant } from "@/lib/db/tenant";
import { company, kpiValue, materialityAssessment, mediaAsset, narrativeSection, reportProject, topicManagement } from "@/lib/db/schema";
import { logAudit } from "@/lib/audit";
import { requireEntitlement } from "@/features/entitlement";
import { parseBilancioExport } from "@/features/import/parser";
import { latestContentSetId } from "@/features/ghg/inventories";
import { deleteObject, isStorageConfigured, parseDataUrl, uploadObject } from "@/lib/storage";
import { eq } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { toFixedStr, nz } from "@/lib/calc/shared/decimal";

// Import di migrazione dal prototipo Bilancio: DB in un'unica transazione.
// Le immagini (dataURL) si caricano su Storage PRIMA della transazione; se la
// transazione fallisce si ripuliscono (niente file orfani). Il testo narrativo
// del prototipo (plain text) diventa paragrafi Tiptap.

export type BilancioImportEsito = {
  companyId: string;
  projectId: string;
  anno: number;
  kpiScritti: number;
  temiValutati: number;
  capitoli: number;
  immagini: number;
};

const testoATiptap = (testo: string) => ({
  type: "doc",
  content: testo
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => ({ type: "paragraph", content: [{ type: "text", text: p }] })),
});

export async function importBilancioFromJson(
  userId: string,
  orgId: string,
  companyId: string,
  json: unknown,
): Promise<BilancioImportEsito> {
  await requireEntitlement(userId, orgId, "write_data");
  const parsed = parseBilancioExport(json);
  if (parsed.aziende.length !== 1) {
    throw new Error("L'import su un'azienda richiede il file di una singola azienda (non l'archivio completo)");
  }
  const a = parsed.aziende[0];
  const setId = await latestContentSetId("report");

  // Upload immagini prima della transazione (con cleanup in caso di rollback).
  const caricate: string[] = [];
  const upload = async (dataUrl: string | null, nome: string): Promise<string | null> => {
    if (!dataUrl || !isStorageConfigured()) return null;
    const p = parseDataUrl(dataUrl);
    if (!p || !p.contentType.startsWith("image/")) return null;
    const ext = p.contentType.split("/")[1]?.replace("jpeg", "jpg") ?? "png";
    const key = `${orgId}/companies/${companyId}/import-${nome}-${Date.now()}.${ext}`;
    await uploadObject(orgId, key, p.buffer, p.contentType);
    caricate.push(key);
    return key;
  };

  try {
    const logoKey = await upload(a.immagini.logoDataUrl, "logo");
    const coverKey = await upload(a.immagini.coverDataUrl, "cover");
    const mediaKeys = new Map<string, string>(); // `${capitolo}:${indice}` → storageKey
    for (const [capitolo, sez] of Object.entries(a.narrativa)) {
      for (const [i, m] of sez.media.entries()) {
        if (m.tipo === "img" && m.dataUrl) {
          const key = await upload(m.dataUrl, `${capitolo}-${i}`);
          if (key) mediaKeys.set(`${capitolo}:${i}`, key);
        }
      }
    }

    const projectId = randomUUID();
    const esito = await withTenant({ userId, orgId }, async (tx) => {
      const [co] = await tx.select({ id: company.id }).from(company).where(eq(company.id, companyId));
      if (!co) throw new Error("Azienda inesistente o di un altro tenant");

      if (logoKey || coverKey) {
        await tx
          .update(company)
          .set({ ...(logoKey ? { logoStorageKey: logoKey } : {}), ...(coverKey ? { coverStorageKey: coverKey } : {}) })
          .where(eq(company.id, companyId));
      }

      await tx.insert(reportProject).values({
        id: projectId,
        organizationId: orgId,
        companyId,
        anno: a.anno,
        contentSetId: setId,
        standard: (a.profilo.standard as typeof reportProject.$inferInsert.standard) || undefined,
        perimetro: a.profilo.perimetro || null,
        profilo: Object.fromEntries(
          Object.entries(a.profilo).filter(([k]) => !["standard", "perimetro"].includes(k)),
        ),
        sogliaMaterialita: toFixedStr(nz(a.soglia || "3")),
      });

      let kpiScritti = 0;
      for (const [annoStr, valori] of Object.entries(a.kpi)) {
        const anno = Number(annoStr);
        for (const [kpiKey, valore] of Object.entries(valori)) {
          await tx.insert(kpiValue).values({
            id: randomUUID(),
            organizationId: orgId,
            companyId,
            anno,
            kpiKey,
            valore,
          });
          kpiScritti += 1;
        }
      }

      let temiValutati = 0;
      for (const [topicKey, m] of Object.entries(a.materialita)) {
        if (m.imp === null && m.fin === null) continue;
        await tx.insert(materialityAssessment).values({
          id: randomUUID(),
          organizationId: orgId,
          projectId,
          topicKey,
          scoreImpact: m.imp === null ? null : Number(m.imp),
          scoreFinancial: m.fin === null ? null : Number(m.fin),
        });
        temiValutati += 1;
      }

      for (const [topicKey, g] of Object.entries(a.gestione)) {
        if (!g.politica && !g.azioni && !g.target) continue;
        await tx.insert(topicManagement).values({
          id: randomUUID(),
          organizationId: orgId,
          projectId,
          topicKey,
          politica: g.politica || null,
          azioni: g.azioni || null,
          target: g.target || null,
          annoBase: g.base || null,
          annoTarget: g.anno || null,
          responsabile: g.resp || null,
        });
      }

      let capitoli = 0;
      let immaginiInserite = 0;
      for (const [templateKey, sez] of Object.entries(a.narrativa)) {
        if (!sez.testo.trim() && sez.media.length === 0) continue;
        const sectionId = randomUUID();
        await tx.insert(narrativeSection).values({
          id: sectionId,
          organizationId: orgId,
          projectId,
          templateKey,
          contenuto: testoATiptap(sez.testo),
        });
        capitoli += 1;
        for (const [i, m] of sez.media.entries()) {
          const storageKey = m.tipo === "img" ? (mediaKeys.get(`${templateKey}:${i}`) ?? null) : null;
          if (m.tipo === "img" && !storageKey) continue; // storage non configurato o immagine invalida
          await tx.insert(mediaAsset).values({
            id: randomUUID(),
            organizationId: orgId,
            sectionId,
            tipo: m.tipo === "img" ? "img" : "chart",
            storageKey,
            chartKey: m.chartKey,
            didascalia: m.didascalia || null,
            credito: m.credito || null,
            larghezza: m.larghezza,
            posizione: i,
          });
          if (m.tipo === "img") immaginiInserite += 1;
        }
      }

      await logAudit(tx, {
        organizationId: orgId,
        userId,
        azione: "report.import",
        entita: "report_project",
        entitaId: projectId,
        dettagli: { anno: a.anno, kpiScritti, temiValutati, capitoli },
      });

      return { companyId, projectId, anno: a.anno, kpiScritti, temiValutati, capitoli, immagini: immaginiInserite };
    });
    return esito;
  } catch (e) {
    for (const key of caricate) await deleteObject(orgId, key).catch(() => {});
    throw e;
  }
}
