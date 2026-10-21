// Riconoscere un arrivo da campagna dall'indirizzo, e ripulirlo.
//
// Puro: lo usano il browser (per decidere se segnalarlo) e la rotta (per non credere a
// quello che il browser manda). La stessa funzione nei due posti, così non divergono.
//
// ⚠️ Che cosa NON esce di qui, ed è il punto: il valore del `gclid` (è un identificativo
// del clic, e con quello Google ricollega la visita a una persona), i parametri che non
// sono di campagna, e le pagine con un token nell'indirizzo. Resta solo ciò che si può
// sommare.

import { percorsoEscluso } from "@/components/legal/analytics-percorsi";

export type Arrivo = {
  sorgente: string;
  mezzo: string;
  campagna: string;
  /** L'indirizzo portava un identificativo di clic di Google Ads. */
  clicAds: boolean;
  pagina: string;
};

/** Il valore che sta al posto di un parametro assente. */
export const NESSUNO = "(nessuno)";

const LIMITI = { sorgente: 60, mezzo: 60, campagna: 80, pagina: 120 } as const;

/** Minuscole, spazi in `_`, solo lettere, cifre e `._-+`; vuoto → `null`. */
function pulisci(v: unknown, massimo: number): string | null {
  if (typeof v !== "string") return null;
  const s = v
    .normalize("NFC")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/[^\p{L}\p{N}._+-]/gu, "-")
    .slice(0, massimo);
  return s.length > 0 ? s : null;
}

function pulisciPagina(v: unknown): string | null {
  if (typeof v !== "string" || !v.startsWith("/")) return null;
  // Solo il percorso: niente parametri e niente frammento, anche se qualcuno li manda.
  const percorso = v.split(/[?#]/)[0]!.slice(0, LIMITI.pagina);
  if (percorsoEscluso(percorso)) return null;
  return /^\/[\p{L}\p{N}/._~%-]*$/u.test(percorso) ? percorso : null;
}

/** Dall'indirizzo della pagina all'arrivo da contare, o `null` se non è un arrivo da campagna. */
export function arrivoDaIndirizzo(search: string, pathname: string): Arrivo | null {
  const p = new URLSearchParams(search);
  const clicAds = ["gclid", "gbraid", "wbraid"].some((k) => (p.get(k) ?? "").trim().length > 0);
  return normalizzaArrivo({
    sorgente: p.get("utm_source") ?? (clicAds ? "google" : null),
    mezzo: p.get("utm_medium") ?? (clicAds ? "cpc" : null),
    campagna: p.get("utm_campaign"),
    clicAds,
    pagina: pathname,
  });
}

/** La stessa ripulitura, sul corpo che arriva alla rotta. Ciò che non torna diventa `null`. */
export function normalizzaArrivo(grezzo: unknown): Arrivo | null {
  if (!grezzo || typeof grezzo !== "object") return null;
  const g = grezzo as Record<string, unknown>;
  // Senza una sorgente non è un arrivo da campagna: è una visita qualunque, e quelle non le
  // contiamo — non è lo scopo, e non ne avremmo titolo senza consenso.
  const sorgente = pulisci(g.sorgente, LIMITI.sorgente);
  const pagina = pulisciPagina(g.pagina);
  if (!sorgente || !pagina || typeof g.clicAds !== "boolean") return null;
  return {
    sorgente,
    mezzo: pulisci(g.mezzo, LIMITI.mezzo) ?? NESSUNO,
    campagna: pulisci(g.campagna, LIMITI.campagna) ?? NESSUNO,
    clicAds: g.clicAds,
    pagina,
  };
}
