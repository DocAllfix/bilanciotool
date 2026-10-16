// Estrae i cataloghi del percorso PAS 24000 dal prototipo, ESEGUENDOLO.
//
//   node scripts/extract-pas.mjs
//
// Scrive src/lib/db/seeds/data/pas-*.json. Il seme (`scripts/seed.mjs`) legge questi file;
// la formazione e la landing ne derivano i conteggi. Nessun numero si riscrive a mano.
//
// ⚠️ LE CHIAVI. A differenza del prototipo GDPR, qui gli identificativi dei requisiti sono
// GIA' scritti nel prototipo (`4.1`, `A.2-9`): non si numerano per posizione, si conservano.
// Restano congelati nel content set `pas-v1`.
//
// ⚠️ I DOMINI CHIUSI (stati, ambiti, rischi dei fornitori, esiti, stati di obiettivi e
// attività, opzioni dei registri) finiscono in `pas-domini.json` e da lì nel codice; la
// migrazione li ripete nei CHECK, e un test confronta le due liste.

import { writeFileSync, mkdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { caricaPrototipoPas, FONTE } from "./carica-prototipo-pas.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(root, "src", "lib", "db", "seeds", "data");
mkdirSync(OUT, { recursive: true });

const p = caricaPrototipoPas();

function scrivi(nome, dati, conteggio) {
  writeFileSync(join(OUT, `pas-${nome}.json`), JSON.stringify(dati, null, 2) + "\n");
  console.log(`  pas-${nome}.json  ${conteggio}`);
}

function unico(elenco, cosa) {
  const chiavi = elenco.map((x) => x.key);
  if (new Set(chiavi).size !== chiavi.length) throw new Error(`Chiavi duplicate in ${cosa}`);
}

console.log("\nCataloghi PAS 24000 dal prototipo\n");

// Gruppi con la loro guida: una per gruppo, nessun gruppo senza. `k` distingue le clausole di
// sistema (S) dalle aree dell'Allegato A (A): l'Allegato A non ammette esclusioni.
const gruppi = p.GRP.map((g, i) => {
  const guida = p.GUIDE[g.id];
  if (!guida) throw new Error(`Gruppo ${g.id} senza guida`);
  if (g.k !== "S" && g.k !== "A") throw new Error(`Gruppo ${g.id}: natura ${g.k} sconosciuta`);
  return {
    key: g.id,
    ordine: i + 1,
    natura: g.k === "S" ? "sistema" : "allegato",
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
scrivi("requisiti", requisiti, `${requisiti.length} (${requisiti.filter((r) => r.gruppo.startsWith("C")).length} di sistema)`);

// Le parti interessate e i rischi che il prototipo PRECARICA alla creazione: nel prodotto li
// copia l'avvio del percorso.
const parti = p.PARTI_DEF.map(([nome, esigenze, obbligo, coinvolgimento], i) => {
  if (obbligo !== "Sì" && obbligo !== "No") throw new Error(`Parte ${nome}: obbligo ${obbligo} sconosciuto`);
  return { key: `parte-${String(i + 1).padStart(2, "0")}`, ordine: i + 1, nome, esigenze, obbligo: obbligo === "Sì", coinvolgimento };
});
scrivi("parti-tipo", parti, parti.length);

const AREE_RISCHIO = new Set(p.GRP.map((g) => g.id));
const rischi = p.RISK_DEF.map(([area, ambito, testo], i) => {
  if (!AREE_RISCHIO.has(area)) throw new Error(`Rischio ${i + 1}: area ${area} sconosciuta`);
  if (ambito !== "O" && ambito !== "F") throw new Error(`Rischio ${i + 1}: ambito ${ambito} sconosciuto`);
  return { key: `rischio-${String(i + 1).padStart(2, "0")}`, ordine: i + 1, area, ambito, testo };
});
scrivi("rischi-tipo", rischi, rischi.length);

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

const pianoTipo = p.PIANO_TIPO.map(([mese, riferimento, attivita], i) => ({ key: `att-${String(i + 1).padStart(2, "0")}`, ordine: i + 1, mese, riferimento, attivita }));
scrivi("piano-tipo", pianoTipo, pianoTipo.length);

// Il modello di politica col segnaposto del nome: lo sostituisce chi lo inserisce.
const modello = p.polModello({ nome: "{nome}" });
if (!modello.startsWith("{nome} ")) throw new Error("Il modello di politica non comincia dal nome: segnaposto non applicato");
scrivi("politica", { contenuti: p.POLCHK.map(([key, testo], i) => ({ key, ordine: i + 1, testo })), modello }, `${p.POLCHK.length} contenuti`);

// I registri: etichette, riferimenti e aiuti. Le tabelle sono tipizzate a mano, e un test
// confronta le chiavi delle colonne. Le opzioni dell'area si scrivono come chiavi di gruppo.
const registri = Object.entries(p.REG).map(([key, r], i) => ({
  key,
  ordine: i + 1,
  nome: r.n,
  riferimento: r.r,
  aiuto: r.h,
  colonne: r.cols.map(([chiave, etichetta, genere, opzioni]) => ({
    chiave,
    etichetta,
    genere,
    opzioni: opzioni ? opzioni.map((o) => (Array.isArray(o) ? o[0] : o)) : null,
  })),
}));
scrivi("registri", registri, registri.length);

// ⚠️ Alcune liste chiuse non sono costanti del prototipo: stanno scritte DENTRO le viste
// (`vRis`, `vPol`), come letterali passati a `F.s(…)`. Qui sono ricopiate, e il controllo che
// segue pretende di ritrovarle identiche nel sorgente: una lista ricopiata male sarebbe un
// CHECK del database diverso dalla tendina del prototipo, senza che niente lo dica.
const sorgente = readFileSync(FONTE, "utf8");
const letterale = (lista) => "[" + lista.map((x) => `"${x}"`).join(",") + "]";
function pretendiNelPrototipo(lista, cosa) {
  if (!sorgente.includes(letterale(lista))) throw new Error(`${cosa}: ${letterale(lista)} non compare nel prototipo`);
}
const CATEGORIE_FORNITORE = ["Materie prime", "Imballaggi e materiali", "Agenzia per il lavoro", "Appalto in sito", "Cooperativa di servizi", "Trasporti e logistica", "Servizi", "Lavorazioni esterne"];
const RISCHI_FORNITORE = ["", "Basso", "Medio", "Alto"];
const ESITI_FORNITORE = ["", "Adeguato", "Azioni richieste", "Critico"];
const STATI_OBIETTIVO = ["In corso", "Raggiunto", "In ritardo", "Abbandonato"];
const STATI_ATTIVITA = ["Da fare", "In corso", "Fatto"];
const TIPI_FATTORE = ["Esterno", "Interno"];
const EFFETTI_FATTORE = ["Rischio", "Opportunità"];
pretendiNelPrototipo(CATEGORIE_FORNITORE, "categorie dei fornitori");
pretendiNelPrototipo(RISCHI_FORNITORE, "rischio dei fornitori");
pretendiNelPrototipo(ESITI_FORNITORE, "esito dei fornitori");
pretendiNelPrototipo(STATI_OBIETTIVO, "stati degli obiettivi");
pretendiNelPrototipo(STATI_ATTIVITA, "stati delle attività");
pretendiNelPrototipo(TIPI_FATTORE, "tipi di fattore");
pretendiNelPrototipo(EFFETTI_FATTORE, "effetti dei fattori");
if (!sorgente.includes('[["O","Organizzazione"],["F","Catena di fornitura"]]')) throw new Error("ambiti dei rischi: non compaiono nel prototipo");

// Le opzioni chiuse dei registri, tolte di mezzo le voci vuote ("—").
const opz = (reg, col) => {
  const c = p.REG[reg].cols.find((x) => x[0] === col);
  if (!c || !c[3]) throw new Error(`Registro ${reg}: colonna ${col} senza opzioni`);
  return c[3].map((o) => (Array.isArray(o) ? o[0] : o)).filter(Boolean);
};

scrivi(
  "domini",
  {
    stati: p.STATI.filter(([k]) => k).map(([key, etichetta]) => ({ key, etichetta })),
    ambiti: [
      { key: "O", etichetta: "Organizzazione" },
      { key: "F", etichetta: "Catena di fornitura" },
    ],
    tipiFattore: TIPI_FATTORE,
    effettiFattore: EFFETTI_FATTORE,
    categorieFornitore: CATEGORIE_FORNITORE,
    rischiFornitore: RISCHI_FORNITORE.filter(Boolean),
    esitiFornitore: ESITI_FORNITORE.filter(Boolean),
    statiObiettivo: STATI_OBIETTIVO,
    statiAttivita: STATI_ATTIVITA,
    registri: {
      reclamoCanale: opz("recl", "canale"),
      reclamoProvenienza: opz("recl", "prov"),
      reclamoEsito: opz("recl", "esito"),
      ncOrigine: opz("nc", "orig"),
      ncEfficacia: opz("nc", "eff"),
      emergenzaTipo: opz("emer", "tipo"),
      comunicazioneTipo: opz("com", "tipo"),
      consultazioneForma: opz("cons", "forma"),
      auditStato: opz("audit", "stato"),
    },
    parametri: p.PARAM_DEF,
  },
  "domini chiusi",
);

console.log("\nFatto.\n");
