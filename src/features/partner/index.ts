import { and, asc, eq, sql } from "drizzle-orm";
import { attribuzionePartner, member, organization, partner, stripeCustomer, user } from "@/lib/db/schema";
import { withTenant, dbCorrente } from "@/lib/db/tenant";
import { logAudit } from "@/lib/audit";
import { normalizzaCodicePartner, messaggioCodiceSconosciuto } from "./codice";

// I partner e le loro attribuzioni. Il perché sta nello schema (`schema/partner.ts`).
//
// ⚠️ Logica senza guardie, come l'assistenza: le guardie stanno nelle server action e nelle
// pagine. Il perimetro vero resta il database: le policy della migrazione 0071 lasciano
// cambiare un'attribuzione solo dentro il contesto dello staff.

export type Partner = { codice: string; nome: string };

/** Il partner attivo con quel codice, o `null`. Il registro non ha studio: si legge ovunque. */
export async function partnerAttivo(codice: string): Promise<Partner | null> {
  const [p] = await dbCorrente()
    .select({ codice: partner.codice, nome: partner.nome })
    .from(partner)
    .where(and(eq(partner.codice, codice), eq(partner.attivo, true)))
    .limit(1);
  return p ?? null;
}

export class CodicePartnerSconosciuto extends Error {}

/**
 * Il codice scritto all'iscrizione, verificato. `null` se il campo è vuoto; solleva se il
 * codice non è nel registro, perché l'iscrizione deve fermarsi PRIMA di creare l'account.
 */
export async function verificaCodiceIscrizione(grezzo: unknown): Promise<Partner | null> {
  const codice = normalizzaCodicePartner(grezzo);
  if (codice === null) return null;
  const p = codice === "non-valido" ? null : await partnerAttivo(codice);
  if (!p) throw new CodicePartnerSconosciuto(messaggioCodiceSconosciuto(String(grezzo)));
  return p;
}

/**
 * Lega lo studio appena nato al partner. Una volta sola: se la riga c'è già non la tocca.
 *
 * ⚠️ Nel contesto dello STUDIO, non dello staff: è la sola scrittura che la policy
 * `attribuzione_partner_crea` concede a uno studio, e la fa alla sua nascita.
 */
export async function attribuisciAllaRegistrazione(userId: string, orgId: string, codice: string): Promise<void> {
  await withTenant({ userId, orgId }, async (tx) => {
    const fatte = await tx
      .insert(attribuzionePartner)
      .values({ organizationId: orgId, partnerCodice: codice, origine: "registrazione", attribuitaDa: userId })
      .onConflictDoNothing()
      .returning({ organizationId: attribuzionePartner.organizationId });
    if (!fatte.length) return;
    await logAudit(tx, {
      organizationId: orgId,
      userId,
      azione: "partner.attribuisci",
      entita: "organization",
      entitaId: orgId,
      dettagli: { partner: codice, origine: "registrazione" },
    });
  });
}

export type Attribuzione = {
  organizationId: string;
  codice: string;
  nome: string;
  origine: "registrazione" | "staff";
  attribuitaIl: Date;
};

/**
 * Il partner di uno studio, letto nel contesto dello staff.
 *
 * Lo usa la mail di vendita, che parte dal webhook di Stripe senza sessione: il database è
 * la fonte, non i metadati dell'abbonamento, perché un'attribuzione fatta a mano DOPO
 * l'acquisto deve valere anche per le fatture che arrivano dopo.
 */
export async function attribuzioneDelloStudio(orgId: string): Promise<Attribuzione | null> {
  return withTenant({ platformAdmin: true }, async (tx) => {
    const [r] = await tx
      .select({
        organizationId: attribuzionePartner.organizationId,
        codice: attribuzionePartner.partnerCodice,
        nome: partner.nome,
        origine: attribuzionePartner.origine,
        attribuitaIl: attribuzionePartner.attribuitaIl,
      })
      .from(attribuzionePartner)
      .innerJoin(partner, eq(partner.codice, attribuzionePartner.partnerCodice))
      .where(eq(attribuzionePartner.organizationId, orgId))
      .limit(1);
    return r ? { ...r, origine: r.origine as Attribuzione["origine"] } : null;
  });
}

/** Lo stesso, nel contesto dello studio: lo usa la cassa per scriverlo nei metadati Stripe. */
export async function partnerDelloStudio(userId: string, orgId: string): Promise<string | null> {
  return withTenant({ userId, orgId }, async (tx) => {
    const [r] = await tx
      .select({ codice: attribuzionePartner.partnerCodice })
      .from(attribuzionePartner)
      .where(eq(attribuzionePartner.organizationId, orgId))
      .limit(1);
    return r?.codice ?? null;
  });
}

// --- lo staff ------------------------------------------------------------------------------

