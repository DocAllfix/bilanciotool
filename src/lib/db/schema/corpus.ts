import {
  pgTable, text, integer, boolean, jsonb, timestamp,
  index, uniqueIndex, primaryKey, foreignKey,
} from "drizzle-orm/pg-core";
import { organization } from "./auth";
import { company } from "./tenancy";

// IL CORPUS DOCUMENTALE — il motore comune dei sei moduli di conformità.
//
// Non sono sei moduli, sono un motore comune più sei domini: fra il prototipo del
// Modello 231 e quello ISO 37001 ci sono 85 identificatori omonimi, di cui 50
// BYTE-IDENTICI — l'intero renderer documentale, il motore dei segnaposto, quello dei
// registri. Qui quel motore si scrive una volta.
//
// Dimensioni reali, contate: 447 documenti (84 procedure + 317 moduli, più i 46 del
// modulo Segnalazioni) e 6.489 blocchi.
//
// ── PERCHÉ UNA RIGA PER BLOCCO E NON UN JSONB PER DOCUMENTO ──────────────────
//
// La personalizzazione del cliente punta a un blocco tramite la sua chiave. Con una riga
// per blocco quel riferimento diventa una CHIAVE ESTERNA VERA: un testo su misura che
// punta a un blocco inesistente non può essere scritto, e il tentativo di cancellare una
// versione del corpus che qualcuno sta usando viene rifiutato dal database.
//
// Con il jsonb non c'è vincolo, e il difetto che tutto questo esiste per prevenire — il
// testo del cliente che sparisce in silenzio — rientra dalla finestra. Nei prototipi le
// personalizzazioni sono indicizzate per POSIZIONE nell'array (`ovr[7]`): basta che un
// blocco si sposti e il testo di ognuno scivola su quello sbagliato, senza un errore.
//
// Le prestazioni non decidono: 6.489 righe sono niente per Postgres, e rendere un
// documento è una query indicizzata. Decide l'integrità.
//
// Il CARICO resta jsonb perché i blocchi hanno forma eterogenea: `p` ha un testo, `t` una
// matrice più il numero di righe vuote da stampare, `sig` non ha niente. Quindi la scelta
// non è «righe contro jsonb» ma «righe con carico jsonb contro documento monolitico».

// ─────────────────────────────────────────────────────── CATALOGO (di piattaforma)
//
// Nessun `organization_id`: il corpus è contenuto di piattaforma, uguale per tutti gli
// studi. Copiarlo per azienda sarebbe insostenibile — il solo SA8000/2026 pesa 555 KB di
// testo — ed è esattamente il modello che i prototipi già adottano in memoria: corpus
// globale, personalizzazioni per organizzazione.

export const corpusDocument = pgTable(
  "corpus_document",
  {
    /** Il content set congela la versione: chi inizia sulla v1 la tiene fino alla fine. */
    contentSetId: text("content_set_id").notNull(),
    /** "PAC-01" per una procedura, "MOD-01.01" per un modulo. */
    code: text("code").notNull(),
    tipo: text("tipo", { enum: ["procedura", "modulo"] }).notNull(),
    titolo: text("titolo").notNull(),
    /** Solo le procedure: "4 · Contesto", "Parte generale", "Impianto". */
    fase: text("fase"),
    /** Riferimenti normativi, come li scrive il prototipo. */
    rif: text("rif"),
    /** Solo i moduli: la procedura di appartenenza. */
    proCode: text("pro_code"),
    ordine: integer("ordine").notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.contentSetId, t.code] }),
    index("corpus_document_set_idx").on(t.contentSetId, t.tipo, t.ordine),
  ],
);

export const corpusBlock = pgTable(
  "corpus_block",
  {
    contentSetId: text("content_set_id").notNull(),
    docCode: text("doc_code").notNull(),
    /** La chiave STABILE, derivata dal contenuto del blocco e non dalla sua posizione.
     *  La genera `scripts/extract-seed.mjs`; un test inchioda i valori attesi, perché
     *  cambiare la funzione che le produce farebbe scivolare le personalizzazioni di
     *  tutti i clienti, in silenzio. */
    blockId: text("block_id").notNull(),
    ordine: integer("ordine").notNull(),
    /** I quattro tipi verificati sull'intero corpus: 3.698 `p`, 1.990 `t`, 530 `h`, 271
     *  `sig`. Nessun tipo ignoto che il renderer salterebbe senza dirlo. */
    tipo: text("tipo", { enum: ["p", "t", "h", "sig"] }).notNull(),
    /** `{t}` per paragrafi e intestazioni, `{r, b}` per le tabelle, `{}` per le firme. */
    contenuto: jsonb("contenuto").notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.contentSetId, t.docCode, t.blockId] }),
    index("corpus_block_doc_idx").on(t.contentSetId, t.docCode, t.ordine),
    foreignKey({
      columns: [t.contentSetId, t.docCode],
      foreignColumns: [corpusDocument.contentSetId, corpusDocument.code],
      name: "corpus_block_doc_fk",
    }).onDelete("cascade"),
  ],
);

