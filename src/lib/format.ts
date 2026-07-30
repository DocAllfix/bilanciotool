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

// Tempo relativo compatto per i flussi di attività ("2 h fa", "ieri", poi la data).
export function fmtRelativa(d: Date | string): string {
  const date = typeof d === "string" ? new Date(d) : d;
  const sec = Math.max(0, (Date.now() - date.getTime()) / 1000);
  if (sec < 60) return "adesso";
  if (sec < 3600) return `${Math.floor(sec / 60)} min fa`;
  if (sec < 86400) return `${Math.floor(sec / 3600)} h fa`;
  if (sec < 172800) return "ieri";
  if (sec < 604800) return `${Math.floor(sec / 86400)} giorni fa`;
  return fmtData(date);
}
