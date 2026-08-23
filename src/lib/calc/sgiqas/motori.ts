// I tre motori del Sistema di gestione integrato Qualità · Ambiente · Sicurezza.
//
// Tre domande diverse, e per questo tre funzioni invece di una scala sola: un aspetto
// ambientale si giudica su tre fattori più tre fatti dichiarati, un rischio SSL su due
// fattori, un indicatore sul confronto con un target che qualcuno ha fissato.
//
// Il golden viene da `scripts/golden-sgiqas.mjs`, che ESEGUE le funzioni del prototipo:
// i tre scostamenti qui sotto sono misurati, non supposti.

// ─── Aspetti ambientali ──────────────────────────────────────────────────────

/** Oltre questo punteggio l'aspetto è significativo. Del prototipo, si conserva. */
export const SOGLIA_ASPETTI = 24;

export type Aspetto = {
  /** 1 ÷ 4, oppure `null` se non ancora valutato. */
  gravita: number | null;
  frequenza: number | null;
  sensibilita: number | null;
  /** Esiste una prescrizione legale applicabile e non presidiata. */
  prescrizioneLegale: boolean;
  /** L'aspetto raggiunge la popolazione esposta. */
  espostoPopolazione: boolean;
  /** Ci sono stati superamenti dei limiti. */
  superamentoLimiti: boolean;
  condizione: string;
};

export type EsitoAspetto = "Significativo" | "Non significativo";

/** Gravità × frequenza × sensibilità. Zero finché uno dei tre manca. */
export function punteggioAspetto(a: Aspetto): number {
  if (!a.gravita || !a.frequenza || !a.sensibilita) return 0;
  return a.gravita * a.frequenza * a.sensibilita;
}

/**
 * Se l'aspetto è significativo, oppure `null` finché non lo si può dire.
 *
 * ⚠️ SCOSTAMENTO VOLUTO, e l'ordine è tutto. Nel prototipo `aspSign` esce con la stringa
 * vuota **prima** di guardare le tre condizioni, quando il punteggio è zero. Conseguenza
 * misurata: un aspetto con una **prescrizione legale non presidiata** ma con gravità,
 * frequenza e sensibilità non ancora compilate NON risulta significativo — quindi non
 * entra nel conteggio e non accende l'allerta «aspetti significativi senza controllo
 * operativo», proprio nel momento in cui servirebbe di più.
 *
 * Le tre condizioni sono **fatti dichiarati**, non gradini di una scala: che esista una
 * prescrizione di legge non dipende dal fatto che qualcuno abbia finito di compilare la
 * scala. Qui si guardano per prime.
 *
 * ⚠️ E `null` è un terzo stato vero. Dire «non significativo» di un aspetto che nessuno
 * ha ancora valutato è una dichiarazione, e in un'analisi ambientale firmata dal datore
 * di lavoro è la dichiarazione sbagliata.
 */
export function significativoAspetto(a: Aspetto): EsitoAspetto | null {
  if (a.prescrizioneLegale || a.espostoPopolazione || a.superamentoLimiti) return "Significativo";
  if (a.condizione === "Emergenza" && (a.gravita ?? 0) >= 3) return "Significativo";

  const p = punteggioAspetto(a);
  if (!p) return null;
  return p >= SOGLIA_ASPETTI ? "Significativo" : "Non significativo";
}

// ─── Rischi per la salute e la sicurezza ─────────────────────────────────────

export type LivelloRischio = "Basso" | "Medio" | "Alto" | "Critico";

/**
 * Probabilità × gravità, con le soglie 3 · 7 · 11.
 *
 * Sono le stesse del Modello 231, e si conservano: due prodotti di due scale 1÷4 non
 * hanno ragione di essere letti in modo diverso a seconda del modulo che li mostra.
 * `null` quando manca uno dei due — un rischio non misurato non è un rischio basso.
 */
export function livelloRischio(probabilita: number | null, gravita: number | null): LivelloRischio | null {
  if (!probabilita || !gravita) return null;
  const v = probabilita * gravita;
  return v <= 3 ? "Basso" : v <= 7 ? "Medio" : v <= 11 ? "Alto" : "Critico";
}

// ─── Indicatori ──────────────────────────────────────────────────────────────

export type Indicatore = {
  /** Il valore da raggiungere, oppure `null` se nessuno l'ha fissato. */
  target: number | null;
  /** Il valore oltre il quale si è fuori controllo. */
  soglia: number | null;
  /** true quando «più alto è meglio». */
  versoPositivo: boolean;
};

/** `ok` a target · `mid` sotto il target ma dentro la soglia · `no` fuori · `nd` ignoto. */
export type StatoIndicatore = "ok" | "mid" | "no" | "nd";

/**
 * Lo stato di un indicatore rispetto a target e soglia.
 *
 * ⚠️ SCOSTAMENTO VOLUTO, ed è il difetto più insidioso del prototipo: `Number("")` vale
 * 0 e `isFinite(0)` è vero, quindi **il target vuoto veniva letto come target zero**.
 *
 * Misurato eseguendo il prototipo, lo stesso dato mancante produce due verdetti opposti:
 * un indicatore «più è meglio» senza target risulta **a target** (qualunque valore è
 * ≥ 0), uno «meno è meglio» risulta **fuori** (qualunque valore è > 0). Nessuno dei due
 * è un giudizio che qualcuno abbia espresso — e nella stessa schermata quegli indicatori
 * comparivano anche nell'elenco «senza target definito»: il cruscotto affermava due cose
 * incompatibili.
 *
 * ⚠️ Dallo stesso difetto discendeva un secondo effetto: il ramo della **sola soglia**
 * era irraggiungibile, perché il controllo entrava sempre in quello del target. Qui c'è,
 * e giudica.
 */
export function statoIndicatore(i: Indicatore, valore: number | null): StatoIndicatore {
  if (valore === null || !Number.isFinite(valore)) return "nd";

  const oltre = (a: number, b: number) => (i.versoPositivo ? a >= b : a <= b);

  if (i.target !== null) {
    if (oltre(valore, i.target)) return "ok";
    if (i.soglia !== null && !oltre(valore, i.soglia)) return "no";
    return "mid";
  }
  if (i.soglia !== null) return oltre(valore, i.soglia) ? "ok" : "no";
  return "nd";
}
