import { pgTable, text, timestamp, integer, numeric, jsonb, boolean, index, uniqueIndex } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { organization } from "./auth";
import { company } from "./tenancy";

// Modulo BILANCIO ENERGETICO (UNI CEI EN 16247 · ISO 50001 · art. 8 D.Lgs. 102/2014).
// Tutte tabelle TENANT (RLS su organization_id).
// REGOLA: nessuna colonna per valori derivati — totali, quadratura, indicatori e
// tempi di ritorno si calcolano in lettura da src/lib/calc/energy e si scrivono
// solo dentro gli snapshot immutabili.

export const energyBalance = pgTable(
  "energy_balance",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    companyId: text("company_id")
      .notNull()
      .references(() => company.id, { onDelete: "cascade" }),
    anno: integer("anno").notNull(),
    annoBase: integer("anno_base").notNull(),
    contentSetId: text("content_set_id").notNull(), // metodologia congelata alla creazione
    standard: text("standard").default("UNI CEI EN 16247-1 — diagnosi energetica").notNull(),
    // Sito e perimetro (passo 1). { forma, piva, sede, settore, ateco, sito,
    //   attivita, turni, referente, perimetro, unitaProd }
    profilo: jsonb("profilo").default({}).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (t) => [
    uniqueIndex("energy_balance_company_anno_uq").on(t.companyId, t.anno),
    index("energy_balance_org_idx").on(t.organizationId),
  ],
);

// Energia in ingresso (passo 2): una riga per vettore valorizzato.
export const energyVectorInput = pgTable(
  "energy_vector_input",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id").notNull(),
    balanceId: text("balance_id")
      .notNull()
      .references(() => energyBalance.id, { onDelete: "cascade" }),
    vettoreKey: text("vettore_key").notNull(),
    quantita: numeric("quantita"), // nell'unità del vettore, come da fattura
    costo: numeric("costo"), // € dell'esercizio, al netto di IVA
    // I dodici mesi sono un vettore, non dodici fatti: si leggono sempre in blocco
    // e non si aggregano mai per mese in SQL. Stringhe, non numeri jsonb, per non
    // passare dai double IEEE754. I 12 slot devono esistere: jsonb_set su un array
    // più corto dell'indice è un no-op silenzioso.
    mensili: jsonb("mensili")
      .default(sql`'["","","","","","","","","","","",""]'::jsonb`)
      .notNull(),
  },
  (t) => [
    uniqueIndex("energy_vector_input_uq").on(t.balanceId, t.vettoreKey),
    index("energy_vector_input_org_idx").on(t.organizationId),
  ],
);

// Matrice di ripartizione (passo 3): UNA RIGA PER CELLA VALORIZZATA.
// Non colonne per vettore (cablerebbero nel DDL chiavi che sono dati di seed
// versionati) né un jsonb sulla radice (ogni cella diventerebbe un
// read-modify-write di un documento a 220 chiavi).
// La quantità è SEMPRE nell'unità del vettore, mai in kWh: così la quadratura
// confronta quantità ed è immune ai cambi di fattore. Se le celle fossero in kWh,
// correggere il potere calorifico invaliderebbe la quadratura di un esercizio chiuso.
export const energyAllocation = pgTable(
  "energy_allocation",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id").notNull(),
    balanceId: text("balance_id")
      .notNull()
      .references(() => energyBalance.id, { onDelete: "cascade" }),
    usoKey: text("uso_key").notNull(),
    vettoreKey: text("vettore_key").notNull(),
    quantita: numeric("quantita").notNull(),
  },
  (t) => [
    uniqueIndex("energy_allocation_uq").on(t.balanceId, t.usoKey, t.vettoreKey),
    index("energy_allocation_balance_idx").on(t.balanceId),
    index("energy_allocation_org_idx").on(t.organizationId),
  ],
);

// Stato di ciascun uso finale: se è attivo nel sito, come è stato determinato,
// e gli INPUT del calcolatore di stima (il kWh stimato è derivato, non si persiste).
export const energyEndUseState = pgTable(
  "energy_end_use_state",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id").notNull(),
    balanceId: text("balance_id")
      .notNull()
      .references(() => energyBalance.id, { onDelete: "cascade" }),
    usoKey: text("uso_key").notNull(),
    attivo: boolean("attivo").default(true).notNull(),
    // La norma chiede di dichiarare, per ogni uso, se il dato è misurato,
    // calcolato o stimato: è ciò che permette di sapere quanto fidarsi della riga.
    metodo: text("metodo", { enum: ["mis", "cal", "sti"] }),
    stimaVettoreKey: text("stima_vettore_key"),
    stimaKw: numeric("stima_kw"),
    stimaOre: numeric("stima_ore"),
    stimaFattoreCarico: numeric("stima_fattore_carico"),
    nota: text("nota"),
  },
  (t) => [
    uniqueIndex("energy_end_use_state_uq").on(t.balanceId, t.usoKey),
    index("energy_end_use_state_org_idx").on(t.organizationId),
  ],
);