/**
 * I segnaposto fra parentesi quadre. Sono DUE meccanismi sotto la stessa sintassi, e
 * distinguerli è l'unico modo perché il contatore «N segnaposto aperti» dica il vero.
 *
 * `token` — si sostituisce da un dato che il sistema conosce. Ogni prototipo ha la propria
 *   tabella e sono DIVERSE fra loro: il 231 mappa `[OdV]`, il whistleblowing `[Gestore]`,
 *   SA8000/2026 `[CCNL]`. Per questo la tabella è per content set, cioè per modulo.
 *
 * `campo` — non si sostituisce affatto: è una casella che si riempie a mano, o una lista
 *   da cui scegliere. SA8000/2026 ne ha 49 forme distinte per 171 occorrenze
 *   (`[GG/MM/AAAA]`, `[N.]`, `[Completo / Intermedio / Straordinario]`). Contarle come
 *   token non risolti terrebbe quel modulo a «415 segnaposto aperti» per sempre.
 *
 * ⚠️ `[Resp. Due Diligence]` merita una riga a parte. Compare in cinque moduli su sei ed è
 * coperto solo nella filiera, dove è un ruolo legittimo del cliente. Negli altri quattro
 * sta nella casella «Redatto da» ed è un residuo di copia-incolla: il Modello 231 lo
 * redigono i CONSULENTI per i loro clienti, quindi lì la fonte è lo STUDIO, non un ruolo
 * interno all'azienda. Stessa forma, fonti diverse: per questo la tabella è per modulo.
 */
export const corpusPlaceholder = pgTable(
  "corpus_placeholder",
  {
    contentSetId: text("content_set_id").notNull(),
    /** La forma esatta come compare nel testo, parentesi comprese. */
    forma: text("forma").notNull(),
    genere: text("genere", { enum: ["token", "campo"] }).notNull(),
    /** Da dove pesca un token. Nullo per i campi da compilare. */
    fonte: text("fonte", { enum: ["studio", "azienda", "data", "revisione", "manuale"] }),
    /** Il campo dell'anagrafica, quando `fonte` è `azienda`. */
    campo: text("campo"),
  },
  (t) => [primaryKey({ columns: [t.contentSetId, t.forma] })],
);

// ─────────────────────────────────────────────────────── TENANT
//
// Qui il corpus diventa il documento di un'azienda: stato, revisione, testo su misura.
// `content_set_id` sta nella chiave perché identifica già il modulo (un content set
// appartiene a un dominio solo) e perché l'esercizio lo congela alla creazione.

export const corpusDocState = pgTable(
  "corpus_doc_state",
  {
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    companyId: text("company_id")
      .notNull()
      .references(() => company.id, { onDelete: "cascade" }),
    contentSetId: text("content_set_id").notNull(),
    docCode: text("doc_code").notNull(),
    /** Vocabolario NORMALIZZATO. Nei prototipi è «Approvato» nel 231 e «Approvata» negli
     *  altri: nella stessa tabella, senza normalizzare, il conteggio delle procedure
     *  approvate darebbe zero. */
    stato: text("stato", {
      enum: ["da_personalizzare", "in_redazione", "approvato", "non_applicabile"],
    })
      .default("da_personalizzare")
      .notNull(),
    revisione: text("revisione").default("01").notNull(),
    dataEmissione: text("data_emissione"),
    note: text("note"),
    /** Il campo `add` dei prototipi: testo aggiunto in coda al documento. */
    integrazioni: text("integrazioni"),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.companyId, t.contentSetId, t.docCode] }),
    index("corpus_doc_state_org_idx").on(t.organizationId),
    foreignKey({
      columns: [t.contentSetId, t.docCode],
      foreignColumns: [corpusDocument.contentSetId, corpusDocument.code],
      name: "corpus_doc_state_doc_fk",
    }),
  ],
);

/**
 * Il testo su misura di un singolo blocco.
 *
 * La chiave esterna verso `corpus_block` è la ragione per cui questa non è una colonna
 * jsonb dentro `corpus_doc_state`: rende IMPOSSIBILE scrivere un override che punta a un
 * blocco inesistente, e rifiuta la cancellazione di una versione del corpus che qualcuno
 * sta usando. È il difetto dei prototipi, chiuso dal database invece che dalla disciplina.
 */
export const corpusBlockOverride = pgTable(
  "corpus_block_override",
  {
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    companyId: text("company_id")
      .notNull()
      .references(() => company.id, { onDelete: "cascade" }),
    contentSetId: text("content_set_id").notNull(),
    docCode: text("doc_code").notNull(),
    blockId: text("block_id").notNull(),
    testo: text("testo").notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.companyId, t.contentSetId, t.docCode, t.blockId] }),
    index("corpus_block_override_org_idx").on(t.organizationId),
    foreignKey({
      columns: [t.contentSetId, t.docCode, t.blockId],
      foreignColumns: [corpusBlock.contentSetId, corpusBlock.docCode, corpusBlock.blockId],
      name: "corpus_block_override_block_fk",
    }),
  ],
);

