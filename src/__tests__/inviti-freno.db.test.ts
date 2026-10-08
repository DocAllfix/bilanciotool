import { describe, it, expect, afterAll, vi } from "vitest";

// Le email si intercettano: il test conta QUANTE ne partirebbero, non le manda.
const posta = vi.hoisted(() => ({ inviti: [] as string[] }));
vi.mock("@/lib/email", async (originale) => ({
  ...(await originale<typeof import("@/lib/email")>()),
  sendVerificationEmail: vi.fn(async () => ({ sent: true })),
  sendOrgInvitationEmail: vi.fn(async (a: string) => {
    posta.inviti.push(a);
    return { sent: true };
  }),
}));

import { db } from "@/lib/db";
import { user, organization, member, orgEntitlement, invitation, rateLimit, session } from "@/lib/db/schema";
import { eq, inArray, like } from "drizzle-orm";

// Il freno sugli inviti, provato attraverso il VERO gestore di Better Auth: la rotta è
// del plugin e non passa da nessuna nostra server action, quindi un test sulla sola
// funzione proverebbe una funzione e non la rotta.

const url = process.env.DATABASE_URL;
const RUN = Date.now();
const email = `inviti-freno-${RUN}@example.com`;
const password = `Pw-molto-sicura-${RUN}!`;
const utenti: string[] = [];
const studi: string[] = [];

describe.skipIf(!url)("inviti: un destinatario non si può bombardare", () => {
  afterAll(async () => {
    if (studi.length) {
      for (const o of studi) await db.delete(rateLimit).where(like(rateLimit.key, `invit%:${o}%`));
      await db.delete(invitation).where(inArray(invitation.organizationId, studi));
      await db.delete(orgEntitlement).where(inArray(orgEntitlement.organizationId, studi));
      await db.delete(member).where(inArray(member.organizationId, studi));
      await db.delete(organization).where(inArray(organization.id, studi));
    }
    if (utenti.length) {
      await db.delete(session).where(inArray(session.userId, utenti));
      await db.delete(user).where(inArray(user.id, utenti));
    }
  });

  it("lo stesso invito rimandato tre volte: due email, poi il rifiuto; un altro destinatario passa", async () => {
    const { auth } = await import("@/lib/auth");
    const base = String(auth.options.baseURL).replace(/\/+$/, "");

    // Uno studio in PROVA: è il caso dell'audit, un account gratuito appena registrato.
    const iscritto = await auth.api.signUpEmail({ body: { email, password, name: "Titolare Freno" } });
    utenti.push(iscritto.user.id);
    const [m] = await db.select().from(member).where(eq(member.userId, iscritto.user.id));
    studi.push(m.organizationId);
    await db.update(user).set({ emailVerified: true }).where(eq(user.id, iscritto.user.id));

    const accesso = await auth.api.signInEmail({ body: { email, password }, asResponse: true });
    const cookie = accesso.headers
      .getSetCookie()
      .map((c) => c.split(";")[0])
      .join("; ");
    expect(cookie).toContain("session_token");

    const invita = (a: string) =>
      auth.handler(
        new Request(`${base}/api/auth/organization/invite-member`, {
          method: "POST",
          headers: { cookie, origin: base, "content-type": "application/json" },
          body: JSON.stringify({ email: a, role: "member", organizationId: m.organizationId, resend: true }),
        }),
      );

    const vittima = `vittima-${RUN}@example.com`;
    expect((await invita(vittima)).status).toBe(200);
    expect((await invita(vittima)).status).toBe(200);
    const terzo = await invita(vittima);
    expect(terzo.status).toBe(429);
    expect(JSON.stringify(await terzo.json())).toMatch(/aspetta/);
    expect(posta.inviti.filter((a) => a === vittima)).toHaveLength(2);

    // Il freno è per destinatario: un altro collega si invita subito.
    expect((await invita(`collega-${RUN}@example.com`)).status).toBe(200);
  });
});
