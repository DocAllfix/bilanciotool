import { relations } from "drizzle-orm";
import { boolean, index, integer, pgTable, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { organization } from "./auth";
import { company } from "./tenancy";
import { contentSet } from "./content";

// Gestione delle segnalazioni (D.Lgs. 24/2023).
//
// Come per ISO 37001 e il 231, le 12 procedure, i 34 moduli e i 13 registri stanno nel
// CORPUS (Fase A) e nel registro generico: qui c'è il dominio.
//
// ⚠️ QUESTO MODULO NON RACCOGLIE SEGNALAZIONI, e non è una sfumatura di prodotto: è la
// ragione per cui l'identità del segnalante non compare in nessuna colonna di questo
// file. Il canale vero — quello dove una persona scrive — resta dell'organizzazione;
// noi ne teniamo il censimento e il fascicolo di gestione. Il legame fra il codice di
// collegamento e la persona è custodito dal gestore FUORI da questa applicazione, ed è
// così anche nel prototipo. Chi in futuro aggiungesse un campo «nominativo» qui dentro
// cambierebbe la natura giuridica del prodotto: Evalis diventerebbe custode
// dell'identità di chi si è esposto, con le garanzie tecniche dell'art. 4 a carico
// nostro.

// ─── Cataloghi ───────────────────────────────────────────────────────────────

/** I dieci capi della conformità (A÷L, senza J e K: non esistono nel decreto). */
export const wbChapter = pgTable(
  "wb_chapter",
  {
    id: text("id").primaryKey(),
    setId: text("set_id").notNull().references(() => contentSet.id, { onDelete: "restrict" }),
    key: text("key").notNull(),
    nome: text("nome").notNull(),
    descrizione: text("descrizione").notNull(),
    ordine: integer("ordine").notNull(),
  },
  (t) => [uniqueIndex("wb_chapter_set_key_uq").on(t.setId, t.key)],
);

/** Gli 82 requisiti, ciascuno ancorato a un articolo del decreto e a una procedura. */
export const wbRequirement = pgTable(
  "wb_requirement",
  {
    id: text("id").primaryKey(),
    setId: text("set_id").notNull().references(() => contentSet.id, { onDelete: "restrict" }),
    key: text("key").notNull(),
    chapterKey: text("chapter_key").notNull(),
    /** Riferimento normativo, es. «art. 5 c. 1 lett. a)». */
    riferimento: text("riferimento").notNull(),
    procedura: text("procedura"),
    testo: text("testo").notNull(),
    ordine: integer("ordine").notNull(),
  },
  (t) => [
    uniqueIndex("wb_requirement_set_key_uq").on(t.setId, t.key),
    index("wb_requirement_set_cap_idx").on(t.setId, t.chapterKey),
  ],
);

// ─── Tabelle tenant ──────────────────────────────────────────────────────────

/**
 * L'assetto: chi è obbligato, chi gestisce, quando è stata adottata la procedura.
 *
 * Una per azienda, come la SoA e l'autovalutazione fornitore: non è un esercizio
 * annuale, è la fotografia corrente di un sistema che si mantiene.
 */
export const wbSystem = pgTable(
  "wb_system",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id").notNull().references(() => organization.id, { onDelete: "cascade" }),
    companyId: text("company_id").notNull().references(() => company.id, { onDelete: "cascade" }),
    contentSetId: text("content_set_id").notNull().references(() => contentSet.id, { onDelete: "restrict" }),

    ragione: text("ragione"),
    formaGiuridica: text("forma_giuridica"),
    piva: text("piva"),
    sede: text("sede"),
    settore: text("settore"),
    addetti: text("addetti"),

    /**
     * Il titolo dell'obbligo.
     *
     * ⚠️ È il campo che decide il perimetro commerciale del modulo, e il 231 ne è UNA
     * voce su cinque: un ente con ottanta dipendenti e nessun Modello 231 è pienamente
     * obbligato. Trattare questo modulo come un'appendice del 231 escluderebbe la
     * maggioranza degli obbligati.
     */
    obbligo: text("obbligo"),
    mogAdottato: text("mog_adottato"),
    /** Ammesso per gli enti fino a 249 lavoratori, e va formalizzato. */
    canaleCondiviso: text("canale_condiviso"),

    gestoreTipo: text("gestore_tipo"),
    gestore: text("gestore"),
    /** Chi subentra quando il gestore si astiene per conflitto sul singolo caso. */
    sostituto: text("sostituto"),
    nomina: text("nomina"),
    organoIndirizzo: text("organo_indirizzo"),
    organoControllo: text("organo_controllo"),
    dpo: text("dpo"),

    /** Precede l'attivazione del canale; l'omissione è contestabile (art. 4 c. 1). */
    consultazioneSindacale: text("consultazione_sindacale"),
    dataAdozione: text("data_adozione"),
    revisione: text("revisione"),
    note: text("note"),

    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("wb_system_company_uq").on(t.companyId),
    index("wb_system_org_idx").on(t.organizationId),
  ],
);

