import type { getQuadro } from "@/features/nis2/profilo";
import type { getSistema } from "@/features/sgnis2/sistema";

// I tipi dell'interfaccia NIS2 si DERIVANO dalle letture, non si riscrivono.
//
// ⚠️ Un tipo scritto a mano accanto a una query e' una copia che il compilatore non
// controlla: si aggiunge un campo alla lettura, la pagina non lo vede, e nessuno se ne
// accorge finche' non serve. Qui il tipo E' la lettura.

export type DatiNis2 = NonNullable<Awaited<ReturnType<typeof getQuadro>>>;
export type DatiSgNis2 = NonNullable<Awaited<ReturnType<typeof getSistema>>>;

export type Requisito = DatiNis2["requisiti"][number];
export type Controllo = DatiSgNis2["controlli"][number];
export type Fase = DatiSgNis2["roadmap"]["fasi"][number];
export type Indicatore = DatiSgNis2["indicatori"][number];

/**
 * I cinque livelli della scala, con la loro etichetta.
 *
 * ⚠️ Le descrizioni NON sono ornamento e stanno anche qui, non solo nel catalogo: il salto
 * dal 2 al 3 pretende l'evidenza documentale e quello dal 3 al 4 la verifica di efficacia.
 * Senza quelle due frasi sotto gli occhi al momento di scegliere, un consulente mette 3
 * dappertutto e il documento non regge la prima ispezione.
 */
export const LIVELLI = [
  { v: 0, nome: "Assente", d: "Non attuata né pianificata." },
  { v: 1, nome: "Pianificata", d: "Definita o pianificata, non ancora attuata." },
  { v: 2, nome: "Attuata parzialmente", d: "Su una parte del perimetro, o non sistematica." },
  { v: 3, nome: "Attuata", d: "Sull'intero perimetro, con evidenza documentale." },
  { v: 4, nome: "Attuata e verificata", d: "Attuata, misurata, efficacia verificata periodicamente." },
] as const;

/** Il colore di un livello sulla scala. Token, mai valori scritti a mano. */
export const COLORE_LIVELLO: Record<number, string> = {
  0: "var(--destructive)",
  1: "var(--chart-4)",
  2: "var(--chart-3)",
  3: "var(--chart-2)",
  4: "var(--primary)",
};

export const CLASSE_NOME: Record<string, string> = {
  essenziale: "Soggetto essenziale",
  importante: "Soggetto importante",
  fuori_ambito: "Fuori ambito",
};

export const VIA_NOME: Record<string, string> = {
  criterio_specifico: "criterio specifico, indipendente dalla dimensione",
  grande_allegato_1: "grande impresa in settore ad alta criticità (Allegato I)",
  grande_allegato_2: "grande impresa in altro settore critico (Allegato II)",
  media_allegato_1: "media impresa in settore ad alta criticità (Allegato I)",
  media_allegato_2: "media impresa in altro settore critico (Allegato II)",
  sotto_soglia: "sotto le soglie dimensionali e senza criteri specifici",
  settore_non_elencato: "settore non compreso negli Allegati I e II",
  dimensione_non_dichiarata: "dimensione non ancora dichiarata",
};

export const DIMENSIONI = [
  { v: "micro", nome: "Microimpresa o piccola impresa" },
  { v: "media", nome: "Media impresa" },
  { v: "grande", nome: "Grande impresa" },
] as const;

export const STATI_CONTROLLO = [
  { v: "attuato", nome: "Attuato" },
  { v: "in_attuazione", nome: "In attuazione" },
  { v: "non_attuato", nome: "Non attuato" },
  { v: "non_applicabile", nome: "Non applicabile" },
] as const;

/**
 * Il colore di uno stato EFFETTIVO.
 *
 * ⚠️ «Da verificare» ha un colore proprio e non quello di «attuato»: e' il punto in cui il
 * modulo dice la cosa che nessun altro dice, e confonderlo con l'attuato lo renderebbe
 * invisibile — che e' esattamente il difetto che il meccanismo esiste per prevenire.
 */
export const COLORE_STATO: Record<string, string> = {
  attuato: "var(--primary)",
  da_verificare: "var(--chart-4)",
  in_attuazione: "var(--chart-3)",
  non_attuato: "var(--destructive)",
  non_applicabile: "var(--muted)",
  vuoto: "var(--border)",
};

export const ETICHETTA_STATO: Record<string, string> = {
  attuato: "Attuato",
  da_verificare: "Da verificare",
  in_attuazione: "In attuazione",
  non_attuato: "Non attuato",
  non_applicabile: "Non applicabile",
  vuoto: "Senza stato",
};

export const PRIORITA_NOME: Record<string, string> = {
  immediata: "immediata",
  alta: "alta",
  media: "media",
  programmata: "programmata",
};
