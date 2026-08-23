"use client";

import { COLORE_LIVELLO, type DatiAnticorruzione } from "./types";

// Il quadro del sistema: dove sei, e cosa manca.
//
// Non è un cruscotto di vanità. Le tre bande rispondono a tre domande che un consulente
// si pone aprendo il modulo: quanto del sistema è attuato, a quali rapporti siamo
// esposti, cosa è scaduto. Gli avvisi in fondo sono azionabili — ognuno porta alla vista
// dove si risolve.

const LIVELLI = ["Critico", "Alto", "Medio", "Basso"] as const;

export function VistaQuadro({ dati, vai }: { dati: DatiAnticorruzione; vai: (v: string) => void }) {
  const { capitoli, soci, indicatori: k } = dati;
  const attivi = soci.filter((s) => s.stato !== "Cessato");
  const pctObblighi = k.obblighiApplicabili ? Math.round((k.obblighiAssolti / k.obblighiApplicabili) * 100) : null;

  const avvisi = [
    {
      n: k.senzaLivello,
      testo: "rapporti senza livello di rischio determinato",
      vista: "soci",
      grave: false,
    },
    { n: k.conObblighiAperti, testo: "rapporti sopra la soglia con obblighi non assolti", vista: "soci", grave: true },
    { n: k.ddScadute, testo: "due diligence scadute", vista: "soci", grave: true },
    {
      n: k.requisitiTotali - k.requisitiValutati,
      testo: "requisiti della norma non ancora valutati",
      vista: "requisiti",
      grave: false,
    },
  ].filter((a) => a.n > 0);

  return (
    <div className="space-y-8">
      <section aria-label="Stato del sistema">
        <div className="grid gap-3 sm:grid-cols-3">
          <Riquadro
            etichetta="Conformità alla norma"
            valore={dati.conformita === null ? "—" : `${dati.conformita}%`}
            nota={`${k.requisitiValutati} requisiti valutati su ${k.requisitiTotali}`}
          />
          <Riquadro
            etichetta="Obblighi assolti"
            valore={pctObblighi === null ? "—" : `${pctObblighi}%`}
            nota={`${k.obblighiAssolti} su ${k.obblighiApplicabili} applicabili`}
          />
          <Riquadro
            etichetta="Rapporti sopra la soglia"
            valore={String(k.sopraSoglia)}
            nota={`su ${k.sociAttivi} rapporti attivi`}
          />
        </div>
        <p className="mt-2 text-[12px] text-muted-foreground">
          Un requisito applicabile e non ancora valutato pesa zero: la percentuale dice quanto del sistema è
          attuato, non quanto è stato guardato.
        </p>
      </section>

      <section aria-label="Esposizione per livello di rischio">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Esposizione</h2>
        <ul className="mt-3 divide-y rounded-xl border" data-tour="pc-livelli">
          {LIVELLI.map((l) => {
            const n = attivi.filter((s) => s.livello === l).length;
            return (
              <li key={l} className="flex items-center gap-3 px-4 py-3">
                <span className="size-2.5 shrink-0 rounded-full" style={{ background: COLORE_LIVELLO[l] }} />
                <span className="w-20 text-[13px] font-medium">{l}</span>
                <span className="font-mono text-sm tabular-nums" data-slot="kpi">
                  {n}
                </span>
                <span className="ml-auto truncate text-[12px] text-muted-foreground">
                  {l === "Basso"
                    ? "sotto la soglia: nessun obbligo aggiuntivo"
                    : "due diligence, politica, impegni, clausole, controlli"}
                </span>
              </li>
            );
          })}
          {k.senzaLivello > 0 && (
            <li className="flex items-center gap-3 px-4 py-3">
              <span className="size-2.5 shrink-0 rounded-full border border-dashed" />
              <span className="w-20 text-[13px] font-medium text-muted-foreground">Non valutati</span>
              <span className="font-mono text-sm tabular-nums" data-slot="kpi">
                {k.senzaLivello}
              </span>
              <span className="ml-auto truncate text-[12px] text-muted-foreground">
                finché il livello manca, nessun obbligo è dovuto
              </span>
            </li>
          )}
        </ul>
      </section>

      <section aria-label="Conformità per capitolo">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Conformità per capitolo della norma
        </h2>
        <ul className="mt-3 space-y-2" data-tour="pc-capitoli">
          {capitoli.map((c) => (
            <li key={c.key}>
              <button
                type="button"
                onClick={() => vai("requisiti")}
                className="flex w-full items-center gap-3 rounded-lg border px-4 py-3 text-left transition-colors hover:bg-accent"
              >
                <span className="w-6 font-mono text-[13px] text-muted-foreground">{c.key}</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13px] font-medium">{c.nome}</span>
                  <span className="block text-[12px] text-muted-foreground">
                    {c.valutati} valutati su {c.requisiti}
                  </span>
                </span>
                <span className="w-28 shrink-0">
                  <span className="block h-1.5 overflow-hidden rounded-full bg-muted">
                    <span
                      className="block h-full rounded-full bg-area-responsabilita"
                      style={{ width: `${c.conformita}%` }}
                    />
                  </span>
                </span>
                <span className="w-12 shrink-0 text-right font-mono text-[13px] tabular-nums" data-slot="kpi">
                  {c.conformita}%
                </span>
              </button>
            </li>
          ))}
        </ul>
      </section>

      {avvisi.length > 0 && (
        <section aria-label="Cosa richiede attenzione">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Da guardare</h2>
          <ul className="mt-3 space-y-2" data-tour="pc-avvisi">
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
