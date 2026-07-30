// VIDEO DI PRODOTTO girato dal software VERO in produzione (niente mockup):
// Playwright registra la sessione, cartelli e cursore sintetico danno il ritmo,
// ffmpeg converte in MP4. Uso: node scripts/gira-video.mjs [url]
import { chromium } from "@playwright/test";
import { mkdirSync, readdirSync, renameSync, rmSync, statSync, copyFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { join } from "node:path";

const BASE = process.argv[2] ?? "https://evalisdeck.vercel.app";
const OUT = process.env.VIDEO_DIR ?? "./video";
const RAW = join(OUT, "raw");
mkdirSync(RAW, { recursive: true });
const EMAIL = "demo@evalisdeck.it";
const PW = "EvalisDeck2026!";
const W = 1920;
const H = 1080;

const browser = await chromium.launch({
  headless: true,
  args: ["--force-device-scale-factor=1", "--hide-scrollbars"],
});
const ctx = await browser.newContext({
  viewport: { width: W, height: H },
  deviceScaleFactor: 1,
  recordVideo: { dir: RAW, size: { width: W, height: H } },
  reducedMotion: "no-preference",
});
const page = await ctx.newPage();

// ---------------------------------------------------------------- regia
const attesa = (ms) => page.waitForTimeout(ms);

// Cartello a schermo intero: dà respiro fra le scene e racconta cosa si vede.
async function cartello(titolo, sotto, ms = 2600) {
  await page.evaluate(
    ([t, s]) => {
      const el = document.createElement("div");
      el.id = "regia-cartello";
      el.innerHTML = `<div style="max-width:60ch;padding:0 8vw">
        <p style="margin:0;font-size:15px;letter-spacing:.24em;text-transform:uppercase;color:#6FBFAE;font-weight:600">EvalisDeck</p>
        <h1 style="margin:18px 0 0;font-size:64px;line-height:1.05;letter-spacing:-.03em;font-weight:700">${t}</h1>
        ${s ? `<p style="margin:18px 0 0;font-size:22px;line-height:1.5;color:rgba(255,255,255,.72)">${s}</p>` : ""}
      </div>`;
      Object.assign(el.style, {
        position: "fixed", inset: "0", zIndex: "2147483647", background: "#16232C", color: "#fff",
        display: "flex", alignItems: "center", justifyContent: "flex-start",
        fontFamily: "'Bricolage Grotesque', ui-sans-serif, system-ui, sans-serif",
        opacity: "0", transition: "opacity .55s cubic-bezier(.22,1,.36,1)",
      });
      document.body.appendChild(el);
      requestAnimationFrame(() => { el.style.opacity = "1"; });
    },
    [titolo, sotto ?? ""],
  );
  await attesa(ms);
  await page.evaluate(() => {
    const el = document.getElementById("regia-cartello");
    if (!el) return;
    el.style.opacity = "0";
    setTimeout(() => el.remove(), 650);
  });
  await attesa(700);
}

// Cursore sintetico: senza, i clic sembrano magia; con, sembra una persona.
async function cursore() {
  await page.evaluate(() => {
    if (document.getElementById("regia-cursore")) return;
    const c = document.createElement("div");
    c.id = "regia-cursore";
    Object.assign(c.style, {
      position: "fixed", left: "0", top: "0", width: "22px", height: "22px", zIndex: "2147483646",
      borderRadius: "50%", background: "rgba(23,94,84,.28)", border: "2px solid #175E54",
      pointerEvents: "none", transform: "translate(-50%,-50%)",
      transition: "left .55s cubic-bezier(.22,1,.36,1), top .55s cubic-bezier(.22,1,.36,1), transform .18s ease-out",
      opacity: "0",
    });
    document.body.appendChild(c);
  });
}
async function muoviA(selettore) {
  const box = await page.locator(selettore).first().boundingBox();
  if (!box) return null;
  const x = box.x + box.width / 2;
  const y = box.y + box.height / 2;
  await page.evaluate(([x, y]) => {
    const c = document.getElementById("regia-cursore");
    if (!c) return;
    c.style.opacity = "1";
    c.style.left = `${x}px`;
    c.style.top = `${y}px`;
  }, [x, y]);
  await attesa(700);
  return { x, y };
}
async function clicca(selettore, pausa = 900) {
  await muoviA(selettore);
  await page.evaluate(() => {
    const c = document.getElementById("regia-cursore");
    if (c) c.style.transform = "translate(-50%,-50%) scale(.72)";
  });
  await attesa(160);
  await page.locator(selettore).first().click();
  await page.evaluate(() => {
    const c = document.getElementById("regia-cursore");
    if (c) c.style.transform = "translate(-50%,-50%) scale(1)";
  });
  await attesa(pausa);
}
async function scorriA(pixel, durata = 1800) {
  await page.evaluate(
    ([target, dur]) => new Promise((res) => {
      const start = window.scrollY;
      const delta = target - start;
      const t0 = performance.now();
      const step = (t) => {
        const p = Math.min(1, (t - t0) / dur);
        const e = 1 - Math.pow(1 - p, 3);
        window.scrollTo(0, start + delta * e);
        p < 1 ? requestAnimationFrame(step) : res(null);
      };
      requestAnimationFrame(step);
    }),
    [pixel, durata],
  );
  await attesa(400);
}
const vai = async (url) => {
  await page.goto(url, { waitUntil: "networkidle" });
  await page.evaluate(() => {
    // Tour disattivati durante le riprese
    for (const k of ["portfolio", "ghg", "bilancio"]) localStorage.setItem(`evalisdeck-tour:${k}`, "1");
  });
  await cursore();
  await attesa(700);
};

// ================================================================== RIPRESE
// 1. Apertura
await vai(BASE + "/");
await cartello("Dalla raccolta dati<br>al documento firmato.", "Bilanci di sostenibilità e inventari GHG per le PMI italiane.", 3200);
await attesa(1400);
await scorriA(620, 2200);
await attesa(900);
await scorriA(1500, 2000);
await attesa(1100);

// 2. Accesso
await cartello("Il portafoglio dello studio", "Ogni azienda cliente con il suo stato di avanzamento.");
await vai(BASE + "/login");
await page.fill("#email", EMAIL);
await attesa(400);
await page.fill("#password", PW);
await attesa(500);
await clicca('button[type="submit"]', 2600);
await page.waitForURL("**/dashboard", { timeout: 45000 });
await page.evaluate(() => {
  for (const k of ["portfolio", "ghg", "bilancio"]) localStorage.setItem(`evalisdeck-tour:${k}`, "1");
});
await page.reload({ waitUntil: "networkidle" });
await cursore();
await attesa(2200);

// 3. Registro sorgenti: il metodo
await cartello("Il metodo incorporato", "La norma chiede una motivazione per ogni esclusione. Qui non si passa senza.");
await clicca('[data-tour="azienda-demo"] a[href*="/ghg"]', 3000);
await page.waitForLoadState("networkidle");
await cursore();
await clicca('[data-tour="ghg-passo-2"]', 2400);
await scorriA(420, 1500);
await attesa(1200);
const esclusa = page.getByRole("group", { name: /Emissioni di processo/ }).getByRole("button", { name: "Esclusa" });
if (await esclusa.count()) {
  await muoviA('[aria-label="Stato di Emissioni di processo"] button:nth-child(2)');
  await attesa(1600);
}
await attesa(1200);

// 4. Il calcolo
await cartello("I calcoli si fanno da soli", "Quantità per fattore, doppio Scope 2, incertezza combinata. In decimale.");
await clicca('[data-tour="ghg-passo-3"]', 2600);
await scorriA(260, 1300);
await attesa(2400);
await scorriA(0, 900);

// 5. I risultati
await cartello("Risultati leggibili", "Totali per categoria, doppia rendicontazione, qualità del dato.");
await clicca('[data-tour="ghg-passo-5"]', 3000);
await attesa(1800);
await scorriA(520, 2000);
await attesa(1800);
await scorriA(1150, 1800);
await attesa(1600);

// 6. Materialità
await cartello("Doppia materialità", "18 temi, ognuno con la sua guida. La matrice si aggiorna mentre valuti.");
await vai(BASE + "/dashboard");
await clicca('[data-tour="azienda-demo"] a[href$="/bilancio"]', 3200);
await page.waitForLoadState("networkidle");
await cursore();
await clicca('[data-tour="bil-passo-2"]', 3000);
await attesa(2200);
await scorriA(560, 1800);
await attesa(2000);

// 7. Il documento
await cartello("Il deck", "Documento impaginato, grafici vettoriali, versione congelata per sempre.");
const doc = await page.evaluate(async () => {
  const r = await fetch("/api/health");
  return r.ok;
});
if (doc) {
  await vai(BASE + "/dashboard");
  await clicca('[data-tour="azienda-demo"] a[href*="/ghg"]', 2600);
  await page.waitForLoadState("networkidle");
  await cursore();
  await clicca('[data-tour="ghg-passo-8"]', 2400);
  const [popup] = await Promise.all([
    page.waitForEvent("popup", { timeout: 90000 }).catch(() => null),
    clicca('[data-tour="pubblica-documento"]', 1200),
  ]);
  if (popup) {
    await popup.waitForLoadState("networkidle");
    await popup.setViewportSize({ width: W, height: H });
    await popup.bringToFront();
    await popup.waitForTimeout(2600);
    for (const y of [700, 1500, 2400]) {
      await popup.evaluate((t) => window.scrollTo({ top: t, behavior: "smooth" }), y);
      await popup.waitForTimeout(1800);
    }
    await popup.close();
    await page.bringToFront();
    await attesa(800);
  }
}

// 8. Chiusura
await cartello("EvalisDeck", "evalisdeck.vercel.app", 3400);

// ================================================================== MONTAGGIO
// Playwright registra un file PER SCHEDA: va preso quello della pagina
// principale (l'anteprima del documento è una scheda a parte, dura pochi secondi).
const videoPrincipale = await page.video()?.path();
await ctx.close();
await browser.close();

const grezzi = readdirSync(RAW).filter((f) => f.endsWith(".webm"));
if (!grezzi.length) {
  console.error("Nessun video registrato");
  process.exit(1);
}
const sorgente = videoPrincipale && grezzi.some((f) => videoPrincipale.endsWith(f))
  ? videoPrincipale
  : join(RAW, grezzi.map((f) => ({ f, s: statSync(join(RAW, f)).size })).sort((a, b) => b.s - a.s)[0].f);
const webm = join(OUT, "evalisdeck-demo.webm");
copyFileSync(sorgente, webm);
rmSync(RAW, { recursive: true, force: true });

const mp4 = join(OUT, "evalisdeck-demo.mp4");
const ffmpeg = process.env.FFMPEG ?? "ffmpeg";
execFileSync(
  ffmpeg,
  ["-y", "-i", webm, "-vf", "fade=t=in:st=0:d=0.8,format=yuv420p", "-c:v", "libx264", "-preset", "slow", "-crf", "20", "-movflags", "+faststart", "-an", mp4],
  { stdio: "ignore" },
);
console.log("VIDEO PRONTO:");
console.log("  " + webm);
console.log("  " + mp4);
