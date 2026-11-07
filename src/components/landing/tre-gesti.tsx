"use client";

import Image from "next/image";
import { useState } from "react";
import { cn } from "@/lib/utils";

// I TRE GESTI, con una schermata vera per ciascuno.
//
// ⚠️ Schermate vere del prodotto, non riquadri disegnati: la versione precedente
// ricostruiva l'interfaccia con dei `div`, e una finta si riconosce. Le immagini si
// rifanno con `scripts/foto-gesti.mjs` dall'azienda dimostrativa.
//
// Da schermo largo è un elenco di tre schede con la schermata accanto; da telefono le tre
// voci stanno una sotto l'altra, ognuna con la sua schermata: le schede su uno schermo
// stretto nasconderebbero due terzi del contenuto dietro un gesto.

export type Gesto = { titolo: string; testo: string; immagine: string; alt: string };

export function TreGesti({ gesti }: { gesti: Gesto[] }) {
  const [attivo, setAttivo] = useState(0);
  return (
    <div className="grid gap-10 md:grid-cols-[minmax(0,22rem)_1fr] md:gap-14">
      <div role="tablist" aria-label="Come funziona" className="hidden md:flex md:flex-col">
        {gesti.map((g, i) => (
          <button
            key={g.titolo}
            type="button"
            role="tab"
            id={`gesto-${i}`}
            aria-selected={attivo === i}
            aria-controls={`schermata-${i}`}
            onClick={() => setAttivo(i)}
            className={cn(
              "border-t py-5 text-left transition-colors duration-150 last:border-b",
              attivo === i ? "border-foreground" : "text-muted-foreground hover:text-foreground",
            )}
          >
            <span className="font-display text-title font-semibold">{g.titolo}</span>
            <span className="mt-1.5 block text-[15px] leading-relaxed">{g.testo}</span>
          </button>
        ))}
      </div>

      <div>
        {gesti.map((g, i) => (
          <div
            key={g.titolo}
            id={`schermata-${i}`}
            role="tabpanel"
            aria-labelledby={`gesto-${i}`}
            className={cn("mb-10 last:mb-0 md:mb-0", attivo !== i && "md:hidden")}
          >
            <div className="md:hidden">
              <p className="font-display text-title font-semibold">{g.titolo}</p>
              <p className="mt-1.5 text-[15px] leading-relaxed text-muted-foreground">{g.testo}</p>
            </div>
            <div className="mt-4 overflow-hidden rounded-xl border bg-card shadow-xl shadow-foreground/10 md:mt-0">
              <Image src={g.immagine} alt={g.alt} width={1600} height={1000} sizes="(min-width: 768px) 640px, 100vw" className="h-auto w-full" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
