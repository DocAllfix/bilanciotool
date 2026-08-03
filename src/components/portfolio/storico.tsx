import type { SerieStorica } from "@/features/companies/storico";
import { fmtNum } from "@/lib/format";

// Andamento nel tempo: SVG resi dal server, non una libreria di grafici.
//
// Sono quattro serie di pochi punti, senza interazione: una libreria client
// costerebbe JavaScript scaricato e idratato per disegnare cinque segmenti, e
// questa è una pagina che deve aprirsi subito. I grafici interattivi restano
// dentro i moduli, dove servono davvero.

const L = 260; // larghezza dell'area di disegno
const H = 64; // altezza
const PAD = 6;

function percorso(valori: number[]): { d: string; punti: { x: number; y: number }[] } {
  const min = Math.min(...valori);
  const max = Math.max(...valori);
  // Serie piatta: si disegna a metà altezza invece di dividere per zero.
  const span = max - min || 1;
  const punti = valori.map((v, i) => ({
    x: PAD + (i * (L - PAD * 2)) / Math.max(1, valori.length - 1),
    y: max === min ? H / 2 : H - PAD - ((v - min) / span) * (H - PAD * 2),
  }));
  return { d: punti.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" "), punti };
}

function variazione(punti: { valore: number }[]): { pct: number; verso: "su" | "giu" | "fermo" } | null {
  const primo = punti[0].valore;
  const ultimo = punti[punti.length - 1].valore;
  if (primo === 0) return null;
  const pct = ((ultimo - primo) / Math.abs(primo)) * 100;
  return { pct, verso: Math.abs(pct) < 0.05 ? "fermo" : pct > 0 ? "su" : "giu" };
}

export function Storico({ serie }: { serie: SerieStorica[] }) {
  if (serie.length === 0) return null;
  return (
    <div className="mt-10">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Andamento</h2>
      <p className="mt-1 text-[13px] text-muted-foreground">
        Letto dai documenti pubblicati, non dai dati di lavoro: sono i numeri che il cliente ha in mano.
      </p>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        {serie.map((s) => {
          const valori = s.punti.map((p) => p.valore);
          const { d, punti } = percorso(valori);
          const v = variazione(s.punti);
          const ultimo = s.punti[s.punti.length - 1];
          return (
            <figure key={s.tipo} className="rounded-xl border p-4">
              <figcaption className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                <span className="text-[13px] font-medium">{s.titolo}</span>
                <span className="text-[11px] text-muted-foreground">
                  {s.perEsercizio
                    ? `${s.punti[0].x}–${ultimo.x}`
                    : `${s.punti.length} revisioni`}
                </span>
              </figcaption>
              <p className="mt-1.5 flex items-baseline gap-2">
                <span className="text-[22px] font-semibold tracking-tight" data-slot="kpi">
                  {fmtNum(String(ultimo.valore), s.unita === "/100" ? 0 : 1)}
                </span>
                <span className="text-[12px] text-muted-foreground">{s.unita}</span>
                {v && v.verso !== "fermo" && (
                  <span
                    className={
                      "ml-auto text-[12px] font-medium " +
                      // Il verso buono dipende dalla serie: le emissioni che
                      // calano sono un risultato, un indice che cala no.
                      ((s.meglioSe === "scende") === (v.verso === "giu") ? "text-success" : "text-warning")
                    }
                    title="Variazione fra la prima e l'ultima versione pubblicata"
                  >
                    {v.pct > 0 ? "+" : ""}
                    {fmtNum(String(v.pct), 1)}%
                  </span>
                )}
              </p>
              <svg
                viewBox={`0 0 ${L} ${H}`}
                className="mt-3 h-16 w-full"
                role="img"
                aria-label={`${s.titolo}: ${s.punti
                  .map((p) => `${s.perEsercizio ? p.x : `versione ${p.x}`} ${fmtNum(String(p.valore), 1)} ${s.unita}`)
                  .join(", ")}`}
              >
                <path d={d} fill="none" stroke="var(--color-primary)" strokeWidth={1.75} strokeLinejoin="round" />
                {punti.map((p, i) => (
                  <circle
                    key={i}
                    cx={p.x}
                    cy={p.y}
                    r={i === punti.length - 1 ? 3.5 : 2}
                    fill="var(--color-primary)"
                    opacity={i === punti.length - 1 ? 1 : 0.45}
                  />
                ))}
              </svg>
              <div className="mt-1 flex justify-between text-[10.5px] text-muted-foreground">
                <span>{s.perEsercizio ? s.punti[0].x : `v${s.punti[0].x}`}</span>
                <span>{s.perEsercizio ? ultimo.x : `v${ultimo.x}`}</span>
              </div>
            </figure>
          );
        })}
      </div>
    </div>
  );
}
