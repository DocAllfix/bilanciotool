import type { Metadata } from "next";
import Link from "next/link";
import { SiteHeader } from "@/components/landing/site-header";
import { HeroDeck } from "@/components/landing/hero-deck";
import { Reveal, Contatore } from "@/components/landing/scroll-reveal";
import { Button } from "@/components/ui/button";
import { LogoOrizzontale } from "@/components/brand/logo";
import { ArrowRight, FileText } from "lucide-react";
import { Faq } from "@/components/landing/faq";
import { BadgeEcoVadis, FasciaEcoVadis } from "@/components/landing/ecovadis";
import { ECOVADIS, ecovadisValido } from "@/lib/ecovadis";

export const metadata: Metadata = {
  title: "EvalisDeck · Bilanci di sostenibilità e inventari GHG per PMI",
  description:
    "Dalla raccolta dati al documento firmato: percorsi guidati ISO 14064-1 e GRI/ESRS-VSME per studi di consulenza e PMI. Calcoli automatici, documento impaginato, versioni immutabili.",
};

const NORME = ["ISO 14064-1:2018", "GRI Standards 2021", "ESRS · VSME", "GHG Protocol"];

// Dati strutturati: chi produce lo strumento e con quale riconoscimento.
// Il rating sta su Organization (è di Evalis), non sul software: la stessa
// distinzione che facciamo in pagina, detta ai motori di ricerca.
const DATI_STRUTTURATI = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "Evalis Srl",
  url: "https://evalisdeck.vercel.app",
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
      description:
        "Percorsi guidati ISO 14064-1 e GRI/ESRS-VSME per studi di consulenza e PMI: inventario GHG, bilancio di sostenibilità, diagnosi energetica, autovalutazione fornitori, Dichiarazione di Applicabilità ISO 27001.",
    },
  },
};

