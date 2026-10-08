import { db } from "@/lib/db";
import { withTenant } from "@/lib/db/tenant";
import { organization, member, invitation } from "@/lib/db/schema";
import { orgEntitlement } from "@/lib/db/schema";
import { auditLog } from "@/lib/db/schema";
import { and, desc, eq, gt } from "drizzle-orm";
import { randomUUID } from "node:crypto";

// Creazione dell'org-studio al signup. Insert diretti nelle stesse tabelle che il
// plugin organization legge: trasparente in lettura, deterministico in scrittura.
// Gira nell'hook user.create.after (fuori da withTenant): organization/member sono
// passthrough; org_entitlement è tabella tenant → si scrive dentro withTenant con
// l'orgId appena creato, così la policy WITH CHECK passa anche sotto app_rls.

const slugify = (s: string) =>
  s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40);

/**
 * La registrazione arriva DAL LINK di un invito valido per quello stesso indirizzo?
 *
 * ⚠️ È la domanda giusta, e quella che c'era prima (`hasPendingInvitation`, tolta) non lo era. Prima bastava che esistesse
 * un invito in attesa per quell'indirizzo, mandato da chiunque, perché alla registrazione
 * lo studio personale non si creasse: il titolare di uno studio qualunque — anche gratuito,
 * in prova — poteva invitare l'indirizzo di un estraneo prima che si iscrivesse, e
 * l'estraneo si ritrovava con un account senza studio e senza via d'uscita se non
 * accettare l'invito altrui (audit di sicurezza, ottobre 2026).
 *
 * Ora lo studio si salta solo se la registrazione viene dalla pagina dell'invito
 * (`callbackURL` = `/accept-invitation/<id>`) e quell'invito è valido per lo stesso
 * indirizzo. `callbackURL` lo sceglie il browser, ed è giusto così: è il consenso di chi
 * si registra, che sta dicendo «entro in quello studio». Il controllo sull'indirizzo
 * impedisce di agganciarsi all'invito di un altro.
 *
 * Chiunque altro riceve sempre il proprio studio, anche se ha un invito in attesa: se poi
 * lo accetta avrà due appartenenze, e la sessione punterà alla più recente
 * (`firstMembershipOrgId`).
 */
export async function invitoDellaRegistrazione(email: string, callbackURL: unknown): Promise<boolean> {
  if (typeof callbackURL !== "string") return false;
  let percorso: string;
  try {
    percorso = new URL(callbackURL, "http://x").pathname;
  } catch {
    return false;
  }
  const m = /^\/accept-invitation\/([^/]+)\/?$/.exec(percorso);
  if (!m) return false;
  const rows = await db
    .select({ id: invitation.id })
    .from(invitation)
    .where(
      and(
        eq(invitation.id, decodeURIComponent(m[1])),
        eq(invitation.email, email.toLowerCase()),
        eq(invitation.status, "pending"),
        gt(invitation.expiresAt, new Date()),
      ),
    )
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

/**
 * Lo studio su cui puntare la sessione quando non ne indica uno: l'appartenenza PIÙ RECENTE.
 *
 * ⚠️ Prima mancava l'ordinamento, e con due appartenenze Postgres poteva restituire l'una
 * o l'altra a ogni accesso. Due appartenenze ora capitano di proposito: chi si registra
 * dalla pagina normale riceve il proprio studio, e se poi accetta un invito entra anche in
 * quello. La più recente è quella in cui è appena entrato, cioè quella che sta cercando.
 */
export async function firstMembershipOrgId(userId: string): Promise<string | null> {
  const rows = await db
    .select({ organizationId: member.organizationId })
    .from(member)
    .where(eq(member.userId, userId))
    .orderBy(desc(member.createdAt), desc(member.id))
    .limit(1);
  return rows[0]?.organizationId ?? null;
}
