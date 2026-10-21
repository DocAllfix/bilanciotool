"use client";

import { useSyncExternalStore } from "react";
import { bannerNascostoSulServer, iscriviConsenso, leggiConsenso, riapriScelta } from "@/features/consenso/stato";

// Il ripensamento.
//
// Le Linee guida del Garante chiedono che il consenso sia revocabile «con la stessa
// facilità» con cui è stato dato. Non basta dire nella cookie policy che si possono
// cancellare i cookie dal browser: quella è una istruzione per l'utente, non un comando del
// sito. Qui il comando c'è, sta nel piede di ogni pagina pubblica e dentro la cookie policy,
// e riapre esattamente il riquadro di prima.
//
// Riaprire la scelta **spegne la misurazione subito**, senza aspettare la decisione: lo
// stato torna «non ha scelto», e se gtag era già in pagina il documento si ricarica senza
// (gtag, una volta scaricato, non si spegne in altro modo: vedi `analytics.tsx`).

const DESCRIZIONE = {
  accettato: "statistiche e pubblicità accettate",
  statistiche: "solo statistiche accettate",
  pubblicita: "solo pubblicità accettata",
  rifiutato: "statistiche e pubblicità rifiutate",
} as const;

export function PreferenzeCookie({ className }: { className?: string }) {
  const consenso = useSyncExternalStore(iscriviConsenso, leggiConsenso, bannerNascostoSulServer);

  return (
    <button type="button" onClick={riapriScelta} className={className}>
      Preferenze cookie
      {consenso ? (
        <span className="sr-only">
          {` (attualmente: ${DESCRIZIONE[consenso]})`}
        </span>
      ) : null}
    </button>
  );
}
