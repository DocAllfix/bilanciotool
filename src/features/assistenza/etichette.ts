import type { StatoTicket } from "./index";

// Le etichette degli stati di una richiesta, dai due punti di vista.
//
// ⚠️ Stanno in un modulo SENZA "use client", e non è pignoleria: stavano nel componente
// client dell'assistenza, e la coda dello staff — che è un componente SERVER — le
// importava da lì. Da un modulo client un componente server non riceve l'oggetto ma un
// riferimento, `ETICHETTA[stato]` vale `undefined`, e la pastiglia dello stato usciva
// VUOTA. Nessun errore, nessun avviso: l'ha visto la foto. È la stessa regola delle
// domande della vetrina (`DOMANDE.map is not a function`).
//
// ⚠️ E sono DUE elenchi, non uno. Lo stesso stato dice cose opposte a chi lo guarda:
// `in_attesa` significa «tocca a te» per chi ha scritto e «aspettiamo lo studio» per lo
// staff. Con un elenco solo, lo staff leggeva «Tocca a te» su un ticket a cui aveva
// appena risposto — cioè l'invito a rispondere di nuovo.

export const STATO_PER_UTENTE: Record<StatoTicket, string> = {
  aperto: "In attesa di risposta",
  in_attesa: "Tocca a te",
  chiuso: "Chiusa",
};

export const STATO_PER_STAFF: Record<StatoTicket, string> = {
  aperto: "Da rispondere",
  in_attesa: "In attesa dello studio",
  chiuso: "Chiusa",
};
