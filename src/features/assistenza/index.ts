import { and, asc, desc, eq, inArray } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { withTenant } from "@/lib/db/tenant";
import { assistenzaMessaggio, assistenzaTicket, organization, user } from "@/lib/db/schema";
import { logAudit } from "@/lib/audit";
import { indirizzoCorrente } from "@/lib/indirizzo";
import { avvisaStaffAssistenza, avvisaUtenteAssistenza } from "@/lib/email";

// L'assistenza: la logica, SENZA guardie.
//
// ⚠️ Le guardie di sessione stanno in `actions.ts` e nelle pagine. Qui arrivano solo
// identificativi già verificati, ed è deliberato: il committente vuole un domani collegare
// un agente alla coda staff, che legga i ticket e prepari le risposte. Un agente non ha una
// sessione del browser — chiamerà queste funzioni con l'identità dello staff per cui
// lavora, e il perimetro resterà quello che impone il database.
//
// ⚠️ Il perimetro lo impone il DATABASE (migrazione 0058): chi scrive come utente passa
// `{ userId, orgId }` e vede solo i propri ticket; lo staff passa `platformAdmin`. Ogni
// select porta anche il filtro esplicito, perché in sviluppo la connessione è privilegiata
// e le policy non scattano.
//
// ⚠️ Le email partono DOPO la transazione e non possono farla fallire: un ticket scritto
// è un ticket valido anche se Resend è giù. Il guasto finisce nei log.

export type StatoTicket = "aperto" | "in_attesa" | "chiuso";
export type Ticket = typeof assistenzaTicket.$inferSelect;
export type Messaggio = typeof assistenzaMessaggio.$inferSelect;
export type TicketConMessaggi = Ticket & { messaggi: Messaggio[] };
export type TicketInCoda = Ticket & { nome: string; email: string; studio: string };

const OGGETTO_MAX = 200;
const TESTO_MAX = 8000;

function pulisci(testo: string, max: number, cosa: string): string {
  const t = testo.trim();
  if (!t) throw new Error(`${cosa}: il campo non può essere vuoto.`);
  if (t.length > max) throw new Error(`${cosa}: al massimo ${max} caratteri.`);
  return t;
}

/** Non deve mai far fallire il lavoro che accompagna. */
async function inBuonaFede(cosa: string, fn: () => Promise<unknown>): Promise<void> {
  try {
    await fn();
  } catch (e) {
    console.error(`[assistenza] ${cosa} non inviata`, e);
  }
}

// ── Chi scrive ────────────────────────────────────────────────────────────────────────

export async function apriTicket(
  userId: string,
  orgId: string,
  dati: { oggetto: string; testo: string },
): Promise<{ id: string }> {
  const oggetto = pulisci(dati.oggetto, OGGETTO_MAX, "Oggetto");
  const testo = pulisci(dati.testo, TESTO_MAX, "Messaggio");
  const id = randomUUID();

  const chi = await withTenant({ userId, orgId }, async (tx) => {
    await tx.insert(assistenzaTicket).values({ id, organizationId: orgId, userId, oggetto });
    await tx.insert(assistenzaMessaggio).values({ id: randomUUID(), ticketId: id, autoreId: userId, testo });
    // ⚠️ Nel registro dello studio non finisce l'oggetto: il registro lo leggono i colleghi,
    // e la richiesta no.
    await logAudit(tx, { organizationId: orgId, userId, azione: "assistenza.ticket.create", entita: "assistenza_ticket", entitaId: id });
    return leggiPersona(tx, userId, orgId);
  });

  await inBuonaFede("notifica allo staff", () =>
    avvisaStaffAssistenza({ nuovo: true, ...chi, oggetto, testo, url: `${indirizzoCorrente()}/staff/assistenza/${id}` }),
  );
  return { id };
}

export async function mieiTicket(userId: string, orgId: string): Promise<Ticket[]> {
  return withTenant({ userId, orgId }, (tx) =>
    tx.select().from(assistenzaTicket).where(eq(assistenzaTicket.userId, userId)).orderBy(desc(assistenzaTicket.updatedAt)),
  );
}

/** Il ticket di chi l'ha aperto. `null` se non è suo: per chi guarda, non esiste. */
export async function mioTicket(userId: string, orgId: string, ticketId: string): Promise<TicketConMessaggi | null> {
  return withTenant({ userId, orgId }, async (tx) => {
    const [t] = await tx
      .select()
      .from(assistenzaTicket)
      .where(and(eq(assistenzaTicket.id, ticketId), eq(assistenzaTicket.userId, userId)))
      .limit(1);
    if (!t) return null;
    return { ...t, messaggi: await messaggiDi(tx, ticketId) };
  });
}

/** Chi ha aperto il ticket risponde. Riapre un ticket chiuso o in attesa. */
export async function rispondiComeUtente(userId: string, orgId: string, ticketId: string, testo: string): Promise<void> {
  const t = pulisci(testo, TESTO_MAX, "Messaggio");
  const esito = await withTenant({ userId, orgId }, async (tx) => {
    const [tk] = await tx
      .select()
      .from(assistenzaTicket)
      .where(and(eq(assistenzaTicket.id, ticketId), eq(assistenzaTicket.userId, userId)))
      .limit(1);
    if (!tk) throw new Error("Richiesta inesistente.");
    await tx.insert(assistenzaMessaggio).values({ id: randomUUID(), ticketId, autoreId: userId, testo: t });
    await tx.update(assistenzaTicket).set({ stato: "aperto", updatedAt: new Date() }).where(eq(assistenzaTicket.id, ticketId));
    await logAudit(tx, { organizationId: tk.organizationId, userId, azione: "assistenza.ticket.reply", entita: "assistenza_ticket", entitaId: ticketId });
    return { oggetto: tk.oggetto, chi: await leggiPersona(tx, userId, tk.organizationId) };
  });

  await inBuonaFede("notifica allo staff", () =>
    avvisaStaffAssistenza({ nuovo: false, ...esito.chi, oggetto: esito.oggetto, testo: t, url: `${indirizzoCorrente()}/staff/assistenza/${ticketId}` }),
  );
}

