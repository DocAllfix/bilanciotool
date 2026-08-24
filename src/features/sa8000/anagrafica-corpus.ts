import type { saSystem } from "@/lib/db/schema";

// L'anagrafica che alimenta i segnaposto del corpus SA8000/2026.
//
// ⚠️ I nomi sono quelli del CATALOGO, non delle colonne: vedi
// `corpus-segnaposto.db.test.ts`. Un campo scoperto lascia il token irrisolto, e un token
// irrisolto si stampa evidenziato — sembra un dato mancante del cliente.

type Sistema = typeof saSystem.$inferSelect;

export function anagraficaCorpusSa(s: Sistema): Record<string, string | null | undefined> {
  return {
    ragione: s.ragione,
    forma: s.forma,
    piva: s.piva,
    sede: s.sede,
    settore: s.settore,
    addetti: s.addetti,
    ccnl: s.ccnl,
    respSA: s.respSa,
    direzione: s.direzione,
    reclamiEmail: s.reclamiEmail,
    // Il catalogo lo chiama «sitoweb»: quarta cattura della guardia sui segnaposto.
    sitoweb: s.sitoWeb,
  };
}
