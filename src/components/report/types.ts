// Tipi serializzabili del percorso Bilancio (confine server→client),
// speculari all'output di src/features/report/queries.getReportWizardData.

export type AziendaReport = {
  id: string;
  nome: string;
  settore: string | null;
  sede: string | null;
  logoUrl: string | null;
  coverUrl: string | null;
};

export type ProgettoReport = {
  id: string;
  anno: number;
  standard: string;
  perimetro: string | null;
  profilo: Record<string, string>;
  soglia: number;
};

export type TemaCatalogo = {
  key: string;
  pillar: "E" | "S" | "G";
  nome: string;
  riferimenti: string;
  guida: { def: string; imp: string[]; fin: string[]; alto: string; ev: string };
};

export type CatalogoReport = {
  temi: TemaCatalogo[];
  sezioni: { key: string; nome: string; riferimenti: string; pillar: "E" | "S" | "G" }[];
  kpi: { key: string; sectionKey: string; nome: string; um: string; hint: string | null }[];
  capitoli: { key: string; nome: string; hint: string }[];
};

export type BridgeStato =
  | { stato: "mancante" }
  | { stato: "vuoto"; inventoryId: string }
  | {
      stato: "ok";
      inventoryId: string;
      n: number;
      scope1: string;
      scope2Loc: string;
      scope2Mkt: string;
      scope3: string;
      totLoc: string;
      totMkt: string;
      bio: string;
    };

export type MediaItem = {
  sectionKey: string;
  id: string;
  tipo: "img" | "chart";
  chartKey: string | null;
  url: string | null;
  didascalia: string | null;
  credito: string | null;
  larghezza: "full" | "half";
  posizione: number;
};

export type StatoReport = {
  materialita: {
    soglia: number;
    perTopic: Record<string, { imp: number | null; fin: number | null; materiale: boolean; valutato: boolean }>;
    materialKeys: string[];
    assessedCount: number;
  };
  kpi: { corrente: Record<string, string>; precedente: Record<string, string> };
  derivati: Record<string, string>;
  derivatiPrecedente: Record<string, string>;
  gestione: {
    topicKey: string;
    politica: string | null;
    azioni: string | null;
    target: string | null;
    annoBase: string | null;
    annoTarget: string | null;
    responsabile: string | null;
  }[];
  capitoli: { templateKey: string; contenuto: unknown; parole: number }[];
  media: MediaItem[];
  bozze: Record<string, string>;
  gap: {
    profiloMancanti: string[];
    kpiMancanti: string[];
    kpiSenzaConfronto: string[];
    gestioneMancante: string[];
    capitoliDaCompletare: string[];
    mediaTotali: number;
    readyPct: number;
  };
  bridge: {
    corrente: BridgeStato;
    precedente: BridgeStato;
    warnings: { codice: string; messaggio: string }[];
  };
};
