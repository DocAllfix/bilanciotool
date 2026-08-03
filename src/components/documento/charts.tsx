// Grafici SVG del DOCUMENTO: generati server-side dai dati dello snapshot,
// vettoriali (nitidi in PDF), deterministici, senza dipendenze client.
// Palette stampa (documento sempre chiaro): valori esadecimali fissi coerenti
// coi token — vedi DESIGN.md.

export const DOC = {
  scope1: "#175e54",
  scope2: "#3b6e97",
  scope3: "#b07c22",
  e: "#2c7a4b",
  s: "#6b5ca8",
  g: "#3b6e97",
  ink: "#182430",
  muted: "#5f6f7c",
  line: "#d9dfe4",
  accentBg: "#e9f1ef",
  // Aree funzionali della diagnosi energetica (UNI CEI EN 16247).
  areaP: "#175e54",
  areaA: "#3b6e97",
  areaG: "#b07c22",
  areaT: "#6b5ca8",
  positivo: "#2c7a4b",
  negativo: "#a5442f",
};

export const COLORE_AREA_DOC: Record<string, string> = {
  P: DOC.areaP, A: DOC.areaA, G: DOC.areaG, T: DOC.areaT,
};

const fmtIt = (v: number, d = 0) =>
  v.toLocaleString("it-IT", { minimumFractionDigits: d, maximumFractionDigits: d });

const nice = (m: number) => {
  if (m <= 0) return 1;
  const e = Math.pow(10, Math.floor(Math.log10(m)));
  const r = m / e;
  return (r <= 1 ? 1 : r <= 2 ? 2 : r <= 5 ? 5 : 10) * e;
};

