import type { Metadata } from "next";
import Link from "next/link";
import { Clock, Compass } from "lucide-react";

import { MODULI_PER_AREA } from "@/features/companies/moduli";
import { corsoDelModulo, TRASVERSALI, corsoTrasversale } from "@/features/formazione";
import { SchedaFormazione } from "@/components/formazione/scheda";
import { RISULTATO_TRASVERSALE } from "@/features/formazione/risultati";
import { tempoDaDedicare, formattaDurata } from "@/features/formazione/tempo";

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
      {/* ⚠️ L'apertura dice il RITORNO, non l'argomento, ed è la stessa leva delle schede.
          «Un corso per percorso» descrive l'inventario; dire che si ascoltano mentre si
          lavora, e che si può cominciare da metà, dice a chi legge che cosa ci guadagna.
          Niente banda a piena larghezza né numeri giganti: il registro resta quello del
          prodotto, cambia il ritmo. */}
      <h1 className="font-display text-[30px] font-bold leading-tight tracking-[-0.02em]">Formazione</h1>
      <p className="mt-2 max-w-[62ch] text-[15px] leading-relaxed text-foreground/75">
        Un corso per ogni percorso, scritto da chi lo ha costruito: dove si prendono i dati, che cosa
        chiede chi verifica, e gli errori che costano una settimana. Si possono <strong className="font-semibold text-foreground">ascoltare</strong>{" "}
        mentre lavori, e si comincia anche da metà.
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
                    <span data-slot="kpi">{formattaDurata(tempoDaDedicare(c.minuti))}</span>
                  </span>
                </div>
                <p className="mt-2 max-w-[70ch] text-[13.5px] leading-relaxed text-foreground/75">
                  {RISULTATO_TRASVERSALE[c.chiave] ?? c.sottotitolo}
                </p>
              </Link>
            );
          })}
        </div>
      </section>
    </div>
  );
}
