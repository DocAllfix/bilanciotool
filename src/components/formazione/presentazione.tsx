"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, Pause, Play, Volume2, X } from "lucide-react";

import type { Slide } from "@/features/formazione/presentazione";
import type { PostoPista } from "@/features/formazione/audio";
import { BloccoReso } from "./corso";
import { Interfaccia } from "./interfaccia";

/**
 * La presentazione: una schermata per volta, con la voce che spiega.
 *
 * ⚠️ NON sostituisce la pagina che scorre, le sta accanto. Sono due momenti: la prima volta
 * vuoi essere condotto, le volte dopo vuoi trovare una cosa sola — e per quello una
 * presentazione è pessima, perché non si cerca col Ctrl+F e non si scorre con l'occhio.
 */
export function Presentazione({
  slide,
  pista,
  nomeCorso,
  tinta,
  href,
}: {
  slide: Slide[];
  pista: PostoPista[];
  nomeCorso: string;
  tinta: { tratto: string };
  /** Dove si torna uscendo: la pagina del corso, al punto in cui si era. */
  href: string;
}) {
  const router = useRouter();
  const [i, setI] = useState(0);
  const [conVoce, setConVoce] = useState(false);
  const [inRiproduzione, setInRiproduzione] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  /** Il salto è stato chiesto da una persona, o l'ha deciso l'audio andando avanti? */
  const manuale = useRef(false);

  const corrente = slide[i];
  const sezioneId = corrente?.sezione.id;

  const vai = useCallback(
    (d: number) => {
      manuale.current = true;
      setI((x) => Math.min(Math.max(x + d, 0), slide.length - 1));
    },
    [slide.length],
  );

  const esci = useCallback(() => {
    // Si esce SULLA sezione in cui si era: chi chiude a metà quasi sempre vuole rileggere
    // proprio quel punto, non ricominciare dall'inizio.
    router.push(`${href}#${slide[i]?.sezione.id ?? ""}`);
  }, [router, href, slide, i]);

  useEffect(() => {
    function tasto(e: KeyboardEvent) {
      if (e.key === "ArrowRight" || e.key === "PageDown" || e.key === " ") {
        e.preventDefault();
        vai(1);
      } else if (e.key === "ArrowLeft" || e.key === "PageUp") {
        e.preventDefault();
        vai(-1);
      } else if (e.key === "Escape") {
        esci();
      }
    }
    window.addEventListener("keydown", tasto);
    return () => window.removeEventListener("keydown", tasto);
  }, [vai, esci]);

  // Cambio di SEZIONE: si carica la traccia di quella sezione e si parte.
  //
  // ⚠️ La chiave dell'effetto è la sezione, non la slide. Una sezione è UNA traccia: sulle
  // slide successive la schermata avanza dentro l'audio che sta già suonando, e ricaricarlo
  // lo manderebbe da capo proprio mentre chi ascolta ha capito.
  useEffect(() => {
    const a = audioRef.current;
    if (!a || !conVoce || !sezioneId) return;
    const apertura = pista.findIndex((_, k) => slide[k].sezione.id === sezioneId);
    const src = pista[apertura]?.src;
    if (!src) return;
    if (!a.src.endsWith(src)) a.src = src;
    a.currentTime = pista[i]?.momento ?? 0;
    void a.play().catch(() => setInRiproduzione(false));
    // `i` è di proposito fuori dalle dipendenze: dentro la stessa sezione la traccia non si
    // ricarica, e al cambio di sezione `i` è già quello giusto.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sezioneId, conVoce]);

  // Salto chiesto da una persona DENTRO la stessa sezione: si sposta l'audio, non si
  // ricarica. Un salto deciso dall'audio non entra qui, altrimenti si riavvolgerebbe da solo.
  useEffect(() => {
    if (!manuale.current) return;
    manuale.current = false;
    const a = audioRef.current;
    if (a && conVoce && a.src) a.currentTime = pista[i]?.momento ?? 0;
  }, [i, conVoce, pista]);

  function avanzamento() {
    const a = audioRef.current;
    if (!a || !sezioneId) return;
    // L'ultima slide di QUESTA sezione il cui momento è già passato.
    let k = i;
    while (k + 1 < slide.length && slide[k + 1].sezione.id === sezioneId && pista[k + 1].momento <= a.currentTime) {
      k++;
    }
    if (k !== i) setI(k);
  }

  if (!corrente) return null;

  const ultima = i === slide.length - 1;
  const conAudio = pista.some((p) => p.src);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background" data-presentazione="">
      {conAudio && (
        <audio
          ref={audioRef}
          preload="none"
          onTimeUpdate={avanzamento}
          onPlay={() => setInRiproduzione(true)}
          onPause={() => setInRiproduzione(false)}
          onEnded={() => !ultima && setI((x) => x + 1)}
        />
      )}

      {/* ⚠️ La barra di avanzamento è un elemento a sé e non un bordo colorato: chi guarda
          deve poter sapere quanto manca senza contare le slide, ed è la sola cosa che una
          pagina che scorre dà gratis e una presentazione no. */}
      <div className="h-1 w-full shrink-0 bg-muted">
        <div
          className={`h-full transition-[width] duration-300 ease-out ${tinta.tratto}`}
          style={{ width: `${((i + 1) / slide.length) * 100}%` }}
        />
      </div>

      <header className="flex shrink-0 items-start justify-between gap-4 border-b px-6 py-4 sm:px-10">
        <div className="min-w-0">
          <p className="truncate text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            {nomeCorso}
          </p>
          {/* ⚠️ Il titolo nell'intestazione SOLO quando il corpo non lo annuncia: sulla
              slide che apre una sezione comparivano tutti e due, nella stessa schermata, a
              venti centimetri di distanza. Una ripetizione così vicina non si legge come
              enfasi, si legge come un errore. Qui l'intestazione serve a orientarsi mentre
              la sezione prosegue, e sulla prima slide quel compito ce l'ha il corpo. */}
          {!corrente.apreSezione && (
            <h1 className="font-display mt-1 truncate text-[20px] font-bold tracking-[-0.01em] sm:text-[26px]">
              {corrente.sezione.titolo}
            </h1>
          )}
        </div>
        <button
          type="button"
          onClick={esci}
          className="flex shrink-0 items-center gap-1.5 rounded-md border px-3 py-1.5 text-[13px] transition-colors hover:bg-muted"
        >
          <X className="size-3.5" aria-hidden />
          Esci
        </button>
      </header>

      {/* ⚠️ DUE REGISTRI, NON UNO. La slide che apre una sezione ha un fondo diverso dalle
          altre: il cambio ogni tre o quattro schermate è quello che tiene sveglio chi
          guarda, e senza, quindici minuti di schermate identiche diventano rumore visivo.
          È la stessa cosa che DESIGN.md dice del prodotto — il contrasto fra i registri è
          il lusso — applicata dentro la presentazione. */}
      <div
        className={`flex min-h-0 flex-1 items-center justify-center overflow-y-auto px-6 py-8 transition-colors sm:px-12 ${
          corrente.apreSezione ? "bg-card" : "bg-background"
        }`}
      >
        <div className="w-full max-w-3xl">
          {corrente.apreSezione && (
            <>
              {/* Sulla slide che apre, il titolo c'è anche nel corpo: l'intestazione è
                  piccola e serve a orientarsi, questo è il momento in cui la sezione
                  comincia e va annunciata. */}
              <p className="flex items-center gap-2.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                <span className={`h-px w-8 ${tinta.tratto}`} aria-hidden />
                {corrente.sezione.minuti} min
              </p>
              <h2 className="font-display mt-3 text-[28px] font-bold leading-tight tracking-[-0.02em] sm:text-[34px]">
                {corrente.sezione.titolo}
              </h2>
              <p className="mt-3 text-[17px] leading-relaxed text-muted-foreground sm:text-[19px]">
                {corrente.sezione.sommario}
              </p>
            </>
          )}

          {/* ⚠️ Una sezione tutta prosa NON viene saltata: la voce la sta leggendo, e
              saltarla farebbe vedere la slide dopo mentre si sente quella prima. Qui la
              schermata resta sul titolo e sul sommario, che è quanto c'è da guardare. */}
          {corrente.blocchi.length > 0 && (
            <div className={corrente.apreSezione ? "mt-8 space-y-5" : "space-y-5"}>
              {corrente.blocchi.map((b, k) =>
                b.tipo === "interfaccia" ? (
                  <Interfaccia key={k} vista={b.vista} titolo={b.titolo} nota={b.nota} />
                ) : (
                  <BloccoReso key={k} b={b} misura="grande" />
                ),
              )}
            </div>
          )}
        </div>
      </div>

      <footer className="flex shrink-0 items-center justify-between gap-3 border-t px-6 py-4 sm:px-10">
        <button
          type="button"
          onClick={() => vai(-1)}
          disabled={i === 0}
          className="flex items-center gap-1.5 rounded-md border px-3 py-2 text-[13.5px] transition-colors hover:bg-muted disabled:pointer-events-none disabled:opacity-40"
        >
          <ChevronLeft className="size-4" aria-hidden />
          <span className="hidden sm:inline">Indietro</span>
        </button>

        <div className="flex items-center gap-3">
          {/* ⚠️ La voce NON parte da sola al caricamento, e non è una dimenticanza: i
              browser bloccano la riproduzione con l'audio finché non c'è un gesto della
              persona. Un lettore che ci provasse fallirebbe in silenzio, e la presentazione
              sembrerebbe muta invece che in attesa. Qui il gesto è esplicito. */}
          {conAudio &&
            (conVoce ? (
              <button
                type="button"
                onClick={() => {
                  const a = audioRef.current;
                  if (!a) return;
                  if (a.paused) void a.play();
                  else a.pause();
                }}
                aria-label={inRiproduzione ? "Metti in pausa la voce" : "Riprendi la voce"}
                className="flex items-center gap-1.5 rounded-md border px-3 py-2 text-[13px] transition-colors hover:bg-muted"
              >
                {inRiproduzione ? <Pause className="size-3.5" aria-hidden /> : <Play className="size-3.5" aria-hidden />}
                <span className="hidden sm:inline">{inRiproduzione ? "Pausa" : "Riprendi"}</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setConVoce(true)}
                className="flex items-center gap-1.5 rounded-md border px-3 py-2 text-[13px] transition-colors hover:bg-muted"
              >
                <Volume2 className="size-3.5" aria-hidden />
                Ascolta
              </button>
            ))}

          <p className="text-[12.5px] tabular-nums text-muted-foreground">
            <span data-slot="kpi">{corrente.numero}</span> di <span data-slot="kpi">{corrente.totale}</span>
          </p>
        </div>

        {ultima ? (
          <button
            type="button"
            onClick={esci}
            className="rounded-md bg-primary px-4 py-2 text-[13.5px] font-medium text-primary-foreground transition-opacity hover:opacity-90"
          >
            Torna al corso
          </button>
        ) : (
          <button
            type="button"
            onClick={() => vai(1)}
            className="flex items-center gap-1.5 rounded-md bg-primary px-3 py-2 text-[13.5px] font-medium text-primary-foreground transition-opacity hover:opacity-90"
          >
            <span className="hidden sm:inline">Avanti</span>
            <ChevronRight className="size-4" aria-hidden />
          </button>
        )}
      </footer>
    </div>
  );
}
