import { withTenant } from "@/lib/db/tenant";
import { fondiJsonb } from "@/lib/db/jsonb";
import { db } from "@/lib/db";
import { company, ghgInventory } from "@/lib/db/schema";
import { logAudit } from "@/lib/audit";
import { requireEntitlement } from "@/features/entitlement";
import { and, desc, eq } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { inventarioSchema, boundariesSchema, metaPeriodoSchema } from "./validation";
import type { z } from "zod";
import { latestSetId } from "@/features/content-set";
import { profiloAzienda } from "@/features/companies/profilo";
import { proponiVociGhg, riprendiVociPrecedenti } from "./proposte";

// Inventari GHG: uno per azienda+anno. La versione dei contenuti metodologici
// (content_set) si congela alla creazione: gli aggiornamenti normativi futuri
// non riscrivono gli inventari esistenti.

export async function latestContentSetId(dominio: "ghg" | "report"): Promise<string> {
  return latestSetId(dominio, `Nessun content_set per il dominio ${dominio}: eseguire npm run db:seed`);
}

export async function createInventory(
  userId: string,
  orgId: string,
  input: z.input<typeof inventarioSchema>,
): Promise<string> {
  await requireEntitlement(userId, orgId, "write_data");
  const v = inventarioSchema.parse(input);
  const setId = await latestContentSetId("ghg");
  const id = randomUUID();
  await withTenant({ userId, orgId }, async (tx) => {
    const [co] = await tx.select({ id: company.id }).from(company).where(eq(company.id, v.companyId));
    if (!co) throw new Error("Azienda inesistente o di un altro tenant");
    // ⚠️ LE VOCI SI TROVANO DA SOLE (17 ottobre 2026). I confini partono dall'esercizio
    // precedente, se c'è — i testi lunghi (perimetro, metodologia, regola di ricalcolo) li
    // ha già scritti il consulente — e i campi ancora vuoti dall'anagrafica dell'azienda.
    // Ricavi e addetti si COPIANO una volta: sono i valori dell'esercizio, non un
    // collegamento vivo con l'anagrafica corrente.
    const az = await profiloAzienda(tx, orgId, v.companyId);
    const [prec] = await tx
      .select({ id: ghgInventory.id, anno: ghgInventory.anno, boundaries: ghgInventory.boundaries })
      .from(ghgInventory)
      .where(and(eq(ghgInventory.companyId, v.companyId), eq(ghgInventory.organizationId, orgId)))
      .orderBy(desc(ghgInventory.anno))
      .limit(1);
    const daAnagrafica: Record<string, string> = {};
    if (az?.piva) daAnagrafica.piva = az.piva;
    if (az?.sede) daAnagrafica.sede = az.sede;
    if (az?.settore) daAnagrafica.settore = az.settore;
    if (az?.ateco) daAnagrafica.ateco = az.ateco;
    if (az?.dipendenti != null) daAnagrafica.dipendenti = String(az.dipendenti);
    const precedenti = Object.fromEntries(
      Object.entries((prec?.boundaries ?? {}) as Record<string, string>).filter(([, x]) => typeof x === "string" && x.trim() !== ""),
    );
    const boundaries = { ...daAnagrafica, ...precedenti };
    await tx.insert(ghgInventory).values({
      id,
      organizationId: orgId,
      companyId: v.companyId,
      anno: v.anno,
      annoBase: v.annoBase ?? v.anno,
      gwpSetKey: v.gwpSetKey,
      contentSetId: setId,
      boundaries,
      ricavi: az?.fatturato ?? null,
      fte: az?.dipendenti != null ? String(az.dipendenti) : null,
    });
    await logAudit(tx, { organizationId: orgId, userId, azione: "ghg.inventory.create", entita: "ghg_inventory", entitaId: id });
    // Le voci si propongono da sole: quelle dell'esercizio prima se c'è, altrimenti quelle
    // tipiche del codice ATECO. Tutte a quantità zero, marcate «proposta».
    const riprese = prec ? await riprendiVociPrecedenti(tx, userId, orgId, prec.id, id, prec.anno) : 0;
    if (!riprese) await proponiVociGhg(tx, userId, orgId, id, boundaries.ateco);
  });
  return id;
}

export async function updateBoundaries(
  userId: string,
  orgId: string,
  inventoryId: string,
  input: z.input<typeof boundariesSchema>,
): Promise<void> {
  await requireEntitlement(userId, orgId, "write_data");
  const patch = boundariesSchema.parse(input);
  await withTenant({ userId, orgId }, async (tx) => {
    // Fusione in un'istruzione sola: vedi `fondiJsonb`.
    const toccate = await tx
      .update(ghgInventory)
      .set({ boundaries: fondiJsonb(ghgInventory.boundaries, patch) })
      .where(and(eq(ghgInventory.id, inventoryId), eq(ghgInventory.organizationId, orgId)))
      .returning({ id: ghgInventory.id });
    if (!toccate.length) throw new Error("Inventario inesistente o di un altro tenant");
    await logAudit(tx, { organizationId: orgId, userId, azione: "ghg.boundaries.update", entita: "ghg_inventory", entitaId: inventoryId });
    // Appena si scrive il codice ATECO, le voci tipiche entrano da sole (e quelle del profilo
    // vecchio, se nessuno le ha toccate, escono).
    if (patch.ateco !== undefined) await proponiVociGhg(tx, userId, orgId, inventoryId, patch.ateco);
  });
}

export async function updatePeriodMeta(
  userId: string,
  orgId: string,
  inventoryId: string,
  input: z.input<typeof metaPeriodoSchema>,
): Promise<void> {
  await requireEntitlement(userId, orgId, "write_data");
  const v = metaPeriodoSchema.parse(input);
  await withTenant({ userId, orgId }, async (tx) => {
    const updated = await tx
      .update(ghgInventory)
      .set({
        ricavi: v.ricavi === undefined ? undefined : v.ricavi,
        fte: v.fte === undefined ? undefined : v.fte,
        produzione: v.produzione === undefined ? undefined : v.produzione,
        umProduzione: v.umProduzione,
      })
      .where(eq(ghgInventory.id, inventoryId))
      .returning({ id: ghgInventory.id });
    if (!updated.length) throw new Error("Inventario inesistente o di un altro tenant");
    await logAudit(tx, { organizationId: orgId, userId, azione: "ghg.meta.update", entita: "ghg_inventory", entitaId: inventoryId });
  });
}

export async function setBaseYear(userId: string, orgId: string, inventoryId: string, annoBase: number): Promise<void> {
  await requireEntitlement(userId, orgId, "write_data");
  await withTenant({ userId, orgId }, async (tx) => {
    const updated = await tx
      .update(ghgInventory)
      .set({ annoBase })
      .where(eq(ghgInventory.id, inventoryId))
      .returning({ id: ghgInventory.id });
    if (!updated.length) throw new Error("Inventario inesistente o di un altro tenant");
    await logAudit(tx, { organizationId: orgId, userId, azione: "ghg.baseyear.set", entita: "ghg_inventory", entitaId: inventoryId, dettagli: { annoBase } });
  });
}

export async function listInventories(userId: string, orgId: string, companyId: string) {
  return withTenant({ userId, orgId }, (tx) =>
    tx
      .select({ id: ghgInventory.id, anno: ghgInventory.anno, annoBase: ghgInventory.annoBase, gwpSetKey: ghgInventory.gwpSetKey })
      .from(ghgInventory)
      .where(eq(ghgInventory.companyId, companyId))
      .orderBy(desc(ghgInventory.anno)),
  );
}
