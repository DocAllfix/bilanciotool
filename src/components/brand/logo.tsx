/* eslint-disable @next/next/no-img-element */
import { cn } from "@/lib/utils";

// Marchio EvalisDeck: file consegnati dal committente (public/brand/), qui si
// usano solo i derivati tecnici (stesso disegno, ritagliato e trasparente).
// Il wordmark accanto al monogramma è testo: sui fondi scuri il lockup
// orizzontale non esiste in variante chiara, e il testo scala meglio.

const SRC = {
  scuro: "/brand/derivati/monogramma.svg", // monogramma verde petrolio, per fondi chiari
  chiaro: "/brand/derivati/monogramma-chiaro.svg", // monogramma menta, per fondi scuri
} as const;

export function Monogramma({ suScuro = false, className }: { suScuro?: boolean; className?: string }) {
  return <img src={suScuro ? SRC.chiaro : SRC.scuro} alt="" aria-hidden className={cn("block", className)} />;
}

/**
 * Un lockup che cambia con il tema.
 *
 * ⚠️ DUE FILE E NON UNO, e la ragione e' che un `<img>` non eredita il colore. Le quattro
 * superfici che portano un lockup — accesso, intestazione e piede della vetrina, portale
 * cliente — usano tutte `bg-background`, che si rovescia col tema: in scuro la parola
 * «DECK» in petrolio su fondo quasi nero non si legge. L'oro del monogramma regge su
 * entrambi i fondi e non cambia; cambia solo la parola.
 *
 * Si rendono tutti e due e se ne nasconde uno con le classi, invece di scegliere in
 * JavaScript: leggere il tema nel client vorrebbe dire un lampeggio al primo caricamento,
 * ed e' proprio la pagina d'accesso — la prima che si vede.
 */
function Lockup({ chiaro, scuro, className }: { chiaro: string; scuro: string; className?: string }) {
  return (
    <>
      <img src={chiaro} alt="EvalisDeck" className={cn("block w-auto dark:hidden", className)} />
      <img src={scuro} alt="" aria-hidden className={cn("hidden w-auto dark:block", className)} />
    </>
  );
}

export function LogoOrizzontale({ className }: { className?: string }) {
  return (
    <Lockup
      chiaro="/brand/derivati/logo-orizzontale.svg"
      scuro="/brand/derivati/logo-orizzontale-suscuro.svg"
      className={className}
    />
  );
}

export function LogoVerticale({ className }: { className?: string }) {
  return (
    <Lockup
      chiaro="/brand/derivati/logo-verticale.svg"
      scuro="/brand/derivati/logo-verticale-suscuro.svg"
      className={className}
    />
  );
}
