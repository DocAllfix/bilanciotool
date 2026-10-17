// Carica il prototipo del percorso PAS 24000 ESEGUENDOLO, e ne restituisce costanti e funzioni.
//
// È lo stesso stampo del prototipo GDPR (`carica-prototipo-gdpr.mjs`): stesse costanti, stesse
// funzioni di calcolo, stesso avvio in coda. Per questo il caricatore è lo stesso, e le ragioni
// sono scritte là: le costanti si citano a vicenda (`AREE` deriva da `GRP`, `AREE_OPT` da
// `AREE`, `REG` da `AREE_OPT`), quindi si esegue l'intero script in un solo contesto, come lo
// esegue il browser, con un DOM finto e inerte.
//
// ⚠️ La sola cosa che si TOGLIE è l'avvio `(function init(){…})();`, che riempirebbe un
// archivio che non esiste. La sostituzione si verifica: se il testo dell'avvio cambiasse, il
// caricatore si ferma invece di eseguirlo in silenzio.

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import vm from "node:vm";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
export const FONTE = join(root, "aggiuntenuovimoduli", "percorso-pas24000-v1.html");

const ESPORTATI = [
  "GRP", "AREE", "REQ", "STATI", "GUIDE", "PARTI_DEF", "RISK_DEF", "SCALA", "POLCHK", "MESI",
  "PIANO_TIPO", "SEZ", "KPI", "PARAM_DEF", "REG",
  "polModello", "norm", "nuova", "esempio",
  "conf", "liv", "rischiStat", "fornStat", "regStat", "derive", "allarmi", "stato", "dati", "num", "has", "inY",
];

/** Un oggetto che accetta qualunque lettura e scrittura senza fare niente. */
function inerte() {
  const f = function () {
    return inerte();
  };
  return new Proxy(f, {
    get: (_t, k) => (k === Symbol.toPrimitive ? () => "" : k === "then" ? undefined : inerte()),
    set: () => true,
    apply: () => inerte(),
  });
}

/**
 * Esegue il prototipo e restituisce le sue costanti e funzioni.
 * @param {{ Date?: DateConstructor, Math?: Math }} [opzioni] `Date` e `Math` sostituibili: il
 *   golden congela l'istante e rende deterministico `Math.random`, che il prototipo usa per
 *   l'identificativo dell'organizzazione.
 */
export function caricaPrototipoPas(opzioni = {}) {
  const html = readFileSync(FONTE, "utf8");
  const apre = html.lastIndexOf("<script>");
  const chiude = html.lastIndexOf("</script>");
  if (apre < 0 || chiude < apre) throw new Error("Script del prototipo non trovato");
  let codice = html.slice(apre + "<script>".length, chiude);

  const avvio = /\(function init\(\)\{[\s\S]*?\}\)\(\);\s*$/;
  if (!avvio.test(codice)) throw new Error("Avvio del prototipo non trovato: il testo e' cambiato, ricontrolla il caricatore");
  codice = codice.replace(avvio, "");
  codice += `\n;globalThis.__pas = { ${ESPORTATI.join(", ")} };\n`;

  const memoria = new Map();
  const contesto = {
    document: { querySelector: () => inerte(), querySelectorAll: () => [], addEventListener: () => {}, activeElement: null },
    window: { innerWidth: 1440, scrollY: 0, scrollTo: () => {}, addEventListener: () => {}, print: () => {} },
    localStorage: { getItem: (k) => memoria.get(k) ?? null, setItem: (k, v) => memoria.set(k, String(v)) },
    setTimeout: () => 0,
    Date: opzioni.Date ?? Date,
    Intl,
    Math: opzioni.Math ?? Math,
    JSON,
    console,
  };
  contesto.globalThis = contesto;
  vm.createContext(contesto);
  vm.runInContext(codice, contesto, { filename: "percorso-pas24000-v1.html", timeout: 10_000 });

  const p = contesto.__pas;
  for (const k of ESPORTATI) if (p[k] === undefined) throw new Error(`Il prototipo non espone ${k}`);
  return p;
}
