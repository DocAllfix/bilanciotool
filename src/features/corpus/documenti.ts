import { and, eq } from "drizzle-orm";
import { withTenant } from "@/lib/db/tenant";
import { company, corpusBlockOverride, corpusDocState, corpusDocument } from "@/lib/db/schema";
import { logAudit } from "@/lib/audit";
import { requireEntitlement } from "@/features/entitlement";
import { statoDocumentoSchema, overrideSchema } from "./validation";
import type { z } from "zod";

// Lo stato di un documento del corpus per un'azienda, e il suo testo su misura.
//
// Ogni scrittura passa di qui e fa tre cose sempre: verifica che l'azienda sia dello
// studio, verifica la capacità, scrive l'audit. Nessuna scorciatoia, nemmeno per i campi
// che sembrano innocui.

type Tx = Parameters<Parameters<typeof withTenant>[1]>[0];

/**
 * L'azienda indicata, **se è di questa organizzazione**. Altrimenti errore.
 *
 * `companyId` arriva dal client, e una server action è un endpoint HTTP: nessun tipo
 * TypeScript sopravvive a runtime. Il filtro esplicito è il secondo strato oltre a RLS, e
 * i due si difendono a vicenda — in sviluppo la connessione è privilegiata e le policy non
 * scattano, quindi senza questo il confine non esisterebbe affatto durante lo sviluppo.
 */
async function nostra(tx: Tx, orgId: string, companyId: string) {
  const [c] = await tx
    .select({ id: company.id })
    .from(company)
    .where(and(eq(company.id, companyId), eq(company.organizationId, orgId)));
  if (!c) throw new Error("Azienda inesistente o di un altro studio");
  return c;
}

/** Il documento indicato esiste davvero in quel content set? */
async function documentoEsiste(tx: Tx, contentSetId: string, docCode: string) {
  const [d] = await tx
    .select({ code: corpusDocument.code })
    .from(corpusDocument)
    .where(and(eq(corpusDocument.contentSetId, contentSetId), eq(corpusDocument.code, docCode)));
  if (!d) throw new Error(`Documento «${docCode}» non presente nel corpus`);
}

/**
 * Aggiorna lo stato di un documento, **un campo per volta**.
 *
 * ⚠️ Regola nata in Fase 7 e ripetuta in Fase 12, alla terza occorrenza dello stesso
 * difetto: non si rimanda mai la riga intera da props. Il client manda solo il campo che
 * ha toccato, e il valore precedente degli altri si rilegge dal database dentro la
 * transazione. Salvare la revisione non deve poter azzerare le note.
 */
export async function setStatoDocumento(
  userId: string,
  orgId: string,
  input: z.infer<typeof statoDocumentoSchema>,
): Promise<void> {
  const p = statoDocumentoSchema.parse(input);
  await requireEntitlement(userId, orgId, "write_data");

  await withTenant({ userId, orgId }, async (tx) => {
    await nostra(tx, orgId, p.companyId);
    await documentoEsiste(tx, p.contentSetId, p.docCode);

    // Solo i campi arrivati: `undefined` significa «non l'ho toccato», non «svuotalo».
    const patch = {
      ...(p.stato !== undefined ? { stato: p.stato } : {}),
      ...(p.revisione !== undefined ? { revisione: p.revisione } : {}),
      ...(p.dataEmissione !== undefined ? { dataEmissione: p.dataEmissione || null } : {}),
      ...(p.note !== undefined ? { note: p.note || null } : {}),
      ...(p.integrazioni !== undefined ? { integrazioni: p.integrazioni || null } : {}),
    };
    if (Object.keys(patch).length === 0) return;

    await tx
      .insert(corpusDocState)
      .values({
        organizationId: orgId,
        companyId: p.companyId,
        contentSetId: p.contentSetId,
        docCode: p.docCode,
        ...patch,
      })
      .onConflictDoUpdate({
        target: [corpusDocState.companyId, corpusDocState.contentSetId, corpusDocState.docCode],
        set: patch,
      });

    await logAudit(tx, {
      organizationId: orgId,
      userId,
      azione: "corpus.documento.stato",
      entita: "corpus_doc_state",
      entitaId: `${p.contentSetId}/${p.docCode}`,
      dettagli: { companyId: p.companyId, ...patch },
    });
  });
}

/**
 * Scrive o rimuove il testo su misura di un blocco.
 *
 * Un testo vuoto **cancella** l'override invece di salvare una stringa vuota: è il
 * comportamento dei prototipi (`if (t.trim() === base) delete ovr[i]`) ed è quello giusto,
 * perché evita di accumulare personalizzazioni fantasma e tiene veritiero il segno «testo
 * su misura» accanto al documento.
 */
export async function setOverride(
  userId: string,
  orgId: string,
  input: z.infer<typeof overrideSchema>,
): Promise<{ rimosso: boolean }> {
  const p = overrideSchema.parse(input);
  await requireEntitlement(userId, orgId, "write_data");

  return withTenant({ userId, orgId }, async (tx) => {
    await nostra(tx, orgId, p.companyId);
    const testo = p.testo.trim();
    const chiave = and(
      eq(corpusBlockOverride.companyId, p.companyId),
      eq(corpusBlockOverride.contentSetId, p.contentSetId),
      eq(corpusBlockOverride.docCode, p.docCode),
      eq(corpusBlockOverride.blockId, p.blockId),
    );

    if (testo === "") {
      await tx.delete(corpusBlockOverride).where(chiave);
      await logAudit(tx, {
        organizationId: orgId,
        userId,
        azione: "corpus.blocco.ripristina",
        entita: "corpus_block_override",
        entitaId: `${p.contentSetId}/${p.docCode}/${p.blockId}`,
        dettagli: { companyId: p.companyId },
      });
      return { rimosso: true };
    }

    // La chiave esterna verso `corpus_block` fa il resto: un blocco inventato non entra.
    await tx
      .insert(corpusBlockOverride)
      .values({
        organizationId: orgId,
        companyId: p.companyId,
        contentSetId: p.contentSetId,
        docCode: p.docCode,
        blockId: p.blockId,
        testo,
      })
      .onConflictDoUpdate({
        target: [
          corpusBlockOverride.companyId,
          corpusBlockOverride.contentSetId,
          corpusBlockOverride.docCode,
          corpusBlockOverride.blockId,
        ],
        set: { testo },
      });

    await logAudit(tx, {
      organizationId: orgId,
      userId,
      azione: "corpus.blocco.personalizza",
      entita: "corpus_block_override",
      entitaId: `${p.contentSetId}/${p.docCode}/${p.blockId}`,
      dettagli: { companyId: p.companyId, caratteri: testo.length },
    });
    return { rimosso: false };
  });
}
