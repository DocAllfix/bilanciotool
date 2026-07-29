// Doppia materialità (contratto prototipo): un tema è materiale se supera la
// soglia su ALMENO UNA delle due dimensioni; è "valutato" solo se ha il punteggio
// d'impatto (stessa regola del prototipo).

export type TopicScore = { imp?: number | string | null; fin?: number | string | null };

export type MaterialityResult = {
  materialKeys: string[];
  assessedCount: number;
  perTopic: Record<string, { imp: number | null; fin: number | null; materiale: boolean; valutato: boolean }>;
};

const num = (v: number | string | null | undefined): number | null => {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

export function assessMateriality(scores: Record<string, TopicScore>, soglia: number): MaterialityResult {
  const perTopic: MaterialityResult["perTopic"] = {};
  const materialKeys: string[] = [];
  let assessedCount = 0;
  for (const [key, s] of Object.entries(scores)) {
    const imp = num(s.imp);
    const fin = num(s.fin);
    const valutato = imp !== null;
    const materiale = valutato && ((imp ?? 0) >= soglia || (fin ?? 0) >= soglia);
    perTopic[key] = { imp, fin, materiale, valutato };
    if (valutato) assessedCount += 1;
    if (materiale) materialKeys.push(key);
  }
  return { materialKeys, assessedCount, perTopic };
}
