// IL LIVELLO DI CONFORMITA' NIS2: 126 requisiti su 12 capi, scala 0÷4.
//
// ⚠️ LA DIVERGENZA PIU' GROSSA DAL PROTOTIPO, ED E' LA STESSA GIA' PAGATA DUE VOLTE.
//
// Il prototipo (`pcArea`) media sui SOLI requisiti valutati. Misurato eseguendolo: venti
// requisiti valutati a giro sui cinque livelli, centocinque mai guardati, restituisce
// **50%** — lo stesso numero che darebbe «tutti e 125 valutati a livello 2», e lo stesso
// che darebbe «tre conformi e centoventidue ignorati». Tre situazioni opposte, un numero
// solo, su un documento che si porta a un'Autorita' di vigilanza.
//
// Qui un requisito applicabile e non valutato pesa ZERO. Sullo stesso caso: 8%.
// «Non applicabile» resta fuori dal denominatore, ed e' un'altra cosa — e' una
// valutazione, non un'omissione, e chi ha dichiarato che venti requisiti non lo
// riguardano non deve risultare inadempiente su venti requisiti.
//
// La regola non e' riscritta qui: sta in `calc/comune/valutazione.ts` dalla terza volta
// che la stessa domanda si e' presentata (Modello 231, ISO 37001, e ora NIS2).

import { mediaPesata, NON_APPLICABILE, type Pesi } from "@/lib/calc/comune/valutazione";

export type Livello = 0 | 1 | 2 | 3 | 4;

export type DefinizioneLivello = {
  valore: Livello;
  nome: string;
  descrizione: string;
  percentuale: number;
};

/**
 * La scala del decreto, come la scrive il prototipo.
 *
 * ⚠️ Le descrizioni non sono ornamento: il salto dal 2 al 3 pretende l'EVIDENZA
 * DOCUMENTALE e il salto dal 3 al 4 la verifica di efficacia. Senza quelle due frasi
 * davanti agli occhi, un consulente mette 3 dappertutto e il documento non regge la prima
 * ispezione.
 */
export const LIVELLI: readonly DefinizioneLivello[] = [
  { valore: 0, nome: "Assente", descrizione: "La misura non è attuata né pianificata.", percentuale: 0 },
  { valore: 1, nome: "Pianificata", descrizione: "La misura è definita o pianificata ma non ancora attuata.", percentuale: 25 },
  { valore: 2, nome: "Attuata parzialmente", descrizione: "La misura è attuata su una parte del perimetro o in modo non sistematico.", percentuale: 50 },
  { valore: 3, nome: "Attuata", descrizione: "La misura è attuata sull'intero perimetro, con evidenza documentale.", percentuale: 75 },
  { valore: 4, nome: "Attuata e verificata", descrizione: "La misura è attuata, misurata e la sua efficacia è verificata periodicamente.", percentuale: 100 },
];

/** Il livello che si punta a raggiungere, se nessuno ne sceglie un altro. */
export const OBIETTIVO_PREDEFINITO: Livello = 3;

/** I pesi nella forma che `mediaPesata` si aspetta: lo stato e' il livello, come stringa. */
const PESI: Pesi = Object.fromEntries(LIVELLI.map((l) => [String(l.valore), l.percentuale]));

export type Valutazione = {
  /** `null` quando nessuno l'ha ancora guardato. Non e' zero. */
  livello: Livello | number | null;
  nonApplicabile: boolean;
};

/** Lo stato nel vocabolario di `comune/valutazione.ts`. */
function stato(v: Valutazione): string | null {
  if (v.nonApplicabile) return NON_APPLICABILE;
  return v.livello == null ? null : String(v.livello);
}

/**
 * La conformita' di un insieme di requisiti, 0÷100.
 *
 * ⚠️ Si passano TUTTI i requisiti, compresi quelli mai valutati. Passare solo i valutati
 * farebbe rientrare dalla finestra il difetto che questa funzione esiste per chiudere, ed
 * e' un errore facile: il codice chiamante ha spesso una mappa dei soli valutati sotto mano.
 */
