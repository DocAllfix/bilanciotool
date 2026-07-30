import { db } from "@/lib/db";
import { withTenant } from "@/lib/db/tenant";
import { checklistRequirement, ghgActivityRow, ghgInventory, ghgSourceType, ghgTarget } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { computeInventory, type InventoryRowInput } from "@/lib/calc/ghg/totals";
import { computeIntensity } from "@/lib/calc/ghg/intensity";
import { baseVariationPct, computeTargetProgress, scopeValue, type TargetScope } from "@/lib/calc/ghg/targets";
import { computeProgress } from "@/lib/calc/ghg/status";
import { toFixedStr, dec, type Decimal } from "@/lib/calc/shared/decimal";
import { listSourceStates } from "./sources";
import { listChecklistStates } from "./checklist";
import { listFactors } from "./factors";

// Risultati dell'inventario: SOLO lettura. Compone gli input dal DB e calcola
// con src/lib/calc — i derivati non toccano mai il database. I Decimal si
// serializzano a stringa per il confine server→client.

const s = (d: Decimal, dp = 6) => toFixedStr(d, dp);

const toRowInput = (r: typeof ghgActivityRow.$inferSelect): InventoryRowInput => ({
  id: r.id,
  categoryKey: r.categoryKey,
  sourceTypeKey: r.sourceTypeKey,
  descrizione: r.descrizione,
  quantita: r.quantita,
  fe: r.fe,
  feMarket: r.feMarket,
  quotaGo: r.quotaGo,
  feBiogenic: r.feBiogenic,
  dq: r.dq,
  incertezza: r.incertezza,
});

export async function getResults(userId: string, orgId: string, inventoryId: string) {
  const { inv, rows, baseRows, targets } = await withTenant({ userId, orgId }, async (tx) => {
    const [inv] = await tx.select().from(ghgInventory).where(eq(ghgInventory.id, inventoryId));
    if (!inv) throw new Error("Inventario inesistente o di un altro tenant");
    const rows = await tx.select().from(ghgActivityRow).where(eq(ghgActivityRow.inventoryId, inventoryId));
    // Inventario dell'anno base della stessa azienda (se esiste ed è diverso).
    let baseRows: (typeof ghgActivityRow.$inferSelect)[] = [];
    if (inv.annoBase !== inv.anno) {
      const [baseInv] = await tx
        .select({ id: ghgInventory.id })
        .from(ghgInventory)
        .where(and(eq(ghgInventory.companyId, inv.companyId), eq(ghgInventory.anno, inv.annoBase)));
      if (baseInv) baseRows = await tx.select().from(ghgActivityRow).where(eq(ghgActivityRow.inventoryId, baseInv.id));
    }
    const targets = await tx.select().from(ghgTarget).where(eq(ghgTarget.companyId, inv.companyId));
    return { inv, rows, baseRows, targets };
  });

  const c = computeInventory(rows.map(toRowInput));
  const base = baseRows.length ? computeInventory(baseRows.map(toRowInput)) : null;
  const intensita = computeIntensity(c.totL, { ricavi: inv.ricavi, fte: inv.fte, produzione: inv.produzione });
  const varBase = base ? baseVariationPct(c.totL, base.totL) : null;

  return {
    anno: inv.anno,
    annoBase: inv.annoBase,
    gwpSetKey: inv.gwpSetKey,
    n: c.n,
    s1: s(c.s1),
    s2l: s(c.s2l),
    s2m: s(c.s2m),
    s3: s(c.s3),
    totL: s(c.totL),
    totM: s(c.totM),
    bio: s(c.bio),
    incPct: s(c.incPct, 4),
    incMPct: s(c.incMPct, 4),
    dqMedia: s(c.dqMedia, 4),
    perCategoria: Object.fromEntries(
      Object.entries(c.perCategoria).map(([k, a]) => [
        k,
        { n: a.n, t: s(a.t), tM: s(a.tM), bio: s(a.bio), incPct: s(a.incPct, 4), dqMedia: s(a.dqMedia, 4) },
      ]),
    ),
    top: c.top.slice(0, 12).map((t) => ({ id: t.id, categoryKey: t.categoryKey, descrizione: t.descrizione, t: s(t.t) })),
    intensita: {
      perFatturato: intensita.perFatturato ? s(intensita.perFatturato, 4) : null,
      perAddetto: intensita.perAddetto ? s(intensita.perAddetto, 2) : null,
      perUnita: intensita.perUnita ? s(intensita.perUnita, 4) : null,
    },
    variazioneAnnoBasePct: varBase ? s(varBase, 4) : null,
    obiettivi: targets.map((t) => {
      const baseVal = base ? scopeValue(base, t.ambito as TargetScope) : null;
      const attuale = scopeValue(c, t.ambito as TargetScope);
      const progress = baseVal
        ? computeTargetProgress({ base: baseVal, attuale, riduzionePct: t.riduzionePct })
        : null;
      return {
        id: t.id,
        nome: t.nome,
        ambito: t.ambito,
        riduzionePct: t.riduzionePct,
        annoTarget: t.annoTarget,
        note: t.note,
        base: baseVal ? s(baseVal) : null,
        attuale: s(attuale),
        traguardo: progress ? s(progress.traguardo) : null,
        percorsoPct: progress ? s(progress.percorsoPct, 2) : null,
      };
    }),
  };
}

