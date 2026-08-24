import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { requireConsultant } from "@/features/auth/guards";
import { getSa8000 } from "@/features/sa8000/queries";
import { Sa8000Shell } from "@/components/sa8000/sa8000-shell";
import { CreaSistema } from "@/components/sa8000/crea-sistema";
import { caricaCorpus, contatoriCorpus } from "@/features/corpus/carica";
import { anagraficaCorpusSa } from "@/features/sa8000/anagrafica-corpus";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Sistema di gestione SA8000/2026" };

export default async function Sa8000Page({
  params,
  searchParams,
}: {
  params: Promise<{ companyId: string }>;
  searchParams: Promise<{ vista?: string; doc?: string; reg?: string }>;
}) {
  const { companyId } = await params;
  const { vista, doc, reg } = await searchParams;

  const s = await requireConsultant();
  const dati = await getSa8000(s.userId, s.orgId, companyId);
  if (!dati) notFound();

  if (!dati.sistema) {
    return (
      <div className="mx-auto w-full max-w-3xl">
        <h1 className="font-display text-2xl font-semibold tracking-tight">{dati.azienda.nome}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Sistema di gestione della responsabilita' sociale · SA8000:2026
        </p>
        <CreaSistema companyId={companyId} />
      </div>
    );
  }

  const [corpus, contatori] = await Promise.all([
    caricaCorpus(s.userId, s.orgId, companyId, dati.sistema.contentSetId, { vista, doc, reg }, anagraficaCorpusSa(dati.sistema)),
    contatoriCorpus(s.userId, s.orgId, companyId, dati.sistema.contentSetId),
  ]);

  return (
    <Sa8000Shell
      companyId={companyId}
      dati={{ ...dati, sistema: dati.sistema }}
      vistaIniziale={vista ?? "quadro"}
      corpus={corpus}
      contatoriCorpus={contatori}
    />
  );
}
