import type { Metadata } from "next";
import { AREE_VETRINA, QUANTI_PERCORSI } from "@/components/landing/percorsi-vetrina";
import { DOMANDE } from "@/components/landing/domande";
import { Landing } from "@/components/landing/landing";
import { ECOVADIS, ecovadisValido } from "@/lib/ecovadis";
import { DatiStrutturati } from "@/components/seo/dati-strutturati";

/** Tutti i percorsi in fila, per i testi che li elencano. */
const TUTTI_I_PERCORSI = AREE_VETRINA.flatMap((a) => a.percorsi);

// ⚠️ IL DESTINATARIO È CAMBIATO il 6 novembre 2026, per decisione del committente: i
// consulenti non rispondevano, e il cliente primario è l'AZIENDA che ha un responsabile
// interno per questo lavoro. La pagina parla a lui; i consulenti strutturati hanno una
// sezione loro e i loro piani.
//
// ⚠️ LA COPY È DURA MA VERA. Ogni obbligo e ogni sanzione citati qui stanno in
// `problemi.ts` con la loro fonte, e la fonte si stampa sotto il testo: su un prodotto che
// vende conformità, un'affermazione sbagliata in vetrina è il danno peggiore.
//
// ⚠️ NESSUNA CIFRA DI PREZZO sulla home: i prezzi stanno su `/prezzi`. Le sanzioni si
// scrivono in «euro» a lettere, mai col simbolo: il collaudo pubblico cerca gli importi
// col simbolo per verificare che qui non ce ne siano.

export const metadata: Metadata = {
  // `absolute` perché il layout radice accoda «· EvalisDeck» a ogni titolo, e qui il
  // marchio sta già in testa.
  title: {
    absolute: "EvalisDeck · La conformità della tua azienda, in un solo strumento",
  },
  description: `Per chi in azienda si occupa di conformità: ${QUANTI_PERCORSI} percorsi guidati, dall'inventario GHG e dai bilanci ESG ed energetico al Modello 231, alle segnalazioni, a NIS2, GDPR, ISO 27001 e SA8000. Calcoli automatici, documenti impaginati, versioni immutabili.`,
};

// Dati strutturati: chi produce lo strumento e con quale riconoscimento.
// Il rating sta su Organization (è di Evalis), non sul software.
const DATI_STRUTTURATI = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "Evalis Srl",
  url: "https://evalisdeck.it",
  ...(ecovadisValido()
    ? {
        award: `Medaglia EcoVadis ${ECOVADIS.medaglia} (${ECOVADIS.punteggio}/100, ${ECOVADIS.percentile}° percentile), ${ECOVADIS.mese}`,
        hasCredential: {
          "@type": "EducationalOccupationalCredential",
          name: `Valutazione di sostenibilità EcoVadis, medaglia ${ECOVADIS.medaglia}`,
          credentialCategory: "rating",
          recognizedBy: { "@type": "Organization", name: "EcoVadis" },
          validFrom: ECOVADIS.emessoIl,
          validUntil: ECOVADIS.validoFino,
        },
      }
    : {}),
  makesOffer: {
    "@type": "Offer",
    itemOffered: {
      "@type": "SoftwareApplication",
      name: "EvalisDeck",
      applicationCategory: "BusinessApplication",
      // ⚠️ L'elenco si DERIVA dal registro: scritto a mano ne nominava cinque su dodici.
      description: `Percorsi guidati per le aziende e i loro consulenti: ${TUTTI_I_PERCORSI.map((p) => p.titolo).join(", ")}.`,
    },
  },
};

// Le domande frequenti dette anche ai motori di ricerca, con le STESSE risposte che
// stanno in pagina: si leggono dallo stesso elenco, non si ricopiano.
const DOMANDE_STRUTTURATE = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: DOMANDE.map(([q, a]) => ({
    "@type": "Question",
    name: q,
    acceptedAnswer: { "@type": "Answer", text: a },
  })),
};

export default function LandingPage() {
  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <DatiStrutturati dato={DATI_STRUTTURATI} />
      <DatiStrutturati dato={DOMANDE_STRUTTURATE} />
      <Landing />
    </div>
  );
}
