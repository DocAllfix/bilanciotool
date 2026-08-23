// Il rischio dei reati presupposto, a due stadi.
//
// Primo stadio: probabilità × impatto → rischio INERENTE, cioè quanto pesa lo scenario
// se nessuno facesse niente. Secondo stadio: il rischio inerente incrocia l'adeguatezza
// dei presidi e produce il rischio RESIDUO, cioè quanto pesa davvero.
//
// Uno «scenario» è una coppia processo × reato: lo stesso reato pesa diversamente a
// seconda del processo in cui può essere commesso.

export type Livello = "Basso" | "Medio" | "Alto" | "Critico";

/** Le scale arrivano dal catalogo nella forma «3 · grave»: conta la prima cifra. */
function cifra(v: string | null | undefined): number {
  const m = /^\s*(\d)/.exec(String(v ?? ""));
  return m ? Number(m[1]) : 0;
}

/** `null` finché non sono stati scelti ENTRAMBI i valori. */
export function rischioInerente(probabilita: string, impatto: string): Livello | null {
  const p = cifra(probabilita) * cifra(impatto);
  if (!p) return null;
  return p <= 3 ? "Basso" : p <= 7 ? "Medio" : p <= 11 ? "Alto" : "Critico";
}

/**
 * La matrice del secondo stadio.
 *
 * ⚠️ Le righe «Critico» e «Alto» sono IDENTICHE, e non è una svista da raffinare: con
 * presidi adeguati entrambi scendono a Medio, con presidi parziali entrambi restano
 * Alto. La distinzione fra i due la fa il primo stadio, non questo.
 */
const MATRICE: Record<Livello, Record<string, Livello>> = {
  Critico: { Assenti: "Critico", Parziali: "Alto", Adeguati: "Medio" },
  Alto: { Assenti: "Critico", Parziali: "Alto", Adeguati: "Medio" },
  Medio: { Assenti: "Alto", Parziali: "Medio", Adeguati: "Basso" },
  Basso: { Assenti: "Medio", Parziali: "Basso", Adeguati: "Basso" },
};

/**
 * `null` finché il rischio inerente non è determinato.
 *
 * ⚠️ Presidi NON dichiarati valgono «Assenti», non «da valutare». In materia 231
 * l'onere è dell'ente: presidi che nessuno ha dichiarato sono presidi che non
 * risultano. Trattarli come incogniti abbasserebbe il rischio residuo proprio di chi
 * non ha compilato niente.
 */
export function rischioResiduo(probabilita: string, impatto: string, adeguatezza: string): Livello | null {
  const i = rischioInerente(probabilita, impatto);
  if (!i) return null;
  return MATRICE[i][adeguatezza || "Assenti"] ?? null;
}

/**
 * Uno scenario è accettabile solo se il residuo è Basso o Medio.
 *
 * ⚠️ Uno scenario NON valutato non è accettabile. Aggiungere un reato al modello
 * peggiora il cruscotto finché non lo si valuta, ed è voluto: un rischio non misurato
 * non è un rischio assente.
 */
export function accettabile(probabilita: string, impatto: string, adeguatezza: string): boolean {
  const r = rischioResiduo(probabilita, impatto, adeguatezza);
  return r === "Basso" || r === "Medio";
}

const ORDINE: Livello[] = ["Basso", "Medio", "Alto", "Critico"];

/**
 * Il livello di un processo è il PEGGIORE dei suoi scenari, non la media.
 *
 * Un processo con nove scenari bassi e uno critico è un processo critico: mediare
 * nasconderebbe proprio ciò che il modello deve far vedere.
 */
export function livelloDelProcesso(residui: readonly (Livello | null)[]): Livello | null {
  const validi = residui.filter((r): r is Livello => r !== null);
  if (!validi.length) return null;
  return ORDINE[Math.max(...validi.map((r) => ORDINE.indexOf(r)))]!;
}
