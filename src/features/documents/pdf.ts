import { env } from "@/lib/env";

// Generazione PDF: lo stesso template HTML del documento, "stampato" da un
// Chromium headless che naviga la pagina AUTENTICATO (cookie di sessione
// inoltrati). Doppio percorso:
//   - produzione/Vercel → @sparticuz/chromium + puppeteer-core (serverless)
//   - sviluppo → il Chromium di Playwright già installato
// Import dinamici: nessuno dei due pesa sul bundle dell'app.

const IS_SERVERLESS = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);

export async function renderPdf(path: string, cookieHeader: string): Promise<Buffer> {
  const base = env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const url = `${base}${path}`;

  if (IS_SERVERLESS) {
    const [{ default: chromium }, { default: puppeteer }] = await Promise.all([
      import("@sparticuz/chromium"),
      import("puppeteer-core"),
    ]);
    const browser = await puppeteer.launch({
      args: chromium.args,
      executablePath: await chromium.executablePath(),
      headless: true,
    });
    try {
      const page = await browser.newPage();
      await page.setExtraHTTPHeaders({ cookie: cookieHeader });
      await page.goto(url, { waitUntil: "networkidle0", timeout: 60_000 });
      const pdf = await page.pdf({ format: "a4", printBackground: true, preferCSSPageSize: true });
      return Buffer.from(pdf);
    } finally {
      await browser.close();
    }
  }

  // Sviluppo: Chromium di Playwright (già presente per gli e2e).
  const { chromium: pw } = await import("@playwright/test");
  const browser = await pw.launch({ headless: true });
  try {
    const ctx = await browser.newContext({ extraHTTPHeaders: { cookie: cookieHeader } });
    const page = await ctx.newPage();
    await page.goto(url, { waitUntil: "networkidle", timeout: 60_000 });
    const pdf = await page.pdf({ format: "A4", printBackground: true, preferCSSPageSize: true });
    return Buffer.from(pdf);
  } finally {
    await browser.close();
  }
}
