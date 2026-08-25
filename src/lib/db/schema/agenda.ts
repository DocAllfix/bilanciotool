import { pgTable, text, timestamp, index } from "drizzle-orm/pg-core";
import { organization, user } from "./auth";
import { company } from "./tenancy";

// L'AGENDA DELLO STUDIO: le date che lo studio DECIDE.
//
// ⚠️ Non è lo scadenzario. Quello esiste dal 2026 e si CALCOLA: dice quali percorsi sono
// indietro rispetto a ciò che la norma impone — un inventario fermo all'esercizio
// scorso, un bilancio compilato e mai pubblicato. Nessuno lo scrive e nessuno lo può
// cancellare, perché non è un elenco di cose da fare: è una misura.
//
// Questa è l'altra metà, e finora mancava: la telefonata al referente, la riunione col
// consiglio, la consegna promessa per il quindici. Cose che un consulente si segna, e che
// il prodotto non poteva dedurre da nessun dato perché non stanno in nessun dato.
//
// I due elenchi restano DISTINTI e dichiarati come tali a schermo. Fonderli sembrerebbe
// un servizio e sarebbe una perdita: uno si chiude lavorando, l'altro si chiude
// spuntandolo, e un consulente che spunta «GHG 2025 da pubblicare» crede di aver chiuso
// un lavoro che nessuno ha fatto.
//
// ⚠️ UNA TABELLA SOLA per scadenze, milestone e azioni del giorno, dove ESG Nexus ne ha
// tre. Hanno la stessa grana — una cosa, una data, uno stato — e la differenza è di
// significato, non di struttura. È la stessa scelta fatta per le quattro mappe parallele
// del modulo segnalazioni, e per la stessa ragione: tre tabelle identiche vogliono dire
// tre volte lo stesso codice, e la terza resta indietro.

export const agendaVoce = pgTable(
  "agenda_voce",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    /**
     * L'azienda a cui la voce si riferisce, se ce n'è una.
     *
     * ⚠️ Nullo di proposito: metà del lavoro di uno studio non riguarda un cliente
     * preciso — la formazione interna, il rinnovo di un'accreditamento, la riunione di
     * gruppo. Pretendere un'azienda costringerebbe a inventarne una.
     */
    companyId: text("company_id").references(() => company.id, { onDelete: "cascade" }),
    /**
     * Che cosa è, e cambia solo come si legge:
     *   `scadenza`  una data entro cui qualcosa è dovuto
     *   `milestone` un traguardo del lavoro, che si celebra invece di subirlo
     *   `azione`    una cosa da fare, spesso oggi
     */
    tipo: text("tipo", { enum: ["scadenza", "milestone", "azione"] }).notNull(),
    titolo: text("titolo").notNull(),
    note: text("note"),
    /** Data ISO `AAAA-MM-GG`. Ogni voce ne ha una: senza, non è agenda, è un elenco. */
    data: text("data").notNull(),
    stato: text("stato", { enum: ["aperta", "fatta", "annullata"] }).notNull().default("aperta"),
    /** Quando è stata chiusa. Coerente con lo stato, e lo impone un CHECK. */
    chiusaIl: timestamp("chiusa_il", { withTimezone: true }),
    /** Chi l'ha creata: in uno studio con più consulenti serve sapere di chi è. */
    creataDa: text("creata_da").references(() => user.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("agenda_voce_org_data_idx").on(t.organizationId, t.data),
    index("agenda_voce_company_idx").on(t.companyId),
  ],
);