// Barre raggruppate (confronto biennale).
export function GroupBars({
  gruppi, serie, unita, decimali = 1,
}: {
  gruppi: { nome: string; valori: number[] }[];
  serie: { nome: string; colore: string }[];
  unita: string;
  decimali?: number;
}) {
  const W = 640, H = 280, L = 56, R = 12, T = 20, B = 52;
  const pw = W - L - R, ph = H - T - B;
  const max = nice(Math.max(...gruppi.flatMap((g) => g.valori), 0.001));
  const gw = pw / gruppi.length;
  const bw = Math.min(48, gw / (serie.length + 0.8));
  const y = (v: number) => T + ph - (v / max) * ph;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Grafico a barre, ${unita}`}>
      {[0, 1, 2, 3, 4].map((i) => {
        const gy = T + ph - (ph * i) / 4;
        return (
          <g key={i}>
            <line x1={L} y1={gy} x2={W - R} y2={gy} stroke={DOC.line} />
            <text x={L - 8} y={gy + 3.5} fontSize={9.5} fill={DOC.muted} textAnchor="end">{fmtIt((max * i) / 4, decimali)}</text>
          </g>
        );
      })}
      {gruppi.map((g, gi) => {
        const x0 = L + gi * gw + (gw - bw * serie.length) / 2;
        return (
          <g key={g.nome}>
            {g.valori.map((v, ci) => (
              <g key={ci}>
                <rect x={x0 + ci * bw + 2} y={y(v)} width={bw - 4} height={Math.max(0, T + ph - y(v))} rx={3} fill={serie[ci].colore} />
                {v > 0 && (
                  <text x={x0 + ci * bw + bw / 2} y={y(v) - 5} fontSize={9.5} fill={DOC.ink} textAnchor="middle">{fmtIt(v, decimali)}</text>
                )}
              </g>
            ))}
            <text x={L + gi * gw + gw / 2} y={T + ph + 16} fontSize={11} fill={DOC.ink} textAnchor="middle" fontWeight={600}>{g.nome}</text>
          </g>
        );
      })}
      {serie.map((s, i) => (
        <g key={s.nome}>
          <rect x={L + i * 170} y={H - 18} width={10} height={10} rx={2} fill={s.colore} />
          <text x={L + i * 170 + 15} y={H - 9} fontSize={10.5} fill={DOC.muted}>{s.nome}</text>
        </g>
      ))}
      <text x={W - R} y={H - 9} fontSize={10} fill={DOC.muted} textAnchor="end">{unita}</text>
    </svg>
  );
}

// Ciambella con legenda a destra.
export function Donut({ voci, unita, decimali = 0 }: { voci: { nome: string; valore: number; colore: string }[]; unita: string; decimali?: number }) {
  const W = 640, H = 240, cx = 120, cy = 120, R = 84, r = 52;
  const tot = voci.reduce((s, v) => s + v.valore, 0) || 1;
  let a = -Math.PI / 2;
  const archi = voci
    .filter((v) => v.valore > 0)
    .map((v) => {
      const ang = (v.valore / tot) * Math.PI * 2;
      const b = a + ang;
      const big = ang > Math.PI ? 1 : 0;
      const p = (rad: number, an: number) => [cx + rad * Math.cos(an), cy + rad * Math.sin(an)];
      const [x1, y1] = p(R, a), [x2, y2] = p(R, b), [x3, y3] = p(r, b), [x4, y4] = p(r, a);
      const d = ang >= Math.PI * 2 - 1e-6
        ? `M ${cx} ${cy - R} A ${R} ${R} 0 1 1 ${cx - 0.01} ${cy - R} L ${cx - 0.01} ${cy - r} A ${r} ${r} 0 1 0 ${cx} ${cy - r} Z`
        : `M${x1} ${y1} A${R} ${R} 0 ${big} 1 ${x2} ${y2} L${x3} ${y3} A${r} ${r} 0 ${big} 0 ${x4} ${y4} Z`;
      a = b;
      return { ...v, d };
    });
  return (
    <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Composizione, ${unita}`}>
      {archi.map((v) => <path key={v.nome} d={v.d} fill={v.colore} />)}
      <text x={cx} y={cy - 2} fontSize={19} fontWeight={600} fill={DOC.ink} textAnchor="middle">{fmtIt(tot, decimali)}</text>
      <text x={cx} y={cy + 15} fontSize={10.5} fill={DOC.muted} textAnchor="middle">{unita}</text>
      {voci.map((v, i) => {
        const y = 36 + i * 26;
        return (
          <g key={v.nome}>
            <rect x={250} y={y - 9} width={11} height={11} rx={3} fill={v.colore} />
            <text x={269} y={y} fontSize={11.5} fill={DOC.ink}>{v.nome}</text>
            <text x={W - 14} y={y} fontSize={11.5} fill={DOC.muted} textAnchor="end">
              {fmtIt(v.valore, decimali)} · {fmtIt((v.valore / tot) * 100, 1)}%
            </text>
          </g>
        );
      })}
    </svg>
  );
}

// Barre orizzontali.
export function HBars({ voci, unita, decimali = 0 }: { voci: { nome: string; valore: number; colore: string; suffisso?: string }[]; unita: string; decimali?: number }) {
  const W = 640, rh = 30, H = 16 + voci.length * rh + 14, L = 230;
  const max = Math.max(...voci.map((v) => v.valore), 0.001);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={unita}>
      {voci.map((v, i) => {
        const y = 14 + i * rh;
        const w = ((W - L - 80) * v.valore) / max;
        return (
          <g key={v.nome}>
            <text x={L - 10} y={y + 13} fontSize={11.5} fill={DOC.ink} textAnchor="end">
              {v.nome.length > 34 ? v.nome.slice(0, 33) + "…" : v.nome}
            </text>
            <rect x={L} y={y + 2} width={Math.max(2, w)} height={16} rx={3} fill={v.colore} />
            <text x={L + Math.max(2, w) + 7} y={y + 14} fontSize={11} fill={DOC.ink}>
              {fmtIt(v.valore, decimali)}{v.suffisso ?? ""}
            </text>
          </g>
        );
      })}
      <text x={W - 10} y={H - 2} fontSize={10} fill={DOC.muted} textAnchor="end">{unita}</text>
    </svg>
  );
}

