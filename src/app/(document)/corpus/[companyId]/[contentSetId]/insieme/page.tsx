import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { requireConsultant } from "@/features/auth/guards";
import { documentoCorpus, listaCorpus } from "@/features/corpus/letture";
import { anagraficaPerEdizione } from "@/features/corpus/anagrafiche";
import { RendeCorpus } from "@/components/corpus/rende-corpus";
import { Colophon } from "@/components/documento/colophon";
import { marchioDelloStudio } from "@/features/documents/marchio";

// La stampa di un INSIEME di documenti del corpus: una fase intera, o tutte.
//
// ⚠️ Nasce da una domanda del committente sul Modello 231, dove il prototipo sa esportare
// la sola «parte generale» — nove procedure su diciotto — tenendo indietro la parte
// speciale. Ha senso commerciale: si consegna un primo blocco e il resto dopo.
//
// ⚠️ Ma NON e' un interruttore di esportazione, ed e' la differenza che conta. La
// divisione e' una PROPRIETA' dei documenti, e il corpus la porta gia' scritta nel campo
// `fase`: il 231 ha nove procedure «Parte generale» e nove «Parte speciale». Costruita
// come modalita' di stampa, esisterebbe in un posto solo e verrebbe dimenticata nel
// successivo; derivata dal dato, vale per qualunque corpus che abbia fasi, oggi e domani,
// senza che nessuno debba ricordarsene.
//
// ⚠️ E non si generalizza oltre il dato: dove `fase` non distingue niente, la selezione
// non compare. Inventare fasi che il corpus non ha sarebbe peggio che non averle.

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Corpus", robots: { index: false, follow: false } };

export default async function StampaInsiemePage({
  params,
  searchParams,
}: {
  params: Promise<{ companyId: string; contentSetId: string }>;
  searchParams: Promise<{ fase?: string; tipo?: string }>;
}) {
  const { companyId, contentSetId } = await params;
  const { fase, tipo } = await searchParams;
  const s = await requireConsultant();

  const anagrafica = await anagraficaPerEdizione(s.userId, s.orgId, companyId, contentSetId);
  if (!anagrafica) notFound();

  const genere = tipo === "modulo" ? "modulo" : "procedura";
  const [tutte, marchio] = await Promise.all([
    listaCorpus(s.userId, s.orgId, companyId, contentSetId, genere),
    marchioDelloStudio(s.orgId),
  ]);

  const scelte = fase ? tutte.filter((v) => v.fase === fase) : tutte;
  if (!scelte.length) notFound();

  const documenti = [];
  for (const v of scelte) {
    const d = await documentoCorpus(s.userId, s.orgId, companyId, contentSetId, v.code, anagrafica);
    if (d) documenti.push(d);
  }

  const titolo = fase ?? (genere === "procedura" ? "Procedure" : "Modulistica");
  const org = String(anagrafica.ragione ?? "");

  return (
    <div className="px-4 py-4">
      <article className="doc-pagina">
        <div className="doc-cover">
          <div className="testo">
            <p className="kicker">{genere === "procedura" ? "Corpo procedurale" : "Modulistica"}</p>
            <h1>{titolo}</h1>
            {org && <p className="sotto">{org}</p>}
            <p className="sotto" style={{ marginTop: 8, opacity: 0.7 }}>
              {documenti.length} document{documenti.length === 1 ? "o" : "i"} · contenuti {contentSetId}
            </p>
          </div>
          <div className="filo" />
        </div>

        <div className="doc-corpo">
          <h2>Indice</h2>
          <table>
            <tbody>
              {documenti.map((d) => (
                <tr key={d.documento.code}>
                  <td style={{ width: "22%" }} className="doc-mono">
                    {d.documento.code}
                  </td>
                  <td>{d.documento.titolo}</td>
                  <td style={{ width: "16%" }}>rev {d.documento.revisione}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {documenti.map((d) => (
            // ⚠️ Ogni documento comincia su una pagina nuova: consegnati in un fascicolo
            // unico, due procedure che si accavallano sullo stesso foglio non si possono
            // staccare, e questi documenti si firmano uno per uno.
            <section key={d.documento.code} style={{ breakBefore: "page" }}>
              <p className="doc-meta" style={{ marginBottom: 4 }}>
                {d.documento.code}
                {d.documento.rif ? ` · ${d.documento.rif}` : ""} · revisione {d.documento.revisione}
              </p>
              <h1 style={{ marginTop: 0 }}>{d.documento.titolo}</h1>
              <RendeCorpus
                blocchi={d.blocchi}
                override={d.override}
                segnaposti={d.segnaposti}
                contesto={d.contesto}
              />
            </section>
          ))}

          <Colophon
            codice={null}
            emittente={marchio.nome}
            tipo={null}
            nome={titolo}
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