/**
 * Il canale, come entità.
 *
 * ⚠️ Nel prototipo erano tre caselle di testo nell'anagrafica («Canale scritto
 * informatico», «Canale orale», «Modalità per l'incontro diretto») e nessuno verificava
 * che fossero riempite. L'art. 4 c. 1 le pretende TUTTE E TRE: forma scritta, forma
 * orale, e incontro diretto su richiesta del segnalante. Un ente con la sola casella di
 * posta ha un canale non conforme, e il prototipo lo dichiarava a posto.
 *
 * Con una riga per modalità la verifica diventa totale: si contano le forme attive e
 * quelle che mancano si nominano. Le righe per forma possono essere più d'una — un ente
 * può avere la piattaforma informatica E l'indirizzo postale, entrambi in forma scritta.
 * Quindi nessun vincolo di unicità, e il controllo è «per ciascuna delle tre forme,
 * almeno una riga attiva».
 */
export const wbChannel = pgTable(
  "wb_channel",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id").notNull().references(() => organization.id, { onDelete: "cascade" }),
    systemId: text("system_id").notNull().references(() => wbSystem.id, { onDelete: "cascade" }),

    /** Una delle tre forme di legge. Dominio chiuso: il CHECK è nella migrazione. */
    forma: text("forma").notNull(),
    /**
     * ⚠️ Booleano vero e non «Sì»/«No»: qui il terzo stato non esiste. Un canale è
     * attivo o non lo è, e finché non lo è la persona non ha dove scrivere. Un NULL
     * significherebbe «non so se i miei dipendenti possano segnalare», che non è una
     * risposta ammissibile.
     */
    attiva: boolean("attiva").notNull().default(false),
    /** Come è realizzata: l'indirizzo della piattaforma, il numero, la procedura. */
    descrizione: text("descrizione"),
    fornitore: text("fornitore"),
    /**
     * Le misure tecniche di riservatezza (art. 4 c. 2: «anche mediante il ricorso a
     * strumenti di crittografia»). Sta sul canale e non sull'assetto perché è una
     * proprietà dello strumento: la piattaforma cifra, la linea telefonica no.
     */
    riservatezza: text("riservatezza"),
    attivatoIl: text("attivato_il"),
    note: text("note"),

    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("wb_channel_system_idx").on(t.systemId),
    index("wb_channel_org_idx").on(t.organizationId),
  ],
);

/**
 * Il fascicolo di una segnalazione.
 *
 * ⚠️ NESSUN DATO IDENTIFICATIVO. `codice` è il codice di collegamento, non un nome; i
 * campi liberi portano l'avvertenza nell'interfaccia. È la ragione per cui questo tipo
 * di documento non potrà mai uscire dal portale cliente (vedi `TIPI_RISERVATI`).
 *
 * Le colonne sono colonne e non un jsonb perché si interrogano tutte: quante scadute,
 * quante per esito, quante a rischio di ritorsione alto, quali da cancellare. Su un
 * jsonb ogni domanda del quadro diventerebbe una scansione, e i termini di legge
 * sarebbero invisibili all'indice.
 */
