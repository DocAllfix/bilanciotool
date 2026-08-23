// Ammissibilità della segnalazione e rischio di ritorsione (D.Lgs. 24/2023).
//
// Due motori piccoli e pieni di casi limite: è lì che una reimplementazione
// «ragionevole» diverge, ed è lì che le conseguenze ricadono su una persona.

// ─── Ammissibilità (art. 1 · art. 2 · art. 3) ────────────────────────────────

/** I cinque elementi, nell'ordine del prototipo. `v4` ha un trattamento a parte. */
export const ELEMENTI_AMMISSIBILITA = [
  { chiave: "oggetto", testo: "La violazione rientra nell'ambito oggettivo previsto dalla legge" },
  { chiave: "legittimato", testo: "Il segnalante rientra tra i soggetti legittimati" },
  { chiave: "contesto", testo: "I fatti sono venuti a conoscenza nel contesto lavorativo" },
  { chiave: "elementi", testo: "La segnalazione è fondata su elementi di fatto precisi e concordanti" },
  { chiave: "nonPersonale", testo: "Non si tratta di contestazione esclusivamente personale del rapporto di lavoro" },
] as const;

export type ChiaveAmmissibilita = (typeof ELEMENTI_AMMISSIBILITA)[number]["chiave"];
export type EsitoAmmissibilita = "Ammissibile" | "Da integrare" | "Inammissibile";

/**
 * L'esito dell'ammissibilità, oppure `null` finché non sono stati valutati tutti e
 * cinque gli elementi.
 *
 * ⚠️ È una porta AND a cinque ingressi con UNA sola eccezione, e l'eccezione è il punto:
 * se manca **soltanto** l'elemento «fatti precisi e concordanti», l'esito è **«Da
 * integrare»** e non «Inammissibile». La differenza non è di sfumatura — una
 * segnalazione da integrare si può completare, una inammissibile si archivia, e
 * archiviare per difetto di elementi qualcosa che si poteva chiarire toglie la tutela a
 * chi si è esposto.
 *
 * ⚠️ E il `null` è un terzo stato vero, non un «no» travestito. Il prototipo qui
 * restituiva la stringa vuota, che nei confronti si comporta come un falso: chi non ha
 * ancora valutato risultava indistinguibile da chi ha valutato negativamente.
 */
export function ammissibilita(
  risposte: Partial<Record<ChiaveAmmissibilita, string | null>>,
): EsitoAmmissibilita | null {
  const valori = ELEMENTI_AMMISSIBILITA.map((e) => risposte[e.chiave] ?? "");
  if (valori.some((v) => !v)) return null;
  if (valori.every((v) => v === "Sì")) return "Ammissibile";
  const soloElementiMancanti =
    risposte.elementi === "No" &&
    ELEMENTI_AMMISSIBILITA.filter((e) => e.chiave !== "elementi").every((e) => risposte[e.chiave] === "Sì");
  return soloElementiMancanti ? "Da integrare" : "Inammissibile";
}

// ─── Rischio di ritorsione (art. 17) ─────────────────────────────────────────

/** I sei fattori e il loro peso. Il 3 è dei precedenti: pesa di più perché è un fatto. */
export const FATTORI_RITORSIONE = [
  { chiave: "identitaConoscibile", testo: "Identità del segnalante conoscibile all'interno", peso: 2 },
  { chiave: "sovraordinato", testo: "Persona coinvolta gerarchicamente sovraordinata al segnalante", peso: 2 },
  { chiave: "contestoRistretto", testo: "Contesto ristretto, fatti riferibili a poche persone", peso: 2 },
  { chiave: "precedenti", testo: "Precedenti di ritorsione nell'organizzazione", peso: 3 },
  { chiave: "rapportoPrecario", testo: "Rapporto di lavoro precario o in scadenza", peso: 2 },
  { chiave: "giaEsposto", testo: "Segnalante già esposto per segnalazioni precedenti", peso: 2 },
] as const;

export type ChiaveRitorsione = (typeof FATTORI_RITORSIONE)[number]["chiave"];
export type LivelloRitorsione = "Basso" | "Medio" | "Alto";

/** Il punteggio: somma dei pesi dei soli fattori a «Sì». Massimo 13. */
export function punteggioRitorsione(r: Partial<Record<ChiaveRitorsione, string | null>>): number {
  return FATTORI_RITORSIONE.reduce((a, f) => a + (r[f.chiave] === "Sì" ? f.peso : 0), 0);
}

/**
 * Il livello di rischio di ritorsione, oppure `null` se non è stato valutato.
 *
 * ⚠️ SCOSTAMENTO VOLUTO. Il prototipo considerava «valutato» un fascicolo in cui anche
 * UNO solo dei sei fattori avesse un valore qualsiasi — compreso «No». Rispondere «no»
 * alla prima domanda e lasciare le altre cinque in bianco produceva **«Basso»**, cioè un
 * rischio dichiarato basso che nessuno aveva misurato. Qui servono tutti e sei: finché
 * ne manca uno il livello è `null`, e un livello che non c'è non può rassicurare.
 *
 * ⚠️ Il TETTO per la segnalazione anonima con identità non conoscibile si conserva, ed è
 * giusto: se non si può risalire alla persona, la ritorsione ha un limite materiale. Il
 * massimo è «Medio», con soglia unica a 6 — quindi «Alto» è irraggiungibile per
 * costruzione, e non è una svista.
 *
 * ⚠️ Il livello «Critico» del prototipo NON esiste qui. Era dichiarato nella tabella dei
 * colori e la funzione non lo restituiva mai: un gradino che nessuno può raggiungere
 * fa credere che la scala arrivi più in alto di dove arriva.
 */
export function livelloRitorsione(
  r: Partial<Record<ChiaveRitorsione, string | null>>,
  anonima: boolean,
): LivelloRitorsione | null {
  const mancanti = FATTORI_RITORSIONE.filter((f) => !r[f.chiave]);
  if (mancanti.length) return null;

  const p = punteggioRitorsione(r);
  if (anonima && r.identitaConoscibile !== "Sì") return p >= 6 ? "Medio" : "Basso";
  return p >= 8 ? "Alto" : p >= 4 ? "Medio" : "Basso";
}

/** Il monitoraggio è dovuto da «Medio» in su. `null` non lo attiva: non si sa ancora. */
export function monitoraggioDovuto(
  r: Partial<Record<ChiaveRitorsione, string | null>>,
  anonima: boolean,
): boolean {
  const l = livelloRitorsione(r, anonima);
  return l === "Medio" || l === "Alto";
}

// ─── Contattabilità ──────────────────────────────────────────────────────────

/**
 * Se al segnalante si può dare avviso e riscontro.
 *
 * ⚠️ È ASIMMETRICA di proposito, e si conserva: per la segnalazione **non anonima**
 * basta che il recapito non sia un «No» esplicito — chi si è identificato è
 * raggiungibile finché non dice il contrario. Per l'**anonima** serve invece un positivo:
 * un codice di riscontro, oppure un recapito dichiarato. Un anonimo senza né l'uno né
 * l'altro non è raggiungibile, e i termini di legge non gli si applicano.
 */
export function contattabile(s: {
  anonima: boolean;
  recapito: string | null;
  codice: string | null;
}): boolean {
  if (!s.anonima) return s.recapito !== "No";
  return !!s.codice || s.recapito === "Sì";
}
