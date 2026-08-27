import type { Metadata } from "next";
import Link from "next/link";
import { AREE_VETRINA, QUANTI_PERCORSI } from "@/components/landing/percorsi-vetrina";

/** Tutti i percorsi in fila, per i testi che li elencano. */
const TUTTI_I_PERCORSI = AREE_VETRINA.flatMap((a) => a.percorsi);

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

export const metadata: Metadata = {
  // `absolute` perché il layout radice accoda «· EvalisDeck» a ogni titolo, e qui il
  // marchio sta già in testa: senza, la home usciva «EvalisDeck · … · EvalisDeck». È il
  // titolo che Google mostra per il nome del prodotto, quindi il marchio ripetuto si
  // mangiava i sessanta caratteri utili proprio nel posto che conta di più.
  title: {
    absolute: "EvalisDeck · I documenti di conformità, un solo strumento",
  },
  description:
    "Inventario GHG ISO 14064-1, bilancio di sostenibilità e conformità ESG, bilancio energetico UNI CEI EN 16247, autovalutazione ESG dei fornitori e Statement of Applicability ISO 27001. Percorsi guidati per studi di consulenza e PMI, con calcoli automatici e versioni immutabili.",
};

const NORME = [
  "ISO 14064-1:2018",
  "GRI 2021 · ESRS VSME",
  "UNI CEI EN 16247",
  "ISO 50001",
  "ISO/IEC 27001:2022",
  "ISO 20400",
];

// Dati strutturati: chi produce lo strumento e con quale riconoscimento.
// Il rating sta su Organization (è di Evalis), non sul software: la stessa
// distinzione che facciamo in pagina, detta ai motori di ricerca.
const DATI_STRUTTURATI = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "Evalis Srl",
  // Il dominio vero: l'indirizzo di Vercel era rimasto dal primo rilascio, e ai motori
  // di ricerca diceva che l'organizzazione sta da un'altra parte.
  url: "https://evalisdeck.it",
  ...(ecovadisValido()
    ? {
        award: `Medaglia EcoVadis ${ECOVADIS.medaglia} (${ECOVADIS.punteggio}/100, ${ECOVADIS.percentile}° percentile), ${ECOVADIS.mese}`,
        hasCredential: {
          "@type": "EducationalOccupationalCredential",
          name: `Valutazione di sostenibilità EcoVadis — medaglia ${ECOVADIS.medaglia}`,
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
      // ⚠️ L'elenco si DERIVA dal registro. Scritto a mano ne nominava cinque su dodici,
      // e a leggerlo sembrava il catalogo completo: e' la forma peggiore di dato stantio,
      // perche' non e' falso in nulla di cio' che dice — e' falso in cio' che tace.
      description: `Percorsi guidati per studi di consulenza e PMI: ${TUTTI_I_PERCORSI.map((p) => p.titolo).join(", ")}.`,
    },
  },
};