export function conformita(valutazioni: readonly Valutazione[]): number {
  return mediaPesata(valutazioni.map(stato), PESI);
}

/**
 * Il livello medio dei soli requisiti VALUTATI.
 *
 * ⚠️ Sui soli valutati, e non e' un'incoerenza con `conformita`: risponde a un'altra
 * domanda. La conformita' dice «quanto di cio' che e' dovuto e' attuato»; il livello
 * medio dice «dove sta, in media, cio' che abbiamo guardato», e serve a scegliere
 * l'obiettivo. Mescolarci dentro i requisiti mai guardati lo renderebbe muto.
 *
 * `null` quando non si e' valutato niente: zero direbbe «tutto assente», che e' un'altra
 * cosa da «non si sa».
 */
export function livelloMedio(valutazioni: readonly Valutazione[]): number | null {
  const v = valutazioni.filter((x) => !x.nonApplicabile && x.livello != null).map((x) => x.livello as number);
  if (!v.length) return null;
  return Math.round((v.reduce((a, b) => a + b, 0) / v.length) * 10) / 10;
}

export type EsitoCapitolo = {
  capitolo: string;
  percentuale: number;
  attivi: number;
  valutati: number;
};

export function perCapitolo(
  capitoli: readonly { capitolo: string; valutazioni: readonly Valutazione[] }[],
): EsitoCapitolo[] {
  return capitoli.map((c) => ({
    capitolo: c.capitolo,
    percentuale: conformita(c.valutazioni),
    attivi: c.valutazioni.filter((v) => !v.nonApplicabile).length,
    valutati: c.valutazioni.filter((v) => !v.nonApplicabile && v.livello != null).length,
  }));
}

// ─────────────────────────────────────────────────────────── scostamenti e piano

export type Priorita = "immediata" | "alta" | "media" | "programmata";

/** Entro quanti giorni si suggerisce di chiudere l'azione. Quelli del prototipo. */
export const GIORNI_PER_PRIORITA: Record<Priorita, number> = {
  immediata: 30,
  alta: 90,
  media: 180,
  programmata: 365,
};

export type Requisito = {
  id: string;
  /** «Criticita' alta» nel prototipo: il requisito su cui un rilievo pesa di piu'. */
  critico: boolean;
  valutazione: Valutazione;
};

/**
 * I requisiti VALUTATI che stanno sotto l'obiettivo.
 *
 * ⚠️ Un requisito mai valutato NON e' uno scostamento: e' una lacuna di istruttoria, e va
 * detta altrove. Metterlo qui riempirebbe il piano di adeguamento di centocinque azioni
 * che nessuno ha ancora deciso di dover fare, e un piano illeggibile non lo apre nessuno.
 */
export function scostamenti(requisiti: readonly Requisito[], obiettivo: number): Requisito[] {
  return requisiti.filter(
    (r) => !r.valutazione.nonApplicabile && r.valutazione.livello != null && r.valutazione.livello < obiettivo,
  );
}

/**
 * La priorita' di uno scostamento: criticita' del requisito per ampiezza dello scarto.
 *
 * ⚠️ «Programmata» non esce mai da qui, ed e' voluto: nel prototipo e' un'opzione del
 * piano di adeguamento, non un esito del calcolo. Chi decide di rimandare un adeguamento
 * se ne assume la responsabilita', e il motore non gliela toglie proponendogliela.
 */
export function priorita(
  r: { critico: boolean; livello: number | null },
  obiettivo: number,
): Exclude<Priorita, "programmata"> | null {
  if (r.livello == null || r.livello >= obiettivo) return null;
  const scarto = obiettivo - r.livello;
  if (r.critico && r.livello <= 1) return "immediata";
  if (r.critico && scarto >= 1) return "alta";
  if (scarto >= 2) return "alta";
  return "media";
}
