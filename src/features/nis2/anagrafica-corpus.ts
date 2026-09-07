import type { getQuadro } from "./profilo";

// L'anagrafica che alimenta i segnaposto del corpus NIS2.
//
// ⚠️ I nomi sono quelli del CATALOGO, non delle colonne. Vedi
// `corpus-segnaposto.db.test.ts`: un campo scoperto lascia il token irrisolto, e un token
// irrisolto si stampa evidenziato — quindi sembra un dato che il cliente non ha fornito
// invece di una mappatura mancante.
//
// ⚠️ Il corpus NIS2 usa DUE sole forme in tutte le 550 pagine — misurato:
// `[Nome Organizzazione]` (70 occorrenze) e `[Rev.]` (64). Il prototipo ne dichiara nove;
// le altre sette non hanno un solo riscontro nel testo. Innocuo, ma vale la pena saperlo
// prima di andarle a cercare.

type Quadro = NonNullable<Awaited<ReturnType<typeof getQuadro>>>;

export function anagraficaCorpusNis2(q: Quadro): Record<string, string | null | undefined> {
  return {
    // La ragione sociale: il profilo NIS2 non ne ha una propria, quindi si prende quella
    // dell'azienda — che è l'unica che esista, e la sola che il cliente riconoscerebbe.
    ragione: q.azienda.nome,
    sede: q.azienda.sede,
    settore: q.profilo?.settore ?? q.azienda.settore,
    direzione: q.profilo?.organo,
    responsabile: q.profilo?.responsabile,
    contatto: q.profilo?.puntoContatto,
  };
}
