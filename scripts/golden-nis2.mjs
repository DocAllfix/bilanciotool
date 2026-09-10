// Il GOLDEN di NIS2: i numeri che il prototipo produce, ottenuti ESEGUENDOLO.
//
// ⚠️ Perche' esiste. Il modo sbagliato di verificare un motore riscritto e' ricalcolare
// l'atteso con una formula gemella: sono due volte la stessa ipotesi, e se l'ipotesi e'
// sbagliata vanno d'accordo tutte e due. Qui l'atteso lo produce il codice del prototipo,
// ritagliato dal suo HTML e fatto girare in un sandbox. Mai riscritto, mai adattato.
//
// ⚠️ E perche' il CASO lo scrivo io. Gli altri prototipi di questo progetto portavano un
// dataset di esempio da cui estrarre il golden; questi due non ne hanno — cercato e non
// trovato. Quindi il dato di prova e' mio e sta qui sotto, fisso e leggibile, mentre il
// CALCOLO resta loro: e' la meta' che conta, perche' e' quella che sto riscrivendo.
//
//   node scripts/golden-nis2.mjs
//
// Riscrive src/lib/calc/__tests__/nis2-golden.json. Deterministico: «oggi» e' congelato,
// altrimenti il golden diventerebbe rosso da solo a ogni mezzanotte e chi lo vede rosso
// cercherebbe il difetto nel codice invece che nel calendario.

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import vm from "node:vm";
import { ritagliaFunzione, ritagliaConst } from "./estrai-registri.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const html = readFileSync(join(root, "aggiuntenuovimoduli", "nis2-sistema-gestione-v1.html"), "utf8");

const apre = html.indexOf('id="corpus"');
const corpus = JSON.parse(html.slice(html.indexOf(">", apre) + 1, html.indexOf("</script>", apre)));

/** ⚠️ Congelato: vedi in testa al file. */
const OGGI = "2026-09-07";

/**
 * ⚠️ E CONGELATO ANCHE L'ISTANTE, non solo il giorno.
 *
 * La prima versione di questo script sostituiva la sola `oggi()`, che restituisce una
 * data. Ma `statoTermine` del prototipo passa da `oreA`, che chiama `new Date()`
 * direttamente: il campo `termini.stati` del golden cambiava a seconda dell'ORA in cui
 * lo script veniva lanciato — «in scadenza» la mattina, «scaduto» il pomeriggio — e il
 * test che lo confronta diventava rosso da solo.
 *
 * Se n'e' accorto il gate, non la mia verifica di determinismo: quella confrontava
 * `git status` filtrando i file non tracciati, cioe' proprio il golden appena creato.
 * Una verifica cieca sull'unica cosa che doveva guardare.
 */
// Le 06:00 italiane del 7 settembre: due ore prima della pre-notifica dovuta, cioe'
// dentro la finestra d'allarme. Scelto per far cadere i tre termini su tre stati
// DIVERSI — in scadenza, in corso, non applicabile — perche' un golden in cui
// coincidessero proverebbe un terzo di quello che deve.
const ADESSO = new Date(OGGI + "T04:00:00.000Z");

/** Un `Date` il cui «adesso» non si muove. Tutto il resto si comporta come sempre. */
class DataCongelata extends Date {
  constructor(...args) {
    if (args.length === 0) super(ADESSO.getTime());
    else super(...args);
  }
  static now() {
    return ADESSO.getTime();
  }
}

// ─────────────────────────────────────────────────────────── il caso di prova
//
// Scelto per toccare i confini, non per essere realistico:
//  · un requisito per ciascun livello 0÷4, uno «non applicabile», e un centinaio MAI
//    VALUTATI — che e' esattamente il punto in cui il nostro motore divergera' di
//    proposito dal prototipo;
//  · un controllo attuato con la verifica SCADUTA, che e' la regola meno ovvia del lotto;
//  · un incidente con la conoscenza a ieri, cosi' i tre termini cadono su stati diversi.
const ORG = {
  ana: {
    settore: "Energia",
    dim: "Grande impresa",
    obiettivo: "3 · Attuata",
    comunicazione: "2026-01-15",
    mesiNot: "9",
    mesiMis: "18",
  },
  ver: {},
  ctrl: {},
  road: {},
  ind: [],
  pro: {},
  mod: {},
  reg: { incidenti: [] },
};

