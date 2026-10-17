import { anagraficaInTesto, profiloAzienda } from "@/features/companies/profilo";
import { randomUUID } from "node:crypto";
import { fondiJsonb } from "@/lib/db/jsonb";
import { and, asc, desc, eq } from "drizzle-orm";
import { dbCorrente, withTenant } from "@/lib/db/tenant";
import { atecoProposta, company, energyBalance, energyEndUse, energyEndUseState } from "@/lib/db/schema";
import { logAudit } from "@/lib/audit";
import { requireEntitlement } from "@/features/entitlement";
import { bilancioSchema, profiloSchema, type ProfiloEnergetico } from "./validation";
import { z } from "zod";
import { annoSchema } from "@/features/campi";
import { latestSetId } from "@/features/content-set";

// Bilanci energetici: un esercizio per azienda e anno. La metodologia in vigore
// si congela alla creazione (content_set), così l'aggiornamento annuale dei
// fattori non altera i bilanci già avviati.

export async function latestEnergySetId(): Promise<string> {
  return latestSetId("energy", "Contenuti metodologici del modulo energetico non disponibili");
}

export async function createBalance(
  userId: string,
  orgId: string,
  input: z.input<typeof bilancioSchema>,
): Promise<string> {
  await requireEntitlement(userId, orgId, "write_data");
  const v = bilancioSchema.parse(input);
  const setId = await latestEnergySetId();
  // Gli usi finali predefiniti si accendono alla creazione: un elenco di venti
  // righe di cui dodici a zero renderebbe il bilancio illeggibile.
  const predefiniti = await dbCorrente()
    .select({ key: energyEndUse.key })
    .from(energyEndUse)
    .where(and(eq(energyEndUse.setId, setId), eq(energyEndUse.predefinito, true)))
    .orderBy(asc(energyEndUse.ordine));

  const id = randomUUID();
  await withTenant({ userId, orgId }, async (tx) => {
    const [co] = await tx.select({ id: company.id }).from(company).where(eq(company.id, v.companyId));
    if (!co) throw new Error("Azienda inesistente o di un altro tenant");

    // L'anagrafica dell'azienda si copia una volta, nei campi che il percorso ha: chiederla di
    // nuovo la farebbe divergere da quella del portafoglio. Da qui in poi i campi sono del percorso.
    const az = await profiloAzienda(tx, orgId, v.companyId);
    const an = anagraficaInTesto(az);

    // ⚠️ GLI USI FINALI SI TROVANO DA SOLI (17 ottobre 2026). Prima si accendevano sempre gli
    // stessi undici, pensati per una fonderia: anche uno studio professionale partiva con i
    // «forni fusori». Ora, nell'ordine: quelli dell'esercizio precedente (sono quelli che
    // l'azienda ha davvero), poi quelli tipici del codice ATECO, poi l'elenco predefinito.
    const [prec] = await tx
      .select({ id: energyBalance.id })
      .from(energyBalance)
      .where(and(eq(energyBalance.companyId, v.companyId), eq(energyBalance.organizationId, orgId)))
      .orderBy(desc(energyBalance.anno))
      .limit(1);
    let usi = predefiniti.map((u) => u.key);
    let origine: "precedente" | "ateco" | "predefiniti" = "predefiniti";
    if (prec) {
      const attivi = await tx
        .select({ key: energyEndUseState.usoKey })
        .from(energyEndUseState)
        .where(and(eq(energyEndUseState.balanceId, prec.id), eq(energyEndUseState.attivo, true)));
      if (attivi.length) {
        usi = attivi.map((x) => x.key);
        origine = "precedente";
      }
    }
    if (origine === "predefiniti" && az?.profilo) {
      const daAteco = await dbCorrente()
        .select({ key: atecoProposta.chiave })
        .from(atecoProposta)
        .where(
          and(
            eq(atecoProposta.setId, await latestSetId("ateco", "Catalogo delle proposte ATECO non disponibile")),
            eq(atecoProposta.profilo, az.profilo.key),
            eq(atecoProposta.modulo, "energetico"),
          ),
        )
        .orderBy(asc(atecoProposta.ordine));
      if (daAteco.length) {
        usi = daAteco.map((x) => x.key);
        origine = "ateco";
      }
    }
    await tx.insert(energyBalance).values({
      id,
      organizationId: orgId,
      companyId: v.companyId,
      anno: v.anno,
      annoBase: v.annoBase ?? v.anno - 1,
      contentSetId: setId,
      profilo: { piva: an.piva, sede: an.sede, settore: an.settore, ateco: an.ateco },
    });

    if (usi.length) {
      await tx.insert(energyEndUseState).values(
        usi.map((key) => ({
          id: randomUUID(),
          organizationId: orgId,
          balanceId: id,
          usoKey: key,
          attivo: true,
        })),
      );
    }

    await logAudit(tx, {
      organizationId: orgId,
      userId,
      azione: "energy.balance.create",
      entita: "energy_balance",
      entitaId: id,
      dettagli: { anno: v.anno, usiFinali: origine },
    });
  });
  return id;
}

