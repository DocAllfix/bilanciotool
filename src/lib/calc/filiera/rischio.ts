// Il motore della Due diligence di filiera: due assi ortogonali.
//
// Il rischio INERENTE dipende dal contesto — paese, settore, prodotto, modello di
// approvvigionamento — e il partner non può cambiarlo. La MATURITÀ dipende da quello che
// il partner ha messo in piedi. L'incrocio dei due dà il rischio residuo, e dal residuo
// discende ogni quanto lo si verifica.
//
// Il golden viene da `scripts/golden-filiera.mjs`, che esegue il prototipo.

export type Partner = {
  /** 1 ÷ 4, oppure 0 se non valutata. */
  paese: number;
  settore: number;
  prodotto: number;
  modello: number;
  /** Le sette aree di maturità, per chiave. Assenti o 0 = non valutate. */
  aree: Record<string, number>;
  /** Almeno un fattore aggravante dichiarato. */
  flag: boolean;
};

export type CategoriaInerente = "Bassa" | "Media" | "Alta" | "Critica";
export type RischioResiduo = "Basso" | "Medio" | "Alto" | "Critico";

/**
 * Le tre aree su cui la metodologia non ammette silenzi.
 *
 * Lavoro minorile, lavoro forzato, salute e sicurezza: sono i tre casi in cui un danno è
 * irrimediabile, e per questo governano il tetto della maturità.
 */
export const AREE_CRITICHE = ["min", "forz", "hs"] as const;

/** Ogni quanto si verifica un partner, in mesi, secondo il rischio residuo. */
export const MESI_VERIFICA: Record<RischioResiduo, number> = {
  Critico: 12,
  Alto: 24,
  Medio: 36,
  Basso: 48,
};

/** L'incrocio inerente × maturità. Righe identiche in alto: è voluto, come nel 231. */
const MATRICE: Record<CategoriaInerente, RischioResiduo[]> = {
  Critica: ["Critico", "Critico", "Alto", "Alto"],
  Alta: ["Critico", "Alto", "Alto", "Medio"],
  Media: ["Alto", "Medio", "Medio", "Basso"],
  Bassa: ["Medio", "Medio", "Basso", "Basso"],
};

/** La media delle sole dimensioni compilate. Zero se nessuna. */
export function punteggioInerente(p: Partner): number {
  const v = [p.paese, p.settore, p.prodotto, p.modello].filter((x) => x > 0);
  return v.length ? v.reduce((a, b) => a + b, 0) / v.length : 0;
}

/** La categoria di rischio inerente, oppure `null` se nessuna dimensione è compilata. */
export function categoriaInerente(p: Partner): CategoriaInerente | null {
  const s = punteggioInerente(p);
  if (!s) return null;
  const base: CategoriaInerente = s < 1.8 ? "Bassa" : s < 2.6 ? "Media" : s < 3.4 ? "Alta" : "Critica";
  // Un fattore aggravante dichiarato non lascia scendere sotto «Alta».
  return p.flag && (base === "Bassa" || base === "Media") ? "Alta" : base;
}

/**
 * La maturità del partner: media delle aree valutate, col tetto delle aree critiche.
 *
 * ⚠️ SCOSTAMENTO VOLUTO, ed è il difetto più grave dei sei prototipi.
 *
 * Il tetto è `min(media, minimo fra le aree critiche + 0,9)`: serve a impedire che una
 * governance impeccabile compensi una lacuna sul lavoro minorile. Nel prototipo, però,
 * quando **nessuna** area critica è valutata `minCritica` vale **4** — il massimo — e il
 * tetto sparisce.
 *
 * Misurato eseguendo il prototipo: un partner che ha risposto a **una sola domanda di
 * governance**, e a nessuna delle tre aree critiche, ottiene maturità 4,0 e **lo stesso
 * identico rischio residuo e la stessa frequenza di verifica** di un partner valutato su
 * tutte e sette le aree al massimo. Non aver detto niente su lavoro minorile, lavoro
 * forzato e sicurezza veniva premiato come averlo detto bene.
 *
 * Qui il tetto parte dal valore più BASSO quando le aree critiche mancano: il silenzio
 * non è una prova di maturità. Chi le valuta davvero mantiene la maturità alta — la
 * correzione colpisce l'omissione, non la valutazione.
 */
export function maturita(p: Partner): number {
  const valutate = Object.values(p.aree).filter((x) => x > 0);
  if (!valutate.length) return 0;
  const media = valutate.reduce((a, b) => a + b, 0) / valutate.length;

  const critiche = AREE_CRITICHE.map((k) => p.aree[k] ?? 0).filter((x) => x > 0);
  // ⚠️ Il `1` è il punto della correzione: nel prototipo qui c'era `4`.
  const minCritica = critiche.length ? Math.min(...critiche) : 1;
  return Math.min(media, minCritica + 0.9);
}

/** Il rischio residuo: l'incrocio della categoria inerente con la maturità. */
export function rischioResiduo(p: Partner): RischioResiduo | null {
  const ci = categoriaInerente(p);
  if (!ci) return null;
  const m = maturita(p);
  // Maturità zero — nessuna area valutata — cade sulla prima colonna, la peggiore.
  if (!m) return MATRICE[ci][0];
  return MATRICE[ci][Math.max(0, Math.min(3, Math.round(m) - 1))];
}

/** Ogni quanti mesi va verificato questo partner, oppure `null` se il residuo non c'è. */
export function frequenzaVerifica(p: Partner): number | null {
  const r = rischioResiduo(p);
  return r ? MESI_VERIFICA[r] : null;
}
