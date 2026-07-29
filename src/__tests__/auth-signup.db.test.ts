import { describe, it, expect, afterAll } from "vitest";
import { db } from "@/lib/db";
import { user, organization, member, orgEntitlement } from "@/lib/db/schema";
import { eq, inArray } from "drizzle-orm";

// Smoke sul flusso di signup reale: verifica che lo schema Drizzle combaci con i
// model better-auth e che l'hook crei studio + entitlement demo.
const url = process.env.DATABASE_URL;

const RUN = Date.now();
const email = `test-signup-${RUN}@example.com`;
const cleanupUserIds: string[] = [];
const cleanupOrgIds: string[] = [];

describe.skipIf(!url)("signup Better Auth", () => {
  afterAll(async () => {
    if (cleanupOrgIds.length) {
      await db.delete(orgEntitlement).where(inArray(orgEntitlement.organizationId, cleanupOrgIds));
      await db.delete(organization).where(inArray(organization.id, cleanupOrgIds));
    }
    if (cleanupUserIds.length) await db.delete(user).where(inArray(user.id, cleanupUserIds));
  });

  it("signUpEmail crea utente, studio in stato demo e membership owner", async () => {
    const { auth } = await import("@/lib/auth");
    const res = await auth.api.signUpEmail({
      body: { email, password: `Pw-molto-sicura-${RUN}!`, name: "Mario Rossi" },
    });
    expect(res.user.email).toBe(email);
    cleanupUserIds.push(res.user.id);

    const memberships = await db.select().from(member).where(eq(member.userId, res.user.id));
    expect(memberships).toHaveLength(1);
    expect(memberships[0].role).toBe("owner");
    cleanupOrgIds.push(memberships[0].organizationId);

    const [org] = await db.select().from(organization).where(eq(organization.id, memberships[0].organizationId));
    expect(org.name).toContain("Mario");

    const [ent] = await db.select().from(orgEntitlement).where(eq(orgEntitlement.organizationId, org.id));
    expect(ent?.status).toBe("demo");
  });
});
