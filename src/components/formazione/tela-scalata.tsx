"use client";

import { useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { TELA_A, TELA_L } from "./slide-layout";

/**
 * La tela 1280 × 720, rimpicciolita o ingrandita per stare nello spazio che c'è.
 *
 * ⚠️ SI SCALA, NON SI RIDISPONE. Una slide composta in pixel esiste a una misura sola: se
 * la si lasciasse riflettere, su un portatile il titolo andrebbe a capo e la tabella
 * sforerebbe, e il controllo sui tagli misurerebbe una slide diversa a ogni larghezza. È
 * la lezione del Deck della vetrina, che da telefono si tagliava finché non si è espresso
 * tutto in proporzione a una radice.
 *
 * ⚠️ `transform` e non `zoom`: `zoom` cambia le misure che il layout vede, e il controllo
 * sui tagli leggerebbe altezze già scalate. Con `transform` la tela resta 720 per chi la
 * misura, e diventa più piccola solo per chi la guarda.
 *
 * Il contenitore riserva lo spazio SCALATO, altrimenti un elemento trasformato occupa nel
 * flusso la sua misura originale e la pagina scorre in orizzontale su un telefono.
 */
export function TelaScalata({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [scala, setScala] = useState(1);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const misura = () => {
      const { width, height } = el.getBoundingClientRect();
      if (!width || !height) return;
      setScala(Math.min(width / TELA_L, height / TELA_A));
    };
    misura();
    const ro = new ResizeObserver(misura);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <div ref={ref} className="flex h-full w-full min-h-0 min-w-0 items-center justify-center" data-tela-scalata={scala.toFixed(3)}>
      <div className="relative shrink-0" style={{ width: TELA_L * scala, height: TELA_A * scala }}>
        <div
          // ⚠️ Il filo chiaro attorno non è decorazione: sulle slide SCURE la tela e la sala
          // intorno avevano quasi la stessa luminosità, e il bordo della slide spariva —
          // si vedeva un titolo sospeso nel buio invece di uno schermo. L'ombra da sola non
          // basta su un fondo scuro, perché un'ombra scura su scuro non si vede.
          className="absolute left-0 top-0 origin-top-left shadow-[0_0_0_1px_oklch(1_0_0/0.09),0_12px_40px_oklch(0_0_0/0.35)]"
          style={{ width: TELA_L, height: TELA_A, transform: `scale(${scala})` }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}
