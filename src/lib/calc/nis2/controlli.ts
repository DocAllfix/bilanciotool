// I 68 CONTROLLI DEL SISTEMA DI GESTIONE NIS2, e la regola meno ovvia del modulo.
//
// ⚠️ UN CONTROLLO «ATTUATO» LA CUI VERIFICA E' SCADUTA NON E' ATTUATO.
//
// Ogni controllo porta una frequenza di verifica in giorni. Dichiararlo attuato una volta
// e non guardarlo mai piu' e' esattamente il modo in cui un sistema di gestione smette di
// esistere restando verde sulla carta — e un'ispezione ACN se ne accorge in dieci minuti,
// chiedendo l'ultima evidenza. Qui lo stato EFFETTIVO torna «da verificare» quando la
// scadenza e' passata: e' l'unica regola del lotto che un lettore distratto toglierebbe
// credendo di semplificare, ed e' scritta qui perche' non venga tolta.
//
// ⚠️ E qui NON divergiamo dal prototipo sul peso di cio' che non e' stato toccato: `pcAtt`
// conta gia' a zero i controlli senza stato, ed e' giusto. Nel prototipo convivono due
// motori che rispondono in modo opposto alla stessa domanda — quello dei requisiti media
// sui soli valutati, questo no. Si conserva quello giusto e si corregge l'altro, invece
// di allinearli al peggiore per «coerenza».

import { piuGiorni } from "@/lib/calc/segnalazioni/termini";

/** Gli stati che una persona puo' dichiarare. Enum chiuso: mai testo libero. */
export const STATI_CONTROLLO = ["non_attuato", "in_attuazione", "attuato", "non_applicabile"] as const;
export type StatoControllo = (typeof STATI_CONTROLLO)[number];

/**
 * Lo stato EFFETTIVO aggiunge un valore che nessuno dichiara.
 *
 * «Da verificare» non e' una scelta dell'utente: e' cio' che il tempo fa a un «attuato»
 * lasciato solo. Tenerlo fuori da `StatoControllo` e' deliberato — se fosse selezionabile,
 * qualcuno lo sceglierebbe a mano e il meccanismo smetterebbe di significare qualcosa.
 */
export type StatoEffettivo = StatoControllo | "da_verificare" | "vuoto";

export type Controllo = {
  id: string;
  capitolo: string;
  critico: boolean;
  /** Ogni quanti giorni il controllo va riverificato. */
  frequenza: number;
  /** Quello dichiarato. `"vuoto"` finche' nessuno l'ha guardato. */
  stato: StatoControllo | "vuoto";
  /** L'ultima verifica registrata, in `YYYY-MM-DD`. */
  ultimaVerifica: string | null;
};

/**
 * Quando va riverificato.
 *
 * ⚠️ Passa da `piuGiorni` di `segnalazioni/termini.ts`, che valida la data ricomponendola:
 * `new Date("2026-02-31")` non solleva, scivola al 3 marzo, e da una verifica periodica
 * non deve uscire una scadenza che nessuno ha scritto.
 */
export function prossimaVerifica(c: { ultimaVerifica: string | null; frequenza: number }): string | null {
  if (!c.ultimaVerifica) return null;
  return piuGiorni(c.ultimaVerifica, c.frequenza);
}

export function statoEffettivo(c: Controllo, adesso = new Date()): StatoEffettivo {
  if (c.stato !== "attuato") return c.stato;
  const prossima = prossimaVerifica(c);
  // ⚠️ Attuato senza NESSUNA verifica registrata e' la stessa cosa di una verifica
  // scaduta: nessuno ha guardato. Trattarlo come «attuato» premierebbe chi non registra.
  if (!prossima) return "da_verificare";
  return new Date(prossima + "T23:59:59.999Z").getTime() < adesso.getTime() ? "da_verificare" : "attuato";
}

/** Quanto vale un controllo nella percentuale di attuazione. */
function peso(s: StatoEffettivo): number {
  if (s === "attuato") return 1;
  if (s === "in_attuazione" || s === "da_verificare") return 0.5;
  return 0;
}

/**
 * La percentuale di attuazione, 0÷100.
 *
 * ⚠️ Un controllo mai toccato pesa ZERO e resta nel denominatore. Mediare sui soli
 * controlli con uno stato farebbe salire l'indice man mano che si saltano quelli
 * difficili, che e' il contrario del vero. «Non applicabile» esce invece dal denominatore:
 * e' una decisione, non un'omissione.
 */
export function attuazione(controlli: readonly Controllo[], adesso = new Date()): number {
  const applicabili = controlli.filter((c) => c.stato !== "non_applicabile");
  if (!applicabili.length) return 0;
  const somma = applicabili.reduce((a, c) => a + peso(statoEffettivo(c, adesso)), 0);
  return Math.round((somma / applicabili.length) * 100);
}

export type Fase = { id: string; aree: readonly string[] };
export type EsitoFase = { id: string; percentuale: number; applicabili: number };

/**
 * L'avanzamento di una fase della roadmap: i controlli dei capi che le appartengono.
 *
 * ⚠️ Le cinque fasi coprono i dodici capi una volta ciascuno. Un capo in due fasi
 * conterebbe due volte, uno in nessuna sparirebbe dalla roadmap senza che niente lo dica:
 * il test lo pretende sul catalogo, perche' e' il tipo di svista che una riga di seme
 * introduce e nessuna schermata mostra.
 */
export function perFase(fase: Fase, controlli: readonly Controllo[], adesso = new Date()): EsitoFase {
  const suoi = controlli.filter((c) => fase.aree.includes(c.capitolo));
  return {
    id: fase.id,
    percentuale: attuazione(suoi, adesso),
    applicabili: suoi.filter((c) => c.stato !== "non_applicabile").length,
  };
}
