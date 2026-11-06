import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { SiteHeader } from "@/components/landing/site-header";
import { PiedeMarketing } from "@/components/landing/piede";
import { Reveal } from "@/components/landing/scroll-reveal";
import { Button } from "@/components/ui/button";
import { AREE_VETRINA, QUANTI_PERCORSI } from "@/components/landing/percorsi-vetrina";
import { vetrinaDelModulo } from "@/features/vetrina/registro";
import { indirizzoCanonico } from "@/lib/indirizzo";

// L'INDICE DEI PERCORSI (6 novembre 2026).
//
// Le briciole delle pagine dei percorsi portavano a `/#percorsi`, e `Briciole` rende il solo
// percorso dell'indirizzo: il collegamento finiva sulla home, in cima. Ora c'è una pagina
// vera, statica, che elenca tutti i percorsi per gruppo e collega quelli che hanno la loro.
//
// ⚠️ L'elenco si DERIVA dal registro dei moduli: un percorso nuovo compare qui da solo.

export const metadata: Metadata = {
  title: "I percorsi",
  description: `I ${QUANTI_PERCORSI} percorsi guidati di EvalisDeck, in ${AREE_VETRINA.length} gruppi: sostenibilità, conformità e sistemi di gestione, ciascuno con il documento che produce.`,
  alternates: { canonical: `${indirizzoCanonico()}/percorsi` },
};

export default function IndicePercorsi() {
  return (
    <div className="flex min-h-dvh flex-col">
      <SiteHeader />
      <main className="flex-1">
        <section className="border-b">
          <div className="mx-auto w-full max-w-6xl px-5 pb-12 pt-20">
            <Reveal>
              <div className="max-w-2xl">
                <p className="flex items-center gap-3 text-[11px] font-semibold uppercase tracking-[0.22em] text-primary">
                  <span className="h-px w-8 bg-primary" aria-hidden />I percorsi
                </p>
                <h1 className="font-display mt-4 text-[34px] font-bold leading-[1.08] tracking-[-0.02em] md:text-[46px]">
                  {QUANTI_PERCORSI}{" "}percorsi, ognuno col suo documento.
                </h1>
                <p className="mt-5 text-[16px] leading-relaxed text-muted-foreground">
                  Ogni percorso segue una norma passo per passo e finisce in un documento impaginato. Sono tutti compresi
                  in ogni piano: apri solo quelli che ti servono.
                </p>
              </div>
            </Reveal>
          </div>
        </section>

        <section className="border-b">
          <div className="mx-auto w-full max-w-6xl space-y-14 px-5 py-16">
            {AREE_VETRINA.map((area) => (
              <div key={area.nome}>
                <h2 className="font-display flex items-center gap-3 border-b pb-4 text-[15px] font-bold uppercase tracking-[0.16em]">
                  <span className={`h-2 w-8 shrink-0 ${area.tratto}`} aria-hidden />
                  {area.nome}
                </h2>
                <p className="mt-3 max-w-2xl text-[14px] leading-relaxed text-muted-foreground">{area.perche}</p>
                <ul className="mt-6 divide-y border-y">
                  {area.percorsi.map((p) => {
                    const v = p.modulo ? vetrinaDelModulo(p.modulo) : null;
                    return (
                      <li key={p.titolo} className="grid gap-2 py-5 md:grid-cols-[minmax(0,20rem)_1fr_auto] md:items-baseline md:gap-8">
                        <div>
                          <h3 className="font-display text-[17px] font-semibold tracking-[-0.01em]">
                            {v ? (
                              <Link href={`/percorsi/${v.slug}`} className="underline-offset-4 hover:text-primary hover:underline">
                                {p.titolo}
                              </Link>
                            ) : (
                              p.titolo
                            )}
                          </h3>
                          <p className="mt-1 font-mono text-[11px] text-muted-foreground">{p.norma}</p>
                        </div>
                        <p className="text-[13.5px] leading-relaxed text-muted-foreground">{p.punto}</p>
                        {v && (
                          <Link
                            href={`/percorsi/${v.slug}`}
                            className="inline-flex shrink-0 items-center gap-1.5 text-[13px] font-medium text-primary underline-offset-4 hover:underline"
                          >
                            In dettaglio <ArrowRight className="size-3.5" aria-hidden />
                          </Link>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>
        </section>

        <section>
          <div className="mx-auto w-full max-w-6xl px-5 py-16">
            <div className="flex flex-wrap gap-3">
              <Button asChild size="lg">
                <Link href="/registrati">
                  Prova la demo guidata <ArrowRight className="size-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link href="/prezzi">Vedi i prezzi</Link>
              </Button>
            </div>
          </div>
        </section>
      </main>
      <PiedeMarketing />
    </div>
  );
}
