import { index, integer, pgTable, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { organization } from "./auth";
import { documentSnapshot } from "./documents";

/**
 * Il codice di verifica di un documento pubblicato.
 *
 * Chi riceve un PDF — una banca, un capofiliera, un ente di certificazione — apre
 * `/verifica`, digita il codice stampato nel colophon e vede confermato **chi l'ha
 * emesso, per chi, quando e in quale revisione**. Nessun contenuto: non è un canale di
 * distribuzione, è una conferma di autenticità.
 *
 * ⚠️ **Tabella a parte, e non una colonna nello snapshot**, per due ragioni che tirano
 * nella stessa direzione:
 *
 * 1. `document_snapshot` è **immutabile per costruzione** — il trigger della migrazione
 *    0002 blocca l'update di dati, tipo, anno e versione per chiunque, connessione
 *    privilegiata compresa. Una colonna nuova là dentro sarebbe un campo mutabile dentro
 *    un record immutabile: il contrario di ciò che quel trigger difende.
 * 2. E i documenti **già pubblicati** non avrebbero mai potuto averne uno. Con una
 *    tabella a parte il codice si può assegnare anche a posteriori, e la scadenza dura
 *    del piano — «prima della prima pubblicazione in produzione» — si scioglie da sola.
 *
 * ⚠️ I campi mostrati sono **denormalizzati apposta**. La pagina pubblica legge QUESTA
 * tabella e nient'altro: non fa join verso `company`, `organization` o lo snapshot. Un
 * errore in quella query non può quindi allargare ciò che si vede oltre ciò che il
 * codice è progettato per mostrare — e i valori sono quelli **congelati al momento della
 * pubblicazione**, quindi la verifica dice ciò che il PDF dice, non ciò che il database
 * dice oggi.
 */
export const documentCodice = pgTable(
  "document_codice",
  {
    /** Il codice stesso, in forma canonica `EV-XXXX-XXXX`. È la chiave. */
    codice: text("codice").primaryKey(),

    snapshotId: text("snapshot_id")
      .notNull()
      .references(() => documentSnapshot.id, { onDelete: "cascade" }),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),

    /** Chi ha emesso: il nome congelato nello snapshot, che col white-label è lo studio. */
    emittente: text("emittente").notNull(),
    /** Per chi: la ragione sociale dell'azienda rendicontata, com'era quel giorno. */
    azienda: text("azienda").notNull(),
    /** Che cosa: il tipo di documento e la sua revisione. */
    tipo: text("tipo").notNull(),
    anno: integer("anno").notNull(),
    versione: integer("versione").notNull(),
    pubblicatoIl: timestamp("pubblicato_il", { withTimezone: true }).notNull().defaultNow(),

    /**
     * Quante volte è stato verificato, e l'ultima.
     *
     * Serve allo studio, non a noi: sapere che il documento consegnato è stato
     * effettivamente controllato dal destinatario è un'informazione commerciale vera.
     * Nessun dato di chi ha verificato: non lo raccogliamo e la privacy policy non lo
     * dichiara.
     */
    verifiche: integer("verifiche").notNull().default(0),
    ultimaVerifica: timestamp("ultima_verifica", { withTimezone: true }),
  },
  (t) => [
    // Un documento, un codice: ripubblicare crea una versione nuova, quindi un codice
    // nuovo. Lo stesso snapshot non può averne due.
    uniqueIndex("document_codice_snapshot_uq").on(t.snapshotId),
    index("document_codice_org_idx").on(t.organizationId),
  ],
);
