// Collaudo del consenso, misurato sulle RICHIESTE DI RETE VERE.
//
// È l'unico modo onesto di verificarlo. Si può leggere il codice e convincersi che «senza
// consenso non parte niente»: ma fra il codice e il browser ci sono il prerendering, la
// cache, un `<Script>` con la strategia sbagliata, un componente reso due volte. L'unica
// prova che regge davanti a un'autorità è la lista delle richieste uscite dal browser.
//
// Ogni prova parte da un contesto NUOVO: cookie e archiviazione vuoti, come un visitatore
// che arriva per la prima volta.
//
//   node scripts/verifica-consenso.mjs
//   BASE=https://evalisdeck.it node scripts/verifica-consenso.mjs

import { chromium } from "@playwright/test";

const BASE = (process.env.BASE ?? "http://localhost:3000").replace(/\/+$/, "");
const esiti = [];
const nota = (nome, ok, dettaglio) => esiti.push({ nome, ok, dettaglio });

/** Gli host che non devono essere contattati senza consenso. */
const HOST_GOOGLE = /googletagmanager\.com|google-analytics\.com|analytics\.google\.com|doubleclick\.net|googleadservices\.com/;

const browser = await chromium.launch({ headless: true });

/** Un visitatore nuovo di zecca, con la registrazione di tutto ciò che chiede alla rete. */
async function visitatore() {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  const richieste = [];
  const erroriConsole = [];
  page.on("request", (r) => richieste.push(r.url()));
  page.on("console", (m) => { if (m.type() === "error") erroriConsole.push(m.text()); });
  page.on("pageerror", (e) => erroriConsole.push(String(e.message)));
  return {
    ctx,
    page,
    erroriConsole,
    verso: (re) => richieste.filter((u) => re.test(u)),
    azzera: () => (richieste.length = 0),
    cookie: async () => (await ctx.cookies()).map((c) => c.name),
  };
}

const attesa = (p) => p.waitForTimeout(2500);

// ============================================================================
// 1. Chi non ha ancora scelto: verso Google non deve partire NIENTE
// ============================================================================
{
  const v = await visitatore();
  await v.page.goto(`${BASE}/`, { waitUntil: "networkidle" });
  await attesa(v.page);

  const chiamate = v.verso(HOST_GOOGLE);
  nota(
    "prima della scelta",
    chiamate.length === 0,
    chiamate.length === 0
      ? "nessuna richiesta verso Google"
      : `${chiamate.length} richieste partite senza consenso: ${chiamate.slice(0, 3).join(", ")}`,
  );

  const ga = (await v.cookie()).filter((n) => n.startsWith("_ga"));
  nota("nessun cookie _ga prima della scelta", ga.length === 0, ga.length ? ga.join(", ") : "nessuno");

  const banner = v.page.getByRole("dialog", { name: /consenso ai cookie/i });
  nota("il banner compare", await banner.isVisible().catch(() => false), "riquadro di scelta presente");

  // Rifiutare deve costare quanto accettare: stessa misura, stesso riquadro, un clic.
  const rifiuta = v.page.getByRole("button", { name: "Rifiuta", exact: true });
  const accetta = v.page.getByRole("button", { name: "Accetta", exact: true });
  const [br, ba] = [await rifiuta.boundingBox(), await accetta.boundingBox()];
  const pariMisura = br && ba && Math.abs(br.width - ba.width) <= 2 && Math.abs(br.height - ba.height) <= 1;
  nota(
    "rifiuto facile quanto il consenso",
    Boolean(pariMisura),
    br && ba
      ? `Rifiuta ${Math.round(br.width)}×${Math.round(br.height)} · Accetta ${Math.round(ba.width)}×${Math.round(ba.height)}`
      : "uno dei due pulsanti non è visibile",
  );

  nota("nessun errore in console", v.erroriConsole.length === 0, v.erroriConsole.slice(0, 2).join(" | ") || "pulita");
  await v.ctx.close();
}

