import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { requireConsultant } from "@/features/auth/guards";
import { getSgiQas } from "@/features/sgiqas/queries";
import { SgiQasShell } from "@/components/sgiqas/sgiqas-shell";
import { CreaSistema } from "@/components/sgiqas/crea-sistema";
import { caricaCorpus, contatoriCorpus } from "@/features/corpus/carica";
import { anagraficaCorpusQas } from "@/features/sgiqas/anagrafica-corpus";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Sistema di gestione integrato QAS" };

export default async function SgiQasPage({
  params,
  searchParams,
}: {
  params: Promise<{ companyId: string }>;
  searchParams: Promise<{ vista?: string; doc?: string; reg?: string }>;
}) {
  const { companyId } = await params;
  const { vista, doc, reg } = await searchParams;

  const s = await requireConsultant();
  const dati = await getSgiQas(s.userId, s.orgId, companyId);
  // `null` significa che l'azienda non esiste o e' di un altro studio: e' un 404. Il
  // sistema non avviato e' un'altra cosa, e si vede sotto.
  if (!dati) notFound();

  if (!dati.sistema) {
    return (
      <div className="mx-auto w-full max-w-3xl">
        <h1 className="font-display text-2xl font-semibold tracking-tight">{dati.azienda.nome}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Sistema di gestione integrato · ISO 9001 · ISO 14001 · ISO 45001
        </p>
        <CreaSistema companyId={companyId} />
      </div>
    );
  }

  const [corpus, contatori] = await Promise.all([
    caricaCorpus(s.userId, s.orgId, companyId, dati.sistema.contentSetId, { vista, doc, reg }, anagraficaCorpusQas(dati.sistema)),
    contatoriCorpus(s.userId, s.orgId, companyId, dati.sistema.contentSetId),
  ]);

  return (
    <SgiQasShell
      companyId={companyId}
      dati={{ ...dati, sistema: dati.sistema }}
      vistaIniziale={vista ?? "quadro"}
      corpus={corpus}
      contatoriCorpus={contatori}
    />
  );
}
