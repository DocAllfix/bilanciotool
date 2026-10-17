import { randomUUID } from "node:crypto";
import { and, eq, inArray, isNotNull, like, notInArray } from "drizzle-orm";
import { dbCorrente, type Tx } from "@/lib/db/tenant";
import { atecoProposta, emissionFactor, ghgActivityRow, ghgInventory, ghgOrgFactor, ghgSourceSelection } from "@/lib/db/schema";
import { logAudit } from "@/lib/audit";
import { profiloAteco } from "@/lib/calc/ateco";
import { latestSetId } from "@/features/content-set";

// Le voci GHG che si trovano da sole (decisione del committente del 17 ottobre 2026).
//
// Appena si conosce il codice ATECO, l'inventario riceve le voci tipiche del suo profilo:
// sorgente, fattore e descrizione già scelti, QUANTITÀ ZERO, marcate «proposta» col motivo.
// Il totale non cambia finché nessuno scrive una quantità; la verifica le elenca come
// «proposte da compilare».
//
// ⚠️ TRE REGOLE, e sono il punto:
//   1. Una voce TOCCATA non si tocca più. La marca (`proposta_motivo`) si spegne alla prima
//      modifica o alla conferma; da lì la voce è del consulente, anche se l'ATECO cambia.
//   2. Cambiando ATECO si tolgono SOLO le proposte non toccate del profilo vecchio, e solo a
//      quantità zero. Una voce con un numero dentro non sparisce mai da sola.
//   3. Si accende una sorgente solo se nessuno l'ha già decisa: un «esclusa con motivo»
//      scritto dal consulente vale più di una proposta.
//
// Idempotente: `tipo_key` con un indice unico per inventario. Riproporre non duplica.

const PREFISSO = "ateco:";

export type EsitoProposte = { profilo: string | null; inserite: number; tolte: number };

export async function proponiVociGhg(
  tx: Tx,
  userId: string,
  orgId: string,
  inventoryId: string,
  ateco: string | null | undefined,
): Promise<EsitoProposte> {
  const [inv] = await tx
    .select({ id: ghgInventory.id, contentSetId: ghgInventory.contentSetId })
    .from(ghgInventory)
    .where(and(eq(ghgInventory.id, inventoryId), eq(ghgInventory.organizationId, orgId)))
    .limit(1);
  if (!inv) throw new Error("Inventario inesistente o di un altro tenant");

  const profilo = profiloAteco(ateco);
  const catalogo = profilo
    ? await dbCorrente()
        .select()
        .from(atecoProposta)
        .where(
          and(
            eq(atecoProposta.setId, await latestSetId("ateco", "Catalogo delle proposte ATECO non disponibile")),
            eq(atecoProposta.profilo, profilo.key),
            eq(atecoProposta.modulo, "ghg"),
            eq(atecoProposta.tipo, "voce"),
          ),
        )
        .orderBy(atecoProposta.ordine)
    : [];
  const chiaviNuove = catalogo.map((c) => `${PREFISSO}${c.chiave}`);

  // 2. Le proposte non toccate di un profilo che non vale più, a quantità zero.
  const tolte = await tx
    .delete(ghgActivityRow)
    .where(
      and(
        eq(ghgActivityRow.inventoryId, inventoryId),
        eq(ghgActivityRow.organizationId, orgId),
        isNotNull(ghgActivityRow.propostaMotivo),
        like(ghgActivityRow.tipoKey, `${PREFISSO}%`),
        eq(ghgActivityRow.quantita, "0"),
        ...(chiaviNuove.length ? [notInArray(ghgActivityRow.tipoKey, chiaviNuove)] : []),
      ),
    )
    .returning({ id: ghgActivityRow.id });

  let inserite = 0;
  if (profilo && catalogo.length) {
    // Il fattore EFFETTIVO: piattaforma, poi la sovrapposizione dello studio — lo stesso che
    // vedrebbe il consulente scegliendolo a mano.
    const base = await dbCorrente().select().from(emissionFactor).where(eq(emissionFactor.setId, inv.contentSetId));
    const nostri = await tx.select().from(ghgOrgFactor).where(eq(ghgOrgFactor.organizationId, orgId));
    const fattori = new Map<string, { key: string; nome: string; um: string; fe: string; feMarket: string | null; feBiogenic: string | null; categoryKey: string; sourceTypeKey: string }>();
    for (const f of base) fattori.set(f.key, f);
    for (const o of nostri) fattori.set(o.key, o);

    // Un fattore già presente nell'inventario (scritto a mano o ripreso dall'esercizio
    // prima) non si propone una seconda volta: due voci «gas naturale» sarebbero un doppio
    // conteggio in attesa di succedere.
    const presenti = new Set(
      (await tx.select({ k: ghgActivityRow.factorKey }).from(ghgActivityRow).where(eq(ghgActivityRow.inventoryId, inventoryId)))
        .map((r) => r.k)
        .filter(Boolean),
    );
    const righe = catalogo.flatMap((c) => {
      const f = fattori.get(c.chiave);
      if (!f || presenti.has(f.key)) return [];
      return [
        {
          id: randomUUID(),
          organizationId: orgId,
          inventoryId,
          sourceTypeKey: f.sourceTypeKey,
          categoryKey: f.categoryKey,
          descrizione: f.nome,
          factorKey: f.key,
          um: f.um,
          quantita: "0",
          fe: f.fe,
          feMarket: f.feMarket,
          feBiogenic: f.feBiogenic,
          tipoKey: `${PREFISSO}${c.chiave}`,
          propostaMotivo: `Proposta dal codice ATECO (${profilo.nome}): ${c.motivo}`,
        },
      ];
    });
    // Le proposte non toccate che valgono anche per il profilo nuovo restano, ma il MOTIVO
    // deve dire il profilo di adesso: «Metallurgia» su uno studio professionale direbbe il
    // falso a chi la legge.
    for (const c of catalogo) {
      await tx
        .update(ghgActivityRow)
        .set({ propostaMotivo: `Proposta dal codice ATECO (${profilo.nome}): ${c.motivo}` })
        .where(
          and(
            eq(ghgActivityRow.inventoryId, inventoryId),
            eq(ghgActivityRow.organizationId, orgId),
            eq(ghgActivityRow.tipoKey, `${PREFISSO}${c.chiave}`),
            isNotNull(ghgActivityRow.propostaMotivo),
          ),
        );
    }
    if (righe.length) {
      const nuove = await tx.insert(ghgActivityRow).values(righe).onConflictDoNothing().returning({ sorgente: ghgActivityRow.sourceTypeKey });
      inserite = nuove.length;
      // 3. Le sorgenti delle voci proposte si accendono, se nessuno le ha già decise.
      const sorgenti = [...new Set(righe.map((r) => r.sourceTypeKey))];
      await tx
        .insert(ghgSourceSelection)
        .values(sorgenti.map((k) => ({ id: randomUUID(), organizationId: orgId, inventoryId, sourceTypeKey: k, stato: "in" as const })))
        .onConflictDoNothing();
    }
  }

  if (inserite || tolte.length) {
    await logAudit(tx, {
      organizationId: orgId,
      userId,
      azione: "ghg.proposte.ateco",
      entita: "ghg_inventory",
      entitaId: inventoryId,
      dettagli: { profilo: profilo?.key ?? null, inserite, tolte: tolte.length },
    });
  }
  return { profilo: profilo?.key ?? null, inserite, tolte: tolte.length };
}

