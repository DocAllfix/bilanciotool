import { redirect, notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { requireConsultant } from "@/features/auth/guards";
import { withTenant } from "@/lib/db/tenant";
import { company } from "@/lib/db/schema";
import { anniProgramma } from "@/features/sgesg/programma";
import { CreaProgrammaEsg } from "@/components/sgesg/crea-programma";

export const dynamic = "force-dynamic";

// L'ingresso del percorso: se esiste gia' un esercizio si va li', altrimenti si crea.
// E' la stessa forma degli altri percorsi annuali (GHG, energetico, bilancio).

export default async function SgesgIndexPage({ params }: { params: Promise<{ companyId: string }> }) {
  const { companyId } = await params;
  const s = await requireConsultant();
  const az = await withTenant({ userId: s.userId, orgId: s.orgId }, async (tx) => {
    const [a] = await tx.select().from(company).where(eq(company.id, companyId));
    return a ?? null;
  });
  if (!az) notFound();

  const anni = await anniProgramma(s.userId, s.orgId, companyId);
  if (anni.length) redirect(`/aziende/${companyId}/sgesg/${anni[0]}`);

  return (
    <div className="mx-auto w-full max-w-3xl">
      <h1 className="font-display text-2xl font-semibold tracking-tight">{az.nome}</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Implementazione del sistema di gestione ESG · otto fasi, dal primo contatto al follow-up
      </p>
      <CreaProgrammaEsg companyId={companyId} />
    </div>
  );
}
