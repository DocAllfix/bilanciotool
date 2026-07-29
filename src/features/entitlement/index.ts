import { db } from "@/lib/db";
import { withTenant } from "@/lib/db/tenant";
import { platformConfig, orgEntitlement, company, member } from "@/lib/db/schema";
import { and, eq, count } from "drizzle-orm";

// Layer di entitlement: fonte di verità del paywall e dei limiti anti-abuso.
// Nasce PRIMA di Stripe (Fase 9 muterà solo lo stato che questo layer legge).
// Ogni server action delle fasi 4-8 passa da requireEntitlement: niente retrofit.

export type AccountStatus = "demo" | "active" | "past_due" | "expired";
export type Capability = "create_company" | "write_data" | "export" | "generate_pdf";

export class EntitlementError extends Error {
  constructor(
    public code: "paywall" | "read_only" | "limit_companies" | "limit_members",
    message: string,
  ) {
    super(message);
    this.name = "EntitlementError";
  }
}

export type Limits = { maxActiveCompanies: number; warnAtCompanies: number; maxMembers: number };
const DEFAULT_LIMITS: Limits = { maxActiveCompanies: 10, warnAtCompanies: 8, maxMembers: 5 };

// Limiti da config di piattaforma (modificabili senza deploy), con default sicuri.
export async function getLimits(): Promise<Limits> {
  const rows = await db.select().from(platformConfig).where(eq(platformConfig.key, "limits")).limit(1);
  const v = (rows[0]?.value ?? {}) as Partial<Limits>;
  return { ...DEFAULT_LIMITS, ...v };
}

export async function getAccountStatus(userId: string, orgId: string): Promise<AccountStatus> {
  return withTenant({ userId, orgId }, async (tx) => {
    const rows = await tx
      .select({ status: orgEntitlement.status })
      .from(orgEntitlement)
      .where(eq(orgEntitlement.organizationId, orgId))
      .limit(1);
    // Fail-closed: senza riga di entitlement l'account è considerato demo.
    return (rows[0]?.status ?? "demo") as AccountStatus;
  });
}

// Matrice capability per stato. Regole di prodotto:
// - demo: si lavora SOLO sull'azienda demo pre-compilata; niente aziende proprie,
//   niente export, niente PDF (il server è la verità: la UI può solo nasconderli).
// - past_due: grazia — tutto attivo, banner in UI; expired: sola lettura ma
//   export consentito (i dati restano dell'utente, mai ostaggio).
const MATRIX: Record<AccountStatus, Record<Capability, boolean>> = {
  demo: { create_company: false, write_data: true, export: false, generate_pdf: false },
  active: { create_company: true, write_data: true, export: true, generate_pdf: true },
  past_due: { create_company: true, write_data: true, export: true, generate_pdf: true },
  expired: { create_company: false, write_data: false, export: true, generate_pdf: false },
};

export function can(status: AccountStatus, capability: Capability): boolean {
  return MATRIX[status][capability];
}

export async function requireEntitlement(userId: string, orgId: string, capability: Capability): Promise<AccountStatus> {
  const status = await getAccountStatus(userId, orgId);
  if (!can(status, capability)) {
    if (status === "expired") throw new EntitlementError("read_only", "Abbonamento scaduto: account in sola lettura");
    throw new EntitlementError("paywall", "Funzione disponibile con l'abbonamento attivo");
  }
  return status;
}

export type CompanyUsage = { active: number; limit: number; warnAt: number; nearLimit: boolean; atLimit: boolean };

// Le aziende demo e quelle archiviate NON contano nei limiti.
export async function getCompanyUsage(userId: string, orgId: string): Promise<CompanyUsage> {
  const limits = await getLimits();
  const active = await withTenant({ userId, orgId }, async (tx) => {
    const r = await tx
      .select({ n: count() })
      .from(company)
      .where(and(eq(company.organizationId, orgId), eq(company.stato, "active"), eq(company.isDemo, false)));
    return r[0].n;
  });
  return {
    active,
    limit: limits.maxActiveCompanies,
    warnAt: limits.warnAtCompanies,
    nearLimit: active >= limits.warnAtCompanies,
    atLimit: active >= limits.maxActiveCompanies,
  };
}

// Blocco server-side alla creazione oltre il limite (11ª azienda).
export async function assertCompanyCreatable(userId: string, orgId: string): Promise<void> {
  await requireEntitlement(userId, orgId, "create_company");
  const usage = await getCompanyUsage(userId, orgId);
  if (usage.atLimit) {
    throw new EntitlementError(
      "limit_companies",
      `Limite di ${usage.limit} aziende attive raggiunto: archivia un'azienda o contattaci per il piano Studio`,
    );
  }
}

// Blocco server-side al 6° membro (invito E accettazione).
export async function assertSeatAvailable(orgId: string): Promise<void> {
  const limits = await getLimits();
  const r = await db.select({ n: count() }).from(member).where(eq(member.organizationId, orgId));
  if (r[0].n >= limits.maxMembers) {
    throw new EntitlementError("limit_members", `Limite di ${limits.maxMembers} membri per studio raggiunto`);
  }
}
