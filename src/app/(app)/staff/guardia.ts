import { notFound } from "next/navigation";
import { getSessionOrNull, isPlatformAdmin, type SessionInfo } from "@/features/auth/guards";

/**
 * La sessione di chi può stare nell'area staff. Per tutti gli altri, l'area NON ESISTE.
 *
 * ⚠️ `notFound()` e non `requirePlatformAdmin()`, e la ragione è stata misurata: quella
 * guardia SOLLEVA, e un'eccezione dentro un componente server diventa un errore 500 —
 * «An error occurred in the Server Components render» a schermo, e un `ForbiddenError`
 * nei log del server a ogni curiosità. Il collaudo l'ha visto al primo giro.
 *
 * E «riservato allo staff» sarebbe comunque la risposta sbagliata: conferma che l'area
 * c'è, cioè invita a insistere. Un pericolo si evita, non si annuncia.
 *
 * ⚠️ Il ruolo si rilegge dalla SESSIONE letta sul momento — `getSessionOrNull` interroga
 * Better Auth a ogni richiesta — non da un valore ricordato: togliere il ruolo a qualcuno
 * deve avere effetto subito, non alla scadenza della sua sessione.
 *
 * Il perimetro vero resta comunque il database: le funzioni della coda passano da
 * `withTenant({ platformAdmin: true })`, e senza quel contesto la policy della migrazione
 * 0058 non restituisce nulla.
 */
export async function sessioneStaff(): Promise<SessionInfo> {
  const s = await getSessionOrNull();
  if (!s || !isPlatformAdmin(s)) notFound();
  return s;
}
