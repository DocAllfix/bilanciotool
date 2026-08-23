import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { requireConsultant } from "@/features/auth/guards";
import { getAnticorruzione } from "@/features/anticorruzione/queries";
import { AnticorruzioneShell } from "@/components/anticorruzione/anticorruzione-shell";
import { CreaSistema } from "@/components/anticorruzione/crea-sistema";
import { caricaCorpus, contatoriCorpus } from "@/features/corpus/carica";
import { anagraficaCorpusPc } from "@/features/anticorruzione/anagrafica-corpus";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Prevenzione della corruzione" };

export default async function AnticorruzionePage({
  params,
  searchParams,
}: {
  params: Promise<{ companyId: string }>;
  searchParams: Promise<{ vista?: string; doc?: string; reg?: string }>;
}) {
  const { companyId } = await params;
  const { vista, doc, reg } = await searchParams;

  const s = await requireConsultant();
  const dati = await getAnticorruzione(s.userId, s.orgId, companyId);
  // `null` significa che l'azienda non esiste o è di un altro studio: è un 404, non un
  // invito a creare qualcosa. Il sistema assente è un'altra cosa, e si vede sotto.
  if (!dati) notFound();

  if (!dati.sistema) {
    return (
      <div className="mx-auto w-full max-w-3xl">
        <h1 className="font-display text-2xl font-semibold tracking-tight">{dati.azienda.nome}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Prevenzione della corruzione · UNI ISO 37001
        </p>
        <CreaSistema companyId={companyId} />
      </div>
    );
  }

  // Il corpus del modulo: si carica solo cio' che la vista aperta chiede.
  const [corpus, contatori] = await Promise.all([
    caricaCorpus(s.userId, s.orgId, companyId, dati.sistema.contentSetId, { vista, doc, reg }, anagraficaCorpusPc(dati.sistema)),
    contatoriCorpus(s.userId, s.orgId, companyId, dati.sistema.contentSetId),
  ]);

  return (
    <AnticorruzioneShell
      companyId={companyId}
      dati={dati}
      vistaIniziale={vista ?? "quadro"}
      corpus={corpus}
      contatoriCorpus={contatori}
    />
  );
}
