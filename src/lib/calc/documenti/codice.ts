// Il codice di verifica di un documento: forma, lettura e normalizzazione.
//
// Serve a una cosa sola, ed è la stessa che l'attestato ESG fa già per sé: chi riceve il
// PDF apre una pagina pubblica e vede confermato **chi l'ha emesso, per chi, quando e in
// quale revisione**. Nessun contenuto. Non è una firma e non protegge da nulla: è un
// identificativo breve, leggibile a voce e trascrivibile senza errori.
//
// ⚠️ Qui NON si genera niente. La generazione vuole un generatore crittografico e vive
// sul server (`features/documents/codice.ts`); questo modulo sta in `src/lib/calc`, che
// gira anche nel browser, e un import di `node:crypto` lo spezzerebbe — è la stessa
// ragione per cui l'attestato usa FNV-1a invece di uno hash vero.

/**
 * L'alfabeto del codice: **niente 0/O, 1/I/L, 2/Z, 5/S, 8/B**.
 *
 * ⚠️ Non è pignoleria tipografica. Questo codice viene letto da un PDF stampato e
 * ridigitato, o dettato al telefono: le coppie che si confondono producono un «documento
 * non trovato» su un documento che esiste, e chi lo riceve conclude che è falso.
 *
 * ⚠️ E l'esclusione è l'UNICA difesa contro la confusione: NON si «corregge» una lettera
 * fuori alfabeto indovinando quale fosse. Una prima versione di questo modulo convertiva
 * `O` in `D`, `I` in `J` e così via, per gentilezza. È il contrario della gentilezza: una
 * lettera indovinata male non produce «non trovato», produce il codice di **un altro
 * documento** — e la pagina confermerebbe con sicurezza il documento sbagliato a chi sta
 * verificando proprio quello. Fuori alfabeto si rifiuta.
 */
export const ALFABETO = "34679ACDEFGHJKMNPQRTUVWXY";

/** `EV-XXXX-XXXX`: due gruppi di quattro, come un codice che si detta. */
export const LUNGHEZZA = 8;
export const PREFISSO = "EV";

const FORMA = new RegExp(`^${PREFISSO}-[${ALFABETO}]{4}-[${ALFABETO}]{4}$`);

/** Dalle otto lettere grezze alla forma stampata. */
export function formattaCodice(grezzo: string): string {
  const p = grezzo.toUpperCase();
  return `${PREFISSO}-${p.slice(0, 4)}-${p.slice(4, LUNGHEZZA)}`;
}

/**
 * Quello che una persona ha digitato, ridotto alla forma canonica.
 *
 * Accetta il codice scritto come capita — minuscolo, senza trattini, con gli spazi che il
 * PDF incolla — e **rifiuta** tutto il resto. `null` quando non è un codice.
 *
 * ⚠️ Il prefisso si toglie solo se la lunghezza lo pretende. `E` e `V` sono lettere
 * dell'alfabeto, quindi un codice può cominciare per «EV» davvero: togliere il prefisso a
 * occhi chiusi trasformerebbe `EV-EVAB-CDEF` scritto senza trattini in sei caratteri, e
 * un codice valido diventerebbe irriconoscibile.
 */
export function normalizzaCodice(input: string): string | null {
  let pulito = input.toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (pulito.length === LUNGHEZZA + PREFISSO.length && pulito.startsWith(PREFISSO)) {
    pulito = pulito.slice(PREFISSO.length);
  }
  if (pulito.length !== LUNGHEZZA) return null;
  if ([...pulito].some((c) => !ALFABETO.includes(c))) return null;
  return formattaCodice(pulito);
}

/** La forma è quella di un codice di verifica? */
export function codiceValido(codice: string): boolean {
  return FORMA.test(codice);
}
