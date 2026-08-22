import type { ReactNode } from "react";
import { unita, componi, type Blocco } from "@/lib/calc/corpus/blocchi";
import { sostituisci, type Segnaposto, type Contesto } from "@/lib/calc/corpus/segnaposto";

// Resa server-side di un documento del corpus.
//
// Le decisioni di struttura — quale paragrafo è un titolo, quale riga è un'intestazione,
// quali tabelle spezzate si ricompongono — stanno tutte in `src/lib/calc/corpus/blocchi.ts`
// e sono provate lì. Qui c'è solo il markup, così la stessa logica vale a schermo e in
// stampa e non può divergere fra i due.
//
// Nessuna classe di colore: il documento vive nel registro editoriale `(document)` e la
// vista di lavoro nel registro dell'applicazione. Il markup è lo stesso, lo stile lo
// mette il contesto.

/** I segnaposto non risolti restano visibili e si vedono. */
function conSegnaposto(testo: string): ReactNode {
  const pezzi = testo.split(/(\[[^\]\[\n]{1,60}\])/g);
  if (pezzi.length === 1) return testo;
  return pezzi.map((p, i) =>
    /^\[[^\]\[\n]{1,60}\]$/.test(p) ? (
      <span key={i} className="corpus-mancante" data-mancante="">
        {p}
      </span>
    ) : (
      <span key={i}>{p}</span>
    ),
  );
}

/** Gli a capo dentro una cella o un paragrafo sono significativi.
 *
 *  Senza a capo NON si avvolge niente: un `<span>` attorno al testo di ogni cella sarebbe
 *  un nodo in più per ognuna delle 13.618 celle del corpus, e in stampa non serve a nulla. */
function conACapo(testo: string): ReactNode {
  if (!testo.includes("\n")) return conSegnaposto(testo);
  const righe = testo.split("\n");
  return righe.map((r, i) => (
    <span key={i}>
      {i > 0 && <br />}
      {conSegnaposto(r)}
    </span>
  ));
}

export type Props = {
  blocchi: readonly Blocco[];
  /** Il testo su misura del cliente, per chiave di blocco. */
  override?: Readonly<Record<string, string>>;
  segnaposti: readonly Segnaposto[];
  contesto: Contesto;
};

export function RendeCorpus({ blocchi, override = {}, segnaposti, contesto }: Props) {
  const risolvi = (t: string) => sostituisci(t, segnaposti, contesto);

  return (
    <>
      {unita(componi(blocchi, override)).map((u, i) => {
        if (u.tipo === "firme") {
          return (
            <div key={u.blockId} className="corpus-firme" data-blocco={u.blockId}>
              {["Data · Funzione · Firma", "Data · Funzione · Firma"].map((etichetta, j) => (
                <div key={j} className="corpus-firma">
                  {etichetta}
                </div>
              ))}
            </div>
          );
        }

        if (u.tipo === "sezione") {
          return (
            <div key={u.blockId} className="corpus-sezione" data-blocco={u.blockId}>
              {conSegnaposto(risolvi(u.testo))}
            </div>
          );
        }

        if (u.tipo === "paragrafo") {
          const testo = risolvi(u.testo);
          if (u.livello === 1) {
            return (
              <h3 key={u.blockId} data-blocco={u.blockId}>
                {conSegnaposto(testo)}
              </h3>
            );
          }
          if (u.livello === 2) {
            return (
              <h4 key={u.blockId} data-blocco={u.blockId}>
                {conSegnaposto(testo)}
              </h4>
            );
          }
          return (
            <p key={u.blockId} data-blocco={u.blockId}>
              {conACapo(testo)}
            </p>
          );
        }

        // Tabella. `blockIds` ne ha più di uno quando era spezzata in blocchi da una riga.
        return (
          <table key={u.blockIds[0] ?? `t-${i}`} data-blocco={u.blockIds.join(" ")}>
            {u.intestazione && (
              <thead>
                <tr>
                  {u.intestazione.map((c, j) => (
                    <th key={j}>{conACapo(risolvi(c))}</th>
                  ))}
                </tr>
              </thead>
            )}
            <tbody>
              {u.righe.map((riga, j) => (
                <tr key={j}>
                  {riga.map((c, k) => (
                    <td key={k}>{conACapo(risolvi(c))}</td>
                  ))}
                </tr>
              ))}
              {/* Le righe da compilare a mano: quante ne chiede il corpus, non un tetto. */}
              {Array.from({ length: u.vuote }, (_, j) => (
                <tr key={`vuota-${j}`} className="corpus-riga-vuota">
                  {Array.from({ length: u.colonne }, (_, k) => (
                    <td key={k}>&nbsp;</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        );
      })}
    </>
  );
}
