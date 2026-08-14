import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { member } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { firstMembershipOrgId } from "./orgs";

// Guards server-side: OGNI server action e route protetta parte da qui.
// I ruoli si leggono freschi dal DB a ogni chiamata, mai dal token di sessione.

export class AuthError extends Error {
  constructor(message = "Non autenticato") {
    super(message);
    this.name = "AuthError";
  }
}
export class ForbiddenError extends Error {
  constructor(message = "Operazione non consentita") {
    super(message);
    this.name = "ForbiddenError";
  }
}

export type SessionInfo = {
  userId: string;
  email: string;
  name: string;
  platformRole: string | null;
  activeOrganizationId: string | null;
};

export async function getSessionOrNull(): Promise<SessionInfo | null> {
  const s = await auth.api.getSession({ headers: await headers() });
  if (!s) return null;
  const u = s.user as typeof s.user & { platformRole?: string | null };
  const sess = s.session as typeof s.session & { activeOrganizationId?: string | null };
  return {
    userId: u.id,
    email: u.email,
    name: u.name,
    platformRole: u.platformRole ?? null,
    activeOrganizationId: sess.activeOrganizationId ?? null,
  };
}

export async function requireSession(): Promise<SessionInfo> {
  const s = await getSessionOrNull();
  if (!s) throw new AuthError();
  return s;
}

// Org attiva con fallback lazy: better-auth può creare la sessione prima che
// l'hook abbia creato lo studio.
// L'org della sessione NON è mai autorevole da sola: la membership si riverifica
// sul DB a ogni chiamata, perché una rimozione da parte dell'owner non invalida le
// sessioni già aperte dell'ex collaboratore (resterebbero valide per giorni).
export async function requireActiveOrg(): Promise<SessionInfo & { orgId: string; role: OrgRole }> {
  const s = await requireSession();
  const candidate = s.activeOrganizationId ?? (await firstMembershipOrgId(s.userId));
  if (!candidate) throw new ForbiddenError("Nessuna organizzazione associata all'account");
  const role = await membershipRole(s.userId, candidate);
  if (!role) {
    // Sessione con org stantia: si ripiega sull'appartenenza reale, se esiste.
    const fallback = await firstMembershipOrgId(s.userId);
    const fallbackRole = fallback ? await membershipRole(s.userId, fallback) : null;
    if (!fallback || !fallbackRole) throw new ForbiddenError("Non sei membro di questa organizzazione");
    return { ...s, orgId: fallback, role: fallbackRole };
  }
  return { ...s, orgId: candidate, role };
}

async function membershipRole(userId: string, orgId: string): Promise<OrgRole | null> {
  const rows = await db
    .select({ role: member.role })
    .from(member)
    .where(and(eq(member.organizationId, orgId), eq(member.userId, userId)))
    .limit(1);
  return (rows[0]?.role as OrgRole | undefined) ?? null;
}

export type OrgRole = "owner" | "admin" | "member";

export async function requireRole(...roles: OrgRole[]): Promise<SessionInfo & { orgId: string; role: OrgRole }> {
  const s = await requireActiveOrg();
  if (roles.length && !roles.includes(s.role)) throw new ForbiddenError("Ruolo insufficiente");
  return s;
}

// Consulente = qualunque membro dello studio (owner/admin/member) in V1.
export const requireConsultant = () => requireRole("owner", "admin", "member");
// Gestione studio (inviti, billing, archiviazioni) = owner o admin.
export const requireStudioAdmin = () => requireRole("owner", "admin");

/**
 * ⚠️ Queste due non hanno ancora chiamanti, ed è deliberato: **un'area staff non esiste**.
 *
 * Restano perché fanno parte di un terzetto già in uso — `platformRole` sulla tabella
 * utente (con `input: false`, quindi non auto-assegnabile), `withTenant({ platformAdmin })`
 * come valvola sul database (la usano i webhook Stripe e il cron dei rinnovi), e questa
 * guardia HTTP. Toglierne una gamba lascerebbe le altre due più confuse di adesso.
 *
 * Diversamente da `improntaCoincide` — una funzione di sicurezza senza chiamanti che
 * abbiamo rimosso perché lasciava credere protetto un confronto che non lo era — qui non
 * c'è niente da fraintendere: nessuna pagina staff esiste, quindi nessuno può pensare che
 * sia protetta.
 *
 * A che cosa servirebbe, il giorno in cui si farà: ripescare da Stripe un pagamento
 * rimasto orfano (`webhook.ts` lo registra già come «evento orfano», e oggi si rimedia
 * solo con una UPDATE a mano sul database di produzione); attivare a mano un cliente che
 * paga per bonifico; guardare lo stato di uno studio quando chiede assistenza.
 */
export function isPlatformAdmin(s: SessionInfo): boolean {
  return s.platformRole === "admin";
}

export async function requirePlatformAdmin(): Promise<SessionInfo> {
  const s = await requireSession();
  if (!isPlatformAdmin(s)) throw new ForbiddenError("Riservato allo staff di piattaforma");
  return s;
}
