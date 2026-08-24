import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { requireConsultant } from "@/features/auth/guards";
import { getSupplierData } from "@/features/supplier/queries";
import { suggerimentiDaFiliera } from "@/features/supplier/ponte-filiera";
import { SupplierShell } from "@/components/supplier/supplier-shell";
import { CreaValutazione } from "@/components/supplier/crea-valutazione";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Autovalutazione ESG fornitore" };

export default async function FornitorePage({
  params,
  searchParams,
}: {
  params: Promise<{ companyId: string }>;
  searchParams: Promise<{ vista?: string }>;
}) {
  const { companyId } = await params;
  const { vista } = await searchParams;

  const s = await requireConsultant();
  // ⚠️ Il ponte leggero con la Due diligence di filiera: proposte, non risposte. Sta
  // dentro un solo tenant — sono dati che questo studio ha gia' scritto per questa
  // azienda — quindi non c'e' nessun consenso da chiedere. Vuoto se il modulo filiera non
  // e' avviato. Vedi `features/supplier/ponte-filiera.ts`.
  const [dati, suggerimenti] = await Promise.all([
    getSupplierData(s.userId, s.orgId, companyId),
    suggerimentiDaFiliera(s.userId, s.orgId, companyId),
  ]);
  if (!dati) notFound();

  if (!dati.valutazione || !dati.catalogo || !dati.stato || !dati.esito) {
    return (
      <div className="mx-auto w-full max-w-3xl">
        <h1 className="font-display text-2xl font-semibold tracking-tight">{dati.azienda.nome}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Autovalutazione ESG fornitore · ESRS · GRI · ISO 20400 · D.Lgs. 231/2001
        </p>
        <CreaValutazione companyId={companyId} />
      </div>
    );
  }

  return (
    <SupplierShell
      suggerimenti={suggerimenti}
      companyId={companyId}
      azienda={dati.azienda}
      valutazione={dati.valutazione}
      catalogo={dati.catalogo}
      stato={dati.stato}
      esito={dati.esito}
      vistaIniziale={vista ?? "quadro"}
    />
  );
}
