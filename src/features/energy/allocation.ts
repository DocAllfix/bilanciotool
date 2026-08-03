import { randomUUID } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { withTenant } from "@/lib/db/tenant";
import { energyAllocation, energyBalance, energyEndUseState } from "@/lib/db/schema";
import { logAudit } from "@/lib/audit";
import { requireEntitlement } from "@/features/entitlement";
import { allocazioneSchema, perNumeric, stimaSchema, usoStatoSchema } from "./validation";
import type { z } from "zod";

// Matrice di ripartizione: una riga per cella valorizzata.
//
// L'aggiornamento è per SINGOLA CELLA. Il client manda uso, vettore e valore:
// mai la matrice completa, che sarebbe un read-modify-write di 220 celle e
// riproporrebbe il difetto già corretto sulla materialità in Fase 7.
// Un valore vuoto cancella la riga, così la sparsità resta sparsità: nessuna
// riga di zeri, e il documento non mostra utenze inesistenti.

export async function listAllocations(userId: string, orgId: string, balanceId: string) {
  return withTenant({ userId, orgId }, (tx) =>
    tx.select().from(energyAllocation).where(eq(energyAllocation.balanceId, balanceId)),
  );
}

export async function setAllocation(
  userId: string,
  orgId: string,
  balanceId: string,
  input: z.input<typeof allocazioneSchema>,
): Promise<void> {
  await requireEntitlement(userId, orgId, "write_data");
  const v = allocazioneSchema.parse(input);
  const quantita = perNumeric(v.quantita);

  await withTenant({ userId, orgId }, async (tx) => {
    const [b] = await tx.select({ id: energyBalance.id }).from(energyBalance).where(eq(energyBalance.id, balanceId));
    if (!b) throw new Error("Bilancio inesistente o di un altro tenant");

    const dove = and(
      eq(energyAllocation.balanceId, balanceId),
      eq(energyAllocation.usoKey, v.usoKey),
      eq(energyAllocation.vettoreKey, v.vettoreKey),
    );

    if (quantita === null) {
      await tx.delete(energyAllocation).where(dove);
      return;
    }

    const [esistente] = await tx.select({ id: energyAllocation.id }).from(energyAllocation).where(dove);
    if (esistente) {
      await tx.update(energyAllocation).set({ quantita }).where(eq(energyAllocation.id, esistente.id));
    } else {
      await tx.insert(energyAllocation).values({
        id: randomUUID(),
        organizationId: orgId,
        balanceId,
        usoKey: v.usoKey,
        vettoreKey: v.vettoreKey,
        quantita,
      });
    }
  });
}

export async function listEndUseStates(userId: string, orgId: string, balanceId: string) {
  return withTenant({ userId, orgId }, (tx) =>
    tx.select().from(energyEndUseState).where(eq(energyEndUseState.balanceId, balanceId)),
  );
}

/** Accende o spegne un uso finale e ne registra il metodo di determinazione.
 *  Spegnere un uso NON cancella le sue celle: si può riaccendere senza perdere
 *  il lavoro fatto, e il calcolo ignora comunque gli usi spenti. */
export async function setEndUseState(
  userId: string,
  orgId: string,
  balanceId: string,
  input: z.input<typeof usoStatoSchema>,
): Promise<void> {
  await requireEntitlement(userId, orgId, "write_data");
  const v = usoStatoSchema.parse(input);

  await withTenant({ userId, orgId }, async (tx) => {
    const [b] = await tx.select({ id: energyBalance.id }).from(energyBalance).where(eq(energyBalance.id, balanceId));
    if (!b) throw new Error("Bilancio inesistente o di un altro tenant");

    const dove = and(eq(energyEndUseState.balanceId, balanceId), eq(energyEndUseState.usoKey, v.usoKey));
    const [esistente] = await tx.select().from(energyEndUseState).where(dove);

    const patch = {
      ...(v.attivo !== undefined ? { attivo: v.attivo } : {}),
      ...(v.metodo !== undefined ? { metodo: v.metodo } : {}),
      ...(v.nota !== undefined ? { nota: v.nota } : {}),
    };

    if (esistente) {
      await tx.update(energyEndUseState).set(patch).where(eq(energyEndUseState.id, esistente.id));
    } else {
      await tx.insert(energyEndUseState).values({
        id: randomUUID(),
        organizationId: orgId,
        balanceId,
        usoKey: v.usoKey,
        attivo: v.attivo ?? true,
        metodo: v.metodo ?? null,
        nota: v.nota ?? null,
      });
    }

    await logAudit(tx, {
      organizationId: orgId,
      userId,
      azione: "energy.uso.set",
      entita: "energy_end_use_state",
      entitaId: balanceId,
      dettagli: { uso: v.usoKey, ...patch },
    });
  });
}

/** Salva gli ingressi del calcolatore di stima. Il kWh che ne risulta è un
 *  derivato e non si persiste: si ricalcola dagli ingressi a ogni lettura. */
export async function setStima(
  userId: string,
  orgId: string,
  balanceId: string,
  input: z.input<typeof stimaSchema>,
): Promise<void> {
  await requireEntitlement(userId, orgId, "write_data");
  const v = stimaSchema.parse(input);
  const patch = {
    stimaVettoreKey: v.stimaVettoreKey ?? null,
    stimaKw: perNumeric(v.stimaKw),
    stimaOre: perNumeric(v.stimaOre),
    stimaFattoreCarico: perNumeric(v.stimaFattoreCarico),
  };

  await withTenant({ userId, orgId }, async (tx) => {
    const dove = and(eq(energyEndUseState.balanceId, balanceId), eq(energyEndUseState.usoKey, v.usoKey));
    const [esistente] = await tx.select({ id: energyEndUseState.id }).from(energyEndUseState).where(dove);
    if (esistente) {
      await tx.update(energyEndUseState).set(patch).where(eq(energyEndUseState.id, esistente.id));
    } else {
      const [b] = await tx.select({ id: energyBalance.id }).from(energyBalance).where(eq(energyBalance.id, balanceId));
      if (!b) throw new Error("Bilancio inesistente o di un altro tenant");
      await tx.insert(energyEndUseState).values({
        id: randomUUID(),
        organizationId: orgId,
        balanceId,
        usoKey: v.usoKey,
        attivo: true,
        ...patch,
      });
    }
  });
}
