import { z } from "zod";
import { EntitlementError } from "@/features/entitlement";
import { AuthError, ForbiddenError } from "@/features/auth/guards";

// Che cosa torna al browser quando una server action fallisce.
//
// Le server action restituiscono sempre `{ok} | {ok:false, errore, codice?}` e mai
// un'eccezione nuda. Questo file e' l'unico posto dove si decide che cosa finisce dentro
// `errore` — prima erano sette copie identiche, una per modulo, e sette copie della
// stessa regola sono sette occasioni di cambiarne sei.
//
// NB: non porta `"use server"`. Un modulo con quella direttiva puo' esportare solo
// funzioni asincrone, ed e' esattamente il motivo per cui questa funzione era stata
// duplicata invece che condivisa.

export type ActionEsito<T = undefined> =
  | { ok: true; dati?: T }
  | { ok: false; errore: string; codice?: string };

/**
 * Traduce un'eccezione in un esito per il client.
 *
 * La riga che contava era l'ultima: `e instanceof Error ? e.message : ...`, cioe' il
 * messaggio di **qualunque** eccezione veniva rimandato al browser. Per un errore
 * Postgres quel messaggio contiene frammenti di query e nomi di colonna; per un errore
 * dell'archivio conteneva il corpo della risposta di Supabase.
 *
 * Il rimedio ovvio — un messaggio fisso per tutto — sarebbe stato peggio del male: nel
 * prodotto ci sono **101** `throw new Error` di dominio, e sono frasi scritte per il
 * consulente («Immagine oltre 5 MB: ridimensionala», «Motivazione d'esclusione
 * obbligatoria»). Sostituirle con «Operazione non riuscita» avrebbe reso il prodotto
 * muto proprio nei momenti in cui deve spiegare.
 *
 * Quindi si distingue **chi ha lanciato**, non che cosa c'e' scritto:
 * `e.constructor === Error` e' vero solo per un `new Error(...)` scritto da noi. Gli
 * errori delle librerie sono sottoclassi — `PostgresError`, `TypeError`, `SyntaxError` —
 * e cadono nel ramo generico. Non e' un elenco di parole vietate da aggiornare a ogni
 * libreria nuova: e' una proprieta' strutturale, e il verso e' quello giusto (si mostra
 * cio' che riconosciamo, non si nasconde cio' che ricordiamo).
 */
export function daErrore(e: unknown): ActionEsito<never> {
  if (e instanceof EntitlementError) return { ok: false, errore: e.message, codice: e.code };
  if (e instanceof z.ZodError) return { ok: false, errore: e.issues[0]?.message ?? "Dati non validi" };
  if (e instanceof AuthError) return { ok: false, errore: e.message, codice: "non_autenticato" };
  if (e instanceof ForbiddenError) return { ok: false, errore: e.message, codice: "non_consentito" };
  if (e instanceof Error && e.constructor === Error) return { ok: false, errore: e.message };

  // Tutto il resto e' infrastruttura: il dettaglio va nei log, dove serve a noi.
  console.error("[action] errore non gestito:", e);
  return { ok: false, errore: "Operazione non riuscita. Riprova fra poco." };
}