export default function LandingPage() {
  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <script
        type="application/ld+json"
        // Contenuto nostro, costante e serializzato: nessun input esterno.
        dangerouslySetInnerHTML={{ __html: JSON.stringify(DATI_STRUTTURATI) }}
      />
      <SiteHeader />
      <main className="flex-1">
        {/* ============================================================ HERO */}
        <section className="relative overflow-hidden border-b">
          <div className="pointer-events-none absolute -top-40 left-[62%] h-[560px] w-[560px] rounded-full bg-primary/8 blur-3xl" aria-hidden />
          <div className="mx-auto grid w-full max-w-6xl items-center gap-14 px-5 py-20 md:grid-cols-[1.1fr_1fr] md:py-28">
            <div>
              <p className="flex items-center gap-3 text-[11px] font-semibold uppercase tracking-[0.22em] text-primary">
                <span className="h-px w-8 bg-primary" aria-hidden />
                Rendicontazione ESG · studi e PMI
              </p>
              <h1 className="font-display mt-5 text-[44px] font-bold leading-[1.02] tracking-[-0.03em] md:text-[64px]">
                Dalla raccolta dati al documento firmato.
              </h1>
              <p className="font-display mt-3 text-[22px] font-semibold tracking-[-0.01em] text-primary md:text-[26px]">
                Un solo strumento.
              </p>
              <p className="mt-6 max-w-md text-[15px] leading-relaxed text-muted-foreground">
                EvalisDeck guida lo studio dall&apos;inventario GHG ISO 14064-1 al bilancio di sostenibilità GRI/VSME:
                percorso passo per passo, calcoli che si fanno da soli, un documento che regge la verifica.
              </p>
              <div className="mt-8 flex flex-wrap items-center gap-3">
                <Button size="lg" asChild data-tour="cta-demo">
                  <Link href="/registrati">
                    Prova la demo guidata <ArrowRight className="size-4" />
                  </Link>
                </Button>
                <Button size="lg" variant="ghost" asChild className="text-foreground">
                  <a href="/esempi/esempio-bilancio-2025.pdf" target="_blank" rel="noopener">
                    <FileText className="size-4" /> Guarda un bilancio d&apos;esempio
                  </a>
                </Button>
              </div>
              <p className="mt-5 text-xs text-muted-foreground">
                Un&apos;azienda d&apos;esempio già compilata ti aspetta. Nessuna carta richiesta.
              </p>
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
                  [25, "", "sorgenti ISO 14064", "valutate una per una nel registro guidato"],
                  [18, "", "temi GRI / ESRS", "ognuno con la sua guida alla valutazione"],
                  [49, "", "indicatori", "30 dei quali calcolati in automatico"],
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

        {/* ======================================================= I PERCORSI */}
        <section id="percorsi" className="scroll-mt-20 border-b">
          <div className="mx-auto w-full max-w-6xl px-5 py-24">
            <Reveal>
              <div className="max-w-2xl">
                <p className="flex items-center gap-3 text-[11px] font-semibold uppercase tracking-[0.22em] text-primary">
                  <span className="h-px w-8 bg-primary" aria-hidden />
                  Due percorsi, una sola verità
                </p>
                <h2 className="font-display mt-4 text-[34px] font-bold leading-[1.08] tracking-[-0.02em] md:text-[42px]">
                  L&apos;inventario alimenta il bilancio. Nessun numero copiato due volte.
                </h2>
              </div>
            </Reveal>
            <div className="mt-14 grid gap-10 md:grid-cols-2 md:gap-16">
              <Reveal>
                <Percorso
                  indice="A"
                  titolo="Inventario GHG"
                  norma="ISO 14064-1:2018"
                  passi={["Confini e perimetro", "Registro delle 25 sorgenti", "Dati di attività", "Fattori e fonti", "Risultati e incertezza", "Anno base e obiettivi", "Verifica", "Rapporto §9.3.1"]}
                  punto="Doppia rendicontazione Scope 2, CO₂ biogenica separata, incertezza in quadratura: ciò che l'ente di verifica chiede, già al posto giusto."
                />
              </Reveal>
              <Reveal delay={120}>
                <Percorso
                  indice="B"
                  titolo="Bilancio di sostenibilità"
                  norma="GRI 2021 · ESRS VSME"
                  passi={["Organizzazione", "Doppia materialità guidata", "49 indicatori su due anni", "Politiche e obiettivi", "Racconto e fotografie", "Verifica delle lacune", "Documento impaginato"]}
                  punto="La sezione emissioni legge direttamente dall'inventario GHG della stessa azienda: una modifica lì, aggiornata qui."
                />
              </Reveal>
            </div>
            {/* Il legame fra i due percorsi: una riga di testo sotto le colonne,
                senza pastiglie sovrapposte al contenuto. */}
            <Reveal delay={200}>
              <p className="mt-10 flex flex-wrap items-center gap-x-3 gap-y-1 border-t pt-5 text-[13px] text-muted-foreground">
                <span className="inline-flex items-center gap-2 font-semibold text-foreground">
                  <span className="size-2 rounded-full bg-scope-1" aria-hidden />
                  Dal percorso A al percorso B
                  <ArrowRight className="size-3.5" aria-hidden />
                </span>
                le emissioni calcolate nell&apos;inventario entrano nel bilancio senza essere riscritte.
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
                  ["Guide di valutazione per ogni tema", "Per ciascuno dei 18 temi: cosa guardare, quando alzare il punteggio, in quali documenti aziendali trovare l'evidenza."],
                  ["Esclusioni sempre motivate", "Il rilievo più frequente in audit è l'esclusione non giustificata. Qui senza motivazione scritta non si esclude."],
                  ["Scope 2 a doppia rendicontazione", "Location-based e market-based con Garanzie d'Origine e residual mix, come chiede la norma. Non un campo unico."],
                  ["Una sola fonte per le emissioni", "Il bilancio legge i numeri dall'inventario GHG: mai due versioni dello stesso dato in due documenti."],
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
                Il prossimo bilancio parte da un&apos;azienda d&apos;esempio già compilata.
              </h2>
              <p className="mt-4 max-w-xl text-[15px] leading-relaxed text-sidebar-foreground/80">
                Registrati, apri la demo guidata, guarda come lavora. Se convince, sblocchi e porti dentro i tuoi clienti.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Button size="lg" asChild>
                  <Link href="/registrati">
                    Prova la demo guidata <ArrowRight className="size-4" />
                  </Link>
                </Button>
                <Button size="lg" variant="outline" className="border-white/25 bg-transparent text-white hover:bg-white/10 hover:text-white" asChild>
                  <a href="/esempi/esempio-rapporto-ghg-2025.pdf" target="_blank" rel="noopener">
                    <FileText className="size-4" /> Rapporto GHG d&apos;esempio
                  </a>
                </Button>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* =========================================================== FOOTER */}
      <footer className="border-t bg-background">
        <div className="mx-auto grid w-full max-w-6xl gap-8 px-5 py-12 sm:grid-cols-2 md:grid-cols-4">
          <div>
            <LogoOrizzontale className="h-10" />
            <p className="mt-2 max-w-[28ch] text-xs leading-relaxed text-muted-foreground">
              Bilanci di sostenibilità e inventari GHG per le PMI, con il metodo incorporato.
            </p>
            {/* 68 px: sotto questa misura "Sustainability Rating" e la data non si leggono più. */}
            <BadgeEcoVadis dimensione={68} className="mt-5" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Prodotto</p>
            <ul className="mt-3 space-y-2 text-sm">
              <li><a href="#percorsi" className="text-muted-foreground transition-colors hover:text-foreground">I due percorsi</a></li>
              <li><a href="#metodo" className="text-muted-foreground transition-colors hover:text-foreground">Il metodo</a></li>
              <li><a href="/esempi/esempio-bilancio-2025.pdf" target="_blank" rel="noopener" className="text-muted-foreground transition-colors hover:text-foreground">Bilancio d&apos;esempio</a></li>
            </ul>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Piattaforma</p>
            <ul className="mt-3 space-y-2 text-sm">
              <li><Link href="/login" className="text-muted-foreground transition-colors hover:text-foreground">Accedi</Link></li>
              <li><Link href="/registrati" className="text-muted-foreground transition-colors hover:text-foreground">Prova la demo</Link></li>
            </ul>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Legale</p>
            <ul className="mt-3 space-y-2 text-sm">
              <li><Link href="/privacy" className="text-muted-foreground transition-colors hover:text-foreground">Privacy</Link></li>
              <li><Link href="/termini" className="text-muted-foreground transition-colors hover:text-foreground">Termini e condizioni</Link></li>
              <li><Link href="/cookie" className="text-muted-foreground transition-colors hover:text-foreground">Cookie</Link></li>
            </ul>
          </div>
        </div>
        <div className="border-t">
          <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-2 px-5 py-4 text-xs text-muted-foreground">
            <span>© {new Date().getFullYear()} EvalisDeck · Un prodotto della famiglia Evalis</span>
            <span>Dati ospitati nell&apos;Unione Europea</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

