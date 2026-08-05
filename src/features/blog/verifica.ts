// Controlli automatici sul blog pubblicato. NUMERI CHE DEVONO TORNARE, non impressioni.
//
// Perche' non basta guardare il sito: le configurazioni che tengono in piedi il posizionamento
// non "avvengono" una volta, sono uno STATO. Un aggiornamento di Yoast puo' rimettere la sua
// sitemap; un redattore puo' incollare un link al CMS; una modifica al canonical passa
// inosservata per settimane e intanto Google deindicizza. Questi controlli girano dopo ogni
// pubblicazione e una volta al giorno, e se qualcosa e' rosso lo si sa subito.
//
// Legge le pagine COME LE VEDE UN VISITATORE (HTTP sul sito pubblicato), non i dati interni:
// un controllo che guarda le stesse strutture che genera la pagina non verifica niente.

import { SLUG_RIMOSSI } from "./rimossi";

export type Esito = {
  nome: string;
  ok: boolean;
  dettaglio: string;
};

type Opzioni = {
  /** Il sito pubblicato, es. https://evalisdeck.it */
  sito: string;
  /** Il CMS, es. https://cms.evalisdeck.it. Se assente si saltano i controlli sul CMS. */
  cms?: string;
  /** Quanti articoli aprire davvero. 0 = tutti. */
  massimoArticoli?: number;
  /** Soglia di peso per una singola immagine, in KB. Oltre, e' rosso. */
  massimoImmagineKb?: number;
  /**
   * Il blog e' gia' aperto ai motori? Cambia due cose, e va passato esplicitamente perche'
   * i controlli devono difendere **entrambi** gli stati, non solo quello finale:
   *
   * - da dove si prende l'elenco degli articoli (a interruttore spento la sitemap non li
   *   elenca per scelta, quindi si legge la pagina indice);
   * - cosa e' corretto: spento vuol dire noindex e fuori dalla sitemap, acceso il contrario.
   *
   * Senza questa distinzione il giro quotidiano manderebbe un allarme ogni mattina fino al
   * giorno dell'apertura, e un allarme che arriva sempre si smette di leggerlo — proprio
   * quello che questo impianto vuole evitare.
   */
  visibileAiMotori?: boolean;
};

const TIMEOUT_MS = 15_000;

async function prendi(url: string): Promise<{ stato: number; testo: string; header: Headers } | null> {
  try {
    const r = await fetch(url, {
      signal: AbortSignal.timeout(TIMEOUT_MS),
      cache: "no-store",
      headers: { "user-agent": "verifica-blog-evalisdeck" },
    });
    return { stato: r.status, testo: await r.text(), header: r.headers };
  } catch {
    return null;
  }
}

function senzaBarra(u: string): string {
  return u.replace(/\/+$/, "");
}

function hostDi(u: string): string {
  return u.replace(/^https?:\/\//, "").replace(/\/.*$/, "");
}

/** Gli URL degli articoli elencati nella sitemap del sito. */
export function urlArticoliDaSitemap(xml: string, sito: string): string[] {
  const pubblico = senzaBarra(sito);
  const loc = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1].trim());
  return loc.filter((u) => u.startsWith(`${pubblico}/blog/`) && !u.includes("/blog/autore/"));
}

/** Per usare un indirizzo dentro un'espressione regolare senza che i punti facciano danni. */
function perRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Gli URL degli articoli collegati dalla pagina indice del blog.
 *
 * E' la fonte finche' il blog non e' aperto ai motori: in quella fase la sitemap non li
 * elenca di proposito, ma i controlli devono continuare a girare — anzi, e' proprio allora
 * che conviene scoprire i difetti, prima che qualcuno li veda.
 */
