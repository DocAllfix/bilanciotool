import type { wbSystem } from "@/lib/db/schema";

// L'anagrafica che alimenta i segnaposto del corpus.
//
// ⚠️ I nomi sono quelli del CATALOGO, non quelli delle colonne. Il catalogo dei
// segnaposto è estratto dal prototipo e parla la sua lingua (`organo`, `ragione`); lo
// schema ne ha rinominati alcuni per chiarezza (`organoIndirizzo`, `formaGiuridica`).
//
// Passare la riga così com'è lascerebbe il token irrisolto — e un token irrisolto si
// stampa **evidenziato**, quindi sembrerebbe un dato che il cliente non ha fornito
// invece di una mappatura mancante. È la terza volta che questo progetto incontra la
// stessa forma di difetto: chiavi di un motore contro nomi di colonne, e ogni volta il
// sintomo è un dato che risulta assente pur essendoci.
//
// `corpus-segnaposto.db.test.ts` pretende che ogni campo richiesto dal catalogo sia
// coperto da questa mappa.

type Assetto = typeof wbSystem.$inferSelect;

export function anagraficaCorpus(a: Assetto): Record<string, string | null | undefined> {
  return {
    ragione: a.ragione,
    forma: a.formaGiuridica,
    piva: a.piva,
    sede: a.sede,
    settore: a.settore,
    addetti: a.addetti,
    organo: a.organoIndirizzo,
    controllo: a.organoControllo,
    gestore: a.gestore,
    sostituto: a.sostituto,
    dpo: a.dpo,
  };
}