// ---------------------------------------------------------------- componenti
function Percorso({ indice, titolo, norma, passi, punto }: { indice: string; titolo: string; norma: string; passi: string[]; punto: string }) {
  return (
    <div className="flex h-full flex-col border-t-2 border-foreground pt-6">
      <div className="flex items-baseline justify-between gap-3">
        <p className="font-display text-[13px] font-bold uppercase tracking-[0.18em] text-primary">Percorso {indice}</p>
        <span className="font-mono text-[10px] text-muted-foreground">{norma}</span>
      </div>
      <h3 className="font-display mt-2 text-[26px] font-bold tracking-[-0.01em]">{titolo}</h3>
      <ol className="mt-6 grid grid-cols-1 gap-y-1.5">
        {passi.map((p, i) => (
          <li key={p} className="flex items-baseline gap-3 text-[13.5px]">
            <span className="w-5 shrink-0 text-right font-mono text-[11px] text-muted-foreground" data-slot="kpi">{i + 1}</span>
            {p}
          </li>
        ))}
      </ol>
      <p className="mt-6 border-t pt-4 text-[13px] leading-relaxed text-muted-foreground">{punto}</p>
    </div>
  );
}

function PassoScuro({ n, titolo, testo, children }: { n: string; titolo: string; testo: string; children: React.ReactNode }) {
  return (
    <div className="flex h-full flex-col bg-sidebar p-7">
      <p className="font-display text-[40px] font-bold leading-none tracking-tight text-sidebar-primary/50" data-slot="kpi">{n}</p>
      <h3 className="font-display mt-3 text-[20px] font-semibold tracking-[-0.01em] text-white">{titolo}</h3>
      <p className="mt-2 text-[13px] leading-relaxed text-sidebar-foreground/75">{testo}</p>
      <div className="mt-auto pt-5">{children}</div>
    </div>
  );
}
