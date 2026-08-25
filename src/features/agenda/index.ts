import { and, asc, eq, inArray, lte, ne } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { withTenant } from "@/lib/db/tenant";
import { agendaVoce, company } from "@/lib/db/schema";
import { logAudit } from "@/lib/audit";
import { requireEntitlement } from "@/features/entitlement";
import { dataIsoValida } from "@/features/sgesg/programma";

// L'agenda dello studio: le date che lo studio decide.
//
// ⚠️ Ogni select porta il filtro esplicito sull'organizzazione oltre a RLS: in sviluppo la
// connessione e' privilegiata e le policy non scattano, quindi una query senza filtro
// funzionerebbe qui e mostrerebbe l'agenda di tutti gli studi. E' successo con lo
// scadenzario, ed e' il motivo per cui la regola esiste.

export type Voce = typeof agendaVoce.$inferSelect;
export type TipoVoce = "scadenza" | "milestone" | "azione";
export type StatoVoce = "aperta" | "fatta" | "annullata";

export type VoceConAzienda = Voce & { companyNome: string | null };

export type DatiVoce = {
  tipo: TipoVoce;
  titolo: string;
  data: string;
  note?: string | null;
  companyId?: string | null;
};

/** Oggi in ISO, secondo il calendario di chi guarda. Un solo posto dove si decide. */
export function oggiIso(adesso = new Date()): string {
  // ⚠️ In ora LOCALE e non UTC. Le voci d'agenda le scrive e le legge una persona in
  // Italia: alle 00:30 del quindici, `toISOString()` direbbe ancora il quattordici, e
  // «le scadenze di oggi» mostrerebbe quelle di ieri. Sui termini di legge vale la
  // regola opposta (UTC), e i due casi non si contraddicono: li' conta il termine, qui
  // conta il giorno in cui uno si trova.
  const a = adesso.getFullYear();
  const m = String(adesso.getMonth() + 1).padStart(2, "0");
  const g = String(adesso.getDate()).padStart(2, "0");
  return `${a}-${m}-${g}`;
}

/** Tutte le voci dello studio, dalla data piu' vicina. Le chiuse in fondo. */
export async function elencaAgenda(
  userId: string,
  orgId: string,
  opts: { includiChiuse?: boolean; companyId?: string } = {},
): Promise<VoceConAzienda[]> {
  return withTenant({ userId, orgId }, async (tx) => {
    const dove = [eq(agendaVoce.organizationId, orgId)];
    if (!opts.includiChiuse) dove.push(eq(agendaVoce.stato, "aperta"));
    if (opts.companyId) dove.push(eq(agendaVoce.companyId, opts.companyId));
    const righe = await tx
      .select()
      .from(agendaVoce)
      .where(and(...dove))
      .orderBy(asc(agendaVoce.data), asc(agendaVoce.createdAt));

    // ⚠️ I nomi delle aziende in UNA lettura, non una per voce. Su questo database un
    // viaggio costa piu' della lettura, e un'agenda con trenta voci ne farebbe trenta.
    const ids = [...new Set(righe.map((r) => r.companyId).filter((x): x is string => !!x))];
    const nomi = ids.length
      ? new Map(
          (
            await tx
              .select({ id: company.id, nome: company.nome })
              .from(company)
              .where(and(inArray(company.id, ids), eq(company.organizationId, orgId)))
          ).map((c) => [c.id, c.nome]),
        )
      : new Map<string, string>();

    return righe.map((r) => ({ ...r, companyNome: r.companyId ? (nomi.get(r.companyId) ?? null) : null }));
  });
}

/** Le voci aperte con data non oltre `entro`: quello che chiede attenzione adesso. */
export async function agendaImminente(
  userId: string,
  orgId: string,
  entro: string,
  limite = 6,
): Promise<VoceConAzienda[]> {
  const tutte = await elencaAgenda(userId, orgId);
  return tutte.filter((v) => v.data <= entro).slice(0, limite);
}

export async function creaVoce(userId: string, orgId: string, dati: DatiVoce): Promise<string> {
  await requireEntitlement(userId, orgId, "write_data");
  const titolo = dati.titolo.trim();
  if (!titolo) throw new Error("Il titolo non puo' essere vuoto");
  // ⚠️ La data si ricompone e si confronta: `new Date("2026-02-31")` non solleva, scivola
  // al 3 marzo. Su una scadenza promessa a un cliente un giorno inventato non e' un
  // dettaglio.
  if (!dataIsoValida(dati.data)) throw new Error("La data va scritta come AAAA-MM-GG e deve esistere");

  const id = randomUUID();
  await withTenant({ userId, orgId }, async (tx) => {
    if (dati.companyId) {
      const [az] = await tx
        .select({ id: company.id })
        .from(company)
        .where(and(eq(company.id, dati.companyId), eq(company.organizationId, orgId)))
        .limit(1);
      if (!az) throw new Error("Azienda inesistente o di un altro studio");
    }
    await tx.insert(agendaVoce).values({
      id,
      organizationId: orgId,
      companyId: dati.companyId ?? null,
      tipo: dati.tipo,
      titolo,
      note: dati.note?.trim() || null,
      data: dati.data,
      creataDa: userId,
    });
    await logAudit(tx, {
      organizationId: orgId,
      userId,
      azione: "agenda.voce.create",
      entita: "agenda_voce",
      entitaId: id,
      dettagli: { tipo: dati.tipo },
    });
  });
  return id;
}

