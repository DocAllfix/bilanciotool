import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { requireConsultant } from "@/features/auth/guards";
import { getQuadro } from "@/features/nis2/profilo";
import { getSistema } from "@/features/sgnis2/sistema";
import { caricaCorpus, contatoriCorpus } from "@/features/corpus/carica";
import { anagraficaCorpusNis2 } from "@/features/nis2/anagrafica-corpus";
import { SgNis2Shell } from "@/components/nis2/sgnis2-shell";
import { CreaPercorsoNis2 } from "@/components/nis2/crea-percorso";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Sistema di gestione NIS2" };

export default async function SgNis2Page({
  params,
  searchParams,
}: {
  params: Promise<{ companyId: string }>;
  searchParams: Promise<{ vista?: string; doc?: string; reg?: string }>;
}) {
  const { companyId } = await params;
  const { vista, doc, reg } = await searchParams;

  const s = await requireConsultant();
  const dati = await getSistema(s.userId, s.orgId, companyId);
  if (!dati) notFound();

  if (!dati.sistema) {
    return <CreaPercorsoNis2 companyId={companyId} quale="sgnis2" aziendaNome={dati.azienda.nome} />;
  }

  // ⚠️ Il quadro condiviso, col perimetro «sistema»: 126 requisiti, non 124. Sono le
  // STESSE risposte dell'autovalutazione — una tabella sola — e due dei requisiti
  // esistono solo qui.
  const quadro = await getQuadro(s.userId, s.orgId, companyId, "sistema");
  if (!quadro?.profilo) notFound();

  const [corpus, contatori] = await Promise.all([
    caricaCorpus(
      s.userId,
      s.orgId,
      companyId,
      dati.sistema.contentSetId,
      { vista, doc, reg },
      anagraficaCorpusNis2(quadro),
    ),
    contatoriCorpus(s.userId, s.orgId, companyId, dati.sistema.contentSetId),
  ]);

  return (
    <SgNis2Shell
      companyId={companyId}
      dati={dati}
      quadro={quadro}
      vistaIniziale={vista ?? "quadro"}
      corpus={corpus}
      contatoriCorpus={contatori}
    />
  );
}
