import { db } from "@/lib/db";
import { withTenant } from "@/lib/db/tenant";
import { checklistRequirement, company, ghgActivityRow, ghgCategory, ghgInventory, ghgSourceType, ghgTarget } from "@/lib/db/schema";
import { asc, eq } from "drizzle-orm";
import { listFactors, type FactorView } from "./factors";
import { listSourceStates } from "./sources";
import { listChecklistStates } from "./checklist";
import { getResults, getProgress } from "./results";
import { listInventories } from "./inventories";

// Dati completi per la pagina del percorso GHG (un solo punto di composizione).

export type WizardData = Awaited<ReturnType<typeof getWizardData>>;

export async function getWizardData(userId: string, orgId: string, companyId: string, anno: number) {
  const base = await withTenant({ userId, orgId }, async (tx) => {
    const [az] = await tx.select().from(company).where(eq(company.id, companyId));
    if (!az) return null;
    const [inv] = await tx
      .select()
      .from(ghgInventory)
      .where(eq(ghgInventory.companyId, companyId))
      .then((rows) => rows.filter((r) => r.anno === anno));
    return { az, inv: inv ?? null };
  });
  if (!base) return null;

  const inventari = await listInventories(userId, orgId, companyId);
  if (!base.inv) {
    return { azienda: serAz(base.az), inventario: null, inventari, catalogo: null, stato: null };
  }
  const inv = base.inv;

  const [categorie, sorgenti, requisiti, fattori, statiSorgenti, statiChecklist, righe, targets, risultati, progresso] =
    await Promise.all([
      db.select().from(ghgCategory).where(eq(ghgCategory.setId, inv.contentSetId)).orderBy(asc(ghgCategory.key)),
      db.select().from(ghgSourceType).where(eq(ghgSourceType.setId, inv.contentSetId)).orderBy(asc(ghgSourceType.key)),
      db.select().from(checklistRequirement).where(eq(checklistRequirement.setId, inv.contentSetId)).orderBy(asc(checklistRequirement.ordine)),
      listFactors(userId, orgId, inv.contentSetId),
      listSourceStates(userId, orgId, inv.id),
      listChecklistStates(userId, orgId, inv.id),
      withTenant({ userId, orgId }, (tx) => tx.select().from(ghgActivityRow).where(eq(ghgActivityRow.inventoryId, inv.id)).orderBy(asc(ghgActivityRow.createdAt))),
      withTenant({ userId, orgId }, (tx) => tx.select().from(ghgTarget).where(eq(ghgTarget.companyId, companyId))),
      getResults(userId, orgId, inv.id),
      getProgress(userId, orgId, inv.id),
    ]);

  return {
    azienda: serAz(base.az),
    inventario: {
      id: inv.id,
      anno: inv.anno,
      annoBase: inv.annoBase,
      gwpSetKey: inv.gwpSetKey,
      boundaries: inv.boundaries as Record<string, string>,
      ricavi: inv.ricavi,
      fte: inv.fte,
      produzione: inv.produzione,
      umProduzione: inv.umProduzione,
    },
    inventari,
    catalogo: {
      categorie: categorie.map((c) => ({ key: c.key, nome: c.nome, scope: c.scope, descrizione: c.descrizione })),
      sorgenti: sorgenti.map((s) => ({ key: s.key, categoryKey: s.categoryKey, nome: s.nome, descrizione: s.descrizione })),
      requisiti: requisiti.map((r) => ({ key: r.key, clausola: r.clausola, nome: r.nome, descrizione: r.descrizione })),
      fattori: fattori satisfies FactorView[],
    },
    stato: {
      sorgenti: statiSorgenti,
      checklist: statiChecklist,
      righe: righe.map((r) => ({
        id: r.id,
        sourceTypeKey: r.sourceTypeKey,
        categoryKey: r.categoryKey,
        sede: r.sede,
        descrizione: r.descrizione,
        factorKey: r.factorKey,
        um: r.um,
        quantita: r.quantita,
        fe: r.fe,
        feMarket: r.feMarket,
        quotaGo: r.quotaGo,
        feBiogenic: r.feBiogenic,
        dq: r.dq,
        incertezza: r.incertezza,
        evidenza: r.evidenza,
        note: r.note,
      })),
      obiettivi: targets.map((t) => ({ id: t.id, nome: t.nome, ambito: t.ambito, riduzionePct: t.riduzionePct, annoTarget: t.annoTarget, note: t.note })),
      risultati,
      progresso,
    },
  };
}

const serAz = (a: typeof company.$inferSelect) => ({
  id: a.id,
  nome: a.nome,
  settore: a.settore,
  sede: a.sede,
  stato: a.stato,
});
