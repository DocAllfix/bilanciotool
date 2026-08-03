import { dec } from "@/lib/calc/shared/decimal";

// Avanzamento del percorso: una percentuale per ciascuno dei sei passi di
// contenuto, e la media come stato complessivo. Serve allo stepper e alla
// pagina di verifica; non entra mai nei calcoli del documento.

export type EnergyProgressInput = {
  /** Campi del profilo valorizzati sui sette attesi. */
  profiloCompilati: number;
  /** Vettori con una quantità inserita e, di questi, quanti hanno anche il costo. */
  vettoriValorizzati: number;
  vettoriConCosto: number;
  /** Esito della quadratura e metodo di determinazione dichiarato. */
  vettoriQuadrati: number;
  vettoriDaQuadrare: number;
  usiAttivi: number;
  usiConMetodo: number;
  /** Variabili di riferimento valorizzate sulle otto attese. */
  driverCompilati: number;
  /** Interventi con descrizione e risparmio quantificato. */
  interventiCompleti: number;
  /** Capitoli con un testo di sostanza. */
  capitoliScritti: number;
  capitoliTotali: number;
};

export type EnergyProgress = {
  s1: number; s2: number; s3: number; s4: number; s5: number; s6: number;
  totPct: number;
};

const PROFILO_ATTESI = 7;
const DRIVER_ATTESI = 8;
const INTERVENTI_ATTESI = 3;

const quota = (fatto: number, totale: number) => (totale > 0 ? Math.min(1, fatto / totale) : 0);

export function computeEnergyProgress(i: EnergyProgressInput): EnergyProgress {
  const s1 = quota(i.profiloCompilati, PROFILO_ATTESI);

  // Inserire i consumi vale metà del passo, indicarne il costo l'altra metà:
  // senza costo non si calcolano né il costo medio né il ritorno degli interventi.
  const s2 = i.vettoriValorizzati > 0 ? 0.5 + 0.5 * quota(i.vettoriConCosto, i.vettoriValorizzati) : 0;

  // La quadratura pesa più del metodo: finché i residui non rientrano, i pesi
  // degli usi finali non sono attendibili.
  const s3 =
    i.vettoriValorizzati > 0
      ? 0.65 * quota(i.vettoriQuadrati, i.vettoriDaQuadrare) + 0.35 * quota(i.usiConMetodo, i.usiAttivi)
      : 0;

  const s4 = quota(i.driverCompilati, DRIVER_ATTESI);
  const s5 = quota(i.interventiCompleti, INTERVENTI_ATTESI);
  const s6 = quota(i.capitoliScritti, i.capitoliTotali);

  const media = (s1 + s2 + s3 + s4 + s5 + s6) / 6;
  return {
    s1, s2, s3, s4, s5, s6,
    totPct: Number(dec(media).times(100).toDecimalPlaces(0).toString()),
  };
}
