import { DOC } from "./charts";
import { fmtData } from "@/lib/format";
import { DOCUMENTI, SENZA_ESERCIZIO, type TipoDocumento } from "@/features/documents/tipi";

// Il colophon di emissione, in fondo a OGNI documento.
//
// ⚠️ Vive nella pagina del documento e non nei dodici template, ed è deliberato: è la
// stessa strozzatura in cui vive il marchio congelato. Metterlo in ciascun template
// significherebbe dimenticarlo nel tredicesimo — e un documento senza codice non potrà
// mai averne uno, perché il PDF che il cliente ha in mano è già stato consegnato.
//
// ⚠️ Il colophon nomina lo STUDIO, non noi. Chi paga il white-label per togliere il
// nostro marchio dai documenti non gradirebbe un piede che ce lo rimette: `emittente` è
// il nome congelato nello snapshot, che con l'estensione attiva è quello dello studio.
// Vedi `features/documents/marchio.ts`.

export function Colophon({
  codice,
  emittente,
  tipo,
  nome,
  anno,
  versione,
  edizione,
  pubblicatoIl,
  urlVerifica,
}: {
  /** `null` per i documenti pubblicati prima che il codice esistesse. */
  codice: string | null;
  emittente: string;
  /** `null` per i documenti del corpus, che non sono un tipo pubblicabile. */
  tipo: TipoDocumento | null;
  /** Il nome, quando non viene dal registro dei tipi (procedure e moduli del corpus). */
  nome?: string;
  anno: number;
  versione: number;
  /**
   * L'edizione dei contenuti metodologici con cui il documento e' stato prodotto.
   *
   * ⚠️ Non e' la revisione del documento, ed e' la distinzione che conta: la revisione
   * dice quante volte l'ha ripubblicato lo studio, l'edizione dice su quale versione
   * delle guide, dei cataloghi e dei modelli e' stato redatto. Le norme si aggiornano, e
   * un documento su un'edizione superata resta autentico senza essere aggiornato. Sui
   * documenti emessi prima che l'edizione si congelasse e' `null`, e allora non si
   * stampa: meglio tacere che inventare.
   */
  edizione: string | null;
  pubblicatoIl: string;
  urlVerifica: string;
}) {
  const titolo = nome ?? (tipo ? DOCUMENTI[tipo].nome : "Documento");
  return (
    <section
      aria-label="Colophon di emissione"
      style={{
        borderTop: `1px solid ${DOC.line}`,
        marginTop: "26px",
        paddingTop: "12px",
        // ⚠️ Il colophon non si stacca dal documento andando a pagina nuova da solo:
        // un foglio con sopra soltanto un codice sembra un allegato di qualcun altro.
        breakInside: "avoid",
      }}
    >
      <table style={{ width: "100%", fontSize: "8.7pt", borderCollapse: "collapse" }}>
        <tbody>
          <tr>
            <td style={{ width: "62%", verticalAlign: "top", padding: 0, border: "none" }}>
              <p className="doc-meta" style={{ margin: 0 }}>
                <strong>{titolo}</strong>
                {anno !== SENZA_ESERCIZIO ? ` · esercizio ${anno}` : ""}
                {versione > 0 ? ` · revisione ${versione}` : ""}
                {edizione ? ` · contenuti ${edizione}` : ""}
              </p>
              <p className="doc-meta" style={{ margin: "2px 0 0" }}>
                Emesso da <strong>{emittente}</strong> il {fmtData(pubblicatoIl.slice(0, 10))}.
              </p>
              <p className="doc-meta" style={{ margin: "2px 0 0" }}>
                I valori sono congelati alla data di emissione: modifiche successive ai dati non alterano
                questa revisione.
              </p>
            </td>
            <td style={{ verticalAlign: "top", padding: "0 0 0 14px", border: "none", textAlign: "right" }}>
              {!codice && !urlVerifica ? null : codice ? (
                <>
                  <p className="doc-meta" style={{ margin: 0 }}>
                    Codice di verifica
                  </p>
                  <p
                    className="doc-mono"
                    style={{ margin: "1px 0 0", fontSize: "11pt", fontWeight: 600, letterSpacing: "0.04em" }}
                  >
                    {codice}
                  </p>
                  <p className="doc-meta" style={{ margin: "2px 0 0" }}>
                    Chiunque può confermarne l&apos;autenticità su
                    <br />
                    <span className="doc-mono">{urlVerifica}</span>
                  </p>
                </>
              ) : (
                <p className="doc-meta" style={{ margin: 0 }}>
                  Documento emesso prima
                  <br />
                  dell&apos;introduzione del codice
                  <br />
                  di verifica.
                </p>
              )}
            </td>
          </tr>
        </tbody>
      </table>
    </section>
  );
}
