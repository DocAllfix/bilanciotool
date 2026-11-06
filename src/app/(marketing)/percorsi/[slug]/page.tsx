import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, Check, FileText, Lock } from "lucide-react";

import { SiteHeader } from "@/components/landing/site-header";
import { PiedeMarketing } from "@/components/landing/piede";
import { Reveal } from "@/components/landing/scroll-reveal";
import { Briciole } from "@/components/blog/briciole";
import { Faq } from "@/components/landing/faq";
import { DatiStrutturati } from "@/components/seo/dati-strutturati";
import { Button } from "@/components/ui/button";
import { InterruttorePeriodo, PeriodoProvider, PrezzoFascia } from "@/components/prezzi/periodo";
import { PulsanteAttiva } from "@/components/prezzi/pulsante-attiva";
import { VETRINE, vetrinaPerSlug, moduloDellaVetrina } from "@/features/vetrina/registro";
import { VETTORI_CATALOGO, USI_CATALOGO, AREE } from "@/features/vetrina/energia";
import { ProvaEnergiaConRichiamo } from "@/components/vetrina/energia/prova-con-richiamo";
import { RACCONTO } from "@/components/landing/percorsi-vetrina";
import { DOCUMENTI } from "@/features/documents/tipi";
import { PIANI } from "@/lib/prezzi";
import { indirizzoCanonico } from "@/lib/indirizzo";

// LA PAGINA PUBBLICA DI UN PERCORSO, un modello solo per tutti (6 novembre 2026).
//
// ⚠️ STATICA. Le pagine si generano dai contenuti (`features/vetrina/contenuti.ts`): uno
// slug che non c'è risponde 404 invece di una pagina vuota. `pagine-statiche-pure.test.ts`
// segue gli import a partire da qui.
//
// ⚠️ CIÒ CHE IL REGISTRO SA NON SI RIDICHIARA: nome, norma, colore, passi e documenti
// prodotti vengono dal registro dei moduli e da quello dei documenti. Il contenuto scritto a
// mano è solo ciò che il registro non può sapere: il perché, il per chi, le domande.
//
// ⚠️ La prova interattiva c'è solo dove esiste davvero (oggi il bilancio energetico), e
// dove c'è si dichiara che cosa NON contiene.

