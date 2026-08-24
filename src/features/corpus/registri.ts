import { randomUUID } from "node:crypto";
import { and, eq, sql } from "drizzle-orm";
import { withTenant } from "@/lib/db/tenant";
import {
  company,
  corpusRegister,
  corpusRegisterColumn,
  corpusRegisterRow,
} from "@/lib/db/schema";
import { logAudit } from "@/lib/audit";
import { registriSuperatiTx } from "./registri-superati";
import { requireEntitlement } from "@/features/entitlement";
import { rigaRegistroSchema, aggiornaRigaSchema } from "./validation";
import type { z } from "zod";

// Le righe che il consulente registra: 70 registri, 779 colonne, un solo motore.

type Tx = Parameters<Parameters<typeof withTenant>[1]>[0];

async function nostra(tx: Tx, orgId: string, companyId: string) {
  const [c] = await tx
    .select({ id: company.id })
    .from(company)
    .where(and(eq(company.id, companyId), eq(company.organizationId, orgId)));
  if (!c) throw new Error("Azienda inesistente o di un altro studio");
}

/**
 * Le colonne di un registro, e il prefisso del codice progressivo se ne ha uno.
 *
 * Serve a due cose: comporre il riferimento, e **rifiutare le chiavi che non esistono**.
 * I dati arrivano come mappa dal client; senza questo controllo una chiave inventata
 * finirebbe nel jsonb e nessuno se ne accorgerebbe fino a quando qualcuno cerca di
 * stamparla.
 */
/**
 * Rifiuta la scrittura su un registro superato da un modulo più specifico.
 *
 * Oggi il caso è uno solo: i registri delle segnalazioni del Modello 231 e della ISO
 * 37001 quando il modulo Gestione delle segnalazioni è attivo per quell'azienda. Tenerli
 * scrivibili entrambi produce due copie dello stesso dato personale ultra-sensibile, e
 * quella meno curata è quella che si compila per prima.
 */
async function pretendiRegistroScrivibile(
  tx: Tx,
  orgId: string,
  companyId: string,
  contentSetId: string,
  modCode: string | null,
): Promise<void> {
  if (!modCode) return;
  const superati = await registriSuperatiTx(tx, orgId, companyId, contentSetId);
  if (superati.has(modCode)) {
    throw new Error(
      "Questo registro è di sola lettura: le segnalazioni si registrano nel modulo dedicato, " +
        "dove ogni fascicolo porta i termini di legge calcolati.",
    );
  }
}

async function schemaRegistro(tx: Tx, contentSetId: string, registerId: string) {
  const [r] = await tx
    .select({ id: corpusRegister.registerId, nome: corpusRegister.nome, modCode: corpusRegister.modCode })
    .from(corpusRegister)
    .where(
      and(eq(corpusRegister.contentSetId, contentSetId), eq(corpusRegister.registerId, registerId)),
    );
  if (!r) throw new Error(`Registro «${registerId}» non presente nel corpus`);

  const colonne = await tx
    .select({ chiave: corpusRegisterColumn.chiave, prefisso: corpusRegisterColumn.prefissoAuto })
    .from(corpusRegisterColumn)
    .where(
      and(
        eq(corpusRegisterColumn.contentSetId, contentSetId),
        eq(corpusRegisterColumn.registerId, registerId),
      ),
    );
  return {
    nome: r.nome,
    modCode: r.modCode,
    chiavi: new Set(colonne.map((c) => c.chiave)),
    prefisso: colonne.find((c) => c.prefisso)?.prefisso ?? null,
  };
}

function verificaChiavi(dati: Record<string, string>, chiavi: Set<string>, registro: string) {
  const ignote = Object.keys(dati).filter((k) => !chiavi.has(k));
  if (ignote.length) {
    throw new Error(`Campi non previsti dal registro «${registro}»: ${ignote.join(", ")}`);
  }
}

/**
 * Aggiunge una riga, con il progressivo calcolato **dal database**.
 *
 * ⚠️ Nei prototipi il numero è `righe.length + 1`: dopo una cancellazione si ricicla, e
 * nascono due righe con lo stesso riferimento. Nei registri che si collegano fra loro per
 * quel riferimento — e ce ne sono — il collegamento finisce sulla riga sbagliata.
 *
 * Qui il massimo si legge e si scrive **in una sola istruzione**: spezzarla in un select
 * seguito da un insert riaprirebbe la corsa fra due inserimenti simultanei. Il vincolo di
 * unicità resta come rete: se due processi arrivassero insieme, uno fallisce invece di
 * duplicare in silenzio.
 */
