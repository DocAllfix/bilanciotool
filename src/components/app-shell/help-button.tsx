"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { findTourForPath } from "@/lib/tour/registry";
import { MODULI_AZIENDA } from "@/features/companies/moduli";
import { avviaTour, tourGiaVisto, attendiElemento } from "@/lib/tour/avvia";
import { benvenutoGiaVisto } from "@/lib/tour/presentazione";
import { Button } from "@/components/ui/button";
import { CircleHelp, GraduationCap, X } from "lucide-react";

// L'aiuto della pagina corrente: il tour, e il corso del percorso su cui sei.
//
// La regia del tour sta in `lib/tour/avvia.ts`: la usa anche la sequenza di benvenuto, e
// due copie della stessa logica divergono al primo aggiustamento.
//
// - Il tour parte da solo alla PRIMA visita di ogni pagina, poi solo a richiesta (se il
//   browser rifà vedere il tour, meglio che non vederlo mai).
// - prefers-reduced-motion → il tour non parte da solo, resta disponibile dal bottone.

/** L'invito al corso si mostra una volta sola per percorso. */
const CHIAVE_INVITO = (modulo: string) => `evalisdeck-corso-proposto:${modulo}`;

function invitoGiaFatto(modulo: string): boolean {
  try {
    return Boolean(localStorage.getItem(CHIAVE_INVITO(modulo)));
  } catch {
    return false;
  }
}

function segnaInvitoFatto(modulo: string): void {
  try {
    localStorage.setItem(CHIAVE_INVITO(modulo), "1");
  } catch {}
}

