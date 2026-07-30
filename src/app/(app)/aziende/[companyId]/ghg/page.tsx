import { redirect, notFound } from "next/navigation";
import { requireConsultant } from "@/features/auth/guards";
import { listInventories } from "@/features/ghg/inventories";
import { withTenant } from "@/lib/db/tenant";
import { company } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { CreaInventario } from "@/components/ghg/crea-inventario";

export const dynamic = "force-dynamic";

// Ingresso del modulo GHG per un'azienda: se esistono inventari si apre il più
// recente, altrimenti si propone la creazione del primo (o l'import dal prototipo).
export default async function GhgIndexPage({ params }: { params: Promise<{ companyId: string }> }) {
  const { companyId } = await params;
  const s = await requireConsultant();
  const az = await withTenant({ userId: s.userId, orgId: s.orgId }, async (tx) => {
    const [a] = await tx.select().from(company).where(eq(company.id, companyId));
    return a ?? null;
  });
  if (!az) notFound();

  const inventari = await listInventories(s.userId, s.orgId, companyId);
  if (inventari.length) redirect(`/aziende/${companyId}/ghg/${inventari[0].anno}`);

  return (
    <div className="mx-auto w-full max-w-3xl">
      <h1 className="text-2xl font-semibold tracking-tight">{az.nome}</h1>
      <p className="mt-1 text-sm text-muted-foreground">Inventario GHG · ISO 14064-1:2018</p>
      <CreaInventario companyId={companyId} />
    </div>
  );
}
