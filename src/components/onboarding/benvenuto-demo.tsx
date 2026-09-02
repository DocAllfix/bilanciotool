"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { X, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { findTourForPath } from "@/lib/tour/registry";
import { avviaTour, attendiElemento } from "@/lib/tour/avvia";
import {
  leggiPresentazione, scriviPresentazione, chiudiPresentazione,
  benvenutoGiaVisto, segnaBenvenutoVisto, type StatoPresentazione,
} from "@/lib/tour/presentazione";
import type { Tappa } from "@/app/api/onboarding/percorso/route";
import { OffertaLancio } from "./offerta-lancio";

// La sequenza del primo accesso: video, giro guidato, offerta.
//
// Tre momenti in fila, e l'ordine non è casuale. Il video dice COSA fa il prodotto
// mentre la persona non sa ancora dove guardare. Il giro glielo fa toccare, pagina per
// pagina, sull'azienda dimostrativa già compilata. L'offerta arriva alla fine, quando ha
// capito cosa comprerebbe: proporla prima è chiedere soldi a chi non sa ancora per cosa.
//
// Il giro **attraversa le pagine**, e questo componente sta nella shell: resta montato
// mentre si naviga, ma lo stato del giro no — vive in `sessionStorage`, altrimenti ogni
// tappa ricomincerebbe da capo.
//
// Ogni passo si può interrompere, e interrompere porta **dritti all'offerta**: chi chiude
// un tour sta dicendo «basta spiegazioni», non «basta prodotto». L'offerta è il terminale
// di ogni strada, e si vede una volta sola.

