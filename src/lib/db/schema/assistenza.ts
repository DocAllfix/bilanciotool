import { boolean, index, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { organization, user } from "./auth";

// L'ASSISTENZA: le richieste di chi usa il prodotto, e le risposte dello staff.
//
// ⚠️ Un ticket è della PERSONA che lo apre, non dello studio. Un collega dello stesso
// studio non vede le richieste dell'altro: si scrive all'assistenza anche per dire «non
// riesco a fare quello che il mio socio mi ha chiesto», e una richiesta che il socio può
// leggere è una richiesta che non si scrive. È la scelta di Evalis Academy, e la policy
// della migrazione 0058 la impone sul database, non solo nella query.
//
// `organization_id` c'è lo stesso, per due ragioni che non riguardano la visibilità:
// il registro delle operazioni appartiene a un'organizzazione, e lo staff che risponde
// deve sapere da quale studio arriva la richiesta.
//
// ⚠️ L'ASSISTENZA NON STA DIETRO IL PAYWALL. Chi ha l'abbonamento scaduto o il pagamento
// rifiutato è esattamente chi ha bisogno di scrivere: chiudergli la porta proprio lì
// sarebbe il contrario del servizio. Nessuna azione qui chiama `requireEntitlement`, ed è
// scritto come eccezione dichiarata in `paywall-superfici-nuove.db.test.ts`.

export const assistenzaTicket = pgTable(
  "assistenza_ticket",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    oggetto: text("oggetto").notNull(),
    /**
     *   `aperto`     tocca allo staff
     *   `in_attesa`  lo staff ha risposto, tocca a chi ha scritto
     *   `chiuso`     risolto; una nuova risposta di chi ha scritto lo riapre
     */
    stato: text("stato", { enum: ["aperto", "in_attesa", "chiuso"] }).notNull().default("aperto"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("assistenza_ticket_user_idx").on(t.userId, t.updatedAt),
    index("assistenza_ticket_stato_idx").on(t.stato, t.updatedAt),
  ],
);

export const assistenzaMessaggio = pgTable(
  "assistenza_messaggio",
  {
    id: text("id").primaryKey(),
    ticketId: text("ticket_id")
      .notNull()
      .references(() => assistenzaTicket.id, { onDelete: "cascade" }),
    /** `set null`: se un membro dello staff lascia, le sue risposte restano leggibili. */
    autoreId: text("autore_id").references(() => user.id, { onDelete: "set null" }),
    /**
     * Scritto come staff. Lo decide il SERVER dalla sessione, mai il client.
     *
     * ⚠️ Serve una colonna e non un confronto `autore_id <> ticket.user_id`: un membro
     * dello staff che apre un ticket per sé scrive come utente, e il confronto lo
     * direbbe staff — la sua domanda comparirebbe come una risposta.
     */
    staff: boolean("staff").notNull().default(false),
    testo: text("testo").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("assistenza_messaggio_ticket_idx").on(t.ticketId, t.createdAt)],
);
