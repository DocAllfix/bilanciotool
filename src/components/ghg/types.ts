// Tipi serializzabili del percorso GHG (confine server→client).
// Rispecchiano l'output di src/features/ghg/queries.getWizardData.

export type Azienda = { id: string; nome: string; settore: string | null; sede: string | null; stato: "active" | "archived" };

export type Inventario = {
  id: string;
  anno: number;
  annoBase: number;
  gwpSetKey: string;
  boundaries: Record<string, string>;
  ricavi: string | null;
  fte: string | null;
  produzione: string | null;
  umProduzione: string | null;
};

export type InventarioBreve = { id: string; anno: number; annoBase: number; gwpSetKey: string };

export type Fattore = {
  key: string;
  gruppo: string;
  nome: string;
  um: string;
  fe: string;
  feMarket: string | null;
  feBiogenic: string | null;
  categoryKey: string;
  sourceTypeKey: string;
  fonte: string | null;
  origine: "piattaforma" | "override" | "custom";
};

export type Catalogo = {
  categorie: { key: string; nome: string; scope: number; descrizione: string }[];
  sorgenti: { key: string; categoryKey: string; nome: string; descrizione: string }[];
  requisiti: { key: string; clausola: string; nome: string; descrizione: string }[];
  fattori: Fattore[];
};

export type Riga = {
  id: string;
  sourceTypeKey: string;
  categoryKey: string;
  sede: string | null;
  descrizione: string | null;
  factorKey: string | null;
  um: string;
  quantita: string;
  fe: string;
  feMarket: string | null;
  quotaGo: string | null;
  feBiogenic: string | null;
  dq: "M" | "F" | "C" | "E" | "S";
  incertezza: string | null;
  evidenza: string | null;
  note: string | null;
};

export type Obiettivo = {
  id: string;
  nome: string;
  ambito: "1" | "2" | "12" | "3" | "tot";
  riduzionePct: string;
  annoTarget: number;
  note: string | null;
};

export type Risultati = {
  anno: number;
  annoBase: number;
  gwpSetKey: string;
  n: number;
  s1: string;
  s2l: string;
  s2m: string;
  s3: string;
  totL: string;
  totM: string;
  bio: string;
  incPct: string;
  incMPct: string;
  dqMedia: string;
  perCategoria: Record<string, { n: number; t: string; tM: string; bio: string; incPct: string; dqMedia: string }>;
  top: { id: string; categoryKey: string; descrizione: string; t: string }[];
  intensita: { perFatturato: string | null; perAddetto: string | null; perUnita: string | null };
  variazioneAnnoBasePct: string | null;
  obiettivi: {
    id: string;
    nome: string;
    ambito: string;
    riduzionePct: string;
    annoTarget: number;
    note: string | null;
    base: string | null;
    attuale: string;
    traguardo: string | null;
    percorsoPct: string | null;
  }[];
};

export type Progresso = {
  a1: number; a2: number; a3: number; a4: number; a5: number; a6: number; a7: number; a8: number;
  totPct: number;
};

export type StatoWizard = {
  sorgenti: { sourceTypeKey: string; stato: "in" | "out" | "na"; motivazione: string | null }[];
  checklist: { requirementKey: string; stato: "ok" | "par" | "no"; nota: string | null }[];
  righe: Riga[];
  obiettivi: Obiettivo[];
  risultati: Risultati;
  progresso: Progresso;
};
