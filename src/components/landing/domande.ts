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

export const DOMANDE: [string, string][] = [
  [
    "Come funziona la demo guidata?",
    "Ti registri in un minuto e trovi un'azienda d'esempio già compilata. Puoi aprire ogni percorso, cambiare i dati e vedere i calcoli cambiare, con un giro guidato nelle schermate principali. La carta serve solo quando decidi di lavorare sulla tua azienda.",
  ],
  [
    "Devo comprare i percorsi uno per uno?",
    "No. L'abbonamento li comprende tutti, senza costi per documento o per utente. Nel fascicolo della tua azienda apri soltanto quelli che ti servono, di solito partendo da ciò che qualcuno ti sta chiedendo adesso: gli altri restano lì e non ingombrano.",
  ],
  [
    "Serve essere consulenti per usarlo?",
    "No. È pensato per chi in azienda segue conformità, qualità, ambiente o sicurezza: ogni passo spiega che cosa guardare e dove trovare il dato. I consulenti lo usano per seguire più aziende clienti con lo stesso metodo.",
  ],
  [
    "Devo inserire tutto a mano?",
    "No. L'anagrafica si scrive una volta e passa da sola in ogni percorso. Dal codice ATECO arrivano le voci tipiche del settore, col motivo accanto: le confermi, le correggi o le togli, e nei documenti conta solo ciò che hai confermato.",
  ],
  [
    "A quali norme sono conformi i documenti?",
    `Ciascuno a quella del suo percorso: ${NORME}. La certificazione resta di un ente terzo: il documento la prepara, non la sostituisce. Il dettaglio di ogni percorso sta nella sua pagina.`,
  ],
  [
    "Dove stanno i dati? E se non rinnovo?",
    "Su database europei, a Francoforte, isolati per account. Se non rinnovi, l'account passa in sola lettura: i dati restano tuoi, consultabili ed esportabili. Non cancelliamo il lavoro di nessuno.",
  ],
];