export function urlArticoliDaIndice(html: string, sito: string): string[] {
  const pubblico = senzaBarra(sito);
  const re = new RegExp(`href=["'](?:${perRegex(pubblico)})?/blog/([a-z0-9-]+)/?["']`, "gi");
  // Le pagine autore (`/blog/autore/<slug>`) non entrano: dopo "autore" c'e' un'altra
  // barra, e l'espressione pretende che dopo lo slug la stringa finisca.
  return [...new Set([...html.matchAll(re)].map((m) => `${pubblico}/blog/${m[1].toLowerCase()}`))];
}

/**
 * Gli articoli pubblicati che un 410 sta coprendo.
 *
 * E' il difetto piu' silenzioso dell'impianto: la pagina esiste, la sitemap la elenca, ma
 * chi la apre legge «rimosso». Nessun errore, nessun log, solo un articolo invisibile.
 */
export function slugCopertiDaRimossi(
  urlArticoli: string[],
  sito: string,
  rimossi: readonly string[] = SLUG_RIMOSSI,
): string[] {
  const pubblico = senzaBarra(sito);
  return urlArticoli
    .map((u) => u.replace(`${pubblico}/blog/`, "").replace(/\/$/, "").toLowerCase())
    .filter((slug) => rimossi.includes(slug));
}

