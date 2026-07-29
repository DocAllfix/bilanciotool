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
export async function requireActiveOrg(): Promise<SessionInfo & { orgId: string }> {
  const s = await requireSession();
  const orgId = s.activeOrganizationId ?? (await firstMembershipOrgId(s.userId));
  if (!orgId) throw new ForbiddenError("Nessuna organizzazione associata all'account");
  return { ...s, orgId };
}

export type OrgRole = "owner" | "admin" | "member";

export async function requireRole(...roles: OrgRole[]): Promise<SessionInfo & { orgId: string; role: OrgRole }> {
  const s = await requireActiveOrg();
  const rows = await db
    .select({ role: member.role })
    .from(member)
    .where(and(eq(member.organizationId, s.orgId), eq(member.userId, s.userId)))
    .limit(1);
  const role = rows[0]?.role as OrgRole | undefined;
  if (!role) throw new ForbiddenError("Non sei membro di questa organizzazione");
  if (roles.length && !roles.includes(role)) throw new ForbiddenError("Ruolo insufficiente");
  return { ...s, orgId: s.orgId, role };
}

// Consulente = qualunque membro dello studio (owner/admin/member) in V1.
export const requireConsultant = () => requireRole("owner", "admin", "member");
// Gestione studio (inviti, billing, archiviazioni) = owner o admin.
export const requireStudioAdmin = () => requireRole("owner", "admin");

export function isPlatformAdmin(s: SessionInfo): boolean {
  return s.platformRole === "admin";
}

export async function requirePlatformAdmin(): Promise<SessionInfo> {
  const s = await requireSession();
  if (!isPlatformAdmin(s)) throw new ForbiddenError("Riservato allo staff di piattaforma");
  return s;
}
