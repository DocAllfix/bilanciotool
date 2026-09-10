import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { requireConsultant } from "@/features/auth/guards";
import { getQuadro } from "@/features/nis2/profilo";
import { caricaCorpus, contatoriCorpus } from "@/features/corpus/carica";
import { anagraficaCorpusNis2 } from "@/features/nis2/anagrafica-corpus";
import { Nis2Shell } from "@/components/nis2/nis2-shell";
import { CreaPercorsoNis2 } from "@/components/nis2/crea-percorso";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Autovalutazione conformità NIS2" };

export default async function Nis2Page({
  params,
  searchParams,
}: {
  params: Promise<{ companyId: string }>;
  searchParams: Promise<{ vista?: string; doc?: string; reg?: string }>;
}) {
  const { companyId } = await params;
  const { vista, doc, reg } = await searchParams;

  const s = await requireConsultant();
  // ⚠️ Il perimetro decide che cosa questo percorso mostra: 124 requisiti, non 126. I due
  // che riguardano solo il sistema di gestione escono anche dal DENOMINATORE della
  // conformità — sarebbe sbagliato contare requisiti che qui nessuno può compilare.
  const dati = await getQuadro(s.userId, s.orgId, companyId, "autovalutazione");
  // `null` significa che l'azienda non esiste o è di un altro studio: è un 404. Il
  // percorso non aperto è un'altra cosa, e si vede sotto.
  if (!dati) notFound();

  if (!dati.profilo) {
    return <CreaPercorsoNis2 companyId={companyId} quale="nis2" aziendaNome={dati.azienda.nome} />;
  }

  const [corpus, contatori] = await Promise.all([
    caricaCorpus(
      s.userId,
      s.orgId,
      companyId,
      dati.profilo.contentSetId,
      { vista, doc, reg },
      anagraficaCorpusNis2(dati),
    ),
    contatoriCorpus(s.userId, s.orgId, companyId, dati.profilo.contentSetId),
  ]);

  return (
    <Nis2Shell
      companyId={companyId}
      dati={dati}
      vistaIniziale={vista ?? "quadro"}
      corpus={corpus}
      contatoriCorpus={contatori}
    />
  );
}
