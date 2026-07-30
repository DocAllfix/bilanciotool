"use client";

import { cn } from "@/lib/utils";

// IL DECK — la firma visiva dell'hero: la pila dei documenti che il consulente
// consegna davvero. Tre livelli: copertina del bilancio (serif, blu-notte),
// matrice di materialità, card KPI dell'inventario. Tilt sottile all'hover,
// disattivato con prefers-reduced-motion (via media query CSS).

const PUNTI_MATRICE = [
  { x: 4, y: 4, c: "var(--esg-e)", m: true },
  { x: 3, y: 4, c: "var(--esg-e)", m: true },
  { x: 4, y: 5, c: "var(--esg-s)", m: true },
  { x: 4.6, y: 4, c: "var(--esg-s)", m: true },
  { x: 3, y: 3, c: "var(--esg-g)", m: true },
  { x: 2, y: 2, c: "var(--esg-e)", m: false },
  { x: 1.4, y: 2, c: "var(--esg-s)", m: false },
  { x: 3, y: 2, c: "var(--esg-g)", m: false },
];

export function HeroDeck() {
  return (
    <div
      className="group relative mx-auto h-[420px] w-full max-w-[460px] select-none motion-safe:[perspective:1200px]"
      aria-hidden
    >
      {/* velatura petrolio dietro il deck */}
      <div className="absolute -inset-10 -z-10 rounded-full bg-primary/10 blur-3xl" />

      {/* Livello 3 — card KPI inventario */}
      <div
        className={cn(
          "absolute -right-2 top-0 z-0 w-56 rounded-xl border bg-card p-4 shadow-lg",
          "motion-safe:transition-transform motion-safe:duration-500 motion-safe:[transform:rotate(4deg)] motion-safe:group-hover:[transform:rotate(6deg)_translateX(6px)]",
        )}
      >
        <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Inventario GHG · 2025</p>
        <p className="mt-1.5 text-2xl font-semibold tracking-tight" data-slot="kpi">264,05 <span className="text-sm font-normal text-muted-foreground">tCO₂e</span></p>
        <div className="mt-3 space-y-1.5">
          {[
            ["Scope 1 · dirette", "40%", "var(--scope-1)"],
            ["Scope 2 · energia", "59%", "var(--scope-2)"],
            ["Scope 3 · indirette", "2%", "var(--scope-3)"],
          ].map(([n, w, c]) => (
            <div key={n as string}>
              <div className="flex justify-between text-[10px] text-muted-foreground"><span>{n}</span></div>
              <div className="h-1.5 rounded-full bg-muted">
                <div className="h-full rounded-full" style={{ width: w as string, background: c as string }} />
              </div>
            </div>
          ))}
        </div>
        <p className="mt-3 border-t pt-2 text-[10px] text-muted-foreground">± 4,4% · qualità del dato 4,1/5</p>
      </div>

      {/* Livello 2 — matrice di materialità (in primo piano, angolo basso-sinistra:
          il ventaglio del deck, ogni carta deve spuntare davvero) */}
      <div
        className={cn(
          "absolute right-0 top-60 z-20 w-44 rounded-xl border bg-card p-4 shadow-xl",
          "motion-safe:transition-transform motion-safe:duration-500 motion-safe:[transform:rotate(3deg)] motion-safe:group-hover:[transform:rotate(5deg)_translateX(8px)]",
        )}
      >
        <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Doppia rilevanza</p>
        <svg viewBox="0 0 100 84" className="mt-2 w-full">
          <rect x="50" y="0" width="50" height="84" fill="var(--accent)" />
          <rect x="0" y="0" width="100" height="42" fill="var(--accent)" />
          <line x1="50" y1="0" x2="50" y2="84" stroke="var(--primary)" strokeDasharray="3 2" strokeWidth="1" />
          <line x1="0" y1="42" x2="100" y2="42" stroke="var(--primary)" strokeDasharray="3 2" strokeWidth="1" />
          {PUNTI_MATRICE.map((p, i) => (
            <circle key={i} cx={p.x * 18} cy={84 - p.y * 15} r={p.m ? 4.5 : 3} fill={p.c} opacity={p.m ? 0.9 : 0.35} />
          ))}
        </svg>
        <p className="mt-1.5 text-[10px] text-muted-foreground" data-slot="kpi">8 temi materiali su 18</p>
      </div>

      {/* Livello 1 — copertina del bilancio (il documento) */}
      <div
        className={cn(
          "absolute left-[42%] top-10 z-10 h-90 w-64 -translate-x-1/2 overflow-hidden rounded-lg shadow-2xl",
          "motion-safe:transition-transform motion-safe:duration-500 motion-safe:group-hover:[transform:translateX(-50%)_translateY(-6px)]",
          "[transform:translateX(-50%)]",
        )}
        style={{ background: "oklch(0.22 0.03 230)" }}
      >
        <div className="flex h-full flex-col p-6 text-white">
          <div className="ml-auto rounded bg-white/95 px-2 py-1 text-[9px] font-semibold tracking-tight text-[oklch(0.24_0.028_240)]">
            Meccanica Adriatica
          </div>
          <div className="mt-auto">
            <p className="text-[8px] uppercase tracking-[0.22em] text-white/70">Bilancio di sostenibilità · 2025</p>
            <p className="mt-2 font-serif text-[22px] leading-tight" style={{ fontFamily: "Georgia, serif" }}>
              Meccanica<br />Adriatica S.r.l.
            </p>
            <p className="mt-1.5 text-[9px] text-white/75">Componenti meccanici di precisione · Bari</p>
            <p className="mt-4 text-[8px] text-white/60">Redatto secondo GRI 2021 · ISO 14064-1</p>
          </div>
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-primary" />
      </div>

      {/* timbro versione */}
      <div className="absolute bottom-0 right-6 z-20 rounded-full border bg-card px-3 py-1.5 text-[10px] font-medium shadow-md">
        <span className="text-success">●</span> v1 pubblicata · immutabile
      </div>
    </div>
  );
}
