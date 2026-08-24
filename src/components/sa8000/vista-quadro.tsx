"use client";

import type { DatiSa8000 } from "./types";

// Il quadro SA8000/2026: il completamento, e da dove viene.
//
// ⚠️ Il numero grande è una media PESATA su cinque voci, e la pagina lo scompone invece
// di mostrarlo e basta. Un consulente che vede «54%» e non sa da dove viene non sa dove
// intervenire — e le cinque voci non pesano uguale: le procedure valgono il doppio della
// modulistica.

export function VistaQuadro({ dati, vai }: { dati: DatiSa8000; vai: (v: string) => void }) {
  const c = dati.completamento;
  const d = dati.dettaglio;

  const voci = [
    { k: "Anagrafica del sistema", peso: 15, valore: c.anagrafica, dettaglio: `${d.anagraficaCompilati} campi su ${d.anagraficaTotale}`, vista: "anagrafica" },
    { k: "Procedure approvate", peso: 30, valore: c.procedure, dettaglio: `${d.procedure.approvati} su ${d.procedure.applicabili} applicabili`, vista: "procedure" },
    { k: "Modulistica approvata", peso: 15, valore: c.moduli, dettaglio: `${d.moduli.approvati} su ${d.moduli.applicabili} applicabili`, vista: "moduli" },
    { k: "Criteri attuati", peso: 25, valore: c.criteri, dettaglio: `${d.criteriAttuati} su ${d.criteriTotali}`, vista: "criteri" },
    { k: "Registri avviati", peso: 15, valore: c.registri, dettaglio: `${d.registri.pieni} su ${d.registri.totale}`, vista: "registri" },
  ];

  const avvisi = [
    { n: d.criteriNonAttuati, testo: "criteri dichiarati non attuati", vista: "criteri", grave: true },
    { n: d.criteriTotali - d.criteriValutati, testo: "criteri non ancora valutati", vista: "criteri", grave: false },
    { n: d.procedure.applicabili - d.procedure.approvati, testo: "procedure non ancora approvate", vista: "procedure", grave: false },
    { n: d.registri.totale - d.registri.pieni, testo: "registri senza nessuna registrazione", vista: "registri", grave: false },
    { n: d.anagraficaTotale - d.anagraficaCompilati, testo: "campi dell'anagrafica da compilare", vista: "anagrafica", grave: false },
  ].filter((a) => a.n > 0);

  return (
    <div className="space-y-8">
      <section aria-label="Completamento del sistema">
        <div className="rounded-xl border p-4">
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Completamento del sistema</p>
          <p className="mt-1 font-mono text-4xl tabular-nums" data-slot="kpi">
            {c.totale}%
          </p>
          <p className="mt-1 text-[12px] text-muted-foreground">
            Media pesata di cinque voci. Ciò che è dichiarato <strong>non applicabile</strong> esce dal
            denominatore; ciò che non è ancora stato guardato conta come zero.
          </p>
        </div>
      </section>

      <section aria-label="Da dove viene il punteggio">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Da dove viene il punteggio
        </h2>
        <ul className="mt-3 divide-y rounded-xl border" data-tour="sa-voci">
          {voci.map((v) => (
            <li key={v.k} className="flex flex-wrap items-center gap-3 px-4 py-3">
              <button
                className="w-56 shrink-0 text-left text-[13px] font-medium underline underline-offset-2"
                onClick={() => vai(v.vista)}
              >
                {v.k}
              </button>
              <span className="w-12 shrink-0 font-mono text-[11px] text-muted-foreground">{v.peso}%</span>
              <span className="hidden w-40 shrink-0 text-[12px] text-muted-foreground sm:inline">{v.dettaglio}</span>
              <span className="min-w-0 flex-1">
                <span className="block h-1.5 rounded-full bg-muted">
                  <span
                    className="block h-1.5 rounded-full"
                    style={{
                      width: `${v.valore}%`,
                      background:
                        v.valore > 79 ? "var(--success)" : v.valore > 39 ? "var(--warning)" : "var(--destructive)",
                    }}
                  />
                </span>
              </span>
              <span className="w-12 shrink-0 text-right font-mono text-sm tabular-nums" data-slot="kpi">
                {v.valore}%
              </span>
            </li>
          ))}
        </ul>
        <p className="mt-2 text-[12px] text-muted-foreground">
          Le procedure pesano il doppio della modulistica: una procedura è il sistema, un modulo è il foglio che
          la applica.
        </p>
      </section>

      <section aria-label="Attuazione per sezione">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Attuazione per sezione
        </h2>
        <ul className="mt-3 divide-y rounded-xl border" data-tour="sa-sezioni">
          {dati.perSezione.map((s) => (
            <li key={s.sezione.key} className="flex items-center gap-3 px-4 py-3">
              <span className="w-6 shrink-0 font-mono text-sm font-semibold">{s.sezione.key}</span>
              <span className="min-w-0 flex-1 truncate text-[13px]">{s.sezione.nome}</span>
              <span className="shrink-0 text-[12px] text-muted-foreground">
                {s.valutati}/{s.criteri}
              </span>
              <span className="w-12 shrink-0 text-right font-mono text-sm tabular-nums" data-slot="kpi">
                {s.percentuale}%
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section aria-label="Posizioni da presidiare">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Posizioni da presidiare
        </h2>
        {avvisi.length === 0 ? (
          <p className="mt-3 rounded-xl border px-4 py-6 text-center text-[13px] text-muted-foreground">
            Nessuna posizione aperta.
          </p>
        ) : (
          <ul className="mt-3 divide-y rounded-xl border" data-tour="sa-avvisi">
            {avvisi.map((a) => (
              <li key={a.testo} className="flex items-center gap-3 px-4 py-3">
                <span
                  className="size-2.5 shrink-0 rounded-full"
                  style={{ background: a.grave ? "var(--destructive)" : "var(--warning)" }}
                />
                <span className="font-mono text-sm tabular-nums" data-slot="kpi">
                  {a.n}
                </span>
                <button
                  className="min-w-0 flex-1 truncate text-left text-[13px] underline underline-offset-2"
                  onClick={() => vai(a.vista)}
                >
                  {a.testo}
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
