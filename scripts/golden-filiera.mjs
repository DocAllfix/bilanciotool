// Il golden della Due diligence di filiera, estratto ESEGUENDO il prototipo.
//
// ⚠️ Il caso che conta è il primo dell'elenco: un partner che ha risposto a UNA sola
// domanda di governance, e a nessuna delle tre aree critiche. Il prototipo gli assegna
// maturità 4,0 e rischio residuo BASSO, con verifica ogni 48 mesi. È il contrario di ciò
// che la metodologia vuole, ed è il difetto B2 del piano.
//
//   node scripts/golden-filiera.mjs

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { createContext, runInContext } from "node:vm";

const html = readFileSync("aggiuntenuovimoduli/due-diligence-filiera-v1.html", "utf8");

function estrai(nome, tipo = "function") {
  const inizio = html.indexOf(`${tipo} ${nome}`);
  if (inizio < 0) throw new Error(`«${nome}» non trovato`);
  const apre = tipo === "function" ? "{" : html[html.indexOf("=", inizio) + 2];
  const chiude = apre === "{" ? "}" : "]";
  let i = html.indexOf(apre, inizio);
  let p = 0;
  for (; i < html.length; i++) {
    if (html[i] === apre) p++;
    else if (html[i] === chiude) {
      p--;
      if (p === 0) return html.slice(inizio, i + 1) + (tipo === "const" ? ";" : "");
    }
  }
  throw new Error(`«${nome}» senza chiusura`);
}

const sandbox = {};
createContext(sandbox);
runInContext(
  [
    estrai("DIM", "const"),
    estrai("AREE", "const"),
    estrai("FLAGS", "const"),
    estrai("MATRICE", "const"),
    "const FREQ = { Critico:12, Alto:24, Medio:36, Basso:48 };",
    estrai("punteggioInerente"),
    estrai("categoriaInerente"),
    estrai("maturita"),
    estrai("rischioResiduo"),
  ].join("\n"),
  sandbox,
);

const { punteggioInerente, categoriaInerente, maturita, rischioResiduo } = sandbox;
const FREQ = { Critico: 12, Alto: 24, Medio: 36, Basso: 48 };

const p = (o) => ({ rp: 0, rs: 0, rpr: 0, rm: 0, ...o });

const casi = [
  // ⚠️ IL DIFETTO: una sola area valutata, e nessuna delle tre critiche.
  { nome: "SOLO governance, nessuna area critica", v: p({ rp: 3, rs: 3, a_gov: 4 }) },
  { nome: "solo governance a 1", v: p({ rp: 3, rs: 3, a_gov: 1 }) },
  { nome: "governance alta, una critica bassa", v: p({ rp: 3, rs: 3, a_gov: 4, a_min: 1 }) },
  { nome: "tutte le aree a 4", v: p({ rp: 3, rs: 3, a_gov: 4, a_min: 4, a_forz: 4, a_ora: 4, a_foa: 4, a_hs: 4, a_amb: 4 }) },
  { nome: "nessuna area valutata", v: p({ rp: 3, rs: 3 }) },
  { nome: "inerente basso senza flag", v: p({ rp: 1, rs: 1, a_gov: 3, a_min: 3, a_forz: 3, a_hs: 3 }) },
  { nome: "inerente basso CON flag", v: p({ rp: 1, rs: 1, f_prov: true, a_gov: 3, a_min: 3, a_forz: 3, a_hs: 3 }) },
  { nome: "inerente critico", v: p({ rp: 4, rs: 4, rpr: 4, rm: 4, a_gov: 4, a_min: 4, a_forz: 4, a_hs: 4 }) },
  { nome: "niente di niente", v: p({}) },
];

const golden = {
  generatoIl: new Date().toISOString().slice(0, 10),
  soglieInerente: [1.8, 2.6, 3.4],
  areeCritiche: ["min", "forz", "hs"],
  frequenze: FREQ,
  matrice: sandbox.MATRICE,
  casi: casi.map((c) => ({
    nome: c.nome,
    inerente: Math.round(punteggioInerente(c.v) * 100) / 100,
    categoria: categoriaInerente(c.v),
    maturita: Math.round(maturita(c.v) * 100) / 100,
    residuo: rischioResiduo(c.v),
    mesiVerifica: FREQ[rischioResiduo(c.v)] ?? null,
  })),
};

mkdirSync("src/lib/calc/filiera/__tests__", { recursive: true });
writeFileSync("src/lib/calc/filiera/__tests__/golden.json", JSON.stringify(golden, null, 2) + "\n");

for (const c of golden.casi) {
  console.log(
    `  ${c.nome.padEnd(38)} inerente ${String(c.inerente).padStart(5)} ${String(c.categoria || "«»").padEnd(8)}` +
      ` maturita ${String(c.maturita).padStart(5)} → ${String(c.residuo || "«»").padEnd(8)} ogni ${c.mesiVerifica ?? "—"} mesi`,
  );
}
