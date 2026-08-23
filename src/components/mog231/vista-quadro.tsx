"use client";

import { COLORE_LIVELLO, type DatiMog231 } from "./types";

// Il quadro del Modello: dove sei, e cosa manca.
//
// Le tre bande rispondono a tre domande che un consulente si pone aprendo il modulo:
// quanto del Modello è attuato, quali processi sono esposti, cosa non è ancora deciso.
// Gli avvisi in fondo portano alla vista dove si risolvono.

const LIVELLI = ["Critico", "Alto", "Medio", "Basso"] as const;

export function VistaQuadro({ dati, vai }: { dati: DatiMog231; vai: (v: string) => void }) {
  const { pilastri, processi, indicatori: k } = dati;

  const avvisi = [
    { n: k.nonValutati, testo: "scenari mappati ma non ancora valutati", vista: "processi", grave: false },
    { n: k.nonAccettabili, testo: "scenari con rischio residuo non accettabile", vista: "processi", grave: true },
    {
      n: k.applicabiliSenzaScenario,
      testo: "reati applicabili non ricondotti a nessun processo",
      vista: "reati",
      grave: true,
    },
    { n: k.reatiDaDeterminare, testo: "reati con applicabilità da determinare", vista: "reati", grave: false },
    {
      n: k.requisitiTotali - k.requisitiValutati,
      testo: "presidi del Modello non ancora valutati",
      vista: "presidi",
      grave: false,
    },
  ].filter((a) => a.n > 0);

  return (
    <div className="space-y-8">
      <section aria-label="Stato del Modello">
        <div className="grid gap-3 sm:grid-cols-3">
          <Riquadro
            etichetta="Idoneità del Modello"
            valore={dati.idoneita === null ? "—" : `${dati.idoneita}%`}
            nota={`${k.requisitiValutati} presidi valutati su ${k.requisitiTotali}`}
          />
          <Riquadro
            etichetta="Scenari non accettabili"
            valore={String(k.nonAccettabili)}
            nota={`su ${k.scenari} scenari mappati`}
          />
          <Riquadro
            etichetta="Processi sensibili"
            valore={String(k.processi)}
            nota={`${k.reatiApplicabili} reati dichiarati applicabili`}
          />
        </div>
        <p className="mt-2 text-[12px] text-muted-foreground">
          Un presidio dovuto e non ancora valutato pesa zero, e uno scenario non valutato non è accettabile: le
          due cifre dicono quanto del Modello è attuato, non quanto è stato guardato.
        </p>
      </section>

      <section aria-label="Processi per livello di rischio">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Processi sensibili per rischio
        </h2>
        {processi.length === 0 ? (
          <p className="mt-3 rounded-xl border px-4 py-6 text-center text-[13px] text-muted-foreground">
            Nessun processo individuato. L&apos;art. 6 comma 2 lettera a) chiede di individuare le attività nel
            cui ambito i reati possono essere commessi: è da lì che comincia il Modello.
          </p>
        ) : (
          <ul className="mt-3 divide-y rounded-xl border" data-tour="mog-livelli">
            {LIVELLI.map((l) => {
              const n = processi.filter((p) => p.livello === l).length;
              return (
                <li key={l} className="flex items-center gap-3 px-4 py-3">
                  <span className="size-2.5 shrink-0 rounded-full" style={{ background: COLORE_LIVELLO[l] }} />
                  <span className="w-20 text-[13px] font-medium">{l}</span>
                  <span className="font-mono text-sm tabular-nums" data-slot="kpi">
                    {n}
                  </span>
                  <span className="ml-auto truncate text-[12px] text-muted-foreground">
                    {l === "Basso" || l === "Medio"
                      ? "rischio residuo accettabile"
                      : "richiede rafforzamento dei presidi"}
                  </span>
                </li>
              );
            })}
            {processi.some((p) => p.livello === null) && (
              <li className="flex items-center gap-3 px-4 py-3">
                <span className="size-2.5 shrink-0 rounded-full border border-dashed" />
                <span className="w-20 text-[13px] font-medium text-muted-foreground">Non valutati</span>
                <span className="font-mono text-sm tabular-nums" data-slot="kpi">
                  {processi.filter((p) => p.livello === null).length}
                </span>
                <span className="ml-auto truncate text-[12px] text-muted-foreground">
                  nessuno scenario valutato
                </span>
              </li>
            )}
          </ul>
        )}
      </section>

      <section aria-label="Idoneità per pilastro">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Idoneità per pilastro
        </h2>
        <ul className="mt-3 space-y-2" data-tour="mog-pilastri">
          {pilastri.map((p) => (
            <li key={p.key}>
              <button
                type="button"
                onClick={() => vai("presidi")}
                className="flex w-full items-center gap-3 rounded-lg border px-4 py-3 text-left transition-colors hover:bg-accent"
              >
                <span className="w-8 font-mono text-[13px] text-muted-foreground">{p.key}</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13px] font-medium">{p.nome}</span>
                  <span className="block text-[12px] text-muted-foreground">
                    {p.valutati} valutati su {p.requisiti}
                  </span>
                </span>
                <span className="w-28 shrink-0">
                  <span className="block h-1.5 overflow-hidden rounded-full bg-muted">
                    <span
                      className="block h-full rounded-full bg-area-responsabilita"
                      style={{ width: `${p.idoneita}%` }}
                    />
                  </span>
                </span>
                <span className="w-12 shrink-0 text-right font-mono text-[13px] tabular-nums" data-slot="kpi">
                  {p.idoneita}%
                </span>
              </button>
            </li>
          ))}
        </ul>
      </section>

      {avvisi.length > 0 && (
        <section aria-label="Cosa richiede attenzione">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Da guardare</h2>
          <ul className="mt-3 space-y-2" data-tour="mog-avvisi">
            {avvisi.map((a) => (
              <li key={a.testo}>
                <button
                  type="button"
                  onClick={() => vai(a.vista)}
                  className="flex w-full items-center gap-3 rounded-lg border px-4 py-3 text-left transition-colors hover:bg-accent"
                >
                  <span
                    className={
                      "font-mono text-sm tabular-nums " + (a.grave ? "text-destructive" : "text-muted-foreground")
                    }
                    data-slot="kpi"
                  >
                    {a.n}
                  </span>
                  <span className="text-[13px]">{a.testo}</span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function Riquadro({ etichetta, valore, nota }: { etichetta: string; valore: string; nota: string }) {
  return (
    <div className="rounded-xl border p-4">
      <p className="text-[12px] text-muted-foreground">{etichetta}</p>
      <p className="mt-1 font-display text-2xl font-semibold tabular-nums" data-slot="kpi">
        {valore}
      </p>
      <p className="mt-0.5 text-[12px] text-muted-foreground">{nota}</p>
    </div>
  );
}
