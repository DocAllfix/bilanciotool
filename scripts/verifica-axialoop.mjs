// Misura il badge «powered by Axialoop» sulle pagine pubbliche: rel, contrasto, altezza,
// colore del contorno del logo nei due temi, riga propria da telefono. Più le foto.
//
// Sola lettura: gira anche contro la produzione.
//   npm run qa -- axialoop            (locale)
//   npm run qa -- axialoop --prod     (sito vero)
//   node scripts/verifica-axialoop.mjs <cartella>   (anche le foto, da GUARDARE)
//
// ⚠️ Carica una trentina di pagine in pochi secondi: lanciato a ridosso di un altro
// collaudo dallo stesso indirizzo fa scattare il limite generico di Better Auth
// (60 richieste al minuto) e il collaudo DOPO vede 429 su /api/auth/get-session.
import { chromium } from "@playwright/test";
import { attraversaProtezione, rumoreDiPiattaforma } from "./comune-collaudo.mjs";

const BASE = process.env.BASE ?? "http://localhost:3000";
// ⚠️ Solo un argomento che NON comincia col trattino: `qa.mjs` inoltra `--prod`, e la prima
// versione lo prendeva per la cartella delle foto e creava `--prod/` nella radice del repo.
const OUT = process.argv.slice(2).find((x) => !x.startsWith("-"));
const PAGINE = ["/", "/prezzi", "/blog", "/privacy", "/termini", "/cookie", "/verifica", "/percorsi/bilancio-energetico"];

function lum([r, g, b]) {
  const f = (c) => { c /= 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}
const rgb = (s) => (s.match(/[\d.]+/g) || []).slice(0, 3).map(Number);
const contrasto = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };

const browser = await chromium.launch();
let ko = 0;
for (const tema of ["light", "dark"]) {
  for (const [w, h] of [[1440, 900], [375, 800]]) {
    const ctx = await browser.newContext({ viewport: { width: w, height: h } });
    await ctx.addInitScript((t) => { try { localStorage.setItem("theme", t); localStorage.setItem("evalis-consenso", "rifiutato"); } catch {} }, tema);
    const page = await ctx.newPage();
    await attraversaProtezione(page);
    const errori = [];
    page.on("console", (m) => { if (m.type() === "error" && !rumoreDiPiattaforma(m.text())) errori.push(m.text().slice(0, 120)); });
    page.on("response", (r) => { if (r.status() >= 400) errori.push(`${r.status()} ${r.url().replace(BASE, "")}`); });
    for (const p of PAGINE) {
      await page.goto(BASE + p, { waitUntil: "domcontentloaded" });
      const a = page.locator('[data-slot="powered-by-axialoop"]');
      if ((await a.count()) !== 1) { ko++; console.log(`KO ${p} ${tema} ${w}: badge trovati ${await a.count()}`); continue; }
      await a.scrollIntoViewIfNeeded();
      const m = await a.evaluate((el) => {
        // ⚠️ I colori calcolati arrivano in oklch(): leggerne le cifre come RGB dà numeri
        // inventati. Li si dipinge su un pixel e si legge il pixel.
        const cv = document.createElement("canvas"); cv.width = cv.height = 1;
        const cx = cv.getContext("2d", { willReadFrequently: true });
        const inRgb = (c) => { cx.clearRect(0, 0, 1, 1); cx.fillStyle = "#000"; cx.fillStyle = c; cx.fillRect(0, 0, 1, 1); const d = cx.getImageData(0, 0, 1, 1).data; return `rgb(${d[0]}, ${d[1]}, ${d[2]})`; };
        const cs = getComputedStyle(el);
        let n = el, bg = "rgba(0, 0, 0, 0)";
        while (n && (bg === "rgba(0, 0, 0, 0)" || bg === "transparent")) { bg = getComputedStyle(n).backgroundColor; n = n.parentElement; }
        const r = el.getBoundingClientRect();
        const contorno = inRgb(getComputedStyle(el.querySelector("svg path")).fill);
        const scuro = document.documentElement.classList.contains("dark");
        const riga = el.parentElement.getBoundingClientRect();
        const fratelli = [...el.parentElement.children].filter((c) => c !== el).map((c) => c.getBoundingClientRect());
        const rigaPropria = fratelli.every((f) => f.bottom <= r.top + 1 || f.top >= r.bottom - 1);
        return { rel: el.getAttribute("rel"), href: el.getAttribute("href"), colore: inRgb(cs.color), bg: inRgb(bg), altezza: r.height, contorno, scuro, rigaPropria, logo: el.querySelector("svg").getBoundingClientRect().height };
      });
      const c = contrasto(rgb(m.colore), rgb(m.bg));
      const pb = contrasto(rgb(m.contorno), rgb(m.bg));
      const problemi = [];
      if (m.rel !== "noopener") problemi.push(`rel=${m.rel}`);
      if (m.href !== "https://www.axialoop.com/it") problemi.push(`href=${m.href}`);
      if (c < 4.5) problemi.push(`contrasto testo ${c.toFixed(2)}`);
      if (m.altezza < 24) problemi.push(`altezza ${m.altezza}`);
      if (pb < 3) problemi.push(`contorno logo poco visibile ${pb.toFixed(2)}`);
      if ((tema === "dark") !== m.scuro) problemi.push(`tema applicato sbagliato`);
      if (w < 640 && !p.match(/privacy|termini|cookie/) && !m.rigaPropria) problemi.push("da telefono non sta in una riga sua");
      if (problemi.length) ko++;
      console.log(`${problemi.length ? "KO" : "ok"} ${p} ${tema} ${w}px testo ${c.toFixed(2)} logo ${pb.toFixed(2)} h=${m.altezza} logo=${m.logo}${problemi.length ? " -> " + problemi.join("; ") : ""}`);
      if (OUT && (p === "/" || p === "/privacy")) {
        const rifiuta = page.getByRole("button", { name: "Rifiuta" });
        if (await rifiuta.isVisible().catch(() => false)) await rifiuta.click();
        await a.scrollIntoViewIfNeeded();
        const r = await a.boundingBox();
        const y = Math.max(0, r.y - 60);
        await page.screenshot({ path: `${OUT}/axialoop${p.replace(/\//g, "-") || "-home"}-${tema}-${w}.png`, clip: { x: 0, y, width: w, height: Math.min(160, h - y) } });
      }
    }
    const sporchi = errori.filter((e) => !/Content Security Policy|googletagmanager/i.test(e));
    if (sporchi.length) { ko++; console.log(`KO console ${tema} ${w}: ${sporchi.join(" | ")}`); }
    await ctx.close();
  }
}
await browser.close();
console.log(ko ? `\n${ko} problemi` : "\nTutto verde");
process.exit(ko ? 1 : 0);
