// I fornitori che trattano dati per conto dell'organizzazione, e i trasferimenti.
//
// ⚠️ DIVERGE DAL PROTOTIPO su un punto. Nel prototipo un «Responsabile (art. 28)» con il
// contratto segnato «Non dovuto» spariva dalle lacune senza contare come coperto: il
// contratto con un responsabile è SEMPRE dovuto, e «Non dovuto» descrive solo il titolare
// autonomo. Qui quella combinazione è un'incoerenza dichiarata (`contrattoIncoerente`), che
// la validazione rifiuta e il motore conta comunque come contratto mancante.

import {
  GARANZIA_DA_DEFINIRE,
  GARANZIA_DEROGA,
  GARANZIA_NESSUNA,
  QUALIFICA_TITOLARE_AUTONOMO,
  type Fornitore,
} from "./tipi";

/** Il fornitore deve avere un contratto ai sensi dell'art. 28 o 26. */
export const richiedeContratto = (f: Pick<Fornitore, "qualifica">) => f.qualifica !== QUALIFICA_TITOLARE_AUTONOMO;

/** «Non dovuto» su chi un contratto lo deve avere. */
export const contrattoIncoerente = (f: Pick<Fornitore, "qualifica" | "contratto">) =>
  f.contratto === "Non dovuto" && richiedeContratto(f);

/** I dati escono dallo Spazio economico europeo. Una garanzia vuota non dice niente. */
export const trasferisce = (f: Pick<Fornitore, "garanzia">) => !!f.garanzia && f.garanzia !== GARANZIA_NESSUNA;

const quota = (x: number, t: number) => (t ? Math.round((x / t) * 1000) / 10 : null);

export type StatoFornitori = {
  fornitori: number;
  /** Responsabili, sub-responsabili e contitolari. */
  conContratto: number;
  /** Con qualifica, contratto e garanzia indicati. */
  completi: number;
  senzaContratto: string[];
  conTrasferimento: number;
  garanziaDaDefinire: string[];
  inDeroga: number;
  critici: number;
  verificati: number;
  /** Quota di chi deve avere un contratto e ce l'ha; `null` se nessuno lo deve. */
  quotaContratti: number | null;
  quotaVerificati: number | null;
};

export function statoFornitori(fornitori: readonly Fornitore[]): StatoFornitori {
  const dovuti = fornitori.filter(richiedeContratto);
  return {
    fornitori: fornitori.length,
    conContratto: dovuti.length,
    completi: fornitori.filter((f) => f.contratto && f.garanzia).length,
    senzaContratto: dovuti.filter((f) => f.contratto !== "Sì").map((f) => f.nome),
    conTrasferimento: fornitori.filter(trasferisce).length,
    garanziaDaDefinire: fornitori.filter((f) => f.garanzia === GARANZIA_DA_DEFINIRE).map((f) => f.nome),
    inDeroga: fornitori.filter((f) => f.garanzia === GARANZIA_DEROGA).length,
    critici: fornitori.filter((f) => f.esito === "Critico").length,
    verificati: fornitori.filter((f) => !!f.verificatoIl).length,
    quotaContratti: quota(dovuti.filter((f) => f.contratto === "Sì").length, dovuti.length),
    quotaVerificati: quota(dovuti.filter((f) => !!f.verificatoIl).length, dovuti.length),
  };
}
