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
/**
 * C'è già qualcosa aperto sopra la pagina?
 *
 * ⚠️ UN PERICOLO SI EVITA, NON SI FILTRA. Il 13 agosto il velo di un tour si apriva sopra
 * il video di benvenuto e rendeva incliccabile il pulsante per proseguire; il rimedio di
 * allora valeva per quel caso solo. Misurato di nuovo il 2 settembre: alla velocità
 * normale ci sono **93 istanti** con video e tour aperti insieme, e `elementFromPoint`
 * sulla X del video risponde «il velo del tour». Due tour possono perfino aprirsi uno
 * sopra l'altro.
 *
 * Qui la domanda si fa una volta per tutte, e vale per chiunque chiami: se c'è un velo o
 * una finestra della shell, il tour non parte. Meglio un giro guidato che non parte di un
 * giro guidato che si prende i clic destinati a qualcos'altro.
 */
function qualcosaGiaAperto(): boolean {
  return Boolean(document.querySelector(".driver-overlay, .driver-popover, [data-modale]"));
}

export function avviaTour(tour: TourDef, alTermine?: (completato: boolean) => void): void {
  if (qualcosaGiaAperto()) {
    // ⚠️ Si avvisa chi sta a valle, altrimenti una sequenza incatenata resta appesa per
    // sempre: `false` perché il giro non è stato completato — non è nemmeno cominciato.
    alTermine?.(false);
    return;
  }

  const steps = tour.steps
    .filter((s) => !s.element || document.querySelector(s.element))
    .map((s) => ({ element: s.element, popover: { title: s.title, description: s.description } }));
  // ⚠️ NESSUN BERSAGLIO IN PAGINA: il tour non è stato completato, non è nemmeno esistito.
  //
  // Qui c'era `alTermine?.(true)`, ed è passato inosservato finché il seguito di un tour
  // non faceva niente. Il collaudo della formazione l'ha colto al primo colpo: su una
  // pagina più lenta dell'attesa di chi avvia, nessuno dei bersagli è montato, il tour si
  // salta in silenzio — e chi sta a valle riceve «arrivato in fondo» per un giro che
  // l'utente non ha mai visto. Nel caso di oggi voleva dire proporre un corso da venti
  // minuti a qualcuno a cui non era stato mostrato niente.
  //
  // `false` è anche la risposta giusta per chi incatena più tappe: non si prosegue su un
  // passo che non si è potuto fare.
  if (!steps.length) {
    alTermine?.(false);
    return;
  }

  // `hasNextStep()` va letto PRIMA di distruggere: dopo, driver.js ha già dimenticato
  // dov'era. È l'unico modo per sapere se l'utente ha premuto Fine o ha interrotto.
  let completato = false;
  // ⚠️ Il seguito si chiama una volta sola: `onDestroyStarted` può rientrare.
  let seguitoFatto = false;

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
    // ⚠️ LA X PASSA DA QUI COME TUTTO IL RESTO.
    //
    // Prima faceva `d.destroy()`, che è la via che SALTA `onDestroyStarted`: misurato il
    // 2 settembre, chiudendo con la X non scattava niente — né l'hook, né il seguito. Chi
    // incatena le tappe restava appeso, e chi aspettava l'invito al corso aspettava per
    // sempre. Un'uscita che non avvisa nessuno è peggio di un'uscita che non funziona,
    // perché sembra funzionare.
    onCloseClick: () => chiusura(),
    // ⚠️ IL SEGUITO SI CHIAMA QUI, NON IN `onDestroyed`.
    //
    // `onDestroyed` NON VIENE MAI RAGGIUNTO, e non è una deduzione: il 2 settembre l'ho
    // registrato in tutti e tre i modi di chiudere — Fine, ESC, X — e non è scattato una
    // sola volta. Chi definisce `onDestroyStarted` rinuncia al secondo hook senza che
    // niente glielo dica.
    //
    // ⚠️ Ci sono cascato due volte nello stesso giorno, in versi opposti. Prima ho
    // concluso che il richiamo non partisse mai; poi, leggendo il sorgente minificato
    // della libreria, ho concluso il contrario e ho scritto che la prima diagnosi era
    // sbagliata. **Erano sbagliate le letture, non la misura**: il bundle dice che dopo
    // `destroy()` si arriva a `onDestroyed`, e in pratica non ci si arriva. Quando il
    // codice e il comportamento non concordano, vince il comportamento — e si misura.
    onDestroyStarted: () => chiusura(),
  });

  /**
   * L'unica uscita del tour, comunque lo si chiuda.
   *
   * ⚠️ `onDestroyStarted` può scattare PIÙ DI UNA VOLTA — misurato — e la X non lo fa
   * scattare affatto. Una funzione sola, protetta da un interruttore, è l'unico modo per
   * cui «il tour è finito» significhi la stessa cosa in tutti i casi.
   *
   * `hasNextStep()` va letto PRIMA di distruggere: dopo, driver.js ha già dimenticato
   * dov'era. È l'unico modo per sapere se si è arrivati in fondo o si è interrotto.
   */
  function chiusura(): void {
    if (seguitoFatto) return;
    seguitoFatto = true;
    completato = !d.hasNextStep();
    segnaTourVisto(tour.pageId);
    d.destroy();
    alTermine?.(completato);
  }

  d.drive();
}
