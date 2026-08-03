import { randomUUID } from "node:crypto";
import { and, asc, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { withTenant } from "@/lib/db/tenant";
import { energyBalance, energyCompanyFactor, energyVector, energyVectorInput } from "@/lib/db/schema";
import { logAudit } from "@/lib/audit";
import { requireEntitlement } from "@/features/entitlement";
import { mensileSchema, perNumeric, vettoreInputSchema } from "./validation";
import type { z } from "zod";

// Energia in ingresso e fattori di conversione.
//
// I fattori seguono il modello a SOVRAPPOSIZIONE già usato per il GHG: la
// libreria di piattaforma resta la base, l'azienda ne sovrascrive i valori dove
// ha un dato proprio. Non si copia: una correzione della libreria raggiunge da
// sola i siti che non hanno personalizzato nulla, e ogni scostamento resta
// visibile, che è esattamente ciò che un verificatore chiede.

export type VettoreRisolto = {
  key: string;
  nome: string;
  um: string;
  categoria: "E" | "T" | "M";
  rinnovabile: boolean;
  sub: boolean;
  colore: string | null;
  kwhUnita: string;
  tepUnita: string;
  feUnita: string;
  feMarket: string | null;
  fonte: string | null;
  origine: "piattaforma" | "personalizzato";
};

export async function listVectors(
  userId: string,
  orgId: string,
  companyId: string,
  contentSetId: string,
): Promise<VettoreRisolto[]> {
  const [base, override] = await Promise.all([
    db
      .select()
      .from(energyVector)
      .where(eq(energyVector.setId, contentSetId))
      .orderBy(asc(energyVector.ordine)),
    withTenant({ userId, orgId }, (tx) =>
      tx.select().from(energyCompanyFactor).where(eq(energyCompanyFactor.companyId, companyId)),
    ),
  ]);
  const perKey = new Map(override.map((o) => [o.key, o]));

  return base.map((v) => {
    const o = perKey.get(v.key);
    const personalizzato =
      o !== undefined &&
      (o.kwhUnita !== null || o.tepUnita !== null || o.feUnita !== null || o.feMarket !== null);
    return {
      key: v.key,
      nome: v.nome,
      um: v.um,
      categoria: v.categoria,
      rinnovabile: v.rinnovabile,
      sub: v.sub,
      colore: v.colore,
      kwhUnita: o?.kwhUnita ?? v.kwhUnita,
      tepUnita: o?.tepUnita ?? v.tepUnita,
      feUnita: o?.feUnita ?? v.feUnita,
      feMarket: o?.feMarket ?? v.feMarket,
      fonte: o?.fonte ?? null,
      origine: personalizzato ? "personalizzato" : "piattaforma",
    };
  });
}

export async function listVectorInputs(userId: string, orgId: string, balanceId: string) {
  return withTenant({ userId, orgId }, (tx) =>
    tx.select().from(energyVectorInput).where(eq(energyVectorInput.balanceId, balanceId)),
  );
}

/** Quantità e costo di un vettore. Svuotare entrambi i campi rimuove la riga:
 *  un vettore non usato non deve comparire come zero nel documento. */
export async function setVectorInput(
  userId: string,
  orgId: string,
  balanceId: string,
  input: z.input<typeof vettoreInputSchema>,
): Promise<void> {
  await requireEntitlement(userId, orgId, "write_data");
  const v = vettoreInputSchema.parse(input);
  const quantita = perNumeric(v.quantita);
  const costo = perNumeric(v.costo);

  await withTenant({ userId, orgId }, async (tx) => {
    const [b] = await tx.select({ id: energyBalance.id }).from(energyBalance).where(eq(energyBalance.id, balanceId));
    if (!b) throw new Error("Bilancio inesistente o di un altro tenant");

    const [esistente] = await tx
      .select()
      .from(energyVectorInput)
      .where(and(eq(energyVectorInput.balanceId, balanceId), eq(energyVectorInput.vettoreKey, v.vettoreKey)));

    const mensiliVuoti = (esistente?.mensili as string[] | undefined)?.some((m) => m !== "") ?? false;
    if (quantita === null && costo === null && !mensiliVuoti) {
      if (esistente) await tx.delete(energyVectorInput).where(eq(energyVectorInput.id, esistente.id));
    } else if (esistente) {
      await tx
        .update(energyVectorInput)
        .set({ quantita, costo })
        .where(eq(energyVectorInput.id, esistente.id));
    } else {
      await tx.insert(energyVectorInput).values({
        id: randomUUID(),
        organizationId: orgId,
        balanceId,
        vettoreKey: v.vettoreKey,
        quantita,
        costo,
      });
    }

    await logAudit(tx, {
      organizationId: orgId,
      userId,
      azione: "energy.vettore.set",
      entita: "energy_vector_input",
      entitaId: balanceId,
      dettagli: { vettore: v.vettoreKey },
    });
  });
}

/** Aggiornamento di UN SOLO mese, eseguito in SQL con jsonb_set: il client manda
 *  indice e valore, mai i dodici mesi. Il default con dodici slot è obbligatorio,
 *  perché jsonb_set su un array più corto dell'indice è un no-op silenzioso. */
export async function setMonthlyValue(
  userId: string,
  orgId: string,
  balanceId: string,
  input: z.input<typeof mensileSchema>,
): Promise<void> {
  await requireEntitlement(userId, orgId, "write_data");
  const v = mensileSchema.parse(input);
  const valore = v.valore.trim();

  await withTenant({ userId, orgId }, async (tx) => {
    const [esistente] = await tx
      .select({ id: energyVectorInput.id })
      .from(energyVectorInput)
      .where(and(eq(energyVectorInput.balanceId, balanceId), eq(energyVectorInput.vettoreKey, v.vettoreKey)));

    if (!esistente) {
      const [b] = await tx.select({ id: energyBalance.id }).from(energyBalance).where(eq(energyBalance.id, balanceId));
      if (!b) throw new Error("Bilancio inesistente o di un altro tenant");
      const mensili = Array.from({ length: 12 }, (_, i) => (i === v.mese ? valore : ""));
      await tx.insert(energyVectorInput).values({
        id: randomUUID(),
        organizationId: orgId,
        balanceId,
        vettoreKey: v.vettoreKey,
        mensili,
      });
    } else {
      await tx
        .update(energyVectorInput)
        .set({
          mensili: sql`jsonb_set(${energyVectorInput.mensili}, ${`{${v.mese}}`}, ${JSON.stringify(valore)}::jsonb)`,
        })
        .where(eq(energyVectorInput.id, esistente.id));
    }
  });
}

export async function listCompanyFactors(userId: string, orgId: string, companyId: string) {
  return withTenant({ userId, orgId }, (tx) =>
    tx.select().from(energyCompanyFactor).where(eq(energyCompanyFactor.companyId, companyId)),
  );
}

export async function upsertCompanyFactor(
  userId: string,
  orgId: string,
  companyId: string,
  input: { key: string; kwhUnita?: string; tepUnita?: string; feUnita?: string; feMarket?: string; fonte?: string | null; note?: string | null },
): Promise<void> {
  await requireEntitlement(userId, orgId, "write_data");
  const valori = {
    kwhUnita: perNumeric(input.kwhUnita),
    tepUnita: perNumeric(input.tepUnita),
    feUnita: perNumeric(input.feUnita),
    feMarket: perNumeric(input.feMarket),
    fonte: input.fonte ?? null,
    note: input.note ?? null,
  };

  await withTenant({ userId, orgId }, async (tx) => {
    const [esistente] = await tx
      .select({ id: energyCompanyFactor.id })
      .from(energyCompanyFactor)
      .where(and(eq(energyCompanyFactor.companyId, companyId), eq(energyCompanyFactor.key, input.key)));

    if (esistente) {
      await tx.update(energyCompanyFactor).set(valori).where(eq(energyCompanyFactor.id, esistente.id));
    } else {
      await tx.insert(energyCompanyFactor).values({
        id: randomUUID(),
        organizationId: orgId,
        companyId,
        key: input.key,
        ...valori,
      });
    }
    await logAudit(tx, {
      organizationId: orgId,
      userId,
      azione: "energy.fattore.upsert",
      entita: "energy_company_factor",
      entitaId: companyId,
      dettagli: { vettore: input.key },
    });
  });
}

/** Ripristina il valore di piattaforma togliendo la personalizzazione. */
export async function deleteCompanyFactor(
  userId: string,
  orgId: string,
  companyId: string,
  key: string,
): Promise<void> {
  await requireEntitlement(userId, orgId, "write_data");
  await withTenant({ userId, orgId }, async (tx) => {
    await tx
      .delete(energyCompanyFactor)
      .where(and(eq(energyCompanyFactor.companyId, companyId), eq(energyCompanyFactor.key, key)));
    await logAudit(tx, {
      organizationId: orgId,
      userId,
      azione: "energy.fattore.delete",
      entita: "energy_company_factor",
      entitaId: companyId,
      dettagli: { vettore: key },
    });
  });
}
