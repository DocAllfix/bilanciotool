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
const id = (key) => `v1:${key}`;
const numStr = (v) => (v === undefined || v === null ? null : String(v));

try {
  await sql`
    insert into content_set (id, dominio, versione, note)
    values (${GHG_SET}, 'ghg', 1, 'Estratto dal prototipo gestionale-ghg-14064.html'),
           (${REPORT_SET}, 'report', 1, 'Estratto dal prototipo percorso-bilancio-v4.html')
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
  ]) {
    console.log(`  ${t}: ${await conta(t)}`);
  }
} finally {
  await sql.end();
}
