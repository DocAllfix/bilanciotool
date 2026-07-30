import { chromium } from "@playwright/test";
import postgres from "postgres";
import "dotenv/config";
const BASE = "https://evalisdeck.vercel.app";
const sql = postgres(process.env.DATABASE_URL, { max: 1, prepare: false });
const [row] = await sql`select ds.id, u.email from document_snapshot ds
  join member m on m.organization_id = ds.organization_id
  join "user" u on u.id = m.user_id
  where u.email like 'prod-%' order by ds.published_at desc limit 1`;
await sql.end();
const browser = await chromium.launch({ headless: true });
const page = await (await browser.newContext()).newPage();
await page.goto(BASE + "/login", { waitUntil: "networkidle" });
await page.fill("#email", row.email); await page.fill("#password", "PasswordSicura123!");
await page.click('button[type="submit"]'); await page.waitForURL("**/dashboard", { timeout: 45000 });
const res = await page.request.get(`${BASE}/api/documenti/${row.id}/pdf`, { timeout: 120000 });
console.log("HTTP", res.status()); console.log((await res.text()).slice(0, 600));
await browser.close();
