"use client";

import { useEffect, useSyncExternalStore } from "react";
import { usePathname } from "next/navigation";
import { percorsoEscluso } from "./analytics-percorsi";
import {
  analiticaAttiva,
  iscriviConsenso,
  leggiConsenso,
  pubblicitaAttiva,
  raccoltaSpentaSulServer,
  type StatoConsenso,
} from "@/features/consenso/stato";
import { restrizione as restrizioneCsp, type FontiCsp } from "@/lib/csp";

// Google Analytics 4 e Google Ads, che partono SOLO dopo un consenso esplicito, ciascuno
// col proprio.
//
// Non è lo snippet che fornisce Google. Quello carica `gtag.js` all'apertura della pagina,
// cioè prima che chiunque abbia scelto qualcosa: in Italia le Linee guida cookie del Garante
// del 10 giugno 2021 chiedono che nessuno strumento di misurazione di terze parti sia
// attivato prima del consenso, e «attivato» comprende lo scaricamento dello script.
//
// Qui il componente non fa NIENTE finché non c'è una scelta che accenda almeno una delle
// due finalità: nessun tag, nessuna richiesta verso Google, nessun cookie. È la lettura
// restrittiva del Consent Mode — quella che si difende davanti a un legale — e costa una
// cosa sola: senza consenso non arrivano nemmeno i dati che Google chiama «modellati».
//
// Il prezzo da mettere in conto: Analytics vedrà meno traffico di quello reale, quanto la
// quota di chi rifiuta. Non è un difetto di configurazione, è il consenso che funziona. Il
// conteggio degli arrivi da campagna che NON dipende dal consenso è un altro, nostro, senza
// cookie e aggregato: `conta-arrivi.tsx`.
//
// ⚠️ LO SCRIPT SI INSERISCE A MANO, non con `next/script`: per chi ha accettato una sola
// finalità, il `<meta>` che restringe la CSP deve stare nel documento PRIMA che gtag
// parta, e l'ordine di due effetti di componenti diversi non lo garantisce nessuno.

const ID_GA = process.env.NEXT_PUBLIC_GA4_ID;
const ID_ADS = process.env.NEXT_PUBLIC_GOOGLE_ADS_ID;

/** La scelta con cui gtag è stato caricato in QUESTO documento, o `null` se non lo è. */
let caricatoCon: StatoConsenso = null;

type FinestraConGtag = Window & { dataLayer?: unknown[]; gtag?: (...a: unknown[]) => void };

function avvia(consenso: StatoConsenso, escluso: boolean, fonti: FontiCsp) {
  // gtag non si spegne: una volta scaricato, resta in memoria finché la pagina vive. Se la
  // scelta cambia — una revoca, o un ripensamento da «Preferenze cookie» — l'unico modo
  // onesto di applicarla subito è ricaricare il documento, e così vale anche per una
  // navigazione verso una pagina dove la misurazione non deve girare.
  if (caricatoCon !== null) {
    if (consenso !== caricatoCon || escluso) window.location.reload();
    return;
  }

  const statistiche = analiticaAttiva(consenso) && !!ID_GA;
  const pubblicita = pubblicitaAttiva(consenso);
  const ads = pubblicita && !!ID_ADS;
  if (escluso || (!statistiche && !ads)) return;

  // I due tag di Google sono combinati: ciascuno porta con sé l'altro. Chi ha acconsentito
  // a una sola finalità riceve una CSP più stretta, PRIMA che gtag parta, e il browser
  // ferma gli invii per l'altra. Il perché e la regola stanno in `src/lib/csp.ts`.
  const regola = restrizioneCsp(fonti, { statistiche: analiticaAttiva(consenso), pubblicita });
  if (regola && !document.querySelector("meta[data-csp-finalita]")) {
    const meta = document.createElement("meta");
    meta.httpEquiv = "Content-Security-Policy";
    meta.content = regola;
    meta.setAttribute("data-csp-finalita", "");
    document.head.prepend(meta);
  }

  const w = window as FinestraConGtag;
  w.dataLayer = w.dataLayer || [];
  // `arguments` e non un array: gtag.js riconosce i comandi solo in quella forma.
  w.gtag = function gtag() {
    // eslint-disable-next-line prefer-rest-params
    w.dataLayer!.push(arguments);
  };
  // Il consenso si dichiara PRIMA di config, altrimenti il primo evento parte in stato
  // negato e non viene conteggiato.
  w.gtag("consent", "default", {
    analytics_storage: statistiche ? "granted" : "denied",
    ad_storage: pubblicita ? "granted" : "denied",
    ad_user_data: pubblicita ? "granted" : "denied",
    // Niente annunci personalizzati, nemmeno col consenso alla pubblicità: chiediamo di
    // misurare le campagne, non di seguire le persone con altri annunci. Una finalità in
    // più andrebbe chiesta a parte, e dichiarata.
    ad_personalization: "denied",
    functionality_storage: "granted",
    personalization_storage: "denied",
    security_storage: "granted",
  });
  w.gtag("js", new Date());
  // anonymize_ip è ridondante in GA4 (l'IP è troncato sempre, non si può disattivare)
  // ma dichiararlo rende esplicito l'intento a chi legge il codice.
  // I Segnali Google (dati demografici e fra dispositivi) sono accesi nella proprietà: la
  // misura del 21 ottobre 2026 ha visto partire `stats.g.doubleclick.net`. Sono
  // profilazione, che non chiediamo. Si chiede di spegnerli qui, ma ⚠️ la misura li ha
  // visti partire LO STESSO, con `set` e con `config`: a fermarli è la CSP, che quel
  // dominio non lo permette (`src/lib/csp.ts`). Il rimedio vero è spegnerli nella proprietà
  // di Analytics, e allora sparisce anche la violazione in console.
  const senzaProfili = { allow_google_signals: false, allow_ad_personalization_signals: false };
  if (statistiche) w.gtag("config", ID_GA, { anonymize_ip: true, ...senzaProfili });
  if (ads) w.gtag("config", ID_ADS, senzaProfili);

  const script = document.createElement("script");
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${statistiche ? ID_GA : ID_ADS}`;
  script.setAttribute("data-gtag", "");
  document.head.appendChild(script);
  caricatoCon = consenso;
}

export function Analytics({ fontiCsp }: { fontiCsp: FontiCsp }) {
  // `raccoltaSpentaSulServer` e non l'istantanea del banner: nell'HTML iniziale questo
  // componente non deve accendere niente, mai. Scambiare le due significa caricare gtag.js
  // prima che l'utente abbia scelto — e in silenzio.
  const consenso = useSyncExternalStore(iscriviConsenso, leggiConsenso, raccoltaSpentaSulServer);
  const pathname = usePathname();

  // Il documento pubblicato e le pagine con un token nell'indirizzo: l'elenco e il perché
  // stanno in `analytics-percorsi.ts`.
  const escluso = percorsoEscluso(pathname);

  useEffect(() => {
    avvia(consenso, escluso, fontiCsp);
  }, [consenso, escluso, fontiCsp]);

  return null;
}
