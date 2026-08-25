import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { requireConsultant } from "@/features/auth/guards";
import { withTenant } from "@/lib/db/tenant";
import { company } from "@/lib/db/schema";
import { can, getAccountStatus } from "@/features/entitlement";
import { getProgramma } from "@/features/sgesg/programma";
import { VistaProgrammaEsg } from "@/components/sgesg/vista-programma";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Sistema di gestione ESG" };

export default async function SgesgAnnoPage({
  params,
}: {
  params: Promise<{ companyId: string; anno: string }>;
}) {
  const { companyId, anno } = await params;
  const n = Number(anno);
  if (!Number.isInteger(n)) notFound();

  const s = await requireConsultant();
  const [az, vista, stato] = await Promise.all([
    withTenant({ userId: s.userId, orgId: s.orgId }, async (tx) => {
      const [a] = await tx.select().from(company).where(eq(company.id, companyId));
      return a ?? null;
    }),
    getProgramma(s.userId, s.orgId, companyId, n),
    getAccountStatus(s.userId, s.orgId),
  ]);
  if (!az || !vista) notFound();

  return (
    <VistaProgrammaEsg
      companyId={companyId}
      nomeAzienda={az.nome}
      vista={vista}
      soloLettura={!can(stato, "write_data") || az.stato === "archived"}
    />
  );
}
