import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { randomUUID } from "node:crypto";
import { serializeSignedCookie } from "better-call";
import { db } from "@/lib/db";
import { orgEntitlement, company, member, invitation, user, session } from "@/lib/db/schema";
import { and, eq, inArray } from "drizzle-orm";
import { archiveCompany, createCompany, restoreCompany } from "@/features/companies";
import { EntitlementError } from "@/features/entitlement";
import { creaStudio, pulisciStudio, type Studio } from "./comune";

// I limiti del piano sotto richieste arrivate INSIEME.
//
// In fila i limiti hanno sempre retto: la seconda azienda su un piano da una veniva
// respinta. È in parallelo che otto creazioni leggevano tutte «zero su una» e nascevano
// otto aziende, e sei accettazioni portavano uno studio da due a otto membri su un tetto
// di tre (audit di sicurezza, ottobre 2026). Un test in sequenza non può vedere questo
// difetto: per questo qui tutto parte con `Promise.all`.

const url = process.env.DATABASE_URL;
const RUN = Date.now();

let S: Studio;
const invitati: string[] = [];

/** La fascia d'ingresso: UNA azienda e TRE accessi. */
async function studioSingola(): Promise<Studio> {
  const s = await creaStudio({ prefisso: "par", run: RUN, nomeStudio: "Studio Paralleli" });
  await db.insert(orgEntitlement).values({
    organizationId: s.orgId,
    status: "active",
    piano: "singola",
    activatedAt: new Date(),
  });
  return s;
}

const attive = async () =>
  (
    await db
      .select({ id: company.id })
      .from(company)
      .where(and(eq(company.organizationId, S.orgId), eq(company.stato, "active")))
  ).length;

describe.skipIf(!url)("limiti del piano: reggono alle richieste parallele", () => {
  beforeAll(async () => {
    S = await studioSingola();
  });

  afterAll(async () => {
    await db.delete(invitation).where(eq(invitation.organizationId, S.orgId));
    if (invitati.length) {
      await db.delete(session).where(inArray(session.userId, invitati));
      await db.delete(member).where(inArray(member.userId, invitati));
      await db.delete(user).where(inArray(user.id, invitati));
    }
    await db.delete(session).where(eq(session.userId, S.userId));
    await pulisciStudio(S.orgId, S.userId);
  });

  it("otto creazioni insieme su un piano da una azienda: ne nasce una sola", async () => {
    const esiti = await Promise.allSettled(
      Array.from({ length: 8 }, (_, i) => createCompany(S.userId, S.orgId, { nome: `Parallela ${i}` })),
    );
    expect(esiti.filter((e) => e.status === "fulfilled")).toHaveLength(1);
    const respinte = esiti.filter((e): e is PromiseRejectedResult => e.status === "rejected");
    expect(respinte).toHaveLength(7);
    for (const r of respinte) {
      expect(r.reason).toBeInstanceOf(EntitlementError);
      expect((r.reason as EntitlementError).code).toBe("limit_companies");
    }
    expect(await attive()).toBe(1);
  });

  it("otto ripristini insieme: ne rientra una sola", async () => {
    // Otto archiviate: l'unica attiva si archivia, poi se ne creano e archiviano altre sette.
    const [prima] = await db.select({ id: company.id }).from(company).where(eq(company.organizationId, S.orgId));
    await archiveCompany(S.userId, S.orgId, prima.id);
    for (let i = 0; i < 7; i++) {
      const id = await createCompany(S.userId, S.orgId, { nome: `Da archiviare ${i}` });
      await archiveCompany(S.userId, S.orgId, id);
    }
    const tutte = await db.select({ id: company.id }).from(company).where(eq(company.organizationId, S.orgId));
    expect(tutte).toHaveLength(8);
    expect(await attive()).toBe(0);

    const esiti = await Promise.allSettled(tutte.map((a) => restoreCompany(S.userId, S.orgId, a.id)));
    expect(esiti.filter((e) => e.status === "fulfilled")).toHaveLength(1);
    expect(await attive()).toBe(1);
  });

  it("in fila il limite risponde come prima: la seconda azienda viene respinta", async () => {
    await expect(createCompany(S.userId, S.orgId, { nome: "Di troppo" })).rejects.toMatchObject({
      code: "limit_companies",
    });
  });

  it("sei inviti accettati insieme con un solo posto libero: ne entra uno, gli altri tornano in attesa", async () => {
    const { auth } = await import("@/lib/auth");
    const ctx = await auth.$context;
    const base = String(auth.options.baseURL).replace(/\/+$/, "");

    // Tre accessi nel piano: il titolare e un collega ci sono già, resta UN posto.
    const collega = `user-par-col-${RUN}`;
    invitati.push(collega);
    await db.insert(user).values({ id: collega, name: "Collega", email: `par-col-${RUN}@example.com`, emailVerified: true });
    await db.insert(member).values({ id: randomUUID(), organizationId: S.orgId, userId: collega, role: "member" });

    const richieste: (() => Promise<Response>)[] = [];
    const idInviti: string[] = [];
    for (let i = 0; i < 6; i++) {
      const uid = `user-par-inv${i}-${RUN}`;
      const email = `par-inv${i}-${RUN}@example.com`;
      invitati.push(uid);
      await db.insert(user).values({ id: uid, name: `Invitato ${i}`, email, emailVerified: true });
      const invitationId = randomUUID();
      idInviti.push(invitationId);
      await db.insert(invitation).values({
        id: invitationId,
        organizationId: S.orgId,
        email,
        role: "member",
        status: "pending",
        expiresAt: new Date(Date.now() + 48 * 3_600_000),
        inviterId: S.userId,
      });
      const sessione = await ctx.internalAdapter.createSession(uid);
      const cookie = (await serializeSignedCookie(ctx.authCookies.sessionToken.name, sessione.token, ctx.secret)).split(";")[0];
      richieste.push(() =>
        auth.handler(
          new Request(`${base}/api/auth/organization/accept-invitation`, {
            method: "POST",
            headers: { cookie, origin: base, "content-type": "application/json" },
            body: JSON.stringify({ invitationId }),
          }),
        ),
      );
    }

    const risposte = await Promise.all(richieste.map((r) => r()));
    const stati = risposte.map((r) => r.status);
    expect(stati.filter((s) => s === 200), `stati: ${stati.join(",")}`).toHaveLength(1);

    const membri = await db.select().from(member).where(eq(member.organizationId, S.orgId));
    expect(membri, "il tetto del piano è tre").toHaveLength(3);

    const inviti = await db.select().from(invitation).where(inArray(invitation.id, idInviti));
    expect(inviti.filter((i) => i.status === "accepted")).toHaveLength(1);
    expect(inviti.filter((i) => i.status === "pending")).toHaveLength(5);
  });
});
