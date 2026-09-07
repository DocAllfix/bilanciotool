import { pgTable, text, integer, boolean, timestamp, index, uniqueIndex, primaryKey } from "drizzle-orm/pg-core";
import { organization } from "./auth";
import { company } from "./tenancy";

// I DUE PERCORSI NIS2 — D.Lgs. 138/2024, di recepimento della Direttiva (UE) 2022/2555.
//
// ⚠️ DUE MODULI, UN CATALOGO, UNA RISPOSTA SOLA. E' la decisione che governa tutto questo
// file, ed e' stata presa dopo una misura, non per gusto.
//
// I due prototipi non sono due domini: il «sistema di gestione» CONTIENE per intero
// l'«autovalutazione». Confrontati eseguendo i loro corpus:
//
//     requisiti presenti solo nell'autovalutazione : nessuno
//     requisiti presenti solo nel sistema          : G.11, G.12
//     requisiti con lo stesso id e contenuto diverso : 0 su 124
//     procedure divergenti: 0    moduli divergenti: 0
//     stessi 12 capi, stessi 5 livelli, stessi 14 registri, stesse 160 colonne
//
// Il sistema aggiunge quattro motori — 68 controlli, roadmap a 5 fasi, scadenzario,
// indicatori — e due requisiti. Nient'altro.
//
// Con due cataloghi separati la stessa azienda potrebbe rispondere a G.01 in due modi, e
// nessuno saprebbe quale vale: e' la regola gia' scritta per i ponti del metodo ESG —
// **un dato in due posti e' un dato in nessun posto**. Qui non serve nemmeno un ponte che
// legga dall'altra parte: **il pericolo si evita invece di filtrarlo**, perche' la riga e'
// una sola. Un campo `perimetri` sul catalogo decide che cosa mostra ciascun percorso.
//
// ⚠️ E' la stessa forma di `norme text[]` in SGI QAS: il perimetro decide che cosa conta,
// e il catalogo resta uno.

// ═══════════════════════════════════════════════ CATALOGO (contenuto di piattaforma)
//
// Nessun `organization_id`: il catalogo e' uguale per tutti gli studi, come il corpus.
// Il `content_set_id` congela la versione: chi comincia sulla `nis2-v1` la tiene fino
// alla fine, e una revisione dei contenuti non cambia sotto i piedi un lavoro in corso.

/** I due perimetri. Un requisito puo' appartenere all'uno, all'altro o a entrambi. */
export const PERIMETRI_NIS2 = ["autovalutazione", "sistema"] as const;
export type PerimetroNis2 = (typeof PERIMETRI_NIS2)[number];

/** I 12 capi in cui il decreto raggruppa le misure (art. 24 c. 2). */
export const nis2Chapter = pgTable(
  "nis2_chapter",
  {
    contentSetId: text("content_set_id").notNull(),
    /** "G", "R", "A" … "M". */
    key: text("key").notNull(),
    nome: text("nome").notNull(),
    ordine: integer("ordine").notNull(),
  },
  (t) => [primaryKey({ columns: [t.contentSetId, t.key] })],
);

/** La scala 0÷4, con la percentuale che ciascun livello vale. */
export const nis2Level = pgTable(
  "nis2_level",
  {
    contentSetId: text("content_set_id").notNull(),
    valore: integer("valore").notNull(),
    nome: text("nome").notNull(),
    /** ⚠️ Non e' ornamento: il 3 pretende l'evidenza documentale, il 4 la verifica di
     *  efficacia. Senza quelle due frasi davanti agli occhi un consulente mette 3
     *  dappertutto, e il documento non regge la prima ispezione. */
    descrizione: text("descrizione").notNull(),
    percentuale: integer("percentuale").notNull(),
  },
  (t) => [primaryKey({ columns: [t.contentSetId, t.valore] })],
);

