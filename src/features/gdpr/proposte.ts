import { randomUUID } from "node:crypto";
import { and, eq, inArray } from "drizzle-orm";
import { dbCorrente, type Tx } from "@/lib/db/tenant";
import { atecoProposta, gdprTrattamento, gdprTrattamentoTipo } from "@/lib/db/schema";
import { logAudit } from "@/lib/audit";
import { latestSetId } from "@/features/content-set";
import type { ProfiloAzienda } from "@/features/companies/profilo";

// I trattamenti GDPR che quasi ogni azienda ha, proposti all'avvio del percorso: quelli di
// tutti (clienti, fornitori, posta), quelli di chi ha dipendenti, il sito web, il canale di
// segnalazione dai 50 addetti, e quelli tipici del settore (videosorveglianza,
// geolocalizzazione, marketing).
//
// ⚠️ Entrano col contenuto del catalogo e la marca «proposta»: finché nessuno li tocca non
// sono censiti, e il registro consegnato non li porta. Idempotente sul `tipo_key`.

export async function proponiTrattamenti(tx: Tx, userId: string, orgId: string, systemId: string, contentSetId: string, az: ProfiloAzienda | null) {
  const profili = ["_sempre"];
  if (az?.dipendenti) profili.push("_dipendenti");
  if (az?.sitoWeb?.trim()) profili.push("_sito");
  if ((az?.dipendenti ?? 0) >= 50) profili.push("_50");
  if (az?.profilo) profili.push(az.profilo.key);

  const proposte = await dbCorrente()
    .select({ chiave: atecoProposta.chiave, motivo: atecoProposta.motivo, profilo: atecoProposta.profilo })
    .from(atecoProposta)
    .where(
      and(
        eq(atecoProposta.setId, await latestSetId("ateco", "Catalogo delle proposte ATECO non disponibile")),
        eq(atecoProposta.modulo, "gdpr"),
        inArray(atecoProposta.profilo, profili),
      ),
    );
  if (!proposte.length) return 0;
  const tipi = await dbCorrente()
    .select()
    .from(gdprTrattamentoTipo)
    .where(and(eq(gdprTrattamentoTipo.setId, contentSetId), inArray(gdprTrattamentoTipo.key, proposte.map((p) => p.chiave))));
  const perChiave = new Map(tipi.map((t) => [t.key, t]));
  const righe = proposte.flatMap((p, i) => {
    const t = perChiave.get(p.chiave);
    if (!t) return [];
    const da = p.profilo === "_sempre" ? "" : p.profilo.startsWith("_") ? " (dall'anagrafica)" : ` (dal codice ATECO: ${az?.profilo?.nome})`;
    return [
      {
        id: randomUUID(),
        organizationId: orgId,
        systemId,
        tipoKey: t.key,
        nome: t.nome,
        finalita: t.finalita,
        base: t.base,
        interessati: t.interessati,
        dati: t.dati,
        particolari: t.particolari,
        condizione9: t.condizione9 || null,
        destinatari: t.destinatari,
        conservazione: t.conservazione,
        criteri: t.criteri,
        ordine: i,
        propostaMotivo: `Proposto${da}: ${p.motivo}`,
      },
    ];
  });
  const nuove = await tx
    .insert(gdprTrattamento)
    .values(righe)
    .onConflictDoNothing({ target: [gdprTrattamento.systemId, gdprTrattamento.tipoKey] })
    .returning({ id: gdprTrattamento.id });
  if (nuove.length) {
    await logAudit(tx, { organizationId: orgId, userId, azione: "gdpr.trattamenti.proposte", entita: "gdpr_system", entitaId: systemId, dettagli: { proposti: nuove.length } });
  }
  return nuove.length;
}
