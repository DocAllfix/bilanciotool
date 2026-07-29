import { withTenant } from "@/lib/db/tenant";
import { company } from "@/lib/db/schema";
import { logAudit } from "@/lib/audit";
import { assertCompanyCreatable } from "@/features/entitlement";
import { and, eq } from "drizzle-orm";
import { randomUUID } from "node:crypto";

// Funzioni server del portafoglio aziende (le server action con guard di sessione
// arrivano con la UI in Fase 5; qui la logica pura chiamabile e testabile).

export type NewCompany = {
  nome: string;
  piva?: string;
  settore?: string;
  ateco?: string;
  sede?: string;
};

export async function createCompany(userId: string, orgId: string, data: NewCompany): Promise<string> {
  // Blocco anti-abuso server-side (11ª azienda) + paywall (demo non crea aziende proprie).
  await assertCompanyCreatable(userId, orgId);
  const id = randomUUID();
  await withTenant({ userId, orgId }, async (tx) => {
    await tx.insert(company).values({ id, organizationId: orgId, ...data });
    await logAudit(tx, { organizationId: orgId, userId, azione: "company.create", entita: "company", entitaId: id });
  });
  return id;
}

// Archiviare = sola lettura, esce dai limiti, non si cancella mai.
export async function archiveCompany(userId: string, orgId: string, companyId: string): Promise<void> {
  await withTenant({ userId, orgId }, async (tx) => {
    const updated = await tx
      .update(company)
      .set({ stato: "archived", archivedAt: new Date() })
      .where(and(eq(company.id, companyId), eq(company.organizationId, orgId)))
      .returning({ id: company.id });
    if (!updated.length) throw new Error("Azienda inesistente o di un altro tenant");
    await logAudit(tx, { organizationId: orgId, userId, azione: "company.archive", entita: "company", entitaId: companyId });
  });
}

export async function restoreCompany(userId: string, orgId: string, companyId: string): Promise<void> {
  // Il ripristino ri-conta nei limiti: passa dallo stesso assert della creazione.
  await assertCompanyCreatable(userId, orgId);
  await withTenant({ userId, orgId }, async (tx) => {
    const updated = await tx
      .update(company)
      .set({ stato: "active", archivedAt: null })
      .where(and(eq(company.id, companyId), eq(company.organizationId, orgId)))
      .returning({ id: company.id });
    if (!updated.length) throw new Error("Azienda inesistente o di un altro tenant");
    await logAudit(tx, { organizationId: orgId, userId, azione: "company.restore", entita: "company", entitaId: companyId });
  });
}
