// Seed IDEMPOTENTE dei contenuti metodologici (content_set v1 per ghg e report).
// Gira con la connessione privilegiata (DIRECT_URL): le policy RLS limitano la
// scrittura dei cataloghi allo staff/al seed, non al ruolo app.
// Due esecuzioni consecutive producono lo stesso stato (upsert ovunque).
import "dotenv/config";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import postgres from "postgres";

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
const numStr = (v) => (v === undefined || v === null ? null : String(v));

try {
  await sql`
    insert into content_set (id, dominio, versione, note)
    values (${GHG_SET}, 'ghg', 1, 'Estratto dal prototipo gestionale-ghg-14064.html'),
           (${REPORT_SET}, 'report', 1, 'Estratto dal prototipo percorso-bilancio-v4.html'),
           (${ENERGY_SET}, 'energy', 1, 'Estratto dal prototipo bilancio-energetico-v1.html'),
           (${SUPPLIER_SET}, 'supplier', 1, 'Estratto dal prototipo esg-supplier-ready.html'),
           (${SOA_SET}, 'soa', 1, 'Estratto dal prototipo soa-iso27001.html')
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
  ]) {
    console.log(`  ${t}: ${await conta(t)}`);
  }
} finally {
  await sql.end();
}
