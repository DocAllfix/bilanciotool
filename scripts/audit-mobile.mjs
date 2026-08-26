// Audit del telefono, misurato e non a occhio.
//
// Cerca i quattro difetti che su schermo stretto si vedono solo provandoli:
//   1. la pagina che scorre in orizzontale (il piu grave: si nota subito e
//      fa sembrare il sito rotto);
//   2. aree toccabili sotto i 44x44 px, la soglia sotto la quale il dito
//      sbaglia bersaglio;
//   3. testo tagliato da `truncate` dove non c'e alternativa per leggerlo;
//   4. testo sotto i 12px, illeggibile senza zoom.
//
// Gira sulle pagine pubbliche e, se gli si passano le credenziali, anche
// sull'app. Serve un numero che deve tornare, non un'impressione.
import { chromium, devices } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { rumoreDiPiattaforma } from "./comune-collaudo.mjs";

const BASE = process.env.BASE ?? "http://localhost:3000";
const OUT = process.env.SHOT_DIR ?? "./shots-mobile";
mkdirSync(OUT, { recursive: true });

// Due misure reali: iPhone moderno e uno degli schermi piu stretti in giro.
const SCHERMI = [
  { nome: "390x844", viewport: { width: 390, height: 844 } },
  { nome: "360x740", viewport: { width: 360, height: 740 } },
];

const PUBBLICHE = ["/", "/privacy", "/cookie", "/termini", "/login", "/registrati"];
const APP = ["/dashboard", "/documenti", "/impostazioni", "/guida"];

const problemi = [];
const segnala = (schermo, rotta, tipo, dettaglio) =>
  problemi.push({ schermo, rotta, tipo, dettaglio });

async function analizza(page, schermo, rotta) {
  const esito = await page.evaluate(() => {
    const fuori = [];
    const piccoli = [];
    const tagliati = [];
    const minuscoli = [];

    const larghezza = window.innerWidth;
    const sborda = document.documentElement.scrollWidth - larghezza;

    // Chi sfora davvero: si guardano gli elementi, non solo il documento,
    // cosi si sa QUALE elemento allarga la pagina.
    if (sborda > 1) {
      for (const el of document.querySelectorAll("body *")) {
        const b = el.getBoundingClientRect();
        if (b.width === 0 || b.right <= larghezza + 1) continue;
        const st = getComputedStyle(el);
        if (st.position === "fixed" || st.display === "none") continue;
        fuori.push(
          `${el.tagName.toLowerCase()}${el.className && typeof el.className === "string" ? "." + el.className.split(" ").slice(0, 2).join(".") : ""} sfora di ${Math.round(b.right - larghezza)}px`,
        );
        if (fuori.length >= 4) break;
      }
    }

    // Aree toccabili: link e bottoni visibili.
    for (const el of document.querySelectorAll("a[href], button, [role=button], input, select, summary")) {
      const b = el.getBoundingClientRect();
      if (b.width === 0 || b.height === 0) continue;
      const st = getComputedStyle(el);
      if (st.visibility === "hidden" || st.pointerEvents === "none") continue;
      // Si misura l'area SENSIBILE, non quella disegnata: dove c'e lo
      // pseudo-elemento di allargamento il dito ha piu spazio del bordo.
      const dopo = getComputedStyle(el, "::after");
      const allargato = dopo.content !== "none" && dopo.position === "absolute";
      // Gli scostamenti si leggono, non si suppongono: uno pseudo-elemento puo
      // allargare in verticale, in orizzontale o in tutte e due le direzioni.
      const fuoriY = allargato ? -Math.min(0, parseFloat(dopo.top) || 0) : 0;
      const fuoriX = allargato ? -Math.min(0, parseFloat(dopo.left) || 0) : 0;
      const minH = allargato ? parseFloat(dopo.minHeight) || 0 : 0;
      const minW = allargato ? parseFloat(dopo.minWidth) || 0 : 0;
      const altezzaUtile = Math.max(b.height + fuoriY * 2, minH);
      const larghezzaUtile = Math.max(b.width + fuoriX * 2, minW);
      if (larghezzaUtile >= 44 && altezzaUtile >= 44) continue;
      // Un link dentro un paragrafo e testo, non un bersaglio: si esclude.
      // Un collegamento dentro un testo corrente e testo, non un bersaglio:
      // ingrandirlo vorrebbe dire ingrandire il paragrafo. Stessa cosa per le
      // ancore dentro i titoli delle sezioni legali.
      const genitore = el.parentElement?.tagName ?? "";
      if (el.tagName === "A" && ["P", "LI", "SPAN", "H1", "H2", "H3"].includes(genitore)) continue;
      const etichetta = (el.getAttribute("aria-label") || el.textContent || el.tagName).trim().slice(0, 32);
      piccoli.push(`«${etichetta}» ${Math.round(larghezzaUtile)}x${Math.round(altezzaUtile)}`);
      if (piccoli.length >= 6) break;
    }

    // Testo tagliato: `truncate` su un elemento il cui contenuto non ci sta.
    for (const el of document.querySelectorAll(".truncate")) {
      if (el.scrollWidth > el.clientWidth + 2 && el.clientWidth > 0) {
        const t = (el.textContent ?? "").trim().slice(0, 40);
        tagliati.push(`«${t}…»`);
        if (tagliati.length >= 6) break;
      }
    }

    // Testo troppo piccolo, escluse le etichette in maiuscoletto che per
    // convenzione sono piccole e brevi.
    for (const el of document.querySelectorAll("p, li, span, dd, dt, td")) {
      const t = (el.textContent ?? "").trim();
      if (t.length < 25) continue;
      if (el.children.length > 0) continue;
      if (el.closest("[aria-hidden=\"true\"]")) continue;
      const px = parseFloat(getComputedStyle(el).fontSize);
      if (px < 12) {
        minuscoli.push(`${px}px: «${t.slice(0, 40)}…»`);
        if (minuscoli.length >= 4) break;
      }
    }

    return { sborda, fuori, piccoli, tagliati, minuscoli };
  });

  if (esito.sborda > 1) segnala(schermo, rotta, "scorre in orizzontale", `${esito.sborda}px · ${esito.fuori.join(" | ") || "elemento non identificato"}`);
  for (const p of esito.piccoli) segnala(schermo, rotta, "area toccabile piccola", p);
  for (const t of esito.tagliati) segnala(schermo, rotta, "testo tagliato", t);
  for (const m of esito.minuscoli) segnala(schermo, rotta, "testo minuscolo", m);
}

