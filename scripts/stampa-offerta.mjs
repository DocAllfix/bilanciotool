// Rende in PDF l'offerta HTML (uso una tantum, fuori dal prodotto).
// Uso: node scripts/stampa-offerta.mjs <input.html> <output.pdf>
import { chromium } from "@playwright/test";
import { pathToFileURL } from "node:url";

const [, , input, output] = process.argv;
const browser = await chromium.launch({ headless: true });
const page = await (await browser.newContext()).newPage();
await page.goto(pathToFileURL(input).href, { waitUntil: "networkidle" });
await page.evaluate(() => document.fonts.ready);
await page.waitForTimeout(400);
await page.pdf({
  path: output,
  format: "A4",
  printBackground: true,
  margin: { top: 0, right: 0, bottom: 0, left: 0 },
});
await browser.close();
console.log("PDF:", output);
