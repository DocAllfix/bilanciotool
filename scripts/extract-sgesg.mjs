// Estrae le 63 schede del metodo ESG **eseguendo** i componenti di `esg-nexus-v2`.
//
// ⚠️ ESEGUENDO, non leggendo il sorgente con una regex. È la regola che questo progetto
// ha già pagato per i golden dei prototipi: un'estrazione a mano o per pattern è una
// copia che smette di somigliare all'originale al primo aggiornamento, in silenzio.
//
// Il pezzo che rende l'esecuzione indispensabile è la CHIAVE DEL DATO. Nei componenti sta
// dentro una chiusura:
//
//     <Input value={d?.canale} onChange={v => updateField("canale", v)} />
//
// Non è una prop leggibile: è il primo argomento di una chiamata che avviene solo se
// qualcuno preme il campo. Quindi l'estrattore **chiama `onChange`** con un valore
// sentinella e lascia che sia lo stub di `updateField` a registrare la chiave. Nessuna
// regex avrebbe retto ai casi in cui la chiave è composta o l'onChange fa due cose.
//
//   node scripts/extract-sgesg.mjs
//
// Sorgente: C:\Users\user\riferimenti\esg-nexus-v2 (clonata in sola lettura, MAI
// modificata: i pattern si adattano, il codice non si copia).

import { readdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import vm from "node:vm";
import * as esbuild from "esbuild";

const SORGENTE = "C:/Users/user/riferimenti/esg-nexus-v2/src/components/engagement";
const USCITA = "src/lib/db/seeds/data/sgesg-schede.json";

if (!existsSync(SORGENTE)) {
  console.error(`Sorgente non trovata: ${SORGENTE}`);
  console.error("Clona la repo di riferimento in sola lettura:");
  console.error("  git clone --depth 1 https://github.com/DocAllfix/esg-nexus-v2.git");
  process.exit(1);
}

// ─── il vocabolario dei campi, come marcatori ────────────────────────────────
const marca = (nome) => {
  const f = () => null;
  f.__nome = nome;
  return f;
};
const FormWrapper = marca("FormWrapper");
const PRIMITIVE = Object.fromEntries(
  ["FormSection", "Field", "Input", "Textarea", "Select", "RadioGroup", "CheckboxGroup", "CellInput", "CellSelect", "StatusPill"].map(
    (n) => [n, marca(n)],
  ),
);

/**
 * La factory del transform JSX: costruisce un albero di oggetti, non DOM.
 *
 * ⚠️ Si chiama `__jsx` e non `h`, ed e' una correzione pagata. Due schede fanno
 * `.map((h) => <th key={h}>…)`: quel parametro OSCURA la factory, esbuild lo rinomina in
 * `h2` e rinomina anche la chiamata della factory dentro quello scope, producendo
 * `h2("th", …)`. Risultato: «h2 is not a function» su due file, per un nome scelto male.
 */
function __jsx(type, props, ...figli) {
  return { type, props: { ...(props ?? {}), children: figli.length === 1 ? figli[0] : figli } };
}
const __frag = marca("Fragment");

/** Le chiavi che i campi della scheda in corso hanno dichiarato chiamando `updateField`. */
let chiaviViste = [];

// ⚠️ `__esModule: true` su OGNI modulo finto, e non e' un dettaglio: esbuild avvolge le
// `require` con `__toESM`, che senza quel segno considera il modulo un CommonJS legacy e
// fa diventare il `default` **l'intero oggetto modulo**. Il risultato e' che
// `<FormWrapper>` produceva un nodo il cui `type` non era la mia funzione marcata, e
// l'estrattore riferiva «nessun FormWrapper nell'albero» su tutte e 63 le schede.
function moduloFinto(spec) {
  if (spec.includes("FormWrapper")) {
    return { __esModule: true, default: FormWrapper, ...PRIMITIVE, STATO_ROW_CLASS: "", STATO_SELECT_CLASS: "" };
  }
  if (spec.includes("useFormData")) {
    // ⚠️ Un Proxy e non un oggetto con un nome solo: una scheda importa
    // `useFormDataReadonly`, e un modulo che espone il solo `useFormData` la fa morire
    // con «non e' una funzione». I nomi degli hook del progetto d'origine non sono
    // affar nostro: si risponde a tutti.
    return new Proxy(
      { __esModule: true },
      {
        get: (t, nome) =>
          nome in t
            ? t[nome]
            : () => ({
                data: {},
                status: null,
                // ⚠️ Il cuore dell'estrazione: la chiave arriva qui, chiamando.
                updateField: (chiave) => chiaviViste.push(String(chiave)),
                updateStatus: () => {},
                saveForm: () => {},
                isSaving: false,
                loading: false,
                error: null,
              }),
      },
    );
  }
  if (/^@\/hooks\//.test(spec) || spec.includes("useEngagement")) {
    // Gli altri hook del progetto d'origine (cataloghi, IRO, KPI...): rispondono con una
    // forma che si puo' destrutturare in tutti i modi in cui una scheda potrebbe farlo.
    // Restituire `null` faceva morire l'estrazione su `const { data } = useCatalogoIro()`.
    return new Proxy(
      { __esModule: true },
      { get: (t, nome) => (nome in t ? t[nome] : () => rispostaSicura()) },
    );
  }
  if (spec === "react") {
    return {
      __esModule: true,
      useState: (iniziale) => [typeof iniziale === "function" ? iniziale() : iniziale, () => {}],
      useMemo: (fn) => fn(),
      useRef: () => ({ current: null }),
      useCallback: (fn) => fn,
      useEffect: () => {},
      default: {},
    };
  }
  // Icone e utilità: qualunque nome restituisce un marcatore innocuo.
  return new Proxy(
    {},
    {
      get: (_t, nome) => {
        if (nome === "__esModule") return true;
        if (nome === "cn") return (...c) => c.filter(Boolean).join(" ");
        if (nome === "default") return marca(String(nome));
        return marca(String(nome));
      },
    },
  );
}

/** Una risposta che si lascia destrutturare comunque la si chieda. */
function rispostaSicura() {
  const vuoti = new Set(["isLoading", "loading", "isSaving", "isPending", "isError"]);
  const nulli = new Set(["error", "status", "data"]);
  return new Proxy(
    {},
    {
      get: (_t, nome) => {
        if (vuoti.has(String(nome))) return false;
        if (nome === "data") return [];
        if (nulli.has(String(nome))) return null;
        if (nome === Symbol.iterator) return undefined;
        return () => undefined;
      },
    },
  );
}

/** Esegue un file `.jsx` e restituisce il suo export default. */
function componenteDi(percorso) {
  const sorgente = readFileSync(percorso, "utf8");
  const { code } = esbuild.transformSync(sorgente, {
    loader: "jsx",
    format: "cjs",
    jsx: "transform",
    jsxFactory: "__jsx",
    jsxFragment: "__frag",
    target: "node20",
  });
  const modulo = { exports: {} };
  const contesto = vm.createContext({
    __jsx,
    __frag,
    module: modulo,
    exports: modulo.exports,
    require: moduloFinto,
    console,
  });
  vm.runInContext(code, contesto, { filename: percorso });
  return modulo.exports.default ?? modulo.exports;
}

// ─── lettura dell'albero ─────────────────────────────────────────────────────
const figli = (n) => {
  const c = n?.props?.children;
  return c === undefined || c === null ? [] : Array.isArray(c) ? c.flat(Infinity) : [c];
};
const eNodo = (n) => n && typeof n === "object" && "type" in n;
const eMarcato = (n, nome) => eNodo(n) && typeof n.type === "function" && n.type.__nome === nome;

/** Il testo dentro un nodo, per le etichette che arrivano come frammenti. */
function testo(n) {
  if (n === null || n === undefined || typeof n === "boolean") return "";
  if (typeof n === "string" || typeof n === "number") return String(n);
  if (Array.isArray(n)) return n.map(testo).join("");
  if (eNodo(n)) return testo(n.props?.children);
  return "";
}

const TIPO = {
  Input: (p) => (p.type === "date" ? "data" : p.type === "number" ? "numero" : "testo"),
  Textarea: () => "testo_lungo",
  Select: () => "scelta",
  RadioGroup: () => "scelta",
  CheckboxGroup: () => "scelte",
  CellInput: (p) => (p.type === "number" ? "numero" : "testo"),
  CellSelect: () => "scelta",
};

/** Chiave stabile derivata da un'etichetta, quando il controllo non ne dichiara una. */
function slug(etichetta) {
  return (
    etichetta
      .toLowerCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "")
      .slice(0, 60) || "campo"
  );
}