export type CampoVoce = "titolo" | "note" | "data";

/** Un campo per volta, come ovunque: la riga intera non passa mai dal browser. */
export async function setCampoVoce(
  userId: string,
  orgId: string,
  voceId: string,
  campo: CampoVoce,
  valore: string | null,
): Promise<void> {
  await requireEntitlement(userId, orgId, "write_data");
  const v = valore?.trim() || null;
  if (campo === "titolo" && !v) throw new Error("Il titolo non puo' essere vuoto");
  if (campo === "data") {
    if (!v) throw new Error("La data non puo' restare vuota");
    if (!dataIsoValida(v)) throw new Error("La data va scritta come AAAA-MM-GG e deve esistere");
  }

  await withTenant({ userId, orgId }, async (tx) => {
    const tocca = await tx
      .update(agendaVoce)
      .set({ [campo]: v, updatedAt: new Date() })
      .where(and(eq(agendaVoce.id, voceId), eq(agendaVoce.organizationId, orgId)))
      .returning({ id: agendaVoce.id });
    if (!tocca.length) throw new Error("Voce inesistente o di un altro studio");
    await logAudit(tx, {
      organizationId: orgId,
      userId,
      azione: "agenda.voce.set",
      entita: "agenda_voce",
      entitaId: voceId,
      dettagli: { campo },
    });
  });
}

/**
 * Chiude o riapre una voce.
 *
 * ⚠️ `chiusaIl` si scrive e si CANCELLA insieme allo stato, e lo pretende un CHECK del
 * database: senza, il «quando l'ho fatta» sopravviverebbe alla riapertura e la voce
 * direbbe di essere stata chiusa un giorno in cui era aperta.
 */
export async function setStatoVoce(
  userId: string,
  orgId: string,
  voceId: string,
  stato: StatoVoce,
): Promise<void> {
  await requireEntitlement(userId, orgId, "write_data");
  await withTenant({ userId, orgId }, async (tx) => {
    const tocca = await tx
      .update(agendaVoce)
      .set({ stato, chiusaIl: stato === "aperta" ? null : new Date(), updatedAt: new Date() })
      .where(and(eq(agendaVoce.id, voceId), eq(agendaVoce.organizationId, orgId)))
      .returning({ id: agendaVoce.id });
    if (!tocca.length) throw new Error("Voce inesistente o di un altro studio");
    await logAudit(tx, {
      organizationId: orgId,
      userId,
      azione: "agenda.voce.stato",
      entita: "agenda_voce",
      entitaId: voceId,
      dettagli: { stato },
    });
  });
}

export async function eliminaVoce(userId: string, orgId: string, voceId: string): Promise<void> {
  await requireEntitlement(userId, orgId, "write_data");
  await withTenant({ userId, orgId }, async (tx) => {
    const tolto = await tx
      .delete(agendaVoce)
      .where(and(eq(agendaVoce.id, voceId), eq(agendaVoce.organizationId, orgId)))
      .returning({ id: agendaVoce.id });
    if (!tolto.length) throw new Error("Voce inesistente o di un altro studio");
    await logAudit(tx, {
      organizationId: orgId,
      userId,
      azione: "agenda.voce.delete",
      entita: "agenda_voce",
      entitaId: voceId,
    });
  });
}

/** Quante voci aperte sono in ritardo o scadono oggi: il numero del cruscotto. */
export async function conteggioDaFare(userId: string, orgId: string, oggi: string): Promise<number> {
  return withTenant({ userId, orgId }, async (tx) => {
    const righe = await tx
      .select({ id: agendaVoce.id })
      .from(agendaVoce)
      .where(
        and(
          eq(agendaVoce.organizationId, orgId),
          eq(agendaVoce.stato, "aperta"),
          lte(agendaVoce.data, oggi),
          // Difesa in piu' e non ridondanza: se un domani si aggiungesse uno stato
          // «sospesa», questa riga la escluderebbe da sola invece di contarla.
          ne(agendaVoce.stato, "annullata"),
        ),
      );
    return righe.length;
  });
}
