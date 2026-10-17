import { randomUUID } from "node:crypto";
import { and, eq, inArray } from "drizzle-orm";
import { dbCorrente, type Tx } from "@/lib/db/tenant";
import { atecoProposta, mogCrimeApplicability } from "@/lib/db/schema";
import { logAudit } from "@/lib/audit";
import { latestSetId } from "@/features/content-set";
import type { ProfiloAzienda } from "@/features/companies/profilo";

// I reati 231 proposti come APPLICABILI, dal codice ATECO e dagli addetti (decisione del
// committente del 17 ottobre 2026).
//
// ⚠️ Mai «non applicabile»: escludere un reato è una decisione da prendere e motivare, e una
// proposta che la prendesse al posto del consulente direbbe il contrario di quello che il
// modello esiste per garantire.
//
// ⚠️ La motivazione resta VUOTA: è il campo del consulente, e finisce nel documento. Il
// perché della proposta sta nella marca (`proposta_motivo`), che si spegne al primo tocco; il
// documento tratta le proposte non toccate come «da determinare».
//
// Solo nei reati ancora senza riga: un reato già valutato non si tocca.

export async function proponiReati231(tx: Tx, userId: string, orgId: string, modelId: string, az: ProfiloAzienda | null) {
  const setId = await latestSetId("ateco", "Catalogo delle proposte ATECO non disponibile");
  const profili = [az?.profilo?.key ?? null, az?.dipendenti ? "_dipendenti" : null].filter((x): x is string => !!x);
  if (!profili.length) return 0;
  const catalogo = await dbCorrente()
    .select({ chiave: atecoProposta.chiave, motivo: atecoProposta.motivo })
    .from(atecoProposta)
    .where(and(eq(atecoProposta.setId, setId), eq(atecoProposta.modulo, "mog231"), inArray(atecoProposta.profilo, profili)));
  if (!catalogo.length) return 0;
  const nuove = await tx
    .insert(mogCrimeApplicability)
    .values(
      catalogo.map((c) => ({
        id: randomUUID(),
        organizationId: orgId,
        modelId,
        crimeKey: c.chiave,
        applicabile: "Sì",
        propostaMotivo:
          c.chiave === "25-septies"
            ? `Proposto dagli addetti dell'anagrafica: ${c.motivo}`
            : `Proposto dal codice ATECO (${az?.profilo?.nome}): ${c.motivo}`,
      })),
    )
    .onConflictDoNothing()
    .returning({ id: mogCrimeApplicability.id });
  if (nuove.length) {
    await logAudit(tx, { organizationId: orgId, userId, azione: "mog231.reati.proposte", entita: "mog_model", entitaId: modelId, dettagli: { proposti: nuove.length } });
  }
  return nuove.length;
}
