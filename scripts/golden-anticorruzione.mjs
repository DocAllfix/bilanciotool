// Golden del motore ISO 37001, ESTRATTO ESEGUENDO IL PROTOTIPO.
//
// Non e' un elenco di numeri ricavati a mano: le funzioni sono quelle di
// `sgpc-iso37001-v1.html`, caricate in una sandbox e chiamate su casi scelti per
// toccare ogni ramo. Se la nostra reimplementazione diverge, diverge da CIO' CHE IL
// PROTOTIPO FA, non da cio' che ricordo che faccia.
//
// ⚠️ `scaduta()` legge l'orologio. I casi usano date lontanissime (2019 e 2099) in
// modo che l'esito non dipenda dal giorno in cui il golden e' stato estratto.
//
//   node scripts/golden-anticorruzione.mjs
import { readFileSync, writeFileSync } from "node:fs";
import vm from "node:vm";
import { ritagliaConst, ritagliaFunzione } from "./estrai-registri.mjs";

const SORGENTE = readFileSync("aggiuntenuovimoduli/sgpc-iso37001-v1.html", "utf8");
const ctx = vm.createContext({ Number, String, Math, Object, Array, JSON, Boolean, Date, RegExp });

// Si dichiarano in ordine di dipendenza: le costanti prima delle funzioni che le usano.
for (const nome of ["DIM", "FLAGS", "LIV", "FREQDD", "OBB"]) {
  const c = ritagliaConst(SORGENTE, nome);
  if (!c) throw new Error(`costante ${nome} non trovata`);
  vm.runInContext(`const ${nome} = ${c};`, ctx);
}
for (const nome of ["n", "lvl", "scaduta", "punteggio", "livello", "superiore", "livelloDD", "obblighi", "obbAperti", "livScenario"]) {
  const f = ritagliaFunzione(SORGENTE, nome);
  if (!f) throw new Error(`funzione ${nome} non trovata`);
  vm.runInContext(f, ctx);
}

const PASSATO = "2019-01-15";  // due diligence certamente scaduta
const FUTURO = "2099-01-15";   // certamente valida

// I casi toccano: nessuna dimensione, una sola, le soglie, ogni flag, ogni obbligo.
const CASI = {
  vuoto: {},
  unaSolaAlta: { d_paese: 4 },
  unaSolaBassa: { d_paese: 1 },
  tutteBasse: { d_paese: 1, d_pu: 1, d_nat: 1, d_val: 1 },
  sogliaMedio: { d_paese: 2, d_pu: 2, d_nat: 2, d_val: 2 },
  sogliaAlto: { d_paese: 3, d_pu: 3, d_nat: 3, d_val: 3 },
  tutteCritiche: { d_paese: 4, d_pu: 4, d_nat: 4, d_val: 4 },
  bassoConFlag: { d_paese: 1, d_pu: 1, d_nat: 1, d_val: 1, f_cli: true },
  bassoConPrecedenti: { d_paese: 1, d_pu: 1, d_nat: 1, d_val: 1, f_prec: true },
  altoConPrecedenti: { d_paese: 3, d_pu: 3, d_nat: 3, d_val: 3, f_prec: true },
  medioTuttoAssolto: {
    d_paese: 2, d_pu: 2, d_nat: 2, d_val: 2,
    dd_data: FUTURO, pol_com: "S\u00ec", imp: "S\u00ec", clausole: "S\u00ec", ctrl: "Adeguati",
  },
  medioDdScaduta: { d_paese: 2, d_pu: 2, d_nat: 2, d_val: 2, dd_data: PASSATO },
  nonFattibileMotivato: {
    d_paese: 2, d_pu: 2, d_nat: 2, d_val: 2,
    dd_data: FUTURO, pol_com: "S\u00ec", imp: "Non fattibile, motivato",
    clausole: "S\u00ec", ctrl: "Non fattibile, valutato nel rischio",
  },
  clausoleNonApplicabili: {
    d_paese: 2, d_pu: 2, d_nat: 2, d_val: 2,
    dd_data: FUTURO, pol_com: "S\u00ec", imp: "S\u00ec", clausole: "Non applicabile", ctrl: "Adeguati",
  },
  agiscePerConto: { d_paese: 2, d_pu: 2, d_nat: 4, d_val: 2 },
  agiscePerContoFormato: { d_paese: 2, d_pu: 2, d_nat: 4, d_val: 2, form_data: PASSATO },
  provvigioneConFlag: { d_paese: 1, d_pu: 1, d_nat: 1, d_val: 1, f_succ: true },
  provvigioneSenzaFlag: { d_paese: 2, d_pu: 2, d_nat: 2, d_val: 2, remun: "A provvigione" },
  controllataAdeguata: { d_paese: 1, d_pu: 1, d_nat: 1, d_val: 1, controllata: "S\u00ec", adeg: "Applica il nostro sistema" },
  controllataDaDefinire: { d_paese: 1, d_pu: 1, d_nat: 1, d_val: 1, controllata: "S\u00ec", adeg: "Da definire" },
};

