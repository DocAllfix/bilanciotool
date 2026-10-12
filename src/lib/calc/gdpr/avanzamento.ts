// L'avanzamento del percorso: quanto di ciascuna parte è compilato, 0 ÷ 1.
//
// È lo `stato` del prototipo, con le stesse sette misure e la stessa media. Misura la
// COMPILAZIONE, non la conformità: un percorso al 100% può essere pieno di non conformità,
// purché valutate e documentate. L'indice di conformità sta altrove.

import { conformita } from "./conformita";
import { statoFornitori } from "./fornitori";
import { obbligoDpo, statiDelCatalogo, type Quadro } from "./quadro";
import { statoRegistri } from "./registri";
import { statoRegistro } from "./registro";
import { statoRischi } from "./rischio";
import { annoDi } from "./termini";

const CAMPI_PROFILO = ["forma", "sede", "settore", "ateco", "dipendenti", "legale", "referente", "contatto", "amministratori"] as const;

/** Il testo della politica conta se supera questa lunghezza: sotto è un abbozzo. */
const TESTO_POLITICA_MINIMO = 200;
/** Sei documenti in inventario fanno un sistema; meno, una bozza. */
const DOCUMENTI_ATTESI = 6;
/** Otto attività fanno un piano annuale. */
const ATTIVITA_ATTESE = 8;

export type Avanzamento = {
  organizzazione: number;
  trattamenti: number;
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

export function avanzamento(q: Quadro, anno: number, oggi: string, adesso: Date): Avanzamento {
  const p = q.profilo;
  const d = obbligoDpo(p);
  const pienoProfilo = CAMPI_PROFILO.filter((k) => String(p[k] ?? "").trim()).length;
  const organizzazione = (pienoProfilo + (d.valutato ? (d.obbligatorio && !d.designato ? 1 : 2) : 0)) / (CAMPI_PROFILO.length + 2);

  const ts = statoRegistro(q.trattamenti, q.parametri);
  const trattamenti = ts.trattamenti ? ts.completezza * Math.min(1, ts.trattamenti / 3) : 0;

  const c = conformita(statiDelCatalogo(q));
  const conf = c.totale ? c.valutati / c.totale : 0;

  const rs = statoRischi(q.trattamenti, q.parametri);
  const fs = statoFornitori(q.fornitori);
  const rischi = ((rs.trattamenti ? rs.valutati / rs.trattamenti : 0) + (fs.fornitori ? fs.completi / fs.fornitori : 0)) / 2;

  const pol = q.politica;
  const contenuti = new Set(pol.contenuti).size;
  const partePolitica =
    (pol.testo.trim().length > TESTO_POLITICA_MINIMO ? 0.5 : 0) + (q.contenutiPolitica ? (contenuti / q.contenutiPolitica) * 0.5 : 0);
  const conOggetto = q.documenti.filter((x) => x.oggetto.trim());
  const adottati = conOggetto.filter((x) => x.stato === "Adottato").length;
  const parteDocumenti = conOggetto.length ? Math.min(1, conOggetto.length / DOCUMENTI_ATTESI) * (adottati / conOggetto.length) : 0;
  const partePiano = Math.min(1, q.attivita.filter((x) => x.attivita.trim()).length / ATTIVITA_ATTESE);
  const politica = (partePolitica + parteDocumenti + partePiano) / 3;

  const m = q.misure[anno] ?? {};
  const indicatori = q.indicatori.length ? q.indicatori.filter((k) => typeof m[k] === "number").length / q.indicatori.length : 0;

  // I registri dovuti nell'esercizio: formazione, verifiche, riesame, e gli amministratori
  // di sistema solo se ci sono. Le verifiche contano se SVOLTE: una pianificata non è fatta.
  const r = q.registri;
  const svolte = statoRegistri(r, anno, oggi, adesso).verifiche;
  const dovuti: boolean[] = [
    r.formazione.some((x) => annoDi(x.data) === anno),
    svolte > 0,
    r.riesami.some((x) => annoDi(x.data) === anno),
  ];
  if (p.amministratori === "Sì") dovuti.push(r.verificheAds.some((x) => annoDi(x.data) === anno));
  const registri = dovuti.filter(Boolean).length / dovuti.length;

  const parti = [organizzazione, trattamenti, conf, rischi, politica, indicatori, registri];
  const complessivo = parti.reduce((a, b) => a + b, 0) / parti.length;
  return {
    organizzazione,
    trattamenti,
    conformita: conf,
    rischi,
    politica,
    indicatori,
    registri,
    complessivo,
    percentuale: Math.round(complessivo * 100),
  };
}
