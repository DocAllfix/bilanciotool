import type { chainProgram } from "@/lib/db/schema";

// L'anagrafica che alimenta i segnaposto del corpus della filiera.
//
// I nomi sono quelli del CATALOGO, non delle colonne: vedi
// `corpus-segnaposto.db.test.ts`. Un campo scoperto lascia il token irrisolto, e un token
// irrisolto si stampa evidenziato: sembra un dato mancante del cliente invece di una
// mappatura mancante nostra.

type Programma = typeof chainProgram.$inferSelect;

export function anagraficaCorpusFiliera(p: Programma): Record<string, string | null | undefined> {
  return {
    ragione: p.ragione,
    // ⚠️ `direzione` e non `organo`: il segnaposto firma le procedure, e chi le adotta
    // non è sempre l'organo a cui la relazione viene indirizzata.
    direzione: p.direzione,
  };
}
