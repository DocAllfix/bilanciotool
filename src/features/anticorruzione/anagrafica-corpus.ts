import type { briberySystem } from "@/lib/db/schema";

// L'anagrafica che alimenta i segnaposto del corpus di ISO 37001.
//
// ⚠️ I nomi sono quelli del CATALOGO: `funzPC` è come il prototipo chiama la funzione
// per la prevenzione della corruzione, che lo schema chiama `funzionePc`. Una lettera di
// differenza, e il token si stamperebbe evidenziato come se il dato mancasse.
// Vedi `corpus-segnaposto.db.test.ts`.

type Sistema = typeof briberySystem.$inferSelect;

export function anagraficaCorpusPc(s: Sistema): Record<string, string | null | undefined> {
  return {
    ragione: s.ragione,
    forma: s.forma,
    piva: s.piva,
    sede: s.sede,
    settore: s.settore,
    addetti: s.addetti,
    direzione: s.direzione,
    funzPC: s.funzionePc,
  };
}
