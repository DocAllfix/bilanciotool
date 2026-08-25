import { pgTable, text, integer, timestamp, index } from "drizzle-orm/pg-core";
import { organization, user } from "./auth";
import { company } from "./tenancy";

// I COMPENSI DELLO STUDIO: quanto è stato concordato, quanto è arrivato.
//
// ⚠️ IL VINCOLO PIÙ IMPORTANTE DI QUESTO FILE NON È UNA COLONNA: è che queste due tabelle
// non compaiano in nessuna query del PORTALE CLIENTE.
//
// Il portale (`/documenti-cliente/[token]`) serve i documenti pubblicati di un'azienda a
// chi ha il collegamento, **senza sessione e senza password**. Il collegamento è per
// AZIENDA, non per documento: chi lo riceve vede tutto ciò che quella rotta restituisce.
// Un importo che ci finisse sarebbe il prezzo che uno studio ha chiesto, visibile al
// cliente che lo paga.
//
// La difesa non è un filtro nella query — quella deve restare giusta per sempre, e un
// giorno qualcuno aggiungerà un join «per comodità». La difesa è che il compenso vive in
// una tabella che quella rotta **non nomina**, e che non compare in nessuna pagina
// dell'azienda: né nel fascicolo, né nei percorsi. Sta in `/compensi`, che è dello studio.
// Un pericolo si evita, non si filtra.
//
// ⚠️ E gli importi sono in CENTESIMI, interi. È la stessa scelta di `src/lib/prezzi.ts`,
// e la ragione è la stessa: un `numeric` andrebbe bene ma passa dal browser come stringa
// e prima o poi qualcuno ci fa un `Number()`; un float è fuori discussione. In centesimi
// un totale è una somma di interi, e resta esatto.

export const compenso = pgTable(
  "compenso",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    /** L'azienda per cui si lavora. Obbligatoria: un compenso senza cliente non esiste. */
    companyId: text("company_id")
      .notNull()
      .references(() => company.id, { onDelete: "cascade" }),
    /** «Bilancio di sostenibilità 2025», «Rinnovo SoA». Che cosa si è venduto. */
    descrizione: text("descrizione").notNull(),
    /** Concordato, in centesimi. */
    importo: integer("importo").notNull(),
    /**
     * Lo stato commerciale.
     *
     * ⚠️ `fatturato` NON significa che il prodotto abbia emesso una fattura: EvalisDeck
     * non emette niente e non tocca lo SdI — è una decisione del committente, e i suoi
     * studi hanno già un gestionale per quello. Qui è un promemoria di ciò che è
     * successo altrove.
     */
    stato: text("stato", { enum: ["previsto", "concordato", "fatturato", "incassato"] })
      .notNull()
      .default("concordato"),
    /** Quando è atteso il pagamento. ISO `AAAA-MM-GG`. */
    scadenza: text("scadenza"),
    note: text("note"),
    creatoDa: text("creato_da").references(() => user.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("compenso_org_idx").on(t.organizationId),
    index("compenso_company_idx").on(t.companyId),
  ],
);

/**
 * Gli acconti: una riga per incasso, non un totale che si riscrive.
 *
 * ⚠️ Un campo `incassato` da aggiornare a ogni versamento sarebbe un read-modify-write su
 * un numero, cioè il difetto che questo progetto ha già pagato tre volte in altre forme.
 * Con una riga per incasso il totale è una somma, il secondo acconto non può cancellare
 * il primo, e resta la storia — che su un pagamento contestato è l'unica cosa che serve.
 */
export const compensoIncasso = pgTable(
  "compenso_incasso",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    compensoId: text("compenso_id")
      .notNull()
      .references(() => compenso.id, { onDelete: "cascade" }),
    /** In centesimi, come tutto il resto. */
    importo: integer("importo").notNull(),
    /** Quando è arrivato. ISO `AAAA-MM-GG`. */
    data: text("data").notNull(),
    note: text("note"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("compenso_incasso_compenso_idx").on(t.compensoId),
    index("compenso_incasso_org_idx").on(t.organizationId),
  ],
);
