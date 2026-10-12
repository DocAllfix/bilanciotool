// I due termini di legge del percorso GDPR.
//
//  · Richieste degli interessati (art. 12.3): riscontro entro UN MESE dalla ricezione,
//    prorogabile di due — tre mesi in tutto — se la proroga è comunicata e motivata.
//  · Violazioni (art. 33.1): notifica al Garante entro 72 ORE dal momento in cui
//    l'organizzazione ne è venuta a conoscenza, se il rischio non è improbabile.
//
// ⚠️ IL MESE si somma col calendario e AGGANCIA l'ultimo giorno (31 gennaio + 1 mese = 28
// febbraio): `piuMesi` di `segnalazioni/termini.ts`, la stessa regola già provata. Il
// prototipo faceva lo stesso, e qui non c'è divergenza.
//
// ⚠️ LE 72 ORE invece DIVERGONO dal prototipo, che le contava fra due date `datetime-local`
// lette nel fuso del processo che le legge. Nel browser di un consulente italiano è il fuso
// giusto; su un server, che gira in UTC, la stessa ora diventava due ore prima. E la notte
// del cambio d'ora 72 ore di orologio non sono 72 ore vere. Qui la conoscenza è un ISTANTE
// (`timestamptz`) e le ore sono millisecondi: `piuOre` di `nis2/termini.ts`.

import { giornoItaliano } from "@/lib/calc/comune/tempo-italia";
import { giorniA, piuMesi } from "@/lib/calc/segnalazioni/termini";
import { piuOre } from "@/lib/calc/nis2/termini";
import type { Richiesta, Violazione } from "./tipi";

export const MESI_RISCONTRO = 1;
export const MESI_RISCONTRO_PROROGA = 3;
export const ORE_NOTIFICA = 72;

/** ok nei termini · late fuori termine · over scaduta senza riscontro · open in corso. */
export type StatoTermine = "ok" | "late" | "over" | "open";

/** La scadenza del riscontro, `AAAA-MM-GG`, oppure `null` senza data di ricezione. */
export function scadenzaRichiesta(r: Pick<Richiesta, "ricevutaIl" | "proroga">): string | null {
  return piuMesi(r.ricevutaIl, r.proroga ? MESI_RISCONTRO_PROROGA : MESI_RISCONTRO);
}

/** Lo stato di una richiesta. `oggi` è il giorno ITALIANO, `AAAA-MM-GG`. */
export function statoRichiesta(r: Richiesta, oggi: string): StatoTermine | null {
  const scad = scadenzaRichiesta(r);
  if (!scad) return null;
  // Confronto fra date ISO: l'ordine lessicale è quello del calendario.
  if (r.riscontroIl) return r.riscontroIl <= scad ? "ok" : "late";
  return oggi > scad ? "over" : "open";
}

/** Giorni fra ricezione e riscontro, mai negativi; `null` se manca una delle due. */
export function giorniDiRiscontro(r: Richiesta): number | null {
  if (!r.ricevutaIl || !r.riscontroIl) return null;
  const g = giorniA(r.riscontroIl, r.ricevutaIl);
  return g === null ? null : Math.max(0, g);
}

/** La notifica al Garante è dovuta: il rischio è stato valutato e non è improbabile. */
export const notificaDovuta = (v: Pick<Violazione, "rischio">) => !!v.rischio && v.rischio !== "Improbabile";

/** L'istante entro cui notificare, ISO; `null` se la notifica non è dovuta. */
export function limiteNotifica(v: Pick<Violazione, "conoscenzaIl" | "rischio">): string | null {
  return notificaDovuta(v) ? piuOre(v.conoscenzaIl, ORE_NOTIFICA) : null;
}

/** Lo stato della notifica; `null` se non è dovuta o manca la conoscenza. */
export function statoViolazione(v: Violazione, adesso: Date): StatoTermine | null {
  const limite = limiteNotifica(v);
  if (!limite) return null;
  if (v.notificataIl) return Date.parse(v.notificataIl) <= Date.parse(limite) ? "ok" : "late";
  return adesso.getTime() > Date.parse(limite) ? "over" : "open";
}

/** Ore intere fra conoscenza e notifica, per l'etichetta «notificata in N ore». */
export function oreAllaNotifica(v: Violazione): number | null {
  if (!v.conoscenzaIl || !v.notificataIl) return null;
  const ms = Date.parse(v.notificataIl) - Date.parse(v.conoscenzaIl);
  return Number.isNaN(ms) ? null : Math.round(ms / 3_600_000);
}

/** L'esercizio di una violazione: l'anno del giorno ITALIANO della conoscenza. */
export function annoViolazione(v: Pick<Violazione, "conoscenzaIl">): number | null {
  if (!v.conoscenzaIl) return null;
  const d = new Date(v.conoscenzaIl);
  return Number.isNaN(d.getTime()) ? null : Number(giornoItaliano(d).slice(0, 4));
}

/** L'esercizio di una registrazione datata `AAAA-MM-GG`. */
export const annoDi = (data: string | null | undefined) => (data && /^\d{4}-/.test(data) ? Number(data.slice(0, 4)) : null);
