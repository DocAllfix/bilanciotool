import { cache } from "react";
import { desc, eq } from "drizzle-orm";
import { withTenant } from "@/lib/db/tenant";
import { company, documentSnapshot } from "@/lib/db/schema";

// Le due domande che la dashboard faceva quattro e tre volte.
//
// ⚠️ Misurato col tracciatore delle query (`DB_TRACCIA=1`), non dedotto leggendo il
// codice. Una singola apertura della dashboard interrogava `company` **quattro volte** —
// la riga intera per le card, `(id, nome, is_demo)` due volte per scadenzario e stati, e
// un `count(*)` per il limite del piano — e `document_snapshot` **tre**. Sono cinque
// letture che sembrano indipendenti e che chiedono lo stesso.
//
// ⚠️ Con `cache()` di React la domanda si fa una volta per richiesta, e i chiamanti
// filtrano in memoria: le aziende di uno studio sono al massimo qualche decina, e
// filtrare una lista corta in JavaScript costa zero mentre un viaggio al database costa
// ~70 ms. Il conto si ribalta solo con migliaia di righe, che qui non ci sono per
// costruzione — il piano più alto ne vende venticinque.
//
// ⚠️ E si chiedono le colonne di CHI NE VUOLE DI PIÙ: chi ne vuole meno ne ignora
// qualcuna, che è gratis. L'alternativa — due letture, una magra e una grassa — sarebbe
// tornata a due viaggi, cioè al problema.

/** Tutte le aziende dello studio, una volta per richiesta. */
export const aziendeDelloStudio = cache(async function aziendeDelloStudio(userId: string, orgId: string) {
  return withTenant({ userId, orgId }, (tx) =>
    tx
      .select()
      .from(company)
      .where(eq(company.organizationId, orgId))
      .orderBy(desc(company.createdAt)),
  );
});

/** Le sole attive, filtrate in memoria: è la stessa lettura. */
export async function aziendeAttive(userId: string, orgId: string) {
  return (await aziendeDelloStudio(userId, orgId)).filter((a) => a.stato === "active");
}

/**
 * I documenti pubblicati dello studio, una volta per richiesta.
 *
 * ⚠️ Le colonne sono l'unione di quelle che i quattro chiamanti usano. Il più esigente è
 * il quadro dello studio, che vuole anche `versione` e `publishedAt` per l'elenco degli
 * ultimi pubblicati; scadenzario e stati usano solo `companyId`, `tipo` e `anno`.
 */
export const documentiDelloStudio = cache(async function documentiDelloStudio(
  userId: string,
  orgId: string,
) {
  return withTenant({ userId, orgId }, (tx) =>
    tx
      .select({
        id: documentSnapshot.id,
        companyId: documentSnapshot.companyId,
        tipo: documentSnapshot.tipo,
        anno: documentSnapshot.anno,
        versione: documentSnapshot.versione,
        publishedAt: documentSnapshot.publishedAt,
      })
      .from(documentSnapshot)
      .where(eq(documentSnapshot.organizationId, orgId))
      .orderBy(desc(documentSnapshot.publishedAt)),
  );
});

/**
 * L'anno più alto pubblicato per `azienda|tipo`, che è la forma che scadenzario e stati
 * usavano con un `group by` proprio.
 *
 * ⚠️ Si ricava dall'elenco già ordinato per data invece di rifare la query: `max(anno)`
 * su una lista corta è un ciclo, e un ciclo non fa un viaggio al database.
 */
export async function annoPiuAltoPerTipo(
  userId: string,
  orgId: string,
): Promise<Map<string, number>> {
  const docs = await documentiDelloStudio(userId, orgId);
  const out = new Map<string, number>();
  for (const d of docs) {
    const k = `${d.companyId}|${d.tipo}`;
    const attuale = out.get(k);
    if (attuale === undefined || d.anno > attuale) out.set(k, d.anno);
  }
  return out;
}

/** Un'azienda sola, dalla stessa lettura: il fascicolo la chiede e non serve un viaggio. */
export async function aziendaDelloStudio(userId: string, orgId: string, companyId: string) {
  return (await aziendeDelloStudio(userId, orgId)).find((a) => a.id === companyId) ?? null;
}

/** Il conto delle attive non demo, per il limite del piano. Nessun `count(*)` a parte. */
export async function conteggioAttive(userId: string, orgId: string): Promise<number> {
  return (await aziendeDelloStudio(userId, orgId)).filter((a) => a.stato === "active" && !a.isDemo)
    .length;
}
