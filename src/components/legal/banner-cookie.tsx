"use client";

import { useSyncExternalStore } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { bannerNascostoSulServer, iscriviConsenso, leggiConsenso, scegli } from "@/features/consenso/stato";

// Il banner di consenso.
//
// Sostituisce l'informativa a un pulsante che c'era prima: finché il sito usava solo cookie
// tecnici, l'art. 122 del Codice privacy chiedeva l'informativa e NON il consenso, e mettere
// «accetta / rifiuta» avrebbe promesso una scelta che non esisteva. Con Google Analytics la
// situazione cambia: è misurazione di terze parti, e il consenso va chiesto **prima**.
//
// COME SONO DISPOSTI I PULSANTI, e perché non è un dettaglio estetico. Le Linee guida del
// Garante del 10 giugno 2021 chiedono che rifiutare sia facile quanto accettare: stesso
// numero di clic, stessa evidenza, nessuna scelta preselezionata. Qui «Rifiuta» viene
// **prima**, ha la stessa dimensione e sta nello stesso riquadro: nessuna delle due strade
// è più corta dell'altra. La contestazione più frequente riguarda proprio il rifiuto
// nascosto dietro un secondo passaggio.
//
// Non c'è una X per chiudere senza scegliere: chiudere senza decidere lascerebbe lo stato in
// sospeso, e uno stato in sospeso vale come rifiuto — meglio dirlo con un pulsante che
// lasciarlo intuire.

export function BannerCookie() {
  const consenso = useSyncExternalStore(iscriviConsenso, leggiConsenso, bannerNascostoSulServer);
  const pathname = usePathname();

  // Il documento pubblicato è un altro registro, ed è la pagina che Chromium trasforma in
  // PDF: un riquadro fisso in fondo finirebbe stampato dentro il documento del cliente.
  const dentroUnDocumento = pathname?.startsWith("/documento/") ?? false;

  if (consenso !== null || dentroUnDocumento) return null;

  return (
    <div
      role="dialog"
      aria-live="polite"
      aria-label="Consenso ai cookie di misurazione"
      className="fixed inset-x-3 bottom-3 z-50 mx-auto max-w-3xl rounded-xl border bg-card p-4 shadow-lg print:hidden sm:inset-x-5 sm:bottom-5 sm:p-5"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-6">
        <p className="text-[13.5px] leading-relaxed text-muted-foreground">
          Usiamo <strong className="font-medium text-foreground">cookie tecnici</strong>, necessari al funzionamento, e
          con il tuo consenso <strong className="font-medium text-foreground">Google Analytics</strong> per capire quali
          pagine sono utili. Nessuna pubblicità, nessuna profilazione. Se rifiuti, il sito funziona esattamente allo
          stesso modo. Il dettaglio è nella{" "}
          <Link href="/cookie" className="font-medium text-primary hover:underline">
            cookie policy
          </Link>
          .
        </p>
        <div className="flex shrink-0 gap-2">
          <Button size="sm" variant="outline" onClick={() => scegli("rifiutato")} className="min-w-24 flex-1 sm:flex-none">
            Rifiuta
          </Button>
          <Button size="sm" onClick={() => scegli("accettato")} className="min-w-24 flex-1 sm:flex-none">
            Accetta
          </Button>
        </div>
      </div>
    </div>
  );
}
