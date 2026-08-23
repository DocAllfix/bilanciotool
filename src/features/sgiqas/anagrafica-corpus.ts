import type { qasSystem } from "@/lib/db/schema";

// L'anagrafica che alimenta i segnaposto del corpus del sistema integrato.
//
// ⚠️ I nomi sono quelli del CATALOGO, non delle colonne. Vedi
// `corpus-segnaposto.db.test.ts`: un campo scoperto lascia il token irrisolto, e un token
// irrisolto si stampa evidenziato — quindi sembra un dato che il cliente non ha fornito
// invece di una mappatura mancante.

type Sistema = typeof qasSystem.$inferSelect;

export function anagraficaCorpusQas(s: Sistema): Record<string, string | null | undefined> {
  return {
    ragione: s.ragione,
    forma: s.forma,
    piva: s.piva,
    sede: s.sede,
    settore: s.settore,
    addetti: s.addetti,
    direzione: s.direzione,
    // Il catalogo lo chiama «rsi», lo schema «responsabileSistema»: la guardia
    // `corpus-segnaposto.db.test.ts` ha trovato lo scarto prima che uscisse.
    rsi: s.responsabileSistema,
    rspp: s.rspp,
    rls: s.rls,
  };
}
