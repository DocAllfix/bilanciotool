import { NUMERI } from "@/features/formazione/numeri";
import { MODULI_AZIENDA } from "@/features/companies/moduli";
import { TIPI_DOCUMENTO } from "@/features/documents/tipi";
import procedure231 from "@/lib/db/seeds/data/mog231-procedures.json";
import moduli231 from "@/lib/db/seeds/data/mog231-modules.json";
import procedure37001 from "@/lib/db/seeds/data/iso37001-procedures.json";
import moduli37001 from "@/lib/db/seeds/data/iso37001-modules.json";
import procedureWb from "@/lib/db/seeds/data/wb-procedures.json";
import moduliWb from "@/lib/db/seeds/data/wb-modules.json";
import procedureFiliera from "@/lib/db/seeds/data/filiera-procedures.json";
import moduliFiliera from "@/lib/db/seeds/data/filiera-modules.json";
import procedureNis2 from "@/lib/db/seeds/data/nis2-procedures.json";
import moduliNis2 from "@/lib/db/seeds/data/nis2-modules.json";
import procedureQas from "@/lib/db/seeds/data/sgiqas-procedures.json";
import moduliQas from "@/lib/db/seeds/data/sgiqas-modules.json";
import procedureSa8000 from "@/lib/db/seeds/data/sa8000-procedures.json";
import moduliSa8000 from "@/lib/db/seeds/data/sa8000-modules.json";
import { DEFAULT_CONVERSION_FACTORS, deriveKpi } from "@/lib/calc/report/derived-kpi";
import { QUANTI_PERCORSI } from "./percorsi-vetrina";

// I numeri della banda della vetrina, RICAVATI dal prodotto.
//
// ⚠️ Nessuna cifra scritta a mano. La banda diceva «49 indicatori di bilancio, 30 dei
// quali calcolati in automatico» quando il motore ne calcola 25, e quel «30» è finito in
// un documento commerciale scritto da un consulente che si era fidato di noi. Un numero
// scritto a mano invecchia al primo modulo nuovo; uno contato non può.
//
// Tutti i conteggi vengono dai file del seme, letti al build: la pagina resta statica.

/**
 * I cataloghi che un percorso chiede di valutare uno per uno. I controlli NIS2 non si
 * sommano ai requisiti NIS2: sono lo stesso perimetro visto dall'altro lato, e contarli
 * due volte gonfierebbe il numero.
 */
const CATALOGHI = [
  NUMERI.controlliSoa,
  NUMERI.requisitiNis2,
  NUMERI.criteriSa8000,
  NUMERI.requisitiQas,
  NUMERI.requisitiGdpr,
  NUMERI.requisitiPas,
  NUMERI.requisiti37001,
  NUMERI.requisitiWb,
  NUMERI.presidi231,
  NUMERI.domandeFornitore,
];

const CORPUS = [
  procedure231, moduli231, procedure37001, moduli37001, procedureWb, moduliWb, procedureFiliera, moduliFiliera,
  procedureNis2, moduliNis2, procedureQas, moduliQas, procedureSa8000, moduliSa8000,
];

export const NUMERI_VETRINA = {
  percorsi: QUANTI_PERCORSI,
  gruppi: NUMERI.gruppi,
  tipiDocumento: TIPI_DOCUMENTO.length,
  requisiti: CATALOGHI.reduce((s, n) => s + n, 0),
  corpus: CORPUS.reduce((s, c) => s + c.length, 0),
  /** Gli indicatori che il motore del bilancio calcola: le chiavi di ciò che restituisce. */
  derivatiBilancio: Object.keys(deriveKpi({}, DEFAULT_CONVERSION_FACTORS)).length,
};

/**
 * Le norme dei percorsi, dal registro dei moduli. Una voce che è l'inizio di un'altra
 * («D.Lgs. 138/2024» e «D.Lgs. 138/2024 · ACN») cede il posto alla più completa.
 */
export const NORME_VETRINA: string[] = (() => {
  const tutte = [...new Set(MODULI_AZIENDA.map((m) => m.norma))];
  return tutte.filter((n) => !tutte.some((altra) => altra !== n && altra.startsWith(`${n} `)));
})();
