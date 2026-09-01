import type { Metadata } from "next";
import Link from "next/link";
import { Clock, Compass } from "lucide-react";

import { MODULI_PER_AREA } from "@/features/companies/moduli";
import { corsoDelModulo, TRASVERSALI, corsoTrasversale } from "@/features/formazione";
import { Badge } from "@/components/ui/badge";

export const metadata: Metadata = { title: "Formazione" };

// L'indice della formazione, generato dal registro dei percorsi.
//
// ⚠️ Un percorso nuovo compare qui da solo, col corso comune, e non può restare fuori per
// dimenticanza. È la stessa scelta della guida, e la ragione è la stessa: un elenco tenuto
// allineato a mano prima o poi non lo è più — la vetrina ha mostrato undici percorsi su
// dodici per due giorni, e nessun collaudo poteva vederlo.

export default function FormazionePage() {
  return (
    <div className="mx-auto w-full max-w-6xl pb-16">
      <h1 className="text-2xl font-semibold tracking-tight">Formazione</h1>
      <p className="mt-1 max-w-prose text-sm text-muted-foreground">
        Un corso per percorso: come si usa, dove si prendono i dati, che cosa controlla la verifica e
        che cosa succede quando si pubblica. Si legge a pezzi, e riprende da dove eri rimasto.
      </p>

      <div className="mt-8 space-y-7" data-formazione="">
        {MODULI_PER_AREA.map((g) => (
          <section key={g.area}>
            <h2 className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              <span className={`size-2 shrink-0 rounded-full ${g.colore.tratto}`} aria-hidden />
              {g.nome}
            </h2>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              {g.moduli.map((m) => {
                const c = corsoDelModulo(m.href);
                return (
                  <Link
                    key={m.href}
                    href={`/formazione/${m.href}`}
                    data-corso={m.href}
                    className="group rounded-xl border bg-card p-4 transition-colors hover:bg-accent/40"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-medium leading-tight">{c.nome}</p>
                        <p className="mt-0.5 font-mono text-[11px] text-muted-foreground">{c.norma}</p>
                      </div>
                      <span className="flex shrink-0 items-center gap-1.5 text-[12px] text-muted-foreground">
                        <Clock className="size-3.5" aria-hidden />
                        <span data-slot="kpi">{c.minuti}</span> min
                      </span>
                    </div>
                    {/* ⚠️ Qui c'era la STESSA identica frase su tutte e dodici le schede.
                        Una riga uguale ovunque non è un sommario: è rumore che occupa lo
                        spazio in cui il lettore cercava la differenza fra un corso e
                        l'altro. Ora ci sono i titoli delle sezioni PROPRIE, cioè l'unica
                        cosa che quel corso ha e gli altri no — e si derivano, quindi
                        cambiano da soli quando cambia il corso. */}
                    <p className="mt-3 text-[12.5px] leading-relaxed text-muted-foreground">
                      <span className="font-medium text-foreground/75">
                        {c.sezioni.length} sezioni
                      </span>
                      {c.completo ? (
                        <>
                          {" · "}
                          {c.argomenti.slice(0, 3).join(" · ")}
                          {c.argomenti.length > 3 ? " …" : ""}
                        </>
                      ) : (
                        <>
                          {" · "}
                          <Badge variant="outline" className="align-middle text-[10.5px]">
                            parte specifica in preparazione
                          </Badge>
                        </>
                      )}
                    </p>
                  </Link>
                );
              })}
            </div>
          </section>
        ))}
      </div>

      {/* ⚠️ In fondo e in una sezione SUA, non mescolata ai percorsi. Un corso che insegna a
          vendere in mezzo a dodici che insegnano a compilare si legge come un percorso in
          più, e chi cerca «come si fa il bilancio energetico» ci si perde dentro. */}
      <section className="mt-10 border-t pt-8" data-trasversali="">
        <h2 className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          <Compass className="size-3.5" aria-hidden />
          Il mestiere
        </h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {Object.keys(TRASVERSALI).map((k) => {
            const c = corsoTrasversale(k as keyof typeof TRASVERSALI);
            return (
              <Link
                key={c.chiave}
                href={`/formazione/corso/${c.chiave}`}
                data-corso-trasversale={c.chiave}
                className="group rounded-xl border bg-card p-4 transition-colors hover:bg-accent/40 sm:col-span-2"
              >
                <div className="flex items-start justify-between gap-3">
                  <p className="font-medium leading-tight">{c.nome}</p>
                  <span className="flex shrink-0 items-center gap-1.5 text-[12px] text-muted-foreground">
                    <Clock className="size-3.5" aria-hidden />
                    <span data-slot="kpi">{c.minuti}</span> min
                  </span>
                </div>
                <p className="mt-2 max-w-prose text-[12.5px] leading-relaxed text-muted-foreground">
                  {c.sottotitolo}
                </p>
              </Link>
            );
          })}
        </div>
      </section>
    </div>
  );
}
