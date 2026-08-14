"use client";

import { useRef } from "react";

// La coda che mette in fila i salvataggi.
//
// Nasce da un difetto vero, registrato in `CLAUDE.md` alla Fase 13: quando un'interfaccia
// accetta molti input in rapida successione — le 37 domande dell'autovalutazione, i 174
// controlli della SoA — le scritture partono tutte insieme e il ricalcolo del punteggio
// chiede il totale mentre le ultime sono ancora in volo. Si vedeva un numero che non
// esisteva: i dati erano corretti, era la vista a mostrare il passato.
//
// Era scritta due volte, identica, in `soa/vista-controlli.tsx` e
// `supplier/vista-questionario.tsx`.
//
// `then(f, f)` e non `then(f)`: il lavoro successivo deve partire **anche se il
// precedente è fallito**. Altrimenti un solo salvataggio rifiutato blocca la coda per il
// resto della sessione, e da lì in poi non si salva più niente senza che nulla lo dica.
//
// `coda.current = next.catch(...)` tiene la catena sempre risolvibile, mentre `next` —
// quella che si restituisce — conserva il rifiuto, così chi chiama può ancora gestirlo.

export type Accoda = <T>(f: () => Promise<T>) => Promise<T>;

/**
 * Restituisce la funzione che accoda, e la promessa da attendere prima di leggere un
 * totale calcolato dal server.
 */
export function useCoda(): { accoda: Accoda; attesa: () => Promise<unknown> } {
  const coda = useRef<Promise<unknown>>(Promise.resolve());

  const accoda: Accoda = (f) => {
    const next = coda.current.then(f, f);
    coda.current = next.catch(() => undefined);
    return next;
  };

  return { accoda, attesa: () => coda.current };
}
