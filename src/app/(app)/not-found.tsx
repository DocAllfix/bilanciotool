import Link from "next/link";
import { Compass } from "lucide-react";

import { Button } from "@/components/ui/button";

/**
 * La pagina che compare quando dentro l'applicazione si chiede qualcosa che non c'è.
 *
 * ⚠️ NON ESISTEVA, e la sua assenza non si vedeva da nessuna parte. Le pagine chiamano
 * `notFound()` in una ventina di punti — un'azienda di un altro studio, un esercizio mai
 * aperto, un percorso inventato nell'indirizzo — e senza questo file Next rendeva il
 * guscio dell'applicazione con dentro il NULLA: barra laterale, intestazione, piede, e in
 * mezzo lo spazio bianco. Chi ci finiva non leggeva «non c'è», leggeva «è rotto».
 *
 * L'ha trovata il collaudo della formazione chiedendo un corso inventato: si aspettava un
 * 404 e ha ricevuto 200, e il corpo stampato nel referto era la barra laterale e basta.
 *
 * ⚠️ E il rimando è al PORTAFOGLIO, non «indietro». Chi arriva qui ci arriva quasi sempre
 * da un indirizzo salvato o da un collegamento vecchio: mandarlo indietro lo rimette
 * esattamente dove non funzionava.
 */
export default function NonTrovata() {
  return (
    <div className="mx-auto flex w-full max-w-xl flex-col items-start py-20">
      <Compass className="size-8 text-muted-foreground" strokeWidth={1.5} aria-hidden />
      <h1 className="font-display mt-5 text-[26px] font-bold tracking-[-0.02em]">Questa pagina non c&apos;è</h1>
      <p className="mt-2 max-w-prose text-[14.5px] leading-relaxed text-muted-foreground">
        L&apos;indirizzo non corrisponde a niente: può essere un collegamento vecchio, un esercizio
        che non è mai stato aperto, o un&apos;azienda che è stata archiviata. Nessun dato è andato
        perso.
      </p>
      <div className="mt-6 flex flex-wrap gap-2">
        <Button asChild size="sm">
          <Link href="/dashboard">Vai al portafoglio</Link>
        </Button>
        <Button asChild variant="outline" size="sm">
          <Link href="/guida">Guida all&apos;uso</Link>
        </Button>
      </div>
    </div>
  );
}
