"use client";

import { useState } from "react";
import { Sparkles } from "lucide-react";

// Un valore proposto da un altro percorso, accanto a un campo VUOTO.
//
// ⚠️ Si propone, non si scrive: il dato resta dove nasce (il bilancio energetico, l'inventario
// GHG, l'anagrafica), e copiarlo in silenzio farebbe due numeri destinati a divergere. Un
// clic lo applica, e da lì il campo è del consulente. La fonte si dice sempre: un numero
// comparso senza sapere da dove è un numero di cui nessuno risponde.

/**
 * «612000.5» → «612.000,5». A mano, e non con `toLocaleString`: dipende dall'ICU del runtime,
 * e server e browser ne hanno due diversi — lo stesso numero scritto in due modi fa buttare
 * via la pagina a React (#418).
 */
function numeroItaliano(v: string): string {
  const [intero, decimali] = v.split(".");
  const segno = intero.startsWith("-") ? "-" : "";
  const cifre = intero.replace("-", "").replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  const dec = (decimali ?? "").replace(/0+$/, "");
  return `${segno}${cifre}${dec ? `,${dec}` : ""}`;
}

export function PropostaValore({
  valore,
  fonte,
  um,
  applica,
  etichetta,
}: {
  valore: string;
  fonte: string;
  um?: string;
  /** Salva il valore: deve fare la stessa cosa che fa il campo quando lo si scrive a mano. */
  applica: (valore: string) => Promise<void>;
  /** Per il nome accessibile del pulsante: che cosa si sta compilando. */
  etichetta: string;
}) {
  const [inCorso, setInCorso] = useState(false);
  return (
    <button
      type="button"
      data-proposta-valore
      disabled={inCorso}
      onClick={async () => {
        setInCorso(true);
        try {
          await applica(valore);
        } finally {
          setInCorso(false);
        }
      }}
      aria-label={`Usa ${numeroItaliano(valore)}${um ? ` ${um}` : ""} per ${etichetta}, ${fonte}`}
      className="mt-1 inline-flex max-w-full items-center gap-1 rounded border border-dashed border-primary/40 px-1.5 py-0.5 text-left text-[11px] text-primary transition-colors hover:bg-accent disabled:opacity-50"
    >
      <Sparkles className="size-3 shrink-0" aria-hidden />
      <span className="truncate">
        Usa {numeroItaliano(valore)}
        {um ? ` ${um}` : ""}{" "}
        <span className="text-muted-foreground">{fonte}</span>
      </span>
    </button>
  );
}
