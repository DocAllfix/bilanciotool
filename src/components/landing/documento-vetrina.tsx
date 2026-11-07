import localFont from "next/font/local";
import Link from "next/link";
import { AZIENDA_ESEMPIO, CODICE_ESEMPIO, STATI_ESEMPIO } from "./apertura-dati";

// UN DOCUMENTO VERO, nell'apertura della home: una prova invece di un'illustrazione.
//
// È la copertina di un rapporto come esce dal prodotto, con lo stesso carattere dei
// documenti (Source Serif 4, ospitato da noi: vedi `app/(document)/layout.tsx`). In fondo
// c'è il codice di verifica, e si clicca: apre la pagina pubblica che conferma chi ha
// emesso il documento, per chi e in quale versione. Nessun concorrente lo può mostrare.
//
// ⚠️ Misure in `cqw`, cioè in proporzione alla larghezza del foglio: è una composizione in
// un formato fisso (A4), e con misure in pixel esisterebbe a una larghezza sola. È il
// difetto che la pila di documenti precedente aveva da telefono.
// ⚠️ La costante NON si chiama `serif`: next/font ricava il nome della famiglia dal nome
// della costante, e «serif» è una parola riservata del CSS. La regola usciva come
// `font-family:"serif",serif Fallback`, che il browser scarta perché non è valida, e il
// foglio si leggeva in Geist senza un errore da nessuna parte. Misurato sullo stile
// calcolato, non a occhio.
const sourceSerif = localFont({
  src: "../../fonts/source-serif-4-latin.woff2",
  weight: "200 900",
  style: "normal",
  display: "swap",
});

const INDICE = [
  "Confini dell'organizzazione e del rapporto",
  "Sorgenti, con le esclusioni motivate",
  "Dati di attività e fattori di emissione",
  "Emissioni per categoria e per gas",
  "Incertezza, obiettivi e verifica",
];

export function DocumentoVetrina() {
  return (
    <figure className="@container mx-auto w-full max-w-[440px]">
      <div className="relative aspect-[210/297] rounded-[3px] bg-carta text-inchiostro shadow-2xl shadow-foreground/15 ring-1 ring-foreground/10">
        <p className="absolute right-[7cqw] top-0 rounded-b-[1.2cqw] bg-inchiostro px-[2.4cqw] py-[1cqw] text-[2.5cqw] font-medium tracking-wide text-carta">
          Documento d&apos;esempio
        </p>

        <div className="flex h-full flex-col px-[9cqw] pb-[6cqw] pt-[10cqw]">
          <div className="flex items-baseline justify-between text-[2.7cqw] uppercase tracking-[0.14em] opacity-70">
            <span>{AZIENDA_ESEMPIO.nome}</span>
            <span>Esercizio 2025</span>
          </div>

          <div className={`${sourceSerif.className} mt-[10cqw]`}>
            <p className="text-[3.2cqw] italic opacity-75">Rapporto d&apos;inventario</p>
            <p className="mt-[2cqw] text-[7.4cqw] font-semibold leading-[1.08] tracking-[-0.01em]">
              Inventario dei gas a effetto serra
            </p>
            <p className="mt-[3cqw] text-[3.3cqw] leading-snug opacity-80">
              Redatto secondo la UNI EN ISO 14064-1:2018, punto 9.3.1
            </p>
          </div>

          <ol className={`${sourceSerif.className} mt-[6cqw] space-y-[1.2cqw] border-t border-inchiostro/20 pt-[4cqw] text-[3cqw]`}>
            {INDICE.map((voce, i) => (
              <li key={voce} className="flex gap-[3cqw]">
                <span className="w-[3cqw] tabular-nums opacity-60">{i + 1}</span>
                <span>{voce}</span>
              </li>
            ))}
          </ol>

          <div className="mt-auto rounded-[1.4cqw] border border-inchiostro/20 px-[4cqw] py-[3cqw]">
            <p className="text-[2.6cqw] opacity-70">Versione {STATI_ESEMPIO.ghg.stato === "pubblicato" ? STATI_ESEMPIO.ghg.versione : 1} · congelata alla pubblicazione</p>
            <p className="mt-[1.6cqw] text-[2.6cqw] uppercase tracking-[0.12em] opacity-70">Codice di verifica</p>
            <Link
              href={`/verifica?codice=${CODICE_ESEMPIO}`}
              className="mt-[0.6cqw] inline-block font-mono text-[5.2cqw] font-semibold tracking-[0.04em] text-vetrina-petrolio underline decoration-vetrina-petrolio/40 underline-offset-[1cqw] hover:decoration-vetrina-petrolio"
            >
              {CODICE_ESEMPIO}
            </Link>
            <p className="mt-[0.8cqw] text-[2.6cqw] opacity-70">Verificalo su evalisdeck.it/verifica</p>
          </div>
        </div>
      </div>
    </figure>
  );
}
