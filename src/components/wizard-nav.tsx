"use client";

import { Button } from "@/components/ui/button";
import { ArrowLeft, ArrowRight } from "lucide-react";

// Piede dei percorsi guidati: sempre un modo esplicito per tornare indietro
// e proseguire, oltre alla barra dei passi in alto.
export function WizardNav({
  passo,
  totale,
  nomi,
  vai,
}: {
  passo: number;
  totale: number;
  nomi: readonly string[];
  vai: (n: number) => void;
}) {
  const prec = passo > 1 ? nomi[passo - 2] : null;
  const succ = passo < totale ? nomi[passo] : null;
  return (
    <div className="mt-8 flex items-center justify-between gap-3 border-t pt-5">
      {prec ? (
        <Button variant="outline" onClick={() => vai(passo - 1)} aria-label={`Torna al passo ${passo - 1}: ${prec}`}>
          <ArrowLeft className="size-4" /> {prec}
        </Button>
      ) : (
        <span />
      )}
      <span className="text-xs text-muted-foreground" data-slot="kpi">
        Passo {passo} di {totale}
      </span>
      {succ ? (
        <Button onClick={() => vai(passo + 1)} aria-label={`Vai al passo ${passo + 1}: ${succ}`}>
          {succ} <ArrowRight className="size-4" />
        </Button>
      ) : (
        <span />
      )}
    </div>
  );
}