export async function aggiungiRiga(
  userId: string,
  orgId: string,
  input: z.infer<typeof rigaRegistroSchema>,
): Promise<{ id: string; numero: number; riferimento: string | null }> {
  const p = rigaRegistroSchema.parse(input);
  await requireEntitlement(userId, orgId, "write_data");

  return withTenant({ userId, orgId }, async (tx) => {
    await nostra(tx, orgId, p.companyId);
    const schema = await schemaRegistro(tx, p.contentSetId, p.registerId);
    verificaChiavi(p.dati, schema.chiavi, schema.nome);
    // ⚠️ Il divieto sta QUI e non nell'interfaccia. Il pulsante sparisce a schermo, ma un
    // registro superato deve rifiutare la scrittura anche a chi chiama la server action
    // per conto proprio: la prova di un divieto è la riga che non compare nel database,
    // non il comando che non si vede.
    await pretendiRegistroScrivibile(tx, orgId, p.companyId, p.contentSetId, schema.modCode);

    const id = randomUUID();
    // Il riferimento leggibile — «RT001» — si compone qui, dallo stesso massimo, così non
    // può divergere dal numero: due istruzioni separate potrebbero.
    const righe = await tx.execute(sql`
      insert into corpus_register_row
        (id, organization_id, company_id, content_set_id, register_id, numero, riferimento, dati)
      select
        ${id}, ${orgId}, ${p.companyId}, ${p.contentSetId}, ${p.registerId},
        coalesce(max(numero), 0) + 1,
        case when ${schema.prefisso}::text is null then null
             else ${schema.prefisso}::text || lpad((coalesce(max(numero), 0) + 1)::text, 3, '0')
        end,
        ${JSON.stringify(p.dati)}::jsonb
      from corpus_register_row
      where company_id = ${p.companyId}
        and content_set_id = ${p.contentSetId}
        and register_id = ${p.registerId}
      returning numero, riferimento`);

    const r = righe[0] as { numero: number; riferimento: string | null };
    await logAudit(tx, {
      organizationId: orgId,
      userId,
      azione: "corpus.registro.aggiungi",
      entita: "corpus_register_row",
      entitaId: id,
      dettagli: { companyId: p.companyId, registro: p.registerId, numero: r.numero },
    });
    return { id, numero: r.numero, riferimento: r.riferimento };
  });
}

/** La riga indicata, **se è di questa organizzazione**. Altrimenti errore. */
async function riga(tx: Tx, orgId: string, rowId: string) {
  const [r] = await tx
    .select({
      id: corpusRegisterRow.id,
      companyId: corpusRegisterRow.companyId,
      contentSetId: corpusRegisterRow.contentSetId,
      registerId: corpusRegisterRow.registerId,
      dati: corpusRegisterRow.dati,
    })
    .from(corpusRegisterRow)
    .where(and(eq(corpusRegisterRow.id, rowId), eq(corpusRegisterRow.organizationId, orgId)));
  if (!r) throw new Error("Registrazione inesistente o di un altro studio");
  return r;
}

/**
 * Modifica i campi indicati di una riga.
 *
 * ⚠️ **Solo i campi arrivati.** I valori precedenti si rileggono dal database dentro la
 * transazione e si fondono: il client manda quello che ha toccato, mai la riga intera. È
 * la regola nata in Fase 7 e ripetuta in Fase 12, dove salvare il costo azzerava la
 * quantità — terza occorrenza dello stesso difetto in questo progetto.
 */
export async function aggiornaRiga(
  userId: string,
  orgId: string,
  input: z.infer<typeof aggiornaRigaSchema>,
): Promise<void> {
  const p = aggiornaRigaSchema.parse(input);
  await requireEntitlement(userId, orgId, "write_data");

  await withTenant({ userId, orgId }, async (tx) => {
    await nostra(tx, orgId, p.companyId);
    const r = await riga(tx, orgId, p.rowId);
    if (r.companyId !== p.companyId) throw new Error("Registrazione di un'altra azienda");

    const schema = await schemaRegistro(tx, r.contentSetId, r.registerId);
    verificaChiavi(p.dati, schema.chiavi, schema.nome);

    const precedenti = (r.dati ?? {}) as Record<string, string>;
    const aggiornati = { ...precedenti, ...p.dati };
    // Un valore svuotato si toglie invece di restare come stringa vuota: una cella vuota e
    // una cella con "" sono la stessa cosa per chi legge, e due rappresentazioni della
    // stessa cosa divergono sempre da qualche parte.
    for (const [k, v] of Object.entries(p.dati)) if (v === "") delete aggiornati[k];

    const toccate = await tx
      .update(corpusRegisterRow)
      .set({ dati: aggiornati })
      .where(and(eq(corpusRegisterRow.id, p.rowId), eq(corpusRegisterRow.organizationId, orgId)))
      .returning({ id: corpusRegisterRow.id });
    // Un update a zero righe sarebbe il caso peggiore: l'audit direbbe «modificata» e
    // nessuno avrebbe modificato niente.
    if (!toccate.length) throw new Error("Registrazione non aggiornata: nessuna riga toccata");

    await logAudit(tx, {
      organizationId: orgId,
      userId,
      azione: "corpus.registro.aggiorna",
      entita: "corpus_register_row",
      entitaId: p.rowId,
      dettagli: { companyId: p.companyId, registro: r.registerId, campi: Object.keys(p.dati) },
    });
  });
}

/**
 * Elimina una riga.
 *
 * Il progressivo delle righe rimaste **non si ricompatta**: i riferimenti già scritti
 * altrove — nei registri che si collegano fra loro, nei documenti stampati — continuano a
 * puntare al numero che portavano. Rinumerare sarebbe riscrivere la storia.
 */
export async function eliminaRiga(
  userId: string,
  orgId: string,
  companyId: string,
  rowId: string,
): Promise<void> {
  await requireEntitlement(userId, orgId, "write_data");

  await withTenant({ userId, orgId }, async (tx) => {
    await nostra(tx, orgId, companyId);
    const r = await riga(tx, orgId, rowId);
    if (r.companyId !== companyId) throw new Error("Registrazione di un'altra azienda");

    await tx
      .delete(corpusRegisterRow)
      .where(and(eq(corpusRegisterRow.id, rowId), eq(corpusRegisterRow.organizationId, orgId)));

    await logAudit(tx, {
      organizationId: orgId,
      userId,
      azione: "corpus.registro.elimina",
      entita: "corpus_register_row",
      entitaId: rowId,
      dettagli: { companyId, registro: r.registerId },
    });
  });
}