const REQ = corpus.req;
REQ.slice(0, 20).forEach((r, i) => {
  ORG.ver[r.id] = { l: String(i % 5) + " · x", e: "", n: "", na: "" };
});
ORG.ver[REQ[20].id] = { l: "", e: "", n: "", na: "Sì" };
// Dal ventiduesimo in poi: mai valutati, di proposito.

const CTRL = corpus.ctrl;
ORG.ctrl[CTRL[0].id] = { s: "Attuato", ult: "2026-09-01", resp: "", ev: "", note: "" };
ORG.ctrl[CTRL[1].id] = { s: "Attuato", ult: "2020-01-01", resp: "", ev: "", note: "" }; // ⚠️ verifica scaduta
ORG.ctrl[CTRL[2].id] = { s: "In attuazione", ult: "", resp: "", ev: "", note: "" };
ORG.ctrl[CTRL[3].id] = { s: "Non attuato", ult: "", resp: "", ev: "", note: "" };
ORG.ctrl[CTRL[4].id] = { s: "Non applicabile", ult: "", resp: "", ev: "", note: "" };

const INCIDENTE = {
  rif: "INC-01",
  sign: "Sì",
  cono: "2026-09-06T08:00",
  pre: "",
  not: "",
  rel: "",
  stato: "Aperto",
};
ORG.reg.incidenti.push(INCIDENTE);

const INDICATORE = {
  cod: "G-01",
  nome: "prova",
  target: 100,
  soglia: 80,
  verso: "Crescente",
  ril: [
    { per: "2026-01", val: 60 },
    { per: "2026-02", val: 75 },
    { per: "2026-03", val: 90 },
  ],
};

// ────────────────────────────────────── il sandbox, coi pezzi ritagliati dal prototipo
const ctx = vm.createContext({
  Number,
  String,
  Math,
  Object,
  Array,
  JSON,
  Boolean,
  Date,
  isFinite,
  console,
  // ⚠️ Non il `Date` vero: vedi `DataCongelata` qui sopra.
  Date: DataCongelata,
  CORPUS: corpus,
  org: () => ORG,
});

// «oggi» del prototipo legge l'orologio; qui no.
vm.runInContext("function oggi(){ return " + JSON.stringify(OGGI) + "; }", ctx);

// Le costanti che il prototipo ricava dal corpus con una dichiarazione a piu' nomi
// (`const PRO = …, LIVELLI = …`), che il ritaglio per nome non intercetta.
vm.runInContext(
  [
    "const PRO = CORPUS.pro, MOD = CORPUS.mod, CAPI = CORPUS.capi, REQ = CORPUS.req,",
    "      LIVELLI = CORPUS.livelli, CTRL = CORPUS.ctrl;",
    "const PROLIST = CORPUS.ordPro, MODLIST = CORPUS.ordMod;",
  ].join("\n"),
  ctx,
);

// I literal veri e propri: array e oggetti che stanno in piedi da soli, anche su
// piu' righe.
const LITERAL = ["ALL1", "ALL2", "DIMV", "CRITSPEC", "PRIOG", "STATI_CTRL", "FASI"];
for (const nome of LITERAL) {
  const lit = ritagliaConst(html, nome);
  if (!lit) throw new Error("costante «" + nome + "» non ritagliata dal prototipo");
  vm.runInContext("const " + nome + " = " + lit + ";", ctx);
}

// ⚠️ LE MAPPE DERIVATE NON SI RITAGLIANO: si eseguono per intero.
//
// Il prototipo le scrive cosi': `const LIVN = {}; LIVELLI.forEach(l => LIVN[l.v] = l);`
// — dichiarazione e riempimento sulla STESSA riga, in due istruzioni. Ritagliare il
// literal restituisce `{}`, cioe' una mappa vuota che non solleva niente: `pcArea`
// scoppia sessanta righe piu' in la' con «cannot read properties of undefined», e la
// diagnosi parte dalla parte sbagliata. Si prende la riga sorgente intera.
const DERIVATE = ["MODOF", "REQOF", "REQPRO", "LIVN", "LIVLAB", "CTRLOF", "CTRLBY"];
const righe = html.split("\n");
for (const nome of DERIVATE) {
  const riga = righe.find((r) => r.trimStart().startsWith("const " + nome + " "));
  if (!riga) throw new Error("mappa derivata «" + nome + "» non trovata nel prototipo");
  vm.runInContext(riga, ctx);
  // Controprova immediata: una mappa dichiarata e non riempita e' il difetto che questo
  // blocco esiste per evitare, e non si vedrebbe fino a molto piu' tardi.
  if (!vm.runInContext("Object.keys(" + nome + ").length", ctx)) {
    throw new Error("mappa derivata «" + nome + "» risulta vuota dopo l'esecuzione");
  }
}

