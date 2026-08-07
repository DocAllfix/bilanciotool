import { APIError } from "better-auth/api";
import { db } from "@/lib/db";
import { invitation } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { assertSeatAvailable, EntitlementError } from "@/features/entitlement";

// Il limite di accessi, applicato dove si invita davvero.
//
// Gli inviti li gestisce il plugin `organization` di Better Auth con rotte sue, che noi non
// avvolgiamo in nessuna server action. `assertSeatAvailable` esisteva ed era corretta, ma
// **non la chiamava nessuno**: restava in piedi solo il `membershipLimit` statico del plugin,
// che è un numero fisso e ignora il piano acquistato. Con quattro piani da 2, 5 e 10 accessi,
// un numero fisso non può funzionare.
//
// I punti da presidiare sono DUE, e il secondo è quello che si dimentica: si controlla a chi
// invita, ma anche a chi accetta. Un invito spedito quando c'era posto può essere accettato
// settimane dopo, quando il posto non c'è più — e a quel punto la membership nasce comunque.

/** Le rotte del plugin organization che aggiungono una persona allo studio. */
const ROTTE_PRESIDIATE = new Set(["/organization/invite-member", "/organization/accept-invitation"]);

export function rottaDaPresidiare(percorso: string): boolean {
  return ROTTE_PRESIDIATE.has(percorso);
}

type Contesto = {
  path: string;
  body?: Record<string, unknown> | null;
  context?: { session?: { session?: { activeOrganizationId?: string | null } } | null } | null;
};

/** L'organizzazione a cui la richiesta sta aggiungendo qualcuno. */
export async function orgDellaRichiesta(ctx: Contesto): Promise<string | null> {
  if (ctx.path === "/organization/accept-invitation") {
    // Qui l'organizzazione non sta nel corpo: la porta l'invito che si sta accettando.
    const id = ctx.body?.invitationId;
    if (typeof id !== "string" || !id) return null;
    const righe = await db
      .select({ organizationId: invitation.organizationId })
      .from(invitation)
      .where(eq(invitation.id, id))
      .limit(1);
    return righe[0]?.organizationId ?? null;
  }
  const dalCorpo = ctx.body?.organizationId;
  if (typeof dalCorpo === "string" && dalCorpo) return dalCorpo;
  return ctx.context?.session?.session?.activeOrganizationId ?? null;
}

/**
 * Ferma la richiesta se lo studio ha esaurito gli accessi del suo piano.
 *
 * Se l'organizzazione non è determinabile **non si blocca**: sarà il plugin a rifiutare la
 * richiesta malformata con il suo errore, che è più preciso del nostro. Bloccare qui
 * produrrebbe un messaggio sul limite a chi ha semplicemente sbagliato chiamata.
 */
export async function verificaAccessiDisponibili(ctx: Contesto): Promise<void> {
  if (!rottaDaPresidiare(ctx.path)) return;
  const orgId = await orgDellaRichiesta(ctx);
  if (!orgId) return;
  try {
    await assertSeatAvailable(orgId);
  } catch (e) {
    if (e instanceof EntitlementError) {
      throw new APIError("FORBIDDEN", { message: e.message, code: e.code });
    }
    throw e;
  }
}
