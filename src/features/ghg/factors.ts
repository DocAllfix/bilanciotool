import { db } from "@/lib/db";
import { withTenant } from "@/lib/db/tenant";
import { emissionFactor, ghgActivityRow, ghgOrgFactor } from "@/lib/db/schema";
import { logAudit } from "@/lib/audit";
import { requireEntitlement } from "@/features/entitlement";
import { and, eq } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { fattoreOrgSchema } from "./validation";
import { nz, toFixedStr } from "@/lib/calc/shared/decimal";
import type { z } from "zod";

// Libreria fattori: modello a OVERLAY (diverso dal prototipo, che copiava tutta
// la libreria per organizzazione). La base di piattaforma resta versionata e
// aggiornabile; l'org vede base + override/custom propri. Le voci già inserite
// non cambiano mai: il fattore applicato è congelato sulla riga.

export type FactorView = {
  key: string;
  gruppo: string;
  nome: string;
  um: string;
  fe: string;
  feMarket: string | null;
  feBiogenic: string | null;
  categoryKey: string;
  sourceTypeKey: string;
  fonte: string | null;
  origine: "piattaforma" | "override" | "custom";
};

export async function listFactors(userId: string, orgId: string, contentSetId: string): Promise<FactorView[]> {
  const base = await db.select().from(emissionFactor).where(eq(emissionFactor.setId, contentSetId));
  const overrides = await withTenant({ userId, orgId }, (tx) =>
    tx.select().from(ghgOrgFactor).where(eq(ghgOrgFactor.organizationId, orgId)),
  );
  const byKey = new Map<string, FactorView>();
  for (const f of base) {
    byKey.set(f.key, {
      key: f.key,
      gruppo: f.gruppo,
      nome: f.nome,
      um: f.um,
      fe: f.fe,
      feMarket: f.feMarket,
      feBiogenic: f.feBiogenic,
      categoryKey: f.categoryKey,
      sourceTypeKey: f.sourceTypeKey,
      fonte: f.fonte,
      origine: "piattaforma",
    });
  }
  for (const o of overrides) {
    byKey.set(o.key, {
      key: o.key,
      gruppo: o.gruppo,
      nome: o.nome,
      um: o.um,
      fe: o.fe,
      feMarket: o.feMarket,
      feBiogenic: o.feBiogenic,
      categoryKey: o.categoryKey,
      sourceTypeKey: o.sourceTypeKey,
      fonte: o.fonte,
      origine: o.baseFactorKey ? "override" : "custom",
    });
  }
  return [...byKey.values()];
}

export async function upsertOrgFactor(
  userId: string,
  orgId: string,
  input: z.input<typeof fattoreOrgSchema>,
): Promise<void> {
  await requireEntitlement(userId, orgId, "write_data");
  const v = fattoreOrgSchema.parse(input);
  await withTenant({ userId, orgId }, async (tx) => {
    await tx
      .insert(ghgOrgFactor)
      .values({
        id: randomUUID(),
        organizationId: orgId,
        key: v.key,
        baseFactorKey: v.baseFactorKey,
        gruppo: v.gruppo,
        nome: v.nome,
        um: v.um,
        fe: toFixedStr(nz(v.fe)),
        feMarket: v.feMarket === null || v.feMarket === "" ? null : toFixedStr(nz(v.feMarket)),
        feBiogenic: v.feBiogenic === null || v.feBiogenic === "" ? null : toFixedStr(nz(v.feBiogenic)),
        categoryKey: v.categoryKey,
        sourceTypeKey: v.sourceTypeKey,
        fonte: v.fonte || null,
      })
      .onConflictDoUpdate({
        target: [ghgOrgFactor.organizationId, ghgOrgFactor.key],
        set: {
          gruppo: v.gruppo,
          nome: v.nome,
          um: v.um,
          fe: toFixedStr(nz(v.fe)),
          feMarket: v.feMarket === null || v.feMarket === "" ? null : toFixedStr(nz(v.feMarket)),
          feBiogenic: v.feBiogenic === null || v.feBiogenic === "" ? null : toFixedStr(nz(v.feBiogenic)),
          categoryKey: v.categoryKey,
          sourceTypeKey: v.sourceTypeKey,
          fonte: v.fonte || null,
        },
      });
    await logAudit(tx, {
      organizationId: orgId,
      userId,
      azione: "ghg.factor.upsert",
      entita: "ghg_org_factor",
      entitaId: v.key,
      dettagli: { fe: v.fe, fonte: v.fonte },
    });
  });
}

export async function deleteOrgFactor(userId: string, orgId: string, key: string): Promise<void> {
  await requireEntitlement(userId, orgId, "write_data");
  await withTenant({ userId, orgId }, async (tx) => {
    // Un fattore custom referenziato da voci esistenti non si elimina: le voci
    // conservano fe congelato, ma il riferimento resterebbe orfano nella UI.
    const inUso = await tx
      .select({ id: ghgActivityRow.id })
      .from(ghgActivityRow)
      .where(and(eq(ghgActivityRow.organizationId, orgId), eq(ghgActivityRow.factorKey, key)))
      .limit(1);
    if (inUso.length) throw new Error("Fattore in uso in una o più voci: non eliminabile");
    const deleted = await tx
      .delete(ghgOrgFactor)
      .where(and(eq(ghgOrgFactor.organizationId, orgId), eq(ghgOrgFactor.key, key)))
      .returning({ id: ghgOrgFactor.id });
    if (!deleted.length) throw new Error("Override inesistente");
    await logAudit(tx, { organizationId: orgId, userId, azione: "ghg.factor.delete", entita: "ghg_org_factor", entitaId: key });
  });
}
