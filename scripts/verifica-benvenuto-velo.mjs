// Il benvenuto: due cose non si aprono mai insieme.
//
//   npm run qa -- benvenuto-velo [--prod]
//
// ⚠️ NASCE DA UN DIFETTO SEGNALATO DAL COMMITTENTE: «il riquadro del tour SOPRA il video»,
// con la X del video che non chiude più il video e il pulsante della formazione che fa
// altro. Due cose aperte insieme, e il velo di driver.js — che sta a un indice di
// sovrapposizione altissimo — si prende i clic destinati a ciò che sta sotto.
//
// ⚠️ E NASCE ANCHE DA UN CONTROLLO CHE NON POTEVA FALLIRE. La prova «il tour interrotto non
// propone il corso» passa anche quando il richiamo di fine tour non parte affatto: è una
// prova che non sa dire di no, e mi ha fatto credere una cosa falsa per mezza giornata.
// Questo collaudo misura FATTI SOVRAPPOSTI — quanti veli e quante finestre coesistono, e
// che cosa risponde `elementFromPoint` sui comandi — che è la classe di misura che l'occhio
// non sa fare: «non risponde» e «risponde qualcun altro» si somigliano solo da fuori.
//
// ⚠️ L'ESPERIMENTO È A VARIABILE SINGOLA. La causa sospettata è una corsa fra la chiamata
// che calcola l'itinerario e un timer da 900 ms che riapre il video. Qui la chiamata si
// rallenta apposta: se la sovrapposizione compare solo quando la si rallenta, la causa è
// quella e non un'altra. Rallentare è anche realistico — su un server freddo o con il
// database lontano quella chiamata supera i 900 ms da sola.

import { chromium } from "@playwright/test";
import postgres from "postgres";
import "dotenv/config";
import { registraEEntra } from "./comune-registrazione.mjs";
import { PWD_COLLAUDO } from "./comune-credenziali.mjs";
import { strumenta, contatore, pretendiServerAggiornato } from "./comune-collaudo.mjs";

const BASE = (process.env.BASE ?? "http://localhost:3000").replace(/\/+$/, "");
const RUN = Date.now();

console.log(`\nBenvenuto: niente si apre sopra niente — ${BASE}\n`);
await pretendiServerAggiornato(BASE);

const sql = postgres(process.env.DATABASE_URL, { prepare: false, max: 2 });
const browser = await chromium.launch({ headless: true });

/** Il velo del video della sequenza di benvenuto. */
const VELO_VIDEO = ".fixed.inset-0.z-70";

/**
 * Fotografa, in un istante, che cosa c'è aperto e chi risponde ai comandi.
 *
 * ⚠️ Il pezzo che conta è `elementFromPoint`: dice CHI c'è sotto il cursore, non se il
 * pulsante esiste. Un pulsante visibile e coperto è indistinguibile da uno rotto, se si
 * guarda solo il DOM.
 */
const istantanea = (page) =>
  page.evaluate((veloVideo) => {
    const q = (s) => document.querySelectorAll(s).length;
    const chiSta = (el) => {
      if (!el) return null;
      const r = el.getBoundingClientRect();
      if (r.width === 0) return "nascosto";
      const sopra = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
      if (!sopra) return "niente";
      if (el === sopra || el.contains(sopra)) return "se stesso";
      if (sopra.closest(".driver-overlay, .driver-popover")) return "IL VELO DEL TOUR";
      return sopra.tagName.toLowerCase() + (sopra.className ? "." + String(sopra.className).slice(0, 40) : "");
    };
    return {
      video: q(veloVideo),
      velo: q(".driver-overlay"),
      riquadro: q(".driver-popover"),
      chiudiVideo: chiSta(document.querySelector('[aria-label="Chiudi il video e continua"]')),
      formazione: chiSta(document.querySelector('a[href^="/formazione/"]')),
    };
  }, VELO_VIDEO);

/**
 * Conduce una sequenza di benvenuto e sorveglia ogni 120 ms.
 * `ritardoItinerario` rallenta la chiamata che calcola le tappe.
 */
