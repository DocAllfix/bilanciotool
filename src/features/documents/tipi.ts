// Registro dei tipi di documento pubblicabile: SOLI DATI, nessuna funzione server,
// così è importabile anche dai componenti client (toolbar, pannello di pubblicazione).
// Il dispatch delle funzioni di pubblicazione e dei template vive dove serve, con
// switch esaustivi: aggiungendo un tipo qui il compilatore segnala ogni punto scoperto.

export const TIPI_DOCUMENTO = ["ghg", "bilancio", "energetico", "attestato", "soa", "relazione_pc", "matrice_pc", "matrice_231", "relazione_odv", "relazione_wb", "riesame_qas", "manuale_sa8000", "dichiarazione_filiera"] as const;
export type TipoDocumento = (typeof TIPI_DOCUMENTO)[number];

/** `document_snapshot.anno` per i documenti che non si riferiscono a un esercizio.
 *  La colonna è NOT NULL e sta nell'unique `(companyId, tipo, anno, versione)`:
 *  con 0 fisso l'unicità diventa di fatto `(companyId, tipo, versione)`, cioè una
 *  sola serie monotona di revisioni. Usare l'anno di emissione spezzerebbe la
 *  numerazione al cambio di calendario. */
export const SENZA_ESERCIZIO = 0;

/**
 * I documenti che NON possono uscire dal portale cliente.
 *
 * ⚠️ Questo insieme esiste PRIMA che ne esista un membro, ed è deliberato.
 *
 * Il collegamento del portale è **per azienda, non per documento**: chi lo riceve vede
 * tutti i documenti pubblicati di quella azienda. Quindi il giorno in cui si aggiunge un
 * tipo che contiene l'identità di chi ha segnalato — il fascicolo di una segnalazione ex
 * D.Lgs. 24/2023 — quel documento comparirebbe **da solo** dentro i collegamenti già
 * consegnati, senza che nessuno prema niente. L'esposizione non richiederebbe un errore
 * dell'utente: la produrrebbe l'aggiunta del tipo.
 *
 * Il filtro sta nella QUERY DEL PORTALE (`features/condivisione/index.ts`) e non
 * nell'interfaccia, e non in un controllo al momento della pubblicazione: quello
 * varrebbe solo per i documenti futuri, e lascerebbe fuori quelli già archiviati.
 *
 * Rivelare l'identità di chi segnala senza il suo consenso espresso è vietato dall'art.
 * 12 del decreto. È l'unico modulo dei sei in cui un errore di permessi ha una
 * conseguenza legale diretta per una persona che si è esposta.
 */
export const TIPI_RISERVATI: readonly TipoDocumento[] = [];

/** true se il documento non deve mai raggiungere il portale cliente. */
export function riservato(tipo: TipoDocumento): boolean {
  return TIPI_RISERVATI.includes(tipo);
}

export type VoceDocumento = {
  /** Etichetta estesa, per il pulsante di pubblicazione. */
  nome: string;
  /** Etichetta corta, per elenchi e barra del documento. */
  breve: string;
  /** Radice del nome del file PDF scaricato. */
  file: string;
  /** false per i documenti non annuali: l'anno non va mostrato né messo nel nome file. */
  mostraAnno: boolean;
  /** true se lo snapshot contiene chiavi di archiviazione da convertire in URL firmati. */
  haMedia: boolean;
};

