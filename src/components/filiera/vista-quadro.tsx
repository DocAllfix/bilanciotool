"use client";

import { fmtNum } from "@/lib/format";
import type { DatiFilieraPieno } from "./types";

// Il quadro della filiera.
//
// ⚠️ La copertura mostrata per prima è quella sulla SPESA, non sul numero di partner. È
// la leva reale: dieci fornitori marginali valutati non compensano il grosso della spesa
// non guardato, e un cruscotto che mostrasse «10 su 12 valutati» racconterebbe una
// filiera sotto controllo mentre il fornitore che vale metà del budget è in bianco.

const ORDINE_RESIDUO = ["Critico", "Alto", "Medio", "Basso"] as const;

const COLORE_RESIDUO: Record<string, string> = {
  Critico: "var(--destructive)",
  Alto: "var(--destructive)",
  Medio: "var(--warning)",
  Basso: "var(--success)",
};

const MESI: Record<string, number> = { Critico: 12, Alto: 24, Medio: 36, Basso: 48 };

export function VistaQuadro({ dati, vai }: { dati: DatiFilieraPieno; vai: (v: string) => void }) {
  const q = dati.quadro;

  const avvisi = [
    {
      n: q.perResiduo.Critico + q.perResiduo.Alto,
      testo: "partner a rischio residuo Critico o Alto",
      vista: "partner",
      grave: true,
    },
    {
      n: q.conCriticheMancanti,
      testo: "partner valutati con un'area critica lasciata in bianco",
      vista: "partner",
      grave: true,
    },
    { n: q.partnerVivi - q.valutati, testo: "partner mappati e non ancora valutati", vista: "partner", grave: false },
    {
      n: q.riesameFatto ? 0 : 1,
      testo: "il riesame dell'efficacia del processo non è stato effettuato",
      vista: "programma",
      grave: false,
    },
  ].filter((a) => a.n > 0);

  return (
    <div className="space-y-8">
      <section aria-label="Copertura della filiera" className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border p-4" data-tour="fil-copertura">
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Copertura sulla spesa</p>
          <p className="mt-1 font-mono text-4xl tabular-nums" data-slot="kpi">
            {q.coperturaSpesa}%
          </p>
          <p className="mt-1 text-[12px] text-muted-foreground">
            {fmtNum(q.spesaCoperta, 0)} € valutati su {fmtNum(q.spesaViva, 0)} €. È la leva reale: dieci
            fornitori marginali non compensano il grosso non guardato.
          </p>
        </div>
        <div className="rounded-xl border p-4">
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Partner valutati</p>
          <p className="mt-1 font-mono text-4xl tabular-nums" data-slot="kpi">
            {q.valutati}
            <span className="text-xl text-muted-foreground">/{q.partnerVivi}</span>
          </p>
          <p className="mt-1 text-[12px] text-muted-foreground">
            {q.coperturaNumero}% del numero.
            {q.cessati > 0 && ` ${q.cessati} rapporti cessati esclusi da ogni conteggio, spesa compresa.`}
          </p>
        </div>
        <div className="rounded-xl border p-4">
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Da verificare entro 24 mesi</p>
          <p className="mt-1 font-mono text-4xl tabular-nums" data-slot="kpi">
            {q.perResiduo.Critico + q.perResiduo.Alto}
          </p>
          <p className="mt-1 text-[12px] text-muted-foreground">
            {q.perResiduo.Critico} a rischio Critico (12 mesi) e {q.perResiduo.Alto} Alto (24 mesi).
          </p>
        </div>
      </section>

      <section aria-label="Distribuzione del rischio residuo">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Distribuzione del rischio residuo
        </h2>
        <ul className="mt-3 divide-y rounded-xl border" data-tour="fil-residuo">
          {ORDINE_RESIDUO.map((r) => {
            const n = q.perResiduo[r] ?? 0;
            const pct = q.valutati ? Math.round((n / q.valutati) * 100) : 0;
            return (
              <li key={r} className="flex items-center gap-3 px-4 py-3">
                <span className="size-2.5 shrink-0 rounded-full" style={{ background: COLORE_RESIDUO[r] }} />
                <span className="w-20 shrink-0 text-[13px] font-medium">{r}</span>
                <span className="w-28 shrink-0 text-[12px] text-muted-foreground">ogni {MESI[r]} mesi</span>
                <span className="min-w-0 flex-1">
                  <span className="block h-1.5 rounded-full bg-muted">
                    <span
                      className="block h-1.5 rounded-full"
                      style={{ width: `${pct}%`, background: COLORE_RESIDUO[r] }}
                    />
                  </span>
                </span>
                <span className="w-8 shrink-0 text-right font-mono text-sm tabular-nums" data-slot="kpi">
                  {n}
                </span>
              </li>
            );
          })}
        </ul>
      </section>

      <section aria-label="Il ciclo OCSE">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Il processo in sei fasi
        </h2>
        <ol className="mt-3 divide-y rounded-xl border" data-tour="fil-fasi">
          {dati.fasi.map((f) => (
            <li key={f.key} className="flex gap-3 px-4 py-3">
              <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-area-filiera/15 font-mono text-[11px] text-area-filiera">
                {f.key}
              </span>
              <div className="min-w-0">
                <p className="text-[13px] font-medium">{f.nome}</p>
                <p className="text-[12px] text-muted-foreground">{f.descrizione}</p>
              </div>
            </li>
          ))}
        </ol>
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
          <ul className="mt-3 divide-y rounded-xl border" data-tour="fil-avvisi">
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