export function BenvenutoDemo({ inProva }: { inProva: boolean }) {
  const [fase, setFase] = useState<"nulla" | "video" | "offerta">("nulla");
  const router = useRouter();
  const pathname = usePathname();
  // Quale tappa è già stata condotta. Non un semplice «in corso»: questo componente
  // sta nella shell e sopravvive alle navigazioni, quindi un interruttore acceso una
  // volta bloccherebbe tutte le tappe successive.
  const condotta = useRef<string | null>(null);
  /**
   * Il giro è stato chiesto: da qui in poi il video non si riapre.
   *
   * ⚠️ È LA CAUSA DEL DIFETTO DEL 2 SETTEMBRE, misurata: fra `setFase("nulla")` e la
   * scrittura dello stato del giro c'è una chiamata al server, e nel mezzo questo effetto
   * si ri-esegue — `fase` è una sua dipendenza. In quel momento non c'è ancora un giro in
   * corso, il percorso è la dashboard e la fase è «nulla»: così **riprogrammava il video**
   * con un timer da 900 ms che nessuno annullava, perché scrivere in `sessionStorage` non
   * è un fatto reattivo e la pulizia scatta solo quando l'effetto si ri-esegue.
   *
   * Risultato: il tour partiva e subito dopo il video riappariva sopra. Alla velocità
   * normale sono 93 istanti con tutti e due aperti, e `elementFromPoint` sulla X del video
   * rispondeva «il velo del tour».
   *
   * Un `useRef` e non uno stato: deve valere SUBITO, prima del prossimo render, ed è
   * proprio la ri-esecuzione dell'effetto che va fermata.
   */
  const giroChiesto = useRef(false);
  /** Il timer del video, per poterlo spegnere da fuori dell'effetto che l'ha acceso. */
  const timerVideo = useRef<ReturnType<typeof setTimeout> | null>(null);

  const allOfferta = useCallback(() => {
    chiudiPresentazione();
    // Il benvenuto si segna visto quando si ARRIVA all'offerta, non quando la si
    // chiude. Chi da qui va al pagamento e poi torna indietro senza pagare ha già
    // visto tutto: rimettergli il video da capo sarebbe la seconda cosa che gli
    // succede dopo un ripensamento, e la peggiore.
    segnaBenvenutoVisto();
    setFase("offerta");
  }, []);

  /** Va alla tappa successiva, o all'offerta se non ce ne sono più. */
  const avanza = useCallback((s: StatoPresentazione) => {
    const prossima = s.i + 1;
    if (prossima >= s.tappe.length) return allOfferta();
    scriviPresentazione({ ...s, i: prossima });
    router.push(s.tappe[prossima].path);
  }, [allOfferta, router]);

  /** Conduce la tappa corrente: attende che la pagina ci sia, poi lancia il suo tour. */
  const conduci = useCallback(async (s: StatoPresentazione) => {
    const tour = findTourForPath(s.tappe[s.i].path);
    if (!tour) return avanza(s);
    // La pagina si monta in un istante imprecisato dopo la navigazione: senza attendere
    // il primo bersaglio, il tour non troverebbe nulla e si salterebbe in silenzio.
    const primo = tour.steps.find((p) => p.element)?.element;
    if (primo) await attendiElemento(primo);
    avviaTour(tour, (completato) => (completato ? avanza(s) : allOfferta()));
  }, [avanza, allOfferta]);

  useEffect(() => {
    if (!inProva || benvenutoGiaVisto()) return;

    const s = leggiPresentazione();
    if (s) {
      // Giro già avviato. Se siamo dove ci si aspettava, si conduce la tappa; se
      // l'utente è finito altrove di sua iniziativa, il giro è finito e si chiude
      // con l'offerta invece di trascinarlo indietro.
      const segno = `${s.i}:${pathname}`;
      if (condotta.current === segno) return;
      condotta.current = segno;
      if (pathname !== s.tappe[s.i].path) allOfferta();
      else void conduci(s);
      return;
    }

    // Nessun giro in corso: si comincia, ma solo dalla dashboard. È dove si atterra
    // dopo l'accesso, ed è l'unico punto in cui il video non interrompe un lavoro.
    if (giroChiesto.current) return;
    if (pathname !== "/dashboard" || fase !== "nulla") return;
    const t = setTimeout(() => setFase("video"), 900);
    timerVideo.current = t;
    return () => clearTimeout(t);
  }, [inProva, pathname, fase, conduci, allOfferta]);

  /** Fine del video: si chiede l'itinerario al server e si parte. */
  async function iniziaGiro() {
    // ⚠️ PRIMA di qualunque attesa. Due difese e non una: il segno impedisce all'effetto
    // di riprogrammare il video, e lo spegnimento del timer chiude quello eventualmente
    // già acceso. Una sola delle due basterebbe oggi; due bastano anche domani, quando
    // qualcuno cambierà l'ordine delle righe qui sotto.
    giroChiesto.current = true;
    if (timerVideo.current) {
      clearTimeout(timerVideo.current);
      timerVideo.current = null;
    }
    setFase("nulla");
    let tappe: Tappa[] = [];
    try {
      const r = await fetch("/api/onboarding/percorso");
      if (r.ok) tappe = (await r.json()).tappe ?? [];
    } catch { /* itinerario non disponibile: si passa all'offerta */ }
    if (!tappe.length) return allOfferta();

    const s: StatoPresentazione = { tappe, i: 0 };
    scriviPresentazione(s);
    condotta.current = `0:${tappe[0].path}`;
    if (pathname !== tappe[0].path) router.push(tappe[0].path);
    else void conduci(s);
  }

  if (fase === "offerta") {
    return <OffertaLancio onChiudi={() => setFase("nulla")} />;
  }

  if (fase !== "video") return null;

  return (
    <div
      data-modale="benvenuto"
      className="fixed inset-0 z-70 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
    >
      <div className="w-full max-w-4xl overflow-hidden rounded-xl bg-card shadow-2xl">
        <div className="flex items-center justify-between border-b px-5 py-3">
          <p className="text-sm font-medium">Benvenuto in EvalisDeck</p>
          <button
            onClick={() => void iniziaGiro()}
            className="tocco-comodo rounded-md p-1 text-muted-foreground hover:text-foreground"
            aria-label="Chiudi il video e continua"
          >
            <X className="size-4" />
          </button>
        </div>
        {/* `autoPlay` insieme a `muted`: i browser bloccano la riproduzione automatica
            col suono, e un video che non parte si legge come rotto. I comandi restano,
            così chi vuole l'audio lo accende. */}
        <video
          src="/api/onboarding/video"
          autoPlay
          muted
          controls
          playsInline
          className="aspect-video w-full bg-black"
          onEnded={() => void iniziaGiro()}
        />
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3">
          <p className="text-[13px] text-muted-foreground">
            Poi ti accompagniamo dentro, percorso per percorso.
          </p>
          <Button size="sm" variant="outline" onClick={() => void iniziaGiro()}>
            Salta e vai al giro guidato <ArrowRight className="size-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
