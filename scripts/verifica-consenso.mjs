// Collaudo del consenso, misurato sulle RICHIESTE DI RETE VERE.
//
// È l'unico modo onesto di verificarlo. Si può leggere il codice e convincersi che «senza
// consenso non parte niente»: ma fra il codice e il browser ci sono il prerendering, la
// cache, un `<Script>` con la strategia sbagliata, un componente reso due volte. L'unica
// prova che regge davanti a un'autorità è la lista delle richieste uscite dal browser.
//
// ⚠️ DUE FINALITÀ (21 ottobre 2026): statistiche (Google Analytics) e pubblicità (Google
// Ads). I due tag di Google sono combinati — ciascuno porta con sé l'altro — e la difesa è
// una CSP più stretta nel browser per chi acconsente a una sola. Per questo qui si contano
// le richieste USCITE, cioè non fermate dal browser: una richiesta che il browser blocca
// è la difesa che funziona, non un invio.
//
// Ogni prova parte da un contesto NUOVO: cookie e archiviazione vuoti, come un visitatore
// che arriva per la prima volta, e da un ANNUNCIO (`gclid` e `utm_*` nell'indirizzo).
//
//   node scripts/verifica-consenso.mjs
//   BASE=https://evalisdeck.it node scripts/verifica-consenso.mjs

import { chromium } from "@playwright/test";
import { rumoreDiPiattaforma } from "./comune-collaudo.mjs";

const BASE = (process.env.BASE ?? "http://localhost:3000").replace(/\/+$/, "");
// ⚠️ SUL SITO VERO SI ARRIVA DALLA HOME NUDA. Un `gclid` finto finirebbe fra i clic di Google
// Ads che il consulente legge, e `utm_*` fra i nostri conteggi degli arrivi: due misure vere
// sporcate da un collaudo. Lì le prove sul conteggio si saltano (le fa `qa -- arrivi`, altrove).
const IN_PRODUZIONE = /^https:\/\/(www\.)?evalisdeck\.it/.test(BASE);
const DA_ANNUNCIO = IN_PRODUZIONE
  ? "/"
  : "/?gclid=COLLAUDO-CONSENSO&utm_source=google&utm_medium=cpc&utm_campaign=collaudo";
const esiti = [];
const nota = (nome, ok, dettaglio) => esiti.push({ nome, ok, dettaglio });

/** Tutto ciò che è Google. */
const HOST_GOOGLE = /googletagmanager\.com|google-analytics\.com|analytics\.google\.com|doubleclick\.net|googleadservices\.com|googlesyndication\.com|www\.google\.(com|it)\//;
/** Dove arrivano le misure di Analytics. */
const HOST_STATISTICHE = /google-analytics\.com|analytics\.google\.com/;
/** Dove arrivano le misure di Google Ads. */
const HOST_PUBBLICITA = /doubleclick\.net|googleadservices\.com|googlesyndication\.com|www\.google\.(com|it)\//;

const browser = await chromium.launch({ headless: true });

/** Un visitatore nuovo di zecca, con la registrazione di tutto ciò che chiede alla rete. */
async function visitatore() {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  const tentate = [];
  const bloccate = new Set();
  const arrivi = [];
  const erroriConsole = [];
  const violazioni = [];
  page.on("request", (r) => {
    tentate.push(r.url());
    if (r.url().endsWith("/api/arrivi")) arrivi.push(r.postData() ?? "");
  });
  // ⚠️ Le misure di Google partono come BEACON, e Playwright li dà per «interrotti»
  // (`ERR_ABORTED`) anche quando sono usciti: contare i soli `requestfinished` dava zero
  // misure a una pagina che misurava. Ciò che conta è distinguere ciò che il BROWSER ha
  // fermato per la CSP, che Playwright marca come `csp`.
  page.on("requestfailed", (r) => {
    if (/csp|blocked/i.test(r.failure()?.errorText ?? "")) bloccate.add(r.url());
  });
  page.on("console", (m) => {
    const t = m.text();
    // Lo script di commento che Vercel inietta nelle sole anteprime: lo blocca la nostra CSP,
    // giustamente, e in produzione non esiste. Va escluso PRIMA di contare le violazioni.
    if (rumoreDiPiattaforma(t)) return;
    if (/Content Security Policy|Refused to (load|connect)/i.test(t)) violazioni.push(t.slice(0, 160));
    else if (m.type() === "error" && !rumoreDiPiattaforma(t)) erroriConsole.push(t);
  });
  page.on("pageerror", (e) => erroriConsole.push(String(e.message)));
  return {
    ctx,
    page,
    erroriConsole,
    violazioni,
    arrivi,
    tentate: (re) => tentate.filter((u) => re.test(u)),
    /** Le richieste uscite davvero: tentate, e non fermate dal browser. */
    arrivate: (re) => tentate.filter((u) => re.test(u) && !bloccate.has(u)),
    azzera: () => {
      tentate.length = 0;
      bloccate.clear();
      violazioni.length = 0;
    },
    cookie: async () => (await ctx.cookies()).map((c) => c.name),
  };
}

