import { DOC } from "./charts";

// Grafici della diagnosi energetica: SVG generati server-side dai dati dello
// snapshot, vettoriali (nitidi in stampa), deterministici, senza dipendenze
// client. Palette di stampa fissa, coerente coi token — vedi DESIGN.md.

const fmtIt = (v: number, d = 0) =>
  v.toLocaleString("it-IT", { minimumFractionDigits: d, maximumFractionDigits: d });

const nice = (m: number) => {
  if (m <= 0) return 1;
  const e = Math.pow(10, Math.floor(Math.log10(m)));
  const r = m / e;
  return (r <= 1 ? 1 : r <= 2 ? 2 : r <= 5 ? 5 : 10) * e;
};

const taglia = (s: string, n: number) => (s.length > n ? s.slice(0, n - 1) + "…" : s);

/** Diagramma di flusso vettori -> aree funzionali.
 *
 *  E' il grafico che racconta la diagnosi in un colpo d'occhio: a sinistra i
 *  vettori entrati nel sito, a destra dove finiscono. Lo spessore di ogni nastro
 *  e' proporzionale ai kWh; i nastri si disegnano con Bezier cubiche in ordine
 *  stabile, cosi' due generazioni con gli stessi dati producono lo stesso SVG. */
export function Sankey({
  sorgenti,
  destinazioni,
  flussi,
  unita = "kWh",
}: {
  sorgenti: { key: string; nome: string; colore: string }[];
  destinazioni: { key: string; nome: string; colore: string }[];
  flussi: { da: string; a: string; valore: number }[];
  unita?: string;
}) {
  const W = 640, H = 360, T = 26, B = 26, NW = 13, GAP = 12;
  const xs = 156, xd = W - 156 - NW;
  const totale = flussi.reduce((s, f) => s + f.valore, 0);
  if (totale <= 0) return null;

  const ph = H - T - B;
  const sommaDa = (k: string) => flussi.filter((f) => f.da === k).reduce((s, f) => s + f.valore, 0);
  const sommaA = (k: string) => flussi.filter((f) => f.a === k).reduce((s, f) => s + f.valore, 0);
  const src = sorgenti.filter((s) => sommaDa(s.key) > 0);
  const dst = destinazioni.filter((d) => sommaA(d.key) > 0);

  const posizioni = (nodi: { key: string }[], somma: (k: string) => number) => {
    const m = new Map<string, { y0: number; h: number; cursore: number }>();
    const disponibile = ph - GAP * Math.max(0, nodi.length - 1);
    let y = T;
    for (const n of nodi) {
      const h = Math.max(4, (disponibile * somma(n.key)) / totale);
      m.set(n.key, { y0: y, h, cursore: y });
      y += h + GAP;
    }
    return m;
  };
  const ps = posizioni(src, sommaDa);
  const pd = posizioni(dst, sommaA);

  // Ordine stabile: prima i nastri piu' spessi, poi per chiave.
  const ordinati = [...flussi]
    .filter((f) => f.valore > 0 && ps.has(f.da) && pd.has(f.a))
    .sort((a, b) => b.valore - a.valore || a.da.localeCompare(b.da) || a.a.localeCompare(b.a));

  const nastri = ordinati.map((f) => {
    const s = ps.get(f.da)!;
    const d = pd.get(f.a)!;
    const hs = (s.h * f.valore) / sommaDa(f.da);
    const hd = (d.h * f.valore) / sommaA(f.a);
    const y1 = s.cursore;
    const y2 = d.cursore;
    s.cursore += hs;
    d.cursore += hd;
    const cx = (xs + NW + xd) / 2;
    const traccia = [
      `M${xs + NW} ${y1}`,
      `C${cx} ${y1} ${cx} ${y2} ${xd} ${y2}`,
      `L${xd} ${y2 + hd}`,
      `C${cx} ${y2 + hd} ${cx} ${y1 + hs} ${xs + NW} ${y1 + hs}`,
      "Z",
    ].join(" ");
    return {
      chiave: `${f.da}|${f.a}`,
      d: traccia,
      colore: sorgenti.find((x) => x.key === f.da)?.colore ?? DOC.muted,
    };
  });

  return (
    <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Flussi energetici in ${unita}`}>
      {nastri.map((n) => (
        <path key={n.chiave} d={n.d} fill={n.colore} opacity={0.34} />
      ))}
      {src.map((s) => {
        const p = ps.get(s.key)!;
        return (
          <g key={s.key}>
            <rect x={xs} y={p.y0} width={NW} height={p.h} rx={2} fill={s.colore} />
            <text x={xs - 9} y={p.y0 + p.h / 2 + 1} fontSize={10.5} fill={DOC.ink} textAnchor="end">
              {taglia(s.nome, 26)}
            </text>
            <text x={xs - 9} y={p.y0 + p.h / 2 + 13} fontSize={9} fill={DOC.muted} textAnchor="end">
              {fmtIt(sommaDa(s.key))} {unita}
            </text>
          </g>
        );
      })}
      {dst.map((d) => {
        const p = pd.get(d.key)!;
        return (
          <g key={d.key}>
            <rect x={xd} y={p.y0} width={NW} height={p.h} rx={2} fill={d.colore} />
            <text x={xd + NW + 9} y={p.y0 + p.h / 2 + 1} fontSize={10.5} fill={DOC.ink}>
              {taglia(d.nome, 24)}
            </text>
            <text x={xd + NW + 9} y={p.y0 + p.h / 2 + 13} fontSize={9} fill={DOC.muted}>
              {fmtIt(sommaA(d.key))} {unita} · {fmtIt((sommaA(d.key) / totale) * 100, 1)}%
            </text>
          </g>
        );
      })}
    </svg>
  );
}

/** Pareto degli usi finali: barre decrescenti e curva cumulata con la soglia
 *  dell'80 per cento. Risponde alla sola domanda che conta all'inizio di una
 *  diagnosi: su quante utenze conviene concentrarsi. */
export function Pareto({
  voci,
  unita = "kWh",
}: {
  voci: { nome: string; valore: number; colore: string }[];
  unita?: string;
}) {
  const dati = [...voci].filter((v) => v.valore > 0).sort((a, b) => b.valore - a.valore);
  if (!dati.length) return null;
  const W = 640, H = 330, L = 58, R = 46, T = 20, B = 104;
  const pw = W - L - R, ph = H - T - B;
  const totale = dati.reduce((s, v) => s + v.valore, 0);
  const max = nice(dati[0].valore);
  const bw = Math.min(52, (pw / dati.length) * 0.7);
  const cx = (i: number) => L + (pw / dati.length) * (i + 0.5);
  const y = (v: number) => T + ph - (v / max) * ph;
  const yc = (p: number) => T + ph - (p / 100) * ph;

  let cum = 0;
  const cumulata = dati.map((v, i) => {
    cum += (v.valore / totale) * 100;
    return { x: cx(i), y: yc(cum), pct: cum };
  });
  const quante = cumulata.findIndex((c) => c.pct >= 80) + 1;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Pareto degli usi finali in ${unita}`}>
      {[0, 1, 2, 3, 4].map((i) => {
        const gy = T + ph - (ph * i) / 4;
        return (
          <g key={i}>
            <line x1={L} y1={gy} x2={W - R} y2={gy} stroke={DOC.line} />
            <text x={L - 8} y={gy + 3.5} fontSize={9} fill={DOC.muted} textAnchor="end">{fmtIt((max * i) / 4)}</text>
            <text x={W - R + 8} y={gy + 3.5} fontSize={9} fill={DOC.muted}>{i * 25}%</text>
          </g>
        );
      })}
      <line x1={L} y1={yc(80)} x2={W - R} y2={yc(80)} stroke={DOC.scope3} strokeDasharray="4 3" />
      <text x={W - R - 4} y={yc(80) - 5} fontSize={9} fill={DOC.scope3} textAnchor="end">80%</text>

      {dati.map((v, i) => (
        <g key={v.nome}>
          <rect
            x={cx(i) - bw / 2} y={y(v.valore)} width={bw}
            height={Math.max(1, T + ph - y(v.valore))} rx={3} fill={v.colore}
          />
          <text
            x={cx(i)} y={T + ph + 11} fontSize={8.5} fill={DOC.ink} textAnchor="end"
            transform={`rotate(-38 ${cx(i)} ${T + ph + 11})`}
          >
            {taglia(v.nome, 28)}
          </text>
        </g>
      ))}

      <polyline points={cumulata.map((c) => `${c.x},${c.y}`).join(" ")} fill="none" stroke={DOC.ink} strokeWidth={1.4} />
      {cumulata.map((c, i) => <circle key={i} cx={c.x} cy={c.y} r={2.6} fill={DOC.ink} />)}
      <text x={L} y={H - 6} fontSize={9.5} fill={DOC.muted}>
        {quante > 0 ? `${quante} ${quante === 1 ? "utenza copre" : "utenze coprono"} l'80% del consumo` : "curva cumulata"}
      </text>
      <text x={W - R} y={H - 6} fontSize={9.5} fill={DOC.muted} textAnchor="end">{unita}</text>
    </svg>
  );
}

