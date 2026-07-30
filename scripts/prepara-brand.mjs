// Prepara gli asset di brand DAGLI ORIGINALI, senza modificarne il disegno:
// 1. toglie il rettangolo di sfondo (primo path che copre tutta la tela),
// 2. ritaglia la viewBox al contenuto reale (misurato dal browser),
// 3. esporta i PNG che i browser e le email pretendono come file separati.
// Gli originali in public/brand/ NON vengono toccati.
import { chromium } from "@playwright/test";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { join } from "node:path";

const SRC = "public/brand";
const OUT = "public/brand/derivati";
mkdirSync(OUT, { recursive: true });

// [sorgente, destinazione, togliSfondo, margine%]
const LAVORI = [
  ["lockupprincipale.svg", "logo-verticale.svg", true, 2],
  ["solomonogramma.svg", "monogramma.svg", true, 2],
  ["monogrammasufondoscuro.svg", "monogramma-chiaro.svg", true, 2],
  ["tilefavicon.svg", "icona.svg", true, 0],
  ["logosoloorizzontale.svg", "logo-orizzontale.svg", true, 2],
];

const senzaSfondo = (svg) =>
  // Il fondo è sempre il primo path rettangolare a tutta tela: si rimuove solo quello.
  svg.replace(/<path fill="#[0-9A-Fa-f]{6}" d="M0 0L[\d.]+ 0L[\d.]+ [\d.]+L0 [\d.]+L0 0Z"\/>/, "");

const browser = await chromium.launch({ headless: true });
const page = await (await browser.newContext()).newPage();

for (const [sorgente, destinazione, togli, margine] of LAVORI) {
  const originale = readFileSync(join(SRC, sorgente), "utf8");
  const pulito = togli ? senzaSfondo(originale) : originale;

  // Misura del contenuto reale con getBBox del browser.
  const tmp = join(OUT, "_tmp.svg");
  writeFileSync(tmp, pulito);
  await page.goto(pathToFileURL(tmp).href);
  const bbox = await page.evaluate(() => {
    const svg = document.querySelector("svg");
    const b = svg.getBBox();
    return { x: b.x, y: b.y, w: b.width, h: b.height };
  });

  const m = (Math.max(bbox.w, bbox.h) * margine) / 100;
  const vb = `${(bbox.x - m).toFixed(2)} ${(bbox.y - m).toFixed(2)} ${(bbox.w + m * 2).toFixed(2)} ${(bbox.h + m * 2).toFixed(2)}`;
  const finale = pulito
    .replace(/viewBox="[^"]+"/, `viewBox="${vb}"`)
    .replace(/\swidth="\d+"\s+height="\d+"/, "");
  writeFileSync(join(OUT, destinazione), finale);
  console.log(`${destinazione.padEnd(26)} viewBox ${vb}`);
}

// ------------------------------------------------------------------ PNG
// Favicon (dall'icona) e logo per le email (che non supportano l'SVG).
const esportaPng = async (svgPath, out, size, sfondo = "transparent") => {
  const svg = readFileSync(svgPath, "utf8");
  // Serve una pagina HTML: dopo aver aperto un SVG, setContent fallisce.
  await page.goto("about:blank");
  await page.setViewportSize({ width: size, height: size });
  await page.setContent(
    `<html><body style="margin:0;background:${sfondo};display:flex;align-items:center;justify-content:center;width:${size}px;height:${size}px">
      <div style="width:${size}px;height:${size}px">${svg.replace("<svg", `<svg width="${size}" height="${size}"`)}</div>
    </body></html>`,
  );
  await page.waitForTimeout(180);
  await page.screenshot({ path: out, omitBackground: sfondo === "transparent" });
  console.log(`${out} (${size}px)`);
};

for (const s of [16, 32, 48, 180, 192, 512]) {
  await esportaPng(join(OUT, "icona.svg"), join(OUT, `icona-${s}.png`), s);
}
await esportaPng(join(OUT, "monogramma.svg"), join(OUT, "monogramma-256.png"), 256);

await browser.close();
