import { env } from "@/lib/env";
import { indirizzoCorrente } from "@/lib/indirizzo";

// Generazione PDF: lo stesso template HTML del documento, "stampato" da un
// Chromium headless che naviga la pagina AUTENTICATO (cookie di sessione
// inoltrati). Doppio percorso:
//   - produzione/Vercel → @sparticuz/chromium + puppeteer-core (serverless)
//   - sviluppo → il Chromium di Playwright già installato
// Import dinamici: nessuno dei due pesa sul bundle dell'app.

const IS_SERVERLESS = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);

export async function renderPdf(path: string, cookieHeader: string): Promise<Buffer> {
  const base = indirizzoCorrente();
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
      // ⚠️ E IL SEGRETO DI BYPASS, quando c'e'.
      //
      // Questo generatore apre il PROPRIO indirizzo con Chromium. Su un deploy di
      // ANTEPRIMA quell'indirizzo e' protetto da Vercel: senza il segreto, Chromium
      // riceve la pagina di accesso di Vercel e stampa QUELLA. Il risultato e' un PDF
      // vero, di una pagina, identico per ogni documento — e passa qualunque controllo
      // che si accontenti dei byte magici e della dimensione.
      //
      // In produzione la variabile non c'e' e non serve: il dominio con certificato
      // proprio non e' protetto. Qui non allarga niente, perche' il segreto lo conosce
      // gia' chi puo' leggerlo dall'ambiente.
      const bypass = process.env.VERCEL_AUTOMATION_BYPASS_SECRET;
      await page.setExtraHTTPHeaders({
        cookie: cookieHeader,
        ...(bypass ? { "x-vercel-protection-bypass": bypass } : {}),
      });
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
