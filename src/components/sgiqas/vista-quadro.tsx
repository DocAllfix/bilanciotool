"use client";

import { COLORE_STATO, NOME_STATO, type DatiSgiQas } from "./types";

// Il quadro del sistema integrato: dove sei, e cosa manca.

export function VistaQuadro({ dati, vai }: { dati: DatiSgiQas; vai: (v: string) => void }) {
  const k = dati.conformita;
  const ind = dati.indicatori;

  const avvisi = [
    { n: ind.filter((i) => i.stato === "no").length, testo: "indicatori fuori soglia", vista: "indicatori", grave: true },
    {
      n: ind.filter((i) => !i.ultimo).length,
      testo: "indicatori senza alcuna rilevazione",
      vista: "indicatori",
      grave: false,
    },
    // ⚠️ Nel prototipo questi risultavano «a target», perché il target vuoto veniva letto
    // come target zero. Qui sono una lacuna dichiarata, ed è il punto.
    {
      n: ind.filter((i) => i.target === null).length,
      testo: "indicatori senza target definito",
      vista: "indicatori",
      grave: false,
    },
    {
      n: dati.stati.filter((s) => s.stato === "Non conforme").length,
      testo: "requisiti valutati non conformi",
      vista: "requisiti",
      grave: true,
    },
    {
      n: k.totale - k.valutati,
      testo: "requisiti nel perimetro non ancora valutati",
      vista: "requisiti",
      grave: false,
    },
  ].filter((a) => a.n > 0);

  return (
    <div className="space-y-8">
      <section aria-label="Stato del sistema">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Riquadro
            etichetta="Conformità complessiva"
            valore={k.indice === null ? "—" : `${k.indice}%`}
            nota={`${k.valutati} requisiti su ${k.totale} nel perimetro`}
          />
          <Riquadro
            etichetta="Norme nel perimetro"
            valore={String(dati.sistema.norme.length)}
            nota={k.perNorma.map((n) => n.norma.norma).join(" · ") || "nessuna"}
          />
          <Riquadro
            etichetta="Indicatori"
            valore={String(ind.length)}
            nota={`${ind.filter((i) => i.stato === "ok").length} a target`}
          />
          <Riquadro
            etichetta="Non conformità aperte"
            valore={String(dati.stati.filter((s) => s.stato === "Non conforme").length)}
            nota="requisiti valutati non conformi"
          />
        </div>
        <p className="mt-2 text-[12px] text-muted-foreground">
          L&apos;indice si calcola sui soli requisiti nel perimetro: un requisito applicabile e non ancora
          valutato pesa zero, «non applicabile» esce invece dal conto.
        </p>
      </section>

      <section aria-label="Conformità per norma">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Conformità per norma
        </h2>
        <ul className="mt-3 divide-y rounded-xl border" data-tour="qas-per-norma">
          {k.perNorma.map((n) => (
            <li key={n.norma.key} className="flex items-center gap-3 px-4 py-3">
              <span className="w-32 shrink-0 text-[13px] font-medium">{n.norma.norma}</span>
              <span className="hidden w-24 shrink-0 text-[12px] text-muted-foreground sm:inline">{n.norma.nome}</span>
              <span className="shrink-0 text-[12px] text-muted-foreground">
                {n.valutati}/{n.requisiti}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block h-1.5 rounded-full bg-muted">
                  <span
                    className="block h-1.5 rounded-full"
                    style={{
                      width: `${n.indice}%`,
                      background:
                        n.indice > 79 ? "var(--success)" : n.indice > 39 ? "var(--warning)" : "var(--destructive)",
                    }}
                  />
                </span>
              </span>
              <span className="w-12 shrink-0 text-right font-mono text-sm tabular-nums" data-slot="kpi">
                {n.indice}%
              </span>
            </li>
          ))}
        </ul>
      </section>

      {ind.length > 0 && (
        <section aria-label="Indicatori">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Indicatori</h2>
            <button className="text-[12px] underline underline-offset-2" onClick={() => vai("indicatori")}>
              Tutti gli indicatori
            </button>
          </div>
          <ul className="mt-3 divide-y rounded-xl border">
            {ind.slice(0, 8).map((i) => (
              <li key={i.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                <span className="w-16 shrink-0 font-mono text-[12px] text-muted-foreground">{i.codice ?? "—"}</span>
                <span className="min-w-0 flex-1 truncate text-[13px]">{i.nome}</span>
                <span className="shrink-0 font-mono text-[13px] tabular-nums">
                  {i.ultimo?.valore ?? "—"}
                  {i.um ? ` ${i.um}` : ""}
                </span>
                <span className="inline-flex shrink-0 items-center gap-1.5 text-[12px]">
                  <span className="size-2 rounded-full" style={{ background: COLORE_STATO[i.stato] }} />
                  <span className="text-muted-foreground">{NOME_STATO[i.stato]}</span>
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section aria-label="Posizioni da presidiare">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Posizioni da presidiare
        </h2>
        {avvisi.length === 0 ? (
          <p className="mt-3 rounded-xl border px-4 py-6 text-center text-[13px] text-muted-foreground">
            Nessuna posizione aperta.
          </p>
        ) : (
          <ul className="mt-3 divide-y rounded-xl border" data-tour="qas-avvisi">
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

function Riquadro({ etichetta, valore, nota }: { etichetta: string; valore: string; nota: string }) {
  return (
    <div className="rounded-xl border px-4 py-3">
      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{etichetta}</p>
      <p className="mt-1 font-mono text-2xl tabular-nums" data-slot="kpi">
        {valore}
      </p>
      <p className="mt-0.5 text-[12px] text-muted-foreground">{nota}</p>
    </div>
  );
}
