import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { requireConsultant } from "@/features/auth/guards";
import { getWizardData } from "@/features/ghg/queries";
import { GhgWizard } from "@/components/ghg/ghg-wizard";
import { CreaInventario } from "@/components/ghg/crea-inventario";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Inventario GHG" };

export default async function GhgAnnoPage({
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

  if (!dati.inventario || !dati.catalogo || !dati.stato) {
    return (
      <div className="mx-auto w-full max-w-3xl">
        <h1 className="text-2xl font-semibold tracking-tight">{dati.azienda.nome}</h1>
        <p className="mt-1 text-sm text-muted-foreground">Nessun inventario per il {annoNum}.</p>
        <CreaInventario companyId={companyId} />
      </div>
    );
  }

  return (
    <GhgWizard
      companyId={companyId}
      azienda={dati.azienda}
      inventario={dati.inventario}
      inventari={dati.inventari}
      catalogo={dati.catalogo}
      stato={dati.stato}
      passoIniziale={Number(passo) || 1}
    />
  );
}
