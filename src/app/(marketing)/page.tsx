import type { Metadata } from "next";
import Link from "next/link";
import { SiteHeader } from "@/components/landing/site-header";
import { HeroDeck } from "@/components/landing/hero-deck";
import { Reveal, Contatore } from "@/components/landing/scroll-reveal";
import { Button } from "@/components/ui/button";
import { ArrowRight, Check, FileText } from "lucide-react";
import { Faq } from "@/components/landing/faq";

export const metadata: Metadata = {
  title: "EvalisDeck · Bilanci di sostenibilità e inventari GHG per PMI",
  description:
    "Dalla raccolta dati al documento firmato: percorsi guidati ISO 14064-1 e GRI/ESRS-VSME per studi di consulenza e PMI. Calcoli automatici, documento impaginato, versioni immutabili.",
};

// Prezzi di lancio: valori in un punto solo, da confermare col committente.
const PREZZI = { primoAnno: 450, rinnovo: 150 };

const NORME = ["ISO 14064-1:2018", "GRI Standards 2021", "ESRS · VSME", "GHG Protocol", "Doppia rilevanza"];

export default function LandingPage() {
  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <SiteHeader />
      <main className="flex-1">
        {/* ============================================================ HERO */}
        <section className="relative overflow-hidden">
          <div className="pointer-events-none absolute -top-32 left-1/2 h-[480px] w-[900px] -translate-x-1/2 rounded-full bg-primary/6 blur-3xl" aria-hidden />
          <div className="mx-auto grid w-full max-w-6xl items-center gap-12 px-5 py-16 md:grid-cols-2 md:py-24">
            <div>
              <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-primary">
                Rendicontazione ESG per studi e PMI
              </p>
              <h1 className="mt-3 text-4xl font-semibold leading-[1.08] tracking-tight md:text-[52px]">
                Dalla raccolta dati al documento firmato.
                <span className="text-primary"> Un solo strumento.</span>
              </h1>
              <p className="mt-5 max-w-lg text-[15px] leading-relaxed text-muted-foreground">
                EvalisDeck guida lo studio dall&apos;inventario GHG ISO 14064-1 al bilancio di sostenibilità GRI/VSME:
                percorso passo per passo, calcoli che si fanno da soli, un documento impaginato che regge la verifica.
              </p>
              <div className="mt-7 flex flex-wrap items-center gap-3">
                <Button size="lg" asChild data-tour="cta-demo">
                  <Link href="/registrati">
                    Prova la demo guidata <ArrowRight className="size-4" />
                  </Link>
                </Button>
                <Button size="lg" variant="outline" asChild>
                  <a href="/esempi/esempio-bilancio-2025.pdf" target="_blank" rel="noopener">
                    <FileText className="size-4" /> Guarda un bilancio d&apos;esempio
                  </a>
                </Button>
              </div>
              <p className="mt-4 text-xs text-muted-foreground">
                Registrazione in un minuto · azienda d&apos;esempio già compilata · nessuna carta richiesta per provare
              </p>
            </div>
            <HeroDeck />
          </div>
        </section>

        {/* ============================================= BANDA NUMERI + NORME */}
        <section className="bg-sidebar text-sidebar-foreground">
          <div className="mx-auto grid w-full max-w-6xl grid-cols-2 gap-8 px-5 py-12 text-center md:grid-cols-4">
            {(
              [
                [25, "sorgenti ISO 14064 nel registro guidato"],
                [18, "temi GRI/ESRS con guida alla valutazione"],
                [49, "indicatori, 30 calcolati in automatico"],
                [100, "calcoli tracciabili fino al dato di origine", "%"],
              ] as [number, string, string?][]
            ).map(([n, testo, suff]) => (
              <div key={testo}>
                <p className="text-4xl font-semibold tracking-tight text-sidebar-primary">
                  <Contatore fino={n} suffisso={suff ?? ""} />
                </p>
                <p className="mx-auto mt-1.5 max-w-[22ch] text-xs leading-relaxed text-sidebar-foreground/75">{testo}</p>
              </div>
            ))}
          </div>
          <div className="border-t border-white/8">
            <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-center gap-x-8 gap-y-2 px-5 py-4">
              <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-sidebar-foreground/50">Standard di riferimento</span>
              {NORME.map((n) => (
                <span key={n} className="text-[11px] font-medium tracking-wide text-sidebar-primary/90">{n}</span>
              ))}
            </div>
          </div>
        </section>

        {/* ======================================================= I PERCORSI */}
        <section id="percorsi" className="mx-auto w-full max-w-6xl scroll-mt-20 px-5 py-20">
          <Reveal>
            <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-primary">Due percorsi, una sola verità</p>
            <h2 className="mt-2 max-w-2xl text-3xl font-semibold tracking-tight">
              L&apos;inventario alimenta il bilancio. Niente numeri copiati due volte.
            </h2>
          </Reveal>
          <div className="mt-10 grid gap-5 md:grid-cols-2">
            <Reveal>
              <PercorsoCard
                titolo="Inventario GHG"
                norma="ISO 14064-1:2018"
                passi={["Confini e perimetro", "Registro delle 25 sorgenti", "Dati di attività", "Fattori e fonti", "Risultati e incertezza", "Anno base e obiettivi", "Verifica", "Rapporto §9.3.1"]}
                punto="Doppia rendicontazione Scope 2, CO₂ biogenica separata, incertezza in quadratura: quello che l'ente di verifica chiede, già al posto giusto."
              />
            </Reveal>
            <Reveal delay={120}>
              <PercorsoCard
                titolo="Bilancio di sostenibilità"
                norma="GRI 2021 · ESRS VSME"
                passi={["Organizzazione", "Doppia materialità guidata", "49 indicatori su due anni", "Politiche e obiettivi", "Racconto e fotografie", "Verifica delle lacune", "Documento impaginato"]}
                punto="La sezione emissioni legge direttamente dall'inventario GHG della stessa azienda: una modifica lì, aggiornata qui."
              />
            </Reveal>
          </div>
        </section>

        {/* ==================================================== COME FUNZIONA */}
        <section className="bg-sidebar text-sidebar-foreground">
          <div className="mx-auto w-full max-w-6xl px-5 py-20">
            <Reveal>
              <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-sidebar-primary">Come funziona</p>
              <h2 className="mt-2 max-w-xl text-3xl font-semibold tracking-tight text-white">
                Tre gesti. Il resto è mestiere della piattaforma.
              </h2>
            </Reveal>
            <div className="mt-10 grid gap-5 md:grid-cols-3">
              {/* 01 — percorso guidato */}
              <Reveal>
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
                    <p className="mt-1.5 text-[9px] italic text-sidebar-foreground/60">«Nessun processo chimico in stabilimento» ✓ motivata</p>
                  </div>
                </PassoScuro>
              </Reveal>
              {/* 02 — calcoli automatici */}
              <Reveal delay={100}>
                <PassoScuro n="02" titolo="I calcoli si fanno da soli" testo="Quantità × fattore, doppio Scope 2, incertezza combinata, 30 indicatori derivati. In decimale, mai in virgola mobile.">
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
              {/* 03 — pubblicazione */}
              <Reveal delay={200}>
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
        <section id="metodo" className="mx-auto w-full max-w-6xl scroll-mt-20 px-5 py-20">
          <Reveal>
            <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-primary">Il metodo incorporato</p>
            <h2 className="mt-2 max-w-2xl text-3xl font-semibold tracking-tight">
              Non un editor vuoto: un consulente impacchettato in software.
            </h2>
            <p className="mt-3 max-w-2xl text-[15px] text-muted-foreground">
              I prototipi di EvalisDeck nascono da anni di pratiche vere. Ogni schermata sa cosa chiede la norma, e te lo dice prima che lo chieda il verificatore.
            </p>
          </Reveal>
          <div className="mt-10 grid gap-x-10 gap-y-7 sm:grid-cols-2 lg:grid-cols-3">
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
              <Reveal key={t} delay={(i % 3) * 80}>
                <div className="flex gap-3">
                  <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-accent text-accent-foreground">
                    <Check className="size-3" strokeWidth={3} />
                  </span>
                  <div>
                    <h3 className="text-[15px] font-semibold tracking-tight">{t}</h3>
                    <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">{d}</p>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </section>

        {/* ========================================================== PREZZI */}
        <section id="prezzi" className="scroll-mt-20 border-y bg-muted/40">
          <div className="mx-auto grid w-full max-w-6xl items-center gap-10 px-5 py-20 md:grid-cols-2">
            <Reveal>
              <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-primary">Prezzo</p>
              <h2 className="mt-2 text-3xl font-semibold tracking-tight">Un prezzo. Tutto dentro.</h2>
              <p className="mt-3 max-w-md text-[15px] leading-relaxed text-muted-foreground">
                Niente listini a moduli, niente costi a documento. Il primo anno include l&apos;avviamento;
                dal secondo paghi solo il rinnovo: il grosso del lavoro l&apos;hai già fatto, e i tuoi dati restano lì.
              </p>
              <ul className="mt-6 space-y-2.5 text-sm">
                {[
                  "Entrambi i percorsi: inventario GHG e bilancio",
                  "Fino a 10 aziende attive e 5 utenti dello studio",
                  "Documenti, versioni e PDF senza limiti",
                  "Aggiornamenti normativi e nuove edizioni dei fattori",
                  "Dati in Europa, isolati per studio, mai cancellati",
                ].map((v) => (
                  <li key={v} className="flex items-start gap-2.5">
                    <Check className="mt-0.5 size-4 shrink-0 text-primary" strokeWidth={2.5} />
                    {v}
                  </li>
                ))}
              </ul>
            </Reveal>
            <Reveal delay={120}>
              <div className="rounded-2xl border bg-card p-8 shadow-sm">
                <p className="text-sm font-medium text-muted-foreground">Primo anno · avviamento incluso</p>
                <p className="mt-1 text-5xl font-semibold tracking-tight" data-slot="kpi">
                  {PREZZI.primoAnno} €<span className="text-lg font-normal text-muted-foreground"> +IVA</span>
                </p>
                <div className="mt-4 flex items-baseline gap-2 border-t pt-4">
                  <p className="text-sm text-muted-foreground">dal secondo anno</p>
                  <p className="text-2xl font-semibold tracking-tight" data-slot="kpi">{PREZZI.rinnovo} €<span className="text-sm font-normal text-muted-foreground">/anno</span></p>
                </div>
                <Button size="lg" className="mt-6 w-full" asChild>
                  <Link href="/registrati">
                    Prova la demo guidata <ArrowRight className="size-4" />
                  </Link>
                </Button>
                <p className="mt-3 text-center text-xs text-muted-foreground">
                  Esplori tutto su un&apos;azienda d&apos;esempio. Paghi solo quando decidi di lavorare sulle tue.
                </p>
              </div>
            </Reveal>
          </div>
        </section>

        {/* ============================================================ VIDEO */}
        <section className="mx-auto w-full max-w-6xl px-5 py-20">
          <Reveal>
            <div className="overflow-hidden rounded-2xl border bg-sidebar">
              <div className="flex aspect-video items-center justify-center">
                {/* Slot video presentazione: si sostituisce con l'embed quando il committente consegna il girato. */}
                <div className="text-center">
                  <div className="mx-auto flex size-16 items-center justify-center rounded-full border border-white/20 bg-white/10">
                    <svg viewBox="0 0 24 24" className="ml-1 size-6 fill-white" aria-hidden><path d="M8 5v14l11-7z" /></svg>
                  </div>
                  <p className="mt-4 text-sm font-medium text-white">EvalisDeck in due minuti</p>
                  <p className="mt-1 text-xs text-sidebar-foreground/70">Il video di presentazione arriva qui</p>
                </div>
              </div>
            </div>
          </Reveal>
        </section>

        {/* ============================================================== FAQ */}
        <section id="faq" className="mx-auto w-full max-w-6xl scroll-mt-20 px-5 pb-20">
          <div className="grid gap-10 md:grid-cols-[1fr_1.4fr]">
            <Reveal>
              <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-primary">Domande frequenti</p>
              <h2 className="mt-2 text-3xl font-semibold tracking-tight">Le risposte che chiederesti al telefono.</h2>
              <p className="mt-3 text-[15px] text-muted-foreground">
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
          <div className="mx-auto w-full max-w-6xl px-5 py-20 text-center">
            <h2 className="mx-auto max-w-2xl text-3xl font-semibold tracking-tight text-white">
              Il prossimo bilancio parte da un&apos;azienda d&apos;esempio già compilata.
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-[15px] text-sidebar-foreground/80">
              Registrati, apri la demo guidata, guarda come lavora. Se convince, sblocchi e porti dentro i tuoi clienti.
            </p>
            <div className="mt-7 flex flex-wrap justify-center gap-3">
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
        </section>
      </main>

      {/* =========================================================== FOOTER */}
      <footer className="border-t bg-background">
        <div className="mx-auto grid w-full max-w-6xl gap-8 px-5 py-12 sm:grid-cols-2 md:grid-cols-4">
          <div>
            <p className="text-[15px] font-semibold tracking-tight">EvalisDeck</p>
            <p className="mt-2 max-w-[28ch] text-xs leading-relaxed text-muted-foreground">
              Bilanci di sostenibilità e inventari GHG per le PMI, con il metodo incorporato.
            </p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Prodotto</p>
            <ul className="mt-3 space-y-2 text-sm">
              <li><a href="#percorsi" className="text-muted-foreground transition-colors hover:text-foreground">I due percorsi</a></li>
              <li><a href="#metodo" className="text-muted-foreground transition-colors hover:text-foreground">Il metodo</a></li>
              <li><a href="#prezzi" className="text-muted-foreground transition-colors hover:text-foreground">Prezzi</a></li>
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
function PercorsoCard({ titolo, norma, passi, punto }: { titolo: string; norma: string; passi: string[]; punto: string }) {
  return (
    <div className="flex h-full flex-col rounded-2xl border bg-card p-7 transition-shadow hover:shadow-md">
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="text-xl font-semibold tracking-tight">{titolo}</h3>
        <span className="shrink-0 rounded-full border px-2.5 py-1 font-mono text-[10px] text-muted-foreground">{norma}</span>
      </div>
      <ol className="mt-5 space-y-1.5">
        {passi.map((p, i) => (
          <li key={p} className="flex items-center gap-2.5 text-[13px]">
            <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-muted text-[10px] font-semibold text-muted-foreground" data-slot="kpi">
              {i + 1}
            </span>
            {p}
          </li>
        ))}
      </ol>
      <p className="mt-5 border-t pt-4 text-[13px] leading-relaxed text-muted-foreground">{punto}</p>
    </div>
  );
}

function PassoScuro({ n, titolo, testo, children }: { n: string; titolo: string; testo: string; children: React.ReactNode }) {
  return (
    <div className="flex h-full flex-col rounded-2xl border border-white/10 bg-white/[0.03] p-6">
      <p className="text-3xl font-semibold tracking-tight text-sidebar-primary/60" data-slot="kpi">{n}</p>
      <h3 className="mt-2 text-lg font-semibold tracking-tight text-white">{titolo}</h3>
      <p className="mt-1.5 text-[13px] leading-relaxed text-sidebar-foreground/75">{testo}</p>
      <div className="mt-5">{children}</div>
    </div>
  );
}