// Le domande frequenti dette anche ai motori di ricerca, con le STESSE risposte che
// stanno in pagina: si leggono dallo stesso elenco, non si ricopiano. Due copie
// divergono alla prima correzione, e quella che diverge e' sempre quella che nessuno
// rilegge — mentre e' proprio quella che finisce nei risultati.
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
                Rendicontazione · studi e PMI
              </p>
              <h1 className="font-display mt-5 text-[36px] font-bold leading-[1.05] tracking-[-0.03em] sm:text-[44px] md:text-[64px]">
                Dalla raccolta dati al documento firmato.
              </h1>
              <p className="font-display mt-3 text-[20px] font-semibold tracking-[-0.01em] text-primary sm:text-[22px] md:text-[26px]">
                Un solo strumento.
              </p>
              <p className="mt-6 max-w-md text-[15px] leading-relaxed text-muted-foreground">
                Percorsi guidati, dall&apos;inventario GHG al Modello 231: ogni passo sa
                cosa chiede la norma, i calcoli si fanno da soli, e quello che ne esce è un documento impaginato che
                regge la verifica.
              </p>
              <div className="mt-8 flex flex-wrap items-center gap-3">
                <Button size="lg" asChild data-tour="cta-demo">
                  <Link href="/registrati">
                    Prova la demo guidata <ArrowRight className="size-4" />
                  </Link>
                </Button>
                {/* Il secondo pulsante e' «Attiva», non l'esempio in PDF: chi ha gia'
                    deciso deve trovare un COMANDO, non una riga di testo sottolineata
                    sotto ai bottoni. L'esempio resta, come collegamento. */}
                <Button size="lg" variant="outline" asChild>
                  <Link href="/attiva">Attiva il servizio</Link>
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
              {/* Chi ha gia' deciso non deve passare per la demo: la seconda frase
                  gli apre una porta, senza rubare il primo piano a chi vuole guardare. */}
              <p className="mt-3 text-xs text-muted-foreground">
                Un&apos;azienda d&apos;esempio già compilata ti aspetta. Nessuna carta richiesta.{" "}
                <Link href="/#acquisto" className="underline underline-offset-2 hover:text-foreground">
                  Come si acquista
                </Link>
              </p>
              {/* La medaglia sopra la piega, richiesta del committente. Sta qui e
                  non in una striscia in cima perché non deve spingere giù il
                  titolo né rubare il colpo d'occhio al Deck: è una prova di
                  serietà accanto alla promessa, non un'insegna. */}
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
                  [5, "", "documenti pubblicabili", "dall'inventario GHG allo Statement of Applicability"],
                  [174, "", "controlli ISO 27001", "61 dei quali cardine, con verifiche di coerenza"],
                  [49, "", "indicatori di bilancio", "30 dei quali calcolati in automatico"],
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
                <ul className="mt-4 space-y-2.5">
                  {NORME.map((n) => (
                    <li key={n} className="border-b border-white/8 pb-2.5 text-[13px] font-medium tracking-wide text-sidebar-foreground/90">
                      {n}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* ==================================================== I CINQUE DOCUMENTI */}
        <section id="percorsi" className="scroll-mt-20 border-b">
          <div className="mx-auto w-full max-w-6xl px-5 py-24">
            <Reveal>
              <div className="max-w-2xl">
                <p className="flex items-center gap-3 text-[11px] font-semibold uppercase tracking-[0.22em] text-primary">
                  <span className="h-px w-8 bg-primary" aria-hidden />
                  {QUANTI_PERCORSI} percorsi, un solo archivio
                </p>
                <h2 className="font-display mt-4 text-[34px] font-bold leading-[1.08] tracking-[-0.02em] md:text-[42px]">
                  Ogni azienda del portafoglio ha il suo fascicolo. Dentro, {QUANTI_PERCORSI} percorsi in{" "}
                  {AREE_VETRINA.length} gruppi.
                </h2>
                <p className="mt-4 text-[15px] leading-relaxed text-muted-foreground">
                  Alcuni si redigono per esercizio e seguono il calendario. Altri sono fotografie che si aggiornano
                  per revisioni, quando il committente, la banca o l&apos;ente di certificazione le chiedono.
                </p>
              </div>
            </Reveal>

            {/* ⚠️ IL BLOCCO E' IL GRUPPO, NON LA SCHEDA.
                Prima erano schede in `md:grid-cols-2` dentro ciascun gruppo: con 4/4/3
                percorsi facevano 2+2, 2+2, 2+1 — una scheda orfana — e col dodicesimo ne
                sarebbero diventate due. E' la storia della card del portafoglio, dove a
                ogni modulo nuovo si cambiava il numero di colonne rimandando il problema
                al modulo dopo. Con le righe il numero di percorsi per gruppo smette di
                essere una variabile di disposizione: 4+4+3 oggi, 5+4+3 domani, uguale. */}
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
                    {area.percorsi.map((p, i) => (
                      <Reveal key={p.titolo} delay={40 + i * 40}>
                        <Percorso titolo={p.titolo} norma={p.norma} passi={p.passi} punto={p.punto} />
                      </Reveal>
                    ))}
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

        {/* ==================================================== COME FUNZIONA */}
        <section className="bg-sidebar text-sidebar-foreground">
          <div className="mx-auto w-full max-w-6xl px-5 py-24">
            <Reveal>
              <div className="max-w-xl">
                <p className="flex items-center gap-3 text-[11px] font-semibold uppercase tracking-[0.22em] text-sidebar-primary">
                  <span className="h-px w-8 bg-sidebar-primary" aria-hidden />
                  Come funziona
                </p>
                <h2 className="font-display mt-4 text-[34px] font-bold leading-[1.08] tracking-[-0.02em] text-white md:text-[42px]">
                  Tre gesti. Il resto è mestiere della piattaforma.
                </h2>
              </div>
            </Reveal>
            <div className="mt-14 grid gap-px overflow-hidden rounded-xl border border-white/10 bg-white/10 md:grid-cols-3">
              <Reveal className="h-full">
                <PassoScuro n="01" titolo="Compili il percorso" testo="Ogni passo spiega cosa serve, perché la norma lo chiede e dove trovare il dato. Un'esclusione senza motivazione non passa.">
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
                <PassoScuro n="02" titolo="I calcoli si fanno da soli" testo="Quantità per fattore, doppio Scope 2, incertezza combinata, 30 indicatori derivati. In decimale, mai in virgola mobile.">
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
                <PassoScuro n="03" titolo="Pubblichi il deck" testo="Documento impaginato con copertina, grafici vettoriali e indice GRI/ESRS. Ogni versione è congelata: quello che consegni resta quello.">
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
                  Non un editor vuoto. Un consulente impacchettato in software.
                </h2>
                <p className="mt-4 max-w-sm text-[15px] leading-relaxed text-muted-foreground">
                  EvalisDeck nasce da anni di pratiche vere. Ogni schermata sa cosa chiede la norma, e te lo dice prima che lo chieda il verificatore.
                </p>
              </div>
            </Reveal>
            <div>
              {(
                [
                  ["Guide di valutazione per ogni tema", "Per ciascuno dei 18 temi di materialità e dei 20 usi finali dell'energia: cosa guardare, come stimarlo, in quali documenti aziendali trovare l'evidenza."],
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

        {/* ===================================================== COME SI ACQUISTA */}
        {/*
          Nata da una domanda vera di un potenziale cliente: «se voglio acquistare il
          servizio direttamente senza demo non e' previsto? Non vedo le modalita' di
          acquisto». Aveva ragione: ogni richiamo della pagina diceva «prova la demo», e
          chi aveva gia' deciso non trovava una strada.

          I PREZZI RESTANO FUORI, decisione del committente. Ma «niente prezzi» non
          significa «niente informazioni»: qui si dice che cosa si compra, come si paga e
          perche' gli importi si vedono solo entrando. Tacere il come, oltre al quanto, fa
          sembrare che non si venda affatto.
        */}
        <section id="acquisto" className="scroll-mt-20 border-b bg-muted/30">
          <div className="mx-auto grid w-full max-w-6xl gap-12 px-5 py-24 md:grid-cols-[1fr_1.15fr]">
            <Reveal>
              <p className="flex items-center gap-3 text-[11px] font-semibold uppercase tracking-[0.22em] text-primary">
                <span className="h-px w-8 bg-primary" aria-hidden />
                Come si acquista
              </p>
              <h2 className="font-display mt-4 text-[34px] font-bold leading-[1.08] tracking-[-0.02em] md:text-[40px]">
                Un abbonamento solo, annuale, tutto incluso.
              </h2>
              <p className="mt-5 max-w-md text-[15px] leading-relaxed text-muted-foreground">
                Si sottoscrive per studio, non per documento e non per utente. Comprende tutti i percorsi, i
                documenti che pubblichi senza limite di numero, gli accessi delle persone che lavorano con te, i
                documenti col marchio del tuo studio e gli aggiornamenti dei fattori.
              </p>
              <p className="mt-4 max-w-md text-[15px] leading-relaxed text-muted-foreground">
                {/* ⚠️ Qui c'era: «Gli importi si vedono appena entri, nella pagina Abbonamento:
                    dipendono da quante aziende segui e da quante persone accedono.»
                    Due difetti in una frase. Metteva un PEDAGGIO davanti a una domanda
                    legittima — per sapere quanto costa bisognava registrarsi — e da quando
                    gli accessi sono inclusi la seconda meta' sarebbe anche diventata falsa.
                    Nessuna cifra sulla home per scelta: il numero da solo ancora la lettura
                    sul costo prima che si sia capito cosa si compra, e il contesto che lo
                    rende leggibile (il ritorno) sta sulla pagina prezzi. */}
                L&apos;unica cosa che scegli &egrave; la capienza: quante aziende gestisci in portafoglio.{" "}
                <Link href="/prezzi" className="font-medium text-foreground underline underline-offset-4">
                  Vedi le fasce
                </Link>
                . La registrazione &egrave; gratuita e non chiede la carta.
              </p>
              <div className="mt-8 flex flex-wrap items-center gap-3">
                <Button size="lg" asChild data-tour="cta-acquisto">
                  <Link href="/attiva">
                    Attiva il servizio <ArrowRight className="size-4" />
                  </Link>
                </Button>
                <Button size="lg" variant="ghost" asChild className="text-foreground">
                  <a href="mailto:info@evalisdeck.it?subject=Preventivo%20EvalisDeck">Chiedi un preventivo</a>
                </Button>
              </div>
            </Reveal>

            <Reveal delay={100}>
              <ul className="space-y-3">
                {(
                  [
                    [
                      "Attivi subito, con carta",
                      "Crei l'account, scegli il piano e paghi con carta, Satispay, Klarna o Amazon Pay. Lo studio si sblocca in pochi secondi, senza aspettare nessuno.",
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
                      "Fattura elettronica e partita IVA",
                      "Al pagamento raccogliamo partita IVA e codice destinatario, così la fattura parte senza doverti rincorrere dopo.",
                    ],
                    [
                      "Quattordici giorni per ripensarci",
                      "Finché non hai pubblicato il primo documento e non sono passati quattordici giorni dall'attivazione, il rimborso è integrale.",
                    ],
                    [
                      "Il rinnovo è annuale e si disdice",
                      "Dal secondo anno l'abbonamento si rinnova da solo a un prezzo ridotto. Si disdice fino al giorno prima della scadenza, e i dati restano tuoi e consultabili.",
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

        {/* ================================================ CHI C'È DIETRO */}
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
Il prossimo documento parte da un&apos;azienda d&apos;esempio già compilata.
              </h2>
              <p className="mt-4 max-w-xl text-[15px] leading-relaxed text-sidebar-foreground/80">
                Registrati, apri la demo guidata, guarda come lavora. Se convince, sblocchi e porti dentro i tuoi
                clienti. Se hai già deciso, attivi subito e salti il giro.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Button size="lg" asChild>
                  <Link href="/registrati">
                    Prova la demo guidata <ArrowRight className="size-4" />
                  </Link>
                </Button>
                <Button size="lg" variant="outline" className="border-white/25 bg-transparent text-white hover:bg-white/10 hover:text-white" asChild>
                  <Link href="/attiva">Attiva il servizio</Link>
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
function Percorso({ titolo, norma, passi, punto }: { titolo: string; norma: string; passi: string[]; punto: string }) {
  return (
    <article className="grid gap-x-10 gap-y-3 border-b py-7 md:grid-cols-[minmax(0,19.5rem)_1fr]">
      <div>
        <h3 className="font-display text-[19px] font-semibold leading-tight tracking-[-0.01em]">{titolo}</h3>
        <p className="mt-1.5 font-mono text-[11.5px] leading-snug text-muted-foreground">{norma}</p>
      </div>
      <div>
        {/* La TRACCIA dei passi, in linea e non in colonna.
            Gli otto passi sono la prova migliore che il metodo c'e', e restano tutti: ma
            dodici percorsi per otto righe erano ottantasei righe di elenco, cioe' uno
            scorrimento interminabile proprio nella sezione che deve convincere. Letti in
            orizzontale sono un percorso, che e' esattamente cio' che sono. */}
        <p className="text-[13px] leading-relaxed text-muted-foreground">
          {/* ⚠️ Ogni passo e' indivisibile, ma FRA un passo e l'altro ci vuole uno spazio VERO.
              Senza, il browser legge gli otto passi come un'unica sequenza che non puo'
              andare a capo: su un telefono da 360px la riga diventava larga 909 e la
              pagina sfondava di 795. Con `whitespace-nowrap` su ciascuno e nessuno spazio
              in mezzo, `nowrap` non protegge il passo — salda l'intera traccia.
              E senza `nowrap` del tutto si va a capo DENTRO il nome: «Dati / di attivita'»,
              e il punto separatore smette di dire dove finisce un passo. */}
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
      {/* Illustrazione, non contenuto: il lettore di schermo la salta e il
          testo minuscolo qui dentro e una scelta di disegno. */}
      <div className="mt-auto pt-5" aria-hidden>
        {children}
      </div>
    </div>
  );
}