export const DOCUMENTI = {
  ghg: {
    nome: "Rapporto GHG (§9.3.1)",
    breve: "Rapporto GHG",
    file: "rapporto-ghg",
    mostraAnno: true,
    haMedia: false,
  },
  bilancio: {
    nome: "Bilancio di sostenibilità e conformità ESG",
    breve: "Bilancio",
    file: "bilancio-sostenibilita-esg",
    mostraAnno: true,
    haMedia: true,
  },
  energetico: {
    nome: "Bilancio energetico (UNI CEI EN 16247)",
    breve: "Bilancio energetico",
    file: "bilancio-energetico",
    mostraAnno: true,
    haMedia: true,
  },
  attestato: {
    nome: "Attestato di autovalutazione ESG",
    breve: "Attestato ESG",
    file: "attestato-esg",
    // Non si riferisce a un esercizio: le revisioni formano una serie unica.
    mostraAnno: false,
    haMedia: false,
  },
  soa: {
    nome: "Statement of Applicability (SoA)",
    breve: "Statement (SoA)",
    file: "statement-of-applicability",
    // Non si riferisce a un esercizio: le revisioni formano una serie unica.
    mostraAnno: false,
    haMedia: false,
  },
  relazione_pc: {
    nome: "Relazione annuale sulla prevenzione della corruzione",
    breve: "Relazione ISO 37001",
    file: "relazione-prevenzione-corruzione",
    // Non annuale malgrado il nome: il documento e' una REVISIONE del sistema, e le
    // revisioni formano una serie unica. L'anno nel titolo lo mette chi lo redige.
    mostraAnno: false,
    haMedia: false,
  },
  matrice_pc: {
    nome: "Matrice di conformita' UNI ISO 37001",
    breve: "Matrice ISO 37001",
    file: "matrice-conformita-37001",
    mostraAnno: false,
    haMedia: false,
  },
  matrice_231: {
    nome: "Matrice reati-processi (D.Lgs. 231/2001)",
    breve: "Matrice 231",
    file: "matrice-reati-processi",
    // Il Modello e' una fotografia che si revisiona, non un esercizio annuale.
    mostraAnno: false,
    haMedia: false,
  },
  relazione_odv: {
    nome: "Relazione dell'Organismo di Vigilanza",
    breve: "Relazione OdV",
    file: "relazione-odv",
    mostraAnno: false,
    haMedia: false,
  },
  manuale_sa8000: {
    nome: "Manuale del sistema SA8000/2026",
    breve: "Manuale SA8000",
    file: "manuale-sa8000-2026",
    // E' cio' che si esibisce in audit di certificazione: una fotografia che si
    // revisiona, non un esercizio annuale.
    mostraAnno: false,
    haMedia: false,
  },
  dichiarazione_filiera: {
    nome: "Dichiarazione annuale sulla due diligence di filiera",
    breve: "Dichiarazione filiera",
    file: "dichiarazione-due-diligence-filiera",
    // ⚠️ E' l'unico dei nuovi documenti con un obbligo di PUBBLICAZIONE dietro: la
    // CSDDD all'articolo 16 chiede che la dichiarazione sia resa accessibile. Non porta
    // l'anno nel titolo perche' resta la revisione N di una serie unica, ed e' chi la
    // redige a datarla nel corpo.
    mostraAnno: false,
    haMedia: false,
  },
  riesame_qas: {
    nome: "Riesame di direzione del sistema integrato",
    breve: "Riesame di direzione",
    file: "riesame-direzione-qas",
    // Annuale nella pratica, ma e' la revisione N di una serie unica: l'anno nel titolo
    // lo mette chi lo redige, e l'unicita' resta (azienda, tipo, versione).
    mostraAnno: false,
    haMedia: false,
  },
  relazione_wb: {
    nome: "Relazione periodica sulle segnalazioni (D.Lgs. 24/2023)",
    breve: "Relazione segnalazioni",
    file: "relazione-segnalazioni",
    // Periodica ma non ancorata all'esercizio: si redige quando l'organo di controllo la
    // chiede, e le revisioni formano una serie unica.
    mostraAnno: false,
    haMedia: false,
  },
} as const satisfies Record<TipoDocumento, VoceDocumento>;

/** "Rapporto GHG 2025" per i documenti annuali, "Attestato ESG" per gli altri. */
export function etichettaDocumento(tipo: TipoDocumento, anno: number, breve = false): string {
  const v = DOCUMENTI[tipo];
  const nome = breve ? v.breve : v.nome;
  return v.mostraAnno ? `${nome} ${anno}` : nome;
}

/** Nome del file PDF, con l'anno solo dove ha senso. */
export function nomeFileDocumento(tipo: TipoDocumento, anno: number, versione: number): string {
  const v = DOCUMENTI[tipo];
  return v.mostraAnno ? `${v.file}-${anno}-v${versione}.pdf` : `${v.file}-v${versione}.pdf`;
}
