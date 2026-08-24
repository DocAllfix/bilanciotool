import { relations } from "drizzle-orm";
import { index, integer, numeric, pgTable, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { organization } from "./auth";
import { company } from "./tenancy";
import { contentSet } from "./content";

// Due diligence di filiera (linee guida OCSE · CSDDD).
//
// Le 14 procedure, i 56 moduli e i 7 registri stanno nel CORPUS. Qui c'è il dominio, che
// per questo modulo sono i PARTNER: ognuno con due assi ortogonali, il rischio inerente
// (che il partner non può cambiare: paese, settore, prodotto, modello) e la maturità
// (quello che ha messo in piedi). Vedi `src/lib/calc/filiera/rischio.ts`.
//
// ⚠️ Questo modulo guarda dalla parte OPPOSTA rispetto ad «Autovalutazione fornitore»:
// là il cliente valuta sé stesso per rispondere a un committente, qui valuta terzi che
// non sono tenant. Le due cardinalità sono incompatibili (`supplier_assessment` è unica
// per azienda, qui servono N partner) e le scale non sono convertibili. Il ponte fra i
// due è una fase successiva, e richiede il consenso del fornitore.

// ─── Cataloghi ───────────────────────────────────────────────────────────────

/** Le quattro dimensioni del rischio inerente, ognuna con la sua scala di quattro gradini. */
export const chainDimension = pgTable(
  "chain_dimension",
  {
    id: text("id").primaryKey(),
    setId: text("set_id").notNull().references(() => contentSet.id, { onDelete: "restrict" }),
    key: text("key").notNull(),
    nome: text("nome").notNull(),
    descrizione: text("descrizione").notNull(),
    /** I quattro gradini, dal meno al più grave. L'indice + 1 è il valore. */
    scala: text("scala").array().notNull(),
    ordine: integer("ordine").notNull(),
  },
  (t) => [uniqueIndex("chain_dim_set_key_uq").on(t.setId, t.key)],
);

/**
 * Le sette aree di maturità.
 *
 * ⚠️ Tre di esse — `min`, `forz`, `hs` — sono CRITICHE e governano il tetto della
 * maturità: lavoro minorile, lavoro forzato, salute e sicurezza sono i casi in cui il
 * danno è irrimediabile, e nessuna governance impeccabile li compensa. L'elenco vive in
 * `AREE_CRITICHE` nel motore, non qui: è una regola di calcolo, non un dato di catalogo.
 */
export const chainArea = pgTable(
  "chain_area",
  {
    id: text("id").primaryKey(),
    setId: text("set_id").notNull().references(() => contentSet.id, { onDelete: "restrict" }),
    key: text("key").notNull(),
    nome: text("nome").notNull(),
    ordine: integer("ordine").notNull(),
  },
  (t) => [uniqueIndex("chain_area_set_key_uq").on(t.setId, t.key)],
);

/** I cinque fattori aggravanti. Dichiararne uno non lascia scendere sotto «Alta». */
export const chainFlagDef = pgTable(
  "chain_flag_def",
  {
    id: text("id").primaryKey(),
    setId: text("set_id").notNull().references(() => contentSet.id, { onDelete: "restrict" }),
    key: text("key").notNull(),
    nome: text("nome").notNull(),
    ordine: integer("ordine").notNull(),
  },
  (t) => [uniqueIndex("chain_flag_set_key_uq").on(t.setId, t.key)],
);

/** Le sei fasi del ciclo OCSE. */
export const chainPhase = pgTable(
  "chain_phase",
  {
    id: text("id").primaryKey(),
    setId: text("set_id").notNull().references(() => contentSet.id, { onDelete: "restrict" }),
    key: text("key").notNull(),
    nome: text("nome").notNull(),
    descrizione: text("descrizione").notNull(),
    ordine: integer("ordine").notNull(),
  },
  (t) => [uniqueIndex("chain_phase_set_key_uq").on(t.setId, t.key)],
);

// ─── Tabelle tenant ──────────────────────────────────────────────────────────

/** Il programma di due diligence di un'azienda. Uno per azienda: si revisiona, non si ripete. */
export const chainProgram = pgTable(
  "chain_program",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id").notNull().references(() => organization.id, { onDelete: "cascade" }),
    companyId: text("company_id").notNull().references(() => company.id, { onDelete: "cascade" }),
    contentSetId: text("content_set_id").notNull().references(() => contentSet.id, { onDelete: "restrict" }),

    ragione: text("ragione"),
    forma: text("forma"),
    piva: text("piva"),
    sede: text("sede"),
    settore: text("settore"),
    addetti: text("addetti"),
    /** Chi risponde della due diligence, e l'organo a cui riferisce. */
    responsabile: text("responsabile"),
    organo: text("organo"),
    /** Il canale di reclamo che la CSDDD pretende accessibile lungo la filiera. */
    reclamiCanale: text("reclamiCanale"),
    politica: text("politica"),
    perimetro: text("perimetro"),
    esclusioni: text("esclusioni"),
    /**
     * La data del riesame.
     *
     * ⚠️ Nel prototipo questo campo esiste, blocca la fase 4 sotto il 67% e NESSUNA
     * vista lo scrive: era morto. Qui si compila, altrimenti il modulo dichiarerebbe
     * per sempre una lacuna che l'utente non ha modo di chiudere.
     */
    riesameData: text("riesame_data"),
    riesameEsito: text("riesame_esito"),
    dataAdozione: text("data_adozione"),
    revisione: text("revisione"),
    note: text("note"),

    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("chain_program_company_uq").on(t.companyId),
    index("chain_program_org_idx").on(t.organizationId),
  ],
);

