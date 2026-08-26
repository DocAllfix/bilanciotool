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

// I MESI SCRITTI A MANO, e non e' pignoleria.
//
// ⚠️ `toLocaleDateString("it-IT", …)` dipende dai dati ICU del RUNTIME, e server e browser
// ne hanno due diversi. Questo progetto lo aveva gia' scritto il 26 agosto 2026 a
// proposito del denaro — «lo stesso importo si stamperebbe in due modi nella stessa
// pagina» — e il giorno dopo e' successo con una data: sul deploy vero, il pannello della
// condivisione produceva `Minified React error #418`, cioe' il testo reso dal server non
// coincideva con quello reso dal browser.
//
// In locale non si vede mai: e' lo stesso Node, la stessa ICU, la stessa macchina.
//
// Scritti a mano, server e client non possono divergere. Sono dodici parole.
const MESI = [
  "gennaio", "febbraio", "marzo", "aprile", "maggio", "giugno",
  "luglio", "agosto", "settembre", "ottobre", "novembre", "dicembre",
] as const;

const MESI_BREVI = [
  "gen", "feb", "mar", "apr", "mag", "giu",
  "lug", "ago", "set", "ott", "nov", "dic",
] as const;

/** «27 agosto 2026». */
export function fmtDataEstesa(d: Date | string | null | undefined): string {
  if (!d) return "—";
  const x = new Date(d);
  if (Number.isNaN(x.getTime())) return "—";
  return `${x.getDate()} ${MESI[x.getMonth()]} ${x.getFullYear()}`;
}

/** «27 ago 2026», dove lo spazio e' poco. */
export function fmtDataBreve(d: Date | string | null | undefined): string {
  if (!d) return "—";
  const x = new Date(d);
  if (Number.isNaN(x.getTime())) return "—";
  return `${x.getDate()} ${MESI_BREVI[x.getMonth()]} ${x.getFullYear()}`;
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