/** I 126 requisiti di conformita'. */
export const nis2Requirement = pgTable(
  "nis2_requirement",
  {
    contentSetId: text("content_set_id").notNull(),
    /** "G.01", "B.14" … */
    key: text("key").notNull(),
    chapterKey: text("chapter_key").notNull(),
    /** L'articolo del decreto: "art. 23", "art. 24 c. 2 lett. a)". */
    rif: text("rif").notNull(),
    /** Criticita' alta: il requisito su cui un rilievo pesa di piu'. */
    critico: boolean("critico").notNull(),
    /** La procedura del corpus che lo attua ("PNS-01"). */
    proCode: text("pro_code"),
    testo: text("testo").notNull(),
    /**
     * ⚠️ A quale percorso appartiene. DERIVATO dal confronto fra i due prototipi in
     * `scripts/extract-seed.mjs`, mai scritto a mano: un elenco di 126 voci da ricordare
     * invecchia, un confronto si ricalcola. 124 requisiti sono di entrambi, G.11 e G.12
     * del solo sistema di gestione.
     */
    perimetri: text("perimetri").array().notNull(),
    ordine: integer("ordine").notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.contentSetId, t.key] }),
    index("nis2_requirement_set_idx").on(t.contentSetId, t.chapterKey, t.ordine),
  ],
);

/** I 68 controlli del sistema di gestione. Non esistono nell'autovalutazione. */
export const nis2Control = pgTable(
  "nis2_control",
  {
    contentSetId: text("content_set_id").notNull(),
    /** "G-01", "M-07" … */
    key: text("key").notNull(),
    chapterKey: text("chapter_key").notNull(),
    nome: text("nome").notNull(),
    descrizione: text("descrizione").notNull(),
    /**
     * Ogni quanti giorni va riverificato.
     *
     * ⚠️ E' la colonna che fa esistere la regola meno ovvia del modulo: un controllo
     * dichiarato «attuato» la cui verifica e' scaduta torna «da verificare». Senza
     * frequenza, un sistema di gestione resta verde sulla carta mentre smette di
     * esistere — ed e' la prima cosa che un'ispezione ACN chiede.
     */
    frequenzaGiorni: integer("frequenza_giorni").notNull(),
    critico: boolean("critico").notNull(),
    /**
     * ⚠️ LA CHIAVE DEL PONTE VERSO LA SoA, POSATA ORA E NON USATA.
     *
     * I 68 controlli si sovrappongono all'Allegato A della ISO/IEC 27001, che questo
     * prodotto gia' copre col percorso `soa`. Il ponte vero paga quando entrambe le
     * sponde sono compilate, e oggi non lo sono: costruirlo adesso sarebbe lavoro per
     * nessuno. Ma la CHIAVE e' l'unica parte che il tempo rende piu' cara — aggiungerla
     * fra un anno vorrebbe dire rimappare a mano i controlli di ogni cliente — quindi si
     * posa adesso, dove la corrispondenza e' certa, e resta `null` dove non lo e'.
     *
     * E' la stessa decisione presa per la partita IVA di `chain_partner` (quesito A14).
     */
    soaControlKey: text("soa_control_key"),
    ordine: integer("ordine").notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.contentSetId, t.key] }),
    index("nis2_control_set_idx").on(t.contentSetId, t.chapterKey, t.ordine),
  ],
);

/** Le 5 fasi della roadmap, ciascuna su un gruppo di capi. */
export const nis2Phase = pgTable(
  "nis2_phase",
  {
    contentSetId: text("content_set_id").notNull(),
    /** "f1" … "f5". */
    key: text("key").notNull(),
    nome: text("nome").notNull(),
    descrizione: text("descrizione").notNull(),
    /**
     * I capi che la fase copre.
     *
     * ⚠️ Le cinque fasi coprono i dodici capi UNA VOLTA CIASCUNO. Un capo in due fasi
     * conterebbe due volte nell'avanzamento; uno in nessuna sparirebbe dalla roadmap
     * senza che niente lo dica. E' una svista che una riga di seme introduce e nessuna
     * schermata mostra, quindi la pretende un test sul catalogo.
     */
    capitoli: text("capitoli").array().notNull(),
    ordine: integer("ordine").notNull(),
  },
  (t) => [primaryKey({ columns: [t.contentSetId, t.key] })],
);

