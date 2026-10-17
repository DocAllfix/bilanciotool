import { randomUUID } from "node:crypto";
import { and, eq, inArray, isNotNull, sql } from "drizzle-orm";
import { dbCorrente, type Tx } from "@/lib/db/tenant";
import { atecoProposta, corpusRegisterColumn } from "@/lib/db/schema";
import { logAudit } from "@/lib/audit";
import { latestSetId } from "@/features/content-set";
import type { ProfiloAzienda } from "@/features/companies/profilo";

// Gli aspetti ambientali e i pericoli tipici del settore, proposti nei registri del sistema
// integrato (MOD-04.01 e MOD-05.01) all'avvio del percorso e quando arriva il codice ATECO.
//
// ⚠️ Entrano con la sola descrizione — attività, fase, aspetto, impatto; area, attività,
// pericolo, danno — e la marca «proposta». Le valutazioni (gravità, frequenza, probabilità)
// restano VUOTE: sono il giudizio del consulente, e un numero comparso da solo in un'analisi
// ambientale firmata è un numero che nessuno ha dato. I documenti non contano le righe marcate.
//
// Idempotente sul `tipo_key`. Cambiando ATECO, le proposte non toccate del settore vecchio
// escono; quelle toccate restano, perché sono diventate del consulente.

const REGISTRO = { aspetto: "aspetti", pericolo: "pericoli" } as const;

export async function proponiRegistriQas(
  tx: Tx,
  userId: string,
  orgId: string,
  companyId: string,
  contentSetId: string,
  az: ProfiloAzienda | null,
): Promise<number> {
  const profili = ["_sempre", ...(az?.profilo ? [az.profilo.key] : [])];
  const proposte = await dbCorrente()
    .select({
      tipo: atecoProposta.tipo,
      chiave: atecoProposta.chiave,
      profilo: atecoProposta.profilo,
      ordine: atecoProposta.ordine,
      valore: atecoProposta.valore,
      motivo: atecoProposta.motivo,
    })
    .from(atecoProposta)
    .where(
      and(
        eq(atecoProposta.setId, await latestSetId("ateco", "Catalogo delle proposte ATECO non disponibile")),
        eq(atecoProposta.modulo, "sgiqas"),
        inArray(atecoProposta.profilo, profili),
      ),
    );

  const chiavi = proposte.map((p) => p.chiave);
  // Le proposte non toccate che il profilo attuale non porta più: un cambio di ATECO.
  await tx.execute(sql`
    delete from corpus_register_row
     where company_id = ${companyId} and organization_id = ${orgId}
       and content_set_id = ${contentSetId}
       and register_id in ('aspetti', 'pericoli')
       and tipo_key is not null and proposta_motivo is not null
       ${chiavi.length ? sql`and tipo_key not in (${sql.join(chiavi.map((c) => sql`${c}`), sql`, `)})` : sql``}`);
  if (!proposte.length) return 0;

  const prefissi = new Map(
    (
      await dbCorrente()
        .select({ registro: corpusRegisterColumn.registerId, prefisso: corpusRegisterColumn.prefissoAuto })
        .from(corpusRegisterColumn)
        .where(
          and(
            eq(corpusRegisterColumn.contentSetId, contentSetId),
            inArray(corpusRegisterColumn.registerId, ["aspetti", "pericoli"]),
            isNotNull(corpusRegisterColumn.prefissoAuto),
          ),
        )
    ).map((r) => [r.registro, r.prefisso]),
  );

  // Prima le comuni, poi quelle del settore, nell'ordine del catalogo: il registro le numera
  // come le leggerebbe chi le scrive a mano.
  const ordinate = [...proposte].sort(
    (a, b) => Number(a.profilo !== "_sempre") - Number(b.profilo !== "_sempre") || a.ordine - b.ordine,
  );
  let nuove = 0;
  for (const p of ordinate) {
    const registro = REGISTRO[p.tipo as keyof typeof REGISTRO];
    if (!registro) continue;
    const prefisso = prefissi.get(registro) ?? null;
    const motivo =
      p.profilo === "_sempre" ? `Proposto: ${p.motivo}.` : `Proposto dal codice ATECO (${az?.profilo?.nome}): ${p.motivo}.`;
    // Stessa forma di `aggiungiRiga`: numero e riferimento dallo stesso massimo, in una
    // istruzione sola, così non possono divergere.
    const r = await tx.execute(sql`
      insert into corpus_register_row
        (id, organization_id, company_id, content_set_id, register_id, numero, riferimento, dati, tipo_key, proposta_motivo)
      select
        ${randomUUID()}, ${orgId}, ${companyId}, ${contentSetId}, ${registro},
        coalesce(max(numero), 0) + 1,
        case when ${prefisso}::text is null then null
             else ${prefisso}::text || lpad((coalesce(max(numero), 0) + 1)::text, 3, '0')
        end,
        ${JSON.stringify(p.valore)}::jsonb, ${p.chiave}, ${motivo}
      from corpus_register_row
      where company_id = ${companyId} and content_set_id = ${contentSetId} and register_id = ${registro}
      on conflict (company_id, content_set_id, register_id, tipo_key) where tipo_key is not null do nothing
      returning id`);
    nuove += r.length;
  }
  if (nuove) {
    await logAudit(tx, {
      organizationId: orgId,
      userId,
      azione: "sgiqas.registri.proposte",
      entita: "company",
      entitaId: companyId,
      dettagli: { proposte: nuove },
    });
  }
  return nuove;
}