async function sorveglia({ ritardoItinerario }) {
  const email = `velo-${RUN}-${ritardoItinerario}@example.com`;
  const page = await browser.newPage({ viewport: { width: 1500, height: 1000 } });

  if (ritardoItinerario) {
    await page.route("**/api/onboarding/percorso", async (rotta) => {
      await new Promise((r) => setTimeout(r, ritardoItinerario));
      await rotta.continue();
    });
  }

  const { orgId } = await registraEEntra(page, sql, {
    base: BASE,
    nome: "Studio Velo",
    email,
    pwd: PWD_COLLAUDO,
  });

  // ⚠️ NIENTE `spegniTour`: qui il giro guidato è l'oggetto della misura, non un ostacolo.
  await page.goto(`${BASE}/dashboard`, { waitUntil: "domcontentloaded" });
  await page.waitForSelector(VELO_VIDEO, { timeout: 60_000 });

  // ⚠️ Si aspetta che il comando sia PRONTO, non solo presente. Al primo giro dopo un
  // build il server compila la rotta mentre la finestra si sta già disegnando, e un clic
  // partito in quell'istante scade riferendo «il pulsante non risponde» su un pulsante che
  // stava soltanto arrivando. È successo una volta su quattro, e una volta su quattro è
  // esattamente la frequenza che fa dare la colpa al prodotto.
  const salta = page.getByRole("button", { name: /Salta e vai al giro guidato/i });
  await salta.waitFor({ state: "visible", timeout: 60_000 });
  await salta.click({ timeout: 60_000 });

  const scatti = [];
  for (let i = 0; i < 100; i++) {
    scatti.push({ t: i * 120, ...(await istantanea(page)) });
    await page.waitForTimeout(120);
    // Si smette quando il giro è finito: o l'offerta, o nessuna delle due cose aperte da
    // un po'. Non prima: il difetto si manifesta proprio nel mezzo.
    if (i > 12 && scatti.slice(-8).every((s) => !s.video && !s.velo)) break;
  }

  await sql`delete from "user" where email = ${email}`.catch(() => {});
  await page.close();
  return scatti;
}

const sovrapposti = (scatti) => scatti.filter((s) => s.video > 0 && (s.velo > 0 || s.riquadro > 0));
const coperti = (scatti) => scatti.filter((s) => s.chiudiVideo === "IL VELO DEL TOUR" || s.formazione === "IL VELO DEL TOUR");

// Il contatore vuole una pagina per le sue spie: gliene si dà una che resta ferma.
const paginaSpia = await browser.newPage();
const sonda = strumenta(paginaSpia);
const { agisci, riepilogo } = contatore(paginaSpia, sonda);

await agisci("⚠️ a velocità normale il video e il tour non si sovrappongono", async () => {
  const scatti = await sorveglia({ ritardoItinerario: 0 });
  const s = sovrapposti(scatti);
  if (s.length) {
    throw new Error(
      `${s.length} istanti con video E tour aperti insieme, dal millisecondo ${s[0].t}: ` +
        `video=${s[0].video} velo=${s[0].velo} riquadro=${s[0].riquadro}`,
    );
  }
});

await agisci("⚠️ ITINERARIO LENTO: il video non riappare sopra il tour", async () => {
  // È l'esperimento a variabile singola: cambia solo quanto ci mette la chiamata. Se la
  // sovrapposizione compare qui e non sopra, la causa è la corsa col timer che riapre il
  // video, e non qualcos'altro.
  const scatti = await sorveglia({ ritardoItinerario: 2500 });
  const s = sovrapposti(scatti);
  if (s.length) {
    throw new Error(
      `con la chiamata a 2,5 s: ${s.length} istanti sovrapposti dal millisecondo ${s[0].t} ` +
        `(video=${s[0].video} velo=${s[0].velo}) — la corsa è confermata`,
    );
  }
});

await agisci("⚠️ nessun comando finisce sotto il velo del tour", async () => {
  // La prova che il difetto MORDE: non «ci sono due cose aperte», ma «premendo la X
  // colpisci il velo». È la differenza fra un disordine e un comando che non risponde.
  const scatti = await sorveglia({ ritardoItinerario: 2500 });
  const c = coperti(scatti);
  if (c.length) {
    const primo = c[0];
    throw new Error(
      `al millisecondo ${primo.t} un comando è coperto dal velo — ` +
        `X del video: ${primo.chiudiVideo}, Formazione: ${primo.formazione}`,
    );
  }
});

await sql.end().catch(() => {});
await browser.close().catch(() => {});

process.exit(riepilogo("Benvenuto, sovrapposizioni") ? 1 : 0);