/** I 19 indicatori proposti. Sono un punto di partenza: lo studio ne aggiunge dei propri. */
export const nis2IndicatorDef = pgTable(
  "nis2_indicator_def",
  {
    contentSetId: text("content_set_id").notNull(),
    key: text("key").notNull(),
    nome: text("nome").notNull(),
    /** "Governance", "Incidenti", "Continuità" … otto in tutto. */
    ambito: text("ambito").notNull(),
    /** L'attuazione misura cio' che e' stato fatto, l'efficacia se ha funzionato. */
    tipo: text("tipo", { enum: ["attuazione", "efficacia"] }).notNull(),
    formula: text("formula").notNull(),
    unita: text("unita").notNull(),
    frequenza: text("frequenza", { enum: ["mensile", "trimestrale", "semestrale", "annuale"] }).notNull(),
    target: integer("target"),
    /** ⚠️ Il verso di miglioramento e' il cuore: per il tasso di clic nel phishing
     *  scendere e' un risultato, per la copertura MFA e' un disastro. */
    verso: text("verso", { enum: ["crescente", "decrescente"] }).notNull(),
    soglia: integer("soglia"),
    ordine: integer("ordine").notNull(),
  },
  (t) => [primaryKey({ columns: [t.contentSetId, t.key] })],
);

// ═══════════════════════════════════════════════════════ DATI DEL CLIENTE (tenant)

/**
 * Il PROFILO dell'azienda: anagrafica, ambito, obiettivo.
 *
 * ⚠️ CONDIVISO fra i due percorsi, e non e' la radice di nessuno dei due. Il settore, la
 * dimensione e i criteri specifici di un'azienda sono gli stessi qualunque percorso si
 * stia seguendo: chiederli due volte produrrebbe due classificazioni d'ambito per lo
 * stesso ente, e la classificazione decide gli obblighi e il tetto delle sanzioni.
 *
 * Lo crea il primo dei due percorsi che qualcuno apre.
 */
export const nis2Profile = pgTable(
  "nis2_profile",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    companyId: text("company_id")
      .notNull()
      .references(() => company.id, { onDelete: "cascade" }),
    /** Il catalogo, congelato alla creazione. */
    contentSetId: text("content_set_id").notNull(),

    // ── Ambito soggettivo (art. 3) ──────────────────────────────────────────
    settore: text("settore"),
    dimensione: text("dimensione", { enum: ["micro", "media", "grande"] }),
    /** I criteri specifici spuntati: "c1" … "c8". Prescindono dalla dimensione. */
    criteri: text("criteri").array().default([]).notNull(),
    /**
     * ⚠️ La classificazione NON si persiste: si calcola.
     *
     * E' un derivato di settore, dimensione e criteri, e questo prodotto non persiste i
     * derivati — si congelano nello snapshot al momento della pubblicazione, e li'
     * soltanto. Una colonna `classe` qui potrebbe restare indietro rispetto ai suoi
     * ingredienti, e sarebbe indistinguibile da una classificazione corretta.
     */

    // ── Assetto ─────────────────────────────────────────────────────────────
    organo: text("organo"),
    responsabile: text("responsabile"),
    sostituto: text("sostituto"),
    puntoContatto: text("punto_contatto"),
    contattoRecapito: text("contatto_recapito"),
    /** La comunicazione con cui l'ACN conferma l'inserimento: da qui decorre la roadmap. */
    comunicazioneIl: text("comunicazione_il"),
    registrazioneIl: text("registrazione_il"),
    classeAcn: text("classe_acn"),

    /** Il livello che l'organizzazione si e' data come obiettivo. */
    obiettivo: integer("obiettivo").default(3).notNull(),

    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().$onUpdate(() => new Date()).notNull(),
  },
  (t) => [
    uniqueIndex("nis2_profile_company_uq").on(t.companyId),
    index("nis2_profile_org_idx").on(t.organizationId),
  ],
);

/**
 * La radice del percorso `nis2` (autovalutazione).
 *
 * ⚠️ SOTTILE DI PROPOSITO, e separata da `nis2_system`. `radiciModuli` costruisce una
 * UNION ALL su una tabella radice per modulo, e da li' discendono portafoglio, fascicolo
 * e scadenzario. Con una radice sola condivisa, aprire il sistema di gestione accenderebbe
 * anche l'autovalutazione nel portafoglio — un percorso che risulta avviato senza che
 * nessuno l'abbia aperto.
 */
export const nis2Assessment = pgTable(
  "nis2_assessment",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    companyId: text("company_id")
      .notNull()
      .references(() => company.id, { onDelete: "cascade" }),
    contentSetId: text("content_set_id").notNull(),
    revisione: text("revisione").default("01").notNull(),
    dataAdozione: text("data_adozione"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().$onUpdate(() => new Date()).notNull(),
  },
  (t) => [
    uniqueIndex("nis2_assessment_company_uq").on(t.companyId),
    index("nis2_assessment_org_idx").on(t.organizationId),
  ],
);

