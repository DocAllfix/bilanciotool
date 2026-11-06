import type { Metadata } from "next";
import Link from "next/link";
import { Check } from "lucide-react";

import { SiteHeader } from "@/components/landing/site-header";
import { PiedeMarketing } from "@/components/landing/piede";
import { Reveal } from "@/components/landing/scroll-reveal";
import { Faq } from "@/components/landing/faq";
import { DOMANDE_PREZZI } from "@/components/landing/domande-prezzi";
import { CalcolatoreRitorno } from "@/components/landing/calcolatore-ritorno";
import { ModuloEnterprise } from "@/components/landing/modulo-enterprise";
import { AREE_VETRINA, QUANTI_PERCORSI } from "@/components/landing/percorsi-vetrina";
import { InterruttorePeriodo, PeriodoProvider, PrezzoFascia } from "@/components/prezzi/periodo";
import { PulsanteAttiva } from "@/components/prezzi/pulsante-attiva";
import { Button } from "@/components/ui/button";
import {
  PERIODI, PIANI, euro, prezzoDiVendita, costoAnnuoMensile, aziendeTesto,
  fasceVendibili, prezzoMinimoMensile, quanteFasceInLettere,
} from "@/lib/prezzi";
import { indirizzoCanonico } from "@/lib/indirizzo";
import { DatiStrutturati } from "@/components/seo/dati-strutturati";

// ⚠️ PAGINA STATICA. Non legge la richiesta, e non deve farlo nemmeno indirettamente:
// `pagine-statiche-pure.test.ts` SEGUE GLI IMPORT a partire da qui. L'interruttore
// mensile/annuale vive nel browser (`PeriodoProvider`): la pagina si genera una volta sola
// con l'annuale, che è il predefinito.

export const metadata: Metadata = {
  title: { absolute: "Prezzi · EvalisDeck" },
  description:
    `Annuale o mensile, tutto incluso: ${QUANTI_PERCORSI} percorsi guidati, documenti senza limite di numero, ` +
    `accessi per i colleghi compresi. Per l'azienda che fa da sé e per i consulenti fino a 30 aziende, ` +
    // ⚠️ Il «da» si chiede al listino, mai scritto a mano.
    `da ${euro(prezzoMinimoMensile())} al mese, IVA esclusa.`,
  alternates: { canonical: `${indirizzoCanonico()}/prezzi` },
};

const VENDIBILI = fasceVendibili();

/** Ciò che c'è in ogni piano. Uguale per tutti: cambia solo la capienza. */
const COMPRESO: [string, string][] = [
  ["Tutti i percorsi, presenti e futuri", "I percorsi rilasciati durante il tuo abbonamento entrano senza sovrapprezzo"],
  ["Documenti pubblicati senza limite", "Versioni immutabili, archivio e codice di verifica pubblico"],
  ["Gli accessi per i colleghi", "Chi lavora con te entra col proprio account, e vede ciò che gli assegni"],
  ["Documenti col tuo marchio", "Escono col nome della tua azienda o del tuo studio, non col nostro"],
  ["Portale di consultazione", "Chi deve leggere i documenti li scarica senza account"],
  ["Aggiornamenti dei fattori", "Librerie ISPRA, DEFRA e IPCC versionate: gli inventari pubblicati non si riscrivono"],
];

// I dati strutturati portano i prezzi VERI, presi dal listino, con il periodo dichiarato:
// un `Offer` che dichiara un importo diverso da quello che si paga è il modo più rapido di
// perdere la fiducia di un motore di ricerca.
const OFFERTE = {
  "@context": "https://schema.org",
  "@type": "Product",
  name: "EvalisDeck",
  description: metadata.description,
  brand: { "@type": "Organization", name: "Evalis Srl" },
  offers: VENDIBILI.flatMap((k) => {
    const p = PIANI[k];
    return PERIODI.map((periodo) => {
      const v = prezzoDiVendita(p, periodo)!;
      return {
        "@type": "Offer",
        name: `${p.nome}, ${periodo === "anno" ? "annuale" : "mensile"}`,
        description: p.descrizione,
        price: (v.importo / 100).toFixed(2),
        priceCurrency: "EUR",
        priceSpecification: {
          "@type": "UnitPriceSpecification",
          price: (v.importo / 100).toFixed(2),
          priceCurrency: "EUR",
          billingDuration: periodo === "anno" ? "P1Y" : "P1M",
          valueAddedTaxIncluded: false,
        },
        availability: "https://schema.org/InStock",
        url: `${indirizzoCanonico()}/prezzi`,
      };
    });
  }),
};