// ⚠️ I tre termini di legge stanno in una dichiarazione a piu' nomi
// (`const H_PRE = 24, H_NOT = 72, M_REL = 1;`), che il ritaglio per nome non intercetta:
// cercando `const H_NOT` non trova niente. Si prende l'istruzione intera.
{
  // Niente espressione regolare: in questo ambiente una barra rovesciata dentro una
  // stringa di shell si dimezza in silenzio, e `\s` diventa `s` — che corrisponde a
  // tutt'altro. Si cerca il testo e si cammina fino al punto e virgola.
  const da = html.indexOf("const H_PRE");
  const a = html.indexOf(";", da);
  if (da < 0 || a < 0) throw new Error("i termini di legge non sono piu' dove il prototipo li dichiarava");
  vm.runInContext(html.slice(da, a + 1), ctx);
}

const FUNZIONI = [
  "ambito", "sanzioni",
  "lv", "reqL", "reqNA", "obiettivo", "reqAttivi", "reqValutati", "livMedio", "pcArea",
  "conformita", "alTarget", "scostamenti", "priorita",
  "dtv", "isoDT", "addOre", "addMesiD", "oreA", "termine", "fatto", "statoTermine",
  "ggA", "ctrlS", "ctrlProssima", "ctrlEff", "ctrlAttivi", "pcAtt", "attuazione",
  "faseAtt", "addM", "roadTermini",
  "ril", "ultimo", "penultimo", "verso", "scost", "statoInd", "trend",
];
for (const nome of FUNZIONI) {
  const src = ritagliaFunzione(html, nome);
  if (!src) throw new Error("funzione «" + nome + "» non ritagliata dal prototipo");
  vm.runInContext(src.startsWith("function") ? src : src + ";", ctx);
}

const val = (expr) => vm.runInContext(expr, ctx);

// ─────────────────────────────────────────────────────────────────────── golden

const casiAmbito = [];
for (const settore of ["Energia", "Servizi postali e di corriere", "Commercio al dettaglio"]) {
  for (const dim of ["Grande impresa", "Media impresa", "Microimpresa o piccola impresa"]) {
    ctx.__a = { settore, dim };
    casiAmbito.push({
      settore,
      dim,
      criterio: null,
      ...val("ambito(__a)"),
      sanzioni: val("sanzioni(ambito(__a).cls)"),
    });
  }
}
// Gli otto criteri specifici, ciascuno su una microimpresa fuori dai settori dei due
// allegati: se davvero scavalcano la dimensione, si vede qui e in nessun altro caso.
for (const c of val("CRITSPEC")) {
  ctx.__a = { settore: "Commercio al dettaglio", dim: "Microimpresa o piccola impresa", [c[0]]: "Sì" };
  casiAmbito.push({
    settore: "Commercio al dettaglio",
    dim: "Microimpresa o piccola impresa",
    criterio: c[0],
    ...val("ambito(__a)"),
    sanzioni: val("sanzioni(ambito(__a).cls)"),
  });
}

const inc = "org().reg.incidenti[0]";

