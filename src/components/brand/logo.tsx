/* eslint-disable @next/next/no-img-element */
import { cn } from "@/lib/utils";

// Marchio EvalisDeck.
//
// Il MONOGRAMMA è l'opera del committente: un vettore in oro con sei sfumature
// metalliche, e resta un file (`public/brand/derivati/`, ricavato dagli originali
// intoccabili da `scripts/prepara-brand.mjs`).
//
// ⚠️ La PAROLA invece è TESTO, e non lo era. Nel file consegnato è disegnata dentro il
// vettore, e questo costava tre cose:
//
//   · non seguiva il carattere del prodotto — era una forma, non un tipo, e accanto a
//     un'interfaccia in Bricolage Grotesque si vedeva;
//   · non seguiva il tema. Le quattro superfici che portano il marchio usano
//     `bg-background`, che si rovescia col tema, e la parola in petrolio su fondo quasi
//     nero non si leggeva: servivano due file per lockup e un `dark:` per alternarli;
//   · a misure piccole un disegno di lettere si impasta, mentre un testo lo rende il
//     motore tipografico con l'hinting che serve.
//
// È il modello di Evalis Academy, che accanto allo stesso monogramma scrive il nome come
// testo. Il colore è `text-primary`: petrolio in chiaro, petrolio chiarito in scuro — una
// tinta dichiarata in un posto solo, e nessuna variante da tenere allineata.
//
// ⚠️ LA PAROLA STA A DESTRA, SEMPRE, anche dove prima era sotto. Nell'opera consegnata è
// impilata; il committente la vuole di fianco, e per un marchio che vive quasi solo in
// barre alte quaranta pixel è anche la disposizione che funziona: impilato, il
// monogramma di una composizione verticale si riduce a poco più di venti pixel.
//
// ⚠️ Nota sul nome, perché è una decisione e non una svista: il monogramma È già la
// parola — quelle lettere sono `ea` sopra `lis`, cioè **evalis** — quindi il lockup dice
// «evalis» due volte. Academy fa lo stesso con «Evalis Academy». Se si volesse la sola
// «Deck», è una stringa in un posto solo, qui sotto.

const SRC = {
  scuro: "/brand/derivati/monogramma.svg", // monogramma in oro, per fondi chiari
  chiaro: "/brand/derivati/monogramma-chiaro.svg", // stesso oro: regge su entrambi i fondi
} as const;

/** Il nome, in un posto solo. */
const NOME = "Evalis Deck";

export function Monogramma({ suScuro = false, className }: { suScuro?: boolean; className?: string }) {
  return <img src={suScuro ? SRC.chiaro : SRC.scuro} alt="" aria-hidden className={cn("block", className)} />;
}

/**
 * Il marchio: monogramma e nome sulla stessa riga.
 *
 * ⚠️ Il chiamante passa una misura di TESTO (`text-lg`, `text-[25px]`), non un'altezza:
 * il simbolo si misura in `em` su quella. Il rapporto fra i due non cambia mai, e non
 * c'è nessuna unità che dipenda da ciò che si sta calcolando.
 */
function Marchio({ suScuro, className }: { suScuro?: boolean; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-[0.34em]", className)} role="img" aria-label={NOME}>
      {/* ⚠️ IL TESTO COMANDA, e il simbolo si misura in `em` su di lui.
       *
       * Le due versioni precedenti sbagliavano il verso, e in due modi diversi:
       *  · `text-[0.62em]` misurava sul font-size EREDITATO, non sull'altezza del
       *    marchio, e il nome restava a dieci pixel qualunque misura avesse il simbolo;
       *  · `cqh` con `@container` non trovava un'altezza (quello di Tailwind e'
       *    `inline-size`, traccia la sola larghezza) e ripiegava sul viewport, con un
       *    nome alto duecento pixel; e `container-type: size` toglieva all'elemento la
       *    larghezza dal contenuto, mandando il simbolo a zero e il nome a capo.
       *
       * Il verso giusto e' questo: il chiamante da' una misura di TESTO, il simbolo la
       * segue. Nessuna unita' che dipenda da cio' che si sta calcolando. */}
      <Monogramma suScuro={suScuro} className="h-[2.2em] w-auto shrink-0" />
      <span className="font-display font-semibold leading-none tracking-[-0.01em] text-primary whitespace-nowrap">
        {NOME}
      </span>
    </span>
  );
}

export function LogoOrizzontale({ className }: { className?: string }) {
  return <Marchio className={className} />;
}

/**
 * Resta con questo nome perché lo usano la pagina d'accesso e il portale cliente, ma la
 * composizione è la stessa: la parola sta a destra anche qui.
 */
export function LogoVerticale({ className }: { className?: string }) {
  return <Marchio className={className} />;
}