export async function listBalances(userId: string, orgId: string, companyId: string) {
  return withTenant({ userId, orgId }, (tx) =>
    tx
      .select({ id: energyBalance.id, anno: energyBalance.anno, annoBase: energyBalance.annoBase })
      .from(energyBalance)
      .where(eq(energyBalance.companyId, companyId))
      .orderBy(desc(energyBalance.anno)),
  );
}

export async function getBalance(userId: string, orgId: string, companyId: string, anno: number) {
  return withTenant({ userId, orgId }, async (tx) => {
    const [row] = await tx
      .select()
      .from(energyBalance)
      .where(and(eq(energyBalance.companyId, companyId), eq(energyBalance.anno, anno)));
    return row ?? null;
  });
}

/** Aggiornamento del profilo campo per campo: il client non manda mai l'oggetto
 *  completo, così due modifiche vicine non si sovrascrivono a vicenda. */
export async function updateProfilo(
  userId: string,
  orgId: string,
  balanceId: string,
  patch: ProfiloEnergetico,
): Promise<void> {
  await requireEntitlement(userId, orgId, "write_data");
  const v = profiloSchema.parse(patch);
  await withTenant({ userId, orgId }, async (tx) => {
    // Fusione in un'istruzione sola: vedi `fondiJsonb`.
    const toccate = await tx
      .update(energyBalance)
      .set({ profilo: fondiJsonb(energyBalance.profilo, v) })
      .where(and(eq(energyBalance.id, balanceId), eq(energyBalance.organizationId, orgId)))
      .returning({ id: energyBalance.id });
    if (!toccate.length) throw new Error("Bilancio inesistente o di un altro tenant");
    await logAudit(tx, {
      organizationId: orgId,
      userId,
      azione: "energy.profilo.update",
      entita: "energy_balance",
      entitaId: balanceId,
      dettagli: { campi: Object.keys(v) },
    });
  });
}

export async function setAnnoBase(userId: string, orgId: string, balanceId: string, annoBase: number): Promise<void> {
  await requireEntitlement(userId, orgId, "write_data");
  const v = annoSchema.parse(annoBase);
  await withTenant({ userId, orgId }, async (tx) => {
    const agg = await tx
      .update(energyBalance)
      .set({ annoBase: v })
      .where(eq(energyBalance.id, balanceId))
      .returning({ id: energyBalance.id });
    if (!agg.length) throw new Error("Bilancio inesistente o di un altro tenant");
    await logAudit(tx, {
      organizationId: orgId,
      userId,
      azione: "energy.baseyear.set",
      entita: "energy_balance",
      entitaId: balanceId,
      dettagli: { annoBase: v },
    });
  });
}
