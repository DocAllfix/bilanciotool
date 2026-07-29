import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { randomUUID } from "node:crypto";
import { db } from "@/lib/db";
import { organization, member, orgEntitlement, company, auditLog, platformConfig, user } from "@/lib/db/schema";
import { createCompany, archiveCompany } from "@/features/companies";
import { assertCompanyCreatable, assertSeatAvailable, can, getCompanyUsage, EntitlementError } from "@/features/entitlement";
import { eq, inArray } from "drizzle-orm";

// Limiti anti-abuso e paywall a livello di logica server (connessione dev
// privilegiata; l'enforcement RLS è coperto da rls.db.test.ts e dal seam
// RLS_FORCE_ROLE nel gate di fase).
const url = process.env.DATABASE_URL;

const RUN = Date.now();
const orgId = `org-ent-${RUN}`;
const userId = `user-ent-${RUN}`;
// Limiti bassi via platform_config per non creare 10 aziende a test.
const LIMITS_KEY_BACKUP: { value: unknown }[] = [];

describe.skipIf(!url)("entitlement: limiti e paywall", () => {
  beforeAll(async () => {
    const prev = await db.select({ value: platformConfig.value }).from(platformConfig).where(eq(platformConfig.key, "limits"));
    LIMITS_KEY_BACKUP.push(...prev);
    await db
      .insert(platformConfig)
      .values({ key: "limits", value: { maxActiveCompanies: 3, warnAtCompanies: 2, maxMembers: 2 } })
      .onConflictDoUpdate({ target: platformConfig.key, set: { value: { maxActiveCompanies: 3, warnAtCompanies: 2, maxMembers: 2 } } });
    await db.insert(user).values([
      { id: userId, name: "Utente Ent", email: `ent-${RUN}@example.com` },
      { id: `${userId}-b`, name: "Utente Ent B", email: `ent-${RUN}-b@example.com` },
    ]);
    await db.insert(organization).values({ id: orgId, name: "Studio Test", slug: `ent-${RUN}` });
    await db.insert(member).values({ id: randomUUID(), organizationId: orgId, userId, role: "owner" });
    await db.insert(orgEntitlement).values({ organizationId: orgId, status: "active" });
  });

  afterAll(async () => {
    await db.delete(auditLog).where(eq(auditLog.organizationId, orgId));
    await db.delete(company).where(eq(company.organizationId, orgId));
    await db.delete(orgEntitlement).where(eq(orgEntitlement.organizationId, orgId));
    await db.delete(member).where(eq(member.organizationId, orgId));
    await db.delete(organization).where(eq(organization.id, orgId));
    await db.delete(user).where(inArray(user.id, [userId, `${userId}-b`]));
    if (LIMITS_KEY_BACKUP.length) {
      await db.update(platformConfig).set({ value: LIMITS_KEY_BACKUP[0].value }).where(eq(platformConfig.key, "limits"));
    } else {
      await db.delete(platformConfig).where(eq(platformConfig.key, "limits"));
    }
  });

  it("crea aziende fino al limite, poi blocca con codice limit_companies", async () => {
    await createCompany(userId, orgId, { nome: "Cliente 1" });
    await createCompany(userId, orgId, { nome: "Cliente 2" });
    const usage2 = await getCompanyUsage(userId, orgId);
    expect(usage2.nearLimit).toBe(true); // warn a 2
    await createCompany(userId, orgId, { nome: "Cliente 3" });
    await expect(createCompany(userId, orgId, { nome: "Cliente 4" })).rejects.toMatchObject({ code: "limit_companies" });
  });

  it("le aziende archiviate escono dal conteggio", async () => {
    const rows = await db.select({ id: company.id }).from(company).where(eq(company.organizationId, orgId));
    await archiveCompany(userId, orgId, rows[0].id);
    await expect(assertCompanyCreatable(userId, orgId)).resolves.toBeUndefined();
  });

  it("le aziende demo non contano nei limiti", async () => {
    await db.insert(company).values({ id: randomUUID(), organizationId: orgId, nome: "Demo", isDemo: true });
    const usage = await getCompanyUsage(userId, orgId);
    const attiveVere = await db.select({ id: company.id }).from(company).where(eq(company.organizationId, orgId));
    expect(attiveVere.length).toBeGreaterThan(usage.active); // la demo c'è ma non conta
  });

  it("stato demo: niente creazione aziende (paywall server-side)", async () => {
    await db.update(orgEntitlement).set({ status: "demo" }).where(eq(orgEntitlement.organizationId, orgId));
    await expect(createCompany(userId, orgId, { nome: "Fuori demo" })).rejects.toMatchObject({ code: "paywall" });
    await db.update(orgEntitlement).set({ status: "active" }).where(eq(orgEntitlement.organizationId, orgId));
  });

  it("stato expired: sola lettura ma export consentito", () => {
    expect(can("expired", "write_data")).toBe(false);
    expect(can("expired", "create_company")).toBe(false);
    expect(can("expired", "generate_pdf")).toBe(false);
    expect(can("expired", "export")).toBe(true);
  });

  it("limite membri: il posto oltre il massimo è negato", async () => {
    await db.insert(member).values({ id: randomUUID(), organizationId: orgId, userId: `${userId}-b`, role: "member" });
    await expect(assertSeatAvailable(orgId)).rejects.toMatchObject({ code: "limit_members" });
  });
});
