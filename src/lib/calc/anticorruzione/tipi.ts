// Le forme del dominio ISO 37001. Solo tipi: nessuna logica, nessun accesso al DB.
//
// I nomi non sono quelli del prototipo (`d_paese`, `f_succ`, `dd_data`): li' erano
// chiavi di un oggetto in `localStorage`, qui sono colonne e campi di un modulo che
// un consulente legge. La corrispondenza sta nel test del golden, in un posto solo.

/** Le quattro dimensioni del rischio, ciascuna da 1 a 4. `null` = non valutata. */
export type Dimensione = 1 | 2 | 3 | 4 | null;

export type LivelloRischio = "Basso" | "Medio" | "Alto" | "Critico";

export type SocioInAffari = {
  // Dimensioni del rischio
  paese: Dimensione;
  pubbliciUfficiali: Dimensione;
  natura: Dimensione;
  valore: Dimensione;

  // Fattori che alzano il livello a prescindere dalla media
  remunerazioneSuccesso: boolean;
  impostoDalCliente: boolean;
  titolaritaOpaca: boolean;
  /** Indagini, condanne, sanzioni o esclusioni: porta SEMPRE a Critico. */
  precedenti: boolean;
  legamiPubblici: boolean;
  pagamentiATerzi: boolean;

  // Adempimenti
  dueDiligenceIl: string | null;
  politicaComunicata: string | null;
  impegni: string | null;
  clausole: string | null;
  controlli: string | null;
  formazioneIl: string | null;
  verificaCorrispettivo: string | null;

  // Rapporto
  remunerazione: string | null;
  controllata: string | null;
  adeguamento: string | null;
  stato: "Attivo" | "Sospeso" | "Cessato";
};

export type Obbligo = {
  chiave: "dd" | "pol" | "imp" | "clau" | "ctrl" | "form" | "pag" | "ctr";
  etichetta: string;
  /** Punto della norma e procedura del corpus che lo attua. */
  riferimento: string;
};
