// Collaudo della sitemap: NUMERI, non impressioni.
//
// Una sitemap sbagliata non da' errore. Il file si scarica, Google lo accetta, e i guasti
// si vedono settimane dopo in Search Console sotto forma di pagine «escluse» che nessuno
// sa spiegare. Questi controlli aprono davvero ogni indirizzo elencato e confrontano quello
// che la sitemap PROMETTE con quello che la pagina FA.
//
//   node scripts/verifica-sitemap.mjs
//   BASE=https://evalisdeck.it node scripts/verifica-sitemap.mjs

const BASE = (process.env.BASE ?? "http://localhost:3000").replace(/\/+$/, "");
const esiti = [];
const nota = (nome, ok, dettaglio) => esiti.push({ nome, ok, dettaglio });

async function prendi(url, opts = {}) {
  try {
    const r = await fetch(url, {
      redirect: "manual",
      cache: "no-store",
      signal: AbortSignal.timeout(20_000),
      ...opts,
    });
    return { stato: r.status, testo: await r.text(), header: r.headers };
  } catch (e) {
    return { stato: 0, testo: "", header: new Headers(), errore: String(e) };
  }
}

// --- 1. il file esiste ed e' una sitemap ------------------------------------------------
const sm = await prendi(`${BASE}/sitemap.xml`);
if (sm.stato !== 200) {
  console.error(`sitemap.xml risponde ${sm.stato || sm.errore}: non c'e' altro da controllare.`);
  process.exitCode = 2;
} else {
  nota("formato", /<urlset[^>]+xmlns=["']http:\/\/www\.sitemaps\.org\/schemas\/sitemap\/0\.9["']/.test(sm.testo), "namespace sitemaps.org 0.9");

  const voci = [...sm.testo.matchAll(/<url>([\s\S]*?)<\/url>/g)].map((m) => ({
    url: m[1].match(/<loc>([^<]+)<\/loc>/)?.[1]?.trim(),
    lastmod: m[1].match(/<lastmod>([^<]+)<\/lastmod>/)?.[1]?.trim(),
  }));
  const indirizzi = voci.map((v) => v.url).filter(Boolean);

  nota("non vuota", indirizzi.length > 0, `${indirizzi.length} indirizzi`);

  const doppi = indirizzi.filter((u, i) => indirizzi.indexOf(u) !== i);
  nota("nessun doppione", doppi.length === 0, doppi.length ? doppi.join(", ") : "ogni indirizzo compare una volta sola");

  const fuori = indirizzi.filter((u) => !u.startsWith(`${BASE}/`) && u !== `${BASE}/`);
  nota("dominio unico", fuori.length === 0, fuori.length ? fuori.join(", ") : `tutti su ${BASE}`);

  // --- 2. le date dichiarate devono essere vere ------------------------------------------
  // Una lastmod uguale all'istante della richiesta significa che il campo e' generato, non
  // letto: dice «modificata adesso» ogni volta che Google passa. Il campo diventa rumore, e
  // Google impara a ignorarlo — anche quando gli diremmo la verita' su un articolo.
  const adesso = Date.now();
  const finte = [];
  const malformate = [];
  for (const v of voci) {
    if (!v.lastmod) continue;
    const t = Date.parse(v.lastmod);
    if (Number.isNaN(t)) { malformate.push(`${v.url} → «${v.lastmod}»`); continue; }
    if (t > adesso + 60_000) { malformate.push(`${v.url} → nel futuro`); continue; }
    if (adesso - t < 10 * 60_000) finte.push(v.url.replace(BASE, "") || "/");
  }
  nota("date leggibili", malformate.length === 0, malformate.length ? malformate.join("; ") : "tutte le lastmod sono date valide e non future");
  nota(
    "date vere",
    finte.length === 0,
    finte.length === 0
      ? "nessuna lastmod generata al momento della richiesta"
      : `queste dichiarano «modificata adesso» a ogni richiesta: ${finte.join(", ")} — Google impara a ignorare il campo`,
  );

  // --- 3. robots.txt non deve contraddire la sitemap -------------------------------------
  const robots = await prendi(`${BASE}/robots.txt`);
  const vietati = [];
  if (robots.stato === 200) {
    // il gruppo `User-Agent: *`, cioe' quello che vale per Googlebot
    const blocco = robots.testo.split(/User-Agent:/i).find((b) => b.trimStart().startsWith("*")) ?? "";
    const regole = [...blocco.matchAll(/Disallow:\s*(\S+)/gi)].map((m) => m[1]);
    for (const u of indirizzi) {
      const percorso = u.replace(BASE, "") || "/";
      if (regole.some((r) => r !== "/" && percorso.startsWith(r))) vietati.push(percorso);
    }
  }
  nota(
    "coerenza con robots",
    vietati.length === 0,
    vietati.length === 0 ? "nessun indirizzo elencato e' vietato da robots.txt" : `elencati MA vietati: ${vietati.join(", ")}`,
  );

  // --- 4. ogni indirizzo, aperto davvero -------------------------------------------------
  const problemi = [];
  for (const u of indirizzi) {
    const p = await prendi(u);
    if (p.stato !== 200) { problemi.push(`${u} → ${p.stato || p.errore}${p.stato >= 300 && p.stato < 400 ? ` (${p.header.get("location")})` : ""}`); continue; }

    const canonical = p.testo.match(/<link[^>]+rel=["']canonical["'][^>]*href=["']([^"']+)["']/i)?.[1]
      ?? p.testo.match(/<link[^>]+href=["']([^"']+)["'][^>]*rel=["']canonical["']/i)?.[1];
    // Un indirizzo in sitemap il cui canonical punta altrove e' una contraddizione: la
    // sitemap dice «indicizza questo», la pagina dice «no, quell'altro».
    //
    // ⚠️ In LOCALE si confronta il solo PERCORSO. Il canonical nasce da `metadataBase`,
    // che punta al dominio vero: e' cosi' che deve essere — un canonical verso localhost
    // sarebbe il difetto. Confrontando l'indirizzo intero, questo controllo era rosso su
    // ogni pagina ogni volta che lo si lanciava in locale, cioe' rumore da ignorare. E'
    // lo stesso caso dell'immagine sociale, che in locale dichiara un indirizzo di
    // produzione e va scaricata dall'ambiente in prova.
    const soloPercorso = /^https?:\/\/(localhost|127\.0\.0\.1)/.test(BASE);
    const normalizza = (x) => {
      const senzaBarra = x.replace(/\/$/, "");
      return soloPercorso ? new URL(senzaBarra, BASE).pathname : senzaBarra;
    };
    if (canonical && normalizza(canonical) !== normalizza(u))
      problemi.push(`${u}: canonical verso ${canonical}`);

    const meta = p.testo.match(/<meta[^>]+name=["']robots["'][^>]*content=["']([^"']+)["']/i)?.[1] ?? "";
    const header = p.header.get("x-robots-tag") ?? "";
    if (/noindex/i.test(meta) || /noindex/i.test(header))
      problemi.push(`${u}: e' noindex ma sta in sitemap`);

    if (!/<title>[^<]{3,}<\/title>/i.test(p.testo)) problemi.push(`${u}: senza title`);
  }
  nota("pagine elencate", problemi.length === 0, problemi.length === 0 ? `${indirizzi.length} pagine: 200, canonical su se stesse, indicizzabili` : problemi.join("; "));

  // --- 5. cosa il sito collega ma la sitemap non dichiara --------------------------------
  // Il difetto opposto, e piu' silenzioso: una pagina che esiste, e' collegata e
  // indicizzabile, ma Google la deve trovare da solo.
  const home = await prendi(`${BASE}/`);
  const collegati = [...new Set(
    [...home.testo.matchAll(/href=["'](\/[a-z0-9/-]*)["']/gi)]
      .map((m) => m[1].replace(/\/$/, "") || "/")
      .filter((p) => !p.startsWith("/api") && !p.includes(".")),
  )];
  const mancanti = [];
  for (const percorso of collegati) {
    const u = percorso === "/" ? `${BASE}/` : `${BASE}${percorso}`;
    if (indirizzi.includes(u)) continue;
    const p = await prendi(u);
    if (p.stato !== 200) continue; // non esiste o reindirizza: non e' un buco
    const meta = p.testo.match(/<meta[^>]+name=["']robots["'][^>]*content=["']([^"']+)["']/i)?.[1] ?? "";
    if (/noindex/i.test(meta)) continue; // fuori di proposito
    mancanti.push(percorso);
  }
  nota(
    "niente di dimenticato",
    mancanti.length === 0,
    mancanti.length === 0
      ? "ogni pagina collegata e indicizzabile e' in sitemap"
      : `collegate dalla home, indicizzabili, ma NON in sitemap: ${mancanti.join(", ")}`,
  );
}

for (const e of esiti) console.log(`  ${e.ok ? "ok  " : "ROSSO"} ${e.nome.padEnd(22)} ${e.dettaglio}`);
const rossi = esiti.filter((e) => !e.ok).length;
console.log(`\n${esiti.length} controlli · ${rossi} rossi · ${BASE}`);
if (rossi > 0) process.exitCode = 1;