// Variabili di riferimento (passo 4). Legate a company+anno e non al bilancio:
// servono anche per l'anno base, che può non avere un proprio energy_balance.
export const energyDriverValue = pgTable(
  "energy_driver_value",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id").notNull(),
    companyId: text("company_id")
      .notNull()
      .references(() => company.id, { onDelete: "cascade" }),
    anno: integer("anno").notNull(),
    driverKey: text("driver_key").notNull(),
    valore: numeric("valore").notNull(),
  },
  (t) => [
    uniqueIndex("energy_driver_value_uq").on(t.companyId, t.anno, t.driverKey),
    index("energy_driver_value_org_idx").on(t.organizationId),
  ],
);

// Interventi di miglioramento (passo 5).
export const energyMeasure = pgTable(
  "energy_measure",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id").notNull(),
    balanceId: text("balance_id")
      .notNull()
      .references(() => energyBalance.id, { onDelete: "cascade" }),
    descrizione: text("descrizione").default("").notNull(),
    vettoreKey: text("vettore_key").notNull(),
    quantita: numeric("quantita"), // risparmio annuo nell'unità del vettore
    investimento: numeric("investimento"),
    incentivo: numeric("incentivo"),
    usoKey: text("uso_key"), // uso finale su cui incide, facoltativo
    stato: text("stato", {
      enum: ["proposto", "valutato", "approvato", "in_corso", "realizzato", "scartato"],
    })
      .default("proposto")
      .notNull(),
    annoPrevisto: integer("anno_previsto"),
    note: text("note"), // ipotesi di calcolo: senza, il risparmio non è verificabile
    posizione: integer("posizione").default(0).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (t) => [
    index("energy_measure_balance_idx").on(t.balanceId),
    index("energy_measure_org_idx").on(t.organizationId),
  ],
);

// Capitoli discorsivi (passo 6), contenuto Tiptap sanificato server-side.
export const energyNarrative = pgTable(
  "energy_narrative",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id").notNull(),
    balanceId: text("balance_id")
      .notNull()
      .references(() => energyBalance.id, { onDelete: "cascade" }),
    templateKey: text("template_key").notNull(),
    contenuto: jsonb("contenuto").default({}).notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (t) => [
    uniqueIndex("energy_narrative_uq").on(t.balanceId, t.templateKey),
    index("energy_narrative_org_idx").on(t.organizationId),
  ],
);

// Elementi visivi dei capitoli: fotografie caricate o diagrammi generati dai dati.
export const energyMedia = pgTable(
  "energy_media",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id").notNull(),
    narrativeId: text("narrative_id")
      .notNull()
      .references(() => energyNarrative.id, { onDelete: "cascade" }),
    tipo: text("tipo", { enum: ["img", "chart"] }).notNull(),
    storageKey: text("storage_key"), // solo tipo 'img', sempre prefissata con orgId
    chartKey: text("chart_key"), // solo tipo 'chart': quale diagramma
    didascalia: text("didascalia"),
    credito: text("credito"),
    larghezza: text("larghezza", { enum: ["piena", "meta"] }).default("piena").notNull(),
    posizione: integer("posizione").default(0).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [
    index("energy_media_narrative_idx").on(t.narrativeId),
    index("energy_media_org_idx").on(t.organizationId),
  ],
);

// Fattori personalizzati, a SOVRAPPOSIZIONE sulla libreria di piattaforma
// (stesso modello di ghg_org_factor). La chiave è companyId e non organizationId:
// il potere calorifico del cippato consegnato a quello stabilimento è una
// proprietà dell'impianto, non dello studio.
export const energyCompanyFactor = pgTable(
  "energy_company_factor",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id").notNull(),
    companyId: text("company_id")
      .notNull()
      .references(() => company.id, { onDelete: "cascade" }),
    key: text("key").notNull(), // vettoreKey
    kwhUnita: numeric("kwh_unita"),
    tepUnita: numeric("tep_unita"),
    feUnita: numeric("fe_unita"),
    feMarket: numeric("fe_market"),
    fonte: text("fonte"), // da dichiarare nel capitolo metodologico
    note: text("note"),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (t) => [
    uniqueIndex("energy_company_factor_uq").on(t.companyId, t.key),
    index("energy_company_factor_org_idx").on(t.organizationId),
  ],
);
