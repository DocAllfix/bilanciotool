import type { Dimensione, LivelloRischio, SocioInAffari } from "./tipi";

// Il livello di rischio di un socio in affari, e la soglia su cui poggia l'intera norma.

const DIMENSIONI = ["paese", "pubbliciUfficiali", "natura", "valore"] as const;

/**
 * Media delle SOLE dimensioni valutate.
 *
 * ⚠️ Non si divide per quattro, e non e' una svista del prototipo: e' il
 * comportamento che va conservato. Chi ha valutato una sola dimensione a 4 ottiene 4
 * — cioe' Critico — e chi ne ha valutata una sola a 1 ottiene Basso. Dividere per il
 * numero totale darebbe 1,0 nel primo caso: un socio con un solo fattore gravissimo
 * risulterebbe a rischio Basso, e non gli si chiederebbe nemmeno la due diligence.
 *
 * Restituisce 0 quando non e' stata valutata nessuna dimensione.
 */
export function punteggio(s: SocioInAffari): number {
  const v = DIMENSIONI.map((k) => num(s[k])).filter((x) => x > 0);
  return v.length ? v.reduce((a, b) => a + b, 0) / v.length : 0;
}

/** `null` finche' non e' stata valutata almeno una dimensione. */
export function livello(s: SocioInAffari): LivelloRischio | null {
  const p = punteggio(s);
  if (!p) return null;
  let l: LivelloRischio = p < 1.8 ? "Basso" : p < 2.6 ? "Medio" : p < 3.4 ? "Alto" : "Critico";
  if (flagAcceso(s) && (l === "Basso" || l === "Medio")) l = "Alto";
  // I precedenti per corruzione non ammettono attenuazione: la media non conta piu'.
  if (s.precedenti && l !== "Critico") l = "Critico";
  return l;
}

/**
 * La soglia della norma: tutto cio' che non e' «Basso» e' sopra.
 *
 * Da qui discendono due diligence, comunicazione della politica, impegni, clausole,
 * verifica dei controlli e formazione. Un socio senza livello determinato NON e'
 * sopra soglia: non gli si imputano obblighi che nessuno ha ancora stabilito.
 */
export function superiore(s: SocioInAffari): boolean {
  const l = livello(s);
  return l !== null && l !== "Basso";
}

/** Livello di approfondimento della due diligence: 1 semplificata, 3 rafforzata. */
export function livelloDueDiligence(s: SocioInAffari): 1 | 2 | 3 {
  const l = livello(s);
  return l === "Critico" || l === "Alto" ? 3 : l === "Medio" ? 2 : 1;
}

/** Ogni quanti mesi la due diligence va rinnovata. 24 quando il livello non c'e'. */
export function frequenzaDueDiligence(s: SocioInAffari): number {
  const l = livello(s);
  if (l === "Critico" || l === "Alto") return 12;
  if (l === "Medio") return 24;
  if (l === "Basso") return 36;
  return 24;
}

/**
 * Se una data e' piu' vecchia di `mesi`.
 *
 * ⚠️ Una data ASSENTE e' scaduta, non «non ancora scaduta»: un adempimento che
 * nessuno ha registrato non puo' contare come valido.
 *
 * `setMonth` trabocca a fine mese (31 gennaio + 1 mese = 3 marzo). Qui la
 * conseguenza e' un promemoria di rinnovo spostato di due giorni, non un termine
 * perentorio, e si conserva il comportamento del prototipo.
 */
export function scaduta(data: string | null, mesi: number, oggi: Date): boolean {
  if (!data) return true;
  const d = new Date(data);
  if (Number.isNaN(d.getTime())) return true;
  d.setMonth(d.getMonth() + mesi);
  return d < oggi;
}

function flagAcceso(s: SocioInAffari): boolean {
  return (
    s.remunerazioneSuccesso ||
    s.impostoDalCliente ||
    s.titolaritaOpaca ||
    s.precedenti ||
    s.legamiPubblici ||
    s.pagamentiATerzi
  );
}

function num(x: Dimensione): number {
  return typeof x === "number" && Number.isFinite(x) ? x : 0;
}