const browser = await chromium.launch({ headless: true });
const erroriConsole = [];

for (const schermo of SCHERMI) {
  const ctx = await browser.newContext({
    ...devices["iPhone 13"],
    viewport: schermo.viewport,
    isMobile: true,
    hasTouch: true,
  });
  await ctx.addInitScript(() => {
    localStorage.setItem("evalisdeck-cookie-informativa", "1");
    for (const k of ["portfolio", "ghg", "bilancio", "energetico", "fornitore", "soa"]) {
      localStorage.setItem(`evalisdeck-tour:${k}`, "1");
    }
  });
  const page = await ctx.newPage();
  page.on("console", (m) => { if (m.type() === "error" && !rumoreDiPiattaforma(m.text())) erroriConsole.push(`[${schermo.nome} ${page.url()}] ${m.text().slice(0, 160)}`); });
  page.on("pageerror", (e) => erroriConsole.push(`[${schermo.nome}] ${e.message.slice(0, 160)}`));

  for (const rotta of PUBBLICHE) {
    await page.goto(BASE + rotta, { waitUntil: "networkidle" });
    await page.waitForTimeout(500);
    await analizza(page, schermo.nome, rotta);
    if (rotta === "/") await page.screenshot({ path: `${OUT}/${schermo.nome}-home.png` });
  }

  if (process.env.QA_EMAIL) {
    await page.goto(BASE + "/login", { waitUntil: "networkidle" });
    await page.fill("#email", process.env.QA_EMAIL);
    await page.fill("#password", process.env.QA_PASSWORD ?? "");
    await page.click('button[type="submit"]');
    await page.waitForURL("**/dashboard", { timeout: 60_000 });
    for (const rotta of APP) {
      await page.goto(BASE + rotta, { waitUntil: "networkidle" });
      await page.waitForTimeout(700);
      await analizza(page, schermo.nome, rotta);
      if (rotta === "/dashboard") await page.screenshot({ path: `${OUT}/${schermo.nome}-dashboard.png`, fullPage: true });
    }
    // Il fascicolo e la pagina piu densa dell'app.
    const href = await page.evaluate(() => document.querySelector('a[aria-label^="Apri "]')?.getAttribute("href") ?? null);
    if (href) {
      await page.goto(BASE + href, { waitUntil: "networkidle" });
      await page.waitForTimeout(700);
      await analizza(page, schermo.nome, "/aziende/[id]");
      await page.screenshot({ path: `${OUT}/${schermo.nome}-fascicolo.png`, fullPage: true });
    }
  }
  await ctx.close();
}
await browser.close();

// ------------------------------------------------------------------ esito
const perTipo = new Map();
for (const p of problemi) {
  const k = p.tipo;
  if (!perTipo.has(k)) perTipo.set(k, []);
  perTipo.get(k).push(p);
}
if (problemi.length === 0) {
  console.log("Nessun difetto misurato su telefono.");
} else {
  for (const [tipo, voci] of perTipo) {
    console.log(`\n▸ ${tipo.toUpperCase()} (${voci.length})`);
    const visti = new Set();
    for (const v of voci) {
      const chiave = `${v.rotta}|${v.dettaglio}`;
      if (visti.has(chiave)) continue;
      visti.add(chiave);
      console.log(`  ${v.rotta.padEnd(16)} ${v.dettaglio}`);
    }
  }
}
console.log(`\nTotale: ${problemi.length} rilievi · errori di console: ${erroriConsole.length}`);
for (const e of erroriConsole.slice(0, 5)) console.log("  " + e);
process.exit(problemi.length || erroriConsole.length ? 1 : 0);
