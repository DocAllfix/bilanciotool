import { livelloRischio, significativoAspetto } from "@/lib/calc/sgiqas/motori";

// Le colonne calcolate dei due registri che portano il valore metodologico del modulo.
//
// ⚠️ Erano CODICE MORTO. `significativoAspetto` e `livelloRischio` esistevano, erano
// provati da tredici test e non li chiamava nessuno: i due registri mostravano gravità,
// frequenza e sensibilità come tre numeri, e il verdetto — «questo aspetto è
// significativo», «questo rischio è Alto» — non compariva da nessuna parte. È il valore
// del modulo, e restava dentro le funzioni pure.
//
// ⚠️ Le stesse funzioni del server, non un'aritmetica riscritta qui: sono quelle che i
// due documenti firmati useranno per dire la stessa cosa, e due aritmetiche divergono
// alla prima correzione.

/**
 * Il gradino di una scala, che nel registro è scritto per esteso.
 *
 * ⚠️ Le opzioni sono «1 · trascurabile», non «1»: la scala si legge, e il numero da solo
 * non direbbe niente a chi compila. `Number("1 · trascurabile")` è `NaN`, quindi un
 * parsing ingenuo avrebbe letto OGNI aspetto come non valutato — e il documento firmato
 * dal datore di lavoro avrebbe dichiarato «nessun aspetto significativo» su un registro
 * pieno. Si prende la cifra iniziale.
 */
const num = (v: unknown): number | null => {
  const m = /^\s*(\d+)/.exec(String(v ?? ""));
  const n = m ? Number(m[1]) : NaN;
  return Number.isFinite(n) && n > 0 ? n : null;
};

const si = (v: unknown) => String(v ?? "").trim().toLowerCase() === "sì";

/** Per `registerId` del corpus SGI QAS. */
export const COLONNE_CALCOLATE_QAS = {
  aspetti: {
    etichetta: "Significatività",
    valore: (d: Record<string, unknown>) =>
      significativoAspetto({
        gravita: num(d.g),
        frequenza: num(d.f),
        sensibilita: num(d.s),
        condizione: String(d.cond ?? ""),
        prescrizioneLegale: si(d.legale),
        espostoPopolazione: si(d.esposto),
        superamentoLimiti: si(d.superamento),
      }),
  },
  pericoli: {
    etichetta: "Livello di rischio",
    valore: (d: Record<string, unknown>) => livelloRischio(num(d.p), num(d.g)),
  },
} as const;