/** Il canonical dichiarato da una pagina. */
export function canonicalDi(html: string): string | undefined {
  const m =
    html.match(/<link[^>]+rel=["']canonical["'][^>]*href=["']([^"']+)["']/i) ??
    html.match(/<link[^>]+href=["']([^"']+)["'][^>]*rel=["']canonical["']/i);
  return m?.[1];
}

/** Quanti blocchi JSON-LD di tipo Article ci sono nella pagina. */
export function quantiSchemiArticolo(html: string): number {
  const blocchi = [...html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];
  let n = 0;
  for (const b of blocchi) {
    // basta la presenza del tipo: qui interessa il DOPPIONE, non la validita' dello schema
    if (/"@type"\s*:\s*"(Article|BlogPosting|NewsArticle)"/.test(b[1])) n++;
  }
  return n;
}

/** Gli indirizzi delle immagini caricate dal CMS che una pagina usa. */
export function immaginiDellaPagina(html: string, sito: string): string[] {
  const pubblico = senzaBarra(sito);
  const src = [...html.matchAll(/<img[^>]+src=["']([^"']+)["']/gi)].map((m) => m[1]);
  return [
    ...new Set(
      src
        .filter((u) => u.includes("/wp-content/uploads/"))
        .map((u) => (u.startsWith("http") ? u : `${pubblico}${u}`)),
    ),
  ];
}

/** I link alle pagine autore presenti nella pagina. */
export function autoriCitati(html: string, sito: string): string[] {
  const pubblico = senzaBarra(sito);
  const rel = [...html.matchAll(/href=["'](\/blog\/autore\/[a-z0-9-]+)["']/gi)].map((m) => `${pubblico}${m[1]}`);
  const ass = [...html.matchAll(new RegExp(`href=["'](${pubblico}/blog/autore/[a-z0-9-]+)["']`, "gi"))].map((m) => m[1]);
  return [...new Set([...rel, ...ass])];
}

/**
 * I difetti di una singola pagina articolo, letta come la legge un visitatore.
 *
 * Sta separata da chi scarica per una ragione precisa: e' l'unico modo di **provare** che i
 * controlli funzionano. Si costruisce una pagina sana, se ne rompe un pezzo solo, e si
 * pretende un rilievo solo. Se il giudizio vivesse dentro la funzione che va in rete, per
 * provarlo bisognerebbe simulare `fetch`, e si finirebbe per provare il simulacro.
 *
 * Elenco vuoto = nessun difetto.
 */
export function difettiDellaPagina(
  url: string,
  html: string,
  opts: { sito: string; hostCms?: string },
): string[] {
  const sito = senzaBarra(opts.sito);
  const difetti: string[] = [];

  const canonical = canonicalDi(html);
  if (!canonical) difetti.push(`${url}: canonical assente`);
  else if (!canonical.startsWith(sito)) difetti.push(`${url}: canonical su un altro dominio (${canonical})`);

  // Il canonical si toglie prima di cercare riferimenti al CMS: ha gia' un controllo suo,
  // e segnalare lo stesso tag due volte non aggiunge niente e nasconde il resto.
  const senzaCanonical = html.replace(/<link[^>]+rel=["']canonical["'][^>]*>/i, "");
  if (opts.hostCms && senzaCanonical.includes(opts.hostCms))
    difetti.push(`${url}: contiene un riferimento a ${opts.hostCms}`);

  if (!/<title>[^<]{3,}<\/title>/i.test(html)) difetti.push(`${url}: title mancante`);
  if (!/<meta[^>]+name=["']description["'][^>]+content=["'][^"']{10,}/i.test(html))
    difetti.push(`${url}: meta description mancante`);
  if (!/datePublished/.test(html)) difetti.push(`${url}: data di pubblicazione assente nello schema`);

  const schemi = quantiSchemiArticolo(html);
  if (schemi !== 1) difetti.push(`${url}: ${schemi} schemi Article (atteso 1)`);

  // Un autore dichiarato con nome vuoto e' peggio di nessun autore: lo schema afferma una
  // paternita' che non nomina nessuno. Succede quando l'articolo nel CMS non ha un utente
  // assegnato, e a schermo non si vede — la pagina sembra a posto.
  if (/"author"\s*:\s*\{[^}]*"name"\s*:\s*""/.test(html))
    difetti.push(`${url}: autore senza nome nello schema`);

  return difetti;
}

/**
 * Lo stato dichiarato dall'interruttore coincide con quello che il sito fa davvero?
 *
 * Sono due guasti opposti e tutti e due costosi: restare `noindex` dopo l'apertura significa
 * mesi di lavoro editoriale che nessuno trova; comparire in sitemap prima dell'apertura
 * significa mandare Google esattamente dove il `noindex` lo respinge.
 */
export function giudizioInterruttore(args: {
  visibile: boolean;
  indiceNoindex: boolean;
  articoliInIndice: number;
  articoliInSitemap: number;
}): { ok: boolean; dettaglio: string } {
  const { visibile, indiceNoindex, articoliInIndice, articoliInSitemap } = args;
  if (visibile) {
    if (indiceNoindex)
      return { ok: false, dettaglio: "blog aperto ai motori ma /blog risponde ancora noindex" };
    // L'invariante non e' «devono esserci articoli» ma «quelli pubblicati devono esserci
    // tutti»: a blog appena aperto e ancora vuoto i due conti fanno zero, ed e' corretto.
    if (articoliInSitemap < articoliInIndice)
      return {
        ok: false,
        dettaglio: `${articoliInIndice} articoli pubblicati ma solo ${articoliInSitemap} in sitemap: Google non sa che esistono`,
      };
    return {
      ok: true,
      dettaglio:
        articoliInIndice === 0
          ? "blog pubblico e ancora vuoto: indicizzabile, in attesa del primo articolo"
          : `blog pubblico: indicizzabile, ${articoliInSitemap} articoli in sitemap`,
    };
  }
  if (!indiceNoindex)
    return { ok: false, dettaglio: "blog non ancora pubblico ma /blog non dichiara noindex" };
  if (articoliInSitemap > 0)
    return {
      ok: false,
      dettaglio: `blog non ancora pubblico ma la sitemap elenca ${articoliInSitemap} articoli`,
    };
  return { ok: true, dettaglio: "blog non ancora pubblico: noindex e fuori dalla sitemap, come deve" };
}

/** Esegue tutti i controlli. Nessuna eccezione: un controllo che non riesce a girare e' rosso. */
export async function verificaBlog(opts: Opzioni): Promise<Esito[]> {
  const sito = senzaBarra(opts.sito);
  const cms = opts.cms ? senzaBarra(opts.cms) : undefined;
  const hostCms = cms ? hostDi(cms) : undefined;
  const esiti: Esito[] = [];
  const aggiungi = (nome: string, ok: boolean, dettaglio: string) => esiti.push({ nome, ok, dettaglio });

  // --- sitemap del sito -----------------------------------------------------------------
  const sitemap = await prendi(`${sito}/sitemap.xml`);
  if (!sitemap || sitemap.stato !== 200) {
    aggiungi("sitemap", false, `sitemap.xml non raggiungibile (${sitemap?.stato ?? "nessuna risposta"})`);
    return esiti; // senza sitemap non si sa cosa controllare: inutile proseguire
  }

  if (hostCms && sitemap.testo.includes(hostCms)) {
    aggiungi("sitemap", false, `la sitemap elenca URL del CMS (${hostCms})`);
  } else {
    aggiungi("sitemap", true, "nessun URL del CMS nella sitemap");
  }

  const inSitemap = urlArticoliDaSitemap(sitemap.testo, sito);

  // --- l'interruttore dice la verita'? ---------------------------------------------------
  const visibile = opts.visibileAiMotori ?? false;
  const indice = await prendi(`${sito}/blog`);
  const noindex =
    /<meta[^>]+name=["']robots["'][^>]*content=["'][^"']*noindex/i.test(indice?.testo ?? "") ||
    /noindex/i.test(indice?.header.get("x-robots-tag") ?? "");
  // La pagina indice e' la fonte di verita' su cosa e' pubblicato: la sitemap va confrontata
  // con lei, non creduta sulla parola.
  const inIndice = urlArticoliDaIndice(indice?.testo ?? "", sito);

  if (!indice || indice.stato !== 200) {
    aggiungi("interruttore", false, `/blog non raggiungibile (${indice?.stato ?? "nessuna risposta"})`);
  } else {
    const g = giudizioInterruttore({
      visibile,
      indiceNoindex: noindex,
      articoliInIndice: inIndice.length,
      articoliInSitemap: inSitemap.length,
    });
    aggiungi("interruttore", g.ok, g.dettaglio);
  }

  const urlArticoli = visibile ? inSitemap : inIndice;

  // Un articolo pubblicato con uno slug che sta nell'elenco dei rimossi verrebbe COPERTO dal
  // 410, e nessuno se ne accorgerebbe: la pagina esiste, l'elenco la mostra, ma chi la apre
  // legge "rimosso". Il conflitto si scopre qui invece che dopo settimane.
  const coperti = slugCopertiDaRimossi(urlArticoli, sito);
  aggiungi(
    "conflitto-rimossi",
    coperti.length === 0,
    coperti.length === 0
      ? "nessun articolo pubblicato e' coperto da un 410"
      : `questi articoli sono pubblicati MA rispondono 410: ${coperti.join(", ")} — togliere lo slug da rimossi.ts`,
  );
  // Nessun controllo separato sul numero di articoli: un blog vuoto e' uno stato legittimo
  // (i primi giorni), e un controllo che non puo' mai diventare rosso non e' un controllo.
  // Quanti ce ne sono lo dice gia' il dettaglio dell'interruttore.

  // --- i vecchi URL devono rispondere 410, mai 404 ---------------------------------------
  const sbagliati: string[] = [];
  for (const slug of SLUG_RIMOSSI) {
    const r = await prendi(`${sito}/blog/${slug}`);
    if (r?.stato !== 410) sbagliati.push(`${slug} -> ${r?.stato ?? "nessuna risposta"}`);
  }
  aggiungi(
    "vecchi-url",
    sbagliati.length === 0,
    sbagliati.length === 0
      ? `${SLUG_RIMOSSI.length} vecchi URL rispondono 410 (non 404: Google li toglie subito)`
      : sbagliati.join("; "),
  );

  // --- il CMS non deve essere indicizzabile ---------------------------------------------
  if (cms) {
    const radice = await prendi(`${cms}/`);
    const robots = radice?.header.get("x-robots-tag") ?? "";
    aggiungi(
      "cms-noindex",
      /noindex/i.test(robots),
      radice ? `x-robots-tag: ${robots || "(assente)"}` : "CMS non raggiungibile",
    );

    // la sitemap di Yoast manderebbe a Google una lista di URL del CMS in conflitto con la nostra
    for (const percorso of ["/wp-sitemap.xml", "/sitemap_index.xml"]) {
      const r = await prendi(`${cms}${percorso}`);
      aggiungi(
        `cms-sitemap${percorso}`,
        r?.stato === 404,
        `${percorso} risponde ${r?.stato ?? "nessuna risposta"} (atteso 404)`,
      );
    }
  }

  // --- ogni articolo, uno per uno --------------------------------------------------------
  const daControllare = opts.massimoArticoli ? urlArticoli.slice(0, opts.massimoArticoli) : urlArticoli;
  const pagineAutore = new Set<string>();
  const immagini = new Set<string>();
  const problemi: string[] = [];

  for (const url of daControllare) {
    const p = await prendi(url);
    if (!p || p.stato !== 200) {
      problemi.push(`${url} → ${p?.stato ?? "nessuna risposta"}`);
      continue;
    }
    const html = p.testo;

    problemi.push(...difettiDellaPagina(url, html, { sito, hostCms }));

    for (const a of autoriCitati(html, sito)) pagineAutore.add(a);
    for (const i of immaginiDellaPagina(html, sito)) immagini.add(i);
  }

  aggiungi(
    "articoli",
    problemi.length === 0,
    problemi.length === 0
      ? `${daControllare.length} articoli senza difetti`
      : problemi.slice(0, 20).join("; ") + (problemi.length > 20 ? ` … e altri ${problemi.length - 20}` : ""),
  );

  // --- peso delle immagini ---------------------------------------------------------------
  // Chi scrive carica l'immagine che ha, e spesso e' un PNG da un megabyte e mezzo. Nessuno se
  // ne accorge guardando la pagina da ufficio: se ne accorge chi legge da telefono, e il
  // caricamento lento e' un fattore di posizionamento. Si misura con una HEAD, non scaricando.
  const soglia = (opts.massimoImmagineKb ?? 400) * 1024;
  const pesanti: string[] = [];
  for (const u of immagini) {
    try {
      const r = await fetch(u, { method: "HEAD", signal: AbortSignal.timeout(TIMEOUT_MS), cache: "no-store" });
      const byte = Number(r.headers.get("content-length") ?? 0);
      if (byte > soglia) pesanti.push(`${u} → ${Math.round(byte / 1024)} KB`);
    } catch {
      pesanti.push(`${u} → non raggiungibile`);
    }
  }
  aggiungi(
    "peso-immagini",
    pesanti.length === 0,
    pesanti.length === 0
      ? `${immagini.size} immagini, tutte sotto ${opts.massimoImmagineKb ?? 400} KB`
      : pesanti.join("; "),
  );

  // --- nessun collegamento morto verso una pagina autore ---------------------------------
  const autoriRotti: string[] = [];
  for (const a of pagineAutore) {
    const r = await prendi(a);
    if (!r || r.stato !== 200) autoriRotti.push(`${a} → ${r?.stato ?? "nessuna risposta"}`);
  }
  aggiungi(
    "autori",
    autoriRotti.length === 0,
    autoriRotti.length === 0
      ? `${pagineAutore.size} pagine autore raggiungibili`
      : autoriRotti.join("; "),
  );

  return esiti;
}

/** Riepilogo leggibile, uguale sia a schermo sia nella mail di allarme. */
export function riepilogo(esiti: Esito[]): { ok: boolean; righe: string[] } {
  const righe = esiti.map((e) => `${e.ok ? "OK  " : "ROSSO"} ${e.nome}: ${e.dettaglio}`);
  return { ok: esiti.every((e) => e.ok), righe };
}
