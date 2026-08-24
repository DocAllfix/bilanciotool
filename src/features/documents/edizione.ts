import { desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { contentSet } from "@/lib/db/schema";

// L'edizione corrente dei contenuti di un dominio.
//
// ⚠️ Serve a una cosa sola: dire a chi verifica un documento se i contenuti su cui è
// stato redatto sono stati superati. È la leva commerciale più forte che il prodotto ha,
// e finora era muta: il versionamento esisteva già — `content_set` è congelato alla
// creazione di ogni percorso — e non lo vedeva nessuno.
//
// ⚠️ Nessun `withTenant`: i cataloghi non sono dati di un tenant, e questa funzione la
// chiama una pagina pubblica che una sessione non ce l'ha.

/**
 * L'edizione più recente del dominio a cui appartiene `edizione`.
 *
 * Restituisce `null` se il dominio non si riconosce: meglio non dire niente che dire
 * «superata» a chi ha in mano un documento buono.
 */
export async function edizionePiuRecente(edizione: string): Promise<string | null> {
  const [voce] = await db
    .select({ dominio: contentSet.dominio })
    .from(contentSet)
    .where(eq(contentSet.id, edizione))
    .limit(1);
  if (!voce) return null;

  const [corrente] = await db
    .select({ id: contentSet.id })
    .from(contentSet)
    .where(eq(contentSet.dominio, voce.dominio))
    .orderBy(desc(contentSet.versione))
    .limit(1);
  return corrente?.id ?? null;
}