const golden = {
  fonte: "nis2-sistema-gestione-v1.html, funzioni ritagliate ed eseguite in sandbox",
  oggiCongelato: OGGI,
  adessoCongelato: ADESSO.toISOString(),

  ambito: casiAmbito,

  conformita: {
    obiettivo: val("obiettivo()"),
    attivi: val("reqAttivi().length"),
    valutati: val("reqValutati().length"),
    livelloMedio: val("livMedio()"),
    // ⚠️ Il numero del PROTOTIPO, che media sui soli valutati. Il nostro sara' piu'
    // basso, e il test lo dichiara invece di nasconderlo.
    percentualeProtipo: val("conformita()"),
    alTarget: val("alTarget()"),
    scostamenti: val("scostamenti().length"),
    perCapo: val(
      "CAPI.map(k => ({ capo: k.id, pcProtipo: pcArea(REQOF[k.id])," +
        " attivi: reqAttivi(REQOF[k.id]).length, valutati: reqValutati(REQOF[k.id]).length }))",
    ),
    priorita: val(
      "scostamenti().map(r => ({ id: r.id, crit: r.crit, livello: reqL(r.id), priorita: priorita(r) }))",
    ),
    giorniPerPriorita: val("PRIOG"),
  },

  controlli: {
    attuazioneProtipo: val("attuazione()"),
    attivi: val("ctrlAttivi().length"),
    stati: val(
      "CTRL.slice(0,6).map(c => ({ id: c.id, frequenza: c.f, dichiarato: ctrlS(c.id)," +
        " effettivo: ctrlEff(c.id), prossima: ctrlProssima(c.id) }))",
    ),
    perFase: val("FASI.map(f => ({ id: f.id, aree: f.aree, pcProtipo: faseAtt(f) }))"),
  },

  termini: {
    conoscenza: INCIDENTE.cono,
    preNotifica: val('termine(' + inc + ', "pre")'),
    notifica: val('termine(' + inc + ', "not")'),
    relazione: val('termine(' + inc + ', "rel")'),
    stati: ["pre", "not", "rel"].map((k) => ({
      quale: k,
      stato: val("statoTermine(" + inc + ", " + JSON.stringify(k) + ")"),
    })),
    ore: { preNotifica: val("H_PRE"), notifica: val("H_NOT"), mesiRelazione: val("M_REL") },
    // ⚠️ I due punti in cui il nostro motore divergera' DI PROPOSITO. Si registrano qui
    // per poterlo dichiarare con un numero invece che con un'opinione.
    mesiDalProtipo: ["2026-01-31T10:00", "2026-03-31T10:00", "2026-08-31T10:00", "2026-12-31T10:00"].map(
      (d) => ({ da: d, piuUnMese: val("addMesiD(" + JSON.stringify(d) + ", 1)") }),
    ),
    oreDalProtipo: ["2026-03-28T23:00", "2026-10-24T23:00"].map((d) => ({
      da: d,
      piu24: val("addOre(" + JSON.stringify(d) + ", 24)"),
      piu72: val("addOre(" + JSON.stringify(d) + ", 72)"),
    })),
  },

  roadmap: val("roadTermini()"),

  indicatori: (() => {
    ctx.__i = INDICATORE;
    const base = {
      ultimo: val("ultimo(__i)"),
      stato: val("statoInd(__i)"),
      andamento: val("trend(__i)"),
      scostamento: val("scost(__i)"),
    };
    ctx.__i = { ...INDICATORE, target: "" };
    const senzaTarget = { stato: val("statoInd(__i)"), scostamento: val("scost(__i)") };
    ctx.__i = { ...INDICATORE, verso: "Decrescente" };
    const decrescente = { stato: val("statoInd(__i)"), andamento: val("trend(__i)") };
    ctx.__i = { ...INDICATORE, ril: [] };
    const senzaRilevazioni = { stato: val("statoInd(__i)"), scostamento: val("scost(__i)") };
    return { base, senzaTarget, decrescente, senzaRilevazioni };
  })(),

  casoDiProva: { org: ORG, indicatore: INDICATORE },
};

const dir = join(root, "src", "lib", "calc", "__tests__");
mkdirSync(dir, { recursive: true });
const out = join(dir, "nis2-golden.json");
writeFileSync(out, JSON.stringify(golden, null, 1) + "\n");

console.log("golden scritto in " + out);
console.log("  ambito: " + golden.ambito.length + " casi");
console.log(
  "  conformita' del prototipo: " + golden.conformita.percentualeProtipo + "% su " +
    golden.conformita.valutati + "/" + golden.conformita.attivi + " valutati",
);
console.log("  attuazione del prototipo: " + golden.controlli.attuazioneProtipo + "%");
console.log("  scostamenti: " + golden.conformita.scostamenti);
