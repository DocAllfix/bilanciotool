import { test, expect } from "@playwright/test";
import postgres from "postgres";
import "dotenv/config";
import { PWD_COLLAUDO } from "./credenziali";

// E2E del modulo SoA: registrazione → attivazione via DB → azienda →
// Dichiarazione → moduli estesi → decisioni sui controlli → pubblicazione.
//
// I due punti che questo percorso deve dimostrare, oltre al funzionamento:
// l'ambito si allarga attivando i moduli, e la nota di conformità al punto
// 6.1.3 lettera d) compare nel documento consegnato.

test("Dichiarazione di Applicabilità fino al documento", async ({ page }) => {
  test.setTimeout(360_000);
  const consoleErrors: string[] = [];
  page.on("console", (m) => {
    if (m.type() === "error") consoleErrors.push(m.text());
  });
  page.on("pageerror", (e) => consoleErrors.push(e.message));

  const email = `e2e-soa-${Date.now()}@example.com`;
  await page.goto("/registrati");
  await page.fill("#nome", "Elena Costa");
  await page.fill("#email", email);
  await page.fill("#password", PWD_COLLAUDO);
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
    for (const k of ["portfolio", "ghg", "bilancio", "energetico", "fornitore", "soa"]) {
      localStorage.setItem(`evalisdeck-tour:${k}`, "1");
    }
  });
  await page.reload();
  await page.waitForLoadState("networkidle");

  // Azienda e Dichiarazione.
  await page.click('[data-tour="nuova-azienda"]');
  await page.fill("#na-nome", "E2E Cloud S.r.l.");
  await page.fill("#na-ateco", "62.01");
  await page.click('button[type="submit"]:has-text("Crea azienda")');
  const card = page.locator('[data-slot="card"]').filter({ hasText: "E2E Cloud S.r.l." }).first();
  await card.waitFor({ timeout: 20_000 });
  await card.getByRole("link", { name: "SoA", exact: true }).click();
  await page.waitForURL("**/soa", { timeout: 60_000 });
  await page.click('button:has-text("Avvia la Dichiarazione")');
  await expect(page.getByText("Indice di maturità").first()).toBeVisible({ timeout: 60_000 });
  // I 93 controlli dell'Allegato A sono sempre in ambito.
  await expect(page.getByText("93 controlli in ambito").first()).toBeVisible({ timeout: 30_000 });

  // Contesto: perimetro, firme e un modulo esteso.
  await page.click('[data-tour="soa-vista-contesto"]');
  await page.waitForURL("**vista=contesto", { timeout: 40_000 });
  await page.getByLabel("Perimetro del sistema di gestione").fill("Erogazione di servizi applicativi in cloud.");
  await page.keyboard.press("Tab");
  await page.waitForTimeout(1200);
  await page.getByLabel("Documento: Approvato da").fill("Direzione generale");
  await page.keyboard.press("Tab");
  await page.waitForTimeout(1200);
  await page.getByLabel("Attiva il quadro 27017").check();
  await expect(page.getByText("100 controlli in ambito").first()).toBeVisible({ timeout: 40_000 });

  // Registro: uno stato, una motivazione, un'esclusione motivata.
  await page.click('[data-tour="soa-vista-controlli"]');
  await page.waitForURL("**vista=controlli", { timeout: 40_000 });
  await page.getByLabel("Cerca fra i controlli").fill("5.1");
  await page.waitForTimeout(900);
  await page.getByLabel("Stato di attuazione di 5.1").first().click();
  await page.getByRole("option", { name: "Attuato e verificato" }).click();
  await page.waitForTimeout(1200);
  await page.getByLabel("Apri il controllo 5.1").first().click();
  await page.waitForTimeout(500);
  await page.getByLabel("5.1: Valutazione del rischio").click();
  await page.waitForTimeout(1200);
  await page.getByLabel("Riferimento documentale di 5.1").fill("POL-001");
  await page.keyboard.press("Tab");
  await page.waitForTimeout(1200);

  await page.getByLabel("Cerca fra i controlli").fill("8.4");
  await page.waitForTimeout(900);
  await page.getByLabel("Applicabilità di 8.4").first().click();
  await page.getByRole("option", { name: "Escluso" }).click();
  await page.waitForTimeout(1500);
  await page.getByLabel("Apri il controllo 8.4").first().click();
  await page.waitForTimeout(500);
  await page.getByLabel("Giustificazione dell'esclusione di 8.4")
    .fill("L'organizzazione non sviluppa software proprietario.");
  await page.keyboard.press("Tab");
  await page.waitForTimeout(1500);
  await page.click('button:has-text("Ricalcola")');

  // Quadro: l'esclusione toglie il controllo dagli applicabili.
  await page.click('[data-tour="soa-vista-quadro"]');
  await page.waitForURL("**vista=quadro", { timeout: 40_000 });
  await expect(page.getByText("99 applicabili").first()).toBeVisible({ timeout: 45_000 });

  // Documento: pubblicato, congelato, con la nota di conformità.
  await page.click('[data-tour="soa-vista-documento"]');
  await page.waitForURL("**vista=documento", { timeout: 40_000 });
  await expect(page.getByText("Nessuna versione ancora pubblicata").first()).toBeVisible({ timeout: 30_000 });
  const [documento] = await Promise.all([
    page.waitForEvent("popup", { timeout: 120_000 }),
    page.click('[data-tour="pubblica-documento"]'),
  ]);
  await documento.waitForLoadState("networkidle");
  await expect(documento.getByText("versione 1")).toBeVisible({ timeout: 40_000 });
  await expect(documento.getByText("E2E Cloud S.r.l.").first()).toBeVisible();
  // La riga che rende il documento conforme alla norma.
  await expect(documento.getByText("6.1.3 lettera d)").first()).toBeVisible();
  await expect(documento.getByText("non sviluppa software proprietario").first()).toBeVisible();
  await documento.close();

  expect(consoleErrors).toEqual([]);
});
