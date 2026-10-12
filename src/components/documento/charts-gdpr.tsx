import { DOC } from "./charts";

// I grafici dei documenti della protezione dei dati: SVG lato server, deterministici, con
// la palette di stampa. Dal prototipo (`chConf`, `chRisk`, `chPiano`), ridisegnati coi
// colori del documento.

const VERDE = "#2e7d32";
const AMBRA = "#b06e00";
const ROSSO = "#b3261e";
const GRIGIO = "#c9c7c0";

const coloreIndice = (v: number | null) => (v === null ? GRIGIO : v >= 90 ? VERDE : v >= 60 ? AMBRA : ROSSO);

/** L'indice di conformità per gruppo, su una scala fissa da 0 a 100. */
export function BarreConformita({ voci }: { voci: { nome: string; indice: number | null }[] }) {
  const W = 640, rh = 24, L = 250, bw = W - L - 64, H = 14 + voci.length * rh + 22;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Indice di conformità per gruppo di requisiti">
      {[0, 50, 100].map((v) => {
        const x = L + (bw * v) / 100;
        return (
          <g key={v}>
            <line x1={x} y1={8} x2={x} y2={H - 20} stroke={DOC.line} />
            <text x={x} y={H - 6} fontSize={9.5} fill={DOC.muted} textAnchor="middle">
              {v}%
            </text>
          </g>
        );
      })}
      {voci.map((v, i) => {
        const y = 14 + i * rh;
        return (
          <g key={v.nome}>
            <text x={L - 10} y={y + 11} fontSize={11} fill={DOC.ink} textAnchor="end">
              {v.nome}
            </text>
            <rect x={L} y={y} width={bw} height={15} rx={3} fill="#f0eee9" />
            {v.indice !== null && <rect x={L} y={y} width={Math.max(2, (bw * v.indice) / 100)} height={15} rx={3} fill={coloreIndice(v.indice)} />}
            <text x={L + bw + 8} y={y + 11.5} fontSize={10.5} fill={DOC.muted}>
              {v.indice === null ? "—" : `${v.indice}%`}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

/** La matrice 5 × 5 dei rischi, col numero di trattamenti in ogni casella. */
export function MatriceRischi({
  punti,
  alto,
  medio,
  probabilita,
  gravita,
}: {
  punti: { p: number; g: number }[];
  alto: number;
  medio: number;
  probabilita: string[];
  gravita: string[];
}) {
  const W = 640, H = 330, L = 110, T = 16, cw = 76, ch = 50;
  const celle = [];
  for (let p = 5; p >= 1; p--) {
    for (let g = 1; g <= 5; g++) {
      const v = p * g;
      const x = L + (g - 1) * cw;
      const y = T + (5 - p) * ch;
      const n = punti.filter((k) => k.p === p && k.g === g).length;
      const sfondo = v >= alto ? "#fbeae8" : v >= medio ? "#fdf2df" : "#e8f3e9";
      const tinta = v >= alto ? ROSSO : v >= medio ? AMBRA : VERDE;
      celle.push(
        <g key={`${p}-${g}`}>
          <rect x={x + 1.5} y={y + 1.5} width={cw - 3} height={ch - 3} fill={sfondo} rx={5} />
          <text x={x + cw - 9} y={y + 15} fontSize={9} fill={tinta} textAnchor="end" opacity={0.7}>
            {v}
          </text>
          {n > 0 && (
            <>
              <circle cx={x + cw / 2} cy={y + ch / 2 + 2} r={14} fill={tinta} />
              <text x={x + cw / 2} y={y + ch / 2 + 6.5} fontSize={12.5} fill="#fff" textAnchor="middle" fontWeight={700}>
                {n}
              </text>
            </>
          )}
        </g>,
      );
    }
  }
  return (
    <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Matrice dei rischi: trattamenti per probabilità e gravità">
      {celle}
      {[1, 2, 3, 4, 5].map((v) => (
        <g key={v}>
          <text x={L + (v - 1) * cw + cw / 2} y={T + 5 * ch + 16} fontSize={9.5} fill={DOC.muted} textAnchor="middle">
            {v} · {gravita[v - 1] ?? ""}
          </text>
          <text x={L - 8} y={T + (5 - v) * ch + ch / 2 + 4} fontSize={9.5} fill={DOC.muted} textAnchor="end">
            {v} · {probabilita[v - 1] ?? ""}
          </text>
        </g>
      ))}
      <text x={L + cw * 2.5} y={H - 8} fontSize={10.5} fill={DOC.ink} textAnchor="middle">
        gravità per l&apos;interessato →
      </text>
      {[
        [VERDE, "basso"],
        [AMBRA, "medio"],
        [ROSSO, "alto"],
      ].map(([c, t], i) => (
        <g key={t}>
          <rect x={L + 5 * cw + 18} y={T + 6 + i * 22} width={11} height={11} fill={c} rx={2} />
          <text x={L + 5 * cw + 35} y={T + 16 + i * 22} fontSize={10.5} fill={DOC.ink}>
            {t}
          </text>
        </g>
      ))}
    </svg>
  );
}

const MESI = ["Gen", "Feb", "Mar", "Apr", "Mag", "Giu", "Lug", "Ago", "Set", "Ott", "Nov", "Dic"];

/** Il piano annuale: attività per mese, concluse e da fare. */
export function PianoMesi({ attivita }: { attivita: { mese: number; fatta: boolean }[] }) {
  const W = 640, H = 200, L = 30, T = 18, B = 40, pw = W - L - 10, ph = H - T - B, cw = pw / 12;
  const perMese = (m: number) => attivita.filter((a) => a.mese === m);
  const max = Math.max(1, ...MESI.map((_, i) => perMese(i + 1).length));
  const u = ph / max;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Piano annuale per mese">
      <line x1={L} y1={T + ph} x2={W - 10} y2={T + ph} stroke={DOC.line} />
      {MESI.map((nome, i) => {
        const tutte = perMese(i + 1);
        const fatte = tutte.filter((a) => a.fatta).length;
        const x = L + i * cw;
        return (
          <g key={nome}>
            {tutte.map((_, k) => (
              <rect key={k} x={x + 7} y={T + ph - (k + 1) * u + 2} width={cw - 14} height={u - 4} fill={k < fatte ? VERDE : "#d9bfd4"} rx={3} />
            ))}
            <text x={x + cw / 2} y={T + ph + 15} fontSize={10} fill={DOC.muted} textAnchor="middle">
              {nome}
            </text>
          </g>
        );
      })}
      <rect x={L} y={H - 14} width={10} height={10} fill={VERDE} rx={2} />
      <text x={L + 15} y={H - 5} fontSize={10.5} fill={DOC.ink}>
        attività concluse
      </text>
      <rect x={L + 130} y={H - 14} width={10} height={10} fill="#d9bfd4" rx={2} />
      <text x={L + 145} y={H - 5} fontSize={10.5} fill={DOC.ink}>
        pianificate o in corso
      </text>
    </svg>
  );
}
