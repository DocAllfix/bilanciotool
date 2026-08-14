import { createHash, timingSafeEqual } from "node:crypto";

// Il confronto di un segreto che arriva dalla rete.
//
// `a !== b` su stringhe esce al primo carattere diverso, e quel tempo si misura: chi
// puo' bussare quante volte vuole ricava il segreto un carattere per volta. Il prodotto
// lo sapeva gia' — `condivisione/token.ts` usa `timingSafeEqual` dal primo giorno — ma
// le rotte dei giri automatici e il webhook del blog erano rimaste col confronto
// normale.
//
// Onestamente: contro questi segreti (32+ caratteri casuali, dietro rete pubblica con
// molto rumore) l'attacco a tempo e' teorico. Ma il rimedio costa una riga, esiste gia'
// in casa, e un confronto normale accanto a uno a tempo costante insegna la cosa
// sbagliata a chi scrivera' la prossima rotta.

/**
 * I due segreti coincidono, in tempo costante rispetto al contenuto.
 *
 * Si confrontano gli SHA-256 e non le stringhe: `timingSafeEqual` **lancia** se i due
 * buffer hanno lunghezza diversa, e quel lancio e' esso stesso una fuga (dice che la
 * lunghezza non combacia, in un tempo diverso). Passando dalle impronte la lunghezza e'
 * sempre 32 byte, qualunque cosa arrivi.
 */
export function segretoCoincide(fornito: string | null | undefined, atteso: string | null | undefined): boolean {
  if (!fornito || !atteso) return false;
  const a = createHash("sha256").update(fornito, "utf8").digest();
  const b = createHash("sha256").update(atteso, "utf8").digest();
  return timingSafeEqual(a, b);
}

/** Come sopra, per un'intestazione `Authorization: Bearer <segreto>`. */
export function bearerCoincide(intestazione: string | null, atteso: string | null | undefined): boolean {
  if (!intestazione || !atteso) return false;
  if (!intestazione.startsWith("Bearer ")) return false;
  return segretoCoincide(intestazione.slice(7), atteso);
}
