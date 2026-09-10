// LA ROADMAP DI ADEGUAMENTO: cinque fasi, e i termini che il decreto pone all'ente.
//
// I due termini che contano decorrono dalla COMUNICAZIONE con cui l'ACN conferma
// l'inserimento nell'elenco dei soggetti (art. 7 c. 3): nove mesi per gli obblighi di
// notifica, diciotto per le misure di gestione del rischio. Piu' la registrazione
// annuale, che si rinnova entro il 28 febbraio di ogni anno.
//
// ⚠️ IL TERZO DIFETTO DI DATA DEL PROTOTIPO, misurato e non dedotto.
//
// `addM` fa `new Date("2026-01-15")` — che JavaScript legge come MEZZANOTTE UTC — e poi
// ci somma i mesi in ora LOCALE, per poi ristamparla in UTC. Misurato:
//
//     2026-01-15 + 9 mesi, fuso Europe/Rome → 2026-10-14
//     2026-01-15 + 9 mesi, fuso UTC         → 2026-10-15
//
// Un giorno di differenza fra il portatile del consulente e le funzioni su Vercel, che
// girano in UTC: lo stesso dato produce due scadenze diverse a seconda di dove il codice
// gira. Qui non si legge mai il fuso locale, e i mesi si agganciano all'ultimo giorno.

import { piuMesi } from "@/lib/calc/segnalazioni/termini";
import { oggiIso } from "@/lib/calc/comune/tempo-italia";

/** Art. 25: gli obblighi di notifica si applicano dopo nove mesi. */
export const MESI_NOTIFICA = 9;
/** Art. 24: le misure di gestione del rischio dopo diciotto. */
export const MESI_MISURE = 18;
/** Art. 7: la registrazione si rinnova entro il 28 febbraio di ogni anno. */
export const GIORNO_REGISTRAZIONE = "02-28";

export type TerminiRoadmap = {
  /** La comunicazione da cui tutto decorre. `null` finche' non e' arrivata. */
  comunicazione: string | null;
  notifica: string | null;
  misure: string | null;
  /** La prossima scadenza di registrazione: quella di quest'anno se non e' passata. */
  registrazione: string;
};

export type ParametriRoadmap = {
  comunicazione: string | null;
  /** I mesi si possono personalizzare: alcuni settori hanno termini propri. */
  mesiNotifica?: number;
  mesiMisure?: number;
};

/**
 * I tre termini della roadmap.
 *
 * ⚠️ `oggi` e' il giorno ITALIANO. La registrazione scade il 28 febbraio in Italia, non
 * nel fuso in cui gira la funzione: il 28 febbraio alle 00:30 a Roma, in UTC e' ancora il
 * 27, e un ente vedrebbe la scadenza di quest'anno quando ha gia' un giorno solo.
 */
export function terminiRoadmap(p: ParametriRoadmap, adesso = new Date()): TerminiRoadmap {
  const oggi = oggiIso(adesso);
  const anno = Number(oggi.slice(0, 4));
  const diQuestAnno = `${anno}-${GIORNO_REGISTRAZIONE}`;

  return {
    comunicazione: p.comunicazione,
    notifica: piuMesi(p.comunicazione, p.mesiNotifica ?? MESI_NOTIFICA),
    misure: piuMesi(p.comunicazione, p.mesiMisure ?? MESI_MISURE),
    // Se il 28 febbraio e' gia' passato, la prossima e' quella dell'anno prossimo.
    registrazione: oggi <= diQuestAnno ? diQuestAnno : `${anno + 1}-${GIORNO_REGISTRAZIONE}`,
  };
}

/**
 * Quanti giorni mancano a una scadenza. Negativo se e' passata.
 *
 * ⚠️ In giorni interi UTC su entrambe le date, mai in millisecondi fra «adesso» e la
 * mezzanotte del termine: cosi' una scadenza di oggi vale zero per tutta la giornata,
 * invece di diventare -1 nel pomeriggio.
 */
export function giorniA(scadenza: string | null, adesso = new Date()): number | null {
  if (!scadenza) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(scadenza.slice(0, 10));
  if (!m) return null;
  const termine = Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  const [a, me, g] = oggiIso(adesso).split("-").map(Number);
  return Math.round((termine - Date.UTC(a, me - 1, g)) / 86_400_000);
}