const DOMANDE_STRUTTURATE = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: DOMANDE_PREZZI.map(([q, a]) => ({
    "@type": "Question",
    name: q,
    acceptedAnswer: { "@type": "Answer", text: a },
  })),
};

export default function Prezzi() {
  return (
    <div className="flex min-h-dvh flex-col">
      <SiteHeader />
      <main className="flex-1">
        {/* ============================================================ APERTURA */}
        <section className="border-b">
          <div className="mx-auto w-full max-w-6xl px-5 pb-16 pt-20">
            <Reveal>
              <div className="max-w-2xl">
                <p className="flex items-center gap-3 text-[11px] font-semibold uppercase tracking-[0.22em] text-primary">
                  <span className="h-px w-8 bg-primary" aria-hidden />
                  Prezzi
                </p>
                <h1 className="font-display mt-4 text-[34px] font-bold leading-[1.08] tracking-[-0.02em] md:text-[46px]">
                  {quanteFasceInLettere()} piani. Tutti i percorsi in ognuno.
                </h1>
                <p className="mt-5 text-[16px] leading-relaxed text-muted-foreground">
                  Per l&apos;azienda che porta avanti la conformità al proprio interno, e per i consulenti che
                  seguono più aziende. Paghi l&apos;anno o il mese, sempre allo stesso prezzo: i {QUANTI_PERCORSI}{" "}
                  percorsi, i documenti senza limite di numero e gli accessi per chi lavora con te sono compresi in
                  ogni piano. L&apos;unica cosa che scegli è quante aziende segui.
                </p>
              </div>
            </Reveal>
          </div>
        </section>

        {/* ============================================================== I PIANI */}
        <PeriodoProvider>
          <section className="border-b bg-muted/30" data-piani>
            <div className="mx-auto w-full max-w-6xl px-5 py-16">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <p className="text-[14px] text-muted-foreground">Prezzi IVA esclusa.</p>
                <InterruttorePeriodo />
              </div>

              <div className="mt-6 grid gap-6 md:grid-cols-3">
                {VENDIBILI.map((k, i) => {
                  const p = PIANI[k];
                  const primario = p.pubblico === "azienda";
                  return (
                    <Reveal key={k} delay={i * 70}>
                      <div
                        className={
                          "flex h-full flex-col rounded-xl border bg-card p-6 " +
                          (primario ? "border-primary/60 shadow-md" : "")
                        }
                        data-scheda-piano={k}
                      >
                        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
                          {primario ? "Per la tua azienda" : "Per i consulenti"}
                        </p>
                        <h2 className="font-display mt-1.5 text-[21px] font-bold tracking-[-0.01em]">{p.nome}</h2>
                        <p className="mt-1.5 text-[13.5px] leading-relaxed text-muted-foreground">{p.descrizione}</p>
                        <div className="mt-6">
                          <PrezzoFascia piano={k} />
                        </div>
                        <ul className="mt-5 space-y-1.5 border-t pt-4 text-[13.5px]">
                          <li className="flex gap-2">
                            <Check className="mt-0.5 size-3.5 shrink-0 text-primary" aria-hidden />
                            {p.usoInterno ? "Un'azienda, la tua" : aziendeTesto(p.aziende)}
                          </li>
                          <li className="flex gap-2">
                            <Check className="mt-0.5 size-3.5 shrink-0 text-primary" aria-hidden />
                            {p.accessi} accessi
                          </li>
                          {p.usoInterno && (
                            <li className="flex gap-2">
                              <Check className="mt-0.5 size-3.5 shrink-0 text-primary" aria-hidden />
                              A ciascun collega i suoi percorsi
                            </li>
                          )}
                          <li className="flex gap-2">
                            <Check className="mt-0.5 size-3.5 shrink-0 text-primary" aria-hidden />
                            Tutti i {QUANTI_PERCORSI} percorsi
                          </li>
                        </ul>
                        <div className="mt-auto pt-6">
                          <PulsanteAttiva piano={k} variante={primario ? "default" : "outline"} />
                        </div>
                      </div>
                    </Reveal>
                  );
                })}
              </div>

              <Reveal delay={220}>
                <div
                  id="enterprise"
                  className="mt-6 scroll-mt-24 rounded-xl border border-dashed p-6 md:grid md:grid-cols-[minmax(0,22rem)_1fr] md:gap-8"
                >
                  <div>
                    <h2 className="font-display text-[21px] font-bold tracking-[-0.01em]">{PIANI.enterprise.nome}</h2>
                    <p className="mt-1.5 text-[13.5px] leading-relaxed text-muted-foreground">
                      Oltre 30 aziende, gruppi societari, reti di studi, capofila con molti fornitori: esigenze troppo
                      diverse fra loro perché un listino unico le serva bene. Raccontaci di che cosa avete bisogno e
                      prepariamo un&apos;offerta.
                    </p>
                  </div>
                  <div className="mt-5 md:mt-0">
                    <ModuloEnterprise />
                  </div>
                </div>
              </Reveal>

              <Reveal delay={260}>
                <p className="mt-6 text-[13px] leading-relaxed text-muted-foreground">
                  Se superi le aziende del tuo piano, la piattaforma te lo segnala prima che accada: si passa al piano
                  più capiente, oppure oltre le 30 aziende a {PIANI.enterprise.nome}. Nessun lavoro si blocca e nulla
                  va rifatto.
                </p>
              </Reveal>
            </div>
          </section>
        </PeriodoProvider>

        {/* ========================================================= TUTTO INCLUSO */}
        <section className="border-b">
          <div className="mx-auto w-full max-w-6xl px-5 py-20">
            <Reveal>
              <div className="max-w-2xl">
                <h2 className="font-display text-[28px] font-bold leading-tight tracking-[-0.02em] md:text-[34px]">
                  Tutto incluso, in ogni piano.
                </h2>
                <p className="mt-4 text-[15px] leading-relaxed text-muted-foreground">
                  Nessun modulo a pagamento separato, nessuna funzione riservata ai piani più cari: il contenuto è
                  identico per tutti. Cambia una cosa sola, quante aziende puoi seguire.
                </p>
              </div>
            </Reveal>

            <div className="mt-12 grid gap-x-10 gap-y-7 sm:grid-cols-2">
              {COMPRESO.map(([titolo, dettaglio], i) => (
                <Reveal key={titolo} delay={i * 50}>
                  <div className="flex gap-3">
                    <Check className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
                    <div>
                      <p className="text-[14.5px] font-medium">{titolo}</p>
                      <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">{dettaglio}</p>
                    </div>
                  </div>
                </Reveal>
              ))}
            </div>

            {/* ⚠️ La tabella scorre nel PROPRIO contenitore, mai il corpo della pagina: su un
                telefono da 360px sei colonne di numeri non ci stanno. */}
            <Reveal delay={200}>
              <div className="mt-12 overflow-x-auto rounded-xl border">
                <table className="w-full min-w-[40rem] border-collapse text-[13.5px]">
                  <caption className="sr-only">I piani a confronto: capienza e prezzo, annuale e mensile</caption>
                  <thead>
                    <tr className="border-b bg-muted/40 text-left">
                      <th scope="col" className="px-4 py-3 font-semibold">Piano</th>
                      <th scope="col" className="px-4 py-3 font-semibold">Aziende</th>
                      <th scope="col" className="px-4 py-3 font-semibold">Accessi</th>
                      <th scope="col" className="px-4 py-3 font-semibold">Annuale</th>
                      <th scope="col" className="px-4 py-3 font-semibold">Mensile</th>
                      <th scope="col" className="px-4 py-3 font-semibold">12 mesi col mensile</th>
                    </tr>
                  </thead>
                  <tbody>
                    {VENDIBILI.map((k) => {
                      const p = PIANI[k];
                      return (
                        <tr key={k} className="border-b last:border-0">
                          <th scope="row" className="px-4 py-3 text-left font-medium">{p.nome}</th>
                          <td className="px-4 py-3 tabular-nums">{p.usoInterno ? "1, la propria" : p.aziende}</td>
                          <td className="px-4 py-3 tabular-nums">{p.accessi}</td>
                          <td className="px-4 py-3 font-medium tabular-nums">{euro(prezzoDiVendita(p, "anno")!.importo)}</td>
                          <td className="px-4 py-3 tabular-nums">{euro(prezzoDiVendita(p, "mese")!.importo)}</td>
                          <td className="px-4 py-3 text-muted-foreground tabular-nums">{euro(costoAnnuoMensile(p)!)}</td>
                        </tr>
                      );
                    })}
                    <tr>
                      <th scope="row" className="px-4 py-3 text-left font-medium">{PIANI.enterprise.nome}</th>
                      <td className="px-4 py-3 text-muted-foreground">oltre 30</td>
                      <td className="px-4 py-3 text-muted-foreground">su misura</td>
                      <td className="px-4 py-3 text-muted-foreground" colSpan={3}>
                        <Link href="#enterprise" className="underline underline-offset-4 hover:text-foreground">
                          contattaci
                        </Link>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </Reveal>
          </div>
        </section>

        {/* =========================================================== IL CONTO */}
        <section className="border-b bg-muted/30">
          <div className="mx-auto w-full max-w-6xl px-5 py-20">
            <Reveal>
              <div className="max-w-2xl">
                <h2 className="font-display text-[28px] font-bold leading-tight tracking-[-0.02em] md:text-[34px]">
                  Il conto da fare prima di decidere.
                </h2>
                <p className="mt-4 text-[15px] leading-relaxed text-muted-foreground">
                  Mettici i tuoi numeri: quanto ti costa oggi farti preparare i documenti, o quanto li fai pagare ai
                  tuoi clienti. Nessuna media di mercato dice qualcosa di utile sul tuo caso.
                </p>
              </div>
            </Reveal>
            <Reveal delay={80}>
              <div className="mt-10">
                <CalcolatoreRitorno />
              </div>
            </Reveal>
          </div>
        </section>

        {/* ======================================================== I PERCORSI */}
        <section className="border-b">
          <div className="mx-auto w-full max-w-6xl px-5 py-20">
            <Reveal>
              <div className="max-w-2xl">
                <h2 className="font-display text-[28px] font-bold leading-tight tracking-[-0.02em] md:text-[34px]">
                  Che cosa comprende «tutti i percorsi».
                </h2>
                <p className="mt-4 text-[15px] leading-relaxed text-muted-foreground">
                  Sono {QUANTI_PERCORSI}, divisi in {AREE_VETRINA.length} gruppi, e ci sono tutti in ogni piano.
                </p>
              </div>
            </Reveal>
            <div className="mt-10 grid gap-8 md:grid-cols-3">
              {AREE_VETRINA.map((area, i) => (
                <Reveal key={area.nome} delay={i * 70}>
                  <div>
                    <p className="flex items-center gap-3 text-[11px] font-semibold uppercase tracking-[0.16em]">
                      <span className={`h-2 w-6 shrink-0 ${area.tratto}`} aria-hidden />
                      {area.nome}
                    </p>
                    <ul className="mt-4 space-y-2 text-[13.5px] leading-relaxed">
                      {area.percorsi.map((p) => (
                        <li key={p.titolo} className="border-b pb-2 last:border-0">
                          {p.titolo}
                          <span className="ml-2 font-mono text-[11px] text-muted-foreground">{p.norma}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </Reveal>
              ))}
            </div>
            <Reveal delay={240}>
              <p className="mt-10 text-[13.5px]">
                <Link href="/#percorsi" className="font-medium underline underline-offset-4 hover:text-primary">
                  Che cosa fa ciascuno, in dettaglio
                </Link>
              </p>
            </Reveal>
          </div>
        </section>

        {/* ========================================================== LE DOMANDE */}
        <section id="domande" className="scroll-mt-20 border-b">
          <div className="mx-auto w-full max-w-6xl px-5 py-20">
            <Reveal>
              <div className="grid gap-10 md:grid-cols-[minmax(0,20rem)_1fr]">
                <div>
                  <h2 className="font-display text-[28px] font-bold leading-tight tracking-[-0.02em] md:text-[34px]">
                    Le domande sui prezzi.
                  </h2>
                  <p className="mt-4 text-[14px] leading-relaxed text-muted-foreground">
                    Per tutto il resto:{" "}
                    <a href="mailto:info@evalisdeck.it" className="underline underline-offset-4 hover:text-primary">
                      info@evalisdeck.it
                    </a>
                  </p>
                </div>
                <Faq domande={DOMANDE_PREZZI} />
              </div>
            </Reveal>
          </div>
        </section>

        {/* ============================================================== CHIUSURA */}
        <section>
          <div className="mx-auto w-full max-w-6xl px-5 py-20">
            <Reveal>
              <div className="max-w-2xl">
                <h2 className="font-display text-[28px] font-bold leading-tight tracking-[-0.02em] md:text-[34px]">
                  Prima di pagare, guardalo lavorare su un&apos;azienda vera.
                </h2>
                <p className="mt-4 text-[15px] leading-relaxed text-muted-foreground">
                  Registrati e apri la demo: un&apos;azienda d&apos;esempio già compilata, percorribile per intero, senza
                  carta. Se hai già deciso, attivi subito e salti il giro.
                </p>
                <div className="mt-7 flex flex-wrap gap-3">
                  <Button asChild size="lg">
                    <Link href="/attiva/azienda">Attiva il servizio</Link>
                  </Button>
                  <Button asChild size="lg" variant="outline">
                    <Link href="/registrati">Prova la demo guidata</Link>
                  </Button>
                </div>
              </div>
            </Reveal>
          </div>
        </section>
      </main>
      <PiedeMarketing />
      <DatiStrutturati dato={OFFERTE} />
      <DatiStrutturati dato={DOMANDE_STRUTTURATE} />
    </div>
  );
}
