// Estrae i cataloghi del percorso GDPR dal prototipo, ESEGUENDOLO.
//
//   node scripts/extract-gdpr.mjs
//
// Scrive src/lib/db/seeds/data/gdpr-*.json. Il seme (`scripts/seed.mjs`) legge questi file;
// la formazione e la landing ne derivano i conteggi. Nessun numero si riscrive a mano.
//
// ⚠️ LE CHIAVI. I requisiti del prototipo si numerano per POSIZIONE (`P-01` e' il primo
// del gruppo P). Qui diventano chiavi scritte nel seme e congelate nel content set
// `gdpr-v1`: un `gdpr-v2` che riordinasse i requisiti non sposterebbe le valutazioni gia'
// date, perche' ogni percorso resta legato al set con cui e' nato.
//
// ⚠️ I DOMINI CHIUSI (basi giuridiche, condizioni dell'art. 9, qualifiche, garanzie, stati)
// finiscono in `gdpr-domini.json` e da li' nel codice; la migrazione li ripete nei CHECK, e
// un test confronta le due liste. Se il prototipo cambiasse un'etichetta, il test lo dice.

import { writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { caricaPrototipoGdpr } from "./carica-prototipo-gdpr.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(root, "src", "lib", "db", "seeds", "data");
mkdirSync(OUT, { recursive: true });

const p = caricaPrototipoGdpr();

/** Chiave stabile da un nome: minuscole, senza accenti, trattini. */
const slug = (s) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

function scrivi(nome, dati, conteggio) {
  writeFileSync(join(OUT, `gdpr-${nome}.json`), JSON.stringify(dati, null, 2) + "\n");
  console.log(`  gdpr-${nome}.json  ${conteggio}`);
}

function unico(elenco, cosa) {
  const chiavi = elenco.map((x) => x.key);
  if (new Set(chiavi).size !== chiavi.length) throw new Error(`Chiavi duplicate in ${cosa}`);
}

console.log("\nCataloghi GDPR dal prototipo\n");

// Gruppi con la loro guida: una per gruppo, nessun gruppo senza.
const gruppi = p.GRP.map((g, i) => {
  const guida = p.GUIDE[g.id];
  if (!guida) throw new Error(`Gruppo ${g.id} senza guida`);
  return {
    key: g.id,
    ordine: i + 1,
    nome: g.n,
    riferimento: g.r,
    guida: { definizione: guida.def, verifiche: guida.look, evidenze: guida.ev, attenzione: guida.flag },
  };
});
unico(gruppi, "gruppi");
scrivi("gruppi", gruppi, gruppi.length);

const requisiti = p.REQ.map((r, i) => ({ key: r.id, ordine: i + 1, gruppo: r.g, riferimento: r.ref, testo: r.t }));
unico(requisiti, "requisiti");
for (const r of requisiti) if (!gruppi.some((g) => g.key === r.gruppo)) throw new Error(`Requisito ${r.key} senza gruppo`);
scrivi("requisiti", requisiti, requisiti.length);

const criteri = p.CRIT.map(([key, testo], i) => ({ key, ordine: i + 1, testo }));
unico(criteri, "criteri");
scrivi("criteri", criteri, criteri.length);

const trattamenti = p.CAT.map((c, i) => {
  for (const k of c.crit) if (!criteri.some((x) => x.key === k)) throw new Error(`Trattamento tipo ${c.nome}: criterio ${k} ignoto`);
  return {
    key: slug(c.nome),
    ordine: i + 1,
    nome: c.nome,
    finalita: c.fin,
    base: c.base,
    interessati: c.int,
    dati: c.dati,
    particolari: c.part === "Sì",
    condizione9: c.b9 ?? "",
    destinatari: c.dest,
    conservazione: c.cons,
    criteri: c.crit,
  };
});
unico(trattamenti, "trattamenti tipo");
scrivi("trattamenti-tipo", trattamenti, trattamenti.length);

const scala = (righe) => righe.map(([valore, nome, descrizione]) => ({ valore, nome, descrizione }));
scrivi("scale", { probabilita: scala(p.SCALA.p), gravita: scala(p.SCALA.g) }, `${p.SCALA.p.length}+${p.SCALA.g.length}`);

const sezioni = p.SEZ.map((s, i) => ({ key: s.id, ordine: i + 1, nome: s.n, riferimento: s.r }));
const indicatori = p.KPI.map((k, i) => {
  if (!sezioni.some((s) => s.key === k.s)) throw new Error(`Indicatore ${k.k} senza sezione`);
  return { key: k.k, ordine: i + 1, sezione: k.s, nome: k.n, unita: k.u, aiuto: k.h ?? "" };
});
unico(sezioni, "sezioni");
unico(indicatori, "indicatori");
scrivi("indicatori", { sezioni, indicatori }, `${sezioni.length} sezioni, ${indicatori.length} indicatori`);

const documentiTipo = p.DOC_TIPO.map(([tipo, oggetto], i) => ({ key: `doc-${String(i + 1).padStart(2, "0")}`, ordine: i + 1, tipo, oggetto }));
scrivi("documenti-tipo", documentiTipo, documentiTipo.length);

const pianoTipo = p.PIANO_TIPO.map(([mese, riferimento, attivita], i) => ({ key: `att-${String(i + 1).padStart(2, "0")}`, ordine: i + 1, mese, riferimento, attivita }));
scrivi("piano-tipo", pianoTipo, pianoTipo.length);

// Il modello di politica col segnaposto del nome: lo sostituisce chi lo inserisce.
const modello = p.polModello({ nome: "{nome}" });
if (!modello.startsWith("{nome} ")) throw new Error("Il modello di politica non comincia dal nome: segnaposto non applicato");
scrivi("politica", { contenuti: p.POLCHK.map(([key, testo], i) => ({ key, ordine: i + 1, testo })), modello }, `${p.POLCHK.length} contenuti`);

// I registri: etichette, riferimenti e aiuti. Le colonne si portano per le etichette: le
// tabelle sono tipizzate a mano, e un test confronta le chiavi.
const registri = Object.entries(p.REG).map(([key, r], i) => ({
  key,
  ordine: i + 1,
  nome: r.n,
  riferimento: r.r,
  aiuto: r.h,
  colonne: r.cols.map(([chiave, etichetta, genere, opzioni]) => ({ chiave, etichetta, genere, opzioni: opzioni ?? null })),
}));
scrivi("registri", registri, registri.length);

scrivi(
  "domini",
  {
    stati: p.STATI.filter(([k]) => k).map(([key, etichetta]) => ({ key, etichetta })),
    basi: p.BASI.filter(Boolean),
    condizioni9: p.B9.filter(Boolean),
    qualifiche: p.RUOLI_F,
    garanzie: p.GARANZIE.filter(Boolean),
    tipiDocumento: p.DOC_K,
    statiDocumento: p.DOC_ST,
    parametri: p.PARAM_DEF,
  },
  "domini chiusi",
);

console.log("\nFatto.\n");
