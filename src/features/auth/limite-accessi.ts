import { APIError, getSessionFromCtx } from "better-auth/api";
import { db } from "@/lib/db";
import { invitation, member } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { assertSeatAvailable, EntitlementError } from "@/features/entitlement";
import { frenato } from "@/lib/freno";

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
  const invito = ctx.path === "/organization/invite-member";
  const destinatario = invito && typeof ctx.body?.email === "string" ? ctx.body.email.trim().toLowerCase() : null;
  try {
    // All'invito contano anche gli inviti in attesa (vedi `assertSeatAvailable`);
    // all'accettazione no: quell'invito è proprio uno di quelli in attesa.
    await assertSeatAvailable(orgId, invito ? { invitiPendenti: { tranne: destinatario ?? undefined } } : undefined);
  } catch (e) {
    if (e instanceof EntitlementError) {
      throw new APIError("FORBIDDEN", { message: e.message, code: e.code });
    }
    throw e;
  }
  if (invito && destinatario) await frenaInviti(ctx, orgId, destinatario);
}

/** Due invii allo stesso indirizzo in dieci minuti: il secondo assorbe un doppio clic o un errore. */
const FINESTRA_DESTINATARIO_MS = 10 * 60_000;
const MASSIMO_DESTINATARIO = 2;
/** Cento invii al giorno per studio, rinvii compresi: il piano più capiente vende sessanta accessi. */
const FINESTRA_STUDIO_MS = 24 * 3_600_000;
const MASSIMO_STUDIO = 100;

/**
 * Il freno sugli inviti: per destinatario e per studio.
 *
 * ⚠️ Perché serve. Ogni invito, e ogni RINVIO dello stesso invito, manda un'email dal
 * nostro dominio con dentro il nome dello studio, che chi invita sceglie liberamente. Il
 * solo limite era quello generico di sessanta richieste al minuto: un account gratuito
 * poteva mandare decine di email allo stesso indirizzo con un testo proprio nell'oggetto
 * (audit di sicurezza, ottobre 2026).
 *
 * ⚠️ Si conta SOLO per chi può davvero invitare (titolare o amministratore di quello
 * studio). Questo aggancio gira prima che il plugin controlli i permessi: contando per
 * chiunque, un estraneo potrebbe consumare il freno di uno studio altrui passando il suo
 * identificativo, e impedirgli di invitare. Chi non può invitare non si conta e non si
 * ferma qui: lo respinge il plugin, col suo errore.
 *
 * ⚠️ NON si blocca chi è in prova: invitare un collega per provare insieme è parte del
 * percorso d'acquisto, e toglierlo sarebbe una decisione commerciale, non un rimedio.
 */
async function frenaInviti(ctx: Contesto, orgId: string, destinatario: string): Promise<void> {
  const sessione = await getSessionFromCtx(ctx as never).catch(() => null);
  const userId = sessione?.user?.id;
  if (!userId) return;
  const [chi] = await db
    .select({ role: member.role })
    .from(member)
    .where(and(eq(member.organizationId, orgId), eq(member.userId, userId)))
    .limit(1);
  if (!chi || (chi.role !== "owner" && chi.role !== "admin")) return;

  if (await frenato(`invito:${orgId}:${destinatario}`, FINESTRA_DESTINATARIO_MS, MASSIMO_DESTINATARIO)) {
    throw new APIError("TOO_MANY_REQUESTS", {
      message: "Hai già mandato questo invito pochi minuti fa: aspetta una decina di minuti prima di rimandarlo.",
      code: "limit_inviti",
    });
  }
  if (await frenato(`inviti:${orgId}`, FINESTRA_STUDIO_MS, MASSIMO_STUDIO)) {
    throw new APIError("TOO_MANY_REQUESTS", {
      message: "Lo studio ha mandato molti inviti oggi: riprova domani, o scrivici se ti servono subito.",
      code: "limit_inviti",
    });
  }
}
