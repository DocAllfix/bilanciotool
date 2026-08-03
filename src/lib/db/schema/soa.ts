import { pgTable, text, timestamp, integer, jsonb, boolean, index, uniqueIndex } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { organization } from "./auth";
import { company } from "./tenancy";

// Modulo DICHIARAZIONE DI APPLICABILITÀ (ISO/IEC 27001:2022 §6.1.3 d),
// con i moduli estesi 27017 · 27018 · 27701 Allegati A e B.
// Tutte tabelle TENANT (RLS su organization_id).
//
// REGOLA: nessuna colonna per valori derivati — indice, punteggi per quadro e
// per sezione, priorità e verifiche di coerenza si calcolano in lettura da
// src/lib/calc/soa e si scrivono solo dentro gli snapshot immutabili.

export const soaDeclaration = pgTable(
  "soa_declaration",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    // UNA dichiarazione per azienda: la SoA è un documento vivo del sistema di
    // gestione, non un esercizio contabile. Le revisioni consegnate restano
    // congelate negli snapshot pubblicati.
    companyId: text("company_id")
      .notNull()
      .references(() => company.id, { onDelete: "cascade" }),
    contentSetId: text("content_set_id").notNull(), // catalogo controlli congelato alla creazione
    /** Obiettivo di maturità che l'organizzazione si è data. */
    sogliaObiettivo: integer("soglia_obiettivo").default(80).notNull(),
    /** Ruoli come ENUM CHIUSI e non testo libero.
     *
     *  Nel prototipo erano stringhe interrogate con espressioni regolari, e
     *  `/cloud/i` corrispondeva anche a "Nessun servizio cloud": l'avviso
     *  "dichiara uso di servizi cloud" compariva proprio a chi aveva dichiarato
     *  il contrario, per sempre. Con l'enum le verifiche diventano switch
     *  esaustivi che il compilatore controlla. */
    ruoloPrivacy: text("ruolo_privacy", { enum: ["titolare", "responsabile", "entrambi", "nessuno"] })
      .default("titolare")
      .notNull(),
    ruoloCloud: text("ruolo_cloud", { enum: ["cliente", "fornitore", "entrambi", "nessuno"] })
      .default("cliente")
      .notNull(),
    // { piva, sede, scope, esclusioni, versione, data, redatto, approvato }
    profilo: jsonb("profilo").default({}).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (t) => [
    uniqueIndex("soa_declaration_company_uq").on(t.companyId),
    index("soa_declaration_org_idx").on(t.organizationId),
  ],
);

// Moduli estesi attivati sulla dichiarazione. La 27001 non compare qui: è
// sempre in ambito per definizione, e la SoA deve elencarne tutti i 93.
export const soaModule = pgTable(
  "soa_module",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    declarationId: text("declaration_id")
      .notNull()
      .references(() => soaDeclaration.id, { onDelete: "cascade" }),
    frameworkKey: text("framework_key").notNull(), // '27017' | '27018' | '27701A' | '27701B'
    attivo: boolean("attivo").default(false).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [
    uniqueIndex("soa_module_decl_fw_uq").on(t.declarationId, t.frameworkKey),
    index("soa_module_org_idx").on(t.organizationId),
  ],
);

// Decisione su un singolo controllo.
//
// CHIAVE A DUE COLONNE (frameworkKey, controlloId), mai la stringa "27001|8.4"
// del prototipo: quella stringa è inqueribile — il punteggio per quadro
// diventerebbe un LIKE '27001|%' — e l'unicità globale degli identificativi
// regge solo per caso (la 27018 usa già la forma A.x; un futuro ISO 42001
// collide). La forma incollata sopravvive come chiave React e nel parser
// dell'import, non nel database.
export const soaControlDecision = pgTable(
  "soa_control_decision",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    declarationId: text("declaration_id")
      .notNull()
      .references(() => soaDeclaration.id, { onDelete: "cascade" }),
    frameworkKey: text("framework_key").notNull(),
    controlloId: text("controllo_id").notNull(), // '8.4', 'CLD.6.3.1', 'A.11.2', 'B.8.5.7'
    /** Un controllo è applicabile finché non lo si esclude esplicitamente:
     *  la norma chiede di motivare le ESCLUSIONI, non le inclusioni. */
    applicabile: boolean("applicabile").default(true).notNull(),
    giustificazione: text("giustificazione"), // obbligatoria di fatto se escluso
    /** Motivazioni di inclusione come ARRAY e non oggetto: accendere o spegnere
     *  una motivazione diventa array_append / array_remove in una sola
     *  istruzione atomica, senza read-modify-write del documento intero. */
    motivazioni: text("motivazioni")
      .array()
      .default(sql`ARRAY[]::text[]`)
      .notNull(),
    stato: text("stato", { enum: ["nd", "pl", "pa", "at", "av"] }),
    riferimentoDoc: text("riferimento_doc"),
    responsabile: text("responsabile"),
    scadenza: text("scadenza"), // ISO date: è una data di piano, non un istante
    statoAzione: text("stato_azione", { enum: ["da_avviare", "in_corso", "completata"] }),
    note: text("note"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (t) => [
    uniqueIndex("soa_decision_decl_fw_ctl_uq").on(t.declarationId, t.frameworkKey, t.controlloId),
    index("soa_decision_org_idx").on(t.organizationId),
    index("soa_decision_decl_fw_idx").on(t.declarationId, t.frameworkKey),
  ],
);
