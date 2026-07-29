import { test, expect } from "@playwright/test";

// Smoke minimo della pipeline e2e: home raggiungibile, zero errori console.
// Richiede il dev server avviato (npm run dev).
test("la home risponde senza errori console", async ({ page }) => {
  const consoleErrors: string[] = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") consoleErrors.push(msg.text());
  });
  const res = await page.goto("/");
  expect(res?.ok()).toBeTruthy();
  await expect(page).toHaveTitle(/.+/);
  expect(consoleErrors).toEqual([]);
});