/** Barre mensili impilate per categoria di vettore, con la riga del consumo di
 *  base: l'energia che il sito assorbe anche senza produrre. */
export function BarreMensili({
  mesi,
  serie,
  consumoDiBase,
  unita = "kWh",
}: {
  mesi: string[];
  serie: { nome: string; colore: string; valori: number[] }[];
  consumoDiBase?: number | null;
  unita?: string;
}) {
  const W = 640, H = 300, L = 62, R = 12, T = 20, B = 62;
  const pw = W - L - R, ph = H - T - B;
  const totali = mesi.map((_, i) => serie.reduce((s, x) => s + (x.valori[i] ?? 0), 0));
  const max = nice(Math.max(...totali, 0.001));
  const bw = Math.min(34, (pw / mesi.length) * 0.68);
  const cx = (i: number) => L + (pw / mesi.length) * (i + 0.5);
  const y = (v: number) => T + ph - (v / max) * ph;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Andamento mensile in ${unita}`}>
      {[0, 1, 2, 3, 4].map((i) => {
        const gy = T + ph - (ph * i) / 4;
        return (
          <g key={i}>
            <line x1={L} y1={gy} x2={W - R} y2={gy} stroke={DOC.line} />
            <text x={L - 8} y={gy + 3.5} fontSize={9} fill={DOC.muted} textAnchor="end">{fmtIt((max * i) / 4)}</text>
          </g>
        );
      })}
      {mesi.map((m, i) => {
        let base = T + ph;
        return (
          <g key={m}>
            {serie.map((s) => {
              const v = s.valori[i] ?? 0;
              if (v <= 0) return null;
              const h = (v / max) * ph;
              base -= h;
              return <rect key={s.nome} x={cx(i) - bw / 2} y={base} width={bw} height={h} fill={s.colore} />;
            })}
            <text x={cx(i)} y={T + ph + 14} fontSize={9} fill={DOC.ink} textAnchor="middle">{m}</text>
          </g>
        );
      })}
      {consumoDiBase != null && consumoDiBase > 0 && (
        <g>
          <line
            x1={L} y1={y(consumoDiBase)} x2={W - R} y2={y(consumoDiBase)}
            stroke={DOC.scope3} strokeDasharray="5 3" strokeWidth={1.3}
          />
          <text x={W - R} y={y(consumoDiBase) - 5} fontSize={9} fill={DOC.scope3} textAnchor="end">
            consumo di base {fmtIt(consumoDiBase)} {unita}
          </text>
        </g>
      )}
      {serie.map((s, i) => (
        <g key={s.nome}>
          <rect x={L + i * 150} y={H - 16} width={10} height={10} rx={2} fill={s.colore} />
          <text x={L + i * 150 + 15} y={H - 7} fontSize={10} fill={DOC.muted}>{s.nome}</text>
        </g>
      ))}
    </svg>
  );
}

/** Confronto degli indicatori con l'anno di riferimento: barre che partono da
 *  una linea centrale. Tutti gli indicatori sono "minore e' meglio", quindi una
 *  barra a sinistra e' un miglioramento. Gli indicatori non calcolabili non
 *  compaiono affatto: disegnarli a zero direbbe una cosa falsa. */
export function BarreDivergenti({
  voci,
}: {
  voci: { nome: string; variazionePct: number; migliorato: boolean }[];
}) {
  if (!voci.length) return null;
  const W = 640, rh = 28, L = 250, R = 62;
  const H = 26 + voci.length * rh + 18;
  const mezzo = L + (W - L - R) / 2;
  const max = Math.max(...voci.map((v) => Math.abs(v.variazionePct)), 1);
  const scala = (W - L - R) / 2 / max;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Variazione degli indicatori rispetto all'anno di riferimento">
      <line x1={mezzo} y1={16} x2={mezzo} y2={H - 26} stroke={DOC.line} />
      {voci.map((v, i) => {
        const y = 22 + i * rh;
        const w = Math.abs(v.variazionePct) * scala;
        const x = v.variazionePct < 0 ? mezzo - w : mezzo;
        return (
          <g key={v.nome}>
            <text x={L - 12} y={y + 12} fontSize={10.5} fill={DOC.ink} textAnchor="end">{taglia(v.nome, 34)}</text>
            <rect
              x={x} y={y + 2} width={Math.max(1.5, w)} height={15} rx={2.5}
              fill={v.migliorato ? DOC.positivo : DOC.negativo}
            />
            {/* Il valore sta fuori dalla barra finche' c'e' spazio; quando la barra
                arriva quasi al nome dell'indicatore, si sposta dentro in bianco,
                altrimenti le due scritte si sovrappongono. */}
            {(() => {
              const dentro = w > 46;
              const sinistra = v.variazionePct < 0;
              const testo = `${v.variazionePct > 0 ? "+" : "−"}${fmtIt(Math.abs(v.variazionePct), 1)}%`;
              const tx = dentro
                ? (sinistra ? x + 6 : x + w - 6)
                : (sinistra ? x - 6 : x + w + 6);
              const ancora = dentro ? (sinistra ? "start" : "end") : (sinistra ? "end" : "start");
              return (
                <text x={tx} y={y + 14} fontSize={10} fill={dentro ? "#fff" : DOC.ink} textAnchor={ancora}>
                  {testo}
                </text>
              );
            })()}
          </g>
        );
      })}
      <text x={mezzo - 8} y={H - 8} fontSize={9.5} fill={DOC.positivo} textAnchor="end">← miglioramento</text>
      <text x={mezzo + 8} y={H - 8} fontSize={9.5} fill={DOC.negativo}>peggioramento →</text>
    </svg>
  );
}
