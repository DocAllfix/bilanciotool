// Le quattro direttive della CSP che cambiano con le finalità di misurazione consentite.
//
// Modulo puro e senza alias: lo importano `next.config.ts` (che non risolve `@/`) e il
// layout radice, e lo prova un test senza montare niente.
//
// ⚠️ PERCHÉ LA STESSA REGOLA STA IN DUE POSTI, E NON È UNA COPIA. L'intestazione della
// pagina è statica: è uguale per chi ha acconsentito alla pubblicità e per chi no, quindi
// deve PERMETTERE Google Ads — altrimenti chi acconsente non verrebbe misurato, ed era
// esattamente il difetto del 21 ottobre 2026 (il tag di Google Ads collegato a quello di
// Analytics partiva dopo il consenso e la CSP lo bloccava: 130 clic in Google Ads, 30
// visite in Analytics).
//
// Ma i due tag di Google sono COMBINATI: caricando quello di Analytics parte anche Google
// Ads, e caricando quello di Ads parte anche Analytics. Con le sole statistiche accettate,
// Google Ads manda lo stesso un «ping senza cookie» col `gclid`; con la sola pubblicità,
// Analytics fa lo stesso (misurato, 21 ottobre 2026). Sono invii per una finalità a cui
// la persona ha detto no, e le Linee guida dell'EDPB 2/2023 li mettono dentro l'art. 5(3):
// serve il consenso anche senza cookie. Non c'è un'opzione di gtag che spenga una
// destinazione combinata.
//
// Quindi chi ha acconsentito a UNA sola finalità riceve una seconda politica, in un
// `<meta>` inserito prima di caricare gtag: una politica in un meta può solo RESTRINGERE,
// mai allargare, e il browser rispetta l'intersezione delle due. È il browser a fermare
// l'invio, non una nostra promessa.

/** Gli indirizzi di Google Ads, MISURATI aprendo le pagine col consenso dato (21 ottobre
 *  2026, `ccm/collect` e `pagead/set_partitioned_cookie` compresi).
 *
 *  ⚠️ `stats.g.doubleclick.net` NON c'è, di proposito: è dove Analytics manda i dati dei
 *  Segnali Google (dati demografici e fra dispositivi, cioè profilazione). La misura l'ha
 *  trovato acceso nella proprietà; chiediamo statistiche e misura delle campagne, non
 *  quello, e il browser lo ferma. */
export const ORIGINI_PUBBLICITA = {
  script: "https://www.googleadservices.com https://googleads.g.doubleclick.net https://www.google.com",
  img: "https://ad.doubleclick.net https://googleads.g.doubleclick.net https://pagead2.googlesyndication.com https://www.googleadservices.com https://www.google.com https://www.google.it",
  connect:
    "https://ad.doubleclick.net https://pagead2.googlesyndication.com https://www.googleadservices.com https://googleads.g.doubleclick.net https://www.google.com https://www.google.it",
  frame: "https://td.doubleclick.net https://www.googletagmanager.com",
} as const;

/** Gli indirizzi dove Google Analytics manda le misure. `googletagmanager` resta comunque
 *  fra gli script e le connessioni: è da lì che si scarica gtag, per l'una e per l'altra
 *  finalità. */
export const ORIGINI_STATISTICHE = {
  img: "https://*.google-analytics.com",
  connect: "https://*.google-analytics.com https://*.analytics.google.com",
} as const;

export type Finalita = { statistiche: boolean; pubblicita: boolean };

export type FontiCsp = {
  /** Origine di Supabase Storage, o `null` se l'archivio non è configurato. */
  archivio: string | null;
  /** Origine canonica del sito, per le immagini degli articoli. */
  canonica: string;
};

/** Le origini che dipendono dall'ambiente. Il perché di ciascuna sta in `next.config.ts`. */
export function fontiDaAmbiente(env: Record<string, string | undefined>): FontiCsp {
  let archivio: string | null = null;
  try {
    archivio = env.SUPABASE_URL ? new URL(env.SUPABASE_URL).origin : null;
  } catch {
    archivio = null;
  }
  let canonica = "https://evalisdeck.it";
  try {
    canonica = new URL(env.NEXT_PUBLIC_APP_URL ?? "https://evalisdeck.it").origin;
  } catch {
    // resta quella del dominio vero
  }
  return { archivio, canonica };
}

const permessi = (...voci: (string | null | false)[]) => voci.filter(Boolean).join(" ");

/** Le quattro direttive per le finalità consentite. Tutto il resto della CSP non cambia. */
export function direttiveVariabili(f: FontiCsp, consentite: Finalita) {
  const ads = consentite.pubblicita ? ORIGINI_PUBBLICITA : null;
  const ga = consentite.statistiche ? ORIGINI_STATISTICHE : null;
  return {
    script: permessi("script-src 'self' 'unsafe-inline' https://www.googletagmanager.com", ads?.script ?? null),
    // `googletagmanager` anche fra le IMMAGINI: Analytics manda una parte delle misure
    // come pixel, non come richiesta di rete.
    img: permessi(
      "img-src 'self' data: blob: https://cms.evalisdeck.it",
      f.canonica,
      f.archivio,
      "https://www.googletagmanager.com",
      ga?.img ?? null,
      ads?.img ?? null,
    ),
    connect: permessi(
      "connect-src 'self'",
      f.archivio,
      "https://*.googletagmanager.com",
      ga?.connect ?? null,
      ads?.connect ?? null,
    ),
    frame: ads ? `frame-src ${ads.frame}` : "frame-src 'none'",
  };
}

/** L'intestazione: permette tutto ciò che una delle scelte possibili può chiedere. */
export const TUTTE: Finalita = { statistiche: true, pubblicita: true };

/** Il contenuto del `<meta>` che restringe la pagina alle finalità consentite, o `null` se
 *  sono consentite entrambe e l'intestazione basta. */
export function restrizione(f: FontiCsp, consentite: Finalita): string | null {
  if (consentite.statistiche && consentite.pubblicita) return null;
  const d = direttiveVariabili(f, consentite);
  return [d.script, d.img, d.connect, d.frame].join("; ");
}
