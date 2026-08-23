import { describe, it, expect } from "vitest";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { corpusPlaceholder } from "@/lib/db/schema";
import { anagraficaCorpus } from "@/features/segnalazioni/anagrafica-corpus";
import type { wbSystem } from "@/lib/db/schema";

// I segnaposto del corpus trovano davvero il loro dato?
//
// ⚠️ Il difetto che questo test esiste per impedire è SILENZIOSO E TRAVISANTE. Il
// catalogo dei segnaposto è estratto dai prototipi e parla la loro lingua (`organo`,
// `ragione`); lo schema del prodotto ne ha rinominati alcuni per chiarezza
// (`organoIndirizzo`, `formaGiuridica`). Se la mappatura non copre un campo, il token
// resta irrisolto — e un token irrisolto si stampa EVIDENZIATO, cioè sembra un dato che
// il cliente non ha ancora fornito.
//
// Il consulente andrebbe a cercare un'informazione che ha già inserito, non la
// troverebbe, e concluderebbe che il prodotto ha perso i suoi dati. Nessun errore, nessun
// test rosso, nessuna riga nei log: solo una parentesi quadra colorata in un documento.
//
// È la terza volta che questo progetto incontra la stessa forma — chiavi di un motore
// contro nomi di colonne — e le prime due volte il sintomo è stato lo stesso: un dato che
// risulta assente pur essendoci.

/** Una riga di assetto tutta piena: qui interessa quali CHIAVI escono, non i valori. */
const ASSETTO_FINTO = {
  ragione: "x", formaGiuridica: "x", piva: "x", sede: "x", settore: "x", addetti: "x",
  organoIndirizzo: "x", organoControllo: "x", gestore: "x", sostituto: "x", dpo: "x",
} as unknown as typeof wbSystem.$inferSelect;

describe("i segnaposto delle Segnalazioni trovano il loro dato", () => {
  it("ogni campo richiesto dal catalogo è coperto dalla mappatura", async () => {
    const richiesti = await db
      .select({ forma: corpusPlaceholder.forma, campo: corpusPlaceholder.campo })
      .from(corpusPlaceholder)
      .where(and(eq(corpusPlaceholder.contentSetId, "wb-v1"), eq(corpusPlaceholder.fonte, "azienda")));

    // Guardia sulla prova stessa: se il catalogo non fosse seminato, l'elenco sarebbe
    // vuoto e il test passerebbe senza provare niente.
    expect(richiesti.length, "il catalogo dei segnaposto non risulta seminato").toBeGreaterThan(0);

    const coperti = new Set(Object.keys(anagraficaCorpus(ASSETTO_FINTO)));
    const scoperti = richiesti
      .filter((r) => r.campo && !coperti.has(r.campo))
      .map((r) => `${r.forma} → «${r.campo}»`);

    expect(
      scoperti,
      "Segnaposto senza dato: si stamperebbero evidenziati, e sembrerebbero un dato " +
        "mancante del cliente invece di una mappatura mancante. Aggiungi la chiave in " +
        "src/features/segnalazioni/anagrafica-corpus.ts.",
    ).toEqual([]);
  });

  it("la mappatura non promette campi che l'assetto non ha", async () => {
    // Il difetto opposto: una chiave che nessun segnaposto usa non fa danno, ma una
    // chiave che punta a una colonna inesistente restituirebbe `undefined` per sempre.
    // Qui si verifica che ogni valore promesso esista davvero nella riga.
    const mappa = anagraficaCorpus(ASSETTO_FINTO);
    const vuoti = Object.entries(mappa)
      .filter(([, v]) => v === undefined)
      .map(([k]) => k);
    expect(vuoti, "chiavi che puntano a colonne inesistenti").toEqual([]);
  });
});
