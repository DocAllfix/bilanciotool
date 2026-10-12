// Il GOLDEN del percorso GDPR: i numeri che il prototipo produce, ottenuti ESEGUENDOLO.
//
//   node scripts/golden-gdpr.mjs
//
// Riscrive src/lib/calc/__tests__/gdpr-golden.json, che contiene sia il DATASET (l'esempio
// del prototipo) sia i risultati delle sue funzioni di calcolo. Il motore TypeScript gira
// sullo stesso dataset e confronta i risultati: l'atteso lo produce il codice del
// prototipo, mai una formula gemella riscritta da noi.
//
// ⚠️ IL TEMPO E' CONGELATO, e non basta congelare `oggi()`. Il prototipo chiama
// `new Date()` in nove punti: l'esempio costruisce le sue date a partire da oggi, i termini
// delle violazioni confrontano con l'istante corrente. Si sostituisce la classe `Date`
// intera, come in `golden-nis2.mjs`, altrimenti il golden cambia con l'ora in cui lo lanci.
//
// ⚠️ IL FUSO DEL PROCESSO conta per il prototipo (interpreta `datetime-local` in ora
// locale): lo script pretende `TZ=Europe/Rome`, che e' il fuso del browser del consulente.

import { writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { caricaPrototipoGdpr } from "./carica-prototipo-gdpr.mjs";

if (process.env.TZ !== "Europe/Rome") {
  console.error("Lancia con TZ=Europe/Rome: il prototipo legge le date nel fuso del browser.");
  process.exit(1);
}

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

/** Le 12:00 italiane del 12 ottobre 2026 (ora legale, UTC+2). */
const ADESSO = new Date("2026-10-12T10:00:00.000Z");
class DataCongelata extends Date {
  constructor(...args) {
    if (args.length === 0) super(ADESSO.getTime());
    else super(...args);
  }
  static now() {
    return ADESSO.getTime();
  }
}

/** `Math` con un `random` che ripete sempre la stessa sequenza (generatore lineare). */
let seme = 42;
const MathFisso = Object.assign(Object.create(Math), {
  random: () => ((seme = (seme * 1103515245 + 12345) % 2147483648) / 2147483648),
});

const p = caricaPrototipoGdpr({ Date: DataCongelata, Math: MathFisso });
const a = p.esempio();
const y = a.anno;
const nomi = (L) => L.map((t) => t.nome);

// Le liste di oggetti diventano liste di nomi: il golden deve dire QUALI, non ricopiarli.
const tratStat = (() => {
  const s = p.tratStat(a);
  return {
    n: s.n, part: s.part, extra: s.extra, comp: s.comp,
    noBase: nomi(s.noBase), noB9: nomi(s.noB9), noCons: nomi(s.noCons), noLia: nomi(s.noLia),
    dpia: nomi(s.dpia), dpiaOk: nomi(s.dpiaOk), dpiaNo: nomi(s.dpiaNo), cons36: nomi(s.cons36),
  };
})();
const rischiStat = (() => {
  const s = p.rischiStat(a);
  return { ...s, scoperti: nomi(s.scoperti) };
})();
const fornStat = (() => {
  const s = p.fornStat(a);
  return { ...s, noDpa: nomi(s.noDpa), noGar: nomi(s.noGar) };
})();

const golden = {
  generato: "node scripts/golden-gdpr.mjs (TZ=Europe/Rome)",
  adesso: ADESSO.toISOString(),
  anno: y,
  dataset: JSON.parse(JSON.stringify(a)),
  risultati: {
    conf: p.conf(a),
    confPerGruppo: Object.fromEntries(p.GRP.map((g) => [g.id, p.conf(a, g.id)])),
    tratStat,
    completezza: Object.fromEntries(a.trattamenti.map((t) => [t.nome, p.tComp(t)])),
    vaglio: Object.fromEntries(a.trattamenti.map((t) => [t.nome, { criteri: p.nCrit(t), necessaria: p.dpiaNec(a, t) }])),
    livelli: Object.fromEntries(a.trattamenti.map((t) => [t.nome, p.liv(t)])),
    rischiStat,
    fornStat,
    dpo: p.dpo(a),
    richieste: a.registri.dir.map((r) => ({ rif: r.rif, scadenza: p.dirScad(r), stato: p.dirSt(r) })),
    violazioni: a.registri.breach.map((r) => ({ data: r.data, dovuta: !!p.brNotif(r), stato: p.brSt(r) })),
    regStat: p.regStat(a, y),
    regStatPrec: p.regStat(a, y - 1),
    derive: p.derive(a, y),
    derivePrec: p.derive(a, y - 1),
    allarmi: p.allarmi(a, y),
    stato: p.stato(a, y),
  },
};

const out = join(root, "src", "lib", "calc", "__tests__");
mkdirSync(out, { recursive: true });
writeFileSync(join(out, "gdpr-golden.json"), JSON.stringify(golden, null, 2) + "\n");
console.log(`gdpr-golden.json: anno ${y}, ${a.trattamenti.length} trattamenti, indice ${golden.risultati.conf.pct}%, ${golden.risultati.allarmi.length} segnali, avanzamento ${golden.risultati.stato.tot}%`);
