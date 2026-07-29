// Avanzamento del percorso a 8 passi (contratto stato() del prototipo).
// NOTA di fedeltà: il totale è la media di 7 contributi — a5 (presenza voci) è
// escluso perché ridondante con a3. Quirk ereditato consapevolmente dal prototipo.

export const BOUNDARY_FIELDS_FOR_PROGRESS = [
  "forma",
  "sede",
  "settore",
  "ateco",
  "siti",
  "responsabile",
  "perimetroOrg",
  "perimetroOp",
] as const;

export type ProgressInput = {
  boundaries: Record<string, string | undefined>;
  sourceStates: Record<string, "in" | "out" | "na">;
  totalSources: number;
  rowsBySource: Record<string, number>; // voci dell'anno per sourceTypeKey
  usedFactors: { key: string; fonte: string | null }[];
  targetsCount: number;
  checklist: Record<string, "ok" | "par" | "no">;
  totalChecklist: number;
};

export type ProgressResult = {
  a1: number;
  a2: number;
  a3: number;
  a4: number;
  a5: number;
  a6: number;
  a7: number;
  a8: number;
  totPct: number; // 0..100 intero
};

export function computeProgress(i: ProgressInput): ProgressResult {
  const filled = (k: string) => Boolean(i.boundaries[k]?.toString().trim());

  const a1 = BOUNDARY_FIELDS_FOR_PROGRESS.filter(filled).length / BOUNDARY_FIELDS_FOR_PROGRESS.length;

  const assessed = Object.values(i.sourceStates).filter(Boolean).length;
  const a2 = i.totalSources > 0 ? Math.min(1, assessed / i.totalSources) : 0;

  const included = Object.entries(i.sourceStates).filter(([, st]) => st === "in").map(([k]) => k);
  const anyRows = Object.values(i.rowsBySource).some((n) => n > 0);
  const a3 = included.length
    ? included.filter((k) => (i.rowsBySource[k] ?? 0) > 0).length / included.length
    : anyRows
      ? 1
      : 0;

  const a4 = i.usedFactors.length
    ? i.usedFactors.filter((f) => Boolean(f.fonte?.trim())).length / i.usedFactors.length
    : 0;

  const a5 = anyRows ? 1 : 0;
  const a6 = i.targetsCount > 0 ? 1 : 0;

  const ok = Object.values(i.checklist).filter((s) => s === "ok").length;
  const a7 = i.totalChecklist > 0 ? ok / i.totalChecklist : 0;

  const met = filled("metodologia");
  const sig = filled("significativita");
  const a8 = met && sig ? 1 : met || sig ? 0.5 : 0;

  const totPct = Math.round(((a1 + a2 + a3 + a4 + a6 + a7 + a8) / 7) * 100);
  return { a1, a2, a3, a4, a5, a6, a7, a8, totPct };
}