// ── Staff ─────────────────────────────────────────────────────────────────────────────
//
// `staffId` è l'utente dello staff che agisce: entra nel messaggio e nel registro. Il
// perimetro è `platformAdmin`, cioè tutti i ticket.

const STAFF = (staffId: string) => ({ userId: staffId, platformAdmin: true });

/** La coda: per stato richiesto, dal più recente. Senza filtro, i non chiusi. */
export async function codaStaff(staffId: string, stati: StatoTicket[] = ["aperto", "in_attesa"]): Promise<TicketInCoda[]> {
  return withTenant(STAFF(staffId), async (tx) => {
    const righe = await tx
      .select({ t: assistenzaTicket, nome: user.name, email: user.email, studio: organization.name })
      .from(assistenzaTicket)
      .innerJoin(user, eq(user.id, assistenzaTicket.userId))
      .innerJoin(organization, eq(organization.id, assistenzaTicket.organizationId))
      .where(inArray(assistenzaTicket.stato, stati))
      .orderBy(desc(assistenzaTicket.updatedAt));
    return righe.map((r) => ({ ...r.t, nome: r.nome, email: r.email, studio: r.studio }));
  });
}

export async function ticketPerStaff(staffId: string, ticketId: string): Promise<(TicketInCoda & { messaggi: Messaggio[] }) | null> {
  return withTenant(STAFF(staffId), async (tx) => {
    const [r] = await tx
      .select({ t: assistenzaTicket, nome: user.name, email: user.email, studio: organization.name })
      .from(assistenzaTicket)
      .innerJoin(user, eq(user.id, assistenzaTicket.userId))
      .innerJoin(organization, eq(organization.id, assistenzaTicket.organizationId))
      .where(eq(assistenzaTicket.id, ticketId))
      .limit(1);
    if (!r) return null;
    return { ...r.t, nome: r.nome, email: r.email, studio: r.studio, messaggi: await messaggiDi(tx, ticketId) };
  });
}

/**
 * Lo staff risponde. Il ticket passa «in attesa» di chi l'ha aperto.
 *
 * ⚠️ Se lo staff risponde a un ticket SUO — un membro dello staff che ha scritto per sé —
 * l'email non parte: nessuno riceve la notifica di ciò che ha scritto lui.
 */
export async function rispondiComeStaff(staffId: string, ticketId: string, testo: string): Promise<void> {
  const t = pulisci(testo, TESTO_MAX, "Risposta");
  const esito = await withTenant(STAFF(staffId), async (tx) => {
    const [r] = await tx
      .select({ t: assistenzaTicket, email: user.email })
      .from(assistenzaTicket)
      .innerJoin(user, eq(user.id, assistenzaTicket.userId))
      .where(eq(assistenzaTicket.id, ticketId))
      .limit(1);
    if (!r) throw new Error("Richiesta inesistente.");
    await tx.insert(assistenzaMessaggio).values({ id: randomUUID(), ticketId, autoreId: staffId, staff: true, testo: t });
    await tx.update(assistenzaTicket).set({ stato: "in_attesa", updatedAt: new Date() }).where(eq(assistenzaTicket.id, ticketId));
    await logAudit(tx, { organizationId: r.t.organizationId, userId: staffId, azione: "assistenza.ticket.staff_reply", entita: "assistenza_ticket", entitaId: ticketId });
    return { oggetto: r.t.oggetto, proprietario: r.t.userId, email: r.email };
  });

  if (esito.proprietario === staffId) return;
  await inBuonaFede("notifica all'utente", () =>
    avvisaUtenteAssistenza(esito.email, { oggetto: esito.oggetto, testo: t, url: `${indirizzoCorrente()}/assistenza/${ticketId}` }),
  );
}

export async function cambiaStatoTicket(staffId: string, ticketId: string, stato: StatoTicket): Promise<void> {
  await withTenant(STAFF(staffId), async (tx) => {
    const [tk] = await tx
      .update(assistenzaTicket)
      .set({ stato, updatedAt: new Date() })
      .where(eq(assistenzaTicket.id, ticketId))
      .returning({ org: assistenzaTicket.organizationId });
    if (!tk) throw new Error("Richiesta inesistente.");
    await logAudit(tx, { organizationId: tk.org, userId: staffId, azione: "assistenza.ticket.stato", entita: "assistenza_ticket", entitaId: ticketId, dettagli: { stato } });
  });
}

// ── Comuni ────────────────────────────────────────────────────────────────────────────

type Tx = Parameters<Parameters<typeof withTenant>[1]>[0];

function messaggiDi(tx: Tx, ticketId: string): Promise<Messaggio[]> {
  return tx.select().from(assistenzaMessaggio).where(eq(assistenzaMessaggio.ticketId, ticketId)).orderBy(asc(assistenzaMessaggio.createdAt));
}

async function leggiPersona(tx: Tx, userId: string, orgId: string): Promise<{ nome: string; email: string; studio: string }> {
  const [u] = await tx.select({ nome: user.name, email: user.email }).from(user).where(eq(user.id, userId)).limit(1);
  const [o] = await tx.select({ studio: organization.name }).from(organization).where(eq(organization.id, orgId)).limit(1);
  return { nome: u?.nome ?? "", email: u?.email ?? "", studio: o?.studio ?? "" };
}
