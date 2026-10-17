// Genera `docs/ateco-profili.md` dal catalogo delle proposte, per la revisione del committente.
//
//   node scripts/genera-ateco-profili.mjs
//
// ⚠️ IL DOCUMENTO SI DERIVA, NON SI SCRIVE. Una copia leggibile scritta a mano divergerebbe dal
// catalogo alla prima correzione, e il committente approverebbe una cosa diversa da quella che
// il prodotto fa. Le correzioni si fanno in `src/lib/db/seeds/data/ateco-proposte.json`, poi si
// rigenera questo file.

import { readFileSync, writeFileSync } from "node:fs";

const proposte = JSON.parse(readFileSync("src/lib/db/seeds/data/ateco-proposte.json", "utf8"));
const fattori = new Map(JSON.parse(readFileSync("src/lib/db/seeds/data/ghg-emission-factors.json", "utf8")).map((f) => [f.id, f]));
const sorgenti = new Map(JSON.parse(readFileSync("src/lib/db/seeds/data/ghg-sources.json", "utf8")).map((s) => [s.id, s.n]));

// I nomi e gli intervalli dei profili stanno in TypeScript (`src/lib/calc/ateco.ts`): si leggono
// dal sorgente invece di ricopiarli, con un'espressione che si ferma se non trova niente.
const ts = readFileSync("src/lib/calc/ateco.ts", "utf8");
const profili = [...ts.matchAll(/\{ key: "([a-z_]+)", nome: "([^"]+)", da: (\d+), a: (\d+) \}/g)].map((m) => ({
  key: m[1],
  nome: m[2],
  da: Number(m[3]),
  a: Number(m[4]),
}));
if (profili.length < 20) throw new Error(`profili letti da ateco.ts: ${profili.length}, troppo pochi`);

const div = (n) => String(n).padStart(2, "0");
const righe = [
  "# Proposte per codice ATECO — da rivedere",
  "",
  "Documento generato da `scripts/genera-ateco-profili.mjs` a partire dal catalogo",
  "`src/lib/db/seeds/data/ateco-proposte.json`. **Non si modifica a mano**: le correzioni vanno nel",
  "catalogo, poi si rigenera.",
  "",
  "## Come funziona",
  "",
  "- Il codice ATECO si legge per **divisione** (le prime due cifre), non per lettera: dal 2025 le",
  "  lettere delle sezioni sono cambiate, le divisioni no.",
  "- Ogni voce entra nel percorso **a quantità zero**, marcata «proposta» col motivo qui sotto. Il",
  "  totale non cambia finché il consulente non scrive un numero.",
  "- Una voce modificata o confermata non si tocca più, nemmeno se l'ATECO cambia.",
  "- Se esiste l'esercizio precedente, si riprendono le sue voci e il codice ATECO non si usa.",
  "",
  "## Inventario GHG: voci tipiche per profilo",
  "",
];
for (const p of profili) {
  const voci = proposte.ghg.profili[p.key] ?? [];
  righe.push(`### ${p.nome} (divisioni ${div(p.da)}${p.a !== p.da ? `–${div(p.a)}` : ""})`, "");
  voci.forEach((k, i) => {
    const f = fattori.get(k);
    righe.push(`${i + 1}. **${f?.n ?? k}** (${sorgenti.get(f?.src) ?? f?.src}, ${f?.um ?? ""})`);
  });
  righe.push("");
}
righe.push("## I motivi", "", "Ogni voce porta questo testo accanto, nel percorso.", "");
const usate = [...new Set(Object.values(proposte.ghg.profili).flat())].sort();
for (const k of usate) righe.push(`- **${fattori.get(k)?.n ?? k}**: ${proposte.ghg.motivi[k]}`);
righe.push("");

