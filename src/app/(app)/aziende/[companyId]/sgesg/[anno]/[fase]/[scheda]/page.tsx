import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { requireConsultant } from "@/features/auth/guards";
import { withTenant } from "@/lib/db/tenant";
import { company } from "@/lib/db/schema";
import { can, getAccountStatus } from "@/features/entitlement";
import { getProgramma } from "@/features/sgesg/programma";
import { getScheda } from "@/features/sgesg/schede";
import { VistaSchedaEsg } from "@/components/sgesg/vista-scheda";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Scheda del metodo ESG" };

export default async function SchedaSgesgPage({
  params,
}: {
  params: Promise<{ companyId: string; anno: string; fase: string; scheda: string }>;
}) {
  const { companyId, anno, fase, scheda } = await params;
  const n = Number(anno);
  if (!Number.isInteger(n)) notFound();

  const s = await requireConsultant();
  const vista = await getProgramma(s.userId, s.orgId, companyId, n);
  if (!vista) notFound();
  const def = vista.fasi.find((f) => f.key === fase);
  if (!def) notFound();

  const [v, az, stato] = await Promise.all([
    getScheda(s.userId, s.orgId, vista.programma.id, scheda),
    withTenant({ userId: s.userId, orgId: s.orgId }, async (tx) => {
      const [a] = await tx.select().from(company).where(eq(company.id, companyId));
      return a ?? null;
    }),
    getAccountStatus(s.userId, s.orgId),
  ]);
  if (!v || !az) notFound();
  // La scheda deve appartenere alla fase che l'indirizzo dichiara: senza, lo stesso
  // documento si aprirebbe da otto indirizzi diversi e il «torna indietro» porterebbe
  // in una fase che non lo contiene.
  if (v.def.faseKey !== fase) notFound();

  return (
    <VistaSchedaEsg
      companyId={companyId}
      anno={n}
      faseKey={fase}
      faseNome={def.nome}
      programId={vista.programma.id}
      vista={v}
      soloLettura={!can(stato, "write_data") || az.stato === "archived"}
    />
  );
}
