import { DOC } from "./charts";
import { fmtNum } from "@/lib/format";

// I grafici propri dei documenti del sistema di gestione sociale. Conformità per gruppo,
// matrice dei rischi e piano per mese si prendono da `charts-gdpr.tsx`: sono gli stessi
// grafici del prototipo, che è costruito sullo stesso stampo. Qui c'è solo quello che il
// GDPR non ha: l'orario di lavoro confrontato col limite.

const SCURO = "#3f4a8c";
const CHIARO = "#a9b0d6";
const ROSSO = "#b3261e";

type Anno = { anno: number; media: number | null; massima: number | null };

/**
 * L'orario: ore settimanali medie per addetto e settimana più lunga, per due esercizi, con la
 * linea del limite complessivo. Un valore che non c'è non disegna una barra a zero: scrive
 * «—», perché zero ore sarebbe un dato, e un dato falso.
 */
export function BarreOrario({ anni, limite }: { anni: Anno[]; limite: number }) {
  const W = 640, H = 230, L = 46, T = 16, B = 46, pw = W - L - 20, ph = H - T - B;
  const valori = anni.flatMap((a) => [a.media, a.massima]).filter((v): v is number => v !== null);
  const max = Math.max(limite * 1.15, ...valori, 1);
  const y = (v: number) => T + ph - (ph * v) / max;
  const gw = pw / anni.length;
  const bw = Math.min(70, gw / 3);
  const tacche = [0, Math.round(max / 2), Math.round(max)];
  return (
    <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Orario di lavoro a confronto con il limite complessivo">
      {tacche.map((v) => (
        <g key={v}>
          <line x1={L} y1={y(v)} x2={W - 20} y2={y(v)} stroke={DOC.line} />
          <text x={L - 6} y={y(v) + 3.5} fontSize={9.5} fill={DOC.muted} textAnchor="end">
            {v}
          </text>
        </g>
      ))}
      <line x1={L} y1={y(limite)} x2={W - 20} y2={y(limite)} stroke={ROSSO} strokeDasharray="5 4" />
      <text x={W - 22} y={y(limite) - 5} fontSize={10} fill={ROSSO} textAnchor="end">
        limite complessivo · {limite} ore
      </text>
      {anni.map((a, i) => {
        const x0 = L + i * gw + gw / 2 - bw - 4;
        const barra = (v: number | null, x: number, colore: string) =>
          v === null ? (
            <text x={x + bw / 2} y={T + ph - 6} fontSize={11} fill={DOC.muted} textAnchor="middle">
              —
            </text>
          ) : (
            <>
              <rect x={x} y={y(v)} width={bw} height={T + ph - y(v)} fill={colore} rx={3} />
              <text x={x + bw / 2} y={y(v) - 4} fontSize={10} fill={DOC.ink} textAnchor="middle">
                {fmtNum(v, Number.isInteger(v) ? 0 : 1)}
              </text>
            </>
          );
        return (
          <g key={a.anno}>
            {barra(a.media, x0, SCURO)}
            {barra(a.massima, x0 + bw + 8, CHIARO)}
            <text x={L + i * gw + gw / 2} y={T + ph + 16} fontSize={10.5} fill={DOC.ink} textAnchor="middle">
              {a.anno}
            </text>
          </g>
        );
      })}
      <rect x={L} y={H - 14} width={10} height={10} fill={SCURO} rx={2} />
      <text x={L + 15} y={H - 5} fontSize={10.5} fill={DOC.ink}>
        ore settimanali medie per addetto
      </text>
      <rect x={L + 230} y={H - 14} width={10} height={10} fill={CHIARO} rx={2} />
      <text x={L + 245} y={H - 5} fontSize={10.5} fill={DOC.ink}>
        settimana più lunga
      </text>
    </svg>
  );
}