const attesa = (p, ms = 3000) => p.waitForTimeout(ms);
const banner = (page) => page.getByRole("dialog", { name: /consenso ai cookie/i });

/** Apre la pagina da un annuncio e aspetta il riquadro, che esiste solo dopo l'idratazione. */
async function arriva(v) {
  await v.page.goto(`${BASE}${DA_ANNUNCIO}`, { waitUntil: "domcontentloaded" });
  await banner(v.page).waitFor({ timeout: 20_000 });
}

/** Sceglie con «Personalizza»: le caselle indicate, e nient'altro. */
async function personalizza(page, { statistiche, pubblicita }) {
  await page.getByRole("button", { name: "Personalizza", exact: true }).click();
  if (statistiche) await page.getByRole("checkbox", { name: /Statistiche/ }).check();
  if (pubblicita) await page.getByRole("checkbox", { name: /Pubblicità/ }).check();
  await page.getByRole("button", { name: "Salva le scelte", exact: true }).click();
}

/** gtag è stato caricato? Con la sola pubblicità parte solo se Google Ads è configurato. */
const gtagInPagina = (page) => page.locator("script[data-gtag]").count();

// ============================================================================
// 1. Chi non ha ancora scelto: verso Google non deve partire NIENTE
// ============================================================================
{
  const v = await visitatore();
  await arriva(v);
  await attesa(v.page);

  const chiamate = v.tentate(HOST_GOOGLE);
  nota(
    "prima della scelta",
    chiamate.length === 0,
    chiamate.length === 0
      ? "nessuna richiesta verso Google"
      : `${chiamate.length} richieste partite senza consenso: ${chiamate.slice(0, 3).join(", ")}`,
  );

  const traccianti = (await v.cookie()).filter((n) => /^_ga|^_gcl/i.test(n));
  nota("nessun cookie prima della scelta", traccianti.length === 0, traccianti.join(", ") || "nessuno");

  nota("il banner compare", await banner(v.page).isVisible().catch(() => false), "riquadro di scelta presente");

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

  // E da TELEFONO, dove i pulsanti vanno a capo: la prima versione del banner a tre comandi
  // lasciava «Accetta» da solo su una riga, largo il doppio di «Rifiuta». Visto nelle foto,
  // non da questo controllo, che misurava solo a 1280.
  await v.page.setViewportSize({ width: 360, height: 760 });
  await v.page.waitForTimeout(300);
  const [tr, ta] = [await rifiuta.boundingBox(), await accetta.boundingBox()];
  const pariTelefono = tr && ta && Math.abs(tr.width - ta.width) <= 2 && Math.abs(tr.height - ta.height) <= 1;
  nota(
    "rifiuto facile quanto il consenso, da telefono",
    Boolean(pariTelefono),
    tr && ta
      ? `Rifiuta ${Math.round(tr.width)}×${Math.round(tr.height)} · Accetta ${Math.round(ta.width)}×${Math.round(ta.height)}`
      : "uno dei due pulsanti non è visibile",
  );
  await v.page.setViewportSize({ width: 1280, height: 900 });

  // Le due caselle di «Personalizza» partono VUOTE: una casella già spuntata non è un consenso.
  await v.page.getByRole("button", { name: "Personalizza", exact: true }).click();
  const spuntate = [
    await v.page.getByRole("checkbox", { name: /Statistiche/ }).isChecked(),
    await v.page.getByRole("checkbox", { name: /Pubblicità/ }).isChecked(),
  ].filter(Boolean).length;
  nota("«Personalizza» parte con le caselle vuote", spuntate === 0, `${spuntate} caselle già spuntate su 2`);

  // Il NOSTRO conteggio degli arrivi parte comunque: non usa cookie e non ha bisogno del
  // consenso. Ma non deve portarsi dietro il valore del gclid.
  if (IN_PRODUZIONE) {
    nota("senza campagna nell'indirizzo, nessun conteggio", v.arrivi.length === 0, `${v.arrivi.length} invii a /api/arrivi`);
  } else {
    nota(
      "il conteggio degli arrivi parte senza consenso",
      v.arrivi.length === 1,
      v.arrivi.length === 1 ? `un solo invio a /api/arrivi` : `${v.arrivi.length} invii a /api/arrivi`,
    );
    nota(
      "il conteggio non porta il gclid",
      v.arrivi.every((c) => !c.includes("COLLAUDO-CONSENSO")),
      "dell'identificativo del clic resta solo che c'era",
    );
  }

  nota("nessun errore in console", v.erroriConsole.length === 0, v.erroriConsole.slice(0, 2).join(" | ") || "pulita");
  await v.ctx.close();
}