const chiama = (f, ...a) => vm.runInContext(`(${f})`, ctx)(...a);
const soci = {};
for (const [nome, p] of Object.entries(CASI)) {
  ctx.__p = p;
  soci[nome] = {
    punteggio: Number(vm.runInContext("punteggio(__p)", ctx).toFixed(6)),
    livello: vm.runInContext("livello(__p)", ctx),
    // `superiore()` nel prototipo e' `l && l !== "Basso"`: con livello vuoto
    // restituisce la STRINGA VUOTA, non `false`. E' un artefatto di JavaScript —
    // ogni chiamante la usa come condizione, e "" e false si comportano uguale —
    // non una regola del dominio. Si normalizza qui, dove si vede il perche',
    // invece di allentare l'asserzione del test, dove non si vedrebbe.
    superiore: !!vm.runInContext("superiore(__p)", ctx),
    livelloDD: vm.runInContext("livelloDD(__p)", ctx),
    frequenzaDD: vm.runInContext("FREQDD[livello(__p)] || 24", ctx),
    obblighi: vm.runInContext("obblighi(__p).map(o => o.k)", ctx),
    aperti: vm.runInContext("obbAperti(__p).map(o => o.k)", ctx),
  };
}

// Il rischio degli scenari del registro 4.5: prodotto probabilita' x conseguenza.
const scenari = {};
for (const [prob, cons] of [["1 - Rara", "1 - Lieve"], ["2 - Possibile", "2 - Moderata"], ["3 - Probabile", "3 - Grave"],
                            ["4 - Molto probabile", "4 - Gravissima"], ["2 - Possibile", "4 - Gravissima"], ["", "3 - Grave"]]) {
  scenari[`${prob || "(vuoto)"} x ${cons || "(vuoto)"}`] = vm.runInContext(
    `livScenario({ prob: ${JSON.stringify(prob)}, cons: ${JSON.stringify(cons)} })`, ctx);
}

// Conformita': il prototipo pesa Conforme 100, Parzialmente 50, Non conforme 0, ed
// ESCLUDE dalla media sia «Non applicabile» sia i requisiti non valutati. Qui si
// estrae il suo comportamento su casi minimi, per poter misurare — e non affermare —
// quanto la nostra scelta diversa sposti i numeri.
vm.runInContext(`
  const PESO = { "Conforme":100, "Parzialmente conforme":50, "Non conforme":0 };
  function capStatoProto(stati){
    const v = stati.filter(s => s && s !== "Non applicabile");
    if (!v.length) return 0;
    return Math.round(v.reduce((a, s) => a + (PESO[s] || 0), 0) / v.length);
  }
`, ctx);
const conformita = {};
for (const [nome, stati] of Object.entries({
  "nessuno valutato su 20": Array(20).fill(""),
  "3 conformi su 20, il resto intatto": ["Conforme", "Conforme", "Conforme", ...Array(17).fill("")],
  "3 conformi e 17 non applicabili": ["Conforme", "Conforme", "Conforme", ...Array(17).fill("Non applicabile")],
  "tutti e 20 conformi": Array(20).fill("Conforme"),
  "10 conformi e 10 non conformi": [...Array(10).fill("Conforme"), ...Array(10).fill("Non conforme")],
  "20 parzialmente conformi": Array(20).fill("Parzialmente conforme"),
})) {
  ctx.__s = stati;
  conformita[nome] = { stati, prototipo: vm.runInContext("capStatoProto(__s)", ctx) };
}

const golden = { conformita, estrattoDa: "aggiuntenuovimoduli/sgpc-iso37001-v1.html", casi: CASI, soci, scenari };
writeFileSync("src/lib/calc/anticorruzione/__tests__/golden.json", JSON.stringify(golden, null, 2) + "\n");
console.log(`golden: ${Object.keys(soci).length} casi socio, ${Object.keys(scenari).length} scenari, ${Object.keys(conformita).length} casi di conformita'`);
for (const [k, v] of Object.entries(conformita)) console.log(`  ${k.padEnd(38)} prototipo=${v.prototipo}`);
for (const [k, v] of Object.entries(soci)) {
  console.log(`  ${k.padEnd(24)} ${(v.livello || "—").padEnd(8)} obblighi=${v.obblighi.length} aperti=${v.aperti.length}`);
}
