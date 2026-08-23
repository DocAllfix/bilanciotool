import { chromium } from "@playwright/test";
import postgres from "postgres";
import "dotenv/config";
import { registraEEntra } from "../scripts/comune-registrazione.mjs";
import { PWD_COLLAUDO } from "../scripts/comune-credenziali.mjs";
import { spegniTour } from "../scripts/comune-collaudo.mjs";
const BASE = "http://localhost:3000";
const email = `arc3-${Date.now()}@example.com`;
const NOME = `Da Archiviare ${Date.now().toString().slice(-6)} S.r.l.`;
const b = await chromium.launch({ headless: true });
const p = await (await b.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
const sql = postgres(process.env.DATABASE_URL, { max: 1, prepare: false });
const { orgId } = await registraEEntra(p, sql, { base: BASE, nome: "Sonda", email, pwd: PWD_COLLAUDO });
await sql`update org_entitlement set status='active', piano='studio', activated_at=now() where organization_id=${orgId}`;
await sql`insert into company (id, organization_id, nome, settore, is_demo) values (gen_random_uuid(), ${orgId}, ${NOME}, 'Prove', false)`;
await spegniTour(p);
await p.goto(`${BASE}/dashboard`, { waitUntil: "domcontentloaded", timeout: 60000 });
const card = p.locator('[data-slot="card"]').filter({ hasText: NOME });
await card.locator("[data-modulo]").first().waitFor({ timeout: 60000 });
await card.getByRole("button", { name: "Altre azioni" }).click();
await p.getByRole("menuitem", { name: /Archivia/i }).click();
await p.getByRole("button", { name: /^Archivia$/ }).click();
const t0 = Date.now();
let visto = -1;
while (Date.now() - t0 < 45000) {
  if ((await card.locator("[data-modulo]").count()) === 0) { visto = Date.now() - t0; break; }
  await p.waitForTimeout(500);
}
const [r] = await sql`select stato from company where organization_id=${orgId} and nome=${NOME}`;
console.log("  nel database:", r?.stato);
console.log("  la pagina si aggiorna dopo:", visto < 0 ? "MAI (45 s)" : `${visto} ms`);
await sql.end(); await b.close();
