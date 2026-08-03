import { randomUUID } from "node:crypto";
import { and, desc, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { withTenant } from "@/lib/db/tenant";
import { company, contentSet, soaControlDecision, soaDeclaration, soaModule } from "@/lib/db/schema";
import { logAudit } from "@/lib/audit";
import { requireEntitlement } from "@/features/entitlement";
import {
  dichiarazioneSchema, moduloSchema, motivazioneSchema, profiloSchema, ruoliSchema,
  MOTIVAZIONI, STATI, STATI_AZIONE, type ProfiloSoa,
} from "./validation";
import type { z } from "zod";

// Dichiarazione di Applicabilità: UNA per azienda.
//
// È un documento vivo del sistema di gestione, non un esercizio contabile: si
// aggiorna nel tempo, e le revisioni consegnate all'organismo di certificazione
// restano congelate negli snapshot pubblicati.

export async function latestSoaSetId(): Promise<string> {
  const rows = await db
    .select({ id: contentSet.id })
    .from(contentSet)
    .where(eq(contentSet.dominio, "soa"))
    .orderBy(desc(contentSet.versione))
    .limit(1);
  if (!rows[0]) throw new Error("Catalogo dei controlli non disponibile");
  return rows[0].id;
}

export async function createDeclaration(
  userId: string,
  orgId: string,
  input: z.input<typeof dichiarazioneSchema>,
): Promise<string> {
  await requireEntitlement(userId, orgId, "write_data");
  const v = dichiarazioneSchema.parse(input);
  const setId = await latestSoaSetId();
  const id = randomUUID();

  await withTenant({ userId, orgId }, async (tx) => {
    const [co] = await tx.select({ id: company.id }).from(company).where(eq(company.id, v.companyId));
    if (!co) throw new Error("Azienda inesistente o di un altro tenant");

    await tx.insert(soaDeclaration).values({
      id,
      organizationId: orgId,
      companyId: v.companyId,
      contentSetId: setId,
      sogliaObiettivo: v.sogliaObiettivo ?? 80,
      ruoloPrivacy: v.ruoloPrivacy ?? "titolare",
      ruoloCloud: v.ruoloCloud ?? "cliente",
      profilo: { versione: "1.0", data: new Date().toISOString().slice(0, 10) },
    });

    await logAudit(tx, {
      organizationId: orgId,
      userId,
      azione: "soa.dichiarazione.create",
      entita: "soa_declaration",
      entitaId: id,
    });
  });
  return id;
}

export async function getDeclaration(userId: string, orgId: string, companyId: string) {
  return withTenant({ userId, orgId }, async (tx) => {
    const [row] = await tx.select().from(soaDeclaration).where(eq(soaDeclaration.companyId, companyId));
    return row ?? null;
  });
}

export async function updateProfilo(
  userId: string,
  orgId: string,
  declarationId: string,
  patch: ProfiloSoa,
): Promise<void> {
  await requireEntitlement(userId, orgId, "write_data");
  const v = profiloSchema.parse(patch);
  await withTenant({ userId, orgId }, async (tx) => {
    const [row] = await tx
      .select({ profilo: soaDeclaration.profilo })
      .from(soaDeclaration)
      .where(eq(soaDeclaration.id, declarationId));
    if (!row) throw new Error("Dichiarazione inesistente o di un altro tenant");
    await tx
      .update(soaDeclaration)
      .set({ profilo: { ...(row.profilo as ProfiloSoa), ...v } })
      .where(eq(soaDeclaration.id, declarationId));
    await logAudit(tx, {
      organizationId: orgId,
      userId,
      azione: "soa.profilo.update",
      entita: "soa_declaration",
      entitaId: declarationId,
      dettagli: { campi: Object.keys(v) },
    });
  });
}

/** Ruoli e soglia: enum chiusi, non testo libero. Da questi dipendono gli
 *  avvisi di coerenza sui moduli da attivare. */
export async function setRuoli(
  userId: string,
  orgId: string,
  declarationId: string,
  patch: z.input<typeof ruoliSchema>,
): Promise<void> {
  await requireEntitlement(userId, orgId, "write_data");
  const v = ruoliSchema.parse(patch);
  if (!Object.keys(v).length) return;
  await withTenant({ userId, orgId }, async (tx) => {
    const agg = await tx
      .update(soaDeclaration)
      .set(v)
      .where(eq(soaDeclaration.id, declarationId))
      .returning({ id: soaDeclaration.id });
    if (!agg.length) throw new Error("Dichiarazione inesistente o di un altro tenant");
    await logAudit(tx, {
      organizationId: orgId,
      userId,
      azione: "soa.ruoli.set",
      entita: "soa_declaration",
      entitaId: declarationId,
      dettagli: v,
    });
  });
}

export async function listModules(userId: string, orgId: string, declarationId: string) {
  return withTenant({ userId, orgId }, (tx) =>
    tx.select().from(soaModule).where(eq(soaModule.declarationId, declarationId)),
  );
}

/** Attivazione di un modulo esteso. La 27001 non passa di qui: è sempre in
 *  ambito, e la Dichiarazione deve elencarne tutti e 93 i controlli. */
export async function setModule(
  userId: string,
  orgId: string,
  declarationId: string,
  input: z.input<typeof moduloSchema>,
): Promise<void> {
  await requireEntitlement(userId, orgId, "write_data");
  const v = moduloSchema.parse(input);

  await withTenant({ userId, orgId }, async (tx) => {
    const [d] = await tx
      .select({ id: soaDeclaration.id })
      .from(soaDeclaration)
      .where(eq(soaDeclaration.id, declarationId));
    if (!d) throw new Error("Dichiarazione inesistente o di un altro tenant");

    const dove = and(eq(soaModule.declarationId, declarationId), eq(soaModule.frameworkKey, v.frameworkKey));
    const [esistente] = await tx.select({ id: soaModule.id }).from(soaModule).where(dove);
    if (esistente) {
      await tx.update(soaModule).set({ attivo: v.attivo }).where(eq(soaModule.id, esistente.id));
    } else {
      await tx.insert(soaModule).values({
        id: randomUUID(),
        organizationId: orgId,
        declarationId,
        frameworkKey: v.frameworkKey,
        attivo: v.attivo,
      });
    }

    await logAudit(tx, {
      organizationId: orgId,
      userId,
      azione: "soa.modulo.set",
      entita: "soa_module",
      entitaId: declarationId,
      dettagli: { quadro: v.frameworkKey, attivo: v.attivo },
    });
  });
}

export async function listDecisions(userId: string, orgId: string, declarationId: string) {
  return withTenant({ userId, orgId }, (tx) =>
    tx.select().from(soaControlDecision).where(eq(soaControlDecision.declarationId, declarationId)),
  );
}

const DOMINI: Record<string, readonly string[]> = {
  stato: STATI,
  statoAzione: STATI_AZIONE,
};

/** Aggiornamento di UN SOLO campo della decisione su un controllo.
 *
 *  Cambiare lo stato non deve cancellare il riferimento documentale, e togliere
 *  l'applicabilità non deve perdere la giustificazione già scritta. Il valore
 *  precedente si legge dal database dentro la transazione, mai dalle props. */
export async function setDecisionField(
  userId: string,
  orgId: string,
  declarationId: string,
  frameworkKey: string,
  controlloId: string,
  campo: "applicabile" | "giustificazione" | "stato" | "riferimentoDoc" | "responsabile" | "scadenza" | "statoAzione" | "note",
  valore: string | null,
): Promise<void> {
  await requireEntitlement(userId, orgId, "write_data");

  // Il dominio si verifica QUI, non solo nell'azione: questa è la funzione che
  // tocca il database, e uno stato fuori dominio non farebbe errore — peserebbe
  // zero sull'indice, cioè mentirebbe in silenzio.
  const dominio = DOMINI[campo];
  if (valore !== null && dominio && !dominio.includes(valore)) {
    throw new Error(`Valore non ammesso per ${campo}: ${valore}`);
  }

  const patch: Record<string, unknown> =
    campo === "applicabile" ? { applicabile: valore === "si" } : { [campo]: valore };

  await withTenant({ userId, orgId }, async (tx) => {
    const [d] = await tx
      .select({ id: soaDeclaration.id })
      .from(soaDeclaration)
      .where(eq(soaDeclaration.id, declarationId));
    if (!d) throw new Error("Dichiarazione inesistente o di un altro tenant");

    const dove = and(
      eq(soaControlDecision.declarationId, declarationId),
      eq(soaControlDecision.frameworkKey, frameworkKey),
      eq(soaControlDecision.controlloId, controlloId),
    );
    const [esistente] = await tx.select({ id: soaControlDecision.id }).from(soaControlDecision).where(dove);

    if (esistente) {
      await tx.update(soaControlDecision).set(patch).where(eq(soaControlDecision.id, esistente.id));
    } else {
      await tx.insert(soaControlDecision).values({
        id: randomUUID(),
        organizationId: orgId,
        declarationId,
        frameworkKey,
        controlloId,
        ...patch,
      });
    }

    await logAudit(tx, {
      organizationId: orgId,
      userId,
      azione: "soa.controllo.set",
      entita: "soa_control_decision",
      entitaId: declarationId,
      dettagli: { quadro: frameworkKey, controllo: controlloId, campo },
    });
  });
}

/** Accende o spegne UNA motivazione di inclusione.
 *
 *  L'aggiornamento è `array_append` / `array_remove` in una sola istruzione:
 *  atomico lato database, senza leggere-modificare-riscrivere l'insieme. Due
 *  motivazioni spuntate in rapida successione non possono sovrascriversi. */
export async function toggleMotivazione(
  userId: string,
  orgId: string,
  declarationId: string,
  input: z.input<typeof motivazioneSchema>,
): Promise<void> {
  await requireEntitlement(userId, orgId, "write_data");
  const v = motivazioneSchema.parse(input);
  if (!(MOTIVAZIONI as readonly string[]).includes(v.motivazione)) {
    throw new Error(`Motivazione non ammessa: ${v.motivazione}`);
  }

  await withTenant({ userId, orgId }, async (tx) => {
    const dove = and(
      eq(soaControlDecision.declarationId, declarationId),
      eq(soaControlDecision.frameworkKey, v.frameworkKey),
      eq(soaControlDecision.controlloId, v.controlloId),
    );
    const [esistente] = await tx.select({ id: soaControlDecision.id }).from(soaControlDecision).where(dove);

    if (!esistente) {
      const [d] = await tx
        .select({ id: soaDeclaration.id })
        .from(soaDeclaration)
        .where(eq(soaDeclaration.id, declarationId));
      if (!d) throw new Error("Dichiarazione inesistente o di un altro tenant");
      if (!v.attiva) return;
      await tx.insert(soaControlDecision).values({
        id: randomUUID(),
        organizationId: orgId,
        declarationId,
        frameworkKey: v.frameworkKey,
        controlloId: v.controlloId,
        motivazioni: [v.motivazione],
      });
      return;
    }

    await tx
      .update(soaControlDecision)
      .set({
        motivazioni: v.attiva
          ? sql`(select array(select distinct unnest(${soaControlDecision.motivazioni} || ARRAY[${v.motivazione}]::text[]) order by 1))`
          : sql`array_remove(${soaControlDecision.motivazioni}, ${v.motivazione})`,
      })
      .where(eq(soaControlDecision.id, esistente.id));
  });
}
