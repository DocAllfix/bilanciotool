// Carica il prototipo del percorso GDPR ESEGUENDOLO, e ne restituisce costanti e funzioni.
//
// ⚠️ PERCHE' NON `extractConst`. Le costanti di questo prototipo si citano a vicenda:
// `CAT` usa `BASI[2]` e `B9[2]`, `DOC_TIPO` usa `DOC_K[0]`, e `REQ` e' un'espressione
// eseguita subito — `(()=>{...})()` — che numera i requisiti mentre li costruisce.
// `extractConst` valuta un letterale alla volta in un contesto vuoto e si ferma alla prima
// parentesi bilanciata: `CAT` solleva, e `REQ` torna come FUNZIONE, che `JSON.stringify`
// trasforma in `undefined` e il file su disco nella stringa "undefined". Provato.
//
// Qui invece si esegue l'intero script in un solo contesto, come lo esegue il browser:
// le costanti si vedono fra loro, e ognuna vale quello che vale nel prototipo.
//
// ⚠️ IL DOM E' FINTO E INERTE. In coda lo script collega i comandi della pagina
// (`$("#brandHome").onclick = …`): un `document` che restituisce un oggetto che accetta
// qualunque proprieta' li lascia eseguire senza effetti. La sola cosa che si TOGLIE e'
// l'avvio — `(function init(){…})();` — perche' riempirebbe un archivio che non esiste.
// La sostituzione si verifica: se il testo dell'avvio cambiasse, il caricatore si ferma
// invece di eseguire l'avvio in silenzio.
//
// ⚠️ LE `const` DI PRIMO LIVELLO NON STANNO SUL GLOBALE del contesto: per farle uscire si
// aggiunge in coda una riga che le raccoglie in `globalThis.__gdpr`.

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import vm from "node:vm";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
export const FONTE = join(root, "aggiuntenuovimoduli", "percorso-gdpr-v1.html");

const ESPORTATI = [
  "GRP", "REQ", "STATI", "GUIDE", "BASI", "B9", "CRIT", "CAT", "SCALA", "RUOLI_F", "GARANZIE",
  "POLCHK", "DOC_K", "DOC_ST", "DOC_TIPO", "MESI", "PIANO_TIPO", "SEZ", "KPI", "PARAM_DEF", "REG",
  "polModello", "norm", "nuova", "esempio",
  "conf", "tComp", "isLI", "nCrit", "dpiaNec", "tratStat", "liv", "rischiStat", "needDpa", "isExtra",
  "fornStat", "dpo", "addM", "dirScad", "dirSt", "ore", "brNotif", "brSt", "regStat", "derive",
  "allarmi", "stato", "dati", "num", "has",
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
 * @param {{ Date?: DateConstructor, Math?: Math }} [opzioni] `Date` e `Math` sostituibili:
 *   il golden congela l'istante e rende deterministico `Math.random`, che il prototipo usa
 *   per l'identificativo dell'organizzazione (era l'unica riga che cambiava fra due giri).
 */
export function caricaPrototipoGdpr(opzioni = {}) {
  const html = readFileSync(FONTE, "utf8");
  const apre = html.lastIndexOf("<script>");
  const chiude = html.lastIndexOf("</script>");
  if (apre < 0 || chiude < apre) throw new Error("Script del prototipo non trovato");
  let codice = html.slice(apre + "<script>".length, chiude);

  const avvio = /\(function init\(\)\{[\s\S]*?\}\)\(\);\s*$/;
  if (!avvio.test(codice)) throw new Error("Avvio del prototipo non trovato: il testo e' cambiato, ricontrolla il caricatore");
  codice = codice.replace(avvio, "");
  codice += `\n;globalThis.__gdpr = { ${ESPORTATI.join(", ")} };\n`;

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
  vm.runInContext(codice, contesto, { filename: "percorso-gdpr-v1.html", timeout: 10_000 });

  const p = contesto.__gdpr;
  for (const k of ESPORTATI) if (p[k] === undefined) throw new Error(`Il prototipo non espone ${k}`);
  return p;
}
