// Fa attraversare a OGNI collaudo la protezione delle anteprime, senza che il collaudo
// debba saperlo.
//
// ⚠️ PERCHE' NON BASTA CHIAMARE UN AIUTANTE. La prima versione applicava il bypass dentro
// `strumenta()` e `registraEEntra()`, che coprono cinquantatre collaudi su cinquantotto.
// I dodici che non chiamano ne' l'uno ne' l'altro — quelli sulle pagine pubbliche —
// giravano scoperti: ricevevano un 302 verso il login di Vercel e misuravano QUELLO. Il
// referto lo ha detto in chiaro una volta sola, su `legale`: «titolo: Log in to Vercel».
// Gli altri riferivano «badge assente», «nessun JSON-LD», «manca object-src 'none'» —
// tutti sintomi di una pagina che non e' la nostra.
//
// Aggiungere la chiamata ai dodici file avrebbe funzionato oggi e sarebbe stato
// dimenticato dal tredicesimo. Qui invece si avvolge `chromium.launch` una volta sola,
// prima che qualunque collaudo parta: ogni browser che nasce, e ogni contesto che quel
// browser crea, porta l'intestazione. Un collaudo nuovo e' coperto senza saperlo.
//
// ⚠️ Agisce SOLO se `VERCEL_AUTOMATION_BYPASS_SECRET` e' nell'ambiente, e quella variabile
// la imposta `qa.mjs` soltanto con `--su`. In locale e in produzione questo file non fa
// niente: non c'e' nessuna protezione da attraversare, e un'intestazione in piu' verso un
// sito vero sarebbe un segreto mandato dove non serve.
//
// Si carica con `--import`, e lo fa `qa.mjs` quando serve.

import { chromium, firefox, webkit } from "@playwright/test";

const segreto = process.env.VERCEL_AUTOMATION_BYPASS_SECRET;

if (segreto) {
  const intestazione = { "x-vercel-protection-bypass": segreto };

  for (const motore of [chromium, firefox, webkit]) {
    if (!motore?.launch) continue;
    const lancioOriginale = motore.launch.bind(motore);
    motore.launch = async (...argomenti) => {
      const browser = await lancioOriginale(...argomenti);
      // ⚠️ Si avvolge `newContext` e non si tocca `newPage`: `browser.newPage()` passa
      // gia' di li' — verificato contando le chiamate, invece di darlo per scontato.
      const contestoOriginale = browser.newContext.bind(browser);
      browser.newContext = (opzioni = {}) =>
        contestoOriginale({
          ...opzioni,
          extraHTTPHeaders: { ...(opzioni.extraHTTPHeaders ?? {}), ...intestazione },
        });
      return browser;
    };
  }
}

// ── e le richieste fatte SENZA browser ───────────────────────────────────────
//
// ⚠️ Non tutti i collaudi aprono un browser: `verifica-sitemap` interroga con `fetch`, e
// contro un'anteprima protetta riceveva un 302 verso il login di Vercel. Il referto lo
// diceva bene — «sitemap.xml risponde 302: non c'e' altro da controllare» — e almeno non
// passava a vuoto, ma non controllava niente.
//
// ⚠️ L'intestazione si aggiunge SOLO alle richieste verso il bersaglio. Metterla su ogni
// `fetch` manderebbe il segreto anche a Stripe, a Supabase e a chiunque altro il collaudo
// interroghi: un segreto che viaggia dove non serve e' un segreto in piu' da revocare.
const bersaglio = (process.env.BASE ?? "").replace(/\/+$/, "");
if (segreto && /^https?:\/\//.test(bersaglio)) {
  const fetchOriginale = globalThis.fetch;
  globalThis.fetch = (risorsa, opzioni = {}) => {
    const url = typeof risorsa === "string" ? risorsa : (risorsa?.url ?? "");
    if (!url.startsWith(bersaglio)) return fetchOriginale(risorsa, opzioni);
    const intestazioni = new Headers(opzioni.headers ?? (typeof risorsa === "object" ? risorsa.headers : undefined));
    intestazioni.set("x-vercel-protection-bypass", segreto);
    return fetchOriginale(risorsa, { ...opzioni, headers: intestazioni });
  };
}
