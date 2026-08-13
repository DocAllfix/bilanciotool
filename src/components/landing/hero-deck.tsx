"use client";

import { cn } from "@/lib/utils";

// IL DECK — la firma visiva dell'hero: la pila dei documenti che il consulente
// consegna davvero. Tre livelli: copertina del bilancio (serif, blu-notte),
// matrice di materialità, card KPI dell'inventario.
//
// ─────────────────────────────────────────────────────────────────────────────
// PERCHÉ TUTTO È IN `em` E NON IN PIXEL
//
// È una composizione: tre carte a incastro, in posizioni assolute studiate una
// rispetto all'altra. Con misure fisse in pixel funziona a una larghezza sola —
// quella per cui è stata disegnata — e sotto quella non si stringe, si TAGLIA.
// Da telefono la copertina finiva novantacinque pixel fuori dallo schermo a
// sinistra: il nome dell'azienda si leggeva «…anica …tica S.r.l.», e la prima
// cosa che il prodotto mostrava di sé era una cosa rotta.
//
// Qui il contenitore dichiara `@container` e la radice del deck prende una
// dimensione del carattere proporzionale alla larghezza disponibile
// (`min(10px, 2.174cqw)`, cioè 10px alla larghezza di progetto di 460px e meno
// sotto). Ogni misura interna è espressa in `em`, quindi l'intera composizione
// si rimpicciolisce mantenendo esattamente le stesse proporzioni. Nessun
// JavaScript, nessun punto di rottura da indovinare, e a 320px come a 460px il
// disegno è lo stesso, solo più piccolo.
//
// Una nota sul difetto di partenza, perché è istruttivo: la copertina portava
// `-translate-x-1/2` (proprietà `translate`) E `[transform:translateX(-50%)]`
// (proprietà `transform`). Sono due proprietà distinte, si sommavano, e lo
// spostamento era del doppio. Da desktop quell'errore SEMBRAVA il disegno giusto
// — spostava la copertina a sinistra e liberava la card dei numeri — mentre da
// telefono la buttava fuori schermo. Qui le tre carte sono posizionate una per
// una, senza centrature da correggere: la composizione che si vede è quella
// scritta, a ogni larghezza.
// ─────────────────────────────────────────────────────────────────────────────

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

/** Larghezza per cui la composizione è disegnata: sotto, si scala; sopra, si ferma. */
const BASE = "min(10px, 1.887cqw)";

