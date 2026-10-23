import { boolean, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { organization, user } from "./auth";

// I PARTNER: chi presenta EvalisDeck a nuovi clienti e prende una provvigione su ciò che
// quei clienti pagano (decisione del committente, 23 ottobre 2026).
//
// ⚠️ NON è un codice sconto. Stripe non ammette uno sconto a zero (minimo 0,01% o un
// centesimo: misurato sulla sandbox), e un finto sconto finirebbe sulla fattura. Il codice
// si scrive all'ISCRIZIONE, si lega allo studio, e da lì segue ogni pagamento, rinnovi
// compresi.

/** Il registro dei codici. Un codice che non sta qui viene rifiutato all'iscrizione: un
 *  «NRG» scritto per sbaglio non deve diventare un'attribuzione persa in silenzio. */
export const partner = pgTable("partner", {
  /** Il codice da scrivere, in maiuscolo: «NGR». */
  codice: text("codice").primaryKey(),
  nome: text("nome").notNull(),
  /** Un partner spento non si può più scrivere all'iscrizione; le attribuzioni restano. */
  attivo: boolean("attivo").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

/**
 * A quale partner appartiene uno studio. Una riga per studio.
 *
 * ⚠️ Lo studio la può LEGGERE ma non cambiare: la provvigione si paga su questa riga, e
 * uno studio che potesse spostarla deciderebbe chi viene pagato. La scrive l'iscrizione
 * (una volta, alla nascita dello studio) e la cambia solo lo staff, con nome e data.
 *
 * Gli importi NON stanno qui, per la regola della migrazione 0017: il denaro vive in
 * Stripe, e la pagina dello staff li legge da lì.
 */
export const attribuzionePartner = pgTable("attribuzione_partner", {
  organizationId: text("organization_id")
    .primaryKey()
    .references(() => organization.id, { onDelete: "cascade" }),
  partnerCodice: text("partner_codice")
    .notNull()
    .references(() => partner.codice),
  /** `registrazione` (scritto da chi si iscrive) o `staff` (attribuito a mano). */
  origine: text("origine").notNull(),
  attribuitaIl: timestamp("attribuita_il", { withTimezone: true }).defaultNow().notNull(),
  /** Chi l'ha attribuita: chi si è iscritto, o la persona dello staff. */
  attribuitaDa: text("attribuita_da").references(() => user.id, { onDelete: "set null" }),
  nota: text("nota"),
});
