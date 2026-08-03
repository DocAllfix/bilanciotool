import { pgTable, text, timestamp, integer, jsonb, index, uniqueIndex } from "drizzle-orm/pg-core";
import { organization } from "./auth";
import { company } from "./tenancy";

// Modulo ESG SUPPLIER READY (ESRS · GRI · ISO 20400 · D.Lgs. 231/2001).
// Autovalutazione compilata dall'azienda per rispondere alla richiesta di un
// committente. Tutte tabelle TENANT (RLS su organization_id).
//
// REGOLA: nessuna colonna per valori derivati — indice, punteggi per area,
// recuperi e piano si calcolano in lettura da src/lib/calc/supplier e si
// scrivono solo dentro gli snapshot immutabili dell'attestato.

export const supplierAssessment = pgTable(
  "supplier_assessment",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    // UNA valutazione per azienda: non è un esercizio contabile ma la fotografia
    // corrente della prontezza, che si aggiorna. Le revisioni consegnate
    // restano congelate negli attestati pubblicati.
    companyId: text("company_id")
      .notNull()
      .references(() => company.id, { onDelete: "cascade" }),
    contentSetId: text("content_set_id").notNull(), // banca domande congelata alla creazione
    /** Punteggio minimo chiesto dal committente. Non è una costante di prodotto:
     *  cambia da bando a bando, e il documento deve poterlo dichiarare. */
    sogliaRichiesta: integer("soglia_richiesta").default(60).notNull(),
    // { piva, settore, ateco, dipendenti, fatturato, sede, referente,
    //   committente, scadenza }
    profilo: jsonb("profilo").default({}).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (t) => [
    uniqueIndex("supplier_assessment_company_uq").on(t.companyId),
    index("supplier_assessment_org_idx").on(t.organizationId),
  ],
);

// Una riga per domanda: risposta, nota, stato dell'evidenza e piano d'azione.
//
// Il prototipo teneva quattro mappe parallele (answers/notes/actions/docs): è un
// artefatto di localStorage. Hanno tutte la grana della domanda, quindi qui sono
// una tabella sola, e una domanda non può più esistere in una mappa e mancare
// nelle altre.
export const supplierAnswer = pgTable(
  "supplier_answer",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    assessmentId: text("assessment_id")
      .notNull()
      .references(() => supplierAssessment.id, { onDelete: "cascade" }),
    questionKey: text("question_key").notNull(),
    /** NULL non è 'na'. 'na' significa "non applicabile": la domanda è stata
     *  valutata ed esce da numeratore e denominatore. NULL significa "non
     *  ancora guardata": esce anche dal conteggio delle domande valutate.
     *  Confonderli gonfierebbe la percentuale di completamento. */
    risposta: text("risposta", { enum: ["si", "parziale", "no", "na"] }),
    nota: text("nota"),
    /** Stato dell'evidenza documentale attesa dalla domanda. */
    statoDocumento: text("stato_documento", { enum: ["assente", "da_aggiornare", "disponibile"] }),
    // Piano di adeguamento, per la sola domanda a cui si riferisce.
    responsabile: text("responsabile"),
    scadenza: text("scadenza"), // ISO date, testo: è una data di piano, non un istante
    statoAzione: text("stato_azione", { enum: ["da_avviare", "in_corso", "completata"] }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (t) => [
    uniqueIndex("supplier_answer_assessment_question_uq").on(t.assessmentId, t.questionKey),
    index("supplier_answer_org_idx").on(t.organizationId),
  ],
);
