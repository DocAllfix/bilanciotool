"use client";

import { useSyncExternalStore } from "react";
import Script from "next/script";
import { usePathname } from "next/navigation";
import {
  analiticaAttiva,
  iscriviConsenso,
  leggiConsenso,
  raccoltaSpentaSulServer,
} from "@/features/consenso/stato";

// Google Analytics 4, che parte SOLO dopo un consenso esplicito.
//
// Non è lo snippet che fornisce Google. Quello carica `gtag.js` all'apertura della pagina,
// cioè prima che chiunque abbia scelto qualcosa: in Italia le Linee guida cookie del Garante
// del 10 giugno 2021 chiedono che nessuno strumento di misurazione di terze parti sia
// attivato prima del consenso, e «attivato» comprende lo scaricamento dello script.
//
// Qui il componente non rende NIENTE finché la scelta non è «accettato»: nessun tag, nessuna
// richiesta verso googletagmanager.com, nessun cookie. È la lettura restrittiva del Consent
// Mode — quella che si difende davanti a un legale — e costa una cosa sola: senza consenso
// non arrivano nemmeno i dati aggregati che Google chiama «modellati».
//
// Il prezzo da mettere in conto: Analytics vedrà meno traffico di quello reale, quanto la
// quota di chi rifiuta. Non è un difetto di configurazione, è il consenso che funziona.

const ID = process.env.NEXT_PUBLIC_GA4_ID;

export function Analytics() {
  // `raccoltaSpentaSulServer` e non l'istantanea del banner: nell'HTML iniziale questo
  // componente non deve rendere niente, mai. Scambiare le due significa caricare gtag.js
  // prima che l'utente abbia scelto — e in silenzio.
  const consenso = useSyncExternalStore(iscriviConsenso, leggiConsenso, raccoltaSpentaSulServer);
  const pathname = usePathname();

  // Il documento pubblicato è la pagina che Chromium trasforma in PDF: nessuno script di
  // misurazione deve girare dentro un documento consegnato a un cliente.
  const dentroUnDocumento = pathname?.startsWith("/documento/") ?? false;

  if (!ID || dentroUnDocumento || !analiticaAttiva(consenso)) return null;

  return (
    <>
      <Script
        id="ga4-sorgente"
        strategy="afterInteractive"
        src={`https://www.googletagmanager.com/gtag/js?id=${ID}`}
      />
      <Script id="ga4-avvio" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          // Il consenso è già stato dato: lo si dichiara PRIMA di config, altrimenti il
          // primo evento parte in stato negato e non viene conteggiato.
          gtag('consent', 'default', {
            'ad_storage': 'denied',
            'ad_user_data': 'denied',
            'ad_personalization': 'denied',
            'analytics_storage': 'granted',
            'functionality_storage': 'granted',
            'personalization_storage': 'denied',
            'security_storage': 'granted'
          });
          gtag('js', new Date());
          // anonymize_ip è ridondante in GA4 (l'IP è troncato sempre, non si può disattivare)
          // ma dichiararlo rende esplicito l'intento a chi legge il codice.
          gtag('config', '${ID}', { anonymize_ip: true });
        `}
      </Script>
    </>
  );
}