/** Le voci ancora «proposta»: la verifica le elenca, il documento non le stampa come dato. */
export async function vociProposteAperte(tx: Tx, orgId: string, inventoryId: string) {
  return tx
    .select({ id: ghgActivityRow.id, descrizione: ghgActivityRow.descrizione })
    .from(ghgActivityRow)
    .where(
      and(
        eq(ghgActivityRow.inventoryId, inventoryId),
        eq(ghgActivityRow.organizationId, orgId),
        isNotNull(ghgActivityRow.propostaMotivo),
      ),
    );
}

/** «Conferma»: la voce smette di essere una proposta, e diventa del consulente. */
export async function confermaVoce(tx: Tx, userId: string, orgId: string, rowIds: string[]): Promise<number> {
  if (!rowIds.length) return 0;
  const r = await tx
    .update(ghgActivityRow)
    .set({ propostaMotivo: null })
    .where(and(inArray(ghgActivityRow.id, rowIds), eq(ghgActivityRow.organizationId, orgId), isNotNull(ghgActivityRow.propostaMotivo)))
    .returning({ id: ghgActivityRow.id });
  if (r.length) {
    await logAudit(tx, { organizationId: orgId, userId, azione: "ghg.proposte.conferma", entita: "ghg_activity_row", dettagli: { voci: r.length } });
  }
  return r.length;
}

/**
 * Le voci dell'esercizio precedente, riprese come PROPOSTE a quantità zero: sono la proposta
 * più precisa che esista, più del codice ATECO, perché sono quelle che l'azienda ha davvero.
 * Fattore, unità e descrizione restano; la quantità va riscritta.
 */
export async function riprendiVociPrecedenti(tx: Tx, userId: string, orgId: string, daInventoryId: string, aInventoryId: string, annoPrecedente: number): Promise<number> {
  const rows = await tx
    .select()
    .from(ghgActivityRow)
    .where(and(eq(ghgActivityRow.inventoryId, daInventoryId), eq(ghgActivityRow.organizationId, orgId)));
  if (!rows.length) return 0;
  const nuove = await tx
    .insert(ghgActivityRow)
    .values(
      rows.map((r) => {
        const { id: _o, createdAt: _c, updatedAt: _u, ...resto } = r;
        return {
          ...resto,
          id: randomUUID(),
          inventoryId: aInventoryId,
          quantita: "0",
          tipoKey: `prec:${r.id}`,
          propostaMotivo: `Ripresa dall'esercizio ${annoPrecedente}: la voce c'era, la quantità va aggiornata.`,
        };
      }),
    )
    .onConflictDoNothing()
    .returning({ id: ghgActivityRow.id });
  await logAudit(tx, {
    organizationId: orgId,
    userId,
    azione: "ghg.proposte.precedente",
    entita: "ghg_inventory",
    entitaId: aInventoryId,
    dettagli: { daInventoryId, riprese: nuove.length },
  });
  return nuove.length;
}
