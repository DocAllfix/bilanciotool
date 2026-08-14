import { desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { contentSet } from "@/lib/db/schema";

// Qual è la versione corrente dei contenuti metodologici di un dominio.
//
// Era scritta quattro volte, corpo identico: `ghg/inventories.ts` (già parametrizzata su
// due domini, e la parametrizzazione non è stata riusata le altre tre volte),
// `energy/balances.ts`, `soa/declarations.ts`, `supplier/assessments.ts`.
//
// Si legge con `db` e non da `withTenant`, ed è corretto: i cataloghi sono contenuti di
// piattaforma, uguali per tutti gli studi, e la loro tabella non ha `organization_id`.
//
// ⚠️ Il valore che restituisce viene **congelato** nell'esercizio al momento della
// creazione (`contentSetId`). È la ragione per cui un catalogo nuovo non cambia i
// documenti già avviati: chi ha iniziato con la versione 1 la tiene fino alla fine.

export type DominioContenuti = "ghg" | "report" | "energy" | "soa" | "supplier";

/**
 * L'identificativo del content set più recente per il dominio.
 *
 * Il messaggio d'errore si passa da fuori e non si costruisce qui: sono frasi scritte per
 * il consulente, e dicono cose diverse («Catalogo dei controlli non disponibile» non è
 * «Banca domande del modulo fornitori non disponibile»). Un messaggio generato dal nome
 * del dominio le renderebbe tutte uguali e tutte più povere.
 */
export async function latestSetId(dominio: DominioContenuti, seNonCe: string): Promise<string> {
  const rows = await db
    .select({ id: contentSet.id })
    .from(contentSet)
    .where(eq(contentSet.dominio, dominio))
    .orderBy(desc(contentSet.versione))
    .limit(1);
  if (!rows[0]) throw new Error(seNonCe);
  return rows[0].id;
}
