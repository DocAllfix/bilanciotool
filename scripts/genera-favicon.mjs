// Favicon dal tilefavicon.svg ORIGINALE (mattonella inclusa, come disegnata).
import { chromium } from "@playwright/test";
import { readFileSync, writeFileSync } from "node:fs";
import pngToIco from "png-to-ico";

const svg = readFileSync("public/brand/tilefavicon.svg", "utf8");
const browser = await chromium.launch({ headless: true });
const page = await (await browser.newContext()).newPage();

const png = async (size, out) => {
  await page.setViewportSize({ width: size, height: size });
  await page.setContent(
    `<body style="margin:0">${svg.replace("<svg", `<svg width="${size}" height="${size}"`)}</body>`,
  );
  await page.waitForTimeout(120);
  await page.screenshot({ path: out });
  console.log(out);
};

await png(16, "src/app/icon1.png".replace("icon1", "_f16"));
await png(32, "public/brand/derivati/favicon-32.png");
await png(48, "public/brand/derivati/favicon-48.png");
await png(180, "src/app/apple-icon.png");
await png(512, "src/app/icon.png");
await browser.close();

const ico = await pngToIco(["src/app/_f16.png", "public/brand/derivati/favicon-32.png", "public/brand/derivati/favicon-48.png"]);
writeFileSync("src/app/favicon.ico", ico);
console.log("favicon.ico rigenerato");
