import Decimal from "decimal.js";

// Aritmetica del motore di calcolo: SEMPRE Decimal, mai float.
// Politica di arrotondamento (docs/politica-arrotondamento.md): precisione piena
// nei passaggi intermedi; si arrotonda solo in presentazione o negli snapshot.
export { Decimal };
export const dec = (v: string | number): Decimal => new Decimal(v);

// Contratto del prototipo (nz): input utente con virgola italiana; vuoto/non
// numerico/null → 0. Nessuna eccezione: il motore non deve mai esplodere su input sporco.
export function nz(v: string | number | null | undefined): Decimal {
  if (v === null || v === undefined || v === "") return new Decimal(0);
  const s = typeof v === "number" ? String(v) : v.trim().replace(/\./g, (m, i, str) =>
    // "1.234,56" → i punti sono separatori delle migliaia solo se c'è anche la virgola
    str.includes(",") ? "" : m,
  ).replace(",", ".");
  try {
    const d = new Decimal(s);
    return d.isFinite() ? d : new Decimal(0);
  } catch {
    return new Decimal(0);
  }
}

// Stringa decimale stabile per persistenza/snapshot: niente notazione esponenziale.
export function toFixedStr(d: Decimal, maxDecimals = 10): string {
  return d.toDecimalPlaces(maxDecimals).toFixed();
}
