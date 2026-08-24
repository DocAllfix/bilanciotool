// Estrae le costanti metodologiche DIRETTAMENTE dal sorgente dei prototipi HTML
// (zero trascrizione manuale = zero errori di copiatura) e le scrive come JSON
// in src/lib/db/seeds/data/. Rilanciabile: sovrascrive i JSON in modo deterministico.
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import vm from "node:vm";
import { registri } from "./estrai-registri.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const outDir = join(root, "src", "lib", "db", "seeds", "data");
mkdirSync(outDir, { recursive: true });

// Ritaglia il blocco `const NAME = ...;` dal sorgente e lo valuta in un sandbox.
// Gli spazi attorno all'uguale sono facoltativi: i prototipi GHG e Bilancio scrivono
// `const CAT=`, quelli di supplier e SoA `const Q = `.
function extractConst(source, name) {
  const decl = new RegExp(`const\\s+${name}\\s*=`).exec(source);
  if (!decl) throw new Error(`Costante ${name} non trovata`);
  // Fine del literal: la parentesi che riporta la profondità a zero. Se la
  // dichiarazione prosegue (es. `const C = [...].map(...)`) la coda viene
  // scartata di proposito: al seed servono le righe grezze, non i derivati.
  const inizio = decl.index + decl[0].length;
  let i = inizio;
  let depth = 0;
  let inStr = null;
  for (; i < source.length; i++) {
    const ch = source[i];
    if (inStr) {
      if (ch === "\\") i++;
      else if (ch === inStr) inStr = null;
      continue;
    }
    if (ch === '"' || ch === "'" || ch === "`") inStr = ch;
    else if (ch === "[" || ch === "{" || ch === "(") depth++;
    else if (ch === "]" || ch === "}" || ch === ")") {
      depth--;
      if (depth === 0) break;
    }
  }
  if (depth !== 0) throw new Error(`Literal di ${name} non chiuso`);
  const literal = source.slice(inizio, i + 1);
  return vm.runInNewContext(`(${literal})`, {}, { timeout: 5000 });
}

// ─────────────────────────────────────────────────────────────────────────────
// I SEI MODULI DI CONFORMITÀ: il corpus sta in un blob JSON, non in una `const`.
//
// I prototipi di `aggiuntenuovimoduli/` mettono tutto il contenuto in
// `<script type="application/json" id="corpus">`. È una via più semplice di
// `extractConst`: il JSON è già valido, non serve valutarlo in un sandbox.

/** Ritaglia e parsa un blob `<script type="application/json" id="NOME">`. */
function extractJsonBlob(source, id) {
  // Niente espressione regolare: l'ordine degli attributi cambia da un prototipo
  // all'altro e un confine di parola scritto male in un template literal diventa
  // il carattere di backspace invece del confine -- succede in silenzio, e la
  // ricerca non trova mai niente. Si parte dall'attributo e si cammina.
  for (const virgolette of ['"', "'"]) {
    const attr = `id=${virgolette}${id}${virgolette}`;
    const pos = source.indexOf(attr);
    if (pos < 0) continue;
    const apre = source.lastIndexOf("<script", pos);
    const chiude = source.indexOf(">", pos);
    if (apre < 0 || chiude < 0) continue;
    // L'attributo deve stare DENTRO il tag che si e' trovato, non in uno successivo.
    if (source.slice(apre, chiude).includes("</script>")) continue;
    const fine = source.indexOf("</script>", chiude);
    if (fine < 0) throw new Error(`Blob JSON «${id}» non chiuso`);
    return JSON.parse(source.slice(chiude + 1, fine));
  }
  throw new Error(`Blob JSON «${id}» non trovato`);
}