// ============================================================================
// 2. Chi rifiuta: niente, nemmeno dopo aver navigato
// ============================================================================
{
  const v = await visitatore();
  await arriva(v);
  await v.page.getByRole("button", { name: "Rifiuta", exact: true }).click();
  await attesa(v.page);
  await v.page.goto(`${BASE}/privacy`, { waitUntil: "domcontentloaded" });
  await attesa(v.page);

  const chiamate = v.tentate(HOST_GOOGLE);
  nota(
    "dopo il rifiuto",
    chiamate.length === 0,
    chiamate.length === 0 ? "nessuna richiesta verso Google, anche cambiando pagina" : chiamate.slice(0, 3).join(", "),
  );

  const traccianti = (await v.cookie()).filter((n) => /^_ga|^_gcl/i.test(n));
  nota("nessun cookie dopo il rifiuto", traccianti.length === 0, traccianti.join(", ") || "nessuno");

  nota(
    "il rifiuto viene ricordato",
    !(await banner(v.page).isVisible().catch(() => false)),
    "il banner non ritorna sulla pagina successiva",
  );
  await v.ctx.close();
}

// ============================================================================
// 3. Solo statistiche: Analytics sì, e a Google Ads non ARRIVA niente
// ============================================================================
{
  const v = await visitatore();
  await arriva(v);
  await personalizza(v.page, { statistiche: true, pubblicita: false });
  await attesa(v.page, 6000);

  const ga = v.arrivate(HOST_STATISTICHE);
  nota("solo statistiche: Analytics misura", ga.length > 0, `${ga.length} misure arrivate ad Analytics`);
  const ads = v.arrivate(HOST_PUBBLICITA);
  nota(
    "solo statistiche: niente arriva a Google Ads",
    ads.length === 0,
    ads.length === 0
      ? `${v.tentate(HOST_PUBBLICITA).length} tentativi del tag combinato, tutti fermati dal browser`
      : ads.slice(0, 2).join(", "),
  );
  const gcl = (await v.cookie()).filter((n) => /^_gcl|^GCL/i.test(n));
  nota("solo statistiche: nessun cookie di Google Ads", gcl.length === 0, gcl.join(", ") || "nessuno");
  await v.ctx.close();
}

// ============================================================================
// 4. Solo pubblicità: Google Ads sì (se configurato), e ad Analytics non ARRIVA niente
// ============================================================================
{
  const v = await visitatore();
  await arriva(v);
  await personalizza(v.page, { statistiche: false, pubblicita: true });
  await attesa(v.page, 6000);

  const caricato = (await gtagInPagina(v.page)) > 0;
  const ga = v.arrivate(HOST_STATISTICHE);
  nota(
    "solo pubblicità: niente arriva ad Analytics",
    ga.length === 0,
    ga.length === 0
      ? caricato
        ? `${v.tentate(HOST_STATISTICHE).length} tentativi del tag combinato, tutti fermati dal browser`
        : "Google Ads non configurato in questo ambiente: non parte niente"
      : ga.slice(0, 2).join(", "),
  );
  const gaCookie = (await v.cookie()).filter((n) => /^_ga/.test(n));
  nota("solo pubblicità: nessun cookie di Analytics", gaCookie.length === 0, gaCookie.join(", ") || "nessuno");
  if (caricato) {
    const ads = v.arrivate(HOST_PUBBLICITA);
    nota("solo pubblicità: Google Ads misura", ads.length > 0, `${ads.length} misure arrivate a Google Ads`);
  }
  await v.ctx.close();
}