export type StudioAttribuito = {
  organizationId: string;
  studio: string;
  titolare: string | null;
  codice: string;
  origine: "registrazione" | "staff";
  attribuitaIl: Date;
  nota: string | null;
  stripeCustomerId: string | null;
};

/** I partner, e per ciascuno gli studi attribuiti. Contesto dello staff. */
export async function elencoPerPartner(staffId: string): Promise<{ partner: Partner[]; studi: StudioAttribuito[] }> {
  return withTenant({ userId: staffId, platformAdmin: true }, async (tx) => {
    const elenco = await tx
      .select({ codice: partner.codice, nome: partner.nome })
      .from(partner)
      .orderBy(asc(partner.codice));
    const studi = await tx
      .select({
        organizationId: attribuzionePartner.organizationId,
        studio: organization.name,
        titolare: sql<string | null>`(
          select u.email from member m join "user" u on u.id = m.user_id
          where m.organization_id = ${attribuzionePartner.organizationId} and m.role = 'owner'
          order by m.created_at limit 1
        )`,
        codice: attribuzionePartner.partnerCodice,
        origine: attribuzionePartner.origine,
        attribuitaIl: attribuzionePartner.attribuitaIl,
        nota: attribuzionePartner.nota,
        stripeCustomerId: stripeCustomer.stripeCustomerId,
      })
      .from(attribuzionePartner)
      .innerJoin(organization, eq(organization.id, attribuzionePartner.organizationId))
      .leftJoin(stripeCustomer, eq(stripeCustomer.organizationId, attribuzionePartner.organizationId))
      .orderBy(asc(attribuzionePartner.partnerCodice), asc(attribuzionePartner.attribuitaIl));
    return {
      partner: elenco,
      studi: studi.map((s) => ({ ...s, origine: s.origine as StudioAttribuito["origine"] })),
    };
  });
}

/**
 * Lo studio di cui una persona è titolare, cercato per indirizzo email. Serve all'attribuzione
 * a mano: lo staff conosce chi ha comprato, non l'identificativo del suo studio.
 */
export async function studioDelTitolare(email: string): Promise<{ orgId: string; studio: string } | null> {
  const e = email.trim().toLowerCase();
  if (!e) return null;
  return withTenant({ platformAdmin: true }, async (tx) => {
    const [r] = await tx
      .select({ orgId: organization.id, studio: organization.name })
      .from(member)
      .innerJoin(user, eq(user.id, member.userId))
      .innerJoin(organization, eq(organization.id, member.organizationId))
      .where(and(sql`lower(${user.email}) = ${e}`, eq(member.role, "owner")))
      .orderBy(asc(member.createdAt))
      .limit(1);
    return r ?? null;
  });
}

/**
 * Attribuisce (o sposta) uno studio a un partner, a mano. In UNA istruzione: un upsert, non
 * «leggi e poi scrivi». Il registro attività dice chi, quando, e da quale partner veniva.
 */
export async function attribuisciDaStaff(
  staffId: string,
  orgId: string,
  codice: string,
  nota: string | null,
): Promise<{ prima: string | null }> {
  const p = await partnerAttivo(codice);
  if (!p) throw new Error(messaggioCodiceSconosciuto(codice));
  return withTenant({ userId: staffId, platformAdmin: true }, async (tx) => {
    const [vecchia] = await tx
      .select({ codice: attribuzionePartner.partnerCodice })
      .from(attribuzionePartner)
      .where(eq(attribuzionePartner.organizationId, orgId))
      .limit(1);
    await tx
      .insert(attribuzionePartner)
      .values({ organizationId: orgId, partnerCodice: codice, origine: "staff", attribuitaDa: staffId, nota })
      .onConflictDoUpdate({
        target: attribuzionePartner.organizationId,
        set: { partnerCodice: codice, origine: "staff", attribuitaDa: staffId, nota, attribuitaIl: sql`now()` },
      });
    await logAudit(tx, {
      organizationId: orgId,
      userId: staffId,
      azione: "partner.attribuisci",
      entita: "organization",
      entitaId: orgId,
      dettagli: { partner: codice, origine: "staff", prima: vecchia?.codice ?? null, nota },
    });
    return { prima: vecchia?.codice ?? null };
  });
}

/** Toglie l'attribuzione di uno studio. Solo lo staff, e resta scritto nel registro attività. */
export async function rimuoviAttribuzione(staffId: string, orgId: string): Promise<boolean> {
  return withTenant({ userId: staffId, platformAdmin: true }, async (tx) => {
    const tolte = await tx
      .delete(attribuzionePartner)
      .where(eq(attribuzionePartner.organizationId, orgId))
      .returning({ codice: attribuzionePartner.partnerCodice });
    if (!tolte.length) return false;
    await logAudit(tx, {
      organizationId: orgId,
      userId: staffId,
      azione: "partner.rimuovi",
      entita: "organization",
      entitaId: orgId,
      dettagli: { partner: tolte[0]!.codice },
    });
    return true;
  });
}