export function generateStaticParams() {
  return VETRINE.map((v) => ({ slug: v.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const v = vetrinaPerSlug(slug);
  if (!v) return { title: "Percorso" };
  return {
    title: v.titolo,
    description: v.descrizione,
    alternates: { canonical: `${indirizzoCanonico()}/percorsi/${v.slug}` },
    openGraph: { title: v.titolo, description: v.descrizione, type: "website" },
  };
}

/** L'intestazione di una sezione, sempre uguale: occhiello, titolo, testo. */
function Intestazione({ occhiello, titolo, testo }: { occhiello: string; titolo: string; testo?: string }) {
  return (
    <div className="max-w-2xl">
      <p className="flex items-center gap-3 text-[11px] font-semibold uppercase tracking-[0.22em] text-primary">
        <span className="h-px w-8 bg-primary" aria-hidden />
        {occhiello}
      </p>
      <h2 className="font-display mt-4 text-[28px] font-bold leading-tight tracking-[-0.02em] md:text-[34px]">{titolo}</h2>
      {testo && <p className="mt-4 text-[15px] leading-relaxed text-muted-foreground">{testo}</p>}
    </div>
  );
}

export default async function VetrinaPercorso({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const v = vetrinaPerSlug(slug);
  if (!v) notFound();

  const modulo = moduloDellaVetrina(v);
  const racconto = RACCONTO[v.modulo];
  const base = indirizzoCanonico();
  const documenti = modulo.documenti.map((t) => DOCUMENTI[t].nome);
  const piano = PIANI.azienda;

  return (
    <div className="flex min-h-dvh flex-col">
      <SiteHeader />
      <DatiStrutturati
        dato={{
          "@context": "https://schema.org",
          "@type": "WebPage",
          name: v.titolo,
          description: v.descrizione,
          url: `${base}/percorsi/${v.slug}`,
          isPartOf: { "@type": "WebSite", name: "EvalisDeck", url: base },
        }}
      />
      <DatiStrutturati
        dato={{
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: v.domande.map(([q, a]) => ({
            "@type": "Question",
            name: q,
            acceptedAnswer: { "@type": "Answer", text: a },
          })),
        }}
      />
      <main className="flex-1" data-pagina-percorso={v.modulo}>
        {/* ============================================================ APERTURA */}
        <section className="border-b">
          <div className="mx-auto w-full max-w-6xl px-5 pb-14 pt-10">
            <Briciole
              briciole={[
                { nome: "EvalisDeck", url: base },
                { nome: "Percorsi", url: `${base}/percorsi` },
                { nome: modulo.nome, url: `${base}/percorsi/${v.slug}` },
              ]}
            />
            <Reveal>
              <div className="mt-6 max-w-3xl">
                <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-primary">
                  <span className={`h-2 w-8 ${modulo.colore.tratto}`} aria-hidden />
                  {modulo.nome}
                  <span className="font-mono text-[10.5px] tracking-normal text-muted-foreground">{racconto.norma}</span>
                </p>
                <h1 className="font-display mt-4 text-[32px] font-bold leading-[1.08] tracking-[-0.02em] md:text-[44px]">
                  {v.titolo}
                </h1>
                <p className="mt-5 text-[16px] leading-relaxed text-muted-foreground">{v.promessa}</p>
                <div className="mt-7 flex flex-wrap items-center gap-3">
                  {v.demo ? (
                    <Button asChild size="lg">
                      <a href="#prova">
                        Provalo qui, senza registrarti <ArrowRight className="size-4" />
                      </a>
                    </Button>
                  ) : (
                    <Button asChild size="lg">
                      <Link href="/registrati">
                        Prova la demo guidata <ArrowRight className="size-4" />
                      </Link>
                    </Button>
                  )}
                  <Button asChild size="lg" variant="outline">
                    <Link href={`/attiva/${piano.key}`}>Attiva il servizio</Link>
                  </Button>
                </div>
              </div>
            </Reveal>
          </div>
        </section>

        {/* ===================================================== LA PROVA (se c'è) */}
        {v.demo === "energia" && <SezioniEnergia />}

        {/* ========================================================= PERCHÉ ADESSO */}
        <section className="border-b">
          <div className="mx-auto w-full max-w-6xl px-5 py-16">
            <Reveal>
              <Intestazione occhiello="Perché adesso" titolo="Che cosa c'è in gioco." />
            </Reveal>
            <ol className="mt-10 grid gap-x-12 md:grid-cols-2" data-dolori>
              {v.dolori.map((d, i) => (
                <Reveal key={d.titolo} delay={i * 50}>
                  <li className="border-t py-6">
                    <h3 className="font-display text-[18px] font-semibold leading-snug tracking-[-0.01em]">{d.titolo}</h3>
                    <p className="mt-2 text-[14px] leading-relaxed text-muted-foreground">{d.testo}</p>
                    <p className="mt-2 font-mono text-[11px] leading-snug text-muted-foreground/80" data-fonte>
                      {d.fonte}
                    </p>
                  </li>
                </Reveal>
              ))}
            </ol>
          </div>
        </section>

        {/* ============================================================== PER CHI */}
        <section className="border-b bg-muted/30">
          <div className="mx-auto grid w-full max-w-6xl gap-10 px-5 py-16 md:grid-cols-[minmax(0,22rem)_1fr]">
            <Reveal>
              <Intestazione occhiello="Per chi è" titolo="Chi ne ha bisogno, e quando." />
            </Reveal>
            <Reveal delay={80}>
              <ul className="space-y-3">
                {v.perChi.map((r) => (
                  <li key={r} className="flex gap-3 rounded-lg border bg-card p-4 text-[14px] leading-relaxed">
                    <Check className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
                    {r}
                  </li>
                ))}
              </ul>
            </Reveal>
          </div>
        </section>

        {/* ===================================================== CHE COSA FA */}
        <section className="border-b">
          <div className="mx-auto w-full max-w-6xl px-5 py-16">
            <Reveal>
              <Intestazione
                occhiello="Che cosa fa, esattamente"
                titolo={`Il percorso completo, in ${racconto.passi.length} passi.`}
                testo={racconto.punto}
              />
            </Reveal>
            <ol className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {racconto.passi.map((p, i) => (
                <Reveal key={p} delay={i * 40}>
                  <li className="flex h-full gap-3 rounded-lg border bg-card p-4">
                    <span className="font-display text-[13px] font-bold text-primary" data-slot="kpi">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <span className="text-[13.5px] leading-relaxed">{p}</span>
                  </li>
                </Reveal>
              ))}
            </ol>
            <div className="mt-12 grid gap-x-10 gap-y-7 sm:grid-cols-2">
              {v.cosaFa.map(([t, d], i) => (
                <Reveal key={t} delay={i * 50}>
                  <div className="flex gap-3">
                    <Check className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
                    <div>
                      <h3 className="text-[15px] font-semibold">{t}</h3>
                      <p className="mt-1 text-[13.5px] leading-relaxed text-muted-foreground">{d}</p>
                    </div>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* ===================================================== CHE COSA CONSEGNI */}
        <section className="border-b bg-muted/30">
          <div className="mx-auto w-full max-w-6xl px-5 py-16">
            <div className="grid gap-10 md:grid-cols-2">
              <Reveal>
                <div>
                  <Intestazione
                    occhiello="Che cosa consegni"
                    titolo={documenti.length === 1 ? "Un documento impaginato, pronto da firmare." : "I documenti che escono dal percorso."}
                  />
                  <ul className="mt-6 space-y-2" data-documenti>
                    {documenti.map((n) => (
                      <li key={n} className="flex items-center gap-3 rounded-lg border bg-card px-4 py-3 text-[14px]">
                        <FileText className="size-4 shrink-0 text-primary" aria-hidden />
                        {n}
                      </li>
                    ))}
                  </ul>
                  <p className="mt-4 text-[13px] leading-relaxed text-muted-foreground">
                    Ogni versione pubblicata è congelata e porta un codice di verifica pubblico: quello che consegni resta
                    quello, e chiunque può controllarlo.
                  </p>
                </div>
              </Reveal>
              <Reveal delay={80}>
                <div>
                  <Intestazione occhiello="Prima e dopo" titolo="La differenza che compri." />
                  <div className="mt-6 overflow-hidden rounded-xl border bg-card">
                    <table className="w-full border-collapse text-[13.5px]">
                      <caption className="sr-only">Senza e con il percorso</caption>
                      <thead>
                        <tr className="border-b bg-muted/40 text-left">
                          <th scope="col" className="px-4 py-2.5 font-semibold">Senza</th>
                          <th scope="col" className="px-4 py-2.5 font-semibold">Con EvalisDeck</th>
                        </tr>
                      </thead>
                      <tbody>
                        {v.primaDopo.map(([prima, dopo]) => (
                          <tr key={prima} className="border-b align-top last:border-0">
                            <td className="px-4 py-3 text-muted-foreground">{prima}</td>
                            <td className="px-4 py-3">{dopo}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </Reveal>
            </div>
          </div>
        </section>

        {/* ================================================================ PREZZO */}
        <PeriodoProvider>
          <section className="border-b">
            {/* ⚠️ `grid-cols-1` esplicito: senza, una griglia a colonna implicita si allarga sul
                contenuto più largo, e a 360px la pagina sfondava di 13px. */}
            <div className="mx-auto grid w-full max-w-6xl grid-cols-1 gap-10 px-5 py-16 md:grid-cols-[1fr_minmax(0,24rem)] md:items-start">
              <Reveal>
                <Intestazione
                  occhiello="Quanto costa"
                  titolo="Questo percorso, e tutti gli altri, in un abbonamento solo."
                  testo={`Il piano «${piano.nome}» comprende la tua azienda, ${piano.accessi} accessi per i colleghi e tutti i percorsi: non si paga per documento né per modulo. Annuale o mensile, sempre allo stesso prezzo.`}
                />
                <p className="mt-5 text-[14px]">
                  <Link href="/prezzi" className="font-medium underline underline-offset-4 hover:text-primary">
                    Segui più aziende? I piani per i consulenti
                  </Link>
                </p>
              </Reveal>
              <Reveal delay={80}>
                <div className="rounded-xl border border-primary/50 bg-card p-6 shadow-sm">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <p className="font-display text-[19px] font-bold">{piano.nome}</p>
                    <InterruttorePeriodo />
                  </div>
                  <div className="mt-5">
                    <PrezzoFascia piano={piano.key} compatto />
                  </div>
                  <div className="mt-6">
                    <PulsanteAttiva piano={piano.key} etichetta="Attiva il servizio" />
                  </div>
                  <p className="mt-3 text-center text-[12px] text-muted-foreground">
                    Rimborso integrale entro quattordici giorni, se non hai ancora pubblicato un documento.
                  </p>
                </div>
              </Reveal>
            </div>
          </section>
        </PeriodoProvider>

        {/* ============================================================ DOMANDE */}
        <section className="border-b">
          <div className="mx-auto grid w-full max-w-6xl gap-10 px-5 py-16 md:grid-cols-[minmax(0,20rem)_1fr]">
            <Reveal>
              <Intestazione occhiello="Domande" titolo="Le risposte che chiederesti al telefono." />
            </Reveal>
            <Reveal delay={80}>
              <Faq domande={v.domande} />
            </Reveal>
          </div>
        </section>

        {/* ============================================================ CHIUSURA */}
        <section className="bg-sidebar">
          <div className="mx-auto w-full max-w-6xl px-5 py-16">
            <div className="max-w-2xl">
              <h2 className="font-display text-[30px] font-bold leading-tight tracking-[-0.02em] text-white md:text-[38px]">
                Guardalo lavorare su un&apos;azienda vera, prima di pagare.
              </h2>
              <p className="mt-4 text-[15px] leading-relaxed text-sidebar-foreground/80">
                La demo guidata apre un&apos;azienda d&apos;esempio già compilata, con questo percorso e tutti gli altri:
                senza carta, e senza impegno.
              </p>
              <div className="mt-7 flex flex-wrap gap-3">
                <Button asChild size="lg">
                  <Link href="/registrati">
                    Prova la demo guidata <ArrowRight className="size-4" />
                  </Link>
                </Button>
                <Button
                  asChild
                  size="lg"
                  variant="outline"
                  className="border-white/25 bg-transparent text-white hover:bg-white/10 hover:text-white"
                >
                  <Link href="/percorsi">Tutti i percorsi</Link>
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

/** La prova del bilancio energetico e la spiegazione dei suoi cataloghi. */
function SezioniEnergia() {
  const v = vetrinaPerSlug("bilancio-energetico");
  const racconto = RACCONTO.energetico;
  const vettori = VETTORI_CATALOGO;
  return (
    <>
      <section id="prova" className="scroll-mt-20 border-b bg-muted/30">
        <div className="mx-auto w-full max-w-6xl px-5 py-14">
          <p className="mb-6 max-w-2xl text-[14.5px] leading-relaxed text-muted-foreground">
            Qui sotto c&apos;è un pezzo vero del percorso, con i fattori di conversione della norma e {vettori.length}{" "}
            vettori energetici da ripartire su {USI_CATALOGO.length} usi finali. Si tocca subito: niente registrazione,
            niente email, e i numeri restano nel tuo browser.
          </p>
          <ProvaEnergiaConRichiamo />
        </div>
      </section>

      <section className="border-b">
        <div className="mx-auto w-full max-w-6xl px-5 py-16">
          <div className="grid gap-12 md:grid-cols-[minmax(0,22rem)_1fr]">
            <Reveal>
              <div>
                <h2 className="font-display text-[26px] font-bold leading-tight tracking-[-0.02em]">
                  Che cos&apos;è una diagnosi energetica
                </h2>
                <p className="mt-4 text-[14.5px] leading-relaxed text-muted-foreground">
                  Misurare quanta energia entra nel sito, convertirla in un&apos;unità sola, e dire dove va. È il lavoro
                  che la {racconto.norma.split(" · ")[0]} chiede, ed è anche il modo in cui si capisce su quale utenza
                  conviene intervenire.
                </p>
              </div>
            </Reveal>
            <Reveal delay={80}>
              <div className="space-y-6">
                <div>
                  <h3 className="text-[15px] font-semibold">I {vettori.length} vettori energetici</h3>
                  <p className="mt-2 text-[13.5px] leading-relaxed text-muted-foreground">
                    Un vettore è una forma in cui l&apos;energia entra: elettricità dalla rete, gas, gasolio, biomassa,
                    calore acquistato. Ognuno ha la propria unità di misura e i propri fattori: quanti kWh vale
                    un&apos;unità, quanta energia primaria in tep, quanta CO₂ emette.
                  </p>
                  <ul className="mt-3 flex flex-wrap gap-1.5">
                    {vettori.map((x) => (
                      <li key={x.key} className="rounded-full border px-2.5 py-1 text-[12px] text-muted-foreground">
                        {x.nome} <span className="font-mono text-[11px]">({x.unita})</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h3 className="text-[15px] font-semibold">
                    I {USI_CATALOGO.length} usi finali, in {AREE.length}{" "}aree
                  </h3>
                  <p className="mt-2 text-[13.5px] leading-relaxed text-muted-foreground">
                    L&apos;uso finale è dove l&apos;energia viene consumata: il forno, l&apos;aria compressa,
                    l&apos;illuminazione, il riscaldamento, la flotta. Ripartire i vettori sugli usi è il passaggio che
                    trasforma una bolletta in una diagnosi.
                  </p>
                  <ul className="mt-3 grid gap-x-6 gap-y-1 text-[13px] text-muted-foreground sm:grid-cols-2">
                    {AREE.map((a) => (
                      <li key={a.key}>
                        <span className="font-medium text-foreground">{a.nome}</span>:{" "}
                        {USI_CATALOGO.filter((u) => u.areaKey === a.key).length}{" "}usi
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </Reveal>
          </div>

          {v?.provi && v.nonCiSono && (
            <div className="mt-12 grid gap-8 md:grid-cols-2">
              <Reveal>
                <div>
                  <h3 className="flex items-center gap-2 text-[15px] font-semibold">
                    <Check className="size-4 text-primary" aria-hidden /> Che cosa provi qui
                  </h3>
                  <ul className="mt-3 space-y-2 text-[13.5px] leading-relaxed text-muted-foreground">
                    {v.provi.map((r) => (
                      <li key={r} className="border-b pb-2 last:border-0">
                        {r}
                      </li>
                    ))}
                  </ul>
                </div>
              </Reveal>
              {/* ⚠️ Che cosa NON c'è si dichiara, e si dichiara QUI, non in fondo in corpo
                  otto: promettere più di quanto la vetrina porta è un boomerang proprio su
                  chi poi paga. */}
              <Reveal delay={80}>
                <div>
                  <h3 className="flex items-center gap-2 text-[15px] font-semibold">
                    <Lock className="size-4 text-muted-foreground" aria-hidden /> Che cosa no
                  </h3>
                  <ul className="mt-3 space-y-2 text-[13.5px] leading-relaxed text-muted-foreground">
                    {v.nonCiSono.map((r) => (
                      <li key={r} className="border-b pb-2 last:border-0">
                        {r}
                      </li>
                    ))}
                  </ul>
                </div>
              </Reveal>
            </div>
          )}
        </div>
      </section>
    </>
  );
}
