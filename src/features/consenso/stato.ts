// Lo stato del consenso ai cookie di misurazione.
//
// Vive nell'archiviazione locale del browser e non in un cookie, per una ragione che non è
// di comodo: un cookie viaggia a ogni richiesta verso il server, e un dato che serve solo
// al browser non ha motivo di attraversare la rete. La scelta la legge il codice della
// pagina, non il server.
//
// **La regola che governa tutto: in caso di dubbio, negato.** Qualunque valore che non sia
// un consenso esplicito vale come «non ha ancora scelto». Un difetto nella direzione
// opposta non si vedrebbe — il sito funziona, i dati arrivano — e significherebbe aver
// raccolto dati senza averne titolo.

/** La versione in coda serve al giorno in cui si aggiunge una categoria: cambiandola, la
 *  scelta precedente decade e la domanda si ripresenta, invece di dare per consentito
 *  qualcosa su cui nessuno si è mai espresso.
 *
 *  ⚠️ È successo il 21 ottobre 2026, con la «Pubblicità»: chi aveva accettato le sole
 *  statistiche non ha mai detto niente su Google Ads. La v1 «accettato» quindi NON vale
 *  più: si torna a chiedere. La v1 «rifiutato» invece resta un rifiuto — un no alla
 *  misurazione non diventa un sì a niente, e riproporre il riquadro a chi ha già detto di
 *  no solo per una finalità in più sarebbe insistere. */
export const CHIAVE_CONSENSO = "evalisdeck-consenso-v2";
const CHIAVE_PRECEDENTE = "evalisdeck-consenso-v1";

/**
 * Le quattro scelte possibili sulle due finalità.
 *
 * - `rifiutato`: niente statistiche, niente pubblicità.
 * - `statistiche`: Google Analytics sì, Google Ads no.
 * - `pubblicita`: Google Ads sì, Google Analytics no.
 * - `accettato`: entrambe, cioè «Accetta».
 *
 * Una stringa per scelta e non un oggetto: la si confronta per valore, si scrive in un
 * collaudo con una riga, e un valore storpiato non può mai valere metà consenso.
 */
export type Consenso = "rifiutato" | "statistiche" | "pubblicita" | "accettato";
/** `null` = non ha ancora scelto. Non è un rifiuto: il banner deve ancora comparire. */
export type StatoConsenso = Consenso | null;

const SCELTE: readonly Consenso[] = ["rifiutato", "statistiche", "pubblicita", "accettato"];

/** Traduce quello che c'era scritto nel browser. Tutto ciò che non riconosce diventa `null`. */
export function interpreta(grezzo: string | null): StatoConsenso {
  return SCELTE.find((s) => s === grezzo) ?? null;
}

/** Dalla scelta della versione precedente: conta solo il rifiuto. */
export function interpretaPrecedente(grezzo: string | null): StatoConsenso {
  return grezzo === "rifiutato" ? "rifiutato" : null;
}

/** La scelta che corrisponde alle due caselle del riquadro «Personalizza». */
export function daCaselle(statistiche: boolean, pubblicita: boolean): Consenso {
  if (statistiche && pubblicita) return "accettato";
  if (statistiche) return "statistiche";
  if (pubblicita) return "pubblicita";
  return "rifiutato";
}

/** L'unico punto che decide se Google Analytics può partire. */
export function analiticaAttiva(stato: StatoConsenso): boolean {
  return stato === "accettato" || stato === "statistiche";
}

/** L'unico punto che decide se Google Ads può ricevere qualcosa. */
export function pubblicitaAttiva(stato: StatoConsenso): boolean {
  return stato === "accettato" || stato === "pubblicita";
}

// --- il magazzino, letto da React con useSyncExternalStore --------------------------------
// L'archiviazione locale è stato ESTERNO a React: si legge con `useSyncExternalStore` e non
// con un effetto che chiama `setState`, così non c'è un doppio render su ogni pagina e
// l'istantanea lato server è esplicita.

let inMemoria: StatoConsenso | undefined;
const ascoltatori = new Set<() => void>();

export function leggiConsenso(): StatoConsenso {
  if (inMemoria === undefined) {
    try {
      inMemoria =
        interpreta(localStorage.getItem(CHIAVE_CONSENSO)) ??
        interpretaPrecedente(localStorage.getItem(CHIAVE_PRECEDENTE));
    } catch {
      // Archiviazione negata (navigazione privata restrittiva). Non potendo ricordare la
      // scelta, non possiamo nemmeno raccogliere: resta un rifiuto di fatto, e non
      // riproponiamo il banner a ogni pagina.
      inMemoria = "rifiutato";
    }
  }
  return inMemoria;
}

// LE DUE ISTANTANEE LATO SERVER, E PERCHÉ NON POSSONO ESSERE LA STESSA.
//
// Sul server la scelta dell'utente non è conoscibile: l'archiviazione locale sta nel suo
// browser. `useSyncExternalStore` vuole comunque un valore per l'HTML iniziale, e i due
// componenti che leggono questo stato hanno bisogno di due valori **opposti**.
//
// Averne usata una sola è stato un difetto vero, trovato dal collaudo sulle richieste di
// rete: Analytics ereditava l'istantanea pensata per il banner e partiva prima di qualunque
// scelta, e continuava a partire anche dopo un rifiuto. Non si vedeva a schermo, e i dati
// arrivavano — cioè il modo peggiore in cui un difetto del genere può presentarsi.
//
// I nomi dicono a cosa servono, così non si scambiano più.

/** Per il BANNER: fingere che abbia già scelto, così il riquadro non compare nell'HTML e
 *  chi ha già deciso non vede un lampo. È una scelta di sola presentazione: non abilita
 *  niente, perché chi raccoglie legge l'altra. E finge un RIFIUTO, non un consenso: se un
 *  giorno finisse per errore in mano a chi raccoglie, non accenderebbe niente. */
export const bannerNascostoSulServer = (): StatoConsenso => "rifiutato";

/** Per ANALYTICS e per qualunque cosa raccolga dati: **non ha scelto**. È l'unico valore
 *  ammissibile — in caso di dubbio, negato. Se un domani si aggiunge un altro strumento di
 *  misurazione, deve usare questa e non l'altra. */
export const raccoltaSpentaSulServer = (): StatoConsenso => null;

export function iscriviConsenso(avvisa: () => void) {
  ascoltatori.add(avvisa);
  return () => {
    ascoltatori.delete(avvisa);
  };
}

function annuncia() {
  for (const avvisa of ascoltatori) avvisa();
}

/** Registra la scelta dell'utente. */
export function scegli(scelta: Consenso) {
  try {
    localStorage.setItem(CHIAVE_CONSENSO, scelta);
  } catch {
    // Se non possiamo ricordarla fra le visite, almeno vale per questa.
  }
  inMemoria = scelta;
  annuncia();
}

/** Riapre la domanda: è la revoca, richiesta dalle linee guida del Garante. Cancella la
 *  scelta precedente, così il banner torna e Analytics si spegne fino alla scelta nuova. */
export function riapriScelta() {
  try {
    localStorage.removeItem(CHIAVE_CONSENSO);
    // Anche la precedente: altrimenti un vecchio rifiuto tornerebbe a valere e il riquadro
    // non ricomparirebbe, cioè la revoca non revocherebbe niente.
    localStorage.removeItem(CHIAVE_PRECEDENTE);
  } catch {
    // niente da fare, ma lo stato in memoria basta a far ricomparire il banner
  }
  inMemoria = null;
  annuncia();
}
