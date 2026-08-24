// Seed IDEMPOTENTE dei contenuti metodologici (content_set v1 per ghg e report).
// Gira con la connessione privilegiata (DIRECT_URL): le policy RLS limitano la
// scrittura dei cataloghi allo staff/al seed, non al ruolo app.
// Due esecuzioni consecutive producono lo stesso stato (upsert ovunque).
import "dotenv/config";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import postgres from "postgres";
import { seedCorpus } from "./seed-corpus.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const dataDir = join(root, "src", "lib", "db", "seeds", "data");
const load = (f) => JSON.parse(readFileSync(join(dataDir, f), "utf8"));

const url = process.env.DIRECT_URL;
if (!url) {
  console.error("DIRECT_URL mancante: configura .env");
  process.exit(1);
}
const sql = postgres(url, { max: 1, prepare: false, connect_timeout: 15 });

const GHG_SET = "ghg-v1";
const REPORT_SET = "report-v1";
const ENERGY_SET = "energy-v1";
const id = (key) => `v1:${key}`;
// I domini aggiunti dopo i primi due usano una chiave prefissata: narrative_template
// e rating_scale ospitano ora più domini, e la forma globale `v1:<key>` diventerebbe
// ambigua. Le righe già seminate non si toccano.
const eid = (key) => `${ENERGY_SET}:${key}`;
const SUPPLIER_SET = "supplier-v1";
const sid = (key) => `${SUPPLIER_SET}:${key}`;
const SOA_SET = "soa-v1";
const oid = (key) => `${SOA_SET}:${key}`;
const MOG_SET = "mog231-v1";
const mid = (key) => `${MOG_SET}:${key}`;
const AC_SET = "iso37001-v1";
const acid = (key) => `${AC_SET}:${key}`;
const SA_SET = "sa8000-v1";
const said = (key) => `${SA_SET}:${key}`;
const QAS_SET = "sgiqas-v1";
const qid = (key) => `${QAS_SET}:${key}`;
const WB_SET = "wb-v1";
const wid = (key) => `${WB_SET}:${key}`;
const numStr = (v) => (v === undefined || v === null ? null : String(v));

