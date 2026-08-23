// I termini di legge del D.Lgs. 24/2023, e l'aritmetica che li produce.
//
// ⚠️ TUTTO IN UTC, e non è pignoleria.
//
// Il prototipo interpretava la data a mezzanotte UTC e poi la manipolava in ora LOCALE.
// Misurato eseguendo il suo codice con due fusi, lo stesso input dava due risposte:
//
//   avviso su 2026-03-25     UTC → 1 aprile    Roma → 31 marzo
//   riscontro su 2026-02-28  UTC → 28 maggio   Roma → 27 maggio
//
// Chi lavora in Italia riceveva sempre quella più corta, e su un termine PERENTORIO un
// giorno in meno è una violazione. Qui non si legge mai il fuso locale: il risultato è
// lo stesso ovunque giri il codice.
//
// ⚠️ E i mesi si AGGANCIANO all'ultimo giorno invece di traboccare. Il prototipo dava
// `30 novembre + 3 mesi = 2 marzo`, due giorni oltre la fine di febbraio. Qui dà 28
// febbraio, che è ciò che calcolano date-fns, Luxon e l'`INTERVAL` di Postgres — e ciò
// che calcolerebbe un avvocato.
//
// Nel caso del 31 gennaio i due difetti si annullavano a vicenda: correggerne uno solo
// avrebbe peggiorato le cose.

/** Art. 5 c. 1 lett. a): avviso di ricevimento entro sette giorni. */
export const GG_AVVISO = 7;
/** Art. 5 c. 1 lett. d): riscontro entro tre mesi. */
export const MESI_RISCONTRO = 3;
/** Art. 14 c. 1: conservazione per cinque anni dalla chiusura. */
export const ANNI_CONSERVAZIONE = 5;

type Parti = { anno: number; mese: number; giorno: number };

/**
 * Una data ISO in parti, oppure `null`.
 *
 * ⚠️ Non usa `new Date`, e la ragione è la stessa del validatore in `features/campi.ts`:
 * `new Date("2026-02-31")` non lancia, scivola al 3 marzo. Da un termine perentorio non
 * deve uscire una data che nessuno ha scritto.
 */
function parti(iso: string | null | undefined): Parti | null {
  if (!iso) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso.slice(0, 10));
  if (!m) return null;
  const anno = Number(m[1]);
  const mese = Number(m[2]);
  const giorno = Number(m[3]);
  if (mese < 1 || mese > 12) return null;
  if (giorno < 1 || giorno > giorniDelMese(anno, mese)) return null;
  return { anno, mese, giorno };
}

/** Quanti giorni ha un mese. `Date.UTC(a, m, 0)` dà l'ultimo giorno del mese `m`. */
function giorniDelMese(anno: number, mese: number): number {
  return new Date(Date.UTC(anno, mese, 0)).getUTCDate();
}

const formatta = (d: Date) => d.toISOString().slice(0, 10);

/** `null` se la data non è una data. */
export function piuGiorni(iso: string | null | undefined, giorni: number): string | null {
  const p = parti(iso);
  if (!p) return null;
  // I giorni si sommano in millisecondi UTC: non c'è cambio d'ora che tenga.
  const d = new Date(Date.UTC(p.anno, p.mese - 1, p.giorno));
  d.setUTCDate(d.getUTCDate() + giorni);
  return formatta(d);
}

/**
 * Somma mesi agganciando all'ultimo giorno del mese di arrivo.
 *
 * 31 gennaio + 3 mesi = 30 aprile, non 1 maggio.
 */
export function piuMesi(iso: string | null | undefined, mesi: number): string | null {
  const p = parti(iso);
  if (!p) return null;
  const totale = p.mese - 1 + mesi;
  const anno = p.anno + Math.floor(totale / 12);
  const mese = ((totale % 12) + 12) % 12; // 0-based, corretto anche per mesi negativi
  const giorno = Math.min(p.giorno, giorniDelMese(anno, mese + 1));
  return formatta(new Date(Date.UTC(anno, mese, giorno)));
}

/** Somma anni con lo stesso aggancio: 29 febbraio + 5 anni = 28 febbraio. */
export function piuAnni(iso: string | null | undefined, anni: number): string | null {
  return piuMesi(iso, anni * 12);
}

/** Il termine per l'avviso di ricevimento. */
export function avvisoEntro(dataSegnalazione: string | null | undefined): string | null {
  return piuGiorni(dataSegnalazione, GG_AVVISO);
}

/**
 * Il termine per il riscontro.
 *
 * ⚠️ Decorre dall'avviso EFFETTIVAMENTE reso, e solo in sua mancanza dalla scadenza dei
 * sette giorni. È la regola più sottile del decreto, il prototipo la aveva giusta, e si
 * conserva: chi non dà l'avviso non guadagna tempo, ma nemmeno ne perde oltre quello che
 * la norma gli concede.
 */
export function riscontroEntro(
  dataSegnalazione: string | null | undefined,
  dataAvviso: string | null | undefined,
): string | null {
  const base = parti(dataAvviso) ? dataAvviso! : avvisoEntro(dataSegnalazione);
  return piuMesi(base, MESI_RISCONTRO);
}

/** Il termine di cancellazione: cinque anni dalla chiusura. */
export function cancellazioneEntro(dataChiusura: string | null | undefined): string | null {
  return piuAnni(dataChiusura, ANNI_CONSERVAZIONE);
}
