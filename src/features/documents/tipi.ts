// Registro dei tipi di documento pubblicabile: SOLI DATI, nessuna funzione server,
// così è importabile anche dai componenti client (toolbar, pannello di pubblicazione).
// Il dispatch delle funzioni di pubblicazione e dei template vive dove serve, con
// switch esaustivi: aggiungendo un tipo qui il compilatore segnala ogni punto scoperto.

export const TIPI_DOCUMENTO = ["ghg", "bilancio", "energetico", "attestato", "soa"] as const;
export type TipoDocumento = (typeof TIPI_DOCUMENTO)[number];

/** `document_snapshot.anno` per i documenti che non si riferiscono a un esercizio.
 *  La colonna è NOT NULL e sta nell'unique `(companyId, tipo, anno, versione)`:
 *  con 0 fisso l'unicità diventa di fatto `(companyId, tipo, versione)`, cioè una
 *  sola serie monotona di revisioni. Usare l'anno di emissione spezzerebbe la
 *  numerazione al cambio di calendario. */
export const SENZA_ESERCIZIO = 0;

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
    nome: "Bilancio di sostenibilità",
    breve: "Bilancio",
    file: "bilancio-sostenibilita",
    mostraAnno: true,
    haMedia: true,
  },
  energetico: {
    nome: "Diagnosi energetica (UNI CEI EN 16247)",
    breve: "Diagnosi energetica",
    file: "diagnosi-energetica",
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
    nome: "Dichiarazione di Applicabilità",
    breve: "Dichiarazione (SoA)",
    file: "dichiarazione-applicabilita",
    // Non si riferisce a un esercizio: le revisioni formano una serie unica.
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
