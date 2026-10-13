// Il registro dei trattamenti (art. 30): completezza e lacune di ogni trattamento.

import type { Parametri, Trattamento } from "./tipi";

/** I campi che l'art. 30.1 rende obbligatori, nell'ordine del prototipo. */
export const CAMPI_OBBLIGATORI = ["finalita", "base", "interessati", "dati", "destinatari", "conservazione", "misure"] as const;

const pieno = (v: string | null | undefined) => !!String(v ?? "").trim();

/** Quota dei campi obbligatori compilati, 0 ÷ 1. */
export function completezza(t: Trattamento): number {
  return CAMPI_OBBLIGATORI.filter((k) => pieno(t[k])).length / CAMPI_OBBLIGATORI.length;
}

/** La base è il legittimo interesse (art. 6.1.f)? */
export const legittimoInteresse = (t: Trattamento) => t.base.includes("6.1.f");

/** Quanti criteri di vaglio sono presenti. Una chiave ripetuta conta una volta. */
export const numeroCriteri = (t: Trattamento) => new Set(t.criteri).size;

/** La valutazione d'impatto è di norma necessaria (art. 35)? */
export const dpiaNecessaria = (t: Trattamento, p: Parametri) => numeroCriteri(t) >= p.sogliaDpia;

export type StatoRegistro = {
  trattamenti: number;
  conParticolari: number;
  conTrasferimento: number;
  /** Media della completezza, 0 ÷ 1; 0 se il registro è vuoto. */
  completezza: number;
  senzaBase: string[];
  senzaCondizione9: string[];
  senzaConservazione: string[];
  senzaBilanciamento: string[];
  dpiaNecessarie: string[];
  dpiaConcluse: string[];
  dpiaMancanti: string[];
  consultazionePreventiva: string[];
};

/** Il quadro del registro, con i NOMI dei trattamenti in ogni lacuna. */
export function statoRegistro(trattamenti: readonly Trattamento[], p: Parametri): StatoRegistro {
  const nomi = (f: (t: Trattamento) => boolean) => trattamenti.filter(f).map((t) => t.nome);
  const nec = (t: Trattamento) => dpiaNecessaria(t, p);
  return {
    trattamenti: trattamenti.length,
    conParticolari: trattamenti.filter((t) => t.particolari).length,
    conTrasferimento: trattamenti.filter((t) => t.trasferimento).length,
    completezza: trattamenti.length ? trattamenti.reduce((s, t) => s + completezza(t), 0) / trattamenti.length : 0,
    senzaBase: nomi((t) => !t.base),
    senzaCondizione9: nomi((t) => t.particolari && !t.condizione9),
    senzaConservazione: nomi((t) => !pieno(t.conservazione)),
    senzaBilanciamento: nomi((t) => legittimoInteresse(t) && t.bilanciamento !== "Sì"),
    dpiaNecessarie: nomi(nec),
    dpiaConcluse: nomi((t) => nec(t) && t.dpiaStato === "Conclusa"),
    dpiaMancanti: nomi((t) => nec(t) && t.dpiaStato !== "Conclusa"),
    consultazionePreventiva: nomi((t) => nec(t) && t.dpiaEsito.startsWith("Consultazione")),
  };
}
