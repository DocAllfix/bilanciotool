import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { requireConsultant } from "@/features/auth/guards";
import { getMog231 } from "@/features/mog231/queries";
import { Mog231Shell } from "@/components/mog231/mog231-shell";
import { CreaModello } from "@/components/mog231/crea-modello";
import { caricaCorpus, contatoriCorpus } from "@/features/corpus/carica";
import { anagraficaCorpus231 } from "@/features/mog231/anagrafica-corpus";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Modello 231" };

export default async function Mog231Page({
  params,
  searchParams,
}: {
  params: Promise<{ companyId: string }>;
  searchParams: Promise<{ vista?: string; doc?: string; reg?: string }>;
}) {
  const { companyId } = await params;
  const { vista, doc, reg } = await searchParams;

  const s = await requireConsultant();
  const dati = await getMog231(s.userId, s.orgId, companyId);
  // `null` significa che l'azienda non esiste o è di un altro studio: è un 404. Il
  // Modello assente è un'altra cosa, e si vede sotto.
  if (!dati) notFound();

  if (!dati.modello) {
    return (
      <div className="mx-auto w-full max-w-3xl">
        <h1 className="font-display text-2xl font-semibold tracking-tight">{dati.azienda.nome}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Modello di organizzazione, gestione e controllo · D.Lgs. 231/2001
        </p>
        <CreaModello companyId={companyId} />
      </div>
    );
  }

  // Il corpus del modulo: si carica solo cio' che la vista aperta chiede.
  const [corpus, contatori] = await Promise.all([
    caricaCorpus(s.userId, s.orgId, companyId, dati.modello.contentSetId, { vista, doc, reg }, anagraficaCorpus231(dati.modello)),
    contatoriCorpus(s.userId, s.orgId, companyId, dati.modello.contentSetId),
  ]);

  return (
    <Mog231Shell
      companyId={companyId}
      dati={dati}
      vistaIniziale={vista ?? "quadro"}
      corpus={corpus}
      contatoriCorpus={contatori}
    />
  );
}
