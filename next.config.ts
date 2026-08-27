import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

// La regola che dice al browser da dove può caricare le cose. È la seconda serratura
// dopo la sanificazione dell'HTML: nel prodotto ci sono tre punti in cui testo scritto
// da altri finisce in pagina — gli articoli dal CMS, i capitoli dell'editor, i documenti
// pubblicati — e sono esattamente i posti dove un difetto di sanificazione diventerebbe
// furto di sessione.
//
// Gli indirizzi non sono dedotti dal codice: sono stati MISURATI aprendo le pagine vere
// e guardando che cosa il browser contatta davvero. Da lì si è scoperto che Stripe non
// carica niente da noi — il pagamento avviene su una pagina loro — e quindi non compare.
//
// ⚠️ COMPROMESSO DICHIARATO su `script-src`: c'è `'unsafe-inline'`. Toglierlo richiede un
// «nonce» generato a ogni richiesta, e il nonce rende DINAMICHE tutte le pagine che lo
// usano — cioè butterebbe via la staticità di home, blog e articoli, riconquistata ieri
// correggendo il 500. Finché quel compromesso resta, `script-src` protegge poco: tutto il
// resto qui sotto protegge parecchio, e non costa niente.
// ⚠️ L'ORIGINE DELL'ARCHIVIO SI RICAVA DALL'AMBIENTE, non si scrive a mano.
//
// Qui l'host di Supabase era ricopiato in tre direttive (`img-src`, `connect-src`,
// `media-src`). Ha retto finche' il progetto e' stato uno solo; il 26 agosto 2026, quando
// lo sviluppo ha smesso di puntare all'archivio della produzione, il browser ha bloccato
// il video di benvenuto — e con lui si sarebbero rotti loghi, copertine e caricamenti,
// tutti insieme e tutti in silenzio, perche' una risorsa bloccata dalla CSP non produce
// nessun errore lato server.
//
// Se l'archivio non e' configurato l'origine non si aggiunge: non c'e' niente da
// permettere, e `isStorageConfigured()` dice gia' che quelle funzioni sono spente.
const ORIGINE_ARCHIVIO = process.env.SUPABASE_URL
  ? new URL(process.env.SUPABASE_URL).origin
  : null;

// ⚠️ E L'ORIGINE CANONICA, per le immagini degli articoli.
//
// Le immagini del blog arrivano da `evalisdeck.it/wp-content/...`. In produzione le copre
// `'self'`, perche' la pagina e' servita da li'. Su un'ANTEPRIMA — o da qualunque altro
// dominio — sono un'altra origine, e il browser le blocca: le pagine del blog uscivano
// senza immagini e cinque controlli della CSP diventavano rossi.
//
// Non e' un difetto di produzione, ma e' una dipendenza taciuta: la nostra CSP funzionava
// solo perche' il dominio era quello. Dichiararla costa una riga e vale il giorno in cui
// il prodotto verra' servito da un indirizzo diverso.
const ORIGINE_CANONICA = (() => {
  try {
    return new URL(process.env.NEXT_PUBLIC_APP_URL ?? "https://evalisdeck.it").origin;
  } catch {
    return "https://evalisdeck.it";
  }
})();
const permessi = (...voci: (string | null)[]) => voci.filter(Boolean).join(" ");

