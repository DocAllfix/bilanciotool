"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { ChevronDown } from "lucide-react";


/**
 * L'elenco si passa sempre: la home usa `DOMANDE`, la pagina prezzi e le pagine dei
 * percorsi le loro.
 *
 * ⚠️ Niente valore predefinito importato da `domande.ts`: quel file legge i numeri dal
 * registro dei moduli e dal seme, e questo componente è `"use client"`. Un'importazione
 * qui li porterebbe tutti nel pacchetto del browser per mostrare sei domande.
 */
export function Faq({ domande }: { domande: [string, string][] }) {
  const [aperta, setAperta] = useState<number | null>(0);
  return (
    <div className="divide-y rounded-2xl border bg-card px-6">
      {domande.map(([q, a], i) => (
        <div key={q}>
          <button
            type="button"
            className="flex w-full items-center justify-between gap-4 py-4 text-left text-[15px] font-medium"
            aria-expanded={aperta === i}
            onClick={() => setAperta(aperta === i ? null : i)}
          >
            {q}
            <ChevronDown className={cn("size-4 shrink-0 text-muted-foreground transition-transform", aperta === i && "rotate-180")} />
          </button>
          <div className={cn("grid transition-all duration-300", aperta === i ? "grid-rows-[1fr] pb-4" : "grid-rows-[0fr]")}>
            <p className="overflow-hidden text-sm leading-relaxed text-muted-foreground">{a}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