export function HeroDeck() {
  return (
    <div className="@container mx-auto w-full max-w-[530px]" aria-hidden>
      <div
        className="group relative mx-auto h-[44em] w-[53em] select-none motion-safe:[perspective:1200px]"
        style={{ fontSize: BASE }}
      >
        {/* velatura petrolio dietro il deck */}
        <div className="absolute -inset-[4em] -z-10 rounded-full bg-primary/10 blur-3xl" />

        {/* Livello 3 — card KPI inventario */}
        <div
          className={cn(
            "absolute left-[30.6em] top-0 z-0 w-[22.4em] rounded-[1.2em] border bg-card p-[1.6em] shadow-lg",
            "motion-safe:transition-transform motion-safe:duration-500 motion-safe:[transform:rotate(4deg)] motion-safe:group-hover:[transform:rotate(6deg)_translateX(0.6em)]",
          )}
        >
          <p className="text-[1em] font-semibold uppercase tracking-wide text-muted-foreground">
            Inventario GHG · 2025
          </p>
          <p className="mt-[0.6em] text-[2.4em] font-semibold leading-none tracking-tight" data-slot="kpi">
            264,05 <span className="text-[0.58em] font-normal text-muted-foreground">tCO₂e</span>
          </p>
          <div className="mt-[1.2em] space-y-[0.6em]">
            {[
              ["Scope 1 · dirette", "40%", "var(--scope-1)"],
              ["Scope 2 · energia", "59%", "var(--scope-2)"],
              ["Scope 3 · indirette", "2%", "var(--scope-3)"],
            ].map(([n, w, c]) => (
              <div key={n as string}>
                <div className="flex justify-between text-[1em] text-muted-foreground">
                  <span>{n}</span>
                </div>
                <div className="h-[0.6em] rounded-full bg-muted">
                  <div className="h-full rounded-full" style={{ width: w as string, background: c as string }} />
                </div>
              </div>
            ))}
          </div>
          <p className="mt-[1.2em] border-t pt-[0.8em] text-[1em] text-muted-foreground">
            ± 4,4% · qualità del dato 4,1/5
          </p>
        </div>

        {/* Livello 2 — matrice di materialità: il ventaglio del deck, ogni carta
            deve spuntare davvero */}
        <div
          className={cn(
            "absolute left-[29em] top-[23em] z-20 w-[17.6em] rounded-[1.2em] border bg-card p-[1.6em] shadow-xl",
            "motion-safe:transition-transform motion-safe:duration-500 motion-safe:[transform:rotate(3deg)] motion-safe:group-hover:[transform:rotate(5deg)_translateX(0.8em)]",
          )}
        >
          <p className="text-[1em] font-semibold uppercase tracking-wide text-muted-foreground">Doppia rilevanza</p>
          <svg viewBox="0 0 100 84" className="mt-[0.8em] w-full">
            <rect x="50" y="0" width="50" height="84" fill="var(--accent)" />
            <rect x="0" y="0" width="100" height="42" fill="var(--accent)" />
            <line x1="50" y1="0" x2="50" y2="84" stroke="var(--primary)" strokeDasharray="3 2" strokeWidth="1" />
            <line x1="0" y1="42" x2="100" y2="42" stroke="var(--primary)" strokeDasharray="3 2" strokeWidth="1" />
            {PUNTI_MATRICE.map((p, i) => (
              <circle key={i} cx={p.x * 18} cy={84 - p.y * 15} r={p.m ? 4.5 : 3} fill={p.c} opacity={p.m ? 0.9 : 0.35} />
            ))}
          </svg>
          <p className="mt-[0.6em] text-[1em] text-muted-foreground" data-slot="kpi">
            8 temi materiali su 18
          </p>
        </div>

        {/* Livello 1 — copertina del bilancio (il documento) */}
        <div
          className={cn(
            "absolute left-0 top-[4em] z-10 h-[36em] w-[25.6em] overflow-hidden rounded-[0.8em] shadow-2xl",
            "motion-safe:transition-transform motion-safe:duration-500 motion-safe:group-hover:[transform:translateY(-0.6em)]",
          )}
          style={{ background: "oklch(0.22 0.03 230)" }}
        >
          <div className="flex h-full flex-col p-[2.4em] text-white">
            <div className="ml-auto rounded-[0.4em] bg-white/95 px-[0.8em] py-[0.4em] text-[0.9em] font-semibold tracking-tight text-[oklch(0.24_0.028_240)]">
              Meccanica Adriatica
            </div>
            <div className="mt-auto">
              <p className="text-[0.8em] uppercase tracking-[0.22em] text-white/70">
                Bilancio di sostenibilità e conformità ESG · 2025
              </p>
              <p className="mt-[0.8em] text-[2.2em] leading-tight" style={{ fontFamily: "Georgia, serif" }}>
                Meccanica
                <br />
                Adriatica S.r.l.
              </p>
              <p className="mt-[0.6em] text-[0.9em] text-white/75">Componenti meccanici di precisione · Bari</p>
              <p className="mt-[1.6em] text-[0.8em] text-white/60">Redatto secondo GRI 2021 · ISO 14064-1</p>
            </div>
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-[0.6em] bg-primary" />
        </div>

        {/* timbro versione */}
        <div className="absolute bottom-0 left-0 z-20 rounded-full border bg-card px-[1.2em] py-[0.6em] text-[1em] font-medium shadow-md">
          <span className="text-success">●</span> v1 pubblicata · immutabile
        </div>
      </div>
    </div>
  );
}