// ── Gli altri percorsi ──────────────────────────────────────────────────────────────────
const leggi = (f) => JSON.parse(readFileSync(`src/lib/db/seeds/data/${f}`, "utf8"));
const usi = new Map(leggi("energy-end-uses.json").map((u) => [u.id, u.n]));
const reati = new Map(leggi("mog231-reati.json").map((r) => [r.id, `${r.id} · ${r.t}`]));
const trattamenti = new Map(leggi("gdpr-trattamenti-tipo.json").map((t) => [t.key, t.nome]));
const intestazione = (p) => `### ${p.nome} (divisioni ${div(p.da)}${p.a !== p.da ? `–${div(p.a)}` : ""})`;
const elenco = (chiavi, nomi) => chiavi.map((k) => `- ${nomi.get(k) ?? k}`);

righe.push(
  "## Bilancio energetico: usi finali accesi per profilo",
  "",
  "Se esiste l'esercizio precedente si riprendono i suoi usi finali; altrimenti questi.",
  "",
);
for (const p of profili) righe.push(intestazione(p), "", ...elenco(proposte.energia.profili[p.key] ?? [], usi), "");

righe.push(
  "## Modello 231: reati proposti come applicabili",
  "",
  "Entrano come «Sì» col motivo e la motivazione vuota: la scrive il consulente. Mai «No»: un",
  "reato escluso in silenzio è il difetto peggiore di una mappatura.",
  "",
  "**Per ogni impresa:**",
  "",
  ...elenco(proposte.mog231.sempre, reati),
  "",
  `**Per chi ha dipendenti:** ${reati.get("25-septies")}`,
  "",
);
for (const p of profili) {
  const propri = proposte.mog231.profili[p.key] ?? [];
  if (propri.length) righe.push(intestazione(p), "", ...elenco(propri, reati), "");
}

righe.push(
  "## Protezione dei dati: trattamenti proposti",
  "",
  "Entrano nel registro marcati «proposto»: finché nessuno li tocca non sono censiti, e il",
  "registro consegnato non li porta.",
  "",
);
const speciali = { _sempre: "Per ogni azienda", _dipendenti: "Per chi ha dipendenti", _sito: "Per chi ha un sito web", _50: "Da 50 addetti" };
for (const [k, titolo] of Object.entries(speciali)) {
  righe.push(`**${titolo}:**`, "", ...elenco(proposte.gdpr.profili[k] ?? [], trattamenti), "");
}
for (const p of profili) {
  const propri = proposte.gdpr.profili[p.key] ?? [];
  if (propri.length) righe.push(intestazione(p), "", ...elenco(propri, trattamenti), "");
}

const q = proposte.qas;
righe.push(
  "## Sistema integrato: aspetti ambientali e pericoli",
  "",
  "Righe proposte nei registri MOD-04.01 e MOD-05.01, con la sola descrizione: gravità,",
  "frequenza e probabilità restano vuote. I profili si raggruppano per settore.",
  "",
);
const gruppo = (titolo, g) => {
  righe.push(`### ${titolo}`, "");
  if (g.aspetti.length) righe.push("Aspetti ambientali:", "", ...g.aspetti.map((a) => `- ${a.att} · ${a.asp}: ${a.imp}`), "");
  if (g.pericoli.length) righe.push("Pericoli:", "", ...g.pericoli.map((x) => `- ${x.area} · ${x.att}: ${x.per} (${x.danno})`), "");
};
gruppo("Per ogni sede", q.comuni);
for (const [k, g] of Object.entries(q.gruppi)) {
  const chi = profili.filter((p) => q.profili[p.key] === k).map((p) => p.nome);
  gruppo(`${g.motivo.replace(/^Tipico (del|della|dei|delle|di) /, "").replace(/^./, (c) => c.toUpperCase())} — ${chi.join(", ")}`, g);
}

writeFileSync("docs/ateco-profili.md", righe.join("\n"));
console.log(`docs/ateco-profili.md: ${profili.length} profili, ${usate.length} voci distinte`);
