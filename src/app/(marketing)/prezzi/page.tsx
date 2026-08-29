import type { Metadata } from "next";
import Link from "next/link";
import { Check } from "lucide-react";

import { SiteHeader } from "@/components/landing/site-header";
import { PiedeMarketing } from "@/components/landing/piede";
import { Reveal } from "@/components/landing/scroll-reveal";
import { Faq } from "@/components/landing/faq";
import { DOMANDE_PREZZI } from "@/components/landing/domande-prezzi";
import { CalcolatoreRitorno } from "@/components/landing/calcolatore-ritorno";
import { ModuloFondatori } from "@/components/landing/modulo-fondatori";
import { AREE_VETRINA, QUANTI_PERCORSI } from "@/components/landing/percorsi-vetrina";
import { Button } from "@/components/ui/button";
import { CHIAVI_PIANO, ESTENSIONI, FONDATORI, PIANI, euro, prezzoDiVendita } from "@/lib/prezzi";
import { indirizzoCanonico } from "@/lib/indirizzo";
import { DatiStrutturati } from "@/components/seo/dati-strutturati";

// ⚠️ PAGINA STATICA. Non legge la richiesta, e non deve farlo nemmeno indirettamente:
// `pagine-statiche-pure.test.ts` SEGUE GLI IMPORT a partire da qui. È la regola nata dal
// 500 sul primo articolo del blog, dove `SiteHeader` chiamava `getSessionOrNull()` tre
// livelli sotto e impediva a Next di generare come statica ogni pagina che lo montava.

export const metadata: Metadata = {
  title: { absolute: "Prezzi · EvalisDeck" },
  description:
    `Un abbonamento annuale per studio, tutto incluso: ${QUANTI_PERCORSI} percorsi guidati, documenti senza ` +
    `limite di numero, accessi e marchio dello studio compresi. Si sceglie solo la capienza del portafoglio, ` +
    `da ${euro(PIANI.professional.primoAnno)} l'anno.`,
  alternates: { canonical: `${indirizzoCanonico()}/prezzi` },
};

const VENDIBILI = CHIAVI_PIANO.filter((k) => !PIANI[k].trattativa);

/** Ciò che c'è in ogni fascia. Uguale per tutte: cambia solo la capienza. */
const COMPRESO: [string, string][] = [
  ["Tutti i percorsi, presenti e futuri", "I percorsi rilasciati durante il tuo abbonamento entrano senza sovrapprezzo"],
  ["Documenti pubblicati senza limite", "Versioni immutabili, archivio e codice di verifica pubblico"],
  ["Gli accessi del tuo studio", "Le persone che lavorano con te sono comprese"],
  ["Documenti col marchio del tuo studio", "Escono col tuo nome, non col nostro"],
  ["Portale di consultazione per i clienti", "Ogni tua azienda scarica i propri documenti senza account"],
  ["Aggiornamenti dei fattori", "Librerie ISPRA, DEFRA e IPCC versionate: gli inventari pubblicati non si riscrivono"],
];

