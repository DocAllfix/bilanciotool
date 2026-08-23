// Il canale interno: le tre forme che l'art. 4 pretende, e le due condizioni che le
// accompagnano.
//
// ⚠️ Nel prototipo niente di tutto questo esisteva. «Canale scritto informatico»,
// «Canale orale» e «Modalità per l'incontro diretto» erano tre campi liberi
// nell'anagrafica, e nessuno verificava che fossero riempiti: un ente con la sola
// casella di posta compilava il primo, lasciava vuoti gli altri due, e il sistema non
// aveva niente da ridire. L'art. 4 c. 1 le pretende TUTTE E TRE — forma scritta, forma
// orale, e incontro diretto su richiesta della persona segnalante — ed è la ragione per
// cui qui il canale è un'entità con una riga per forma: solo così la verifica può
// essere totale invece che a campione.

/** Le tre forme di legge, nell'ordine del decreto. */
export const FORME_CANALE = ["Scritta", "Orale", "Incontro diretto"] as const;
export type FormaCanale = (typeof FORME_CANALE)[number];

export type Canale = { forma: string; attiva: boolean };

export type StatoCanale = {
  /** Le forme con almeno un canale ATTIVO. */
  coperte: FormaCanale[];
  /** Le forme di cui non esiste nessuna riga. Rimedio: istituire il canale. */
  mancanti: FormaCanale[];
  /**
   * Le forme che esistono sulla carta e sono spente.
   *
   * ⚠️ È una categoria a sé e non un sottoinsieme delle mancanti: un canale descritto e
   * mai acceso risulta previsto dalla procedura, e il rimedio non è istituirlo ma
   * attivarlo. Confonderli direbbe al consulente di fare la cosa sbagliata.
   */
  dichiarateNonAttive: FormaCanale[];
  conforme: boolean;
};

/** Se una forma è coperta, quale manca del tutto e quale è solo spenta. */
export function statoCanale(canali: readonly Canale[]): StatoCanale {
  const coperte: FormaCanale[] = [];
  const mancanti: FormaCanale[] = [];
  const dichiarateNonAttive: FormaCanale[] = [];

  for (const forma of FORME_CANALE) {
    const righe = canali.filter((c) => c.forma === forma);
    if (righe.some((c) => c.attiva)) coperte.push(forma);
    else if (righe.length) dichiarateNonAttive.push(forma);
    else mancanti.push(forma);
  }

  return { coperte, mancanti, dichiarateNonAttive, conforme: coperte.length === FORME_CANALE.length };
}

// ─── La consultazione sindacale (art. 4 c. 1) ────────────────────────────────

export type EsitoConsultazione = "ok" | "tardiva" | "assente" | "nonVerificabile";

const ISO = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Se la consultazione sindacale ha preceduto l'attivazione del canale.
 *
 * La procedura si adotta «sentite le rappresentanze o le organizzazioni sindacali»:
 * sentirle a canale già acceso non è la stessa cosa, e la data lo dice.
 *
 * ⚠️ Senza un canale attivato il verdetto è `nonVerificabile`, non `assente`. Un'azienda
 * che non ha ancora acceso nulla non è in difetto, e un avviso rosso al primo giorno
 * insegna a ignorare gli avvisi.
 *
 * ⚠️ Le due date sbagliate si trattano in modo OPPOSTO, ed è deliberato: una data di
 * attivazione illeggibile si scarta (non si accusa nessuno di una violazione per un
 * refuso), una data di consultazione illeggibile vale come consultazione assente
 * (l'onere di dimostrarla è dell'ente).
 */
export function consultazioneSindacale(
  consultazione: string | null | undefined,
  attivazioni: readonly (string | null | undefined)[],
): EsitoConsultazione {
  const date = attivazioni.filter((d): d is string => !!d && ISO.test(d)).sort();
  if (!date.length) return "nonVerificabile";
  if (!consultazione || !ISO.test(consultazione)) return "assente";
  // Confronto inclusivo: nulla vieta che consultazione e attivazione stiano nello stesso
  // verbale, e il primo canale acceso è quello che conta.
  return consultazione <= date[0] ? "ok" : "tardiva";
}

// ─── La condivisione del canale (art. 4 c. 4) ────────────────────────────────

/** Fino a 249 lavoratori il canale si può condividere con altri enti. */
export const SOGLIA_CONDIVISIONE = 249;

/**
 * Se la condivisione è ammessa, oppure `null` quando il numero di lavoratori non si sa.
 *
 * ⚠️ `null` e non `false`: dichiarare non ammessa una condivisione solo perché il campo
 * degli addetti è vuoto è un'accusa fondata sul nulla, e finirebbe stampata in un
 * documento.
 */
export function condivisioneAmmessa(addetti: string | null | undefined): boolean | null {
  const n = numeroItaliano(addetti);
  return n === null ? null : n <= SOGLIA_CONDIVISIONE;
}

/**
 * Il numero di lavoratori scritto come lo scrive una persona.
 *
 * Il campo è testo libero — lo era nel prototipo e lo resta, perché ospita anche «media
 * dei subordinati nell'ultimo anno» con i decimali. `Number("1.200")` darebbe 1,2.
 */
function numeroItaliano(v: string | null | undefined): number | null {
  const s = (v ?? "").trim();
  if (!s) return null;
  if (/^\d+$/.test(s)) return Number(s);
  if (/^\d{1,3}(\.\d{3})+$/.test(s)) return Number(s.replace(/\./g, ""));
  return null;
}
