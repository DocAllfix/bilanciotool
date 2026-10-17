import { cache } from "react";
import { and, eq } from "drizzle-orm";
import { dbCorrente, withTenant } from "@/lib/db/tenant";
import { assegnazionePercorso, contentSet, corpusRegisterRow, orgEntitlement } from "@/lib/db/schema";
import { PIANI } from "@/lib/prezzi";
import { moduloDelDocumento, type ModuloAzienda } from "@/features/companies/moduli";
import type { TipoDocumento } from "@/features/documents/tipi";
import { ForbiddenError, requireConsultant, type OrgRole } from "./guards";

// I percorsi che una persona può vedere e scrivere.
//
// Fascia «Azienda» (decisione del committente del 17 ottobre 2026): l'amministratore
// assegna a ciascun collaboratore i percorsi di cui si occupa, e il collaboratore vede e
// scrive SOLO quelli. Negli studi non cambia niente: ognuno vede tutto il portafoglio.
//
// ⚠️ QUI È IL DIVIETO, non nell'interfaccia. La barra laterale che nasconde un percorso è
// presentazione: la prova è il server che rifiuta l'azione, e la riga che non compare.
//
// ⚠️ PER PERCORSO, non per azienda (migrazione 0068): la guardia non dipende da nessun id che
// arriva dal browser.
//
// ⚠️ Il piano e le assegnazioni si leggono DENTRO `withTenant`: sono tabelle tenant, e in
// produzione una lettura senza contesto vedrebbe zero righe — cioè «nessun piano», cioè uno
// studio, cioè tutto aperto. Una guardia che si apre quando non riesce a leggere è la forma
// peggiore che possa avere.

const AMMINISTRATORI: readonly OrgRole[] = ["owner", "admin"];

/** Vero se lo studio è nella fascia con le assegnazioni (oggi: «Azienda»). */
export const usoInterno = cache(async function usoInterno(userId: string, orgId: string): Promise<boolean> {
  const r = await withTenant({ userId, orgId }, (tx) =>
    tx
      .select({ piano: orgEntitlement.piano })
      .from(orgEntitlement)
      .where(eq(orgEntitlement.organizationId, orgId))
      .limit(1),
  );
  const piano = r[0]?.piano;
  return !!piano && PIANI[piano]?.usoInterno === true;
});

const assegnati = cache(async function assegnati(userId: string, orgId: string): Promise<ModuloAzienda[]> {
  const r = await withTenant({ userId, orgId }, (tx) =>
    tx
      .select({ modulo: assegnazionePercorso.modulo })
      .from(assegnazionePercorso)
      // Filtro esplicito oltre a RLS: i due strati si difendono a vicenda.
      .where(and(eq(assegnazionePercorso.organizationId, orgId), eq(assegnazionePercorso.userId, userId))),
  );
  return r.map((x) => x.modulo);
});

/**
 * I percorsi visibili a questa persona, oppure `null` se li vede tutti (studi, e
 * amministratori della fascia «Azienda»).
 */
export async function percorsiVisibili(s: { userId: string; orgId: string; role: OrgRole }): Promise<ReadonlySet<ModuloAzienda> | null> {
  if (AMMINISTRATORI.includes(s.role)) return null;
  if (!(await usoInterno(s.userId, s.orgId))) return null;
  return new Set(await assegnati(s.userId, s.orgId));
}

/** Vero se la persona amministra: nella fascia «Azienda» è chi assegna i percorsi. */
export function amministra(role: OrgRole): boolean {
  return AMMINISTRATORI.includes(role);
}

/**
 * La guardia dei percorsi: come `requireConsultant`, più il percorso.
 *
 * Accetta più moduli quando le stesse azioni servono più percorsi (le viste di NIS2 stanno
 * anche nel suo sistema di gestione): basta averne uno.
 */
export async function requirePercorso(...moduli: [ModuloAzienda, ...ModuloAzienda[]]) {
  const s = await requireConsultant();
  const visibili = await percorsiVisibili(s);
  if (visibili && !moduli.some((m) => visibili.has(m))) {
    throw new ForbiddenError("Questo percorso non ti è stato assegnato: chiedilo all'amministratore.");
  }
  return s;
}

/**
 * Le funzioni riservate a chi amministra quando lo studio è un'azienda in uso interno
 * (condivisione col cliente, creazione e archiviazione dell'azienda). Negli studi resta
 * il comportamento di prima: un membro le può usare.
 */
export async function requireAmministrazioneInterna() {
  const s = await requireConsultant();
  if (!amministra(s.role) && (await usoInterno(s.userId, s.orgId))) {
    throw new ForbiddenError("Riservato all'amministratore dell'azienda.");
  }
  return s;
}

/**
 * Il percorso di ogni dominio di contenuti. `Record` sull'enum: un dominio nuovo senza il
 * suo percorso non compila, invece di restare aperto a chiunque.
 */
const PERCORSI_DEL_DOMINIO: Record<(typeof contentSet.$inferSelect)["dominio"], [ModuloAzienda, ...ModuloAzienda[]]> = {
  ghg: ["ghg"],
  energy: ["energetico"],
  report: ["bilancio"],
  supplier: ["fornitore"],
  soa: ["soa"],
  mog231: ["mog231"],
  iso37001: ["anticorruzione"],
  wb: ["segnalazioni"],
  filiera: ["filiera"],
  sgiqas: ["sgiqas"],
  sa8000: ["sa8000"],
  sgesg: ["sgesg"],
  nis2: ["nis2", "sgnis2"],
  gdpr: ["gdpr"],
  pas: ["pas24000"],
};

/**
 * La guardia del corpus: le procedure e i registri sono condivisi fra i moduli, e il
 * percorso si ricava dal content set della chiamata. Un content set sconosciuto RIFIUTA.
 */
export async function requirePercorsoDelContentSet(contentSetId: string) {
  const r = await dbCorrente().select({ dominio: contentSet.dominio }).from(contentSet).where(eq(contentSet.id, contentSetId)).limit(1);
  if (!r[0]) throw new ForbiddenError("Contenuto sconosciuto.");
  return requirePercorso(...PERCORSI_DEL_DOMINIO[r[0].dominio]);
}

/** Come sopra, quando la chiamata porta solo la riga di un registro. */
export async function requirePercorsoDellaRiga(rowId: string) {
  const s = await requireConsultant();
  const r = await withTenant({ userId: s.userId, orgId: s.orgId }, (tx) =>
    tx
      .select({ contentSetId: corpusRegisterRow.contentSetId })
      .from(corpusRegisterRow)
      .where(and(eq(corpusRegisterRow.id, rowId), eq(corpusRegisterRow.organizationId, s.orgId)))
      .limit(1),
  );
  if (!r[0]) throw new ForbiddenError("Registrazione non trovata.");
  return requirePercorsoDelContentSet(r[0].contentSetId);
}

/** La guardia dei documenti: il percorso si ricava dal tipo. Un tipo senza percorso RIFIUTA. */
export async function requirePercorsoDelDocumento(tipo: TipoDocumento) {
  const m = moduloDelDocumento(tipo);
  if (!m) throw new ForbiddenError("Documento senza percorso.");
  return requirePercorso(m);
}

/** Vero se questa persona può vedere i documenti di quel tipo. Per filtrare gli elenchi. */
export function documentoVisibile(visibili: ReadonlySet<ModuloAzienda> | null, tipo: TipoDocumento): boolean {
  if (!visibili) return true;
  const m = moduloDelDocumento(tipo);
  return !!m && visibili.has(m);
}