// Avanzamento del percorso (per stepper e portfolio): compone gli input reali
// e delega a computeProgress (contratto del prototipo).
export async function getProgress(userId: string, orgId: string, inventoryId: string) {
  const inv = await withTenant({ userId, orgId }, async (tx) => {
    const [i] = await tx.select().from(ghgInventory).where(eq(ghgInventory.id, inventoryId));
    if (!i) throw new Error("Inventario inesistente o di un altro tenant");
    return i;
  });
  const [states, checklist, rows, targets, totalSources, totalChecklist, factors] = await Promise.all([
    listSourceStates(userId, orgId, inventoryId),
    listChecklistStates(userId, orgId, inventoryId),
    withTenant({ userId, orgId }, (tx) =>
      tx
        .select({ sourceTypeKey: ghgActivityRow.sourceTypeKey, factorKey: ghgActivityRow.factorKey })
        .from(ghgActivityRow)
        .where(eq(ghgActivityRow.inventoryId, inventoryId)),
    ),
    withTenant({ userId, orgId }, (tx) => tx.select({ id: ghgTarget.id }).from(ghgTarget).where(eq(ghgTarget.companyId, inv.companyId))),
    db.select({ key: ghgSourceType.key }).from(ghgSourceType).where(eq(ghgSourceType.setId, inv.contentSetId)),
    db.select({ key: checklistRequirement.key }).from(checklistRequirement).where(eq(checklistRequirement.setId, inv.contentSetId)),
    listFactors(userId, orgId, inv.contentSetId),
  ]);

  const rowsBySource: Record<string, number> = {};
  for (const r of rows) rowsBySource[r.sourceTypeKey] = (rowsBySource[r.sourceTypeKey] ?? 0) + 1;
  const usedKeys = [...new Set(rows.map((r) => r.factorKey).filter((k): k is string => Boolean(k)))];
  const factorByKey = new Map(factors.map((f) => [f.key, f]));

  return computeProgress({
    boundaries: inv.boundaries as Record<string, string>,
    sourceStates: Object.fromEntries(states.map((x) => [x.sourceTypeKey, x.stato])),
    totalSources: totalSources.length,
    rowsBySource,
    usedFactors: usedKeys.map((k) => ({ key: k, fonte: factorByKey.get(k)?.fonte ?? null })),
    targetsCount: targets.length,
    checklist: Object.fromEntries(checklist.map((x) => [x.requirementKey, x.stato])),
    totalChecklist: totalChecklist.length,
  });
}