/** Percorre un sottoalbero e raccoglie i campi che incontra. */
function campiIn(nodo, dentro = []) {
  for (const n of Array.isArray(nodo) ? nodo.flat(Infinity) : [nodo]) {
    if (!eNodo(n)) continue;
    if (eMarcato(n, "Field")) {
      const etichetta = testo(n.props.label).trim();
      // La chiave si scopre CHIAMANDO l'onChange del controllo dentro il campo.
      const prima = chiaviViste.length;
      let tipo = "testo";
      let opzioni = [];
      for (const c of Array.isArray(n.props.children) ? n.props.children.flat(Infinity) : [n.props.children]) {
        if (!eNodo(c) || typeof c.type !== "function") continue;
        const nome = c.type.__nome;
        if (!TIPO[nome]) continue;
        tipo = TIPO[nome](c.props ?? {});
        const o = c.props?.options;
        if (Array.isArray(o)) {
          opzioni = o.map((x) => (typeof x === "string" ? x : (x?.label ?? x?.value ?? String(x)))).filter(Boolean);
        }
        try {
          c.props?.onChange?.("__estrazione__");
        } catch {
          /* un onChange che fa altro non deve fermare l'estrazione */
        }
      }
      const nuove = chiaviViste.slice(prima);
      // ⚠️ Nove campi su 322 non dichiarano una chiave, perche' il loro controllo e' su
      // misura e non passa da `updateField`. Per quelli la chiave si DERIVA
      // dall'etichetta, e la derivazione e' dichiarata nel dato (`d: 1`) invece che
      // nascosta: chi legge il seme deve sapere quali chiavi vengono dal progetto
      // d'origine e quali le abbiamo composte noi. Una collisione ferma l'estrazione —
      // due campi con la stessa chiave nella stessa scheda si sovrascriverebbero a
      // vicenda, e il secondo cancellerebbe il primo in silenzio.
      const derivata = !nuove[0];
      dentro.push({
        k: nuove[0] ?? slug(etichetta),
        ...(derivata ? { d: 1 } : {}),
        l: etichetta,
        t: tipo,
        ...(n.props.required ? { r: 1 } : {}),
        ...(n.props.span ? { w: Number(n.props.span) } : {}),
        ...(opzioni.length ? { o: opzioni } : {}),
      });
      continue;
    }
    campiIn(figli(n), dentro);
  }
  return dentro;
}

function sezioniIn(nodo, dentro = []) {
  for (const n of Array.isArray(nodo) ? nodo.flat(Infinity) : [nodo]) {
    if (!eNodo(n)) continue;
    if (eMarcato(n, "FormSection")) {
      dentro.push({ t: testo(n.props.title).trim(), c: campiIn(figli(n)) });
      continue;
    }
    sezioniIn(figli(n), dentro);
  }
  return dentro;
}

function trovaWrapper(nodo) {
  for (const n of Array.isArray(nodo) ? nodo.flat(Infinity) : [nodo]) {
    if (!eNodo(n)) continue;
    if (eMarcato(n, "FormWrapper")) return n;
    const dentro = trovaWrapper(figli(n));
    if (dentro) return dentro;
  }
  return null;
}

// ─── giro su tutte le schede ─────────────────────────────────────────────────
const cartelle = readdirSync(SORGENTE, { withFileTypes: true })
  .filter((d) => d.isDirectory() && /^TabProc\d\d$/.test(d.name))
  .map((d) => d.name)
  .sort();

const schede = [];
const problemi = [];

