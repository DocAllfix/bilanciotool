import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Clock } from "lucide-react";

import { corsoDelModulo, esisteCorso } from "@/features/formazione";
import { SezioneCorso } from "@/components/formazione/corso";
import { Badge } from "@/components/ui/badge";

type Props = { params: Promise<{ modulo: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { modulo } = await params;
  if (!esisteCorso(modulo)) return { title: "Formazione" };
  return { title: `Formazione · ${corsoDelModulo(modulo).nome}` };
}

export default async function CorsoPage({ params }: Props) {
  const { modulo } = await params;
  // ⚠️ Un percorso inventato nell'indirizzo deve dare 404, non una pagina vuota: una
  // pagina che si apre e non contiene niente si legge come un guasto del prodotto.
  if (!esisteCorso(modulo)) notFound();

  const c = corsoDelModulo(modulo);

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
      <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-muted-foreground">
        <span className="font-mono">{c.norma}</span>
        <span className="flex items-center gap-1.5">
          <Clock className="size-3.5" aria-hidden />
          <span data-slot="kpi">{c.minuti}</span> minuti
        </span>
      </p>

      {/* ⚠️ Lo dice in cima, non in fondo: chi legge deve sapere SUBITO che cosa troverà,
          non scoprirlo dopo aver scorso sei sezioni cercando la parte che gli serviva. */}
      {!c.completo && (
        <div className="mt-6 max-w-prose rounded-lg border border-warning/40 bg-warning-subtle px-4 py-3">
          <p className="text-[13px] font-semibold text-warning">La parte specifica è in preparazione</p>
          <p className="mt-1 text-[14px] leading-relaxed text-foreground/85">
            Questo corso spiega come si usa il prodotto: dove sei, come si salva, che cosa controlla la
            verifica e che cosa succede quando pubblichi. Le sezioni sul metodo di questo percorso non
            ci sono ancora. Nel frattempo la <Link href="/guida" className="underline underline-offset-4">guida</Link>{" "}
            e il tour della pagina restano a disposizione.
          </p>
        </div>
      )}

      {/* Indice: le sezioni sono lunghe, e chi torna una seconda volta cerca una cosa sola. */}
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

      <div className="mt-12 border-t pt-6">
        <p className="text-[13.5px] text-muted-foreground">
          Per le domande che non trovano risposta qui, la{" "}
          <Link href="/guida" className="underline underline-offset-4 hover:text-primary">
            guida all&apos;uso
          </Link>{" "}
          raccoglie le più frequenti.{" "}
          {c.completo && <Badge variant="outline" className="align-middle text-[10.5px]">corso completo</Badge>}
        </p>
      </div>
    </div>
  );
}
