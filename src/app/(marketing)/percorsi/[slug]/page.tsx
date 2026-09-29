import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Check, Lock } from "lucide-react";

import { SiteHeader } from "@/components/landing/site-header";
import { PiedeMarketing } from "@/components/landing/piede";
import { Reveal } from "@/components/landing/scroll-reveal";
import { Briciole } from "@/components/blog/briciole";
import { DatiStrutturati } from "@/components/seo/dati-strutturati";
import { Button } from "@/components/ui/button";
import { VETRINE, vetrinaPerSlug, moduloDellaVetrina } from "@/features/vetrina/registro";
import { VETTORI_CATALOGO, USI_CATALOGO, AREE } from "@/features/vetrina/energia";
import { ProvaEnergiaConRichiamo } from "@/components/vetrina/energia/prova-con-richiamo";
import { RACCONTO } from "@/components/landing/percorsi-vetrina";
import { indirizzoCanonico } from "@/lib/indirizzo";

// La vetrina pubblica di un percorso: si apre senza account, si tocca, e a valore consegnato
// propone di attivare.
//
// ⚠️ PAGINA STATICA. Non legge la richiesta, nemmeno indirettamente: `pagine-statiche-pure`
// segue gli import a partire da qui. È la regola nata dal 500 sul primo articolo del blog,
// dove una lettura della sessione tre livelli sotto rendeva dinamica ogni pagina che montava
// l'intestazione.
//
// ⚠️ ED È UNA PAGINA, non un widget con un titolo sopra. Il consulente SEO l'ha chiesta per
// avere dove mandare chi legge l'articolo sui vettori energetici: se qui dentro non c'è testo
// vero — che cosa sono i vettori, che cosa sono gli usi finali, perché la quadratura conta —
// non si posiziona per niente, e il giro non porta nessuno.

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