export const wbReport = pgTable(
  "wb_report",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id").notNull().references(() => organization.id, { onDelete: "cascade" }),
    systemId: text("system_id").notNull().references(() => wbSystem.id, { onDelete: "cascade" }),

    /**
     * Il numero progressivo, che è anche la chiave con cui i registri (ritorsioni,
     * accessi, eventi di riservatezza) rimandano al fascicolo.
     *
     * ⚠️ Il prototipo lo ricavava da `righe.length + 1`: dopo una cancellazione due
     * fascicoli diversi ricevevano lo stesso numero, e i registri finivano a puntare a
     * due cose. Qui il vincolo di unicità lo impedisce, e l'assegnazione avviene sotto
     * il blocco della riga dell'assetto: due inserimenti simultanei si mettono in fila
     * invece di litigare.
     */
    numero: integer("numero").notNull(),

    // ── Ricezione ──
    dataRicezione: text("data_ricezione"),
    canale: text("canale"),
    /**
     * ⚠️ Booleano e non tri-stato: chi riceve una segnalazione sa subito se è anonima,
     * è il primo fatto osservabile e non una valutazione. Un NULL si propagherebbe nel
     * motore dei termini e nel tetto del rischio di ritorsione, spegnendoli entrambi.
     */
    anonima: boolean("anonima").notNull().default(false),
    qualita: text("qualita"),
    ambito: text("ambito"),
    /** Formulazione neutra: il registro è consultabile da più soggetti autorizzati. */
    oggetto: text("oggetto"),
    fatti: text("fatti"),
    quando: text("quando"),
    dove: text("dove"),
    /** Codici o funzioni, mai nominativi. */
    coinvolti: text("coinvolti"),
    elementi: text("elementi"),
    altrove: text("altrove"),
    incontroRichiesto: text("incontro_richiesto"),

    // ── Identificazione ──
    /** Il codice di collegamento. Il legame con la persona sta fuori di qui. */
    codice: text("codice"),
    /**
     * ⚠️ Tri-stato vero, e i tre valori non collassano: per la segnalazione NON anonima
     * «non dichiarato» vale come contattabile, per l'anonima vale come non contattabile.
     * Ridurlo a booleano perderebbe una delle due asimmetrie, e sono di segno opposto.
     */
    recapito: text("recapito"),
    consensoRegistrazione: text("consenso_registrazione"),
    verbaleConfermato: text("verbale_confermato"),

    // ── Termini di legge ──
    avvisoReso: text("avviso_reso"),
    riscontroReso: text("riscontro_reso"),
    comunicazioneStato: text("comunicazione_stato"),
    stato: text("stato").notNull().default("Ricevuta"),

    // ── Ammissibilità (i cinque elementi, coi nomi del motore) ──
    ammOggetto: text("amm_oggetto"),
    ammLegittimato: text("amm_legittimato"),
    ammContesto: text("amm_contesto"),
    ammElementi: text("amm_elementi"),
    ammNonPersonale: text("amm_non_personale"),
    ammMotivazione: text("amm_motivazione"),
    ammAlternativi: text("amm_alternativi"),
    integrazioneChiesta: text("integrazione_chiesta"),
    integrazioneRicevuta: text("integrazione_ricevuta"),

    // ── Incompatibilità del gestore ──
    conflitto: text("conflitto"),
    subentrante: text("subentrante"),
    conflittoMotivo: text("conflitto_motivo"),

    // ── Istruttoria ──
    piano: text("piano"),
    rischiRiconoscibilita: text("rischi_riconoscibilita"),
    avvio: text("avvio"),
    conclusione: text("conclusione"),
    attivita: text("attivita"),
    personaSentita: text("persona_sentita"),
    audizioni: integer("audizioni"),
    evidenze: text("evidenze"),
    esito: text("esito"),
    rilevanzaPenale: text("rilevanza_penale"),
    motivazione: text("motivazione"),
    fattiNonAccertati: text("fatti_non_accertati"),
    proposteDisciplinari: text("proposte_disciplinari"),
    proposteCorrettive: text("proposte_correttive"),
    destinatariRelazione: text("destinatari_relazione"),
    contenutoRiscontro: text("contenuto_riscontro"),

    // ── Rischio di ritorsione (i sei fattori, coi nomi del motore) ──
    ritIdentitaConoscibile: text("rit_identita_conoscibile"),
    ritSovraordinato: text("rit_sovraordinato"),
    ritContestoRistretto: text("rit_contesto_ristretto"),
    ritPrecedenti: text("rit_precedenti"),
    ritRapportoPrecario: text("rit_rapporto_precario"),
    ritGiaEsposto: text("rit_gia_esposto"),
    monitoraggioAperto: text("monitoraggio_aperto"),
    monitoraggioFino: text("monitoraggio_fino"),
    monitoraggioPeriodicita: text("monitoraggio_periodicita"),
    soggettiTutelati: text("soggetti_tutelati"),
    misurePreventive: text("misure_preventive"),
    rilevazioniMonitoraggio: text("rilevazioni_monitoraggio"),

    // ── Riservatezza dell'identità ──
    identitaRivelata: text("identita_rivelata"),
    consensoRivelazione: text("consenso_rivelazione"),
    rivelazioneRagioni: text("rivelazione_ragioni"),
    rivelazioneEffetti: text("rivelazione_effetti"),

    // ── Conservazione ──
    dataChiusura: text("data_chiusura"),
    cancellata: text("cancellata"),
    dataCancellazione: text("data_cancellazione"),
    prorogaMotivo: text("proroga_motivo"),

    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("wb_report_numero_uq").on(t.systemId, t.numero),
    index("wb_report_org_idx").on(t.organizationId),
    index("wb_report_stato_idx").on(t.systemId, t.stato),
  ],
);

/** Lo stato di ciascuno degli 82 requisiti. Una riga solo per quelli toccati. */
export const wbRequirementState = pgTable(
  "wb_requirement_state",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id").notNull().references(() => organization.id, { onDelete: "cascade" }),
    systemId: text("system_id").notNull().references(() => wbSystem.id, { onDelete: "cascade" }),
    requirementKey: text("requirement_key").notNull(),
    stato: text("stato"),
    note: text("note"),
    evidenza: text("evidenza"),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("wb_req_state_uq").on(t.systemId, t.requirementKey),
    index("wb_req_state_org_idx").on(t.organizationId),
  ],
);

export const wbSystemRelations = relations(wbSystem, ({ many }) => ({
  canali: many(wbChannel),
  segnalazioni: many(wbReport),
  requisiti: many(wbRequirementState),
}));

export const wbChannelRelations = relations(wbChannel, ({ one }) => ({
  assetto: one(wbSystem, { fields: [wbChannel.systemId], references: [wbSystem.id] }),
}));

export const wbReportRelations = relations(wbReport, ({ one }) => ({
  assetto: one(wbSystem, { fields: [wbReport.systemId], references: [wbSystem.id] }),
}));