// ============================================================================
// 5. Chi accetta: entrambe funzionano, senza violazioni; poi la revoca spegne tutto
// ============================================================================
{
  const v = await visitatore();
  await arriva(v);
  await v.page.getByRole("button", { name: "Accetta", exact: true }).click();
  await attesa(v.page, 6000);

  const ga = v.arrivate(HOST_STATISTICHE);
  nota(
    "dopo il consenso",
    ga.length > 0,
    ga.length > 0 ? `${ga.length} misure arrivate ad Analytics` : "NESSUNA: il consenso non accende niente",
  );
  const cookie = await v.cookie();
  nota("il cookie _ga compare dopo il consenso", cookie.some((n) => n === "_ga"), cookie.filter((n) => /^_ga/.test(n)).join(", ") || "nessuno");

  // Il difetto del 21 ottobre 2026: col consenso dato, la CSP bloccava Google Ads. Una
  // violazione qui è una misura che chi ha acconsentito voleva e non è arrivata.
  //
  // ⚠️ CON UNA SOLA ECCEZIONE, per nome: `stats.g.doubleclick.net`, dove Analytics manda i
  // dati dei Segnali Google. È bloccato DI PROPOSITO (profilazione che non chiediamo) e i
  // testi legali lo dichiarano. Sparisce quando i Segnali si spengono nella proprietà.
  const inattese = v.violazioni.filter((t) => !/stats\.g\.doubleclick\.net/.test(t));
  nota(
    "col consenso pieno la CSP non blocca niente (tranne i Segnali)",
    inattese.length === 0,
    inattese.length === 0
      ? `nessuna violazione${v.violazioni.length ? " · Segnali Google fermati, di proposito" : ""}`
      : inattese[0],
  );
  if (cookie.some((n) => /^_gcl/.test(n)) || v.arrivate(HOST_PUBBLICITA).length) {
    // `_gcl_aw` conserva l'identificativo del CLIC: nasce solo arrivando da un annuncio. Sul
    // sito vero si parte dalla home nuda (niente gclid finto), e lì basta `_gcl_au`.
    const cookieAtteso = IN_PRODUZIONE ? "_gcl_au" : "_gcl_aw";
    nota(
      IN_PRODUZIONE ? "col consenso pieno Google Ads misura" : "col consenso pieno Google Ads riceve il clic",
      cookie.includes(cookieAtteso) && v.arrivate(HOST_PUBBLICITA).length > 0,
      `cookie ${cookie.filter((n) => /^_gcl/.test(n)).join(", ")} · ${v.arrivate(HOST_PUBBLICITA).length} misure`,
    );
  }

  // ---- e il ripensamento deve spegnere tutto -------------------------------
  // Riaprire la scelta RICARICA la pagina (gtag, una volta scaricato, non si spegne in
  // altro modo): si aspetta il riquadro, non un tempo fisso.
  await v.page.goto(`${BASE}/cookie`, { waitUntil: "domcontentloaded" });
  await v.page.getByRole("button", { name: /preferenze cookie/i }).first().click();
  const bannerTornato = await banner(v.page)
    .waitFor({ timeout: 20_000 })
    .then(() => true)
    .catch(() => false);
  nota("la revoca riapre la scelta", bannerTornato, "«Preferenze cookie» ripresenta il riquadro");

  v.azzera();
  await v.page.goto(`${BASE}/privacy`, { waitUntil: "domcontentloaded" });
  await attesa(v.page);
  const dopoRevoca = v.tentate(HOST_GOOGLE);
  nota(
    "dopo la revoca si spegne",
    dopoRevoca.length === 0,
    dopoRevoca.length === 0 ? "nessuna richiesta verso Google" : `${dopoRevoca.length} richieste ancora in corso`,
  );
  await v.ctx.close();
}

// ============================================================================
// 6. I testi legali devono dire quello che il sito fa
// ============================================================================
{
  const v = await visitatore();
  await v.page.goto(`${BASE}/cookie`, { waitUntil: "domcontentloaded" });
  const testoCookie = await v.page.locator("main").innerText();

  nota(
    "la cookie policy non mente più",
    !/non abbiamo strumenti di analisi statistica di terze parti/i.test(testoCookie) &&
      !/usi pubblicitari sono disattivati/i.test(testoCookie),
    "tolte le frasi che negavano analisi e pubblicità",
  );
  nota(
    "la cookie policy nomina Google Analytics",
    /google analytics/i.test(testoCookie) && /_ga/.test(testoCookie),
    "servizio e cookie dichiarati per nome",
  );
  nota(
    "la cookie policy nomina Google Ads",
    /google ads/i.test(testoCookie) && /_gcl_aw/.test(testoCookie) && /_gcl_au/.test(testoCookie),
    "servizio e cookie dichiarati per nome",
  );
  nota(
    "la cookie policy dichiara il conteggio senza cookie",
    /arrivi da campagna/i.test(testoCookie),
    "il conteggio nostro è dichiarato",
  );
  nota(
    "la cookie policy spiega la revoca",
    /revoc/i.test(testoCookie) && /preferenze cookie/i.test(testoCookie),
    "revoca spiegata e comando nominato",
  );

  await v.page.goto(`${BASE}/privacy`, { waitUntil: "domcontentloaded" });
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
  nota(
    "la privacy dichiara la pubblicità col suo consenso",
    /google ads/i.test(testoPrivacy) && /separato da quello per le statistiche/i.test(testoPrivacy),
    "misura delle campagne con un consenso proprio",
  );
  await v.ctx.close();
}

await browser.close();

for (const e of esiti) console.log(`  ${e.ok ? "ok  " : "ROSSO"} ${e.nome.padEnd(48)} ${e.dettaglio}`);
const rossi = esiti.filter((e) => !e.ok).length;
console.log(`\n${esiti.length} controlli · ${rossi} rossi · ${BASE}`);
process.exitCode = rossi > 0 ? 1 : 0;
