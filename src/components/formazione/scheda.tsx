import Link from "next/link";
import { ArrowRight, Clock } from "lucide-react";


import { MODULI_AZIENDA } from "@/features/companies/moduli";
import type { SchedaCorso } from "@/features/formazione";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

/**
 * La scheda di un corso nell'indice.
 *
 * ⚠️ NASCE DA UN RILIEVO DEL COMMITTENTE: dodici schede identiche, «troppo spoglia». Ed
 * era vero due volte — la griglia di card uguali è nominata fra le anti-reference di
 * PRODUCT.md, e soprattutto quelle schede non dicevano NIENTE di sé: cambiava il titolo,
 * il resto era la stessa forma dodici volte.
 *
 * ⚠️ La differenza non si è cercata nella decorazione ma in un DATO. Un corso è fatto di
 * una parte comune a tutti e dodici — interfaccia, salvataggio, verifica, pubblicazione —
 * e di una parte che esiste solo per quel percorso. È la distinzione che il prodotto ha
 * già dentro, ed è quella che interessa a chi sceglie cosa leggere: la barra mostra le due
 * porzioni in proporzione ai minuti, quindi ogni corso ha una forma sua e la forma
 * significa qualcosa.
 *
 * L'icona e il colore vengono dal registro: «un'area un colore, un modulo un'icona» è la
 * regola scritta in DESIGN.md, e in questa pagina non era usata.
 */
export function SchedaFormazione({ corso }: { corso: SchedaCorso }) {
  const m = MODULI_AZIENDA.find((x) => x.href === corso.modulo)!;
  const Icona = m.icona;

  // Le sezioni proprie stanno in fondo: il corso è «comuni, poi proprie».
  const quanteProprie = corso.argomenti.length;
  const primaPropria = corso.sezioni.length - quanteProprie;
  const minutiTotali = corso.sezioni.reduce((n, s) => n + s.minuti, 0);

  return (
    <Link
      href={`/formazione/${corso.modulo}`}
      data-corso={corso.modulo}
      className="group flex flex-col rounded-xl border bg-card p-4 transition-all hover:border-foreground/15 hover:shadow-md"
    >
      <div className="flex items-start gap-3">
        <span className={cn("flex size-9 shrink-0 items-center justify-center rounded-lg", m.colore.pieno)}>
          <Icona className="size-4" strokeWidth={2} aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[15px] font-semibold leading-tight tracking-tight group-hover:text-primary">
            {corso.nome}
          </p>
          <p className="mt-0.5 font-mono text-[11px] text-muted-foreground">{corso.norma}</p>
        </div>
        <span className="flex shrink-0 items-center gap-1.5 text-[12px] text-muted-foreground">
          <Clock className="size-3.5" aria-hidden />
          <span data-slot="kpi">{corso.minuti}</span> min
        </span>
      </div>

      {/* ⚠️ La barra è INFORMAZIONE, non ornamento: ogni segmento è una sezione, e la sua
          larghezza sono i suoi minuti. Le sezioni proprie del percorso sono nel colore
          dell'area, le comuni in grigio — così a colpo d'occhio si vede quanto di quel
          corso riguarda quel percorso e quanto è il mestiere di base, che si legge una
          volta sola. `aria-hidden` perché la riga sotto dice le stesse cose a parole. */}
      <div className="mt-4 flex h-1.5 gap-px overflow-hidden rounded-full" aria-hidden>
        {corso.sezioni.map((s, i) => (
          <span
            key={s.id}
            style={{ flexGrow: s.minuti }}
            className={cn(
              "block",
              i >= primaPropria && quanteProprie > 0 ? m.colore.tratto : "bg-muted-foreground/25",
            )}
          />
        ))}
      </div>

      <p className="mt-2.5 text-[12px] text-muted-foreground">
        <span data-slot="kpi">{corso.sezioni.length}</span> sezioni ·{" "}
        <span data-slot="kpi">{minutiTotali}</span> minuti di lettura
      </p>

      <p className="mt-2 flex-1 text-[12.5px] leading-relaxed text-muted-foreground">
        {corso.completo ? (
          <>
            {corso.argomenti.slice(0, 3).join(" · ")}
            {corso.argomenti.length > 3 ? " …" : ""}
          </>
        ) : (
          <Badge variant="outline" className="align-middle text-[10.5px]">
            parte specifica in preparazione
          </Badge>
        )}
      </p>

      <span className="mt-3 flex items-center gap-1 text-[12.5px] font-medium text-muted-foreground transition-colors group-hover:text-primary">
        Apri il corso
        <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" aria-hidden />
      </span>
    </Link>
  );
}