/** La radice del percorso `sgnis2` (sistema di gestione): i parametri della roadmap. */
export const nis2System = pgTable(
  "nis2_system",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    companyId: text("company_id")
      .notNull()
      .references(() => company.id, { onDelete: "cascade" }),
    contentSetId: text("content_set_id").notNull(),
    /** I mesi si possono personalizzare: alcuni settori hanno termini propri. */
    mesiNotifica: integer("mesi_notifica").default(9).notNull(),
    mesiMisure: integer("mesi_misure").default(18).notNull(),
    revisione: text("revisione").default("01").notNull(),
    dataAdozione: text("data_adozione"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().$onUpdate(() => new Date()).notNull(),
  },
  (t) => [
    uniqueIndex("nis2_system_company_uq").on(t.companyId),
    index("nis2_system_org_idx").on(t.organizationId),
  ],
);

/**
 * La risposta a un requisito. ⚠️ UNA SOLA PER AZIENDA, condivisa dai due percorsi.
 *
 * La chiave e' `(companyId, requirementKey)` e non `(assessmentId, …)`: e' quello che
 * rende impossibile, per costruzione, che la stessa azienda abbia due risposte diverse
 * allo stesso requisito. Legarla a una delle due radici avrebbe richiesto un ponte, e un
 * ponte e' una difesa che deve restare giusta per sempre.
 */
export const nis2RequirementState = pgTable(
  "nis2_requirement_state",
  {
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    companyId: text("company_id")
      .notNull()
      .references(() => company.id, { onDelete: "cascade" }),
    requirementKey: text("requirement_key").notNull(),
    /** 0÷4. `null` finche' nessuno l'ha guardato: non e' zero. */
    livello: integer("livello"),
    /** ⚠️ Fuori dal denominatore, ed e' un'altra cosa da «non valutato»: e' una
     *  valutazione, non un'omissione. */
    nonApplicabile: boolean("non_applicabile").default(false).notNull(),
    evidenza: text("evidenza"),
    note: text("note"),
    updatedAt: timestamp("updated_at").defaultNow().$onUpdate(() => new Date()).notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.companyId, t.requirementKey] }),
    index("nis2_requirement_state_org_idx").on(t.organizationId),
  ],
);

/** Lo stato di un controllo. Solo il percorso `sgnis2` la usa. */
export const nis2ControlState = pgTable(
  "nis2_control_state",
  {
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    companyId: text("company_id")
      .notNull()
      .references(() => company.id, { onDelete: "cascade" }),
    controlKey: text("control_key").notNull(),
    /**
     * ⚠️ Quattro stati, e «da verificare» NON e' fra questi.
     *
     * Non e' una scelta di chi compila: e' cio' che il tempo fa a un «attuato» lasciato
     * solo oltre la sua frequenza, e si calcola. Se fosse selezionabile qualcuno lo
     * sceglierebbe a mano e il meccanismo smetterebbe di significare qualcosa.
     */
    stato: text("stato", { enum: ["non_attuato", "in_attuazione", "attuato", "non_applicabile"] }),
    responsabile: text("responsabile"),
    evidenza: text("evidenza"),
    ultimaVerifica: text("ultima_verifica"),
    note: text("note"),
    updatedAt: timestamp("updated_at").defaultNow().$onUpdate(() => new Date()).notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.companyId, t.controlKey] }),
    index("nis2_control_state_org_idx").on(t.organizationId),
  ],
);

/** Lo stato di una fase della roadmap. */
export const nis2PhaseState = pgTable(
  "nis2_phase_state",
  {
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    companyId: text("company_id")
      .notNull()
      .references(() => company.id, { onDelete: "cascade" }),
    phaseKey: text("phase_key").notNull(),
    stato: text("stato", { enum: ["non_avviata", "in_corso", "completata"] }).default("non_avviata").notNull(),
    responsabile: text("responsabile"),
    scadenza: text("scadenza"),
    note: text("note"),
    updatedAt: timestamp("updated_at").defaultNow().$onUpdate(() => new Date()).notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.companyId, t.phaseKey] }),
    index("nis2_phase_state_org_idx").on(t.organizationId),
  ],
);

