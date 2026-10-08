import { describe, it, expect, afterAll } from "vitest";
import { randomUUID } from "node:crypto";
import { db } from "@/lib/db";
import { user, organization, invitation, member, orgEntitlement, session } from "@/lib/db/schema";
import { invitoDellaRegistrazione, firstMembershipOrgId } from "@/features/auth/orgs";
import { eq, inArray } from "drizzle-orm";

// Chi si registra riceve il proprio studio, tranne chi arriva DAL LINK del proprio invito.
//
// Storia di questo file: nella Fase 1 provava che un invito SCADUTO non sopprimesse lo
// studio personale. L'audit di sicurezza dell'ottobre 2026 ha mostrato che il guaio era
// più largo: bastava un invito VALIDO, mandato da chiunque, per lasciare un estraneo senza
// studio — il titolare di uno studio in prova poteva farlo a qualunque indirizzo non ancora
// iscritto. Ora decide la pagina da cui si arriva, e il percorso si prova per intero
// attraverso il vero gestore di Better Auth.
const url = process.env.DATABASE_URL;

const RUN = Date.now();
const orgId = `org-inv-${RUN}`;
const inviterId = `user-inv-${RUN}`;
const utenti: string[] = [inviterId];
const studiCreati: string[] = [];
let invitoValido = "";
let invitoScaduto = "";
const emailValido = `valido-${RUN}@example.com`;
const emailScaduto = `scaduto-${RUN}@example.com`;

describe.skipIf(!url)("inviti e creazione dello studio alla registrazione", () => {
  afterAll(async () => {
    await db.delete(invitation).where(eq(invitation.organizationId, orgId));
    await db.delete(member).where(inArray(member.userId, utenti));
    if (studiCreati.length) {
      await db.delete(orgEntitlement).where(inArray(orgEntitlement.organizationId, studiCreati));
      await db.delete(member).where(inArray(member.organizationId, studiCreati));
      await db.delete(organization).where(inArray(organization.id, studiCreati));
    }
    await db.delete(member).where(eq(member.organizationId, orgId));
    await db.delete(organization).where(eq(organization.id, orgId));
    await db.delete(session).where(inArray(session.userId, utenti));
    await db.delete(user).where(inArray(user.id, utenti));
  });

  it("l'invito si riconosce solo dal link, per lo stesso indirizzo, se ancora valido", async () => {
    await db.insert(user).values({ id: inviterId, name: "Invitante", email: `inviter-${RUN}@example.com` });
    await db.insert(organization).values({ id: orgId, name: "Studio Invitante", slug: `inv-${RUN}` });
    await db.insert(member).values({ id: randomUUID(), organizationId: orgId, userId: inviterId, role: "owner" });
    invitoValido = randomUUID();
    invitoScaduto = randomUUID();
    const domani = new Date(Date.now() + 86_400_000);
    const ieri = new Date(Date.now() - 86_400_000);
    await db.insert(invitation).values([
      { id: invitoValido, organizationId: orgId, email: emailValido, status: "pending", expiresAt: domani, inviterId },
      { id: invitoScaduto, organizationId: orgId, email: emailScaduto, status: "pending", expiresAt: ieri, inviterId },
    ]);

    expect(await invitoDellaRegistrazione(emailValido, `/accept-invitation/${invitoValido}`)).toBe(true);
    expect(await invitoDellaRegistrazione(emailValido, `https://evalisdeck.it/accept-invitation/${invitoValido}`)).toBe(true);
    // Senza link, o col link di un'altra pagina: no, anche se l'invito esiste.
    expect(await invitoDellaRegistrazione(emailValido, undefined)).toBe(false);
    expect(await invitoDellaRegistrazione(emailValido, "/dashboard")).toBe(false);
    // Il link dell'invito di un ALTRO indirizzo non vale.
    expect(await invitoDellaRegistrazione(`altro-${RUN}@example.com`, `/accept-invitation/${invitoValido}`)).toBe(false);
    // Un invito scaduto non vale nemmeno dal suo link.
    expect(await invitoDellaRegistrazione(emailScaduto, `/accept-invitation/${invitoScaduto}`)).toBe(false);
  });

  it("registrazione normale con un invito altrui in attesa: lo studio personale nasce lo stesso", async () => {
    const { auth } = await import("@/lib/auth");
    const r = await auth.api.signUpEmail({
      body: { email: emailValido, password: `Pw-molto-sicura-${RUN}!`, name: "Vittima" },
    });
    utenti.push(r.user.id);
    const appartenenze = await db.select().from(member).where(eq(member.userId, r.user.id));
    expect(appartenenze, "senza studio l'account sarebbe inutilizzabile").toHaveLength(1);
    expect(appartenenze[0].role).toBe("owner");
    expect(appartenenze[0].organizationId).not.toBe(orgId);
    studiCreati.push(appartenenze[0].organizationId);
  });

  it("registrazione DAL LINK dell'invito: nessuno studio proprio, si entra in quello che invita", async () => {
    const { auth } = await import("@/lib/auth");
    const email = `dal-link-${RUN}@example.com`;
    const id = randomUUID();
    await db.insert(invitation).values({
      id,
      organizationId: orgId,
      email,
      status: "pending",
      expiresAt: new Date(Date.now() + 86_400_000),
      inviterId,
    });
    const r = await auth.api.signUpEmail({
      body: { email, password: `Pw-molto-sicura-${RUN}!`, name: "Collega", callbackURL: `/accept-invitation/${id}` },
    });
    utenti.push(r.user.id);
    const appartenenze = await db.select().from(member).where(eq(member.userId, r.user.id));
    expect(appartenenze).toHaveLength(0);
  });

  it("con due appartenenze la sessione punta alla più recente", async () => {
    const vittima = utenti[1];
    const [personale] = await db.select().from(member).where(eq(member.userId, vittima));
    expect(await firstMembershipOrgId(vittima)).toBe(personale.organizationId);
    // Accetta più tardi l'invito: ora le appartenenze sono due, e vince l'ultima.
    await db.insert(member).values({
      id: randomUUID(),
      organizationId: orgId,
      userId: vittima,
      role: "member",
      createdAt: new Date(Date.now() + 1000),
    });
    expect(await firstMembershipOrgId(vittima)).toBe(orgId);
  });
});
