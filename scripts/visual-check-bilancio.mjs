// Gate visivo del percorso Bilancio (light/dark). Richiede `npm run dev` attivo.
import { chromium } from "@playwright/test";
import { mkdirSync } from "node:fs";
import postgres from "postgres";
import "dotenv/config";
import { registraEEntra } from "./comune-registrazione.mjs";

const OUT = process.env.SHOT_DIR ?? "./shots-bilancio";
mkdirSync(OUT, { recursive: true });
const BASE = "http://localhost:3000";
const errors = [];

const browser = await chromium.launch({ headless: true });
const page = await (await browser.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
page.on("console", (m) => { if (m.type() === "error") errors.push(`[${page.url()}] ${m.text()}`); });
page.on("pageerror", (e) => errors.push(`[pageerror] ${e.message}`));

const shot = (n) => page.screenshot({ path: `${OUT}/${n}.png` });
const tema = async (verso) => { await page.click(`button[aria-label*="${verso}"]`); await page.waitForTimeout(400); };
const vaiPasso = async (n, atteso) => {
  // In dev le transizioni RSC dopo molte mutazioni superano i 20s: retry incluso.
  for (let tentativo = 0; tentativo < 2; tentativo++) {
    try {
      await page.click(`[data-tour="bil-passo-${n}"]`);
      await page.waitForURL(`**passo=${n}`, { timeout: 30000 });
      await page.getByText(atteso, { exact: false }).first().waitFor({ timeout: 30000 });
      await page.waitForTimeout(500);
      return;
    } catch (e) {
      if (tentativo === 1) throw e;
    }
  }
};

const email = `visual-bil-${Date.now()}@example.com`;
await page.goto(BASE + "/registrati");
await page.waitForLoadState("networkidle");
  await registraEEntra(page, sql, { base: BASE, nome: "Giulia Riva", email: email, pwd: "PasswordSicura123!" });
const sql = postgres(process.env.DATABASE_URL, { max: 1, prepare: false });
await sql`update org_entitlement set status='active' where organization_id = (select m.organization_id from member m join "user" u on u.id=m.user_id where u.email=${email})`;
await sql.end();

await page.reload();
await page.waitForLoadState("networkidle");
await page.click('[data-tour="nuova-azienda"]');
await page.fill("#na-nome", "Cartiera del Sele S.p.A.");
await page.fill("#na-settore", "Carta e cartone");
await page.fill("#na-ateco", "17.12");
await page.click('button[type="submit"]:has-text("Crea azienda")');
await page.getByRole("link", { name: "Bilancio", exact: true }).waitFor({ timeout: 15000 });
await page.getByRole("link", { name: "Bilancio", exact: true }).click();
await page.waitForURL("**/bilancio", { timeout: 15000 });
await page.waitForLoadState("networkidle");
await page.waitForTimeout(800);
await page.fill("#cb-anno", "2025");
await page.click('button:has-text("Crea")');
try {
  await page.waitForURL("**/bilancio/2025**", { timeout: 25000 });
} catch {
  await page.click('button:has-text("Crea")');
  await page.waitForURL("**/bilancio/2025**", { timeout: 45000 });
}
await page.waitForLoadState("networkidle");
await page.fill("#p-ateco", "17.12");
await page.keyboard.press("Tab");
await page.waitForTimeout(800);
await shot("01-bil-passo1-organizzazione");

// Materialità: punteggi seedati via DB (l'interazione UI è già coperta
// dall'e2e bilancio.spec — qui serve solo popolare la matrice per la foto).
const projectId = page.url().match(/\/aziende\/[^/]+\/bilancio\/2025/) ? await (async () => {
  const s2 = postgres(process.env.DATABASE_URL, { max: 1, prepare: false });
  const [row] = await s2`select rp.id from report_project rp join company c on c.id = rp.company_id
    join member m on m.organization_id = c.organization_id join "user" u on u.id = m.user_id
    where u.email = ${email} and rp.anno = 2025 limit 1`;
  const punteggi = [["T01", 4, 3], ["T02", 4, 4], ["T07", 5, 4], ["T03", 2, 2]];
  for (const [t, imp, fin] of punteggi) {
    await s2`insert into materiality_assessment (id, organization_id, project_id, topic_key, score_impact, score_financial)
      select gen_random_uuid()::text, c.organization_id, ${row.id}, ${t}, ${imp}, ${fin}
      from report_project rp join company c on c.id = rp.company_id where rp.id = ${row.id}
      on conflict (project_id, topic_key) do update set score_impact = excluded.score_impact, score_financial = excluded.score_financial`;
  }
  await s2.end();
  return row.id;
})() : null;
await vaiPasso(2, "Matrice di doppia rilevanza");
await page.reload();
await page.waitForLoadState("networkidle");
await page.getByText("3 materiali · 4/18 valutati").waitFor({ timeout: 30000 });
await page.click('[data-tour="proposta-ateco"]');
await page.getByLabel("Guida Cambiamento climatico ed emissioni").click();
await page.waitForTimeout(400);
await shot("02-bil-passo2-materialita");
await tema("scuro");
await shot("03-bil-passo2-materialita-dark");
await tema("chiaro");

await vaiPasso(3, "Energia");
await page.getByLabel("Energia elettrica prelevata dalla rete 2025").fill("100000");
await page.keyboard.press("Tab");
await page.waitForTimeout(1200);
await page.getByLabel("Gas naturale 2025").fill("12500");
await page.keyboard.press("Tab");
await page.waitForTimeout(1200);
await shot("04-bil-passo3-kpi");

await vaiPasso(4, "tema materiale");
await shot("05-bil-passo4-politiche");

await vaiPasso(5, "capitoli discorsivi").catch(() => vaiPasso(5, "bozza"));
await page.waitForTimeout(800);
await shot("06-bil-passo5-racconto");

await vaiPasso(6, "Pronto a pubblicare");
await shot("07-bil-passo6-verifica");

console.log("EMAIL_TEST=" + email);
if (errors.length) {
  console.log("CONSOLE_ERRORS:");
  for (const e of errors) console.log("  " + e);
  process.exitCode = 1;
} else {
  console.log("CONSOLE_ERRORS: nessuno");
}
await browser.close();
