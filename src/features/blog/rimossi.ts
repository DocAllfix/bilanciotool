// Gli slug di articoli eliminati per sempre, che devono rispondere 410.
//
// **Oggi è vuoto, ed è giusto così**: il blog nasce con questo impianto, non c'è stata
// nessuna migrazione da una fonte precedente, e quindi non c'è nessun indirizzo indicizzato
// da ritirare. Il modulo esiste comunque, perché il primo articolo cancellato ne avrà
// bisogno e serve un posto solo dove dichiararlo.
//
// PERCHÉ 410 E NON 404, quando servirà. Un 404 dice a Google «non lo trovo adesso», e
// l'indirizzo resta nell'indice per mesi mentre il crawler continua a ripassare. Il 410
// dice «rimosso, definitivamente»: Google lo toglie in fretta e smette di chiedere. Per
// contenuto eliminato e senza sostituto è il trattamento corretto.
//
// Un articolo SOSTITUITO va invece reindirizzato con un 301 verso il nuovo, non messo qui:
// il 301 conserva il posizionamento accumulato, il 410 lo butta via. E per i soli cambi di
// slug non serve nemmeno quello: ci pensa `slugSostitutivo()`, che li scopre dal CMS.
//
// ⚠️ Uno slug che esiste ancora nel CMS **non va messo in elenco**: il 410 coprirebbe
// l'articolo vero, e nessuno se ne accorgerebbe — la pagina esiste, la sitemap la elenca,
// ma chi la apre legge «rimosso». Per questo `verifica.ts` confronta questo elenco con la
// sitemap e diventa rosso al primo conflitto.

export const SLUG_RIMOSSI: readonly string[] = [
  // vuoto: nessun articolo è ancora stato pubblicato e poi eliminato
];

/** L'articolo a questo percorso è stato rimosso per sempre? */
export function eRimosso(percorso: string): boolean {
  const m = percorso.match(/^\/blog\/([a-z0-9-]+)\/?$/i);
  return m ? SLUG_RIMOSSI.includes(m[1].toLowerCase()) : false;
}
