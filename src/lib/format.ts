// Formattazione centralizzata it-IT (regola DESIGN.md/i18n-ready).
// I valori arrivano come stringhe decimali dal server: qui SOLO presentazione.

export function fmtNum(v: string | number | null | undefined, decimali = 0): string {
  if (v === null || v === undefined || v === "") return "—";
  const n = typeof v === "number" ? v : Number(v);
  if (!Number.isFinite(n)) return "—";
  return n.toLocaleString("it-IT", { minimumFractionDigits: decimali, maximumFractionDigits: decimali });
}

export function fmtPct(v: string | number | null | undefined, decimali = 1): string {
  const s = fmtNum(v, decimali);
  return s === "—" ? s : `${s}%`;
}

export function fmtData(d: Date | string): string {
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleDateString("it-IT", { day: "2-digit", month: "2-digit", year: "numeric" });
}