// Matrice di doppia rilevanza (scatter con soglia).
export function MatriceMaterialita({
  punti, soglia,
}: {
  punti: { key: string; imp: number; fin: number; pillar: "E" | "S" | "G"; materiale: boolean }[];
  soglia: number;
}) {
  const W = 640, H = 420, pad = 52, RLeg = 110;
  const sx = (v: number) => pad + ((v - 0.5) / 5) * (W - pad - RLeg - pad);
  const sy = (v: number) => H - pad - ((v - 0.5) / 5) * (H - pad * 2);
  const colore = (p: "E" | "S" | "G") => (p === "E" ? DOC.e : p === "S" ? DOC.s : DOC.g);
  // jitter deterministico per punteggi identici
  const visti = new Map<string, number>();
  return (
    <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Matrice di doppia rilevanza">
      <rect x={sx(soglia)} y={pad} width={W - pad - RLeg - sx(soglia)} height={H - pad * 2} fill={DOC.accentBg} />
      <rect x={pad} y={pad} width={W - pad * 2 - RLeg} height={sy(soglia) - pad} fill={DOC.accentBg} />
      <line x1={pad} y1={H - pad} x2={W - pad - RLeg} y2={H - pad} stroke={DOC.line} />
      <line x1={pad} y1={pad} x2={pad} y2={H - pad} stroke={DOC.line} />
      <line x1={sx(soglia)} y1={pad} x2={sx(soglia)} y2={H - pad} stroke={DOC.scope1} strokeDasharray="4 3" />
      <line x1={pad} y1={sy(soglia)} x2={W - pad - RLeg} y2={sy(soglia)} stroke={DOC.scope1} strokeDasharray="4 3" />
      {[1, 2, 3, 4, 5].map((v) => (
        <g key={v}>
          <text x={sx(v)} y={H - pad + 15} fontSize={9.5} fill={DOC.muted} textAnchor="middle">{v}</text>
          <text x={pad - 9} y={sy(v) + 3} fontSize={9.5} fill={DOC.muted} textAnchor="end">{v}</text>
        </g>
      ))}
      <text x={(pad + W - pad - RLeg) / 2} y={H - 12} fontSize={10.5} fill={DOC.muted} textAnchor="middle">rilevanza finanziaria →</text>
      <text x={14} y={H / 2} fontSize={10.5} fill={DOC.muted} textAnchor="middle" transform={`rotate(-90 14 ${H / 2})`}>rilevanza d&apos;impatto →</text>
      {punti.map((p) => {
        const chiave = `${p.fin}:${p.imp}`;
        const n = visti.get(chiave) ?? 0;
        visti.set(chiave, n + 1);
        const dx = n * 9;
        return (
          <g key={p.key}>
            <circle cx={sx(p.fin) + dx} cy={sy(p.imp)} r={p.materiale ? 10 : 6.5} fill={colore(p.pillar)} opacity={p.materiale ? 0.9 : 0.35} />
            <text x={sx(p.fin) + dx} y={sy(p.imp) + 3.5} fontSize={8.5} fill="#fff" textAnchor="middle">{p.key.slice(1)}</text>
          </g>
        );
      })}
      {(["E", "S", "G"] as const).map((p, i) => (
        <g key={p}>
          <circle cx={W - RLeg + 14} cy={pad + i * 20 - 3} r={5.5} fill={colore(p)} />
          <text x={W - RLeg + 26} y={pad + i * 20} fontSize={10.5} fill={DOC.muted}>
            {p === "E" ? "Ambiente" : p === "S" ? "Sociale" : "Governance"}
          </text>
        </g>
      ))}
    </svg>
  );
}
