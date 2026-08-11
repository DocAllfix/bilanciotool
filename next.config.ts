import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

// CSP volutamente assente per ora (inline script Next + servizi terzi): step dedicato in Fase 11.
const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), browsing-topics=()" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
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
  disableLogger: true,
});
