// Le proposte che si ricavano dall'anagrafica e dagli altri percorsi per i percorsi di
// compliance. Pure: le usano le pagine per mostrare il valore accanto al campo, col motivo.
//
// ⚠️ Sono PROPOSTE, non decisioni: qualificano giuridicamente l'ente (obbligo del canale di
// segnalazione, dimensione NIS2), e la qualificazione la firma il consulente. Un clic le
// applica; nessuna si scrive da sola.

export type PropostaScelta<T extends string> = { valore: T; motivo: string };

/**
 * La dimensione d'impresa per la NIS2, dagli addetti e dal fatturato dell'anagrafica.
 *
 * Le soglie sono quelle della raccomandazione 2003/361/CE richiamata dalla direttiva: media
 * da 50 addetti o 10 milioni di fatturato, grande da 250 addetti o 50 milioni. «micro»
 * nel prodotto copre anche la piccola impresa, che la NIS2 tratta allo stesso modo.
 *
 * ⚠️ La raccomandazione guarda anche il totale di bilancio e le imprese collegate, che il
 * prodotto non conosce: per questo il motivo lo dice, e la decisione resta del consulente.
 */
export function propostaDimensioneNis2(
  dipendenti: number | null,
  fatturatoEuro: string | null,
): PropostaScelta<"micro" | "media" | "grande"> | null {
  if (dipendenti === null && fatturatoEuro === null) return null;
  const f = fatturatoEuro === null ? null : Number(fatturatoEuro);
  const milioni = f === null || !Number.isFinite(f) ? null : f / 1_000_000;
  const dati = [
    dipendenti !== null ? `${dipendenti} addetti` : null,
    // A mano: `toLocaleString` dipende dall'ICU del runtime, e il testo passa dal server al browser.
    milioni !== null ? `${(Math.round(milioni * 10) / 10).toString().replace(".", ",")} milioni di fatturato` : null,
  ].filter(Boolean).join(" e ");
  const nota = " Verifica anche il totale di bilancio e le imprese collegate, che qui non sono noti.";
  if ((dipendenti ?? 0) >= 250 || (milioni ?? 0) > 50) {
    return { valore: "grande", motivo: `Dall'anagrafica: ${dati}.${nota}` };
  }
  if ((dipendenti ?? 0) >= 50 || (milioni ?? 0) > 10) {
    return { valore: "media", motivo: `Dall'anagrafica: ${dati}.${nota}` };
  }
  return { valore: "micro", motivo: `Dall'anagrafica: ${dati}, sotto le soglie della media impresa.${nota}` };
}

/**
 * Il titolo dell'obbligo del canale di segnalazione (D.Lgs. 24/2023), dagli addetti e dalla
 * presenza del Modello 231 nel prodotto.
 */
export function propostaObbligoSegnalazioni(
  dipendenti: number | null,
  modello231: boolean,
): PropostaScelta<"Almeno 50 lavoratori subordinati" | "Adozione del modello 231, indipendentemente dal numero"> | null {
  if ((dipendenti ?? 0) >= 50) {
    return { valore: "Almeno 50 lavoratori subordinati", motivo: `L'anagrafica indica ${dipendenti} dipendenti (art. 2, c. 1, lett. q).` };
  }
  if (modello231) {
    return {
      valore: "Adozione del modello 231, indipendentemente dal numero",
      motivo: "L'azienda ha un Modello 231 nel suo percorso: se è adottato, il canale è obbligatorio a prescindere dagli addetti.",
    };
  }
  return null;
}

/**
 * Il ruolo privacy della dichiarazione di applicabilità (ISO/IEC 27001), dal percorso GDPR
 * della stessa azienda: il ruolo dichiarato nel sistema e i ruoli dei trattamenti CENSITI
 * (le proposte non ancora toccate non contano: nessuno le ha dichiarate).
 */
export function propostaRuoloPrivacy(
  ruoloSistema: string | null,
  ruoliTrattamenti: readonly string[],
): PropostaScelta<"titolare" | "responsabile" | "entrambi"> | null {
  // Tutti e tre i ruoli di sistema del GDPR implicano la titolarità: l'azienda tratta almeno
  // i dati dei propri dipendenti e fornitori.
  const titolare = !!ruoloSistema || ruoliTrattamenti.some((r) => r === "Titolare" || r === "Contitolare");
  const responsabile = ruoliTrattamenti.some((r) => r === "Responsabile");
  if (ruoloSistema === "Titolare e responsabile per conto di clienti" || (titolare && responsabile)) {
    return {
      valore: "entrambi",
      motivo: ruoloSistema === "Titolare e responsabile per conto di clienti"
        ? "Il percorso di protezione dei dati dichiara l'azienda titolare e responsabile per conto di clienti."
        : "Il registro dei trattamenti ha trattamenti da titolare e trattamenti da responsabile.",
    };
  }
  if (responsabile) return { valore: "responsabile", motivo: "Il registro dei trattamenti ha solo trattamenti da responsabile." };
  if (titolare || ruoloSistema) {
    return { valore: "titolare", motivo: "Il percorso di protezione dei dati dichiara l'azienda titolare del trattamento." };
  }
  return null;
}
