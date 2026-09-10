// GLI INDICATORI DEL SISTEMA DI GESTIONE NIS2: 19 di base, 8 ambiti.
//
// ⚠️ IL VERSO DI MIGLIORAMENTO E' IL CUORE, e senza di lui il resto e' rumore. Per il
// «tasso di clic nelle simulazioni di phishing» scendere e' un risultato; per la
// «copertura MFA sugli ambiti obbligatori» e' un disastro. Lo stesso numero, la stessa
// variazione, due giudizi opposti — ed e' la stessa regola gia' scritta per lo storico
// delle aziende: ogni serie di dati dichiara il proprio verso.
//
// ⚠️ E UN TARGET ASSENTE NON E' UN TARGET A ZERO. In SGI QAS il prototipo faceva
// `Number("") === 0`, e un indicatore senza target risultava conforme qualunque valore
// avesse: il ramo della soglia era irraggiungibile. Il prototipo NIS2 lo fa gia' giusto
// (`isFinite`), e la regola si conserva — non si allinea al modulo vicino per somiglianza.

import { giornoItaliano } from "@/lib/calc/comune/tempo-italia";

export const VERSI = ["crescente", "decrescente"] as const;
export type Verso = (typeof VERSI)[number];

export const FREQUENZE = ["mensile", "trimestrale", "semestrale", "annuale"] as const;
export type Frequenza = (typeof FREQUENZE)[number];

export type Rilevazione = { periodo: string; valore: number | null };

export type Indicatore = {
  target: number | null;
  soglia: number | null;
  verso: Verso;
  rilevazioni: readonly Rilevazione[];
};

export type StatoIndicatore = "a_target" | "in_attenzione" | "fuori_target" | "non_rilevato";

/** Il segno del merito: +1 se salire e' bene, -1 se e' male. */
const segno = (i: Indicatore) => (i.verso === "decrescente" ? -1 : 1);

/** Le rilevazioni con un valore, in ordine di PERIODO. */
function ordinate(i: Indicatore): Rilevazione[] {
  return i.rilevazioni
    .filter((r) => r.valore != null && Number.isFinite(r.valore))
    .slice()
    .sort((a, b) => String(a.periodo).localeCompare(String(b.periodo)));
}

/**
 * L'ultima rilevazione, per PERIODO e non per ordine di inserimento.
 *
 * ⚠️ Non sono la stessa cosa: chi recupera a marzo il dato di gennaio lo inserisce per
 * ultimo, e ordinando per inserimento l'indicatore mostrerebbe gennaio come valore
 * corrente — con un andamento all'ingiu' che non e' successo.
 */
export function ultimaRilevazione(i: Indicatore): Rilevazione | null {
  const r = ordinate(i);
  return r.length ? r[r.length - 1] : null;
}

function penultima(i: Indicatore): Rilevazione | null {
  const r = ordinate(i);
  return r.length > 1 ? r[r.length - 2] : null;
}

export function statoIndicatore(i: Indicatore): StatoIndicatore {
  const u = ultimaRilevazione(i);
  if (!u) return "non_rilevato";
  const v = Number(u.valore);
  const migliore = (a: number, b: number) => (segno(i) > 0 ? a >= b : a <= b);

  if (i.target != null && Number.isFinite(i.target)) {
    if (migliore(v, i.target)) return "a_target";
    if (i.soglia != null && Number.isFinite(i.soglia) && !migliore(v, i.soglia)) return "fuori_target";
    return "in_attenzione";
  }
  // ⚠️ Senza target decide la soglia. Non «a target per finta»: un indicatore senza
  // bersaglio non puo' averlo raggiunto.
  if (i.soglia != null && Number.isFinite(i.soglia)) {
    return migliore(v, i.soglia) ? "a_target" : "fuori_target";
  }
  return "non_rilevato";
}

/** +1 se l'ultima rilevazione migliora sulla precedente, -1 se peggiora, 0 altrimenti. */
export function andamento(i: Indicatore): -1 | 0 | 1 {
  const u = ultimaRilevazione(i);
  const p = penultima(i);
  if (!u || !p) return 0;
  const d = Number(u.valore) - Number(p.valore);
  if (!Number.isFinite(d) || d === 0) return 0;
  return ((d > 0 ? 1 : -1) * segno(i)) as -1 | 1;
}

/**
 * Lo scostamento dal target in percentuale, col segno del MERITO.
 *
 * Positivo quando si sta meglio del target, negativo quando si sta peggio — anche per un
 * indicatore da far scendere, dove il valore grezzo si muove al contrario.
 *
 * ⚠️ `null` senza target, e non zero: zero direbbe «esattamente a target», che e' il
 * contrario di «un target non c'e'». E un target a zero non si usa come divisore.
 */
export function scostamento(i: Indicatore): number | null {
  const u = ultimaRilevazione(i);
  if (!u || i.target == null || !Number.isFinite(i.target) || i.target === 0) return null;
  const v = Number(u.valore);
  if (!Number.isFinite(v)) return null;
  return Math.round(((v - i.target) / Math.abs(i.target)) * 100) * segno(i);
}

/**
 * Il periodo in cui si sta rilevando, secondo la frequenza dichiarata.
 *
 * ⚠️ Il periodo ITALIANO, non quello del fuso del processo. Alle 00:30 del primo luglio a
 * Roma, in UTC e' ancora il 30 giugno: su Vercel il semestre proposto sarebbe il primo
 * invece del secondo, e la rilevazione finirebbe nel periodo sbagliato senza che niente
 * lo dica. E' lo stesso difetto gia' corretto sull'agenda.
 */
export function periodoCorrente(f: Frequenza, adesso = new Date()): string {
  const [anno, mese] = giornoItaliano(adesso).split("-");
  const m = Number(mese);
  if (f === "annuale") return anno;
  if (f === "semestrale") return `${anno}-S${m <= 6 ? 1 : 2}`;
  if (f === "trimestrale") return `${anno}-T${Math.floor((m - 1) / 3) + 1}`;
  return `${anno}-${mese}`;
}
