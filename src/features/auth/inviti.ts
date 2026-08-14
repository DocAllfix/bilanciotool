import { db } from "@/lib/db";
import { invitation, organization, user, member } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";

// L'invito visto da chi lo riceve, cioe' da qualcuno che spesso non ha ancora un account.
//
// Si legge con la connessione diretta e non da `withTenant`: chi apre il collegamento non
// ha un'organizzazione attiva — e' proprio quello che sta per ottenere. Non e' una
// scorciatoia sulle policy: l'unica cosa che si mostra e' il nome dello studio che ha
// invitato, e per arrivare qui serve un identificativo che sta solo dentro un'email.

export type StatoInvito =
  | "valido"
  | "inesistente"
  | "scaduto"
  | "gia-accettato"
  | "annullato";

export type Invito = {
  id: string;
  stato: StatoInvito;
  email: string;
  studio: string;
  organizationId: string;
  ruolo: string;
  invitatoDa: string | null;
  scadeIl: Date;
};

/** La forma di un identificativo d'invito. Scarta la spazzatura prima di una query. */
function formaValida(id: string): boolean {
  return typeof id === "string" && /^[A-Za-z0-9_-]{8,64}$/.test(id);
}

/**
 * L'invito, con il suo stato. `null` solo se l'identificativo non ha nemmeno la forma.
 *
 * Gli stati sono distinti di proposito. «Scaduto» e «gia' accettato» sono due situazioni
 * diverse per chi legge — nella seconda basta accedere, nella prima bisogna farsi
 * reinvitare — e dire «non esiste» a entrambe manderebbe una persona a cercare un
 * problema che non ha.
 */
export async function leggiInvito(id: string): Promise<Invito | null> {
  if (!formaValida(id)) return null;

  const [riga] = await db
    .select({
      id: invitation.id,
      email: invitation.email,
      role: invitation.role,
      status: invitation.status,
      expiresAt: invitation.expiresAt,
      organizationId: invitation.organizationId,
      studio: organization.name,
      invitanteNome: user.name,
    })
    .from(invitation)
    .innerJoin(organization, eq(organization.id, invitation.organizationId))
    .leftJoin(user, eq(user.id, invitation.inviterId))
    .where(eq(invitation.id, id))
    .limit(1);

  if (!riga) return null;

  const stato: StatoInvito =
    riga.status === "accepted"
      ? "gia-accettato"
      : riga.status === "canceled" || riga.status === "rejected"
        ? "annullato"
        : riga.expiresAt.getTime() < Date.now()
          ? "scaduto"
          : "valido";

  return {
    id: riga.id,
    stato,
    email: riga.email.toLowerCase(),
    studio: riga.studio,
    organizationId: riga.organizationId,
    ruolo: riga.role ?? "member",
    invitatoDa: riga.invitanteNome,
    scadeIl: riga.expiresAt,
  };
}

/** Questa persona fa gia' parte di quello studio? */
export async function giaDentro(userId: string, organizationId: string): Promise<boolean> {
  const righe = await db
    .select({ id: member.id })
    .from(member)
    .where(and(eq(member.userId, userId), eq(member.organizationId, organizationId)))
    .limit(1);
  return righe.length > 0;
}
