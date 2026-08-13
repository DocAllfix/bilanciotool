"use client";

import { driver, type Driver } from "driver.js";
import "driver.js/dist/driver.css";
import type { TourDef } from "./registry";

// L'avvio di un tour, in un posto solo.
//
// Stava dentro il pulsante di aiuto, e li' poteva restare finche' il tour lo lanciava
// una persona premendo un bottone. Ora lo lancia anche la sequenza di benvenuto — video,
// tour, offerta — e due copie della stessa regia divergono al primo aggiustamento.
//
// Regole ereditate e verificate: la X non chiude da sola (difetto noto di driver.js), e
// se si definisce `onDestroyStarted` bisogna chiamare `destroy()` a mano, altrimenti
// Fine, ESC e il clic fuori smettono di funzionare.

const chiave = (pageId: string) => `evalisdeck-tour:${pageId}`;

export function tourGiaVisto(pageId: string): boolean {
  try { return Boolean(localStorage.getItem(chiave(pageId))); } catch { return false; }
}

export function segnaTourVisto(pageId: string): void {
  try { localStorage.setItem(chiave(pageId), "1"); } catch {}
}

/**
 * Attende che un elemento compaia, fino a `entro` millisecondi. Serve dopo una
 * navigazione: la pagina nuova si monta in un istante imprecisato, e un tour lanciato
 * troppo presto non trova nessuno dei suoi bersagli e si salta da solo, in silenzio.
 */
export function attendiElemento(selettore: string, entro = 6000): Promise<boolean> {
  return new Promise((risolvi) => {
    if (document.querySelector(selettore)) return risolvi(true);
    const scaduto = setTimeout(() => { clearInterval(t); risolvi(false); }, entro);
    const t = setInterval(() => {
      if (!document.querySelector(selettore)) return;
      clearInterval(t);
      clearTimeout(scaduto);
      risolvi(true);
    }, 120);
  });
}

/**
 * Avvia il tour della pagina. `alTermine` scatta quando si chiude, comunque si chiuda:
 * arrivando in fondo, premendo ESC o cliccando fuori. Chi lo usa per incatenare un
 * passo successivo deve poter contare su quello — un seguito che parte solo se l'utente
 * arriva educatamente all'ultimo passo non parte quasi mai.
 *
 * L'argomento dice **come** si è chiuso: `true` se si è arrivati in fondo, `false` se
 * l'utente ha interrotto. Chi incatena più tappe deve distinguere i due casi, perché
 * chiudere un tour vuol dire «basta», non «avanti alla pagina successiva».
 */
export function avviaTour(tour: TourDef, alTermine?: (completato: boolean) => void): void {
  const steps = tour.steps
    .filter((s) => !s.element || document.querySelector(s.element))
    .map((s) => ({ element: s.element, popover: { title: s.title, description: s.description } }));
  if (!steps.length) {
    alTermine?.(true);
    return;
  }

  // `hasNextStep()` va letto PRIMA di distruggere: dopo, driver.js ha già dimenticato
  // dov'era. È l'unico modo per sapere se l'utente ha premuto Fine o ha interrotto.
  let completato = false;

  const d: Driver = driver({
    showProgress: true,
    smoothScroll: true,
    overlayOpacity: 0.55,
    stagePadding: 6,
    popoverClass: "evalisdeck-popover",
    nextBtnText: "Avanti",
    prevBtnText: "Indietro",
    doneBtnText: "Fine",
    progressText: "{{current}} di {{total}}",
    steps,
    onCloseClick: () => d.destroy(),
    onDestroyStarted: () => {
      completato = !d.hasNextStep();
      segnaTourVisto(tour.pageId);
      d.destroy();
    },
    onDestroyed: () => alTermine?.(completato),
  });
  d.drive();
}
