import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { requireConsultant } from "@/features/auth/guards";
import { getReportWizardData } from "@/features/report/queries";
import { ReportWizard } from "@/components/report/report-wizard";
import { CreaBilancio } from "@/components/report/crea-bilancio";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Bilancio di sostenibilità" };

export default async function BilancioAnnoPage({
  params,
  searchParams,
}: {
  params: Promise<{ companyId: string; anno: string }>;
  searchParams: Promise<{ passo?: string }>;
}) {
  const { companyId, anno } = await params;
  const { passo } = await searchParams;
  const annoNum = Number(anno);
  if (!Number.isInteger(annoNum)) notFound();

  const s = await requireConsultant();
  const dati = await getReportWizardData(s.userId, s.orgId, companyId, annoNum);
  if (!dati) notFound();

  if (!dati.progetto || !dati.catalogo || !dati.stato) {
    return (
      <div className="mx-auto w-full max-w-3xl">
        <h1 className="text-2xl font-semibold tracking-tight">{dati.azienda.nome}</h1>
        <p className="mt-1 text-sm text-muted-foreground">Nessun bilancio per il {annoNum}.</p>
        <CreaBilancio companyId={companyId} />
      </div>
    );
  }

  return (
    <ReportWizard
      companyId={companyId}
      azienda={dati.azienda}
      progetto={dati.progetto}
      progetti={dati.progetti}
      catalogo={dati.catalogo}
      stato={dati.stato}
      passoIniziale={Number(passo) || 1}
    />
  );
}
