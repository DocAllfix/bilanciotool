import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { requireConsultant } from "@/features/auth/guards";
import { getFiliera } from "@/features/filiera/queries";
import { FilieraShell } from "@/components/filiera/filiera-shell";
import { CreaProgramma } from "@/components/filiera/crea-programma";
import { caricaCorpus, contatoriCorpus } from "@/features/corpus/carica";
import { anagraficaCorpusFiliera } from "@/features/filiera/anagrafica-corpus";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Due diligence di filiera" };

export default async function FilieraPage({
  params,
  searchParams,
}: {
  params: Promise<{ companyId: string }>;
  searchParams: Promise<{ vista?: string; p?: string; doc?: string; reg?: string }>;
}) {
  const { companyId } = await params;
  const { vista, p, doc, reg } = await searchParams;

  const s = await requireConsultant();
  const dati = await getFiliera(s.userId, s.orgId, companyId);
  if (!dati) notFound();

  if (!dati.programma) {
    return (
      <div className="mx-auto w-full max-w-3xl">
        <h1 className="font-display text-2xl font-semibold tracking-tight">{dati.azienda.nome}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Due diligence di filiera · Linee guida OCSE · Direttiva (UE) 2024/1760
        </p>
        <CreaProgramma companyId={companyId} />
      </div>
    );
  }

  const pieno = dati as Parameters<typeof FilieraShell>[0]["dati"];
  const [corpus, contatori] = await Promise.all([
    caricaCorpus(
      s.userId,
      s.orgId,
      companyId,
      dati.programma.contentSetId,
      { vista, doc, reg },
      anagraficaCorpusFiliera(dati.programma),
    ),
    contatoriCorpus(s.userId, s.orgId, companyId, dati.programma.contentSetId),
  ]);

  return (
    <FilieraShell
      companyId={companyId}
      dati={pieno}
      vistaIniziale={vista ?? "quadro"}
      partnerAperto={p ?? null}
      corpus={corpus}
      contatoriCorpus={contatori}
    />
  );
}
