import type { Metadata } from "next";
import Link from "next/link";
import { AREE_VETRINA, QUANTI_PERCORSI } from "@/components/landing/percorsi-vetrina";
import { NORME_VETRINA, NUMERI_VETRINA as NV } from "@/components/landing/numeri-vetrina";
import { PROBLEMI } from "@/components/landing/problemi";
import { PIANI, fasceVendibili, fasceConsulenti } from "@/lib/prezzi";
import { vetrinaDelModulo } from "@/features/vetrina/registro";

/** Tutti i percorsi in fila, per i testi che li elencano. */
const TUTTI_I_PERCORSI = AREE_VETRINA.flatMap((a) => a.percorsi);

/** Il piano dell'azienda che fa da sé: è il cliente primario dal 6 novembre 2026. */
const PIANO_AZIENDA = fasceVendibili().find((k) => PIANI[k].pubblico === "azienda") ?? "azienda";
/** La capienza più alta che si compra online, per la sezione dei consulenti. */
const MASSIMO_CONSULENTI = Math.max(...fasceConsulenti().map((k) => PIANI[k].aziende));

import { SiteHeader } from "@/components/landing/site-header";
import { HeroDeck } from "@/components/landing/hero-deck";
import { Reveal, Contatore } from "@/components/landing/scroll-reveal";
import { Button } from "@/components/ui/button";
import { ArrowRight, FileText } from "lucide-react";
import { Faq } from "@/components/landing/faq";
import { DOMANDE } from "@/components/landing/domande";
import { PiedeMarketing } from "@/components/landing/piede";
import { FasciaEcoVadis, FirmaEcoVadis } from "@/components/landing/ecovadis";
import { ECOVADIS, ecovadisValido } from "@/lib/ecovadis";
import { DatiStrutturati } from "@/components/seo/dati-strutturati";

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
      <SiteHeader />
      <main className="flex-1">
        {/* ============================================================ HERO */}
        <section className="relative overflow-hidden border-b">
          <div className="pointer-events-none absolute -top-40 left-[62%] h-[560px] w-[560px] rounded-full bg-primary/8 blur-3xl" aria-hidden />
          <div className="mx-auto grid w-full max-w-6xl items-center gap-12 px-5 py-10 md:grid-cols-[1.1fr_1fr] md:py-24">
            <div>
              <p className="flex items-center gap-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-primary sm:tracking-[0.22em]">
                <span className="h-px w-8 shrink-0 bg-primary" aria-hidden />
                Per chi segue la conformità in azienda
              </p>
              <h1 className="font-display mt-5 text-[36px] font-bold leading-[1.05] tracking-[-0.03em] sm:text-[44px] md:text-[58px]">
                Ogni richiesta di conformità finisce sulla tua scrivania.
              </h1>
              <p className="font-display mt-3 text-[20px] font-semibold tracking-[-0.01em] text-primary sm:text-[22px] md:text-[26px]">
                Falla uscire come un documento pronto.
              </p>
              <p className="mt-6 max-w-md text-[15px] leading-relaxed text-muted-foreground">
                Il cliente chiede le emissioni, la banca i dati di sostenibilità, la legge un canale per le
                segnalazioni, l&apos;ente di certificazione la documentazione. EvalisDeck ti guida passo per passo, fa
                i calcoli e produce il documento impaginato che regge la verifica: senza ripartire da un foglio
                bianco, e senza un consulente per ogni norma.
              </p>
              <div className="mt-8 flex flex-wrap items-center gap-3">
                <Button size="lg" asChild data-tour="cta-demo">
                  <Link href="/registrati">
                    Prova la demo guidata <ArrowRight className="size-4" />
                  </Link>
                </Button>
                <Button size="lg" variant="outline" asChild>
                  <Link href={`/attiva/${PIANO_AZIENDA}`}>Attiva il servizio</Link>
                </Button>
              </div>
              <p className="mt-4 text-sm">
                <a
                  href="/esempi/esempio-bilancio-2025.pdf"
                  target="_blank"
                  rel="noopener"
                  className="inline-flex items-center gap-2 font-medium text-foreground underline-offset-4 hover:underline"
                >
                  <FileText className="size-4" /> Guarda un bilancio d&apos;esempio
                </a>
              </p>
              <p className="mt-3 text-xs text-muted-foreground">
                Un&apos;azienda d&apos;esempio già compilata ti aspetta. Nessuna carta richiesta.{" "}
                <Link href="/#consulenti" className="underline underline-offset-2 hover:text-foreground">
                  Sei un consulente?
                </Link>
              </p>
              <FirmaEcoVadis />
            </div>
            <HeroDeck />
          </div>
        </section>

        {/* ================================================== STRIP NUMERI */}
        <section className="bg-sidebar text-sidebar-foreground">
          <div className="mx-auto w-full max-w-6xl px-5 py-14">
            <div className="grid gap-x-0 gap-y-10 md:grid-cols-[1fr_1fr_1fr_1.2fr]">
              {(
                [
                  [NV.percorsi, "", "percorsi guidati", `in ${NV.gruppi} gruppi, con ${NV.tipiDocumento} tipi di documento pubblicabili`],
                  [NV.requisiti, "", "requisiti e controlli", "catalogati uno per uno, ciascuno con la sua guida"],
                  [NV.corpus, "", "procedure e moduli", "pronti da adattare all'azienda e da stampare"],
                ] as [number, string, string, string][]
              ).map(([n, suff, titolo, sotto], i) => (
                <div key={titolo} className={i > 0 ? "md:border-l md:border-white/10 md:pl-10" : ""}>
                  <p className="font-display text-[56px] font-bold leading-none tracking-tight text-white">
                    <Contatore fino={n} suffisso={suff} />
                  </p>
                  <p className="mt-2 text-sm font-semibold text-sidebar-primary">{titolo}</p>
                  <p className="mt-1 max-w-[24ch] text-xs leading-relaxed text-sidebar-foreground/65">{sotto}</p>
                </div>
              ))}
              <div className="md:border-l md:border-white/10 md:pl-10">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-sidebar-foreground/50">
                  Standard di riferimento
                </p>
                <ul className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2">
                  {NORME_VETRINA.map((n) => (
                    <li key={n} className="border-b border-white/8 pb-2 text-[12px] font-medium leading-snug text-sidebar-foreground/90">
                      {n}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* ======================================================= IL PROBLEMA */}
        <section id="problema" className="scroll-mt-20 border-b">
          <div className="mx-auto w-full max-w-6xl px-5 py-24">
            <Reveal>
              <div className="max-w-2xl">
                <p className="flex items-center gap-3 text-[11px] font-semibold uppercase tracking-[0.22em] text-primary">
                  <span className="h-px w-8 bg-primary" aria-hidden />
                  Che cosa ti stanno chiedendo
                </p>
                <h2 className="font-display mt-4 text-[34px] font-bold leading-[1.08] tracking-[-0.02em] md:text-[42px]">
                  Le richieste arrivano tutte. Arrivano adesso. E hanno una scadenza.
                </h2>
                <p className="mt-4 text-[15px] leading-relaxed text-muted-foreground">
                  Clienti, banche, enti di certificazione e autorità chiedono documenti diversi con regole diverse, e
                  spesso li chiedono alla stessa persona. Ecco che cosa c&apos;è in gioco, norma per norma.
                </p>
              </div>
            </Reveal>

            {/* ⚠️ Un elenco a due colonne, non una griglia di schede uguali: è un'anti-reference
                di PRODUCT.md, e qui ogni voce ha un peso diverso e una fonte da leggere. */}
            <ol className="mt-12 grid gap-x-12 md:grid-cols-2" data-problemi>
              {PROBLEMI.map((p, i) => (
                <Reveal key={p.titolo} delay={i * 50}>
                  <li className="grid grid-cols-[40px_1fr] gap-3 border-t py-6">
                    <span className="font-display text-[18px] font-bold text-primary/50" data-slot="kpi">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <div>
                      <h3 className="font-display text-[18px] font-semibold leading-snug tracking-[-0.01em]">{p.titolo}</h3>
                      <p className="mt-2 text-[14px] leading-relaxed text-muted-foreground">{p.testo}</p>
                      <p className="mt-2 font-mono text-[11px] leading-snug text-muted-foreground/80" data-fonte>
                        {p.fonte}
                      </p>
                    </div>
                  </li>
                </Reveal>
              ))}
            </ol>

            <Reveal delay={200}>
              <p className="mt-10 max-w-2xl border-l-2 border-primary pl-5 text-[16px] font-medium leading-relaxed">
                Non serve un consulente per ogni norma. Serve un metodo che sappia che cosa chiede ciascuna, e qualcuno
                che lo segua. Quel qualcuno, di solito, sei tu.
              </p>
            </Reveal>
          </div>
        </section>

        {/* ==================================================== COME FUNZIONA */}
        <section id="come-funziona" className="scroll-mt-20 bg-sidebar text-sidebar-foreground">
          <div className="mx-auto w-full max-w-6xl px-5 py-24">
            <Reveal>
              <div className="max-w-xl">
                <p className="flex items-center gap-3 text-[11px] font-semibold uppercase tracking-[0.22em] text-sidebar-primary">
                  <span className="h-px w-8 bg-sidebar-primary" aria-hidden />
                  Che cosa fa, esattamente
                </p>
                <h2 className="font-display mt-4 text-[34px] font-bold leading-[1.08] tracking-[-0.02em] text-white md:text-[42px]">
                  Tre gesti. Il resto lo fa la piattaforma.
                </h2>
              </div>
            </Reveal>
            <div className="mt-14 grid gap-px overflow-hidden rounded-xl border border-white/10 bg-white/10 md:grid-cols-3">
              <Reveal className="h-full">
                <PassoScuro n="01" titolo="Rispondi alle domande del percorso" testo="Ogni passo dice cosa serve, perché la norma lo chiede e dove trovare il dato in azienda. Dal codice ATECO arrivano le voci tipiche del tuo settore, già proposte. Un'esclusione senza motivazione non passa.">
                  <div className="rounded-lg border border-white/10 bg-white/[0.04] p-3">
                    <div className="flex items-center justify-between text-[10px] text-sidebar-foreground/70">
                      <span>Registro sorgenti</span>
                      <span data-slot="kpi">18/25</span>
                    </div>
                    <div className="mt-1.5 h-1.5 rounded-full bg-white/10">
                      <div className="h-full w-[72%] rounded-full bg-sidebar-primary" />
                    </div>
                    <div className="mt-2.5 flex items-center justify-between rounded-md bg-white/[0.06] px-2.5 py-1.5 text-[10px]">
                      <span>Emissioni di processo</span>
                      <span className="rounded bg-white/15 px-1.5 py-0.5">Non applicabile</span>
                    </div>
                    <p className="mt-1.5 text-[9px] italic text-sidebar-foreground/60">«Nessun processo chimico in stabilimento» · motivata</p>
                  </div>
                </PassoScuro>
              </Reveal>
              <Reveal delay={100} className="h-full">
                <PassoScuro n="02" titolo="I calcoli si fanno da soli" testo={`Quantità per fattore, doppio Scope 2, incertezza combinata, ${NV.derivatiBilancio} indicatori derivati, scadenze di legge. In decimale, mai in virgola mobile: lo stesso numero, ogni volta.`}>
                  <div className="rounded-lg border border-white/10 bg-white/[0.04] p-3">
                    <p className="text-[10px] text-sidebar-foreground/70">Gas naturale · 12.500 Smc × 1,9755</p>
                    <p className="mt-1 text-xl font-semibold tracking-tight text-white" data-slot="kpi">24,694 <span className="text-xs font-normal text-sidebar-foreground/70">tCO₂e</span></p>
                    <div className="mt-2 grid grid-cols-2 gap-1.5 text-[9px] text-sidebar-foreground/70">
                      <span className="rounded bg-white/[0.06] px-2 py-1">Scope 2 location <b className="text-white">25,65</b></span>
                      <span className="rounded bg-white/[0.06] px-2 py-1">market <b className="text-white">27,42</b></span>
                    </div>
                  </div>
                </PassoScuro>
              </Reveal>
              <Reveal delay={200} className="h-full">
                <PassoScuro n="03" titolo="Consegni il documento" testo="Impaginato, con copertina, grafici e indice dei contenuti richiesti. Ogni versione è congelata e porta un codice di verifica pubblico: quello che consegni resta quello, e chiunque può controllarlo.">
                  <div className="rounded-lg border border-white/10 bg-white/[0.04] p-3">
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-14 w-10 flex-col justify-end rounded-sm p-1" style={{ background: "oklch(0.25 0.03 230)" }}>
                        <div className="h-0.5 w-6 bg-white/80" />
                        <div className="mt-0.5 h-0.5 w-4 bg-white/50" />
                      </div>
                      <div className="text-[10px] leading-relaxed text-sidebar-foreground/80">
                        <p className="font-medium text-white">Bilancio 2025 · v1</p>
                        <p>PDF A4 · 18 pagine</p>
                        <p className="text-success">● immutabile</p>
                      </div>
                    </div>
                  </div>
                </PassoScuro>
              </Reveal>
            </div>
          </div>
        </section>

        {/* ==================================================== I PERCORSI */}
        <section id="percorsi" className="scroll-mt-20 border-b">
          <div className="mx-auto w-full max-w-6xl px-5 py-24">
            <Reveal>
              <div className="max-w-2xl">
                <p className="flex items-center gap-3 text-[11px] font-semibold uppercase tracking-[0.22em] text-primary">
                  <span className="h-px w-8 bg-primary" aria-hidden />
                  {QUANTI_PERCORSI} percorsi, un solo archivio
                </p>
                <h2 className="font-display mt-4 text-[34px] font-bold leading-[1.08] tracking-[-0.02em] md:text-[42px]">
                  La tua azienda ha un fascicolo. Dentro, {QUANTI_PERCORSI} percorsi in {AREE_VETRINA.length} gruppi.
                </h2>
                <p className="mt-4 text-[15px] leading-relaxed text-muted-foreground">
                  Apri solo quelli che ti servono. Alcuni si redigono per esercizio e seguono il calendario; altri sono
                  fotografie che si aggiornano per revisioni, quando il cliente, la banca o l&apos;ente di
                  certificazione le chiedono.
                </p>
              </div>
            </Reveal>

            {/* ⚠️ IL BLOCCO E' IL GRUPPO, NON LA SCHEDA: con le righe il numero di percorsi
                per gruppo smette di essere una variabile di disposizione. */}
            <div className="mt-16 space-y-14">
              {AREE_VETRINA.map((area) => (
                <div key={area.nome}>
                  <Reveal delay={40}>
                    <div className="border-b pb-5">
                      <h3 className="font-display flex flex-wrap items-baseline gap-x-3 gap-y-1 text-[15px] font-bold uppercase tracking-[0.16em]">
                        <span className={`h-2 w-8 shrink-0 self-center ${area.tratto}`} aria-hidden />
                        {area.nome}
                        <span className="font-mono text-[11.5px] font-normal normal-case tracking-normal text-muted-foreground" data-slot="kpi">
                          {area.percorsi.length} percorsi
                        </span>
                      </h3>
                      <p className="mt-2 max-w-2xl text-[14px] leading-relaxed text-muted-foreground">
                        {area.perche}
                      </p>
                    </div>
                  </Reveal>
                  <div>
                    {area.percorsi.map((p, i) => {
                      const v = p.modulo ? vetrinaDelModulo(p.modulo) : null;
                      return (
                        <Reveal key={p.titolo} delay={40 + i * 40}>
                          <Percorso
                            titolo={p.titolo}
                            norma={p.norma}
                            passi={p.passi}
                            punto={p.punto}
                            href={v ? `/percorsi/${v.slug}` : null}
                          />
                        </Reveal>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            <Reveal delay={200}>
              <p className="mt-14 flex flex-wrap items-center gap-x-3 gap-y-1 border-t pt-5 text-[13px] text-muted-foreground">
                <span className="inline-flex items-center gap-2 font-semibold text-foreground">
                  <span className="size-2 rounded-full bg-scope-1" aria-hidden />
                  Dall&apos;inventario al bilancio
                  <ArrowRight className="size-3.5" aria-hidden />
                </span>
                le emissioni calcolate nell&apos;inventario entrano nel bilancio senza essere riscritte: una sola fonte,
                mai due versioni dello stesso numero in due documenti.
              </p>
            </Reveal>
          </div>
        </section>

        {/* ================================================ COME LAVORA L'AZIENDA */}
        <section id="azienda" className="scroll-mt-20 border-b bg-muted/30">
          <div className="mx-auto grid w-full max-w-6xl gap-12 px-5 py-24 md:grid-cols-[1fr_1.3fr]">
            <Reveal>
              <div>
                <p className="flex items-center gap-3 text-[11px] font-semibold uppercase tracking-[0.22em] text-primary">
                  <span className="h-px w-8 bg-primary" aria-hidden />
                  In azienda
                </p>
                <h2 className="font-display mt-4 text-[34px] font-bold leading-[1.08] tracking-[-0.02em] md:text-[40px]">
                  Un responsabile, i colleghi, a ciascuno i suoi percorsi.
                </h2>
                <p className="mt-4 max-w-sm text-[15px] leading-relaxed text-muted-foreground">
                  La conformità non la fa una persona sola: l&apos;ufficio ambiente ha i consumi, le risorse umane i
                  dati sul personale, l&apos;IT la sicurezza. Ognuno lavora sulla sua parte, e il documento esce uno.
                </p>
              </div>
            </Reveal>
            <Reveal delay={100}>
              <ul className="divide-y rounded-xl border bg-card">
                {(
                  [
                    [
                      "Inviti i colleghi",
                      `Il piano «${PIANI[PIANO_AZIENDA].nome}» comprende ${PIANI[PIANO_AZIENDA].accessi} accessi. Ciascuno entra col proprio account, e il registro delle attività dice chi ha fatto che cosa.`,
                    ],
                    [
                      "Assegni i percorsi",
                      "L'inventario GHG all'ufficio ambiente, la protezione dei dati al referente privacy, il Modello 231 a chi segue l'organismo di vigilanza: ognuno vede e modifica soltanto i suoi.",
                    ],
                    [
                      "Un dato si scrive una volta",
                      "L'anagrafica dell'azienda passa da sola in ogni percorso, e i consumi passano fra inventario, bilancio energetico e indicatori come valori da confermare. Nessuno ricopia niente.",
                    ],
                    [
                      "Il documento regge la verifica",
                      "Ogni versione pubblicata è congelata e porta un codice che chiunque può controllare sulla pagina pubblica di verifica. Il cliente, la banca o l'auditor vedono che è autentico.",
                    ],
                  ] as [string, string][]
                ).map(([t, d]) => (
                  <li key={t} className="p-5">
                    <h3 className="font-display text-[17px] font-semibold tracking-[-0.01em]">{t}</h3>
                    <p className="mt-1.5 text-[14px] leading-relaxed text-muted-foreground">{d}</p>
                  </li>
                ))}
              </ul>
            </Reveal>
          </div>
        </section>

        {/* ========================================================= IL METODO */}
        <section id="metodo" className="scroll-mt-20 border-b">
          <div className="mx-auto grid w-full max-w-6xl gap-12 px-5 py-24 md:grid-cols-[1fr_1.5fr]">
            <Reveal>
              <div className="md:sticky md:top-24">
                <p className="flex items-center gap-3 text-[11px] font-semibold uppercase tracking-[0.22em] text-primary">
                  <span className="h-px w-8 bg-primary" aria-hidden />
                  Il metodo incorporato
                </p>
                <h2 className="font-display mt-4 text-[34px] font-bold leading-[1.08] tracking-[-0.02em] md:text-[40px]">
                  Non un editor vuoto. Il metodo di un consulente, dentro il software.
                </h2>
                <p className="mt-4 max-w-sm text-[15px] leading-relaxed text-muted-foreground">
                  EvalisDeck nasce da anni di pratiche vere. Ogni schermata sa cosa chiede la norma, e te lo dice prima
                  che lo chieda il verificatore.
                </p>
              </div>
            </Reveal>
            <div>
              {(
                [
                  ["Guide di valutazione per ogni tema", "Per ciascuno dei 18 temi di materialità e dei 20 usi finali dell'energia: cosa guardare, come stimarlo, in quali documenti aziendali trovare l'evidenza."],
                  ["Le voci si trovano da sole", "Dal codice ATECO e dall'anagrafica dell'azienda entrano le voci tipiche dell'inventario GHG, gli usi finali dell'energia, i reati 231, i trattamenti GDPR, gli aspetti ambientali e i pericoli. Ciascuna porta il motivo: la confermi, la correggi o la togli, e nei documenti conta solo ciò che hai confermato."],
                  ["Esclusioni sempre motivate", "Il rilievo più frequente in audit è l'esclusione non giustificata. Qui senza motivazione scritta non si esclude."],
                  ["Scope 2 a doppia rendicontazione", "Location-based e market-based con Garanzie d'Origine e residual mix, come chiede la norma. Non un campo unico."],
                  ["Una sola fonte per le emissioni", "Il bilancio legge i numeri dall'inventario GHG: mai due versioni dello stesso dato in due documenti."],
                  ["Esclusioni motivate anche nella SoA", "I 174 controlli della ISO 27001 con la giustificazione richiesta dal punto 6.1.3 lettera d): senza, la Dichiarazione non è conforme."],
                  ["Verifiche di coerenza, non solo calcoli", "Il sistema confronta quello che hai dichiarato con quello che hai compilato e segnala le contraddizioni prima che lo faccia un auditor."],
                  ["Versioni immutabili", "Ogni pubblicazione è congelata a livello di database. Il documento consegnato tre anni fa è ancora esattamente quello."],
                  ["Porta i lavori esistenti", "Import degli archivi dallo strumento precedente: voci, fattori, materialità e capitoli migrati in un clic."],
                ] as [string, string][]
              ).map(([t, d], i) => (
                <Reveal key={t} delay={i * 60}>
                  <div className="grid grid-cols-[52px_1fr] items-baseline gap-4 border-b py-6 first:pt-0">
                    <span className="font-display text-[22px] font-bold text-primary/45" data-slot="kpi">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <div>
                      <h3 className="font-display text-[19px] font-semibold tracking-[-0.01em]">{t}</h3>
                      <p className="mt-1.5 max-w-xl text-[14px] leading-relaxed text-muted-foreground">{d}</p>
                    </div>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* ===================================================== PER I CONSULENTI */}
        <section id="consulenti" className="scroll-mt-20 border-b">
          <div className="mx-auto w-full max-w-6xl px-5 py-20">
            <Reveal>
              <div className="grid gap-10 md:grid-cols-[1fr_1.3fr] md:items-start">
                <div>
                  <p className="flex items-center gap-3 text-[11px] font-semibold uppercase tracking-[0.22em] text-primary">
                    <span className="h-px w-8 bg-primary" aria-hidden />
                    Per i consulenti
                  </p>
                  <h2 className="font-display mt-4 text-[30px] font-bold leading-[1.1] tracking-[-0.02em] md:text-[36px]">
                    Segui più aziende? Lo stesso metodo, per tutto il portafoglio.
                  </h2>
                  <div className="mt-6 flex flex-wrap gap-3">
                    <Button asChild>
                      <Link href="/prezzi">I piani per i consulenti</Link>
                    </Button>
                  </div>
                </div>
                <ul className="grid gap-x-8 gap-y-5 sm:grid-cols-2">
                  {(
                    [
                      ["Un fascicolo per cliente", "Ogni azienda che segui ha i suoi percorsi, i suoi esercizi e il suo archivio di documenti."],
                      ["Col marchio del tuo studio", "I documenti escono col nome dello studio, non col nostro, in ogni piano."],
                      ["Il cliente consulta da solo", "Un collegamento di consultazione per azienda: scarica i propri documenti senza account."],
                      [
                        `Fino a ${MASSIMO_CONSULENTI} aziende, e oltre`,
                        `Due piani per capienza, i collaboratori dello studio compresi; oltre le ${MASSIMO_CONSULENTI} aziende, ${PIANI.enterprise.nome} con condizioni concordate.`,
                      ],
                    ] as [string, string][]
                  ).map(([t, d]) => (
                    <li key={t}>
                      <h3 className="font-display text-[16px] font-semibold tracking-[-0.01em]">{t}</h3>
                      <p className="mt-1 text-[13.5px] leading-relaxed text-muted-foreground">{d}</p>
                    </li>
                  ))}
                </ul>
              </div>
            </Reveal>
          </div>
        </section>

        {/* ===================================================== COME SI ACQUISTA */}
        {/* ⚠️ I PREZZI RESTANO FUORI dalla home, per scelta: stanno su /prezzi. Ma «niente
            prezzi» non significa «niente informazioni»: qui si dice che cosa si compra, come
            si paga, come si disdice. Tacere il come fa sembrare che non si venda affatto. */}
        <section id="acquisto" className="scroll-mt-20 border-b bg-muted/30">
          <div className="mx-auto grid w-full max-w-6xl gap-12 px-5 py-24 md:grid-cols-[1fr_1.15fr]">
            <Reveal>
              <p className="flex items-center gap-3 text-[11px] font-semibold uppercase tracking-[0.22em] text-primary">
                <span className="h-px w-8 bg-primary" aria-hidden />
                Come si acquista
              </p>
              <h2 className="font-display mt-4 text-[34px] font-bold leading-[1.08] tracking-[-0.02em] md:text-[40px]">
                Un abbonamento, annuale o mensile, tutto incluso.
              </h2>
              <p className="mt-5 max-w-md text-[15px] leading-relaxed text-muted-foreground">
                Non si paga per documento e non per utente. Comprende tutti i percorsi, i documenti che pubblichi senza
                limite di numero, gli accessi per i colleghi, i documenti col tuo marchio e gli aggiornamenti dei
                fattori. Paghi l&apos;anno, che costa meno, oppure il mese, sempre allo stesso prezzo.
              </p>
              <p className="mt-4 max-w-md text-[15px] leading-relaxed text-muted-foreground">
                C&apos;è un piano per l&apos;azienda che fa da sé e ci sono quelli per i consulenti, fino a{" "}
                {MASSIMO_CONSULENTI} aziende.{" "}
                <Link href="/prezzi" className="font-medium text-foreground underline underline-offset-4">
                  Vedi i prezzi
                </Link>
                . La registrazione &egrave; gratuita e non chiede la carta.
              </p>
              <div className="mt-8 flex flex-wrap items-center gap-3">
                <Button size="lg" asChild data-tour="cta-acquisto">
                  <Link href={`/attiva/${PIANO_AZIENDA}`}>
                    Attiva il servizio <ArrowRight className="size-4" />
                  </Link>
                </Button>
                <Button size="lg" variant="ghost" asChild className="text-foreground">
                  <Link href="/prezzi#enterprise">Oltre 30 aziende? Contattaci</Link>
                </Button>
              </div>
            </Reveal>

            <Reveal delay={100}>
              <ul className="space-y-3">
                {(
                  [
                    [
                      "Attivi subito, con carta",
                      "Crei l'account, scegli il piano e paghi con carta. L'account si sblocca in pochi secondi, senza aspettare nessuno.",
                    ],
                    [
                      "Oppure guardi prima, e attivi dopo",
                      "Se preferisci vedere com'è fatto, l'azienda d'esempio è già compilata e i percorsi sono percorribili per intero. Attivi da dentro quando hai deciso, senza rifare niente.",
                    ],
                    [
                      "Ti serve una fattura da pagare a bonifico?",
                      "Per chi ha bisogno dell'ordine d'acquisto o del pagamento differito: scrivici indicando il piano e ti mandiamo il preventivo. All'attivazione pensiamo noi.",
                    ],
                    [
                      "Fattura e partita IVA",
                      "Al pagamento raccogliamo partita IVA e codice destinatario, così la fattura si emette senza doverti rincorrere dopo.",
                    ],
                    [
                      "Quattordici giorni per ripensarci",
                      "Finché non hai pubblicato il primo documento e non sono passati quattordici giorni dal primo pagamento, il rimborso è integrale.",
                    ],
                    [
                      "Si disdice quando vuoi",
                      "Annuale o mensile, il rinnovo è automatico allo stesso prezzo e si disdice dalla pagina dell'abbonamento. I dati restano tuoi e consultabili.",
                    ],
                  ] as [string, string][]
                ).map(([t, d]) => (
                  <li key={t} className="rounded-xl border bg-card p-5">
                    <h3 className="font-display text-[17px] font-semibold tracking-[-0.01em]">{t}</h3>
                    <p className="mt-1.5 text-[14px] leading-relaxed text-muted-foreground">{d}</p>
                  </li>
                ))}
              </ul>
            </Reveal>
          </div>
        </section>

        {/* ================================================ CHI C'È DIETRO */}
        <FasciaEcoVadis />

        {/* ============================================================== FAQ */}
        <section id="faq" className="scroll-mt-20 border-b">
          <div className="mx-auto grid w-full max-w-6xl gap-10 px-5 py-24 md:grid-cols-[1fr_1.4fr]">
            <Reveal>
              <p className="flex items-center gap-3 text-[11px] font-semibold uppercase tracking-[0.22em] text-primary">
                <span className="h-px w-8 bg-primary" aria-hidden />
                Domande frequenti
              </p>
              <h2 className="font-display mt-4 text-[34px] font-bold leading-[1.08] tracking-[-0.02em]">
                Le risposte che chiederesti al telefono.
              </h2>
              <p className="mt-4 text-[15px] text-muted-foreground">
                Per tutto il resto: <a className="font-medium text-primary hover:underline" href="mailto:info@evalisdeck.it">info@evalisdeck.it</a>
              </p>
            </Reveal>
            <Reveal delay={100}>
              <Faq />
            </Reveal>
          </div>
        </section>

        {/* ======================================================== CTA FINALE */}
        <section className="bg-sidebar">
          <div className="mx-auto w-full max-w-6xl px-5 py-24">
            <div className="max-w-2xl">
              <h2 className="font-display text-[36px] font-bold leading-[1.06] tracking-[-0.02em] text-white md:text-[46px]">
                La prossima richiesta arriverà. Falla trovare pronta.
              </h2>
              <p className="mt-4 max-w-xl text-[15px] leading-relaxed text-sidebar-foreground/80">
                Registrati, apri la demo guidata su un&apos;azienda d&apos;esempio già compilata e guarda come lavora.
                Se convince, attivi e porti dentro la tua azienda. Se hai già deciso, attivi subito e salti il giro.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Button size="lg" asChild>
                  <Link href="/registrati">
                    Prova la demo guidata <ArrowRight className="size-4" />
                  </Link>
                </Button>
                <Button size="lg" variant="outline" className="border-white/25 bg-transparent text-white hover:bg-white/10 hover:text-white" asChild>
                  <Link href={`/attiva/${PIANO_AZIENDA}`}>Attiva il servizio</Link>
                </Button>
                <Button size="lg" variant="ghost" className="text-white hover:bg-white/10 hover:text-white" asChild>
                  <a href="/esempi/esempio-rapporto-ghg-2025.pdf" target="_blank" rel="noopener">
                    <FileText className="size-4" /> Rapporto GHG d&apos;esempio
                  </a>
                </Button>
              </div>
            </div>
          </div>
        </section>
      </main>

      <PiedeMarketing />
    </div>
  );
}

// ---------------------------------------------------------------- componenti
function Percorso({
  titolo,
  norma,
  passi,
  punto,
  href,
}: {
  titolo: string;
  norma: string;
  passi: string[];
  punto: string;
  /** La pagina pubblica del percorso, se esiste. */
  href: string | null;
}) {
  return (
    <article className="grid gap-x-10 gap-y-3 border-b py-7 md:grid-cols-[minmax(0,19.5rem)_1fr]">
      <div>
        <h3 className="font-display text-[19px] font-semibold leading-tight tracking-[-0.01em]">
          {href ? (
            <Link href={href} className="underline-offset-4 hover:text-primary hover:underline">
              {titolo}
            </Link>
          ) : (
            titolo
          )}
        </h3>
        <p className="mt-1.5 font-mono text-[11.5px] leading-snug text-muted-foreground">{norma}</p>
        {href && (
          <Link
            href={href}
            className="mt-2 inline-flex items-center gap-1.5 text-[13px] font-medium text-primary underline-offset-4 hover:underline"
          >
            Che cosa fa, in dettaglio <ArrowRight className="size-3.5" aria-hidden />
          </Link>
        )}
      </div>
      <div>
        {/* ⚠️ Ogni passo e' indivisibile, ma FRA un passo e l'altro ci vuole uno spazio VERO:
            senza, `nowrap` salda l'intera traccia e la pagina sfonda da telefono. */}
        <p className="text-[13px] leading-relaxed text-muted-foreground">
          {passi.map((passo, i) => (
            <span key={passo}>
              {i > 0 && (
                <>
                  {" "}
                  <span className="text-border" aria-hidden>
                    ·
                  </span>{" "}
                </>
              )}
              <span className="whitespace-nowrap">{passo}</span>
            </span>
          ))}
        </p>
        <p className="mt-3.5 border-t border-dotted pt-3 text-[14.5px] leading-relaxed text-foreground">{punto}</p>
      </div>
    </article>
  );
}

function PassoScuro({ n, titolo, testo, children }: { n: string; titolo: string; testo: string; children: React.ReactNode }) {
  return (
    <div className="flex h-full flex-col bg-sidebar p-7">
      <p className="font-display text-[40px] font-bold leading-none tracking-tight text-sidebar-primary/50" data-slot="kpi">{n}</p>
      <h3 className="font-display mt-3 text-[20px] font-semibold tracking-[-0.01em] text-white">{titolo}</h3>
      <p className="mt-2 text-[13px] leading-relaxed text-sidebar-foreground/75">{testo}</p>
      {/* Illustrazione, non contenuto: il lettore di schermo la salta. */}
      <div className="mt-auto pt-5" aria-hidden>
        {children}
      </div>
    </div>
  );
}
