import type { Metadata } from "next";
import Link from "next/link";
import { Clock, Compass } from "lucide-react";

import { MODULI_PER_AREA } from "@/features/companies/moduli";
import { corsoDelModulo, TRASVERSALI, corsoTrasversale } from "@/features/formazione";
import { SchedaFormazione } from "@/components/formazione/scheda";

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
            {/* ⚠️ Il colore dell'area sull'INTESTAZIONE, non sulle schede. Colorare dodici
                riquadri renderebbe la pagina un campionario; colorare i tre titoli dice la
                stessa cosa una volta per gruppo, e il filo continua sotto a legare le
                schede che gli appartengono. Il colore resta quello del registro: qui non
                se ne inventa nessuno. */}
            <h2
              className={`flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider ${g.colore.tenue.split(" ").filter((c) => c.startsWith("text-")).join(" ")}`}
            >
              <span className={`size-2 shrink-0 rounded-full ${g.colore.tratto}`} aria-hidden />
              {g.nome}
              <span className={`h-px flex-1 ${g.colore.tratto} opacity-25`} aria-hidden />
            </h2>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              {g.moduli.map((m) => (
                <SchedaFormazione key={m.href} corso={corsoDelModulo(m.href)} />
              ))}
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