// I dati strutturati portano i prezzi VERI, presi dal listino: un `Offer` che dichiara
// un importo diverso da quello che si paga è il modo più rapido di perdere la fiducia di
// un motore di ricerca, e non si recupera correggendolo dopo.
const OFFERTE = {
  "@context": "https://schema.org",
  "@type": "Product",
  name: "EvalisDeck",
  description: metadata.description,
  brand: { "@type": "Organization", name: "Evalis Srl" },
  offers: VENDIBILI.map((k) => {
    const p = PIANI[k];
    const v = prezzoDiVendita(p, "anno1")!;
    return {
      "@type": "Offer",
      name: p.nome,
      description: p.descrizione,
      price: (v.importo / 100).toFixed(2),
      priceCurrency: "EUR",
      availability: "https://schema.org/InStock",
      url: `${indirizzoCanonico()}/prezzi`,
    };
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
                  Abbonamento per studio
                </p>
                <h1 className="font-display mt-4 text-[34px] font-bold leading-[1.08] tracking-[-0.02em] md:text-[46px]">
                  Un abbonamento solo. Tre fasce.
                </h1>
                <p className="mt-5 text-[16px] leading-relaxed text-muted-foreground">
                  Si sottoscrive per studio e comprende sempre tutto: i {QUANTI_PERCORSI} percorsi, presenti e
                  futuri, gli accessi delle persone che lavorano con te, i documenti pubblicati senza limite di
                  numero. L&apos;unica cosa che scegli è la capienza: quante aziende gestisci in portafoglio.
                </p>
              </div>
            </Reveal>
          </div>
        </section>

        {/* ============================================================== LE FASCE */}
        <section className="border-b bg-muted/30">
          <div className="mx-auto w-full max-w-6xl px-5 py-16">
            <div className="grid gap-6 md:grid-cols-3">
              {VENDIBILI.map((k, i) => {
                const p = PIANI[k];
                const anno1 = prezzoDiVendita(p, "anno1")!;
                const rinnovo = prezzoDiVendita(p, "rinnovo")!;
                const consigliata = k === "studio";
                return (
                  <Reveal key={k} delay={i * 70}>
                    <div
                      className={
                        "flex h-full flex-col rounded-xl border bg-card p-6 " +
                        (consigliata ? "border-primary/60 shadow-md" : "")
                      }
                    >
                      {consigliata && (
                        <p className="mb-3 self-start rounded-full bg-primary px-2.5 py-1 text-[10.5px] font-semibold uppercase tracking-[0.14em] text-primary-foreground">
                          La più scelta
                        </p>
                      )}
                      <h2 className="font-display text-[21px] font-bold tracking-[-0.01em]">{p.nome}</h2>
                      <p className="mt-1.5 text-[13.5px] leading-relaxed text-muted-foreground">{p.descrizione}</p>
                      <p className="font-display mt-6 text-[38px] font-bold leading-none tabular-nums" data-slot="kpi">
                        {euro(anno1.importo)}
                      </p>
                      <p className="mt-2 text-[12.5px] text-muted-foreground">
                        l&apos;anno, IVA esclusa · dal secondo anno {euro(rinnovo.importo)}
                      </p>
                      <p className="mt-5 border-t pt-4 text-[14px] font-medium">
                        {p.aziende} aziende in portafoglio
                      </p>
                      <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">
                        Tutto il resto è compreso, ed è identico in ogni fascia.
                      </p>
                      <div className="mt-auto pt-6">
                        <Button asChild className="w-full" variant={consigliata ? "default" : "outline"}>
                          <Link href="/attiva">Attiva questa fascia</Link>
                        </Button>
                      </div>
                    </div>
                  </Reveal>
                );
              })}
            </div>

            <Reveal delay={220}>
              <div className="mt-6 rounded-xl border border-dashed p-6 sm:flex sm:items-center sm:justify-between sm:gap-6">
                <div>
                  <h2 className="font-display text-[19px] font-bold tracking-[-0.01em]">{PIANI.enterprise.nome}</h2>
                  <p className="mt-1.5 max-w-xl text-[13.5px] leading-relaxed text-muted-foreground">
                    Reti di studi, mandati di filiera, capofila con molti fornitori: esigenze troppo diverse fra
                    loro perché un listino unico le serva bene. Scrivici e prepariamo un preventivo.
                  </p>
                </div>
                <Button asChild variant="outline" className="mt-4 shrink-0 sm:mt-0">
                  <a href="mailto:info@evalisdeck.it?subject=Preventivo%20EvalisDeck%20oltre%2030%20aziende">
                    Chiedi un preventivo
                  </a>
                </Button>
              </div>
            </Reveal>

            <Reveal delay={260}>
              <p className="mt-6 text-[13px] leading-relaxed text-muted-foreground">
                Se superi le aziende della tua fascia, la piattaforma te lo segnala prima che accada: puoi
                aggiungere blocchi da {ESTENSIONI.bloccoAziende.aziende} aziende a{" "}
                {euro(ESTENSIONI.bloccoAziende.prezzo)} l&apos;anno, oppure scriverci per passare alla fascia
                superiore. Nessun lavoro si blocca e nulla va rifatto.
              </p>
            </Reveal>
          </div>
        </section>

        {/* ========================================================= TUTTO INCLUSO */}
        <section className="border-b">
          <div className="mx-auto w-full max-w-6xl px-5 py-20">
            <Reveal>
              <div className="max-w-2xl">
                <h2 className="font-display text-[28px] font-bold leading-tight tracking-[-0.02em] md:text-[34px]">
                  Tutto incluso, in ogni fascia.
                </h2>
                <p className="mt-4 text-[15px] leading-relaxed text-muted-foreground">
                  Nessun modulo a pagamento separato, nessuna funzione riservata alle fasce superiori: il
                  contenuto è identico per tutti. Cambia una cosa sola, quante aziende puoi gestire.
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
                telefono da 360px tre colonne di numeri non ci stanno, e una pagina che
                sfonda in orizzontale si legge come un difetto anche quando il contenuto è
                giusto. */}
            <Reveal delay={200}>
              <div className="mt-12 overflow-x-auto rounded-xl border">
                <table className="w-full min-w-[34rem] border-collapse text-[13.5px]">
                  <caption className="sr-only">Le fasce a confronto: capienza e prezzo</caption>
                  <thead>
                    <tr className="border-b bg-muted/40 text-left">
                      <th scope="col" className="px-4 py-3 font-semibold">
                        Fascia
                      </th>
                      <th scope="col" className="px-4 py-3 font-semibold">
                        Aziende
                      </th>
                      <th scope="col" className="px-4 py-3 font-semibold">
                        Primo anno
                      </th>
                      <th scope="col" className="px-4 py-3 font-semibold">
                        Dal secondo anno
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {VENDIBILI.map((k) => {
                      const p = PIANI[k];
                      return (
                        <tr key={k} className="border-b last:border-0">
                          <th scope="row" className="px-4 py-3 text-left font-medium">
                            {p.nome}
                          </th>
                          <td className="px-4 py-3 tabular-nums">{p.aziende}</td>
                          <td className="px-4 py-3 tabular-nums">{euro(prezzoDiVendita(p, "anno1")!.importo)}</td>
                          <td className="px-4 py-3 tabular-nums">{euro(prezzoDiVendita(p, "rinnovo")!.importo)}</td>
                        </tr>
                      );
                    })}
                    <tr>
                      <th scope="row" className="px-4 py-3 text-left font-medium">
                        {PIANI.enterprise.nome}
                      </th>
                      <td className="px-4 py-3 text-muted-foreground">su misura</td>
                      <td className="px-4 py-3 text-muted-foreground" colSpan={2}>
                        preventivo
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
                  Quanti documenti servono per ripagare l&apos;abbonamento? Mettici i tuoi numeri: la tariffa che
                  pratichi ai tuoi clienti la conosci tu, e nessuna media di mercato dice qualcosa di utile sul
                  tuo studio.
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
                  Sono {QUANTI_PERCORSI}, divisi in {AREE_VETRINA.length} gruppi, e ci sono tutti in ogni fascia.
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

        {/* ======================================================== I FONDATORI */}
        <section id="fondatori" className="scroll-mt-20 border-b bg-sidebar text-sidebar-foreground">
          <div className="mx-auto w-full max-w-6xl px-5 py-20">
            <Reveal>
              <div className="max-w-2xl">
                <p className="flex items-center gap-3 text-[11px] font-semibold uppercase tracking-[0.22em] text-sidebar-primary">
                  <span className="h-px w-8 bg-sidebar-primary" aria-hidden />
                  {FONDATORI.posti} posti
                </p>
                <h2 className="font-display mt-4 text-[28px] font-bold leading-tight tracking-[-0.02em] text-white md:text-[34px]">
                  Programma Fondatori
                </h2>
                <p className="mt-5 text-[15px] leading-relaxed text-sidebar-foreground/80">
                  Selezioniamo {FONDATORI.posti} studi che useranno la piattaforma su mandati reali in
                  questa fase di lancio. Dodici mesi a condizioni riservate, uno sconto che resta per tutta la
                  vita dell&apos;abbonamento, un canale diretto con chi sviluppa e voce sulla priorità dei
                  prossimi percorsi. In cambio chiediamo riscontri operativi e, se il servizio convince, una
                  testimonianza.
                </p>
                <p className="mt-4 text-[13.5px] leading-relaxed text-sidebar-foreground/60">
                  La testimonianza è dovuta solo in caso di effettiva soddisfazione: non chiediamo a nessuno di
                  dichiarare quello che non pensa.
                </p>
                <div className="mt-8 max-w-xl">
                  <ModuloFondatori />
                </div>
              </div>
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
                  Il prossimo documento parte da un&apos;azienda d&apos;esempio già compilata.
                </h2>
                <p className="mt-4 text-[15px] leading-relaxed text-muted-foreground">
                  Registrati e guarda come lavora: la demo è percorribile per intero e non chiede la carta. Se hai
                  già deciso, attivi subito e salti il giro.
                </p>
                <div className="mt-7 flex flex-wrap gap-3">
                  <Button asChild size="lg">
                    <Link href="/attiva">Attiva il servizio</Link>
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
