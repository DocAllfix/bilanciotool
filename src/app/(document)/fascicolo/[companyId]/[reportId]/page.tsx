import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { requireConsultant } from "@/features/auth/guards";
import { getFascicolo, getSegnalazioni } from "@/features/segnalazioni/queries";
import { DocumentoFascicoloWb } from "@/components/documento/documento-fascicolo-wb";
import { marchioDelloStudio } from "@/features/documents/marchio";

// La stampa di un fascicolo. NON e' un documento pubblicabile: vedi la lunga nota in
// `documento-fascicolo-wb.tsx`, che spiega le quattro ragioni.
//
// ⚠️ `noindex, nofollow` sempre, come il portale cliente. Ed e' dietro sessione: qui non
// c'e' nessun token da consegnare a nessuno, perche' questo foglio non si consegna.
//
// ⚠️ La lettura SCRIVE. `getFascicolo` registra l'accesso nella stessa transazione della
// lettura — se l'audit fallisce, il fascicolo non si apre — ed e' il contrario della
// regola scritta per il webhook di Stripe. Le due non si contraddicono: la' il registro
// annotava un lavoro gia' pagato, qui il registro E' la garanzia. Vale a maggior ragione
// per una stampa, che e' il gesto che porta il contenuto fuori dallo schermo.

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Fascicolo",
  robots: { index: false, follow: false },
};

export default async function StampaFascicoloPage({
  params,
}: {
  params: Promise<{ companyId: string; reportId: string }>;
}) {
  const { companyId, reportId } = await params;
  const s = await requireConsultant();

  const [f, dati, marchio] = await Promise.all([
    getFascicolo(s.userId, s.orgId, reportId),
    getSegnalazioni(s.userId, s.orgId, companyId),
    marchioDelloStudio(s.orgId),
  ]);
  if (!f || !dati?.assetto) notFound();
  // Il fascicolo appartiene all'assetto di QUELL'azienda: senza questo controllo, un
  // identificativo di un'altra azienda dello stesso studio stamperebbe lo stesso.
  if (f.systemId !== dati.assetto.id) notFound();

  return (
    <div className="px-4 py-4">
      <article className="doc-pagina">
        <DocumentoFascicoloWb
          f={f}
          azienda={dati.assetto.ragione ?? dati.azienda.nome}
          emittente={marchio.nome}
          oggi={new Date().toISOString().slice(0, 10)}
        />
      </article>
    </div>
  );
}
