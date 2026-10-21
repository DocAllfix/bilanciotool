"use client";

import { useEffect } from "react";
import { arrivoDaIndirizzo } from "@/lib/calc/arrivi";

// Segnala alla nostra rotta che si è arrivati da una campagna, una volta per documento.
//
// ⚠️ Non legge e non scrive niente nel browser: niente cookie, niente archiviazione. Legge
// l'indirizzo che il browser ha appena chiesto e manda al nostro server sorgente, mezzo,
// campagna e pagina. È per questo che non serve il consenso, e il banner non c'entra.
//
// Ricaricare la pagina conta due volte: per evitarlo bisognerebbe ricordare qualcosa nel
// browser, cioè proprio ciò che qui non si fa. Su decine di arrivi al giorno è rumore.

let inviato = false;

export function ContaArrivi() {
  useEffect(() => {
    // In sviluppo React esegue gli effetti due volte: il segno è del modulo, non del componente.
    if (inviato) return;
    const arrivo = arrivoDaIndirizzo(window.location.search, window.location.pathname);
    if (!arrivo) return;
    inviato = true;
    const corpo = JSON.stringify(arrivo);
    const partito = navigator.sendBeacon?.("/api/arrivi", new Blob([corpo], { type: "application/json" }));
    if (!partito) {
      void fetch("/api/arrivi", { method: "POST", body: corpo, keepalive: true }).catch(() => {});
    }
  }, []);
  return null;
}
