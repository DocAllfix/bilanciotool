// La frase sui posti al prezzo d'introduzione.
//
// ⚠️ STA QUI, PURA, PERCHÉ È LA PARTE CHE PUÒ DIVENTARE FALSA. Il banner la mostra, il
// collaudo la confronta col conteggio del database, e questo file è l'unico posto in cui si
// decide che cosa dire — compreso il caso che conta davvero: **posti finiti, si tace**.
//
// Se la frase vivesse dentro il componente, la regola «esauriti i posti il richiamo smette di
// promettere quel prezzo» sarebbe verificabile solo aprendo un browser con cinque
// abbonamenti attivi nel database. Qui è un test da tre righe, e vale per sempre.

export function rigaPosti(rimasti: number | null, tetto: number): string | null {
  // Il contatore non ha risposto: si tace. Meglio un richiamo senza scarsità che una
  // scarsità inventata — che è l'unica cosa che questo meccanismo non deve mai fare.
  if (rimasti === null) return null;
  // Posti esauriti: il prezzo d'introduzione non esiste più, e il banner non lo promette.
  if (rimasti <= 0) return null;
  const posti = rimasti === 1 ? "resta 1 posto" : `restano ${rimasti} posti`;
  return `Prezzo d'introduzione: ${posti} su ${tetto}, poi si va a listino.`;
}
