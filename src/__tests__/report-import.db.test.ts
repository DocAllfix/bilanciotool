import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { randomUUID } from "node:crypto";
import { db } from "@/lib/db";
import { user, organization, member, orgEntitlement, company, auditLog, reportProject, kpiValue } from "@/lib/db/schema";
import { importBilancioFromJson } from "@/features/report/import";
import { getKpiWithDerived } from "@/features/report/kpi";
import { getMateriality } from "@/features/report/materiality";
import { listChapters } from "@/features/report/chapters";
import { isStorageConfigured, signedUrl, deleteObject } from "@/lib/storage";
import { eq, inArray } from "drizzle-orm";

// Import dal prototipo Bilancio: atomicità, fedeltà dei derivati, immagini su
// Storage con URL firmati (mai dataURL in colonna).
const url = process.env.DATABASE_URL;

const RUN = Date.now();
const orgId = `org-bimp-${RUN}`;
const userId = `user-bimp-${RUN}`;
let companyId = "";

// PNG 1×1 valido (test upload reale su Storage).
const PNG_1X1 =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";

const EXPORT_BILANCIO = {
  id: "OB1",
  nome: "Cartiera del Sele S.p.A.",
  anno: 2025,
  profilo: {
    forma: "S.p.A.", sede: "Salerno", settore: "Carta e cartone", ateco: "17.12",
    standard: "GRI 2021 — opzione con riferimento", perimetro: "Tutte le sedi operative",
    logo: PNG_1X1,
  },
  fattori: { gas: 1.9755, ele_loc: 0.2565 },
  dati: {
    "2025": { en_ele: "100000", en_ele_go: "40000", hr_tot: "50", hr_don: "18", si_ore: "80000", si_inf: "2" },
    "2024": { en_ele: "90000", hr_tot: "48" },
  },
  materialita: { T01: { imp: "4", fin: "3" }, T07: { imp: "4", fin: "4" }, T03: { imp: "2", fin: "1" } },
  soglia: 3,
  gestione: { T01: { politica: "Politica energia", azioni: "Fotovoltaico" } },
  narrativa: {
    lettera: { testo: "Prima riga della lettera.\n\nSeconda parte del discorso.", media: [{ t: "ch", ch: "emissioni", cap: "Andamento", w: "full" }] },
    identita: { testo: "Storia dell'azienda dal 1954.", media: [{ t: "img", src: PNG_1X1, cap: "Lo stabilimento", cred: "Archivio", w: "half" }] },
  },
  created: "2025-01-01T00:00:00.000Z",
};

describe.skipIf(!url)("import Bilancio dal prototipo", () => {
  const daPulire: string[] = [];

  beforeAll(async () => {
    await db.insert(user).values({ id: userId, name: "Importatore B", email: `bimp-${RUN}@example.com` });
    await db.insert(organization).values({ id: orgId, name: "Studio B-Import", slug: `bimp-${RUN}` });
    await db.insert(member).values({ id: randomUUID(), organizationId: orgId, userId, role: "owner" });
    await db.insert(orgEntitlement).values({ organizationId: orgId, status: "active" });
    companyId = randomUUID();
    await db.insert(company).values({ id: companyId, organizationId: orgId, nome: "Cartiera del Sele S.p.A." });
  });

  afterAll(async () => {
    for (const k of daPulire) await deleteObject(orgId, k).catch(() => {});
    await db.delete(auditLog).where(eq(auditLog.organizationId, orgId));
    await db.delete(company).where(eq(company.organizationId, orgId));
    await db.delete(orgEntitlement).where(eq(orgEntitlement.organizationId, orgId));
    await db.delete(member).where(eq(member.organizationId, orgId));
    await db.delete(organization).where(eq(organization.id, orgId));
    await db.delete(user).where(inArray(user.id, [userId]));
  });

  it("importa progetto, KPI biennali, materialità, gestione, capitoli e immagini", async () => {
    const esito = await importBilancioFromJson(userId, orgId, companyId, EXPORT_BILANCIO);
    expect(esito.anno).toBe(2025);
    expect(esito.kpiScritti).toBe(8); // 6 del 2025 + 2 del 2024
    expect(esito.temiValutati).toBe(3);
    expect(esito.capitoli).toBe(2);

    const k = await getKpiWithDerived(userId, orgId, companyId, 2025);
    expect(k.derivati.scope2Loc.toString()).toBe("25.65");
    expect(k.derivati.indiceFrequenza.toString()).toBe("25");
    expect(k.derivatiPrecedente.scope2Loc.toString()).toBe("23.085");

    const [proj] = await db.select().from(reportProject).where(eq(reportProject.companyId, companyId));
    const m = await getMateriality(userId, orgId, proj.id);
    expect(m.esito.materialKeys.sort()).toEqual(["T01", "T07"]);

    const capitoli = await listChapters(userId, orgId, proj.id);
    const lettera = capitoli.find((c) => c.templateKey === "lettera")!;
    expect(JSON.stringify(lettera.contenuto)).toContain("Prima riga della lettera.");
    expect(lettera.media[0]).toMatchObject({ tipo: "chart", chartKey: "emissioni" });

    const identita = capitoli.find((c) => c.templateKey === "identita")!;
    if (isStorageConfigured()) {
      expect(esito.immagini).toBe(1);
      const img = identita.media.find((x) => x.tipo === "img")!;
      expect(img.storageKey).toMatch(new RegExp(`^${orgId}/`)); // perimetro tenant
      daPulire.push(img.storageKey!);
      const [co] = await db.select().from(company).where(eq(company.id, companyId));
      expect(co.logoStorageKey).toMatch(new RegExp(`^${orgId}/`));
      daPulire.push(co.logoStorageKey!);
      // l'URL firmato risponde davvero con l'immagine
      const urlFirmato = await signedUrl(orgId, img.storageKey!, 60);
      const res = await fetch(urlFirmato);
      expect(res.ok).toBe(true);
      expect(res.headers.get("content-type")).toContain("image/png");
    }
  });

  it("import corrotto: transazione annullata, zero progetti scritti", async () => {
    const fresh = randomUUID();
    await db.insert(company).values({ id: fresh, organizationId: orgId, nome: "Pulita B" });
    // il campo anno impossibile fa fallire zod DENTRO parseBilancioExport
    await expect(importBilancioFromJson(userId, orgId, fresh, { ...EXPORT_BILANCIO, anno: "non-un-anno" })).rejects.toThrow();
    const proj = await db.select().from(reportProject).where(eq(reportProject.companyId, fresh));
    const kpi = await db.select().from(kpiValue).where(eq(kpiValue.companyId, fresh));
    expect(proj).toHaveLength(0);
    expect(kpi).toHaveLength(0);
  });

  it("archivio multi-azienda su singola azienda: rifiutato", async () => {
    await expect(
      importBilancioFromJson(userId, orgId, companyId, { aziende: [EXPORT_BILANCIO, { ...EXPORT_BILANCIO, id: "OB2" }] }),
    ).rejects.toThrow(/singola azienda/i);
  });
});