// ── B7: la chiave stabile di un blocco ───────────────────────────────────────
//
// Nei prototipi le personalizzazioni del testo sono indicizzate per POSIZIONE
// nell'array dei blocchi (`ovr[7]`). È la trappola più insidiosa del lotto: se
// il corpus viene riestratto e un blocco si sposta, tutte le personalizzazioni
// di tutti i clienti scivolano sul blocco sbagliato — in silenzio, senza errori.
//
// La chiave si deriva dal CONTENUTO del blocco, non dalla sua posizione: la
// stessa sorgente produce sempre gli stessi identificativi, anche se un domani
// l'estrattore cambia e sposta qualcosa.
//
// Correggere un refuso nel corpus cambia la chiave, ed è corretto così: un
// refuso corretto è un contenuto nuovo, quindi un `content_set` nuovo, e chi ha
// iniziato sulla versione precedente la tiene fino alla fine — è il modello che
// il prodotto applica già a tutti i cataloghi metodologici.
//
// FNV-1a e non `node:crypto`: qui basta un identificativo breve e deterministico,
// non una garanzia crittografica. Nessuno firma niente con questo.
function fnv1a(s) {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return (h >>> 0).toString(16).padStart(8, "0");
}

/**
 * Aggiunge `id` a ogni blocco di un documento.
 *
 * Il suffisso serve ai blocchi genuinamente identici — due riquadri firma vuoti
 * nello stesso documento hanno lo stesso contenuto e devono restare distinti.
 */
function conIdBlocchi(blocks) {
  const visti = new Map();
  return blocks.map((b) => {
    const base = fnv1a(JSON.stringify(b));
    const n = (visti.get(base) ?? 0) + 1;
    visti.set(base, n);
    return { id: n === 1 ? base : `${base}-${n}`, ...b };
  });
}

/**
 * Normalizza il corpus di un modulo di conformità nella forma comune.
 *
 * `pro` e `mod` sono mappe per codice con l'ordine in un array separato: qui
 * diventano array ordinati, perché in SQL l'ordine è una colonna e la mappa
 * non serve più.
 *
 * `ordPro`/`ordMod` mancano in SA8000, che li ricava ordinando le chiavi: il
 * fallback fa lo stesso, così la funzione vale per tutti e sei.
 */
function normalizzaCorpus(corpus) {
  const ordine = (mappa, dichiarato) => dichiarato ?? Object.keys(mappa).sort();
  const procedure = ordine(corpus.pro, corpus.ordPro).map((code, i) => ({
    code,
    ...corpus.pro[code],
    ordine: i + 1,
    blocks: conIdBlocchi(corpus.pro[code].blocks),
  }));
  const moduli = ordine(corpus.mod, corpus.ordMod).map((code, i) => ({
    code,
    ...corpus.mod[code],
    ordine: i + 1,
    blocks: conIdBlocchi(corpus.mod[code].blocks),
  }));
  return { procedure, moduli };
}

const ghgHtml = readFileSync(join(root, "archivio", "gestionale-ghg-14064.html"), "utf8");
const bilHtml = readFileSync(join(root, "archivio", "percorso-bilancio-v4.html"), "utf8");
const eneHtml = readFileSync(join(root, "archivio", "bilancio-energetico-v1.html"), "utf8");
const supHtml = readFileSync(join(root, "archivio", "esg-supplier-ready.html"), "utf8");
const soaHtml = readFileSync(join(root, "archivio", "soa-iso27001.html"), "utf8");

