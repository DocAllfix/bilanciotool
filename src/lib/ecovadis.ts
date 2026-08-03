// Riconoscimento EcoVadis di Evalis Srl.
//
// I fatti stanno QUI e non sparsi nelle pagine: il badge scade, e quando scade
// vanno aggiornati insieme il file, la data e le cifre. Un test puro
// (`ecovadis-pure.test.ts`) diventa rosso alla scadenza, così nessuno se ne
// accorge dal sito.
//
// ATTENZIONE — che cosa attesta e che cosa no: la valutazione riguarda
// **Evalis Srl come organizzazione**. Non certifica EvalisDeck, né i documenti
// che il prodotto genera, né le aziende che lo usano. Il pubblico di questa
// landing sono consulenti ESG: sanno leggere un badge EcoVadis, e una
// formulazione ambigua costa più di quanto renda.

export const ECOVADIS = {
  /** Azienda valutata: non è il prodotto. */
  azienda: "Evalis Srl",
  medaglia: "Platinum",
  /** Percentile della medaglia, come riportato sul badge. */
  fascia: "Top 1%",
  punteggio: 89,
  percentile: 99,
  /** Mese della valutazione, come stampato sul badge stesso. */
  mese: "giugno 2026",
  /** Emissione e scadenza della scorecard, in ISO. */
  emessoIl: "2026-06-25",
  validoFino: "2027-06-25",
  /** Il file è quello consegnato da EcoVadis, non ritoccato: né ricolorato né
   *  ritagliato. È una condizione d'uso, oltre che la regola di casa sui marchi. */
  badge: "/brand/ecovadis/ecovadis-platinum-2026.svg",
} as const;

/** Alt del badge: descrive il contenuto, non il file. */
export const ECOVADIS_ALT =
  `Medaglia EcoVadis ${ECOVADIS.medaglia} ${ECOVADIS.fascia} — valutazione di sostenibilità di ${ECOVADIS.azienda}, ${ECOVADIS.mese}`;

/** true finché la scorecard è valida. Il sito non deve mostrare un
 *  riconoscimento scaduto: sarebbe la cosa peggiore da fare proprio qui. */
export function ecovadisValido(oggi: Date = new Date()): boolean {
  return oggi <= new Date(`${ECOVADIS.validoFino}T23:59:59Z`);
}

/** Giorni che mancano alla scadenza (negativi se già passata). */
export function giorniAllaScadenza(oggi: Date = new Date()): number {
  const scadenza = new Date(`${ECOVADIS.validoFino}T23:59:59Z`);
  return Math.ceil((scadenza.getTime() - oggi.getTime()) / 86_400_000);
}
