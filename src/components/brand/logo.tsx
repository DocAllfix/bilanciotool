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

export function LogoOrizzontale({ className }: { className?: string }) {
  return (
    <img
      src="/brand/derivati/logo-orizzontale.svg"
      alt="EvalisDeck"
      className={cn("block w-auto", className)}
    />
  );
}

export function LogoVerticale({ className }: { className?: string }) {
  return (
    <img
      src="/brand/derivati/logo-verticale.svg"
      alt="EvalisDeck"
      className={cn("block w-auto", className)}
    />
  );
}
