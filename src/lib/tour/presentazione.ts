"use client";

import type { Tappa } from "@/app/api/onboarding/percorso/route";

// Lo stato della presentazione guidata, condiviso fra chi la conduce (la sequenza di
// benvenuto) e chi deve togliersi di mezzo mentre è in corso (il pulsante di aiuto, che
// altrimenti farebbe partire un secondo tour sopra il primo).
//
// Sta in `sessionStorage` perché la presentazione **attraversa le pagine**: fra una
// tappa e l'altra c'è una navigazione, e uno stato in memoria non sopravvive. In
// `sessionStorage` e non in `localStorage` perché è un giro in corso, non un fatto
// compiuto: chi chiude la scheda a metà non deve ritrovarselo addosso settimane dopo.

const CHIAVE_GIRO = "evalisdeck-presentazione";
/** Questa invece è definitiva: la sequenza di benvenuto si vede una volta sola. */
const CHIAVE_FATTA = "evalisdeck-benvenuto";

export type StatoPresentazione = { tappe: Tappa[]; i: number };

export function leggiPresentazione(): StatoPresentazione | null {
  try {
    const s = sessionStorage.getItem(CHIAVE_GIRO);
    if (!s) return null;
    const v = JSON.parse(s) as StatoPresentazione;
    return Array.isArray(v?.tappe) && typeof v?.i === "number" ? v : null;
  } catch {
    return null;
  }
}

export function scriviPresentazione(s: StatoPresentazione): void {
  try { sessionStorage.setItem(CHIAVE_GIRO, JSON.stringify(s)); } catch {}
}

export function chiudiPresentazione(): void {
  try { sessionStorage.removeItem(CHIAVE_GIRO); } catch {}
}

export function presentazioneInCorso(): boolean {
  return leggiPresentazione() !== null;
}

export function benvenutoGiaVisto(): boolean {
  try { return localStorage.getItem(CHIAVE_FATTA) === "1"; } catch { return false; }
}

export function segnaBenvenutoVisto(): void {
  try { localStorage.setItem(CHIAVE_FATTA, "1"); } catch {}
}
