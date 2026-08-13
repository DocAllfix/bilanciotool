import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { requireConsultant } from "@/features/auth/guards";
import { getSoaData } from "@/features/soa/queries";
import { SoaShell } from "@/components/soa/soa-shell";
import { CreaDichiarazione } from "@/components/soa/crea-dichiarazione";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Statement of Applicability" };

export default async function SoaPage({
  params,
  searchParams,
}: {
  params: Promise<{ companyId: string }>;
  searchParams: Promise<{ vista?: string }>;
}) {
  const { companyId } = await params;
  const { vista } = await searchParams;

  const s = await requireConsultant();
  const dati = await getSoaData(s.userId, s.orgId, companyId);
  if (!dati) notFound();

  if (!dati.dichiarazione || !dati.catalogo || !dati.stato || !dati.esito) {
    return (
      <div className="mx-auto w-full max-w-3xl">
        <h1 className="font-display text-2xl font-semibold tracking-tight">{dati.azienda.nome}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Statement of Applicability · ISO/IEC 27001:2022 §6.1.3 d) · 27017 · 27018 · 27701
        </p>
        <CreaDichiarazione companyId={companyId} />
      </div>
    );
  }

  return (
    <SoaShell
      companyId={companyId}
      azienda={dati.azienda}
      dichiarazione={dati.dichiarazione}
      catalogo={dati.catalogo}
      stato={dati.stato}
      esito={dati.esito}
      vistaIniziale={vista ?? "quadro"}
    />
  );
}