const out = {
  // Prototipo GHG (ISO 14064-1)
  "ghg-categories.json": extractConst(ghgHtml, "CAT"),
  "ghg-sources.json": extractConst(ghgHtml, "SRC"),
  "ghg-emission-factors.json": extractConst(ghgHtml, "FE_LIB"),
  "ghg-dq-levels.json": extractConst(ghgHtml, "DQ"),
  "ghg-gwp-sets.json": extractConst(ghgHtml, "GWP_SET"),
  "ghg-checklist.json": extractConst(ghgHtml, "VER"),
  // Prototipo Bilancio (GRI/ESRS)
  "report-topics.json": extractConst(bilHtml, "TOPICS"),
  "report-topic-guides.json": extractConst(bilHtml, "GUIDE"),
  "report-scales.json": extractConst(bilHtml, "SCALA"),
  "report-kpi-sections.json": extractConst(bilHtml, "SEZ"),
  "report-kpi.json": extractConst(bilHtml, "KPI"),
  "report-narrative-templates.json": extractConst(bilHtml, "NARR"),
  "report-conversion-factors.json": extractConst(bilHtml, "FATTORI_DEF"),
  // Prototipo Bilancio energetico (EN 16247 / ISO 50001)
  "energy-vectors.json": extractConst(eneHtml, "VETTORI"),
  "energy-vector-factors.json": extractConst(eneHtml, "FATTORI_DEF"),
  "energy-areas.json": extractConst(eneHtml, "AREE"),
  "energy-end-uses.json": extractConst(eneHtml, "USI"),
  "energy-end-uses-default.json": extractConst(eneHtml, "USI_DEF"),
  "energy-use-guides.json": extractConst(eneHtml, "GU"),
  "energy-methods.json": extractConst(eneHtml, "METODI"),
  "energy-drivers.json": extractConst(eneHtml, "DRIVER"),
  "energy-narrative-templates.json": extractConst(eneHtml, "NARR"),
  // ENPI contiene valori-funzione (le formule): JSON.stringify li scarta in
  // silenzio, lasciando esattamente il catalogo di etichette che serve. Le
  // formule vivono in src/lib/calc/energy/indicators.ts e un test verifica che
  // catalogo e registro abbiano le stesse chiavi.
  "energy-indicators.json": extractConst(eneHtml, "ENPI"),
  // Prototipo ESG Supplier Ready (ESRS / GRI / ISO 20400)
  "supplier-areas.json": extractConst(supHtml, "PILLARS"),
  "supplier-questions.json": extractConst(supHtml, "Q"),
  "supplier-bands.json": extractConst(supHtml, "BANDS"),
  "supplier-effort.json": extractConst(supHtml, "EFFORT"),
  // Prototipo SoA (ISO/IEC 27001 e moduli estesi). `C` termina con `.map(...)`
  // che aggiunge fw e la chiave incollata: l'estrattore si ferma al literal e
  // scarta la coda, che è esattamente quello che serve — la sezione basta a
  // ricavare il quadro, e la chiave incollata qui non la vogliamo.
  "soa-frameworks.json": extractConst(soaHtml, "FW"),
  "soa-sections.json": extractConst(soaHtml, "SEC"),
  "soa-controls.json": extractConst(soaHtml, "C"),
  "soa-states.json": extractConst(soaHtml, "ST"),
  "soa-motivations.json": extractConst(soaHtml, "MOT"),
  "soa-bands.json": extractConst(soaHtml, "BANDS"),
};

// I sei prototipi di conformita'. Il corpus e' comune (procedure + moduli con
// blocchi); ogni modulo aggiunge le proprie collezioni di dominio.
const CONFORMITA = [
  { dom: "mog231", file: "mog-231-v1.html", extra: ["capi", "req", "reati", "fam"] },
  { dom: "iso37001", file: "sgpc-iso37001-v1.html", extra: ["capi", "req"] },
  { dom: "sgiqas", file: "sgi-qas-v1.html", extra: ["capi", "req", "norme"] },
  { dom: "sa8000", file: "sgs-sa8000-2026-v1.html", extra: [], criteri: true },
  // ⚠️ Le quattro dimensioni, le sette aree e i cinque fattori aggravanti della
  // filiera NON stanno nel blob del corpus: sono `const` nel sorgente, come i
  // cataloghi della SoA. Si estraggono da lì, non si riscrivono a mano.
  { dom: "filiera", file: "due-diligence-filiera-v1.html", extra: ["fasi"], consts: { dim: "DIM", aree: "AREE", flags: "FLAGS" } },
  { dom: "wb", file: "whistleblowing-v1.html", extra: ["capi", "req"] },
];

