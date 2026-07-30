import { db } from "@/lib/db";
import { withTenant } from "@/lib/db/tenant";
import { company, emissionFactor, ghgActivityRow, ghgChecklistStatus, ghgInventory, ghgOrgFactor, ghgSourceSelection, ghgTarget } from "@/lib/db/schema";
import { logAudit } from "@/lib/audit";
import { requireEntitlement } from "@/features/entitlement";
import { parseGhgExport } from "@/features/import/parser";
import { latestContentSetId } from "./inventories";
import { eq } from "drizzle-orm";
import { randomUUID } from "node:crypto";

// Import di migrazione dal prototipo GHG: TUTTO in un'unica transazione —
// un errore a metà file = zero righe scritte (verificato dai test).
// Strategia: un inventario per ogni anno presente nelle voci (+ anno principale);
// registro sorgenti, checklist e confini si applicano a ogni inventario creato
// (nel prototipo erano per-organizzazione); i fattori del prototipo diventano
// override org SOLO se divergono dalla libreria di piattaforma o sono custom.

export type GhgImportEsito = {
  companyId: string;
  inventari: { anno: number; id: string; voci: number }[];
  fattoriOverride: number;
  obiettivi: number;
};

export async function importGhgFromJson(
  userId: string,
  orgId: string,
  companyId: string,
  json: unknown,
): Promise<GhgImportEsito> {
  await requireEntitlement(userId, orgId, "write_data");
  const parsed = parseGhgExport(json);
  if (parsed.organizzazioni.length !== 1) {
    throw new Error("L'import su un'azienda richiede il file di una singola organizzazione (non l'archivio completo)");
  }
  const o = parsed.organizzazioni[0];
  const setId = await latestContentSetId("ghg");
  const platformFactors = await db.select().from(emissionFactor).where(eq(emissionFactor.setId, setId));
  const platByKey = new Map(platformFactors.map((f) => [f.key, f]));

  return withTenant({ userId, orgId }, async (tx) => {
    const [co] = await tx.select({ id: company.id }).from(company).where(eq(company.id, companyId));
    if (!co) throw new Error("Azienda inesistente o di un altro tenant");

    // Fattori: override solo se differenti dalla piattaforma, o custom.
    let fattoriOverride = 0;
    for (const f of o.fattori) {
      const base = platByKey.get(f.key);
      const uguale =
        base &&
        base.fe === f.fe &&
        (base.feMarket ?? null) === f.feMarket &&
        (base.feBiogenic ?? null) === f.feBiogenic;
      if (uguale) continue;
      await tx
        .insert(ghgOrgFactor)
        .values({
          id: randomUUID(),
          organizationId: orgId,
          key: f.key,
          baseFactorKey: base ? f.key : null,
          gruppo: f.gruppo,
          nome: f.nome,
          um: f.um,
          fe: f.fe,
          feMarket: f.feMarket,
          feBiogenic: f.feBiogenic,
          categoryKey: f.categoryKey,
          sourceTypeKey: f.sourceTypeKey,
          fonte: f.fonte,
        })
        .onConflictDoUpdate({
          target: [ghgOrgFactor.organizationId, ghgOrgFactor.key],
          set: { fe: f.fe, feMarket: f.feMarket, feBiogenic: f.feBiogenic, fonte: f.fonte },
        });
      fattoriOverride += 1;
    }

    // Un inventario per ogni anno con voci (+ l'anno principale del prototipo).
    const anni = [...new Set([o.anno, ...o.voci.map((v) => v.anno)])].sort();
    const inventari: GhgImportEsito["inventari"] = [];
    for (const anno of anni) {
      const invId = randomUUID();
      const meta = o.metaAnnuali[String(anno)];
      await tx.insert(ghgInventory).values({
        id: invId,
        organizationId: orgId,
        companyId,
        anno,
        annoBase: o.annoBase,
        gwpSetKey: (o.profilo.gwp as "AR4" | "AR5" | "AR6") || "AR6",
        contentSetId: setId,
        boundaries: o.profilo,
        ricavi: meta?.ricavi ?? null,
        fte: meta?.fte ?? null,
        produzione: meta?.produzione ?? null,
        umProduzione: meta?.umProduzione || null,
      });
      for (const [key, st] of Object.entries(o.sorgenti)) {
        await tx.insert(ghgSourceSelection).values({
          id: randomUUID(),
          organizationId: orgId,
          inventoryId: invId,
          sourceTypeKey: key,
          stato: st.stato,
          motivazione: st.motivazione || null,
        });
      }
      for (const [key, st] of Object.entries(o.checklist)) {
        await tx.insert(ghgChecklistStatus).values({
          id: randomUUID(),
          organizationId: orgId,
          inventoryId: invId,
          requirementKey: key,
          stato: st.stato,
          nota: st.nota || null,
        });
      }
      const vociAnno = o.voci.filter((v) => v.anno === anno);
      for (const v of vociAnno) {
        await tx.insert(ghgActivityRow).values({
          id: randomUUID(),
          organizationId: orgId,
          inventoryId: invId,
          sourceTypeKey: v.sourceTypeKey,
          categoryKey: v.categoryKey,
          sede: v.sede || null,
          descrizione: v.descrizione || null,
          factorKey: v.factorKey,
          um: v.um || "unità",
          quantita: v.quantita,
          fe: v.fe,
          feMarket: v.feMarket,
          quotaGo: v.quotaGo,
          feBiogenic: v.feBiogenic,
          dq: v.dq,
          incertezza: v.incertezza,
          evidenza: v.evidenza || null,
          note: v.note || null,
        });
      }
      inventari.push({ anno, id: invId, voci: vociAnno.length });
    }

    for (const b of o.obiettivi) {
      await tx.insert(ghgTarget).values({
        id: randomUUID(),
        organizationId: orgId,
        companyId,
        nome: b.nome || "Obiettivo di riduzione",
        ambito: b.ambito,
        riduzionePct: b.riduzionePct,
        annoTarget: b.annoTarget,
        note: b.note || null,
      });
    }

    await logAudit(tx, {
      organizationId: orgId,
      userId,
      azione: "ghg.import",
      entita: "company",
      entitaId: companyId,
      dettagli: { anni, voci: o.voci.length, fattoriOverride, obiettivi: o.obiettivi.length },
    });

    return { companyId, inventari, fattoriOverride, obiettivi: o.obiettivi.length };
  });
}