// ─────────────────────────────────────────────────────── I REGISTRI
//
// 70 registri e 779 colonne sui sei moduli, tutti con lo stesso schema: un elenco di
// colonne tipizzate e le righe che il consulente compila. È la terza gamba del motore
// comune, dopo il corpus e i segnaposto.
//
// Le definizioni si estraggono dai prototipi risolvendo le dipendenze da sé
// (`scripts/estrai-registri.mjs`): `REGDEF` rimanda ad altre costanti, diverse in ogni
// prototipo, e un elenco scritto a mano si scoprirebbe incompleto al primo aggiornamento.

export const corpusRegister = pgTable(
  "corpus_register",
  {
    contentSetId: text("content_set_id").notNull(),
    registerId: text("register_id").notNull(),
    nome: text("nome").notNull(),
    descrizione: text("descrizione"),
    /** Il modulo del corpus che fa da intestazione stampata al registro. */
    modCode: text("mod_code"),
    /** La procedura che lo prescrive. */
    proCode: text("pro_code"),
    /** Il capitolo o punto norma di riferimento, dove il modulo ce l'ha. */
    capitolo: text("capitolo"),
    ordine: integer("ordine").notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.contentSetId, t.registerId] }),
    index("corpus_register_set_idx").on(t.contentSetId, t.ordine),
  ],
);

export const corpusRegisterColumn = pgTable(
  "corpus_register_column",
  {
    contentSetId: text("content_set_id").notNull(),
    registerId: text("register_id").notNull(),
    chiave: text("chiave").notNull(),
    etichetta: text("etichetta").notNull(),
    /** I sette tipi presenti nei prototipi: 242 `sel`, 207 `text`, 161 `ta`, 125 `date`,
     *  35 `num`, 5 `crit` e 4 `partner`. Gli ultimi due sono riferimenti ad altre entità
     *  del modulo, non testo: li tratta il modulo che li possiede. */
    tipo: text("tipo", { enum: ["text", "ta", "sel", "date", "num", "crit", "partner"] }).notNull(),
    /** Se compare nella tabella di riepilogo o solo nella scheda di dettaglio. */
    inTabella: boolean("in_tabella").default(false).notNull(),
    larghezza: text("larghezza"),
    /** Il dominio chiuso di una colonna `sel`. */
    opzioni: jsonb("opzioni"),
    /** Il prefisso del codice progressivo, dove il registro ne ha uno: «NC», «RT», «SG». */
    prefissoAuto: text("prefisso_auto"),
    /** Nota metodologica sul campo: nei prototipi sono poche e sono sostanza, non aiuto. */
    hint: text("hint"),
    ordine: integer("ordine").notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.contentSetId, t.registerId, t.chiave] }),
    index("corpus_register_column_reg_idx").on(t.contentSetId, t.registerId, t.ordine),
    foreignKey({
      columns: [t.contentSetId, t.registerId],
      foreignColumns: [corpusRegister.contentSetId, corpusRegister.registerId],
      name: "corpus_register_column_reg_fk",
    }).onDelete("cascade"),
  ],
);

/**
 * Una riga registrata da un'azienda.
 *
 * I valori stanno in jsonb e qui è la scelta giusta, al contrario dei blocchi: le colonne
 * cambiano da registro a registro — 779 in tutto — e non esiste una forma tabellare comune.
 * Il dominio lo definisce il catalogo, non il tipo della colonna.
 *
 * ⚠️ `numero` esiste per chiudere un difetto dei prototipi: là il codice progressivo si
 * calcola come `righe.length + 1`, quindi dopo una cancellazione il numero si ricicla e
 * nascono due righe con lo stesso riferimento — e nei registri che si collegano fra loro
 * per quel riferimento, il collegamento finisce sulla riga sbagliata. Qui il progressivo è
 * una colonna vera con un vincolo di unicità: due righe con lo stesso numero non possono
 * esistere, e una corsa fallisce invece di duplicare in silenzio.
 */
export const corpusRegisterRow = pgTable(
  "corpus_register_row",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    companyId: text("company_id")
      .notNull()
      .references(() => company.id, { onDelete: "cascade" }),
    contentSetId: text("content_set_id").notNull(),
    registerId: text("register_id").notNull(),
    numero: integer("numero").notNull(),
    /** Il riferimento leggibile, «NC001»: si compone dal prefisso e dal numero. */
    riferimento: text("riferimento"),
    dati: jsonb("dati").default({}).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (t) => [
    uniqueIndex("corpus_register_row_numero_uq").on(
      t.companyId,
      t.contentSetId,
      t.registerId,
      t.numero,
    ),
    index("corpus_register_row_org_idx").on(t.organizationId),
    index("corpus_register_row_reg_idx").on(t.companyId, t.contentSetId, t.registerId, t.numero),
    foreignKey({
      columns: [t.contentSetId, t.registerId],
      foreignColumns: [corpusRegister.contentSetId, corpusRegister.registerId],
      name: "corpus_register_row_reg_fk",
    }),
  ],
);
