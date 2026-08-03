import { test, expect } from "@playwright/test";
import postgres from "postgres";
import "dotenv/config";

// E2E del modulo fornitori: registrazione → attivazione via DB → azienda →
// autovalutazione → questionario → piano → attestato pubblicato.
//
// Il golden: sul dataset di esempio del prototipo l'indice vale 58 e le lacune
// dichiarate sono 13. L'attestato deve portare quei numeri congelati.

test("autovalutazione fornitore fino all'attestato", async ({ page }) => {
  test.setTimeout(300_000);
  const consoleErrors: string[] = [];
  page.on("console", (m) => {
    if (m.type() === "error") consoleErrors.push(m.text());
  });
  page.on("pageerror", (e) => consoleErrors.push(e.message));

  const email = `e2e-forn-${Date.now()}@example.com`;
  await page.goto("/registrati");
  await page.fill("#nome", "Paolo Grimaldi");
  await page.fill("#email", email);
  await page.fill("#password", "PasswordSicura123!");
  await page.click('button[type="submit"]');
  await page.waitForURL("**/dashboard", { timeout: 30_000 });
  const sql = postgres(process.env.DATABASE_URL!, { max: 1, prepare: false });
  await sql`
    update org_entitlement set status = 'active'
    where organization_id = (
      select m.organization_id from member m join "user" u on u.id = m.user_id where u.email = ${email}
    )`;
  await sql.end();

  await page.evaluate(() => {
    for (const k of ["portfolio", "ghg", "bilancio", "energetico", "fornitore"]) {
      localStorage.setItem(`evalisdeck-tour:${k}`, "1");
    }
  });
  await page.reload();
  await page.waitForLoadState("networkidle");

  // Azienda e valutazione.
  await page.click('[data-tour="nuova-azienda"]');
  await page.fill("#na-nome", "E2E Carpenteria S.r.l.");
  await page.fill("#na-ateco", "25.11");
  await page.click('button[type="submit"]:has-text("Crea azienda")');
  const card = page.locator('[data-slot="card"]').filter({ hasText: "E2E Carpenteria S.r.l." }).first();
  await card.waitFor({ timeout: 20_000 });
  await card.getByRole("link", { name: "Fornitore", exact: true }).click();
  await page.waitForURL("**/fornitore", { timeout: 20_000 });
  await page.fill("#sr-crea-soglia", "60");
  await page.click('button:has-text("Avvia")');
  await expect(page.getByText("Indice di prontezza")).toBeVisible({ timeout: 30_000 });

  // Questionario: il dataset di esempio del prototipo.
  await page.click('[data-tour="sup-vista-questionario"]');
  await page.waitForURL("**vista=questionario", { timeout: 30_000 });
  const rispondi = async (k: string, e: string) => {
    await page.getByLabel(`${k}: ${e}`, { exact: true }).click();
    await page.waitForTimeout(400);
  };
  const apriArea = async (nome: string) => {
    await page.getByLabel(`Apri l'area ${nome}`).click();
    await page.waitForTimeout(500);
  };
  for (const k of ["B1", "B4"]) await rispondi(k, "Sì");
  await rispondi("B2", "In parte");
  await apriArea("Ambiente");
  for (const k of ["E1", "E5", "E7"]) await rispondi(k, "Sì");
  await rispondi("E2", "In parte");
  for (const k of ["E4", "E8"]) await rispondi(k, "No");
  await apriArea("Lavoro e diritti umani");
  for (const k of ["S1", "S3", "S4"]) await rispondi(k, "Sì");
  for (const k of ["S2", "S5"]) await rispondi(k, "In parte");
  for (const k of ["S6", "S7"]) await rispondi(k, "No");
  await apriArea("Etica e conformità");
  for (const k of ["G1", "G6"]) await rispondi(k, "Sì");
  await rispondi("G3", "In parte");
  for (const k of ["G2", "G4"]) await rispondi(k, "No");
  await apriArea("Catena di fornitura");
  await rispondi("P2", "Sì");
  await rispondi("P1", "In parte");
  await rispondi("P4", "No");
  await page.click('button:has-text("Ricalcola")');

  // Quadro: il golden del prototipo.
  await page.click('[data-tour="sup-vista-quadro"]');
  await page.waitForURL("**vista=quadro", { timeout: 30_000 });
  await expect(page.getByText("Ti mancano")).toBeVisible({ timeout: 45_000 });
  await expect(page.getByText("Governo della sostenibilità · peso").locator("..")).toContainText("83");
  await expect(page.getByText("Ambiente · peso").locator("..")).toContainText("58");

  // Piano: 13 lacune, la prima è quella che rende di più.
  await page.click('[data-tour="sup-vista-piano"]');
  await page.waitForURL("**vista=piano", { timeout: 30_000 });
  await expect(page.getByText("13 azioni")).toBeVisible({ timeout: 30_000 });
  await expect(page.getByRole("row").nth(1)).toContainText("P4");

  // Attestato: pubblicato, congelato, col disclaimer in chiaro.
  await page.click('[data-tour="sup-vista-attestato"]');
  await page.waitForURL("**vista=attestato", { timeout: 30_000 });
  await expect(page.getByText("Nessuna versione ancora pubblicata")).toBeVisible({ timeout: 30_000 });
  const [attestato] = await Promise.all([
    page.waitForEvent("popup", { timeout: 90_000 }),
    page.click('[data-tour="pubblica-documento"]'),
  ]);
  await attestato.waitForLoadState("networkidle");
  await expect(attestato.getByText("versione 1")).toBeVisible({ timeout: 30_000 });
  await expect(attestato.getByText("E2E Carpenteria S.r.l.").first()).toBeVisible();
  await expect(attestato.getByText("58").first()).toBeVisible();
  await expect(attestato.getByText(/^SR-[0-9A-Z]{7}$/).first()).toBeVisible();
  // La riga che il committente ha chiesto, in chiaro nel corpo del documento.
  await expect(
    attestato.getByText("Non costituisce certificazione, non deriva da verifica ispettiva di parte terza"),
  ).toBeVisible();
  await attestato.close();

  expect(consoleErrors).toEqual([]);
});
