import { sql, type SQL } from "drizzle-orm";
import type { AnyPgColumn } from "drizzle-orm/pg-core";

/**
 * Fonde in un oggetto JSONB SOLO le chiavi date, in un'istruzione sola: `col || patch`.
 *
 * ⚠️ Sostituisce «leggi, fondi in memoria, riscrivi». Quella forma è giusta finché le
 * scritture arrivano una per volta — cioè mai quando conta: due campi salvati a un istante
 * di distanza leggono lo stesso oggetto, e il secondo riscrive il primo col valore vecchio.
 * Questo progetto l'ha pagato quattro volte (materialità, costi dell'energetico, contatti,
 * politiche). Con le compilazioni automatiche le scritture sullo stesso profilo aumentano:
 * qui la fusione la fa Postgres, sotto il lock della riga.
 */
export function fondiJsonb(colonna: AnyPgColumn, patch: Record<string, unknown>): SQL {
  return sql`coalesce(${colonna}, '{}'::jsonb) || ${JSON.stringify(patch)}::jsonb`;
}
