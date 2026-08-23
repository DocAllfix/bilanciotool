import type { mogModel } from "@/lib/db/schema";

// L'anagrafica che alimenta i segnaposto del corpus del Modello 231.
//
// ⚠️ I nomi sono quelli del CATALOGO, non quelli delle colonne: il catalogo è estratto
// dal prototipo e chiama `direzione` ciò che lo schema chiama `organoAmministrativo`.
// Senza questa traduzione il token `[Alta Direzione]` resterebbe irrisolto e si
// stamperebbe evidenziato — cioè sembrerebbe un dato che il cliente non ha fornito,
// mentre è già nella scheda dell'ente. Vedi `corpus-segnaposto.db.test.ts`.

type Modello = typeof mogModel.$inferSelect;

export function anagraficaCorpus231(m: Modello): Record<string, string | null | undefined> {
  return {
    ragione: m.ragione,
    forma: m.forma,
    piva: m.piva,
    sede: m.sede,
    settore: m.settore,
    addetti: m.addetti,
    direzione: m.organoAmministrativo,
    odv: m.odvComposizione,
  };
}
