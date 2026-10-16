// Il GOLDEN del percorso PAS 24000: i numeri che il prototipo produce, ottenuti ESEGUENDOLO.
//
//   TZ=Europe/Rome node scripts/golden-pas.mjs
//
// Riscrive src/lib/calc/__tests__/pas-golden.json, che contiene sia il DATASET (l'esempio del
// prototipo) sia i risultati delle sue funzioni di calcolo. Il motore TypeScript gira sullo
// stesso dataset e confronta i risultati: l'atteso lo produce il codice del prototipo, mai una
// formula gemella riscritta da noi. Le divergenze volute stanno in
// `docs/politica-arrotondamento.md` e nei test, una per una.
//
// ⚠️ IL TEMPO E' CONGELATO sostituendo la classe `Date` intera, come in `golden-gdpr.mjs`:
// l'esempio costruisce le sue date dall'anno corrente e `oggi()` decide quali reclami sono
// vecchi e quali azioni sono scadute.

import { writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { caricaPrototipoPas } from "./carica-prototipo-pas.mjs";

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

const p = caricaPrototipoPas({ Date: DataCongelata, Math: MathFisso });
const a = p.esempio();
const y = a.anno;

// Le liste di oggetti diventano liste di testi o nomi: il golden deve dire QUALI, non ricopiarli.
const rischiStat = (() => {
  const s = p.rischiStat(a);
  return { ...s, scoperti: s.scoperti.map((r) => r.t) };
})();
const fornStat = (() => {
  const s = p.fornStat(a);
  return { ...s, scoperti: s.scoperti.map((f) => f.nome) };
})();

const golden = {
  generato: "node scripts/golden-pas.mjs (TZ=Europe/Rome)",
  adesso: ADESSO.toISOString(),
  anno: y,
  dataset: JSON.parse(JSON.stringify(a)),
  risultati: {
    conf: p.conf(a),
    confPerGruppo: Object.fromEntries(p.GRP.map((g) => [g.id, p.conf(a, g.id)])),
    livelli: a.rischi.map((r) => p.liv(r)),
    rischiStat,
    fornStat,
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
writeFileSync(join(out, "pas-golden.json"), JSON.stringify(golden, null, 2) + "\n");
console.log(
  `pas-golden.json: anno ${y}, indice ${golden.risultati.conf.pct}% su ${golden.risultati.conf.val} valutati, ` +
    `${golden.risultati.rischiStat.alti} rischi alti, ${golden.risultati.allarmi.length} segnali, avanzamento ${golden.risultati.stato.tot}%`,
);