try {
  await sql`
    insert into content_set (id, dominio, versione, note)
    values (${GHG_SET}, 'ghg', 1, 'Estratto dal prototipo gestionale-ghg-14064.html'),
           (${REPORT_SET}, 'report', 1, 'Estratto dal prototipo percorso-bilancio-v4.html'),
           (${ENERGY_SET}, 'energy', 1, 'Estratto dal prototipo bilancio-energetico-v1.html'),
           (${SUPPLIER_SET}, 'supplier', 1, 'Estratto dal prototipo esg-supplier-ready.html'),
           (${SOA_SET}, 'soa', 1, 'Estratto dal prototipo soa-iso27001.html'),
           (${AC_SET}, 'iso37001', 1, 'Estratto dal prototipo sgpc-iso37001-v1.html'),
           (${MOG_SET}, 'mog231', 1, 'Estratto dal prototipo mog-231-v1.html')
    on conflict (id) do update set note = excluded.note`;

  // --- GHG ---
  for (const c of load("ghg-categories.json")) {
    await sql`
      insert into ghg_category (id, set_id, key, nome, scope, descrizione)
      values (${id(c.id)}, ${GHG_SET}, ${c.id}, ${c.n}, ${Number(c.s.replace("Scope ", ""))}, ${c.d})
      on conflict (id) do update set nome = excluded.nome, scope = excluded.scope, descrizione = excluded.descrizione`;
  }
  for (const s of load("ghg-sources.json")) {
    await sql`
      insert into ghg_source_type (id, set_id, key, category_key, nome, descrizione)
      values (${id(s.id)}, ${GHG_SET}, ${s.id}, ${s.c}, ${s.n}, ${s.d})
      on conflict (id) do update set category_key = excluded.category_key, nome = excluded.nome, descrizione = excluded.descrizione`;
  }
  for (const f of load("ghg-emission-factors.json")) {
    await sql`
      insert into emission_factor (id, set_id, key, gruppo, nome, um, fe, fe_market, fe_biogenic, category_key, source_type_key, fonte)
      values (${id(f.id)}, ${GHG_SET}, ${f.id}, ${f.g}, ${f.n}, ${f.um}, ${numStr(f.fe)}, ${numStr(f.mkt)}, ${numStr(f.bio)}, ${f.cat}, ${f.src}, ${f.f ?? null})
      on conflict (id) do update set gruppo = excluded.gruppo, nome = excluded.nome, um = excluded.um,
        fe = excluded.fe, fe_market = excluded.fe_market, fe_biogenic = excluded.fe_biogenic,
        category_key = excluded.category_key, source_type_key = excluded.source_type_key, fonte = excluded.fonte`;
  }
  const gwp = load("ghg-gwp-sets.json");
  for (const [key, g] of Object.entries(gwp)) {
    await sql`
      insert into gwp_set (id, set_id, key, nome, valori)
      values (${id(key)}, ${GHG_SET}, ${key}, ${g.n}, ${sql.json({ ch4: g.ch4, ch4b: g.ch4b, n2o: g.n2o })})
      on conflict (id) do update set nome = excluded.nome, valori = excluded.valori`;
  }
  const checklist = load("ghg-checklist.json");
  for (const [i, v] of checklist.entries()) {
    await sql`
      insert into checklist_requirement (id, set_id, key, clausola, nome, descrizione, ordine)
      values (${id(v.id)}, ${GHG_SET}, ${v.id}, ${v.c}, ${v.n}, ${v.d}, ${i})
      on conflict (id) do update set clausola = excluded.clausola, nome = excluded.nome,
        descrizione = excluded.descrizione, ordine = excluded.ordine`;
  }
  // Scala qualità del dato (dal prototipo GHG) nella tabella delle scale.
  await sql`
    insert into rating_scale (id, set_id, key, livelli)
    values (${id("dq")}, ${GHG_SET}, 'dq', ${sql.json(load("ghg-dq-levels.json"))})
    on conflict (id) do update set livelli = excluded.livelli`;

  // --- Bilancio ---
  const guides = load("report-topic-guides.json");
  const topics = load("report-topics.json");
  for (const [i, t] of topics.entries()) {
    await sql`
      insert into materiality_topic (id, set_id, key, pillar, nome, riferimenti, guida, ordine)
      values (${id(t.id)}, ${REPORT_SET}, ${t.id}, ${t.p}, ${t.n}, ${t.r}, ${sql.json(guides[t.id] ?? {})}, ${i})
      on conflict (id) do update set pillar = excluded.pillar, nome = excluded.nome,
        riferimenti = excluded.riferimenti, guida = excluded.guida, ordine = excluded.ordine`;
  }
  for (const [i, s] of load("report-kpi-sections.json").entries()) {
    await sql`
      insert into kpi_section (id, set_id, key, nome, riferimenti, pillar, ordine)
      values (${id(s.id)}, ${REPORT_SET}, ${s.id}, ${s.n}, ${s.r}, ${s.c}, ${i})
      on conflict (id) do update set nome = excluded.nome, riferimenti = excluded.riferimenti,
        pillar = excluded.pillar, ordine = excluded.ordine`;
  }
  for (const [i, k] of load("report-kpi.json").entries()) {
    await sql`
      insert into kpi_definition (id, set_id, key, section_key, nome, um, hint, ordine)
      values (${id(k.k)}, ${REPORT_SET}, ${k.k}, ${k.s}, ${k.n}, ${k.u}, ${k.h ?? null}, ${i})
      on conflict (id) do update set section_key = excluded.section_key, nome = excluded.nome,
        um = excluded.um, hint = excluded.hint, ordine = excluded.ordine`;
  }
  const scala = load("report-scales.json");
  for (const key of Object.keys(scala)) {
    await sql`
      insert into rating_scale (id, set_id, key, livelli)
      values (${id(key)}, ${REPORT_SET}, ${key}, ${sql.json(scala[key])})
      on conflict (id) do update set livelli = excluded.livelli`;
  }
  for (const [i, n] of load("report-narrative-templates.json").entries()) {
    await sql`
      insert into narrative_template (id, set_id, key, nome, hint, ordine)
      values (${id(n.id)}, ${REPORT_SET}, ${n.id}, ${n.n}, ${n.h}, ${i})
      on conflict (id) do update set nome = excluded.nome, hint = excluded.hint, ordine = excluded.ordine`;
  }
  for (const a of load("ateco-suggestions.json")) {
    await sql`
      insert into ateco_suggestion (id, set_id, macro_settore, descrizione, punteggi)
      values (${id("ateco-" + a.macro)}, ${REPORT_SET}, ${a.macro}, ${a.descrizione}, ${sql.json(a.punteggi)})
      on conflict (id) do update set descrizione = excluded.descrizione, punteggi = excluded.punteggi`;
  }

  // --- ENERGETICO (EN 16247 / ISO 50001) ---
  // I fattori stanno in una costante separata dal catalogo dei vettori: si
  // uniscono qui sulla chiave. Il residual mix elettrico è un valore a sé nel
  // prototipo (MKT_DEF 0,4570) e finisce su 'ele', l'unico vettore che lo usa.
  const eFattori = load("energy-vector-factors.json");
  const RESIDUAL_MIX = "0.4570";
  for (const [i, v] of load("energy-vectors.json").entries()) {
    const f = eFattori[v.k] ?? {};
    await sql`
      insert into energy_vector (id, set_id, key, nome, um, categoria, rinnovabile, sub, colore,
                                 kwh_unita, tep_unita, fe_unita, fe_market, ordine)
      values (${eid(v.k)}, ${ENERGY_SET}, ${v.k}, ${v.n}, ${v.u}, ${v.c}, ${v.rin === true}, ${v.sub === true}, ${v.col ?? null},
              ${numStr(f.kwh)}, ${numStr(f.tep)}, ${numStr(f.fe)}, ${v.k === "ele" ? RESIDUAL_MIX : null}, ${i})
      on conflict (id) do update set nome = excluded.nome, um = excluded.um, categoria = excluded.categoria,
        rinnovabile = excluded.rinnovabile, sub = excluded.sub, colore = excluded.colore,
        kwh_unita = excluded.kwh_unita, tep_unita = excluded.tep_unita, fe_unita = excluded.fe_unita,
        fe_market = excluded.fe_market, ordine = excluded.ordine`;
  }

  const eAree = load("energy-areas.json");
  for (const [i, [key, a]] of Object.entries(eAree).entries()) {
    await sql`
      insert into energy_area (id, set_id, key, nome, descrizione, colore, ordine)
      values (${eid(key)}, ${ENERGY_SET}, ${key}, ${a.n}, ${a.d}, ${a.c}, ${i})
      on conflict (id) do update set nome = excluded.nome, descrizione = excluded.descrizione,
        colore = excluded.colore, ordine = excluded.ordine`;
  }

  const eGuide = load("energy-use-guides.json");
  const ePredefiniti = new Set(load("energy-end-uses-default.json"));
  for (const [i, u] of load("energy-end-uses.json").entries()) {
    const g = eGuide[u.id];
    if (!g) throw new Error(`Uso finale ${u.id} senza guida: il seed sarebbe incompleto`);
    await sql`
      insert into energy_end_use (id, set_id, key, area_key, nome, guida, predefinito, ordine)
      values (${eid(u.id)}, ${ENERGY_SET}, ${u.id}, ${u.a}, ${u.n}, ${sql.json(g)}, ${ePredefiniti.has(u.id)}, ${i})
      on conflict (id) do update set area_key = excluded.area_key, nome = excluded.nome,
        guida = excluded.guida, predefinito = excluded.predefinito, ordine = excluded.ordine`;
  }

  for (const [i, d] of load("energy-drivers.json").entries()) {
    await sql`
      insert into energy_driver_definition (id, set_id, key, nome, um, hint, ordine)
      values (${eid(d.k)}, ${ENERGY_SET}, ${d.k}, ${d.n}, ${d.u}, ${d.h ?? null}, ${i})
      on conflict (id) do update set nome = excluded.nome, um = excluded.um, hint = excluded.hint, ordine = excluded.ordine`;
  }

  for (const [i, e] of load("energy-indicators.json").entries()) {
    await sql`
      insert into energy_indicator (id, set_id, key, nome, um, decimali, hint, ordine)
      values (${eid(e.k)}, ${ENERGY_SET}, ${e.k}, ${e.n}, ${e.u}, ${e.d}, ${e.h ?? null}, ${i})
      on conflict (id) do update set nome = excluded.nome, um = excluded.um,
        decimali = excluded.decimali, hint = excluded.hint, ordine = excluded.ordine`;
  }

  // I metodi di determinazione riusano rating_scale, come i livelli di qualità
  // del dato del GHG: sono una scala di valori, non meritano una tabella propria.
  await sql`
    insert into rating_scale (id, set_id, key, livelli)
    values (${eid("metodo")}, ${ENERGY_SET}, 'metodo', ${sql.json(load("energy-methods.json"))})
    on conflict (id) do update set livelli = excluded.livelli`;

  for (const [i, n] of load("energy-narrative-templates.json").entries()) {
    await sql`
      insert into narrative_template (id, set_id, key, nome, hint, ordine)
      values (${eid(n.id)}, ${ENERGY_SET}, ${n.id}, ${n.n}, ${n.h}, ${i})
      on conflict (id) do update set nome = excluded.nome, hint = excluded.hint, ordine = excluded.ordine`;
  }

  // --- ESG Supplier Ready ---
  const aree = load("supplier-areas.json");
  for (const [i, k] of Object.keys(aree).entries()) {
    const a = aree[k];
    await sql`
      insert into supplier_area (id, set_id, key, nome, peso, colore, ordine)
      values (${sid(k)}, ${SUPPLIER_SET}, ${k}, ${a.n}, ${a.w}, ${a.c}, ${i})
      on conflict (id) do update set nome = excluded.nome, peso = excluded.peso,
        colore = excluded.colore, ordine = excluded.ordine`;
  }

  // I giorni stimati non stanno nella domanda del prototipo ma nella tabella
  // EFFORT, chiavata sul peso: qui si materializzano sulla riga, così il piano
  // non deve consultare due cataloghi per ordinare le lacune.
  const effort = load("supplier-effort.json");
  for (const [i, q] of load("supplier-questions.json").entries()) {
    await sql`
      insert into supplier_question (id, set_id, key, area_key, peso, testo, riferimento, evidenza_attesa, giorni_stimati, ordine)
      values (${sid(q.id)}, ${SUPPLIER_SET}, ${q.id}, ${q.p}, ${q.w}, ${q.t}, ${q.r}, ${q.d}, ${effort[String(q.w)]}, ${i})
      on conflict (id) do update set area_key = excluded.area_key, peso = excluded.peso,
        testo = excluded.testo, riferimento = excluded.riferimento,
        evidenza_attesa = excluded.evidenza_attesa, giorni_stimati = excluded.giorni_stimati,
        ordine = excluded.ordine`;
  }

  // Le cinque fasce di giudizio riusano rating_scale, come i metodi del modulo
  // energetico e i livelli di qualità del dato del GHG.
  await sql`
    insert into rating_scale (id, set_id, key, livelli)
    values (${sid("fascia")}, ${SUPPLIER_SET}, 'fascia', ${sql.json(load("supplier-bands.json"))})
    on conflict (id) do update set livelli = excluded.livelli`;

  // --- Dichiarazione di Applicabilità (ISO/IEC 27001 e moduli estesi) ---
  const quadri = load("soa-frameworks.json");
  for (const [i, k] of Object.keys(quadri).entries()) {
    const f = quadri[k];
    await sql`
      insert into soa_framework (id, set_id, key, nome, abbreviazione, descrizione, sempre_in_ambito, colore, ordine)
      values (${oid(k)}, ${SOA_SET}, ${k}, ${f.n}, ${f.ab}, ${f.d}, ${f.fix === true}, ${f.c}, ${i})
      on conflict (id) do update set nome = excluded.nome, abbreviazione = excluded.abbreviazione,
        descrizione = excluded.descrizione, sempre_in_ambito = excluded.sempre_in_ambito,
        colore = excluded.colore, ordine = excluded.ordine`;
  }

  const sezioni = load("soa-sections.json");
  for (const [i, k] of Object.keys(sezioni).entries()) {
    const x = sezioni[k];
    await sql`
      insert into soa_section (id, set_id, key, framework_key, nome, ordine)
      values (${oid(k)}, ${SOA_SET}, ${k}, ${x.fw}, ${x.n}, ${i})
      on conflict (id) do update set framework_key = excluded.framework_key, nome = excluded.nome, ordine = excluded.ordine`;
  }

  // Il quadro si ricava dalla sezione: nel prototipo lo faceva una .map() in
  // coda al literal, qui lo fa il seed una volta sola.
  for (const [i, c] of load("soa-controls.json").entries()) {
    const fw = sezioni[c.s].fw;
    await sql`
      insert into soa_control (id, set_id, framework_key, section_key, controllo_id, titolo, evidenza_attesa, cardine, rimandi, ordine)
      values (${oid(`${fw}:${c.id}`)}, ${SOA_SET}, ${fw}, ${c.s}, ${c.id}, ${c.t}, ${c.d}, ${c.c === 1}, ${c.x ?? null}, ${i})
      on conflict (id) do update set framework_key = excluded.framework_key, section_key = excluded.section_key,
        titolo = excluded.titolo, evidenza_attesa = excluded.evidenza_attesa, cardine = excluded.cardine,
        rimandi = excluded.rimandi, ordine = excluded.ordine`;
  }

  // Stati, motivazioni e fasce riusano rating_scale, come gli altri moduli.
  for (const [k, file] of [["stato", "soa-states.json"], ["motivazione", "soa-motivations.json"], ["fascia", "soa-bands.json"]]) {
    await sql`
      insert into rating_scale (id, set_id, key, livelli)
      values (${oid(k)}, ${SOA_SET}, ${k}, ${sql.json(load(file))})
      on conflict (id) do update set livelli = excluded.livelli`;
  }

  // --- ISO 37001, prevenzione della corruzione ---
  //
  // Il CORPUS (12 procedure, 47 moduli, 12 registri) lo semina `seed-corpus.mjs`: qui
  // c'e' il dominio. Gli otto obblighi derivati NON stanno nel database, e non e' una
  // dimenticanza: sono regole eseguibili, e vivono con la logica che le applica
  // (`src/lib/calc/anticorruzione/obblighi.ts`). Etichette qui e condizioni li'
  // vorrebbe dire poterle far divergere senza che nessuno se ne accorga.
  for (const [i, c] of load("iso37001-capi.json").entries()) {
    await sql`
      insert into bribery_chapter (id, set_id, key, nome, descrizione, ordine)
      values (${acid(`cap:${c.id}`)}, ${AC_SET}, ${c.id}, ${c.n}, ${c.d}, ${i})
      on conflict (id) do update set nome = excluded.nome, descrizione = excluded.descrizione, ordine = excluded.ordine`;
  }

  for (const [i, r] of load("iso37001-req.json").entries()) {
    await sql`
      insert into bribery_requirement (id, set_id, key, chapter_key, riferimento, procedura, testo, ordine)
      values (${acid(`req:${r.id}`)}, ${AC_SET}, ${r.id}, ${r.cap}, ${r.rif}, ${r.pro ?? null}, ${r.t}, ${i})
      on conflict (id) do update set chapter_key = excluded.chapter_key, riferimento = excluded.riferimento,
        procedura = excluded.procedura, testo = excluded.testo, ordine = excluded.ordine`;
  }

  for (const d of load("iso37001-dimensioni.json")) {
    await sql`
      insert into bribery_dimension (id, set_id, key, etichetta, descrizione, scala, ordine)
      values (${acid(`dim:${d.key}`)}, ${AC_SET}, ${d.key}, ${d.etichetta}, ${d.descrizione}, ${sql.json(d.scala)}, ${d.ordine})
      on conflict (id) do update set etichetta = excluded.etichetta, descrizione = excluded.descrizione,
        scala = excluded.scala, ordine = excluded.ordine`;
  }

  for (const x of load("iso37001-fattori.json")) {
    await sql`
      insert into bribery_flag (id, set_id, key, etichetta, ordine)
      values (${acid(`flag:${x.key}`)}, ${AC_SET}, ${x.key}, ${x.etichetta}, ${x.ordine})
      on conflict (id) do update set etichetta = excluded.etichetta, ordine = excluded.ordine`;
  }

  // --- Modello 231 ---
  //
  // Come per ISO 37001: il CORPUS (18 procedure, 54 moduli, 12 registri) lo semina
  // `seed-corpus.mjs`. Qui c'e' il dominio. La matrice del rischio a due stadi e i pesi
  // dei presidi NON stanno nel database: sono regole eseguibili e vivono in
  // `src/lib/calc/mog231/`, con la regola comune in `calc/comune/valutazione.ts`.
  for (const [i, [key, nome]] of load("mog231-fam.json").entries()) {
    await sql`
      insert into mog_family (id, set_id, key, nome, ordine)
      values (${mid(`fam:${key}`)}, ${MOG_SET}, ${key}, ${nome}, ${i})
      on conflict (id) do update set nome = excluded.nome, ordine = excluded.ordine`;
  }

  for (const [i, r] of load("mog231-reati.json").entries()) {
    await sql`
      insert into mog_crime (id, set_id, key, family_key, titolo, descrizione, ordine)
      values (${mid(`reato:${r.id}`)}, ${MOG_SET}, ${r.id}, ${r.fam}, ${r.t}, ${r.d ?? null}, ${i})
      on conflict (id) do update set family_key = excluded.family_key, titolo = excluded.titolo,
        descrizione = excluded.descrizione, ordine = excluded.ordine`;
  }

  for (const [i, c] of load("mog231-capi.json").entries()) {
    await sql`
      insert into mog_pillar (id, set_id, key, nome, descrizione, ordine)
      values (${mid(`pil:${c.id}`)}, ${MOG_SET}, ${c.id}, ${c.n}, ${c.d}, ${i})
      on conflict (id) do update set nome = excluded.nome, descrizione = excluded.descrizione, ordine = excluded.ordine`;
  }

  for (const [i, r] of load("mog231-req.json").entries()) {
    await sql`
      insert into mog_requirement (id, set_id, key, pillar_key, riferimento, procedura, testo, ordine)
      values (${mid(`req:${r.id}`)}, ${MOG_SET}, ${r.id}, ${r.cap}, ${r.rif}, ${r.pro ?? null}, ${r.t}, ${i})
      on conflict (id) do update set pillar_key = excluded.pillar_key, riferimento = excluded.riferimento,
        procedura = excluded.procedura, testo = excluded.testo, ordine = excluded.ordine`;
  }

  // Il corpus documentale dei sei moduli di conformità: 447 documenti, 6.489 blocchi.
  const corpus = await seedCorpus(sql);
  console.log(`  corpus: ${corpus.documenti} documenti, ${corpus.blocchi} blocchi, ${corpus.forme} segnaposto`);
  console.log(`  registri: ${corpus.registri} registri, ${corpus.colonneReg} colonne`);

  // ⚠️ Dopo il corpus, e non prima: il content set `wb-v1` lo crea `seedCorpus`, e i
  // capi vi puntano con una chiave esterna. Messo sopra, su un database vergine
  // fallirebbe — e su uno gia' seminato passerebbe, che e' il modo peggiore di
  // sbagliare: verde in sviluppo, rosso al primo ambiente nuovo.
  // --- SA8000/2026 ---
  //
  // ⚠️ Il gruppo di un criterio arriva dal CATALOGO, non si ricava dal codice. Nel
  // prototipo si ricavava con `codice.split(".")[0]`: per «F1» dava «F1», che fra i
  // gruppi non esiste, e i cinque fondazionali finivano in cinque riquadri separati
  // mentre `grp.F` era li' scritto per loro.
  for (const sz of load("sa8000-sezioni.json")) {
    await sql`
      insert into sa_section (id, set_id, key, nome, ordine)
      values (${said(`sez:${sz.key}`)}, ${SA_SET}, ${sz.key}, ${sz.nome}, ${sz.ordine})
      on conflict (id) do update set nome = excluded.nome, ordine = excluded.ordine`;
  }

  for (const g of load("sa8000-gruppi.json")) {
    await sql`
      insert into sa_group (id, set_id, key, section_key, nome, ordine)
      values (${said(`grp:${g.key}`)}, ${SA_SET}, ${g.key}, ${g.sezione}, ${g.nome}, ${g.ordine})
      on conflict (id) do update set section_key = excluded.section_key, nome = excluded.nome, ordine = excluded.ordine`;
  }

  for (const k of load("sa8000-criteri.json")) {
    // Il gruppo: la parte prima del punto, oppure la lettera della sezione.
    const gruppo = k.key.includes(".") ? k.key.slice(0, k.key.indexOf(".")) : k.key.slice(0, 1);
    await sql`
      insert into sa_criterion (id, set_id, key, section_key, group_key, testo, procedure, ordine)
      values (${said(`crit:${k.key}`)}, ${SA_SET}, ${k.key}, ${k.sezione}, ${gruppo}, ${k.testo}, ${k.procedure}, ${k.ordine})
      on conflict (id) do update set section_key = excluded.section_key, group_key = excluded.group_key,
        testo = excluded.testo, procedure = excluded.procedure, ordine = excluded.ordine`;
  }

  // --- Sistema di gestione integrato QAS (ISO 9001 · 14001 · 45001) ---
  //
  // ⚠️ `norme` diventa un ARRAY. Nel prototipo e' la stringa concatenata `nrm: "QAS"`,
  // interrogata con `String.includes`: in Postgres sarebbe un `LIKE '%Q%'`,
  // inindicizzabile. Qui si spezza in lettere e l'indice GIN fa il resto.
  for (const [i, [key, norma, nome]] of load("sgiqas-norme.json").entries()) {
    await sql`
      insert into qas_norm (id, set_id, key, nome, norma, ordine)
      values (${qid(`norm:${key}`)}, ${QAS_SET}, ${key}, ${nome}, ${norma}, ${i})
      on conflict (id) do update set nome = excluded.nome, norma = excluded.norma, ordine = excluded.ordine`;
  }

  for (const [i, c] of load("sgiqas-capi.json").entries()) {
    await sql`
      insert into qas_chapter (id, set_id, key, nome, ordine)
      values (${qid(`cap:${c.id}`)}, ${QAS_SET}, ${c.id}, ${c.n}, ${i})
      on conflict (id) do update set nome = excluded.nome, ordine = excluded.ordine`;
  }

  for (const [i, r] of load("sgiqas-req.json").entries()) {
    const norme = [...String(r.nrm || "")];
    await sql`
      insert into qas_requirement (id, set_id, key, chapter_key, riferimento, norme, procedura, testo, ordine)
      values (${qid(`req:${r.id}`)}, ${QAS_SET}, ${r.id}, ${r.cap}, ${r.rif}, ${norme}, ${r.pro ?? null}, ${r.t}, ${i})
      on conflict (id) do update set chapter_key = excluded.chapter_key, riferimento = excluded.riferimento,
        norme = excluded.norme, procedura = excluded.procedura, testo = excluded.testo, ordine = excluded.ordine`;
  }

  // I venti indicatori di partenza: target e soglia sono SUGGERITI, non imposti.
  for (const [i, b] of load("sgiqas-indicatori.json").entries()) {
    const [cod, nome, ambito, tipo, , formula, um, freq, target, verso, soglia] = b;
    await sql`
      insert into qas_indicator_default (id, set_id, key, nome, ambito, tipo, formula, um, frequenza,
        verso_positivo, target, soglia, ordine)
      values (${qid(`ind:${cod}`)}, ${QAS_SET}, ${cod}, ${nome}, ${ambito}, ${tipo}, ${formula}, ${um}, ${freq},
        ${verso === "Crescente"}, ${target == null ? null : String(target)}, ${soglia == null ? null : String(soglia)}, ${i})
      on conflict (id) do update set nome = excluded.nome, ambito = excluded.ambito, tipo = excluded.tipo,
        formula = excluded.formula, um = excluded.um, frequenza = excluded.frequenza,
        verso_positivo = excluded.verso_positivo, target = excluded.target, soglia = excluded.soglia,
        ordine = excluded.ordine`;
  }

  // --- Gestione delle segnalazioni (D.Lgs. 24/2023) ---
  //
  // Il content set `wb-v1` lo crea `seed-corpus.mjs` insieme alle 12 procedure e ai 34
  // moduli: qui si aggiungono i capi e i requisiti, che sono dominio e non corpus.
  //
  // I termini di legge (7 giorni, 3 mesi, 5 anni) NON stanno nel database: sono regole
  // eseguibili, e vivono in `src/lib/calc/segnalazioni/termini.ts`. In una tabella
  // sarebbero modificabili da chi non sa che sono perentori.
  for (const [i, c] of load("wb-capi.json").entries()) {
    await sql`
      insert into wb_chapter (id, set_id, key, nome, descrizione, ordine)
      values (${wid(`cap:${c.id}`)}, ${WB_SET}, ${c.id}, ${c.n}, ${c.d}, ${i})
      on conflict (id) do update set nome = excluded.nome, descrizione = excluded.descrizione, ordine = excluded.ordine`;
  }

  for (const [i, r] of load("wb-req.json").entries()) {
    await sql`
      insert into wb_requirement (id, set_id, key, chapter_key, riferimento, procedura, testo, ordine)
      values (${wid(`req:${r.id}`)}, ${WB_SET}, ${r.id}, ${r.cap}, ${r.rif}, ${r.pro ?? null}, ${r.t}, ${i})
      on conflict (id) do update set chapter_key = excluded.chapter_key, riferimento = excluded.riferimento,
        procedura = excluded.procedura, testo = excluded.testo, ordine = excluded.ordine`;
  }


  // Config limiti di piattaforma (se assente: default del piano 10/8/5).
  await sql`
    insert into platform_config (key, value)
    values ('limits', ${sql.json({ maxActiveCompanies: 10, warnAtCompanies: 8, maxMembers: 5 })})
    on conflict (key) do nothing`;

  const conta = async (t) => Number((await sql.unsafe(`select count(*)::int n from ${t}`))[0].n);
  console.log("Seed completato:");
  for (const t of [
    "content_set", "ghg_category", "ghg_source_type", "emission_factor", "gwp_set",
    "checklist_requirement", "materiality_topic", "kpi_section", "kpi_definition",
    "rating_scale", "narrative_template", "ateco_suggestion",
    "energy_vector", "energy_area", "energy_end_use", "energy_driver_definition", "energy_indicator",
    "supplier_area", "supplier_question",
    "soa_framework", "soa_section", "soa_control",
    "bribery_chapter", "bribery_requirement", "bribery_dimension", "bribery_flag",
    "mog_family", "mog_crime", "mog_pillar", "mog_requirement",
    "wb_chapter", "wb_requirement",
    "qas_norm", "qas_chapter", "qas_requirement", "qas_indicator_default",
    "sa_section", "sa_group", "sa_criterion",
  ]) {
    console.log(`  ${t}: ${await conta(t)}`);
  }
} finally {
  await sql.end();
}
