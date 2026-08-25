import { pgTable, text, integer, timestamp, index, uniqueIndex } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { organization } from "./auth";
import { company } from "./tenancy";
import { contentSet } from "./content";

// IMPLEMENTAZIONE DEL SISTEMA DI GESTIONE ESG — il dodicesimo percorso.
//
// Dal progetto `DocAllfix/esg-nexus-v2`, e il nome e' del committente: «implementazione
// sistema di gestione ESG — che sarebbe il nexus». La sua lettura e' quella giusta, ed e'
// la ragione per cui questo file esiste in questa forma invece che come un secondo
// gestionale: le otto fasi e le 63 schede sono il percorso che porta **un'azienda, in un
// anno** da zero a un sistema ESG funzionante. Esattamente la forma degli altri undici.
//
// ⚠️ RI-ANCORAGGIO ALL'ORGANIZZAZIONE. In ESG Nexus ogni tabella porta `user_id` e le
// policy guardano `auth.uid()`, perche' li' il prodotto e' per un consulente solo.
// Tradurlo alla lettera darebbe uno studio in cui il socio non vede il lavoro del
// collega — e `rls-matrix.db.test.ts` fallirebbe subito, che e' la difesa che esiste
// apposta.
//
// ⚠️ E la parte di ESG Nexus che qui NON entra: clienti, agenda e compensi non
// appartengono a un'azienda, appartengono allo studio. Un compenso dentro il fascicolo di
// un'azienda sarebbe il prezzo dello studio dentro la cartella del cliente, e il
// collegamento del portale cliente e' per azienda. Quelli arrivano alle Fasi 6 e 7, in
// tabelle che il portale non nomina.

/**
 * Le otto fasi del metodo: catalogo versionato, non costanti nel codice.
 *
 * `PROC-00` … `PROC-07`, dall'acquisizione al follow-up a tre mesi. Sono contenuti
 * metodologici come i 25 sorgenti ISO o i 18 temi di materialita': si seminano, si
 * versionano, e il programma congela il set alla creazione.
 */
export const sgesgPhaseDef = pgTable(
  "sgesg_fase_def",
  {
    id: text("id").primaryKey(),
    setId: text("set_id")
      .notNull()
      .references(() => contentSet.id, { onDelete: "restrict" }),
    /** `proc00` … `proc07`. La chiave e' stabile, il codice e' cio' che si mostra. */
    key: text("key").notNull(),
    codice: text("codice").notNull(),
    nome: text("nome").notNull(),
    /** A che serve la fase, in una riga: e' la guida che il consulente legge. */
    scopo: text("scopo").notNull(),
    ordine: integer("ordine").notNull(),
  },
  (t) => [uniqueIndex("sgesg_fase_def_set_key_uq").on(t.setId, t.key)],
);

/**
 * Il programma: un'azienda, un anno, uno standard.
 *
 * ⚠️ `anno` e non una fotografia con revisioni: la rendicontazione e' annuale, e due
 * esercizi della stessa azienda sono due lavori distinti con confronto anno su anno. E'
 * la stessa natura del GHG, dell'energetico e del Bilancio.
 */
export const sgesgProgramma = pgTable(
  "sgesg_programma",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    companyId: text("company_id")
      .notNull()
      .references(() => company.id, { onDelete: "cascade" }),
    /** Congelato alla creazione: le fasi che il programma conosce sono quelle di allora. */
    contentSetId: text("content_set_id")
      .notNull()
      .references(() => contentSet.id, { onDelete: "restrict" }),
    anno: integer("anno").notNull(),
    /**
     * Lo standard verso cui si rendiconta.
     *
     * ⚠️ Non e' una preferenza estetica: decide quale indice dei contenuti il documento
     * finale dovra' portare (GRI content index, ESRS datapoints, o entrambi) e quali
     * schede della fase di redazione hanno senso. Enum chiuso, non testo libero: un
     * «gri/esrs» digitato a mano non si puo' interrogare.
     */
    standard: text("standard", { enum: ["GRI", "ESRS", "ENTRAMBI"] }).notNull().default("ESRS"),
    stato: text("stato", { enum: ["avvio", "in_corso", "sospeso", "concluso"] })
      .notNull()
      .default("avvio"),
    /** Chi dello studio segue il lavoro. Testo, non una FK a `user`: puo' essere
     *  qualcuno che nel prodotto non ha un accesso. */
    responsabile: text("responsabile"),
    /** Date in ISO `AAAA-MM-GG`, validate dal parser condiviso: `new Date("2026-02-31")`
     *  non solleva, scivola al 3 marzo. */
    dataInizio: text("data_inizio"),
    dataFine: text("data_fine"),
    note: text("note"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    // Un programma per azienda e per anno. Due programmi ESG dello stesso esercizio
    // sarebbero due verita' sullo stesso lavoro, e nessuno saprebbe quale consegnare.
    uniqueIndex("sgesg_programma_company_anno_uq").on(t.companyId, t.anno),
    index("sgesg_programma_org_idx").on(t.organizationId),
  ],
);

/**
 * Lo stato di una fase dentro un programma.
 *
 * Una riga per fase VALORIZZATA, non otto righe create in anticipo: una fase mai toccata
 * non esiste, e la differenza fra «non avviata» e «avviata e vuota» e' informazione. E'
 * la stessa scelta della ripartizione energetica — una riga per cella valorizzata — e
 * per la stessa ragione: evita il read-modify-write su una struttura larga.
 */
export const sgesgFase = pgTable(
  "sgesg_fase",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    programId: text("program_id")
      .notNull()
      .references(() => sgesgProgramma.id, { onDelete: "cascade" }),
    /** La chiave del catalogo (`proc00`…`proc07`), non un identificativo di riga: il
     *  set puo' cambiare versione, la chiave no. */
    faseKey: text("fase_key").notNull(),
    stato: text("stato", { enum: ["da_avviare", "in_corso", "conclusa"] })
      .notNull()
      .default("da_avviare"),
    note: text("note"),
    /** Quando la fase e' stata dichiarata conclusa. Nullo finche' non lo e'. */
    conclusaIl: timestamp("conclusa_il", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("sgesg_fase_program_key_uq").on(t.programId, t.faseKey),
    index("sgesg_fase_org_idx").on(t.organizationId),
  ],
);

export const sgesgProgrammaRelations = relations(sgesgProgramma, ({ many }) => ({
  fasi: many(sgesgFase),
}));

export const sgesgFaseRelations = relations(sgesgFase, ({ one }) => ({
  programma: one(sgesgProgramma, {
    fields: [sgesgFase.programId],
    references: [sgesgProgramma.id],
  }),
}));