const CSP = [
  "default-src 'self'",
  // Nessuno può incorniciare le nostre pagine: difesa dal clickjacking, più forte di
  // X-Frame-Options perché nessun browser moderno la ignora.
  "frame-ancestors 'none'",
  // Niente plugin e nessun <base> iniettato che dirotti tutti i collegamenti relativi.
  "object-src 'none'",
  "base-uri 'self'",
  // Un modulo non può spedire i suoi dati a un dominio che non sia il nostro: è la
  // difesa che regge anche se qualcosa di malevolo finisse comunque in pagina.
  "form-action 'self'",
  "script-src 'self' 'unsafe-inline' https://www.googletagmanager.com",
  "style-src 'self' 'unsafe-inline'",
  "font-src 'self' data:",
  // `blob:` serve alle anteprime dei loghi ridimensionati nel browser prima del caricamento.
  // `googletagmanager` anche fra le IMMAGINI: Analytics manda una parte delle
  // misure come pixel, non come richiesta di rete. Previsto solo fra gli script,
  // il browser lo bloccava — e il collaudo l'ha visto, la lettura della regola no.
  permessi("img-src 'self' data: blob: https://cms.evalisdeck.it", ORIGINE_CANONICA, ORIGINE_ARCHIVIO, "https://www.googletagmanager.com https://*.google-analytics.com"),
  permessi("connect-src 'self'", ORIGINE_ARCHIVIO, "https://*.google-analytics.com https://*.analytics.google.com https://*.googletagmanager.com"),
  // Il video di benvenuto sta nell'archivio e la rotta rinvia a un indirizzo firmato di
  // Supabase: un'altra origine. Senza questa riga `media-src` ricadeva su `default-src
  // 'self'` e il browser lo BLOCCAVA — da telefono come da computer.
  //
  // Il collaudo diceva verde perché scaricava il file con una richiesta di rete, che
  // della CSP della pagina non sa niente. Un `<video>` non è una fetch: va provato
  // facendolo caricare davvero, ed è quello che ora fa `verifica-benvenuto`.
  permessi("media-src 'self' blob:", ORIGINE_ARCHIVIO),
  "frame-src 'none'",
  "upgrade-insecure-requests",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: CSP },
  { key: "X-Content-Type-Options", value: "nosniff" },
  // DENY e non SAMEORIGIN: `frame-ancestors 'none'` due righe sopra dice «nessuno»,
  // e questa diceva «i miei sì». Due intestazioni che si contraddicono lasciano la
  // decisione al browser, e nel prodotto non c'è una sola pagina che si incornici
  // da sola.
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // `payment=()` spegne l'API di pagamento del browser. Stripe NON la usa (il
  // pagamento avviene su una pagina loro, un'altra origine), quindi non toglie
  // niente a noi e toglie un appiglio a chi riuscisse a mettere qualcosa in pagina.
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), browsing-topics=(), payment=()",
  },
  // Senza `preload` non si entra nella lista dei browser, e la PRIMA visita di ogni
  // nuovo cliente resta intercettabile: e' l'unica che conta, perche' e' quella in
  // cui digita la password. Il dominio serve gia' tutto in HTTPS e reindirizza
  // `www` e i vecchi indirizzi, quindi la condizione e' soddisfatta.
  //
  // NB: la dichiarazione da sola non basta, va anche chiesto l'inserimento su
  // hstspreload.org, ed e' un passo dell'utente. Ed e' quasi irreversibile: da
  // quel momento nessun sottodominio di evalisdeck.it puo' piu' rispondere in HTTP.
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Chromium serverless NON va bundlato: il binario vive in node_modules e il
  // bundler, spostandolo, rompe la generazione PDF in produzione (errore
  // "input directory .../@sparticuz/chromium/bin does not exist").
  serverExternalPackages: ["@sparticuz/chromium", "puppeteer-core"],
  // Escludere dal bundle non basta: i file .br del browser non sono JavaScript,
  // quindi il file-tracing di Vercel non li segue e la funzione arriva senza
  // binario. Vanno inclusi a mano nella route che genera i PDF.
  outputFileTracingIncludes: {
    "/api/**": ["./node_modules/@sparticuz/chromium/bin/**"],
  },
  experimental: {
    // Cache del client router. dynamic:0 è deliberato: il prodotto è data-heavy e
    // ogni schermata mostra numeri che devono riflettere l'ultima scrittura
    // (una cache di 30s faceva vedere risultati stantii dopo il salvataggio).
    staleTimes: { dynamic: 0, static: 180 },
  },
  async headers() {
    return [{ source: "/(.*)", headers: securityHeaders }];
  },
  // Le immagini degli articoli restano ospitate dal CMS, ma il visitatore non gliele
  // chiede MAI: `seo.ts` riscrive gli indirizzi sul nostro dominio e questa riscrittura
  // li rende indirizzi veri. Vercel prende il file dal CMS e lo tiene sulla propria rete.
  //
  // Due effetti voluti: il nome del CMS non compare nel sorgente della pagina, e un CMS
  // spento per qualche minuto non rompe le immagini a chi sta leggendo.
  //
  // NB: le riscritture girano DOPO i reindirizzamenti qui sotto, che pero' scattano solo
  // su host diversi da quello canonico: una richiesta a evalisdeck.it/wp-content/... non
  // viene mai reindirizzata, e arriva qui.
  async rewrites() {
    const cms = (process.env.BLOG_CMS_URL ?? "").replace(/\/+$/, "");
    if (!cms) return [];
    return [
      {
        source: "/wp-content/uploads/:percorso*",
        destination: `${cms}/wp-content/uploads/:percorso*`,
      },
    ];
  },
  // Un solo indirizzo canonico: evalisdeck.it.
  //
  // Ogni altro host che serve le stesse pagine è contenuto duplicato, e Google
  // sceglie da solo quale ignorare. Il reindirizzamento si può impostare anche
  // dal pannello Vercel, ma qui è VERSIONATO e collaudabile: un'impostazione di
  // pannello non lascia traccia nel repository e si perde al primo progetto
  // ricreato. `permanent: true` emette un 308, che consolida il valore sul
  // dominio di destinazione; un 307 direbbe ai motori di tenersi il vecchio.
  //
  // Gli indirizzi di anteprima (`evalisdeck-<hash>.vercel.app`) non combaciano
  // con questi valori esatti e restano raggiungibili.
  async redirects() {
    const CANONICO = "evalisdeck.it";
    const ALTRI_HOST = ["www.evalisdeck.it", "evalisdeck.vercel.app", "bilanciotool.vercel.app"];
    return ALTRI_HOST.map((host) => ({
      source: "/:percorso*",
      has: [{ type: "host" as const, value: host }],
      destination: `https://${CANONICO}/:percorso*`,
      permanent: true,
    }));
  },
};

// Sentry avvolge la configurazione: aggiunge il caricamento del client e la mappatura
// del codice compilato, senza la quale gli stack trace sono illeggibili.
//
// `tunnelRoute`: le segnalazioni passano dal NOSTRO dominio invece che da quello di
// Sentry. I blocchi pubblicitari fermano le richieste verso i domini di telemetria, e
// un sistema di allarme che si zittisce proprio sui browser piu' protetti e' peggio di
// nessun sistema di allarme.
export default withSentryConfig(nextConfig, {
  org: "evalis",
  project: "evalisdeck",
  silent: true,
  tunnelRoute: "/monitoraggio",
  // Le mappe del codice si caricano su Sentry e NON restano pubbliche: servono a noi
  // per leggere gli stack, non ai visitatori per leggere il nostro sorgente.
  widenClientFileUpload: true,
  sourcemaps: { deleteSourcemapsAfterUpload: true },
});
