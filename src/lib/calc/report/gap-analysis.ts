// Gap-analysis pre-pubblicazione (contratto vVer + stato() del prototipo):
// elenca le lacune per blocco e calcola il "pronto a pubblicare" come media
// dei cinque contributi.

export type GapInput = {
  profilo: Record<string, string | undefined>;
  profiloFields: string[];
  kpiCorrente: Record<string, string>;
  kpiPrecedente: Record<string, string>;
  totalKpi: number;
  kpiKeys: string[];
  materialTopics: { key: string; politica?: string; azioni?: string }[];
  assessedTopics: number;
  totalTopics: number;
  capitoli: { key: string; parole: number; media: number }[];
  totalCapitoli: number;
};

export type GapResult = {
  profiloMancanti: string[];
  kpiMancanti: string[];
  kpiSenzaConfronto: string[];
  gestioneMancante: string[];
  capitoliDaCompletare: string[];
  mediaTotali: number;
  readyPct: number;
};

// Un capitolo si considera scritto oltre questa soglia (contratto: testo > 80
// caratteri nel prototipo; qui in parole, la UI passa il conteggio che preferisce).
export const PAROLE_MINIME = 15;

const filled = (v: string | undefined) => Boolean(v?.toString().trim());
const has = (rec: Record<string, string>, k: string) => rec[k] !== undefined && rec[k] !== "";

export function computeGap(i: GapInput): GapResult {
  const profiloMancanti = i.profiloFields.filter((k) => !filled(i.profilo[k]));
  const kpiMancanti = i.kpiKeys.filter((k) => !has(i.kpiCorrente, k));
  const kpiSenzaConfronto = i.kpiKeys.filter((k) => has(i.kpiCorrente, k) && !has(i.kpiPrecedente, k));
  const gestioneMancante = i.materialTopics.filter((t) => !filled(t.politica) || !filled(t.azioni)).map((t) => t.key);
  const capitoliDaCompletare = i.capitoli.filter((c) => c.parole < PAROLE_MINIME).map((c) => c.key);
  const mediaTotali = i.capitoli.reduce((s, c) => s + c.media, 0);

  const s1 = i.profiloFields.length ? (i.profiloFields.length - profiloMancanti.length) / i.profiloFields.length : 0;
  const s2 = i.totalTopics ? Math.min(1, i.assessedTopics / i.totalTopics) : 0;
  const s3 = i.totalKpi ? Object.keys(i.kpiCorrente).filter((k) => has(i.kpiCorrente, k)).length / i.totalKpi : 0;
  const s4 = i.materialTopics.length
    ? (i.materialTopics.length - gestioneMancante.length) / i.materialTopics.length
    : 0;
  const s5 = i.totalCapitoli ? i.capitoli.filter((c) => c.parole >= PAROLE_MINIME).length / i.totalCapitoli : 0;

  return {
    profiloMancanti,
    kpiMancanti,
    kpiSenzaConfronto,
    gestioneMancante,
    capitoliDaCompletare,
    mediaTotali,
    readyPct: Math.round(((s1 + s2 + Math.min(1, s3) + s4 + s5) / 5) * 100),
  };
}
