import { and, eq } from "drizzle-orm";
import type { Tx } from "@/lib/db/tenant";
import { energyBalance, energyVectorInput, ghgActivityRow, ghgInventory } from "@/lib/db/schema";
import { CORRISPONDENZE, quantitaGhg } from "@/lib/calc/ponti/consumi";
import { nz, toFixedStr } from "@/lib/calc/shared/decimal";

// I consumi di un esercizio, letti dove nascono: l'inventario GHG e il bilancio energetico.
// Servono a PROPORRE il numero accanto a un campo vuoto di un altro percorso, con la fonte.
// Non si scrive niente: il dato resta dove nasce.

export type Proposta = { valore: string; fonte: string };

export async function consumiDellAnno(tx: Tx, orgId: string, companyId: string, anno: number) {
  const [inv] = await tx
    .select({ id: ghgInventory.id })
    .from(ghgInventory)
    .where(and(eq(ghgInventory.companyId, companyId), eq(ghgInventory.organizationId, orgId), eq(ghgInventory.anno, anno)))
    .limit(1);
  const righe = inv
    ? await tx
        .select({ factorKey: ghgActivityRow.factorKey, quantita: ghgActivityRow.quantita })
        .from(ghgActivityRow)
        .where(eq(ghgActivityRow.inventoryId, inv.id))
    : [];
  const ghg = quantitaGhg(righe);

  const [bil] = await tx
    .select({ id: energyBalance.id })
    .from(energyBalance)
    .where(and(eq(energyBalance.companyId, companyId), eq(energyBalance.organizationId, orgId), eq(energyBalance.anno, anno)))
    .limit(1);
  const vettori = bil
    ? await tx
        .select({ k: energyVectorInput.vettoreKey, q: energyVectorInput.quantita })
        .from(energyVectorInput)
        .where(eq(energyVectorInput.balanceId, bil.id))
    : [];
  const energetico: Record<string, string | null> = {};
  for (const c of CORRISPONDENZE) {
    const v = c.vettore ? vettori.find((x) => x.k === c.vettore) : undefined;
    energetico[c.key] = v?.q && nz(v.q).gt(0) ? toFixedStr(nz(v.q), 3) : null;
  }
  return { anno, ghg, energetico };
}

/**
 * Le proposte per gli indicatori del bilancio di sostenibilità di un esercizio, solo per i
 * campi VUOTI. Il bilancio energetico viene prima del GHG: è costruito sulle fatture.
 */
export function proposteKpi(
  consumi: Awaited<ReturnType<typeof consumiDellAnno>>,
  kpiAttuali: Record<string, string | undefined>,
): Record<string, Proposta> {
  const out: Record<string, Proposta> = {};
  for (const c of CORRISPONDENZE) {
    if (!c.kpi || (kpiAttuali[c.kpi] ?? "").trim() !== "") continue;
    const e = consumi.energetico[c.key];
    const g = consumi.ghg[c.key];
    if (e) out[c.kpi] = { valore: e, fonte: `dal bilancio energetico ${consumi.anno}` };
    else if (g) out[c.kpi] = { valore: g, fonte: `dall'inventario GHG ${consumi.anno}` };
  }
  return out;
}

/** Le proposte per i vettori del bilancio energetico ancora vuoti, dall'inventario GHG. */
export function proposteVettori(
  consumi: Awaited<ReturnType<typeof consumiDellAnno>>,
  vettoriAttuali: Record<string, string | null | undefined>,
): Record<string, Proposta> {
  const out: Record<string, Proposta> = {};
  for (const c of CORRISPONDENZE) {
    if (!c.vettore || (vettoriAttuali[c.vettore] ?? "") !== "") continue;
    const g = consumi.ghg[c.key];
    if (g) out[c.vettore] = { valore: g, fonte: `dall'inventario GHG ${consumi.anno}` };
  }
  return out;
}

/** Le proposte per le voci GHG a quantità zero, dal bilancio energetico (per fattore). */
export function proposteVociGhg(consumi: Awaited<ReturnType<typeof consumiDellAnno>>): Record<string, Proposta> {
  const out: Record<string, Proposta> = {};
  for (const c of CORRISPONDENZE) {
    const e = consumi.energetico[c.key];
    // Una corrispondenza con più fattori (elettricità di rete e con GO) non si può ripartire:
    // si propone sul primo, che è quello di rete.
    if (e) out[c.ghg[0]] = { valore: e, fonte: `dal bilancio energetico ${consumi.anno}` };
  }
  return out;
}
