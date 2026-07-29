import { db } from "@/lib/db";
import { withTenant } from "@/lib/db/tenant";
import { organization, member, invitation } from "@/lib/db/schema";
import { orgEntitlement } from "@/lib/db/schema";
import { auditLog } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { randomUUID } from "node:crypto";

// Creazione dell'org-studio al signup. Insert diretti nelle stesse tabelle che il
// plugin organization legge: trasparente in lettura, deterministico in scrittura.
// Gira nell'hook user.create.after (fuori da withTenant): organization/member sono
// passthrough; org_entitlement è tabella tenant → si scrive dentro withTenant con
// l'orgId appena creato, così la policy WITH CHECK passa anche sotto app_rls.

const slugify = (s: string) =>
  s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40);

export async function hasPendingInvitation(email: string): Promise<boolean> {
  const rows = await db
    .select({ id: invitation.id })
    .from(invitation)
    .where(and(eq(invitation.email, email), eq(invitation.status, "pending")))
    .limit(1);
  return rows.length > 0;
}

export async function createStudioOrg(userId: string, userName: string): Promise<string> {
  const orgId = randomUUID();
  const base = slugify(userName) || "studio";
  const slug = `${base}-${orgId.slice(0, 6)}`;
  await db.insert(organization).values({
    id: orgId,
    name: userName ? `Studio ${userName}` : "Nuovo studio",
    slug,
    metadata: JSON.stringify({ tipo: "studio" }),
  });
  await db.insert(member).values({
    id: randomUUID(),
    organizationId: orgId,
    userId,
    role: "owner",
  });
  // Stato entitlement iniziale: demo (il paywall legge da qui).
  await withTenant({ userId, orgId }, async (tx) => {
    await tx.insert(orgEntitlement).values({ organizationId: orgId, status: "demo" });
    await tx.insert(auditLog).values({
      organizationId: orgId,
      userId,
      azione: "org.create",
      entita: "organization",
      entitaId: orgId,
    });
  });
  return orgId;
}

export async function firstMembershipOrgId(userId: string): Promise<string | null> {
  const rows = await db
    .select({ organizationId: member.organizationId })
    .from(member)
    .where(eq(member.userId, userId))
    .limit(1);
  return rows[0]?.organizationId ?? null;
}
