import { describe, it, expect, afterAll } from "vitest";
import { db } from "@/lib/db";
import { user, organization, member, orgEntitlement, company, ghgActivityRow, ghgInventory, kpiValue, materialityAssessment, reportProject, auditLog, narrativeSection, topicManagement, ghgSourceSelection, ghgChecklistStatus, ghgTarget } from "@/lib/db/schema";
import { getCompanyUsage } from "@/features/entitlement";
import { eq, inArray } from "drizzle-orm";

// Il signup crea studio demo + azienda dimostrativa COMPILATA: è il funnel.
const url = process.env.DATABASE_URL;

const RUN = Date.now();
const email = `demo-seed-${RUN}@example.com`;
const cleanupUserIds: string[] = [];
const cleanupOrgIds: string[] = [];

describe.skipIf(!url)("azienda demo al signup", () => {
  afterAll(async () => {
    for (const orgId of cleanupOrgIds) {
      await db.delete(auditLog).where(eq(auditLog.organizationId, orgId));
      await db.delete(company).where(eq(company.organizationId, orgId));
      await db.delete(orgEntitlement).where(eq(orgEntitlement.organizationId, orgId));
      await db.delete(member).where(eq(member.organizationId, orgId));
      await db.delete(organization).where(eq(organization.id, orgId));
    }
    if (cleanupUserIds.length) await db.delete(user).where(inArray(user.id, cleanupUserIds));
  });

  it("registrazione → studio demo con Meccanica Adriatica pre-compilata", async () => {
    const { auth } = await import("@/lib/auth");
    const res = await auth.api.signUpEmail({ body: { email, password: `Pw-demo-${RUN}!x`, name: "Prova Demo" } });
    cleanupUserIds.push(res.user.id);
    const [m] = await db.select().from(member).where(eq(member.userId, res.user.id));
    cleanupOrgIds.push(m.organizationId);

    const [ent] = await db.select().from(orgEntitlement).where(eq(orgEntitlement.organizationId, m.organizationId));
    expect(ent.status).toBe("demo");

    const aziende = await db.select().from(company).where(eq(company.organizationId, m.organizationId));
    expect(aziende).toHaveLength(1);
    const demo = aziende[0];
    expect(demo.isDemo).toBe(true);
    expect(demo.nome).toContain("Meccanica Adriatica");

    // Contenuto: 2 inventari (2024+2025) con voci, progetto bilancio con dati
    const inventari = await db.select().from(ghgInventory).where(eq(ghgInventory.companyId, demo.id));
    expect(inventari.map((i) => i.anno).sort()).toEqual([2024, 2025]);
    const righe = await db.select().from(ghgActivityRow).where(eq(ghgActivityRow.organizationId, m.organizationId));
    expect(righe.length).toBe(8); // 5 del 2025 + 3 del 2024
    expect(await db.$count(ghgSourceSelection, eq(ghgSourceSelection.organizationId, m.organizationId))).toBe(7);
    expect(await db.$count(ghgChecklistStatus, eq(ghgChecklistStatus.organizationId, m.organizationId))).toBe(6);
    expect(await db.$count(ghgTarget, eq(ghgTarget.companyId, demo.id))).toBe(1);

    const [proj] = await db.select().from(reportProject).where(eq(reportProject.companyId, demo.id));
    expect(proj.anno).toBe(2025);
    expect(await db.$count(materialityAssessment, eq(materialityAssessment.projectId, proj.id))).toBe(12);
    expect(await db.$count(kpiValue, eq(kpiValue.companyId, demo.id))).toBe(70); // 35 kpi × 2 anni
    expect(await db.$count(topicManagement, eq(topicManagement.projectId, proj.id))).toBe(3);
    expect(await db.$count(narrativeSection, eq(narrativeSection.projectId, proj.id))).toBe(3);

    // La demo NON conta nei limiti del piano
    const usage = await getCompanyUsage(res.user.id, m.organizationId);
    expect(usage.active).toBe(0);
  });
});
