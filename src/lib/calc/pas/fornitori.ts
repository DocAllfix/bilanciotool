// La due diligence sui fornitori (8.1.3, A.1 · 4, A.2 · 9): il `fornStat` del prototipo.
//
// ⚠️ Una sola divergenza: senza fornitori le quote sono `null`, non 0. Il prototipo mostrava
// «—» a schermo solo perché lo controllava la vista; il numero sotto era zero, cioè «nessuno
// ha firmato», detto di un elenco vuoto.

import type { Fornitore } from "./tipi";

const quota = (parte: number, totale: number) => (totale ? Math.round((parte / totale) * 1000) / 10 : null);

export type StatoFornitori = {
  fornitori: number;
  conClausola: number;
  conQuestionario: number;
  alti: number;
  /** Fornitori con un livello di rischio attribuito. */
  valutati: number;
  /** A rischio alto e mai verificati, per nome. */
  altiMaiVerificati: string[];
  critici: number;
  quotaClausola: number | null;
  quotaQuestionario: number | null;
  quotaVerificati: number | null;
};

export function statoFornitori(F: readonly Fornitore[]): StatoFornitori {
  const n = F.length;
  return {
    fornitori: n,
    conClausola: F.filter((f) => f.clausola).length,
    conQuestionario: F.filter((f) => f.questionario).length,
    alti: F.filter((f) => f.rischio === "Alto").length,
    valutati: F.filter((f) => !!f.rischio).length,
    altiMaiVerificati: F.filter((f) => f.rischio === "Alto" && !f.verificatoIl).map((f) => f.nome),
    critici: F.filter((f) => f.esito === "Critico").length,
    quotaClausola: quota(F.filter((f) => f.clausola).length, n),
    quotaQuestionario: quota(F.filter((f) => f.questionario).length, n),
    quotaVerificati: quota(F.filter((f) => !!f.verificatoIl).length, n),
  };
}
