// L'avanzamento del percorso: quanto di ciascuna parte è compilato, 0 ÷ 1.
//
// È lo `stato` del prototipo, con le stesse sette misure e la stessa media. Misura la
// COMPILAZIONE, non la conformità: un percorso al 100% può essere pieno di non conformità,
// purché valutate e documentate. L'indice di conformità sta altrove.

import { conformita } from "./conformita";
import { statoFornitori } from "./fornitori";
import { CAMPI_PROFILO, statiDelCatalogo, type Quadro } from "./quadro";
import { annoDi, CHIAVI_REGISTRI } from "./registri";
import { statoRischi } from "./rischio";

/** Il testo della politica conta se supera questa lunghezza: sotto è un abbozzo. */
export const TESTO_POLITICA_MINIMO = 200;
/** Quattro fattori fanno un'analisi del contesto credibile. */
export const FATTORI_ATTESI = 4;
/** Tre obiettivi collegati ai rischi principali. */
export const OBIETTIVI_ATTESI = 3;
/** Otto attività fanno un piano annuale. */
export const ATTIVITA_ATTESE = 8;

export type Avanzamento = {
  organizzazione: number;
  contesto: number;
  conformita: number;
  rischi: number;
  politica: number;
  indicatori: number;
  registri: number;
  /** Media delle sette parti. */
  complessivo: number;
  /** Il complessivo in percentuale intera. */
  percentuale: number;
};

export function avanzamento(q: Quadro, anno: number): Avanzamento {
  const p = q.profilo;
  const campi = Object.keys(CAMPI_PROFILO) as (keyof typeof CAMPI_PROFILO)[];
  const organizzazione = campi.filter((k) => String(p[k] ?? "").trim()).length / campi.length;

  const fattori = Math.min(1, q.fattori.filter((f) => f.descrizione.trim()).length / FATTORI_ATTESI);
  const parti = q.parti.length ? q.parti.filter((x) => x.nome.trim() && x.esigenze.trim()).length / q.parti.length : 0;
  const contesto = (fattori + parti) / 2;

  const c = conformita(statiDelCatalogo(q));
  const conf = c.totale ? c.valutati / c.totale : 0;

  const rs = statoRischi(q.rischi, q.parametri);
  const fs = statoFornitori(q.fornitori);
  const rischi = ((rs.totale ? rs.valutati / rs.totale : 0) + (fs.fornitori ? fs.valutati / fs.fornitori : 0)) / 2;

  const pol = q.politica;
  const contenuti = new Set(pol.contenuti).size;
  const partePolitica =
    (pol.testo.trim().length > TESTO_POLITICA_MINIMO ? 0.5 : 0) + (q.contenutiPolitica ? (contenuti / q.contenutiPolitica) * 0.5 : 0);
  const politica =
    (partePolitica +
      Math.min(1, q.obiettivi.filter((o) => o.obiettivo.trim()).length / OBIETTIVI_ATTESI) +
      Math.min(1, q.attivita.filter((x) => x.attivita.trim()).length / ATTIVITA_ATTESE)) /
    3;

  const m = q.misure[anno] ?? {};
  const indicatori = q.indicatori.length ? q.indicatori.filter((k) => typeof m[k] === "number").length / q.indicatori.length : 0;

  // Un registro conta se ha almeno una voce nell'esercizio, qualunque essa sia: un audit
  // pianificato conta come registrazione, come nel prototipo. Che sia stato SVOLTO lo
  // dicono i segnali e la verifica.
  const r = q.registri;
  const registri = CHIAVI_REGISTRI.filter((k) => (r[k] as readonly { data: string | null }[]).some((x) => annoDi(x.data) === anno)).length / CHIAVI_REGISTRI.length;

  const parti7 = [organizzazione, contesto, conf, rischi, politica, indicatori, registri];
  const complessivo = parti7.reduce((a, b) => a + b, 0) / parti7.length;
  return {
    organizzazione,
    contesto,
    conformita: conf,
    rischi,
    politica,
    indicatori,
    registri,
    complessivo,
    percentuale: Math.round(complessivo * 100),
  };
}
