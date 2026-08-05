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
// Riaprire la scelta **spegne Analytics subito**, senza aspettare la decisione: lo stato
// torna «non ha scelto», e `analiticaAttiva` risponde di no a tutto ciò che non è un
// consenso esplicito.

export function PreferenzeCookie({ className }: { className?: string }) {
  const consenso = useSyncExternalStore(iscriviConsenso, leggiConsenso, bannerNascostoSulServer);

  return (
    <button type="button" onClick={riapriScelta} className={className}>
      Preferenze cookie
      {consenso ? (
        <span className="sr-only">
          {consenso === "accettato"
            ? " (attualmente: misurazione accettata)"
            : " (attualmente: misurazione rifiutata)"}
        </span>
      ) : null}
    </button>
  );
}