for (const cartella of cartelle) {
  const fase = "proc" + cartella.slice(-2);
  const file = readdirSync(join(SORGENTE, cartella))
    .filter((f) => /^Form.*\.jsx$/.test(f))
    .sort();
  for (const f of file) {
    const percorso = join(SORGENTE, cartella, f);
    chiaviViste = [];
    try {
      const C = componenteDi(percorso);
      if (typeof C !== "function") throw new Error("nessun componente esportato");
      const albero = C({ engagementId: "estrazione" });
      const w = trovaWrapper(albero);
      if (!w) throw new Error("nessun FormWrapper nell'albero");
      const sezioni = sezioniIn(figli(w));
      schede.push({
        f: fase,
        k: f.replace(/^Form|\.jsx$/g, ""),
        c: w.props.formCode ?? null,
        t: testo(w.props.title).trim(),
        s: testo(w.props.subtitle).trim() || null,
        i: typeof w.props.ruleBox === "string" ? w.props.ruleBox : null,
        z: sezioni,
      });
    } catch (e) {
      problemi.push(`${cartella}/${f}: ${e.message}`);
    }
  }
}

const derivate = schede.reduce((n, s) => n + s.z.reduce((m, z) => m + z.c.filter((c) => c.d).length, 0), 0);

// ⚠️ Due campi con la stessa chiave non sono un errore da correggere: sono il SEGNO che
// quella scheda ha una struttura ripetuta — una tabella, un elenco di righe — e non un
// insieme di campi indipendenti. In `05A` sei campi scrivono tutti dentro l'array
// `pilastri`, uno per pilastro E/S/G; nel modello piatto si sovrascriverebbero a vicenda,
// e il secondo cancellerebbe il primo in silenzio.
//
// Quindi la collisione CLASSIFICA invece di fermare: la scheda diventa «con logica», i
// suoi campi non si seminano come indipendenti, e restano titolo, sezioni e istruzioni —
// cioe' abbastanza perche' l'interfaccia dica di che si tratta e che la compilazione
// arriva con un lavoro dedicato. E' lo stesso confine che il piano aveva gia' tracciato.
for (const s of schede) {
  const viste = new Map();
  const collisioni = [];
  for (const z of s.z) {
    for (const c of z.c) {
      if (viste.has(c.k)) collisioni.push(`${c.k} (${viste.get(c.k)} / ${c.l})`);
      viste.set(c.k, c.l);
    }
  }
  // ⚠️ Il criterio e' «quanti campi si possono compilare», NON «quante sezioni ci sono».
  // Una prima versione guardava le sezioni e classificava con logica solo le quattro che
  // non ne avevano: passavano per dichiarative anche schede come il Risk Register o la
  // Matrice RACI, che hanno le sezioni e ZERO campi, perche' sono tabelle costruite con
  // markup su misura. Seminate cosi' sarebbero comparse come schede vuote, e una scheda
  // vuota in mezzo ad altre piene si legge come un guasto.
  const compilabili = s.z.reduce((n, z) => n + z.c.length, 0);
  if (collisioni.length || compilabili === 0) {
    s.g = 1;
    s.z = s.z.map((z) => ({ t: z.t, c: [] }));
    if (collisioni.length) s.gm = collisioni.slice(0, 3);
  }
}
const conLogica = schede.filter((s) => s.g);

console.log(`\nSchede estratte: ${schede.length}`);
console.log(`Sezioni:         ${schede.reduce((n, s) => n + s.z.length, 0)}`);
const campi = schede.reduce((n, s) => n + s.z.reduce((m, z) => m + z.c.length, 0), 0);
console.log(`Campi compilabili: ${campi} (chiave derivata dall'etichetta: ${derivate})`);
console.log(`Con logica (nessun campo compilabile o struttura ripetuta): ${conLogica.length}`);
console.log(`Dichiarative: ${schede.length - conLogica.length}`);
for (const s of conLogica) console.log(`   ${s.k}  ${s.t}${s.gm ? "  [" + s.gm.join(", ") + "]" : "  [nessun campo compilabile]"}`);
if (problemi.length) {
  console.log(`\nNON estratte (${problemi.length}):`);
  for (const p of problemi) console.log("  " + p);
}

writeFileSync(USCITA, JSON.stringify(schede, null, 1) + "\n", "utf8");
console.log(`\nScritto: ${USCITA}`);
