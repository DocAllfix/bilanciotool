import { describe, it, expect, afterAll } from "vitest";
import { randomUUID } from "node:crypto";
import { db } from "@/lib/db";
import { user, organization, invitation, member } from "@/lib/db/schema";
import { hasPendingInvitation } from "@/features/auth/orgs";
import { eq, inArray } from "drizzle-orm";

// Regressione security-review Fase 1: un invito SCADUTO non deve più sopprimere
// la creazione dello studio personale al signup (altrimenti un invito mai
// accettato bloccherebbe a vita quell'indirizzo email).
const url = process.env.DATABASE_URL;

const RUN = Date.now();
const orgId = `org-inv-${RUN}`;
const inviterId = `user-inv-${RUN}`;
const emailValido = `valido-${RUN}@example.com`;
const emailScaduto = `scaduto-${RUN}@example.com`;

describe.skipIf(!url)("inviti: scadenza e creazione studio", () => {
  afterAll(async () => {
    await db.delete(invitation).where(eq(invitation.organizationId, orgId));
    await db.delete(member).where(eq(member.organizationId, orgId));
    await db.delete(organization).where(eq(organization.id, orgId));
    await db.delete(user).where(inArray(user.id, [inviterId]));
  });

  it("solo gli inviti non scaduti sopprimono lo studio personale", async () => {
    await db.insert(user).values({ id: inviterId, name: "Invitante", email: `inviter-${RUN}@example.com` });
    await db.insert(organization).values({ id: orgId, name: "Studio Invitante", slug: `inv-${RUN}` });
    const domani = new Date(Date.now() + 86_400_000);
    const ieri = new Date(Date.now() - 86_400_000);
    await db.insert(invitation).values([
      { id: randomUUID(), organizationId: orgId, email: emailValido, status: "pending", expiresAt: domani, inviterId },
      { id: randomUUID(), organizationId: orgId, email: emailScaduto, status: "pending", expiresAt: ieri, inviterId },
    ]);

    expect(await hasPendingInvitation(emailValido)).toBe(true);
    expect(await hasPendingInvitation(emailScaduto)).toBe(false);
    expect(await hasPendingInvitation(`inesistente-${RUN}@example.com`)).toBe(false);
  });
});
