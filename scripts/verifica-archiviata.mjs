// Un'azienda archiviata si CONSULTA: ogni pagina si apre, e aprirla non scrive niente.
//
// Dal 8 ottobre 2026 il database rifiuta il lavoro nuovo su un'azienda archiviata
// (migrazione 0061, trigger `azienda_scrivibile`). Il rischio di quella regola non è ciò
// che blocca, ma ciò che potrebbe bloccare SENZA volerlo: una pagina che creasse la propria
// riga radice solo per essere aperta si romperebbe proprio su un'azienda archiviata — cioè
// «si può consultare tutto» diventerebbe falso, e lo scoprirebbe un cliente.
//
// Per questo il controllo apre il fascicolo e i quattordici percorsi di DUE aziende
// archiviate — una con un esercizio già aperto, una vuota — e pretende per ciascuna pagina:
// risposta 200, la fascia «azienda archiviata», console pulita. E alla fine conta le righe
// legate alle due aziende in OGNI tabella che porta il trigger: devono essere le stesse di
// prima. La prova di «non scrive niente» è la riga che non compare, non l'assenza di errori.
//
//   npm run qa -- archiviata

import { chromium } from "@playwright/test";
import postgres from "postgres";
import { randomUUID } from "node:crypto";
import "dotenv/config";
import { registraEEntra } from "./comune-registrazione.mjs";
import { PWD_COLLAUDO } from "./comune-credenziali.mjs";
import { spegniTour, attraversaProtezione, rumoreDiPiattaforma } from "./comune-collaudo.mjs";

const BASE = (process.env.BASE ?? "http://localhost:3000").replace(/\/+$/, "");
// Il collaudo scrive nel database (azienda, esercizio, archiviazione): mai contro la
// produzione. Un'anteprima invece sì — ha le variabili del ramo e parla con lo sviluppo — e
// il criterio è quale database si tocca, non se l'indirizzo è locale.
if (/^https?:\/\/(www\.)?evalisdeck\.it(\/|$)/.test(BASE)) {
  console.error(`Questo collaudo scrive nel database: si rifiuta di girare contro la produzione (${BASE}).`);
  process.exit(1);
}

const MODULI = ["ghg", "energetico", "bilancio", "sgesg", "fornitore", "mog231", "anticorruzione", "segnalazioni",
  "filiera", "nis2", "sgnis2", "sgiqas", "sa8000", "soa"];

let ok = 0, ko = 0;
const check = async (nome, fn) => {
  try { await fn(); ok++; console.log("  ok   " + nome); }
  catch (e) { ko++; console.log("  KO   " + nome + " -> " + String(e.message).split("\n")[0].slice(0, 200)); }
};

const RUN = Date.now();
const sql = postgres(process.env.DATABASE_URL, { prepare: false, max: 2 });
const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 950 } });
const page = await ctx.newPage();
await attraversaProtezione(page);
const errori = [];
page.on("console", (m) => { if (m.type() === "error" && !rumoreDiPiattaforma(m.text())) errori.push(`${page.url()}: ${m.text().slice(0, 140)}`); });
page.on("pageerror", (e) => errori.push(`${page.url()}: pageerror ${e.message.slice(0, 140)}`));

console.log(`\nAzienda archiviata: si consulta senza scrivere — ${BASE}\n`);

try {
  const { orgId } = await registraEEntra(page, sql, {
    base: BASE, nome: "Studio Archivio", email: `archiviata-${RUN}@example.com`, pwd: PWD_COLLAUDO,
  });
  await sql`update org_entitlement set status='active', piano='studio', activated_at=now() where organization_id=${orgId}`;
  await spegniTour(page);

  // Due aziende, preparate ATTIVE (con l'azienda archiviata il trigger non le lascerebbe
  // nascere con un esercizio), poi archiviate.
  const conDati = randomUUID();
  const vuota = randomUUID();
  await sql`insert into company (id, organization_id, nome) values (${conDati}, ${orgId}, ${"Archiviata con dati S.r.l."}), (${vuota}, ${orgId}, ${"Archiviata vuota S.r.l."})`;
  const [set] = await sql`select id from content_set where dominio = 'ghg' order by versione desc limit 1`;
  await sql`insert into ghg_inventory (id, organization_id, company_id, anno, anno_base, content_set_id)
            values (${randomUUID()}, ${orgId}, ${conDati}, 2025, 2024, ${set.id})`;
  await sql`update company set stato = 'archived', archived_at = now() where id in (${conDati}, ${vuota})`;

  // Le tabelle sorvegliate le dice il database: sono quelle che portano il trigger.
  const tabelle = (await sql`select distinct c.relname as t from pg_trigger tr join pg_class c on c.oid = tr.tgrelid
                             where tr.tgname = 'azienda_scrivibile' order by 1`).map((r) => r.t);
  const conta = async () => {
    const out = {};
    for (const t of tabelle) {
      const [r] = await sql.unsafe(`select count(*)::int as n from "${t}" where company_id in ($1, $2)`, [conDati, vuota]);
      out[t] = r.n;
    }
    return out;
  };
  const prima = await conta();

  for (const [quale, id] of [["con dati", conDati], ["vuota", vuota]]) {
    for (const percorso of ["", ...MODULI.map((m) => `/${m}`)]) {
      const url = `${BASE}/aziende/${id}${percorso}`;
      await check(`${quale}: ${percorso || "fascicolo"} si apre in sola lettura`, async () => {
        const r = await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60_000 });
        if (!r || r.status() !== 200) throw new Error(`risposta ${r?.status()}`);
        await page.locator('[data-slot="azienda-archiviata"]').waitFor({ timeout: 30_000 });
        // ⚠️ I percorsi per esercizio rinviano all'ultimo anno (`/ghg` → `/ghg/2025`) con
        // `redirect()` lato server, ma sotto l'azienda c'è un `loading.tsx`: la risposta
        // arriva in streaming e il rinvio diventa una navigazione del CLIENT, che scatta
        // DOPO che la fascia è comparsa. Senza aspettarla, il `goto` della pagina dopo
        // veniva interrotto (`ERR_ABORTED`) e il collaudo accusava la pagina sbagliata —
        // due volte, sempre sull'energetico che segue il GHG. Si aspetta che l'indirizzo
        // smetta di cambiare: è il fatto, non un ritardo fisso.
        let prima = page.url();
        for (let i = 0; i < 20; i++) {
          await page.waitForTimeout(250);
          const ora = page.url();
          if (ora === prima && i >= 3) break;
          prima = ora;
        }
        await page.waitForLoadState("domcontentloaded");
      });
    }
  }

  await check("aprire tutte le pagine non ha scritto niente", async () => {
    const dopo = await conta();
    const diverse = tabelle.filter((t) => dopo[t] !== prima[t]).map((t) => `${t}: ${prima[t]} → ${dopo[t]}`);
    if (diverse.length) throw new Error(diverse.join("; "));
  });
} finally {
  await sql.end();
  await browser.close();
}

console.log(`\nAzienda archiviata: ${ok} ok, ${ko} falliti`);
console.log(errori.length ? "ERRORI CONSOLE:\n" + errori.slice(0, 20).join("\n") : "Console pulita.");
process.exit(ko > 0 || errori.length ? 1 : 0);
