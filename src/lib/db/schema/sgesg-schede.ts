import { pgTable, text, integer, boolean, jsonb, timestamp, index, uniqueIndex } from "drizzle-orm/pg-core";
import { organization } from "./auth";
import { contentSet } from "./content";
import { sgesgProgramma } from "./sgesg";

// LE 63 SCHEDE DEL METODO — catalogo e compilato.
//
// ⚠️ LA DECISIONE CHE TIENE IN PIEDI IL PIANO. In `esg-nexus-v2` le 63 schede sono 63
// componenti React scritti a mano sopra un vocabolario condiviso (`FormWrapper`: `Field`,
// `Input`, `Select`, `RadioGroup`, `CheckboxGroup`). Portarle una per una significherebbe
// **63 file nuovi da mantenere per sempre**.
//
// Questo progetto ha gia' affrontato lo stesso bivio e sa come finisce: il corpus dei sei
// moduli di conformita' sono 447 documenti e 6.489 blocchi resi da UN componente, perche'
// nei prototipi erano codice ricopiato sei volte.
//
// Quindi le schede sono DATI seminati e un renderer solo le disegna tutte. Il catalogo
// esce da `scripts/extract-sgesg.mjs`, che le ESEGUE invece di leggerne il sorgente.
//
// ⚠️ E ventuno delle 63 non ci stanno, dichiarato invece che taciuto: sono tabelle e
// registri (Risk Register, Matrice RACI, Valutazione IRO, Catalogo Iniziative...) senza
// un solo campo indipendente, oppure hanno strutture ripetute in cui piu' campi scrivono
// nello stesso array. Quelle portano `haLogica` e la loro compilazione arriva con un
// lavoro dedicato: l'interfaccia lo dice, invece di mostrare una scheda vuota.

/** Una scheda del catalogo: appartiene a una fase, e a un set di contenuti versionato. */
export const sgesgSchedaDef = pgTable(
  "sgesg_scheda_def",
  {
    id: text("id").primaryKey(),
    setId: text("set_id")
      .notNull()
      .references(() => contentSet.id, { onDelete: "restrict" }),
    /** `00A`, `01C`, `07LOG`… come nel progetto d'origine: e' il nome con cui il metodo
     *  si cita nei documenti, e cambiarlo renderebbe irriconoscibile una procedura. */
    key: text("key").notNull(),
    /** La fase che la contiene (`proc00`…`proc07`). */
    faseKey: text("fase_key").notNull(),
    /** `FORM-00A`: il codice stampato in testa alla scheda. */
    codice: text("codice"),
    titolo: text("titolo").notNull(),
    sottotitolo: text("sottotitolo"),
    /** L'istruzione operativa in testa: quando si compila, chi la compila, cosa produce. */
    istruzione: text("istruzione"),
    /**
     * Sezioni e campi, come li ha dichiarati il componente d'origine.
     *
     * ⚠️ JSONB e non tabelle normalizzate, ed e' una scelta contraria a quella fatta per
     * il corpus (una riga per blocco). La ragione e' la differenza fra i due: i blocchi
     * del corpus si PERSONALIZZANO uno per uno, quindi ciascuno deve avere una chiave
     * esterna vera; i campi di una scheda no — si compilano, non si riscrivono. Nessuno
     * puntera' mai a un singolo campo del catalogo, quindi normalizzarlo darebbe 314
     * righe e nessuna domanda in piu' a cui rispondere.
     */
    sezioni: jsonb("sezioni").notNull().default([]),
    /** true se la scheda non ha campi compilabili nel modello dichiarativo. */
    haLogica: boolean("ha_logica").notNull().default(false),
    ordine: integer("ordine").notNull(),
  },
  (t) => [
    uniqueIndex("sgesg_scheda_def_set_key_uq").on(t.setId, t.key),
    index("sgesg_scheda_def_fase_idx").on(t.setId, t.faseKey),
  ],
);

/**
 * Il compilato di una scheda dentro un programma.
 *
 * Una riga per scheda TOCCATA, come per le fasi: una scheda mai aperta non esiste, e la
 * differenza fra «non compilata» e «aperta e lasciata vuota» e' informazione.
 *
 * ⚠️ `dati` e' un JSONB `chiave -> valore`, e le chiavi sono quelle del catalogo. Non e'
 * una scorciatoia: sono 314 campi eterogenei che nessuno interroghera' mai per colonna —
 * le domande che si fanno a una scheda sono «e' compilata?» e «mostrami cio' che c'e'
 * dentro». Il giorno in cui servisse interrogare un campo specifico, quel campo diventa
 * una colonna vera, come e' successo alla partita IVA dei partner di filiera.
 */
export const sgesgSchedaDato = pgTable(
  "sgesg_scheda_dato",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    programId: text("program_id")
      .notNull()
      .references(() => sgesgProgramma.id, { onDelete: "cascade" }),
    schedaKey: text("scheda_key").notNull(),
    dati: jsonb("dati").notNull().default({}),
    /** Lo stato dichiarato dal consulente, non dedotto dal riempimento: una scheda si
     *  puo' considerare chiusa anche con campi facoltativi vuoti. */
    stato: text("stato", { enum: ["bozza", "completata"] }).notNull().default("bozza"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("sgesg_scheda_dato_program_key_uq").on(t.programId, t.schedaKey),
    index("sgesg_scheda_dato_org_idx").on(t.organizationId),
  ],
);
