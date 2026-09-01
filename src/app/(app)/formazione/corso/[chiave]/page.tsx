import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Clock } from "lucide-react";

import { corsoTrasversale, esisteCorsoTrasversale } from "@/features/formazione";
import { SezioneCorso } from "@/components/formazione/corso";

type Props = { params: Promise<{ chiave: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { chiave } = await params;
  if (!esisteCorsoTrasversale(chiave)) return { title: "Formazione" };
  return { title: `Formazione · ${corsoTrasversale(chiave).nome}` };
}

export default async function CorsoTrasversalePage({ params }: Props) {
  const { chiave } = await params;
  if (!esisteCorsoTrasversale(chiave)) notFound();

  const c = corsoTrasversale(chiave);

  return (
    <div className="mx-auto w-full max-w-4xl pb-20">
      <Link
        href="/formazione"
        className="inline-flex items-center gap-1.5 text-[13px] text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-3.5" aria-hidden />
        Formazione
      </Link>

      <h1 className="font-display mt-4 text-[28px] font-bold tracking-[-0.02em]">{c.nome}</h1>
      <p className="mt-2 max-w-prose text-[14.5px] leading-relaxed text-muted-foreground">{c.sottotitolo}</p>
      <p className="mt-2 flex items-center gap-1.5 text-[13px] text-muted-foreground">
        <Clock className="size-3.5" aria-hidden />
        <span data-slot="kpi">{c.minuti}</span> minuti
      </p>

      {/* ⚠️ Lo dice in cima: questo corso non insegna a usare un percorso. Chi lo apre
          cercando dove si preme un pulsante deve capirlo prima di scorrere, non dopo. */}
      <div className="mt-6 max-w-prose rounded-lg border bg-muted/40 px-4 py-3">
        <p className="text-[14px] leading-relaxed text-foreground/85">
          Questo corso non insegna a usare i singoli percorsi: per quello ci sono i corsi dei percorsi,
          uno per ciascuno. Qui si impara a farne un&apos;attività professionale.
        </p>
      </div>

      <nav aria-label="Sezioni del corso" className="mt-8 rounded-xl border bg-card p-4">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">In questo corso</p>
        <ol className="mt-2.5 space-y-1.5">
          {c.sezioni.map((s, i) => (
            <li key={s.id} className="flex items-baseline gap-3 text-[13.5px]">
              <span className="w-5 shrink-0 text-right font-mono text-[11px] text-muted-foreground" data-slot="kpi">
                {String(i + 1).padStart(2, "0")}
              </span>
              <a href={`#${s.id}`} className="transition-colors hover:text-primary">
                {s.titolo}
              </a>
              <span className="ml-auto shrink-0 font-mono text-[11px] text-muted-foreground">{s.minuti} min</span>
            </li>
          ))}
        </ol>
      </nav>

      <div className="mt-10 space-y-10" data-sezioni="">
        {c.sezioni.map((s, i) => (
          <SezioneCorso key={s.id} sezione={s} indice={i + 1} />
        ))}
      </div>
    </div>
  );
}
