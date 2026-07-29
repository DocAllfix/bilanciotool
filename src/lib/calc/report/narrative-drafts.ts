import type { Decimal } from "@/lib/calc/shared/decimal";
import type { DerivedKpi } from "./derived-kpi";

// Bozze narrative TEMPLATE-BASED (scelta di prodotto: niente AI in V1).
// Frasi parametriche compilate dai dati; dove il dato manca si scrive un
// segnaposto editoriale esplicito tra parentesi quadre, mai numeri rotti.

export const DRAFT_KEYS = ["lettera", "identita", "business", "catena", "stake", "metodo", "impegni"] as const;
export type DraftKey = (typeof DRAFT_KEYS)[number];

export type DraftContext = {
  nome: string;
  anno: number;
  settore?: string;
  sede?: string;
  dipendenti?: string;
  materialiCount: number;
  totalTopics: number;
  soglia: number;
  standard: string;
  derived: DerivedKpi;
};

const fmt = (d: Decimal, dec = 1): string =>
  d.toNumber().toLocaleString("it-IT", { minimumFractionDigits: 0, maximumFractionDigits: dec });

const oppure = (v: string | undefined, segnaposto: string): string => (v?.trim() ? v.trim() : `[${segnaposto}]`);

export function generateDraft(key: DraftKey, c: DraftContext): string {
  const d = c.derived;
  const emissioni = d.totScope12Loc.gt(0)
    ? `Le emissioni dirette e da energia importata dell'esercizio ammontano a ${fmt(d.totScope12Loc, 2)} tonnellate di CO₂ equivalente.`
    : "[Inserire il dato delle emissioni una volta compilata la sezione energia.]";

  switch (key) {
    case "lettera":
      return (
        `Con questo documento ${c.nome} presenta il proprio bilancio di sostenibilità per l'esercizio ${c.anno}. ` +
        `È il racconto di come l'azienda genera valore prendendosi cura delle persone, dell'ambiente e del territorio in cui opera. ` +
        `La rendicontazione nasce da un percorso strutturato di raccolta dei dati e di ascolto: non un adempimento, ma uno strumento di gestione. ` +
        `[Aggiungere qui i fatti salienti dell'anno e l'impegno della direzione per il prossimo esercizio.]`
      );
    case "identita":
      return (
        `${c.nome} opera nel settore ${oppure(c.settore, "indicare il settore")}, con sede a ${oppure(c.sede, "indicare la sede")}. ` +
        `Al 31 dicembre ${c.anno} l'organico conta ${oppure(c.dipendenti, "n.")} dipendenti` +
        (d.pctDonne.gt(0) ? `, con una presenza femminile del ${fmt(d.pctDonne)}%.` : ".") +
        ` [Completare con la storia dell'azienda, le tappe principali e i mercati serviti.]`
      );
    case "business":
      return (
        `Il modello di business di ${c.nome} trasforma competenze, materiali ed energia in valore per i clienti. ` +
        emissioni +
        (d.energiaTotaleKwh.gt(0)
          ? ` Il fabbisogno energetico complessivo dell'esercizio è stato di ${fmt(d.energiaTotaleKwh, 0)} kWh` +
            (d.pctRinnovabile.gt(0) ? `, coperto per il ${fmt(d.pctRinnovabile)}% da fonti rinnovabili.` : ".")
          : "") +
        ` [Descrivere input, attività chiave, prodotti e clienti serviti.]`
      );
    case "catena":
      return (
        `La catena del valore di ${c.nome} si estende a monte verso i fornitori di materiali e servizi e a valle verso i clienti e il fine vita dei prodotti. ` +
        (d.pctFornitoriLocali.gt(0)
          ? `Il ${fmt(d.pctFornitoriLocali)}% dei fornitori attivi ha sede in Italia. `
          : "") +
        `[Descrivere le categorie di fornitura principali, la provenienza geografica e i canali di vendita.]`
      );
    case "stake":
      return (
        `L'analisi di materialità ha coinvolto la direzione e i principali portatori di interesse: persone che lavorano in azienda, clienti, fornitori, istituti di credito e comunità locale. ` +
        `${c.materialiCount > 0 ? `Dall'analisi sono emersi ${c.materialiCount} temi materiali su ${c.totalTopics} valutati.` : `[Completare la valutazione dei ${c.totalTopics} temi al passo 2.]`} ` +
        `[Indicare come sono stati ascoltati gli stakeholder: incontri, questionari, riesame della direzione.]`
      );
    case "metodo":
      return (
        `Il presente bilancio è redatto secondo lo standard ${c.standard}. ` +
        `L'analisi di doppia rilevanza ha esaminato ${c.totalTopics} temi, valutati su una scala 1–5 per rilevanza d'impatto e finanziaria, con soglia di materialità fissata a ${String(c.soglia).replace(".", ",")}. ` +
        emissioni +
        ` Le emissioni sono calcolate secondo il GHG Protocol, con Scope 2 rendicontato sia location-based sia market-based. ` +
        `I dati si riferiscono all'esercizio ${c.anno}, con confronto sull'esercizio precedente ove disponibile.`
      );
    case "impegni":
      return (
        `Per il prossimo triennio ${c.nome} intende consolidare il percorso avviato: migliorare la qualità dei dati raccolti, ridurre i consumi energetici e le emissioni` +
        (d.indiceFrequenza.gt(0) ? `, e rafforzare la prevenzione con l'obiettivo di ridurre l'indice di frequenza infortuni (oggi ${fmt(d.indiceFrequenza, 2)}).` : ` e rafforzare la prevenzione degli infortuni.`) +
        ` [Elencare gli obiettivi quantitativi con anno base e traguardo, coerenti con il passo 4.]`
      );
  }
}
