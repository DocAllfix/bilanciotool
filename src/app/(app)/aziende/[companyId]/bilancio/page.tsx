import { redirect, notFound } from "next/navigation";
import { requireConsultant } from "@/features/auth/guards";
import { listReportProjects } from "@/features/report/projects";
import { withTenant } from "@/lib/db/tenant";
import { company } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { CreaBilancio } from "@/components/report/crea-bilancio";

export const dynamic = "force-dynamic";

export default async function BilancioIndexPage({ params }: { params: Promise<{ companyId: string }> }) {
  const { companyId } = await params;
  const s = await requireConsultant();
  const az = await withTenant({ userId: s.userId, orgId: s.orgId }, async (tx) => {
    const [a] = await tx.select().from(company).where(eq(company.id, companyId));
    return a ?? null;
  });
  if (!az) notFound();

  const progetti = await listReportProjects(s.userId, s.orgId, companyId);
  if (progetti.length) redirect(`/aziende/${companyId}/bilancio/${progetti[0].anno}`);

  return (
    <div className="mx-auto w-full max-w-3xl">
      <h1 className="text-2xl font-semibold tracking-tight">{az.nome}</h1>
      <p className="mt-1 text-sm text-muted-foreground">Bilancio di sostenibilità · GRI 2021 / ESRS-VSME</p>
      <CreaBilancio companyId={companyId} />
    </div>
  );
}