export default async function VetrinaPercorso({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const v = vetrinaPerSlug(slug);
  if (!v) notFound();

  const modulo = moduloDellaVetrina(v);
  const racconto = RACCONTO[v.modulo];
  const base = indirizzoCanonico();

  // I numeri del percorso si CONTANO dai cataloghi: scritti a mano sarebbero una seconda
  // verità, e il giorno in cui il catalogo cambia resterebbero indietro su una pagina
  // pubblica. È già successo: la vetrina dichiarava 126 requisiti NIS2 dove sono 124.
  //
  // ⚠️ Si conta il catalogo INTERO, non i soli vettori principali: dodici è il numero che
  // dicono la home, la guida e il seme, e una pagina che dicesse undici — corretto quanto
  // si vuole, perché uno dei dodici è un dettaglio dell'elettrica — sarebbe l'ennesimo
  // secondo numero per la stessa cosa, a un clic di distanza dal primo.
  const vettori = VETTORI_CATALOGO;

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
      <main className="flex-1">
        {/* ============================================================ APERTURA */}
        <section className="border-b">
          <div className="mx-auto w-full max-w-6xl px-5 pb-14 pt-10">
            <Briciole
              briciole={[
                { nome: "EvalisDeck", url: base },
                { nome: "Percorsi", url: `${base}/#percorsi` },
                { nome: modulo.nome, url: `${base}/percorsi/${v.slug}` },
              ]}
            />
            <Reveal>
              <div className="mt-6 max-w-3xl">
                <p className="flex items-center gap-3 text-[11px] font-semibold uppercase tracking-[0.22em] text-primary">
                  <span className="h-px w-8 bg-primary" aria-hidden />
                  {modulo.nome}
                  <span className="font-mono text-[10.5px] tracking-normal text-muted-foreground">
                    {racconto.norma}
                  </span>
                </p>
                <h1 className="font-display mt-4 text-[34px] font-bold leading-[1.08] tracking-[-0.02em] md:text-[44px]">
                  {v.titolo}
                </h1>
                <p className="mt-5 text-[16px] leading-relaxed text-muted-foreground">
                  Qui sotto c&apos;è un pezzo vero del percorso, con i fattori di conversione
                  della norma e {vettori.length} vettori energetici da ripartire su{" "}
                  {USI_CATALOGO.length} usi finali. Si tocca subito: niente registrazione,
                  niente email, e i numeri restano nel tuo browser.
                </p>
              </div>
            </Reveal>
          </div>
        </section>

        {/* ================================================== LO STRUMENTO */}
        <section id="prova" className="scroll-mt-20 border-b bg-muted/30">
          <div className="mx-auto w-full max-w-6xl px-5 py-14">
            <ProvaEnergiaConRichiamo />
          </div>
        </section>

        {/* ====================================================== CHE COS'È */}
        <section className="border-b">
          <div className="mx-auto w-full max-w-6xl px-5 py-16">
            <div className="grid gap-12 md:grid-cols-[minmax(0,22rem)_1fr]">
              <Reveal>
                <div>
                  <h2 className="font-display text-[26px] font-bold leading-tight tracking-[-0.02em]">
                    Che cos&apos;è una diagnosi energetica
                  </h2>
                  <p className="mt-4 text-[14.5px] leading-relaxed text-muted-foreground">
                    Misurare quanta energia entra nel sito, convertirla in un&apos;unità sola, e
                    dire dove va. È il lavoro che la {racconto.norma.split(" · ")[0]} chiede, ed è
                    anche il modo in cui si capisce su quale utenza conviene intervenire.
                  </p>
                </div>
              </Reveal>
              <Reveal delay={80}>
                <div className="space-y-6">
                  <div>
                    <h3 className="text-[15px] font-semibold">
                      I {vettori.length} vettori energetici
                    </h3>
                    <p className="mt-2 text-[13.5px] leading-relaxed text-muted-foreground">
                      Un vettore è una forma in cui l&apos;energia entra: elettricità dalla rete,
                      gas, gasolio, biomassa, calore acquistato. Ognuno ha la propria unità di
                      misura e i propri fattori — quanti kWh vale un&apos;unità, quanta energia
                      primaria in tep, quanta CO₂ emette.
                    </p>
                    <ul className="mt-3 flex flex-wrap gap-1.5">
                      {vettori.map((x) => (
                        <li
                          key={x.key}
                          className="rounded-full border px-2.5 py-1 text-[12px] text-muted-foreground"
                        >
                          {x.nome} <span className="font-mono text-[11px]">({x.unita})</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <h3 className="text-[15px] font-semibold">
                      I {USI_CATALOGO.length} usi finali, in {AREE.length} aree
                    </h3>
                    <p className="mt-2 text-[13.5px] leading-relaxed text-muted-foreground">
                      L&apos;uso finale è dove l&apos;energia viene consumata: il forno, l&apos;aria
                      compressa, l&apos;illuminazione, il riscaldamento, la flotta. Ripartire i
                      vettori sugli usi è il passaggio che trasforma una bolletta in una diagnosi.
                    </p>
                    <ul className="mt-3 grid gap-x-6 gap-y-1 text-[13px] text-muted-foreground sm:grid-cols-2">
                      {AREE.map((a) => (
                        <li key={a.key}>
                          <span className="font-medium text-foreground">{a.nome}</span> —{" "}
                          {USI_CATALOGO.filter((u) => u.areaKey === a.key).length} usi
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <h3 className="text-[15px] font-semibold">La quadratura</h3>
                    <p className="mt-2 text-[13.5px] leading-relaxed text-muted-foreground">
                      {racconto.punto}
                    </p>
                  </div>
                </div>
              </Reveal>
            </div>
          </div>
        </section>

        {/* ================================================ IL PERCORSO INTERO */}
        <section className="border-b bg-muted/30">
          <div className="mx-auto w-full max-w-6xl px-5 py-16">
            <Reveal>
              <div className="max-w-2xl">
                <h2 className="font-display text-[26px] font-bold leading-tight tracking-[-0.02em]">
                  Il percorso completo, in {racconto.passi.length} passi
                </h2>
                <p className="mt-4 text-[15px] leading-relaxed text-muted-foreground">
                  Quello che provi qui sono i primi passi. Gli altri stanno nell&apos;account, e
                  finiscono in un documento impaginato con la tua firma.
                </p>
              </div>
            </Reveal>
            <ol className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {racconto.passi.map((p, i) => (
                <Reveal key={p} delay={i * 40}>
                  <li className="flex h-full gap-3 rounded-lg border bg-card p-4">
                    <span className="font-display text-[13px] font-bold text-primary">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <span className="text-[13.5px] leading-relaxed">{p}</span>
                  </li>
                </Reveal>
              ))}
            </ol>

            <div className="mt-10 grid gap-8 md:grid-cols-2">
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
                  chi poi paga. È la stessa regola dei quattro documenti del metodo ESG. */}
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
          </div>
        </section>

        {/* ============================================================ CHIUSURA */}
        <section>
          <div className="mx-auto w-full max-w-6xl px-5 py-16">
            <Reveal>
              <div className="max-w-2xl">
                <h2 className="font-display text-[26px] font-bold leading-tight tracking-[-0.02em]">
                  Il documento lo genera l&apos;account, in un pomeriggio.
                </h2>
                <p className="mt-4 text-[15px] leading-relaxed text-muted-foreground">
                  Gli stessi numeri che hai messo qui diventano la diagnosi impaginata: grafici,
                  tabelle, interventi con il ritorno dell&apos;investimento, e il PDF da
                  consegnare. Con l&apos;abbonamento apri anche gli altri percorsi sulla stessa
                  azienda.
                </p>
                <div className="mt-7 flex flex-wrap gap-3">
                  <Button asChild size="lg">
                    <Link href="/attiva/singola">Attiva il servizio</Link>
                  </Button>
                  <Button asChild size="lg" variant="outline">
                    <Link href="/prezzi">Vedi le fasce</Link>
                  </Button>
                </div>
              </div>
            </Reveal>
          </div>
        </section>
      </main>
      <PiedeMarketing />
    </div>
  );
}
