import type { LivelloRischio } from "./tipi";

// Il rischio degli scenari del registro 4.5: probabilita' per conseguenza, come nel
// Modello 231. Le scale arrivano dal catalogo nella forma «3 - Grave», e il numero
// e' la prima cifra: si legge quello, non si confronta la stringa intera — le
// etichette cambiano, i livelli no.

/** `null` finche' non sono stati scelti entrambi i valori. */
export function livelloScenario(probabilita: string, conseguenza: string): LivelloRischio | null {
  const s = cifra(probabilita) * cifra(conseguenza);
  if (!s) return null;
  return s <= 3 ? "Basso" : s <= 7 ? "Medio" : s <= 11 ? "Alto" : "Critico";
}

function cifra(v: string | null | undefined): number {
  const m = /^\s*(\d)/.exec(String(v ?? ""));
  return m ? Number(m[1]) : 0;
}
