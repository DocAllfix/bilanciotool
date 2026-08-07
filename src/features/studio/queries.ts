import { db } from "@/lib/db";
import { organization, member, invitation, user, orgEntitlement } from "@/lib/db/schema";
import { and, eq, gt, asc } from "drizzle-orm";
import { getAccountStatus, getCompanyUsage, getLimitiEffettivi } from "@/features/entitlement";
import { PIANI, type PianoKey } from "@/lib/prezzi";

// Letture per la pagina Impostazioni.
//
// `member` e `invitation` stanno nel passthrough RLS (sono le tabelle che Better Auth
// interroga senza il nostro contesto), quindi si leggono con la connessione normale. Il
// filtro sull'organizzazione resta comunque **esplicito** in ogni select: in sviluppo le
// policy non scattano, e senza filtro si vedrebbero i membri di tutti gli studi. È già
// successo con lo scadenzario.

export type DatiStudio = {
  nome: string;
  slug: string | null;
  creatoIl: Date | null;
};

export async function getDatiStudio(orgId: string): Promise<DatiStudio | null> {
  const r = await db
    .select({ nome: organization.name, slug: organization.slug, creatoIl: organization.createdAt })
    .from(organization)
    .where(eq(organization.id, orgId))
    .limit(1);
  return r[0] ?? null;
}

export type Membro = {
  id: string;
  userId: string;
  nome: string;
  email: string;
  ruolo: string;
  daQuando: Date | null;
};

export type InvitoPendente = {
  id: string;
  email: string;
  ruolo: string | null;
  scadeIl: Date;
};

export type QuadroAccessi = {
  membri: Membro[];
  inviti: InvitoPendente[];
  /** Persone che occupano un posto: membri effettivi. Gli inviti non ancora accettati no. */
  usati: number;
  limite: number;
  pieno: boolean;
};

export async function getQuadroAccessi(orgId: string): Promise<QuadroAccessi> {
  const membri = await db
    .select({
      id: member.id,
      userId: member.userId,
      nome: user.name,
      email: user.email,
      ruolo: member.role,
      daQuando: member.createdAt,
    })
    .from(member)
    .innerJoin(user, eq(user.id, member.userId))
    .where(eq(member.organizationId, orgId))
    .orderBy(asc(member.createdAt));

  // Solo gli inviti ancora validi: uno scaduto non si può accettare, e mostrarlo come
  // pendente farebbe aspettare una persona che non arriverà mai.
  const inviti = await db
    .select({
      id: invitation.id,
      email: invitation.email,
      ruolo: invitation.role,
      scadeIl: invitation.expiresAt,
    })
    .from(invitation)
    .where(
      and(
        eq(invitation.organizationId, orgId),
        eq(invitation.status, "pending"),
        gt(invitation.expiresAt, new Date()),
      ),
    )
    .orderBy(asc(invitation.expiresAt));

  const limiti = await getLimitiEffettivi(orgId);
  return {
    membri,
    inviti,
    usati: membri.length,
    limite: limiti.maxMembers,
    pieno: membri.length >= limiti.maxMembers,
  };
}

export type QuadroAbbonamento = {
  status: Awaited<ReturnType<typeof getAccountStatus>>;
  piano: PianoKey | null;
  nomePiano: string | null;
  /** Capacità inclusa nel piano, prima delle estensioni. */
  aziendeDelPiano: number | null;
  accessiDelPiano: number | null;
  aziendeExtra: number;
  accessiExtra: number;
  whiteLabel: boolean;
  aziendeUsate: number;
  aziendeTotali: number;
  accessiUsati: number;
  accessiTotali: number;
  attivatoIl: Date | null;
  rinnovoIl: Date | null;
  /** Il rimborso di quattordici giorni si può ancora chiedere? */
  rimborsabile: boolean;
};

export async function getQuadroAbbonamento(userId: string, orgId: string): Promise<QuadroAbbonamento> {
  const [status, usoAziende, accessi, righe] = await Promise.all([
    getAccountStatus(userId, orgId),
    getCompanyUsage(userId, orgId),
    getQuadroAccessi(orgId),
    db
      .select({
        piano: orgEntitlement.piano,
        aziendeExtra: orgEntitlement.aziendeExtra,
        accessiExtra: orgEntitlement.accessiExtra,
        whiteLabel: orgEntitlement.whiteLabel,
        attivatoIl: orgEntitlement.activatedAt,
        rinnovoIl: orgEntitlement.currentPeriodEnd,
      })
      .from(orgEntitlement)
      .where(eq(orgEntitlement.organizationId, orgId))
      .limit(1),
  ]);

  const e = righe[0];
  const piano = (e?.piano ?? null) as PianoKey | null;

  return {
    status,
    piano,
    nomePiano: piano ? PIANI[piano].nome : null,
    aziendeDelPiano: piano ? PIANI[piano].aziende : null,
    accessiDelPiano: piano ? PIANI[piano].accessi : null,
    aziendeExtra: e?.aziendeExtra ?? 0,
    accessiExtra: e?.accessiExtra ?? 0,
    whiteLabel: e?.whiteLabel ?? false,
    aziendeUsate: usoAziende.active,
    aziendeTotali: usoAziende.limit,
    accessiUsati: accessi.usati,
    accessiTotali: accessi.limite,
    attivatoIl: e?.attivatoIl ?? null,
    rinnovoIl: e?.rinnovoIl ?? null,
    rimborsabile: await entroQuattordiciGiorniSenzaDocumenti(orgId, e?.attivatoIl ?? null),
  };
}

/**
 * Il rimborso promesso dai Termini: integrale entro quattordici giorni, **se non è stato
 * pubblicato alcun documento**. È un criterio verificabile sui fatti, non una valutazione:
 * o esiste una revisione pubblicata, o non esiste.
 */
async function entroQuattordiciGiorniSenzaDocumenti(orgId: string, attivatoIl: Date | null): Promise<boolean> {
  if (!attivatoIl) return false;
  const giorni = (Date.now() - attivatoIl.getTime()) / 86_400_000;
  if (giorni > 14) return false;
  const { documentSnapshot } = await import("@/lib/db/schema");
  const r = await db
    .select({ id: documentSnapshot.id })
    .from(documentSnapshot)
    .where(eq(documentSnapshot.organizationId, orgId))
    .limit(1);
  return r.length === 0;
}