export function HelpButton({ inProva = false }: { inProva?: boolean }) {
  const pathname = usePathname();
  const tour = findTourForPath(pathname);
  const partito = useRef<string | null>(null);
  const [invito, setInvito] = useState<string | null>(null);

  // Su quale percorso siamo, se siamo su un percorso.
  //
  // ⚠️ SI RICAVA DALL'INDIRIZZO, non dal tour. Prima veniva dal `pageId` del tour, e la
  // conseguenza era che sul dodicesimo percorso — l'unico senza giro guidato — non
  // compariva NIENTE: né il tour, che non c'è, né il pulsante della formazione, che invece
  // esiste. Il corso di un percorso non dipende dal fatto che qualcuno gli abbia scritto
  // un tour, e legare le due cose le fa mancare insieme.
  //
  // Il confronto passa dal registro dei moduli: un percorso rinominato rompe il
  // compilatore invece di sparire in silenzio dalla formazione.
  const modulo =
    MODULI_AZIENDA.find((m) => new RegExp(`^/aziende/[^/]+/${m.href}(/|$)`).test(pathname))?.href ?? null;

  /**
   * Che cosa succede quando un tour finisce.
   *
   * ⚠️ È LO STESSO per il tour automatico e per quello chiesto col pulsante, e prima non lo
   * era: il pulsante chiamava `avviaTour(tour)` senza seguito, quindi chi premeva «Tour» e
   * arrivava in fondo non riceveva niente. Lo stesso gesto con due conseguenze diverse a
   * seconda di come era cominciato, e la differenza non la può indovinare nessuno.
   *
   * L'invito è legato al fatto — «hai appena finito il giro di questo percorso» — non a
   * chi ha premuto per primo. E si mostra comunque una volta sola per percorso.
   *
   * ⚠️ E solo se COMPLETATO. Chi lo interrompe dice «basta spiegazioni», non «basta
   * prodotto»: proporgli un corso da venti minuti è la cosa più sbagliata in quel momento.
   */
  const seguito = useCallback(
    (completato: boolean) => {
      if (!completato || !modulo) return;
      if (invitoGiaFatto(modulo)) return;
      segnaInvitoFatto(modulo);
      setInvito(modulo);
    },
    [modulo],
  );

  // Avvio automatico alla prima visita della pagina (dopo il mount dei target).
  useEffect(() => {
    if (!tour) return;
    if (partito.current === tour.pageId) return;
    if (tourGiaVisto(tour.pageId)) return;
    // Finché la sequenza di benvenuto non è stata vista, conduce lei. Il collaudo l'ha
    // trovata così: il velo di questo tour si apriva SOPRA il video, e il pulsante per
    // proseguire diventava incliccabile. Non basta chiedere «giro in corso?»: fra il
    // video e la prima tappa il giro non è ancora cominciato, ed è proprio lì che si
    // sovrapponevano. Il fatto discriminante è il benvenuto ancora da vedere, e lo sa
    // il server — niente gara fra due effetti montati insieme.
    if (inProva && !benvenutoGiaVisto()) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    partito.current = tour.pageId;

    // ⚠️ L'INVITO AL CORSO ARRIVA DALLA FINE DEL TOUR, NON DA UN SECONDO AVVIO.
    //
    // Sarebbe stato naturale mostrarlo «alla prima visita del modulo», cioè con un altro
    // effetto montato insieme a questo. È esattamente il difetto del 13 agosto: due cose
    // che partono sulla stessa pagina, e il velo di driver.js che rende incliccabile ciò
    // che sta sotto. Qui non c'è nessuna gara — l'invito è il seguito, e `avviaTour` ha il
    // richiamo apposta.
    //
    // ⚠️ Si ASPETTA IL PRIMO BERSAGLIO, non un numero di millisecondi.
    //
    // Qui c'era `setTimeout(…, 1100)`, cioè una scommessa su quanto ci mette la pagina a
    // montarsi. Sulle pagine dei percorsi, che sono le più pesanti del prodotto, la
    // scommessa si perde: `avviaTour` non trova nessuno dei bersagli e si salta in
    // silenzio. La funzione che risolve questo problema esisteva già dal giorno del
    // benvenuto, con il commento che lo spiega, e la usava un chiamante solo.
    // ⚠️ E se il bersaglio non arriva, IL TOUR NON PARTE. Partire lo stesso vuol dire
    // eseguire un giro senza tappe: nessun riquadro a schermo, e chi sta a valle che
    // riceve la fine di qualcosa che non è cominciato. Meglio niente, col pulsante «Tour»
    // che resta lì per chi lo vuole.
    let annullato = false;
    const primo = tour.steps.find((s) => s.element)?.element;
    void (async () => {
      if (primo && !(await attendiElemento(primo, 15_000))) return;
      if (annullato) return;
      // ⚠️ SI RICHIEDE «GIÀ VISTO» ANCHE QUI, perché nel frattempo può essere cambiato.
      //
      // Fra la decisione di partire e la partenza vera possono passare secondi: chi in
      // quel momento preme «Tour» e arriva in fondo marca il giro come visto, e senza
      // questo controllo se ne aprirebbe un secondo da solo — due veli sulla stessa
      // pagina, che è il difetto del 13 agosto in una forma nuova. Prima non poteva
      // succedere perché l'attesa era un ritardo fisso di poco più di un secondo.
      if (tourGiaVisto(tour.pageId)) return;
      avviaTour(tour, seguito);
    })();
    return () => {
      annullato = true;
    };
  }, [tour, inProva, seguito]);

  if (!tour && !modulo) return null;

  return (
    // ⚠️ `bottom-16` e non `bottom-5`: a `bottom-5` questo riquadro copriva la riga «Dati
    // ospitati nell'Unione Europea» in fondo alla pagina — misurato con `elementFromPoint`,
    // non visto a occhio. Era un debito aperto, e con due voci al posto di una sarebbe
    // peggiorato.
    <div className="fixed bottom-16 right-5 z-30 flex flex-col items-end gap-2">
      {invito && (
        <div className="w-[19rem] rounded-xl border bg-card p-4 shadow-lg">
          <div className="flex items-start justify-between gap-3">
            <p className="text-[13.5px] font-semibold">Vuoi approfondire?</p>
            <button
              type="button"
              onClick={() => setInvito(null)}
              aria-label="Chiudi il suggerimento"
              className="tocco-comodo -m-1 rounded p-1 text-muted-foreground transition-colors hover:text-foreground"
            >
              <X className="size-4" aria-hidden />
            </button>
          </div>
          <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">
            C&apos;è un corso su questo percorso: dove si prendono i dati, che cosa controlla la
            verifica e che cosa succede quando pubblichi.
          </p>
          <Button asChild size="sm" className="mt-3 w-full">
            <Link href={`/formazione/${invito}`} onClick={() => setInvito(null)}>
              Apri la formazione
            </Link>
          </Button>
        </div>
      )}

      <div className="flex gap-2">
        {modulo && (
          <Button asChild variant="outline" size="sm" className="shadow-md">
            <Link href={`/formazione/${modulo}`}>
              <GraduationCap className="size-4" /> Formazione
            </Link>
          </Button>
        )}
        {/* Il tour c'è solo dove qualcuno l'ha scritto: dove manca, resta la formazione. */}
        {tour && (
          <Button variant="outline" size="sm" className="shadow-md" onClick={() => avviaTour(tour, seguito)}>
            <CircleHelp className="size-4" /> Tour
          </Button>
        )}
      </div>
    </div>
  );
}
