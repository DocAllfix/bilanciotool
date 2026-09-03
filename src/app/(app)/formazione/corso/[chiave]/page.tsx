import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Clock, Play } from "lucide-react";

import { corsoTrasversale, esisteCorsoTrasversale } from "@/features/formazione";
import { SezioneCorso } from "@/components/formazione/corso";
import { IndiceCorso } from "@/components/formazione/indice";

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
    <div className="mx-auto w-full max-w-6xl pb-24">
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

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <Link
          href={`/formazione/corso/${c.chiave}/presentazione`}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-[14.5px] font-semibold text-primary-foreground shadow-sm transition-all hover:opacity-90 hover:shadow"
        >
          <Play className="size-4" strokeWidth={2.5} aria-hidden />
          Segui la presentazione
        </Link>
        <p className="text-[13px] text-muted-foreground">
          Una schermata per volta, con la voce che spiega. Qui sotto lo stesso corso, da leggere.
        </p>
      </div>

      {/* ⚠️ Lo dice in cima: questo corso non insegna a usare un percorso. Chi lo apre
          cercando dove si preme un pulsante deve capirlo prima di scorrere, non dopo. */}
      <div className="mt-6 max-w-prose rounded-lg border bg-muted/40 px-4 py-3">
        <p className="text-[14px] leading-relaxed text-foreground/85">
          Questo corso non insegna a usare i singoli percorsi: per quello ci sono i corsi dei percorsi,
          uno per ciascuno. Qui si impara a farne un&apos;attività professionale.
        </p>
      </div>

      <div className="mt-8 gap-10 lg:flex lg:items-start">
        <IndiceCorso sezioni={c.sezioni.map((s) => ({ id: s.id, titolo: s.titolo, minuti: s.minuti }))} />
        <div className="mt-8 min-w-0 flex-1 space-y-12 lg:mt-0" data-sezioni="">
          {c.sezioni.map((s, i) => (
            <SezioneCorso key={s.id} sezione={s} indice={i + 1} />
          ))}
        </div>
      </div>
    </div>
  );
}