/**
 * Un partner della filiera.
 *
 * ⚠️ L'unità di analisi è il SITO, non la ragione sociale: un partner con più
 * stabilimenti genera profili distinti, ed è scritto nell'aiuto del campo perché è la
 * prima cosa che si sbaglia.
 */
export const chainPartner = pgTable(
  "chain_partner",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id").notNull().references(() => organization.id, { onDelete: "cascade" }),
    programId: text("program_id").notNull().references(() => chainProgram.id, { onDelete: "cascade" }),

    // Identificazione
    nome: text("nome").notNull(),
    codiceInterno: text("codice_interno"),
    livello: text("livello"),
    categoria: text("categoria"),
    paese: text("paese"),
    sito: text("sito"),
    attivita: text("attivita"),

    // Manodopera
    addetti: integer("addetti"),
    somministrati: integer("somministrati"),
    migranti: text("migranti"),
    agenzie: text("agenzie"),
    subappalto: text("subappalto"),

    // Rapporto commerciale
    spesa: numeric("spesa", { precision: 16, scale: 2 }),
    quotaFatturato: numeric("quota_fatturato", { precision: 6, scale: 2 }),
    sostituibilita: text("sostituibilita"),
    rapportoDal: text("rapporto_dal"),

    // Qualifica e contratto
    qualifica: text("qualifica"),
    qualificaValidaAl: text("qualifica_valida_al"),
    codiceCondotta: text("codice_condotta"),
    clausole: text("clausole"),
    cascading: text("cascading"),
    canaleAffisso: text("canale_affisso"),

    /**
     * Lo stato del rapporto.
     *
     * ⚠️ I cessati escono dai conteggi per numerosità. Nel prototipo la spesa totale li
     * includeva mentre tutti gli altri conteggi no, e un cessato grosso schiacciava ogni
     * percentuale di copertura: qui il filtro è lo stesso ovunque.
     */
    stato: text("stato").notNull().default("Attivo"),

    /**
     * I fattori aggravanti dichiarati.
     *
     * ⚠️ Array e non cinque colonne booleane: accendere o spegnere un fattore è
     * `array_append` / `array_remove`, una sola istruzione atomica. È lo stesso motivo
     * per cui le motivazioni della SoA sono un `text[]`.
     */
    flag: text("flag").array().notNull().default([]),

    note: text("note"),
    ordine: integer("ordine").notNull().default(0),

    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("chain_partner_prog_idx").on(t.programId),
    index("chain_partner_org_idx").on(t.organizationId),
  ],
);

/**
 * Un punteggio del partner: una dimensione del rischio inerente o un'area di maturità.
 *
 * ⚠️ Una riga per cella valorizzata, e non undici colonne: aggiornare un punteggio è un
 * `insert … on conflict do update` su una riga sola, e non c'è nessun momento in cui il
 * client rimanda l'intera scheda. È il difetto corretto tre volte in questo progetto —
 * materialità, ripartizione energetica, costi — e qui non può ripresentarsi.
 */
export const chainPartnerScore = pgTable(
  "chain_partner_score",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id").notNull().references(() => organization.id, { onDelete: "cascade" }),
    partnerId: text("partner_id").notNull().references(() => chainPartner.id, { onDelete: "cascade" }),
    /** `dim` per il rischio inerente, `area` per la maturità. */
    genere: text("genere").notNull(),
    chiave: text("chiave").notNull(),
    /** 1 ÷ 4. Una riga assente significa «non valutata», che non è come «valutata 1». */
    valore: integer("valore").notNull(),
    note: text("note"),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("chain_score_uq").on(t.partnerId, t.genere, t.chiave),
    index("chain_score_org_idx").on(t.organizationId),
  ],
);

export const chainProgramRelations = relations(chainProgram, ({ many }) => ({
  partner: many(chainPartner),
}));

export const chainPartnerRelations = relations(chainPartner, ({ one, many }) => ({
  programma: one(chainProgram, { fields: [chainPartner.programId], references: [chainProgram.id] }),
  punteggi: many(chainPartnerScore),
}));
