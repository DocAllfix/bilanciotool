import { and, asc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { withTenant } from "@/lib/db/tenant";
import {
  company, energyArea, energyBalance, energyDriverDefinition, energyEndUse,
  energyIndicator, energyVectorInput, narrativeTemplate, ratingScale,
} from "@/lib/db/schema";
import { computeVectors, type Fattori, type VettoreDef } from "@/lib/calc/energy/vectors";
import { computeEnergyProgress, type EnergyProgress } from "@/lib/calc/energy/progress";
import { DRIVER_KEYS, type DriverKey } from "@/lib/calc/energy/indicators";
import type { AreaKey } from "@/lib/calc/energy/allocation";
import { conteggioParole } from "@/features/report/validation";
import { getBalance, listBalances } from "./balances";
import { listVectorInputs, listVectors, type VettoreRisolto } from "./vectors";
import { listAllocations, listEndUseStates } from "./allocation";
import { listDriverValues } from "./drivers";
import { listMeasures } from "./measures";
import { listChapters } from "./narrative";
import { calcolaRisultati, serializzaRisultati } from "./results";
import { PROFILO_RICHIESTI, type ProfiloEnergetico } from "./validation";
import { signedUrl } from "@/lib/storage";

// Composizione dei dati del percorso energetico: un solo punto di lettura, come
// per gli altri due moduli. La pagina non interroga mai il database da sola.

export type EnergyWizardData = NonNullable<Awaited<ReturnType<typeof getWizardData>>>;

type GuidaUso = { def: string; come: string[]; stima: string; flag: string; ev: string };

export async function getWizardData(userId: string, orgId: string, companyId: string, anno: number) {
  const az = await withTenant({ userId, orgId }, async (tx) => {
    const [row] = await tx.select().from(company).where(eq(company.id, companyId));
    return row ?? null;
  });
  if (!az) return null;

  const azienda = {
    id: az.id,
    nome: az.nome,
    settore: az.settore,
    sede: az.sede,
    logoUrl: az.logoStorageKey ? await signedUrl(orgId, az.logoStorageKey, 3600).catch(() => null) : null,
  };

  const [bilancio, bilanci] = await Promise.all([
    getBalance(userId, orgId, companyId, anno),
    listBalances(userId, orgId, companyId),
  ]);
  if (!bilancio) return { azienda, bilancio: null, bilanci, catalogo: null, stato: null, risultati: null };

  const setId = bilancio.contentSetId;
  const annoBase = bilancio.annoBase;

  const [aree, usiCat, driverDef, indicatoriDef, capitoliDef, scale] = await Promise.all([
    db.select().from(energyArea).where(eq(energyArea.setId, setId)).orderBy(asc(energyArea.ordine)),
    db.select().from(energyEndUse).where(eq(energyEndUse.setId, setId)).orderBy(asc(energyEndUse.ordine)),
    db.select().from(energyDriverDefinition).where(eq(energyDriverDefinition.setId, setId)).orderBy(asc(energyDriverDefinition.ordine)),
    db.select().from(energyIndicator).where(eq(energyIndicator.setId, setId)).orderBy(asc(energyIndicator.ordine)),
    db.select().from(narrativeTemplate).where(eq(narrativeTemplate.setId, setId)).orderBy(asc(narrativeTemplate.ordine)),
    db.select().from(ratingScale).where(and(eq(ratingScale.setId, setId), eq(ratingScale.key, "metodo"))),
  ]);

  const [vettori, inputs, celle, statiUso, driverValori, misure, capitoli] = await Promise.all([
    listVectors(userId, orgId, companyId, setId),
    listVectorInputs(userId, orgId, bilancio.id),
    listAllocations(userId, orgId, bilancio.id),
    listEndUseStates(userId, orgId, bilancio.id),
    listDriverValues(userId, orgId, companyId, [anno, annoBase]),
    listMeasures(userId, orgId, bilancio.id),
    listChapters(userId, orgId, bilancio.id),
  ]);

  const statoPerUso = new Map(statiUso.map((s) => [s.usoKey, s]));
  const usi = usiCat.map((u) => {
    const s = statoPerUso.get(u.key);
    return {
      key: u.key,
      areaKey: u.areaKey as AreaKey,
      nome: u.nome,
      guida: u.guida as GuidaUso,
      predefinito: u.predefinito,
      attivo: s?.attivo ?? false,
      metodo: s?.metodo ?? null,
      nota: s?.nota ?? null,
      stima: {
        vettoreKey: s?.stimaVettoreKey ?? null,
        kw: s?.stimaKw ?? null,
        ore: s?.stimaOre ?? null,
        fattoreCarico: s?.stimaFattoreCarico ?? null,
      },
    };
  });

  const driverPerAnno = (a: number): Partial<Record<DriverKey, string>> =>
    Object.fromEntries(
      driverValori.filter((d) => d.anno === a).map((d) => [d.driverKey, d.valore]),
    ) as Partial<Record<DriverKey, string>>;

  const risultati = serializzaRisultati(
    calcolaRisultati({
      vettori,
      inputs: inputs.map((i) => ({
        vettoreKey: i.vettoreKey,
        quantita: i.quantita,
        costo: i.costo,
        mensili: (i.mensili as string[]) ?? [],
      })),
      usi,
      celle: celle.map((c) => ({ usoKey: c.usoKey, vettoreKey: c.vettoreKey, quantita: c.quantita })),
      driverCorrente: driverPerAnno(anno),
      driverBase: driverPerAnno(annoBase),
      misure: misure.map((m) => ({
        vettoreKey: m.vettoreKey,
        quantita: m.quantita,
        investimento: m.investimento,
        incentivo: m.incentivo,
      })),
      residualMix: vettori.find((v) => v.key === "ele")?.feMarket ?? "0",
      baseKwh: await totaliAnnoBase(userId, orgId, companyId, annoBase, vettori),
    }),
  );

  const profilo = (bilancio.profilo ?? {}) as ProfiloEnergetico;
  const capitoliConParole = capitoli.map((c) => ({
    templateKey: c.templateKey,
    contenuto: c.contenuto,
    parole: conteggioParole(c.contenuto),
  }));

  const mediaConUrl = await Promise.all(
    capitoli.flatMap((c) =>
      c.media.map(async (m) => ({
        sectionKey: c.templateKey,
        id: m.id,
        tipo: m.tipo,
        chartKey: m.chartKey,
        url: m.storageKey ? await signedUrl(orgId, m.storageKey, 3600).catch(() => null) : null,
        didascalia: m.didascalia,
        credito: m.credito,
        larghezza: m.larghezza,
        posizione: m.posizione,
      })),
    ),
  );

  const avanzamento = calcolaAvanzamento({
    profilo,
    inputs,
    risultati,
    usi,
    driverCorrente: driverPerAnno(anno),
    misure,
    capitoli: capitoliConParole,
    capitoliTotali: capitoliDef.length,
  });

  return {
    azienda,
    bilancio: {
      id: bilancio.id,
      anno: bilancio.anno,
      annoBase,
      contentSetId: setId,
      profilo,
    },
    bilanci,
    catalogo: {
      vettori,
      aree: aree.map((a) => ({ key: a.key as AreaKey, nome: a.nome, descrizione: a.descrizione, colore: a.colore })),
      usi,
      driver: driverDef.map((d) => ({ key: d.key, nome: d.nome, um: d.um, hint: d.hint })),
      indicatori: indicatoriDef.map((i) => ({ key: i.key, nome: i.nome, um: i.um, decimali: i.decimali, hint: i.hint })),
      capitoli: capitoliDef.map((c) => ({ key: c.key, nome: c.nome, hint: c.hint })),
      // Le scale di valutazione usano la chiave `v` (valore), come le altre
      // già in casa: `id` non esiste e produrrebbe chiavi React indefinite.
      metodi: (scale[0]?.livelli ?? []) as { v: string; n: string; d: string }[],
    },
    stato: {
      inputs: inputs.map((i) => ({
        vettoreKey: i.vettoreKey,
        quantita: i.quantita,
        costo: i.costo,
        mensili: (i.mensili as string[]) ?? [],
      })),
      celle: celle.map((c) => ({ usoKey: c.usoKey, vettoreKey: c.vettoreKey, quantita: c.quantita })),
      driver: { corrente: driverPerAnno(anno), base: driverPerAnno(annoBase) },
      misure: misure.map((m) => ({
        id: m.id,
        descrizione: m.descrizione,
        vettoreKey: m.vettoreKey,
        quantita: m.quantita,
        investimento: m.investimento,
        incentivo: m.incentivo,
        usoKey: m.usoKey,
        stato: m.stato,
        annoPrevisto: m.annoPrevisto,
        note: m.note,
        posizione: m.posizione,
      })),
      capitoli: capitoliConParole,
      media: mediaConUrl,
      avanzamento,
    },
    risultati,
  };
}

/** Totali dell'anno base, se quell'esercizio è stato compilato. Servono al
 *  confronto degli indicatori: senza, il confronto semplicemente non compare. */
async function totaliAnnoBase(
  userId: string,
  orgId: string,
  companyId: string,
  annoBase: number,
  vettori: VettoreRisolto[],
) {
  const righe = await withTenant({ userId, orgId }, async (tx) => {
    const [b] = await tx
      .select({ id: energyBalance.id })
      .from(energyBalance)
      .where(and(eq(energyBalance.companyId, companyId), eq(energyBalance.anno, annoBase)));
    if (!b) return null;
    return tx.select().from(energyVectorInput).where(eq(energyVectorInput.balanceId, b.id));
  });
  if (!righe) return null;

  const defs: VettoreDef[] = vettori.map((v) => ({
    key: v.key, categoria: v.categoria, rinnovabile: v.rinnovabile, sub: v.sub,
  }));
  const fattori = new Map<string, Fattori>(
    vettori.map((v) => [v.key, { kwhUnita: v.kwhUnita, tepUnita: v.tepUnita, feUnita: v.feUnita, feMarket: v.feMarket }]),
  );
  return computeVectors(
    defs,
    righe.map((r) => ({ vettoreKey: r.vettoreKey, quantita: r.quantita, costo: r.costo })),
    fattori,
  ).totali;
}

function calcolaAvanzamento(i: {
  profilo: ProfiloEnergetico;
  inputs: { quantita: string | null; costo: string | null }[];
  risultati: ReturnType<typeof serializzaRisultati>;
  usi: { attivo: boolean; metodo: string | null }[];
  driverCorrente: Partial<Record<DriverKey, string>>;
  misure: { descrizione: string; quantita: string | null }[];
  capitoli: { parole: number }[];
  capitoliTotali: number;
}): EnergyProgress {
  const valorizzati = i.inputs.filter((x) => x.quantita !== null && x.quantita !== "");
  const attivi = i.usi.filter((u) => u.attivo);
  return computeEnergyProgress({
    profiloCompilati: PROFILO_RICHIESTI.filter((k) => (i.profilo[k] ?? "").trim() !== "").length,
    vettoriValorizzati: valorizzati.length,
    vettoriConCosto: valorizzati.filter((x) => x.costo !== null && x.costo !== "").length,
    vettoriQuadrati: i.risultati.quadratura.ok,
    vettoriDaQuadrare: i.risultati.quadratura.valutati,
    usiAttivi: attivi.length,
    usiConMetodo: attivi.filter((u) => u.metodo !== null).length,
    driverCompilati: DRIVER_KEYS.filter((k) => (i.driverCorrente[k] ?? "").trim() !== "").length,
    interventiCompleti: i.misure.filter((m) => m.descrizione.trim() !== "" && m.quantita !== null).length,
    capitoliScritti: i.capitoli.filter((c) => c.parole >= 20).length,
    capitoliTotali: i.capitoliTotali,
  });
}