/** Un indicatore dello studio: quelli del catalogo si copiano, altri si aggiungono. */
export const nis2Indicator = pgTable(
  "nis2_indicator",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    companyId: text("company_id")
      .notNull()
      .references(() => company.id, { onDelete: "cascade" }),
    codice: text("codice").notNull(),
    nome: text("nome").notNull(),
    ambito: text("ambito"),
    tipo: text("tipo", { enum: ["attuazione", "efficacia"] }),
    /** Il controllo o la misura a cui si riferisce. */
    misuraCollegata: text("misura_collegata"),
    formula: text("formula"),
    unita: text("unita"),
    fonte: text("fonte"),
    frequenza: text("frequenza", { enum: ["mensile", "trimestrale", "semestrale", "annuale"] })
      .default("trimestrale")
      .notNull(),
    responsabile: text("responsabile"),
    valoreIniziale: text("valore_iniziale"),
    /** ⚠️ `null` non e' zero: un target assente non e' un target a zero, e senza questa
     *  distinzione un indicatore senza bersaglio risulterebbe «a target» sempre. */
    target: text("target"),
    soglia: text("soglia"),
    verso: text("verso", { enum: ["crescente", "decrescente"] }).default("crescente").notNull(),
    note: text("note"),
    ordine: integer("ordine").default(0).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().$onUpdate(() => new Date()).notNull(),
  },
  (t) => [
    uniqueIndex("nis2_indicator_company_codice_uq").on(t.companyId, t.codice),
    index("nis2_indicator_org_idx").on(t.organizationId),
  ],
);

/** Una rilevazione di un indicatore, per periodo. */
export const nis2IndicatorReading = pgTable(
  "nis2_indicator_reading",
  {
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    indicatorId: text("indicator_id")
      .notNull()
      .references(() => nis2Indicator.id, { onDelete: "cascade" }),
    /** "2026", "2026-S1", "2026-T2", "2026-05": la forma dipende dalla frequenza. */
    periodo: text("periodo").notNull(),
    /** ⚠️ NUMERIC come testo, mai float: e' la regola del progetto sulle quantita'. */
    valore: text("valore"),
    note: text("note"),
    updatedAt: timestamp("updated_at").defaultNow().$onUpdate(() => new Date()).notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.indicatorId, t.periodo] }),
    index("nis2_indicator_reading_org_idx").on(t.organizationId),
  ],
);

/**
 * I ventitre settori degli Allegati I e II.
 *
 * ⚠️ Nel database e non nel motore, ed e' la regola del progetto dalla Fase 2: i contenuti
 * metodologici sono dati di seme versionati, non costanti nel codice. Un elenco scritto
 * nel motore E seminato qui sarebbero due elenchi, e due elenchi divergono — il giorno che
 * il decreto ne aggiunge uno, il prodotto lo mostra nella tendina e il motore non lo
 * riconosce, classificando come «settore non elencato» un'azienda che invece rientra.
 *
 * Cio' che resta nel motore e' la REGOLA (come l'allegato incrocia la dimensione), perche'
 * e' eseguibile e deve stare con la logica che la applica. E' la stessa distinzione gia'
 * fatta per gli otto obblighi derivati di ISO 37001.
 */
export const nis2Sector = pgTable(
  "nis2_sector",
  {
    contentSetId: text("content_set_id").notNull(),
    /** Il nome del settore, che e' anche la chiave: e' cosi' che il decreto li nomina. */
    key: text("key").notNull(),
    /** 1 = alta criticita' (Allegato I), 2 = altri settori critici (Allegato II). */
    allegato: integer("allegato").notNull(),
    ordine: integer("ordine").notNull(),
  },
  (t) => [primaryKey({ columns: [t.contentSetId, t.key] })],
);

/**
 * Gli otto criteri specifici dell'art. 3, che prescindono dalla dimensione.
 *
 * Il TESTO sta qui (lo legge chi compila); la CLASSE a cui ciascuno porta sta anche nel
 * motore, perche' e' la regola che decide. Le due devono coincidere, e un test sul
 * catalogo lo pretende invece di sperarlo.
 */
export const nis2Criterion = pgTable(
  "nis2_criterion",
  {
    contentSetId: text("content_set_id").notNull(),
    /** "c1" … "c8". */
    key: text("key").notNull(),
    testo: text("testo").notNull(),
    classe: text("classe", { enum: ["essenziale", "importante"] }).notNull(),
    ordine: integer("ordine").notNull(),
  },
  (t) => [primaryKey({ columns: [t.contentSetId, t.key] })],
);
