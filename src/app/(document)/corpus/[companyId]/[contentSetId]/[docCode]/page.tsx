import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { requireConsultant } from "@/features/auth/guards";
import { documentoCorpus } from "@/features/corpus/letture";
import { anagraficaPerEdizione } from "@/features/corpus/anagrafiche";
import { RendeCorpus } from "@/components/corpus/rende-corpus";
import { Colophon } from "@/components/documento/colophon";
import { marchioDelloStudio } from "@/features/documents/marchio";

// La stampa di un documento del corpus: una procedura o un modulo, nel registro
// editoriale del prodotto.
//
// ⚠️ NON è uno snapshot, ed è una scelta con la sua controanalisi.
//
// Congelare ogni procedura in `document_snapshot` sarebbe stato il modo più ovvio, e
// sbagliato per due ragioni che tirano nella stessa direzione. La prima è di quantità:
// 447 documenti per ogni azienda di ogni studio. La seconda, che basterebbe da sola, è di
// natura: il corpus è VIVO — il cliente lo adotta e lo mantiene per anni — mentre lo
// snapshot è immutabile per costruzione. Congelato, il documento che il prodotto mostra e
// quello che il cliente mantiene divergerebbero al primo aggiornamento, e per un modulo
// che si chiama «sistema di gestione» è il difetto peggiore possibile.
//
// Questa pagina stampa CIÒ CHE C'È ADESSO, con le personalizzazioni del cliente e i
// segnaposto risolti. È la decisione A10 del piano: la modifica resta dentro il prodotto,
// e il PDF è la consegna.
//
// ⚠️ I segnaposto non risolti restano VISIBILI anche in stampa, evidenziati. Nasconderli
// darebbe un documento che sembra completo e non lo è, e chi lo firma non se ne
// accorgerebbe fino all'audit.

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ docCode: string }>;
}): Promise<Metadata> {
  const { docCode } = await params;
  return { title: docCode, robots: { index: false, follow: false } };
}

export default async function StampaCorpusPage({
  params,
}: {
  params: Promise<{ companyId: string; contentSetId: string; docCode: string }>;
}) {
  const { companyId, contentSetId, docCode } = await params;
  const s = await requireConsultant();

  const anagrafica = await anagraficaPerEdizione(s.userId, s.orgId, companyId, contentSetId);
  if (!anagrafica) notFound();

  const [dati, marchio] = await Promise.all([
    documentoCorpus(s.userId, s.orgId, companyId, contentSetId, docCode, anagrafica),
    marchioDelloStudio(s.orgId),
  ]);
  if (!dati) notFound();

  const d = dati.documento;

  return (
    <div className="px-4 py-4">
      <article className="doc-pagina">
        <div className="doc-corpo">
          <p className="doc-meta" style={{ marginBottom: 4 }}>
            {d.code}
            {d.rif ? ` · ${d.rif}` : ""}
            {d.revisione ? ` · revisione ${d.revisione}` : ""}
            {d.stato ? ` · ${d.stato}` : ""}
          </p>
          <h1 style={{ marginTop: 0 }}>{d.titolo}</h1>

          <RendeCorpus
            blocchi={dati.blocchi}
            override={dati.override}
            segnaposti={dati.segnaposti}
            contesto={dati.contesto}
          />

          {/* ⚠️ Il colophon senza codice di verifica, e la ragione è che questo documento
              non è congelato: un codice prometterebbe che ciò che si verifica è ciò che
              si ha in mano, e qui domani può essere diverso. Dice invece le due cose che
              qui sono vere: chi lo ha emesso e su quale edizione dei contenuti. */}
          <Colophon
            codice={null}
            emittente={marchio.nome}
            tipo={null}
            nome={d.titolo}
            anno={0}
            versione={0}
            edizione={contentSetId}
            pubblicatoIl={new Date().toISOString()}
            urlVerifica=""
          />
        </div>
      </article>
    </div>
  );
}
