// Il CALENDARIO ITALIANO, calcolato invece che chiesto.
//
// ⚠️ Sta qui, e non dentro `features/agenda` dov'era nato, per una ragione strutturale:
// da lì lo importava chi ne aveva bisogno insieme a tutto il resto del modulo agenda,
// cioè a Drizzle e a `postgres`. Le funzioni pure che servono anche al browser non
// possono stare accanto al database — lo stesso motivo per cui l'aritmetica degli importi
// è finita in `calc/compensi/importi.ts` dopo che un `"use client"` aveva fatto fallire
// il build con «Can't resolve 'fs'».
//
// Ed è anche un modo di non averla due volte: il modulo NIS2 deve sapere qual è il giorno
// italiano di un istante per calcolare «un mese dalla notifica», e una seconda copia di
// questa regola sarebbe una seconda copia che un giorno diverge.
//
// ⚠️ Non si risolve impostando `TZ` sull'ambiente: funzionerebbe, e tornerebbe a rompersi
// in silenzio nel primo ambiente che non ce l'ha. E nemmeno con `Intl`, che dipende dai
// dati ICU del runtime — server e browser ne hanno due diversi, e lo stesso istante si
// stamperebbe in due modi nella stessa pagina.

/**
 * L'ora legale italiana è in vigore in un dato istante?
 *
 * Dall'ultima domenica di marzo alle 01:00 UTC all'ultima domenica di ottobre alle 01:00
 * UTC. La regola è europea e fissa: si calcola, non si chiede a nessuno.
 */
export function oraLegaleItaliana(istante: Date): boolean {
  const anno = istante.getUTCFullYear();
  // L'ultima domenica di un mese: si parte dall'ultimo giorno e si torna indietro.
  const ultimaDomenica = (mese: number) => {
    const ultimo = new Date(Date.UTC(anno, mese + 1, 0));
    return ultimo.getUTCDate() - ultimo.getUTCDay();
  };
  const inizio = Date.UTC(anno, 2, ultimaDomenica(2), 1); // marzo, 01:00 UTC
  const fine = Date.UTC(anno, 9, ultimaDomenica(9), 1); // ottobre, 01:00 UTC
  const t = istante.getTime();
  return t >= inizio && t < fine;
}

/** Lo scarto dell'Italia dall'UTC in un dato istante: una o due ore. */
export function scartoItalia(istante: Date): number {
  return oraLegaleItaliana(istante) ? 2 : 1;
}

/**
 * L'istante, letto sul calendario e sull'orologio italiani.
 *
 * Restituisce un `Date` i cui campi **UTC** portano l'ora italiana: si legge con
 * `getUTCFullYear`, `getUTCHours` e compagnia. È un imbroglio deliberato e ha un nome —
 * è il modo di fare aritmetica di calendario in un fuso senza dipendere da quello del
 * processo — e per questo la funzione non restituisce mai un istante da confrontare con
 * `Date.now()`.
 */
export function inOraItaliana(istante: Date): Date {
  return new Date(istante.getTime() + scartoItalia(istante) * 3_600_000);
}

/** Oggi in ISO, secondo il calendario ITALIANO. Un solo posto dove si decide. */
export function oggiIso(adesso = new Date()): string {
  // ⚠️ IL GIORNO ITALIANO, non quello del fuso in cui gira il processo.
  //
  // Qui c'era `getFullYear/getMonth/getDate`, cioè il fuso LOCALE, con accanto un commento
  // giusto per metà: «le voci d'agenda le scrive e le legge una persona in Italia». Vero
  // per chi guarda — ma questo codice gira sul SERVER, e le funzioni di Vercel hanno il
  // fuso UTC. Fra mezzanotte e le due, ora italiana d'estate, il server stava ancora a
  // ieri: l'agenda proponeva la data del giorno prima e «le voci di oggi» erano quelle di
  // ieri. In locale non si vede mai, perché lì il processo è già a Roma.
  //
  // Sui termini di legge vale la regola opposta (UTC), e i due casi non si contraddicono:
  // là conta il termine, qui conta il giorno in cui la persona si trova.
  return giornoItaliano(adesso);
}

/** Il giorno italiano di un istante, in `YYYY-MM-DD`. */
export function giornoItaliano(istante: Date): string {
  const d = inOraItaliana(istante);
  const a = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const g = String(d.getUTCDate()).padStart(2, "0");
  return `${a}-${m}-${g}`;
}

/** L'ora italiana di un istante, in `HH:MM`. */
export function oraItaliana(istante: Date): string {
  const d = inOraItaliana(istante);
  return `${String(d.getUTCHours()).padStart(2, "0")}:${String(d.getUTCMinutes()).padStart(2, "0")}`;
}

/**
 * L'istante corrispondente a una data e a un'ora ITALIANE.
 *
 * ⚠️ È l'inverso di `inOraItaliana`, e l'inverso non è simmetrico: lo scarto dipende
 * dall'istante, e l'istante è proprio quello che si sta cercando. Si stima con lo scarto
 * dell'ora presunta e si corregge se la stima cade dall'altra parte del cambio d'ora —
 * due giri bastano, perché lo scarto salta al più una volta.
 *
 * Nelle due ore che non esistono (l'ultima domenica di marzo) o che esistono due volte
 * (ottobre) la risposta è convenzionale: si sceglie sempre lo scarto in vigore *dopo* il
 * salto. Un termine di legge non si gioca in quell'ora, e fingere di saperlo sarebbe
 * peggio che dichiararlo.
 */
export function daOraItaliana(giorno: string, ora: string): Date | null {
  const g = /^(\d{4})-(\d{2})-(\d{2})$/.exec(giorno);
  const o = /^(\d{2}):(\d{2})$/.exec(ora);
  if (!g || !o) return null;
  const comeSeUtc = Date.UTC(Number(g[1]), Number(g[2]) - 1, Number(g[3]), Number(o[1]), Number(o[2]));
  let istante = new Date(comeSeUtc - 3_600_000);
  for (let giro = 0; giro < 2; giro++) {
    const corretto = new Date(comeSeUtc - scartoItalia(istante) * 3_600_000);
    if (corretto.getTime() === istante.getTime()) return istante;
    istante = corretto;
  }
  return istante;
}
