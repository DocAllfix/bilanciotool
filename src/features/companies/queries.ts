import { withTenant } from "@/lib/db/tenant";
import { company, ghgActivityRow, ghgInventory } from "@/lib/db/schema";
import { computeInventory } from "@/lib/calc/ghg/totals";
import { toFixedStr } from "@/lib/calc/shared/decimal";
import { desc, eq, inArray } from "drizzle-orm";

// Statistiche del portafoglio: per ogni azienda l'ultimo inventario e il totale
// location-based CALCOLATO al volo (i derivati non sono mai persistiti).

export type CompanyCardStats = {
  id: string;
  nome: string;
  settore: string | null;
  sede: string | null;
  stato: "active" | "archived";
  isDemo: boolean;
  ultimoAnno: number | null;
  inventoryId: string | null;
  voci: number;
  totL: string | null;
};

export async function listCompaniesWithStats(userId: string, orgId: string): Promise<CompanyCardStats[]> {
  return withTenant({ userId, orgId }, async (tx) => {
    const aziende = await tx
      .select()
      .from(company)
      .where(eq(company.organizationId, orgId))
      .orderBy(desc(company.createdAt));
    if (!aziende.length) return [];

    const inventari = await tx
      .select({ id: ghgInventory.id, companyId: ghgInventory.companyId, anno: ghgInventory.anno })
      .from(ghgInventory)
      .where(inArray(ghgInventory.companyId, aziende.map((a) => a.id)))
      .orderBy(desc(ghgInventory.anno));

    const ultimoPerAzienda = new Map<string, { id: string; anno: number }>();
    for (const inv of inventari) {
      if (!ultimoPerAzienda.has(inv.companyId)) ultimoPerAzienda.set(inv.companyId, { id: inv.id, anno: inv.anno });
    }

    const invIds = [...ultimoPerAzienda.values()].map((i) => i.id);
    const righe = invIds.length
      ? await tx.select().from(ghgActivityRow).where(inArray(ghgActivityRow.inventoryId, invIds))
      : [];
    const perInventario = new Map<string, typeof righe>();
    for (const r of righe) {
      const arr = perInventario.get(r.inventoryId) ?? [];
      arr.push(r);
      perInventario.set(r.inventoryId, arr);
    }

    return aziende.map((a) => {
      const ultimo = ultimoPerAzienda.get(a.id) ?? null;
      const rows = ultimo ? (perInventario.get(ultimo.id) ?? []) : [];
      const c = rows.length
        ? computeInventory(
            rows.map((r) => ({
              id: r.id,
              categoryKey: r.categoryKey,
              sourceTypeKey: r.sourceTypeKey,
              quantita: r.quantita,
              fe: r.fe,
              feMarket: r.feMarket,
              quotaGo: r.quotaGo,
              feBiogenic: r.feBiogenic,
              dq: r.dq,
              incertezza: r.incertezza,
            })),
          )
        : null;
      return {
        id: a.id,
        nome: a.nome,
        settore: a.settore,
        sede: a.sede,
        stato: a.stato,
        isDemo: a.isDemo,
        ultimoAnno: ultimo?.anno ?? null,
        inventoryId: ultimo?.id ?? null,
        voci: rows.length,
        totL: c ? toFixedStr(c.totL, 3) : null,
      };
    });
  });
}
