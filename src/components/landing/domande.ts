// Le domande frequenti, con le risposte vere.
//
// Stanno in un modulo SENZA "use client" perche' le legge anche la pagina, che e' un
// componente server: importare dati da un file client non restituisce l'elenco ma un
// riferimento al componente, e il build si ferma con «DOMANDE.map is not a function».
// Le stesse risposte servono due volte — in pagina e nei dati strutturati — e ricopiarle
// significherebbe correggerne una sola, prima o poi.
//
// ⚠️ Da dieci a sei il 7 novembre 2026, con la landing nuova: le risposte sono quelle di
// prima, accorciate, e non promettono niente di più. Il dettaglio delle norme per percorso
// sta nelle pagine dei percorsi; come si acquista sta nella sua sezione.
import { NORME_VETRINA } from "./numeri-vetrina";

/** Le norme in una frase, dal registro dei moduli: un percorso nuovo entra da solo. */
const NORME = NORME_VETRINA.join(", ");

// ⚠️ Accorciate ancora il 7 novembre 2026 («meno verboso»): una o due frasi per risposta.
// Il dettaglio sta nelle pagine dei percorsi e nella pagina dei prezzi.
export const DOMANDE: [string, string][] = [
  [
    "Come funziona la demo guidata?",
    "Ti registri in un minuto e trovi un'azienda d'esempio già compilata: apri i percorsi, cambi i dati, guardi i calcoli. La carta serve solo quando lavori sulla tua azienda.",
  ],
  [
    "Devo comprare i percorsi uno per uno?",
    "No. L'abbonamento li comprende tutti, senza costi per documento o per utente. Apri solo quelli che ti servono.",
  ],
  [
    "Serve essere consulenti per usarlo?",
    "No. Ogni passo spiega che cosa guardare e dove trovare il dato in azienda.",
  ],
  [
    "Devo inserire tutto a mano?",
    "No. L'anagrafica si scrive una volta, e dal codice ATECO arrivano le voci tipiche del tuo settore, da confermare.",
  ],
  [
    "A quali norme sono conformi i documenti?",
    `Ciascuno a quella del suo percorso: ${NORME}. La certificazione resta di un ente terzo: il documento la prepara.`,
  ],
  [
    "Dove stanno i dati? E se non rinnovo?",
    "Su database europei, a Francoforte. Se non rinnovi l'account passa in sola lettura: i dati restano tuoi, consultabili ed esportabili.",
  ],
];
