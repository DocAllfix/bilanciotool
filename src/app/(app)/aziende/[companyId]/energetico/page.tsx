import { redirect, notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { requireConsultant } from "@/features/auth/guards";
import { listBalances } from "@/features/energy/balances";
import { withTenant } from "@/lib/db/tenant";
import { company } from "@/lib/db/schema";
import { CreaBilancioEnergetico } from "@/components/energy/crea-bilancio-energetico";

export const dynamic = "force-dynamic";

export default async function EnergeticoIndexPage({ params }: { params: Promise<{ companyId: string }> }) {
  const { companyId } = await params;
  const s = await requireConsultant();
  const az = await withTenant({ userId: s.userId, orgId: s.orgId }, async (tx) => {
    const [a] = await tx.select().from(company).where(eq(company.id, companyId));
    return a ?? null;
  });
  if (!az) notFound();

  const bilanci = await listBalances(s.userId, s.orgId, companyId);
  if (bilanci.length) redirect(`/aziende/${companyId}/energetico/${bilanci[0].anno}`);

  return (
    <div className="mx-auto w-full max-w-3xl">
      <h1 className="font-display text-2xl font-semibold tracking-tight">{az.nome}</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Bilancio energetico · UNI CEI EN 16247-1/3 · ISO 50001 · art. 8 D.Lgs. 102/2014
      </p>
      <CreaBilancioEnergetico companyId={companyId} />
    </div>
  );
}