// ============================================================================
// 2. Chi rifiuta: niente, nemmeno dopo aver navigato
// ============================================================================
{
  const v = await visitatore();
  await v.page.goto(`${BASE}/`, { waitUntil: "networkidle" });
  await v.page.getByRole("button", { name: "Rifiuta", exact: true }).click();
  await attesa(v.page);
  v.azzera();

  await v.page.goto(`${BASE}/privacy`, { waitUntil: "networkidle" });
  await attesa(v.page);

  const chiamate = v.verso(HOST_GOOGLE);
  nota(
    "dopo il rifiuto",
    chiamate.length === 0,
    chiamate.length === 0 ? "nessuna richiesta verso Google, anche cambiando pagina" : chiamate.slice(0, 3).join(", "),
  );

  const ga = (await v.cookie()).filter((n) => n.startsWith("_ga"));
  nota("nessun cookie _ga dopo il rifiuto", ga.length === 0, ga.length ? ga.join(", ") : "nessuno");

  const banner = v.page.getByRole("dialog", { name: /consenso ai cookie/i });
  nota(
    "il rifiuto viene ricordato",
    !(await banner.isVisible().catch(() => false)),
    "il banner non ritorna sulla pagina successiva",
  );
  await v.ctx.close();
}

// ============================================================================
// 3. Chi accetta: la misurazione deve funzionare davvero
// ============================================================================
{
  const v = await visitatore();
  await v.page.goto(`${BASE}/`, { waitUntil: "networkidle" });
  await v.page.getByRole("button", { name: "Accetta", exact: true }).click();
  await attesa(v.page);

  const chiamate = v.verso(HOST_GOOGLE);
  nota(
    "dopo il consenso",
    chiamate.length > 0,
    chiamate.length > 0
      ? `${chiamate.length} richieste verso Google: la misurazione parte`
      : "NESSUNA richiesta: il consenso non accende niente, Analytics non misura",
  );

  const ga = (await v.cookie()).filter((n) => n.startsWith("_ga"));
  nota("il cookie _ga compare dopo il consenso", ga.length > 0, ga.join(", ") || "nessuno");

  // ---- e il ripensamento deve spegnere tutto -------------------------------
  await v.page.goto(`${BASE}/cookie`, { waitUntil: "networkidle" });
  await v.page.getByRole("button", { name: /preferenze cookie/i }).first().click();
  await v.page.waitForTimeout(500);
  const bannerTornato = await v.page
    .getByRole("dialog", { name: /consenso ai cookie/i })
    .isVisible()
    .catch(() => false);
  nota("la revoca riapre la scelta", bannerTornato, "«Preferenze cookie» ripresenta il riquadro");

  v.azzera();
  await v.page.goto(`${BASE}/privacy`, { waitUntil: "networkidle" });
  await attesa(v.page);
  const dopoRevoca = v.verso(HOST_GOOGLE);
  nota(
    "dopo la revoca si spegne",
    dopoRevoca.length === 0,
    dopoRevoca.length === 0 ? "nessuna richiesta verso Google" : `${dopoRevoca.length} richieste ancora in corso`,
  );
  await v.ctx.close();
}

// ============================================================================
// 4. I testi legali devono dire quello che il sito fa
// ============================================================================
{
  const v = await visitatore();
  await v.page.goto(`${BASE}/cookie`, { waitUntil: "networkidle" });
  const testoCookie = await v.page.locator("main").innerText();

  // La frase che c'era prima di GA4 e che ora sarebbe falsa.
  nota(
    "la cookie policy non mente più",
    !/non abbiamo strumenti di analisi statistica di terze parti/i.test(testoCookie),
    "tolta la frase che negava gli strumenti di analisi",
  );
  nota(
    "la cookie policy nomina Google Analytics",
    /google analytics/i.test(testoCookie) && /_ga/.test(testoCookie),
    "servizio e cookie dichiarati per nome",
  );
  nota(
    "la cookie policy spiega la revoca",
    /revoc/i.test(testoCookie) && /preferenze cookie/i.test(testoCookie),
    "revoca spiegata e comando nominato",
  );

  await v.page.goto(`${BASE}/privacy`, { waitUntil: "networkidle" });
  const testoPrivacy = await v.page.locator("main").innerText();
  nota(
    "la privacy dichiara il trasferimento",
    /stati uniti/i.test(testoPrivacy) && /data privacy framework/i.test(testoPrivacy),
    "trasferimento extra-UE e sua base giuridica dichiarati",
  );
  nota(
    "la privacy dichiara la base giuridica del consenso",
    /consenso \(art\. 6\.1\.a\)/i.test(testoPrivacy),
    "statistiche fondate sul consenso, non sul legittimo interesse",
  );
  await v.ctx.close();
}

await browser.close();

for (const e of esiti) console.log(`  ${e.ok ? "ok  " : "ROSSO"} ${e.nome.padEnd(38)} ${e.dettaglio}`);
const rossi = esiti.filter((e) => !e.ok).length;
console.log(`\n${esiti.length} controlli · ${rossi} rossi · ${BASE}`);
process.exitCode = rossi > 0 ? 1 : 0;