const outCorpus = {};
for (const m of CONFORMITA) {
  const html = readFileSync(join(root, "aggiuntenuovimoduli", m.file), "utf8");
  const corpus = extractJsonBlob(html, "corpus");
  const { procedure, moduli } = normalizzaCorpus(corpus);
  outCorpus[`${m.dom}-registri.json`] = registri(html);
  outCorpus[`${m.dom}-procedures.json`] = procedure;
  outCorpus[`${m.dom}-modules.json`] = moduli;
  for (const k of m.extra) {
    if (corpus[k] === undefined) throw new Error(`${m.dom}: collezione «k=${k}» assente dal corpus`);
    outCorpus[`${m.dom}-${k}.json`] = corpus[k];
  }
  // SA8000/2026 ha un SECONDO blob: i 112 criteri della norma, con i gruppi, le
  // sezioni e la mappa criterio -> procedure. Dieci criteri su 112 ne toccano
  // due, quindi in SQL serve una tabella ponte vera, non una colonna.
  for (const [k, nome] of Object.entries(m.consts ?? {})) {
    outCorpus[`${m.dom}-${k}.json`] = extractConst(html, nome);
  }
  if (m.criteri) {
    const c = extractJsonBlob(html, "criteri");
    for (const k of ["crit", "grp", "sez", "map"]) outCorpus[`${m.dom}-${k}.json`] = c[k];

    // ⚠️ E ANCHE la forma normalizzata che il seme legge davvero.
    //
    // Le tre collezioni del blob sono mappe con chiavi corte (`s`, `c`, `t`), e il seme
    // vuole array con nome, sezione e ordine. Per una versione questa conversione era
    // stata fatta a mano, una volta sola: rilanciare l'estrattore rigenerava
    // `sa8000-crit.json` mentre il seme continuava a leggere `sa8000-criteri.json`,
    // fermo alla prima estrazione. Il difetto non si sarebbe visto — solo un catalogo
    // vecchio, coi conteggi giusti, che nessun test avrebbe potuto smentire.
    outCorpus[`${m.dom}-sezioni.json`] = Object.entries(c.sez).map(([key, nome], ordine) => ({
      key, nome, ordine,
    }));
    outCorpus[`${m.dom}-gruppi.json`] = Object.entries(c.grp).map(([key, nome], ordine) => ({
      key, sezione: key.slice(0, 1), nome, ordine,
    }));
    outCorpus[`${m.dom}-criteri.json`] = c.crit.map((k, ordine) => ({
      key: k.c, sezione: k.s, testo: k.t, procedure: c.map[k.c] ?? [], ordine,
    }));
  }
}

for (const [file, data] of Object.entries(out)) {
  writeFileSync(join(outDir, file), JSON.stringify(data, null, 1) + "\n");
  const n = Array.isArray(data) ? data.length : Object.keys(data).length;
  console.log(`${file}: ${n} elementi`);
}

// Il corpus si scrive con UN ELEMENTO PER RIGA, non con l'indentazione a uno
// spazio degli altri cataloghi: sono oltre 400 documenti di prosa normativa e
// l'indentazione profonda ne raddoppierebbe il peso senza che nessuno li legga
// a mano. Una procedura per riga tiene leggibili le differenze di git -- si vede
// QUALE documento e' cambiato -- senza l'esplosione.
const perRiga = (d) =>
  Array.isArray(d)
    ? "[\n" + d.map((x) => JSON.stringify(x)).join(",\n") + "\n]\n"
    : JSON.stringify(d, null, 1) + "\n";

console.log("\n--- corpus dei moduli di conformita' ---");
for (const [file, data] of Object.entries(outCorpus)) {
  writeFileSync(join(outDir, file), perRiga(data));
  const n = Array.isArray(data) ? data.length : Object.keys(data).length;
  console.log(`${file}: ${n} elementi`);
}
