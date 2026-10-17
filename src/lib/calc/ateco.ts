// Il codice ATECO, letto per proporre le voci tipiche di un'azienda.
//
// ⚠️ SI LEGGE LA DIVISIONE, NON LA LETTERA. Dal 1° aprile 2025 vale l'ATECO 2025 (NACE Rev.
// 2.1), che ha spostato le lettere delle sezioni: l'informatica non è più tutta sotto «J», il
// commercio di autoveicoli è confluito in «G» con un'altra divisione. Le aziende già registrate
// portano codici dell'una o dell'altra versione, e la lettera direbbe due cose diverse per lo
// stesso codice. Le prime due cifre — la divisione — sono rimaste stabili: i profili si
// agganciano agli INTERVALLI di divisione, e reggono entrambe le versioni.
//
// ⚠️ Un profilo è un punto di partenza per le PROPOSTE, mai una classificazione ufficiale:
// ciò che ne esce entra marcato «proposta» col motivo, e si modifica o si toglie.
//
// Puro: niente database, niente fuso. Lo usano le proposte di tutti i percorsi.

export type ChiaveProfilo =
  | "agricoltura"
  | "estrattiva"
  | "alimentare"
  | "tessile_moda"
  | "legno_carta"
  | "chimica_plastica"
  | "minerali"
  | "metalli"
  | "macchine_elettronica"
  | "altre_manifatture"
  | "energia"
  | "acqua_rifiuti"
  | "costruzioni"
  | "commercio"
  | "trasporti"
  | "alloggio_ristorazione"
  | "ict_editoria"
  | "finanza"
  | "immobiliare"
  | "professionali"
  | "servizi_supporto"
  | "pubblica_amministrazione"
  | "istruzione"
  | "sanita"
  | "cultura_sport"
  | "altri_servizi";

export type ProfiloAteco = { key: ChiaveProfilo; nome: string; da: number; a: number };

/** In ordine di divisione. Gli intervalli non si sovrappongono: lo pretende `ateco-pure`. */
export const PROFILI_ATECO: readonly ProfiloAteco[] = [
  { key: "agricoltura", nome: "Agricoltura, silvicoltura e pesca", da: 1, a: 3 },
  { key: "estrattiva", nome: "Estrazione di minerali", da: 5, a: 9 },
  { key: "alimentare", nome: "Industria alimentare e delle bevande", da: 10, a: 12 },
  { key: "tessile_moda", nome: "Tessile, abbigliamento e pelle", da: 13, a: 15 },
  { key: "legno_carta", nome: "Legno, carta e stampa", da: 16, a: 18 },
  { key: "chimica_plastica", nome: "Chimica, farmaceutica, gomma e plastica", da: 19, a: 22 },
  { key: "minerali", nome: "Vetro, ceramica, cemento e laterizi", da: 23, a: 23 },
  { key: "metalli", nome: "Metallurgia e prodotti in metallo", da: 24, a: 25 },
  { key: "macchine_elettronica", nome: "Elettronica, apparecchi elettrici, macchine e mezzi di trasporto", da: 26, a: 30 },
  { key: "altre_manifatture", nome: "Mobili, altre manifatture, riparazione e installazione", da: 31, a: 33 },
  { key: "energia", nome: "Energia elettrica, gas e vapore", da: 35, a: 35 },
  { key: "acqua_rifiuti", nome: "Acqua, reti fognarie e gestione dei rifiuti", da: 36, a: 39 },
  { key: "costruzioni", nome: "Costruzioni", da: 41, a: 43 },
  { key: "commercio", nome: "Commercio all'ingrosso e al dettaglio", da: 45, a: 47 },
  { key: "trasporti", nome: "Trasporto e magazzinaggio", da: 49, a: 53 },
  { key: "alloggio_ristorazione", nome: "Alloggio e ristorazione", da: 55, a: 56 },
  { key: "ict_editoria", nome: "Editoria, telecomunicazioni e servizi informatici", da: 58, a: 63 },
  { key: "finanza", nome: "Servizi finanziari e assicurativi", da: 64, a: 66 },
  { key: "immobiliare", nome: "Attività immobiliari", da: 68, a: 68 },
  { key: "professionali", nome: "Attività professionali, scientifiche e tecniche", da: 69, a: 75 },
  { key: "servizi_supporto", nome: "Noleggio, agenzie e servizi di supporto alle imprese", da: 77, a: 82 },
  { key: "pubblica_amministrazione", nome: "Pubblica amministrazione", da: 84, a: 84 },
  { key: "istruzione", nome: "Istruzione", da: 85, a: 85 },
  { key: "sanita", nome: "Sanità e assistenza sociale", da: 86, a: 88 },
  { key: "cultura_sport", nome: "Attività artistiche, sportive e di intrattenimento", da: 90, a: 93 },
  { key: "altri_servizi", nome: "Altre attività di servizi", da: 94, a: 96 },
];

/**
 * La divisione di un codice ATECO, o `null` se il codice non si legge.
 *
 * Accetta le forme che si incontrano davvero: «25.62», «25.62.00», «2562», «C 25.62» (con la
 * lettera della sezione davanti), «25». Rifiuta ciò che non è un codice: una divisione deve
 * esistere nella tabella dei profili, altrimenti «99.99» darebbe un profilo inventato.
 */
export function divisioneAteco(codice: string | null | undefined): number | null {
  if (!codice) return null;
  const pulito = codice.trim().toUpperCase().replace(/^[A-U]\s*[.\-]?\s*/, "");
  const m = /^(\d{2})(?:[.\s]?\d{1,2}(?:[.\s]?\d{1,2})?)?$/.exec(pulito);
  if (!m) return null;
  const div = Number(m[1]);
  return PROFILI_ATECO.some((p) => div >= p.da && div <= p.a) ? div : null;
}

/** Il profilo di un codice ATECO, o `null` se il codice non si legge. */
export function profiloAteco(codice: string | null | undefined): ProfiloAteco | null {
  const div = divisioneAteco(codice);
  if (div === null) return null;
  return PROFILI_ATECO.find((p) => div >= p.da && div <= p.a) ?? null;
}

/**
 * La SEZIONE ATECO 2007 di una divisione: la lettera con cui è scritta la tabella curata della
 * materialità (`ateco-suggestions.json`). Derivata dalla divisione, mai dalla lettera scritta
 * nel codice, che con l'ATECO 2025 può essere un'altra.
 */
export function sezioneDellaDivisione(div: number): string | null {
  const intervalli: [string, number, number][] = [
    ["A", 1, 3], ["B", 5, 9], ["C", 10, 33], ["D", 35, 35], ["E", 36, 39], ["F", 41, 43], ["G", 45, 47],
    ["H", 49, 53], ["I", 55, 56], ["J", 58, 63], ["K", 64, 66], ["L", 68, 68], ["M", 69, 75], ["N", 77, 82],
    ["O", 84, 84], ["P", 85, 85], ["Q", 86, 88], ["R", 90, 93], ["S", 94, 96],
  ];
  return intervalli.find(([, da, a]) => div >= da && div <= a)?.[0] ?? null;
}
