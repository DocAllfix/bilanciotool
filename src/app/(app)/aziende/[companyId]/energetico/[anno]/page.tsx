import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { requireConsultant } from "@/features/auth/guards";
import { getWizardData } from "@/features/energy/queries";
import { EnergyWizard } from "@/components/energy/energy-wizard";
import { CreaBilancioEnergetico } from "@/components/energy/crea-bilancio-energetico";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Bilancio energetico" };

export default async function EnergeticoAnnoPage({
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
  const dati = await getWizardData(s.userId, s.orgId, companyId, annoNum);
  if (!dati) notFound();

  if (!dati.bilancio || !dati.catalogo || !dati.stato || !dati.risultati) {
    return (
      <div className="mx-auto w-full max-w-3xl">
        <h1 className="font-display text-2xl font-semibold tracking-tight">{dati.azienda.nome}</h1>
        <p className="mt-1 text-sm text-muted-foreground">Nessun bilancio energetico per il {annoNum}.</p>
        <CreaBilancioEnergetico companyId={companyId} />
      </div>
    );
  }

  return (
    <EnergyWizard
      companyId={companyId}
      azienda={dati.azienda}
      bilancio={dati.bilancio}
      bilanci={dati.bilanci}
      catalogo={dati.catalogo}
      stato={dati.stato}
      risultati={dati.risultati}
      passoIniziale={Number(passo) || 1}
    />
  );
}
