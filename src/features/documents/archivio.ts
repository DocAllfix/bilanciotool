import { withTenant } from "@/lib/db/tenant";
import { company, documentSnapshot } from "@/lib/db/schema";
import type { TipoDocumento } from "./tipi";
import { and, desc, eq, inArray } from "drizzle-orm";

// Archivio dei documenti pubblicati dallo studio.
//
// Invariante rispettato: MAI `select *` su `document_snapshot`. La colonna
// `dati` contiene lo snapshot completo (per la diagnosi energetica sono
// centinaia di KB per revisione) ed è TOASTata: tirarla su per compilare un
// elenco significherebbe leggere decine di megabyte per mostrare dei titoli.

export type VoceArchivio = {
  id: string;
  companyId: string;
  companyNome: string;
  tipo: TipoDocumento;
  anno: number;
  versione: number;
  publishedAt: Date;
};

export type Archivio = {
  documenti: VoceArchivio[];
  /** Aziende che hanno almeno un documento, col relativo conteggio. */
  aziende: { id: string; nome: string; n: number }[];
  conteggiPerTipo: Partial<Record<TipoDocumento, number>>;
  totale: number;
};

export async function listArchivioDocumenti(
  userId: string,
  orgId: string,
  filtri: { tipo: TipoDocumento | null; companyId: string | null },
): Promise<Archivio> {
  return withTenant({ userId, orgId }, async (tx) => {
    // Si legge una volta sola l'elenco completo dei metadati: i conteggi per
    // tipo e per azienda servono comunque a disegnare i filtri, quindi cinque
    // COUNT separati sarebbero cinque viaggi al posto di uno.
    const tutti = await tx
      .select({
        id: documentSnapshot.id,
        companyId: documentSnapshot.companyId,
        tipo: documentSnapshot.tipo,
        anno: documentSnapshot.anno,
        versione: documentSnapshot.versione,
        publishedAt: documentSnapshot.publishedAt,
      })
      .from(documentSnapshot)
      .where(eq(documentSnapshot.organizationId, orgId))
      .orderBy(desc(documentSnapshot.publishedAt));

    const companyIds = [...new Set(tutti.map((d) => d.companyId))];
    const nomi = companyIds.length
      ? await tx.select({ id: company.id, nome: company.nome }).from(company).where(inArray(company.id, companyIds))
      : [];
    const nomePerId = new Map(nomi.map((n) => [n.id, n.nome]));

    const conteggiPerTipo: Partial<Record<TipoDocumento, number>> = {};
    const perAzienda = new Map<string, number>();
    for (const d of tutti) {
      conteggiPerTipo[d.tipo] = (conteggiPerTipo[d.tipo] ?? 0) + 1;
      perAzienda.set(d.companyId, (perAzienda.get(d.companyId) ?? 0) + 1);
    }

    const filtrati = tutti.filter(
      (d) => (!filtri.tipo || d.tipo === filtri.tipo) && (!filtri.companyId || d.companyId === filtri.companyId),
    );

    return {
      documenti: filtrati.map((d) => ({ ...d, companyNome: nomePerId.get(d.companyId) ?? "—" })),
      aziende: [...perAzienda.entries()]
        .map(([id, n]) => ({ id, nome: nomePerId.get(id) ?? "—", n }))
        .sort((a, b) => a.nome.localeCompare(b.nome, "it")),
      conteggiPerTipo,
      totale: tutti.length,
    };
  });
}

/** Documenti pubblicati di recente, per lo scadenzario e il quadro dello studio. */
export async function listRecenti(userId: string, orgId: string, limite = 5) {
  return withTenant({ userId, orgId }, (tx) =>
    tx
      .select({
        id: documentSnapshot.id,
        companyId: documentSnapshot.companyId,
        tipo: documentSnapshot.tipo,
        anno: documentSnapshot.anno,
        versione: documentSnapshot.versione,
        publishedAt: documentSnapshot.publishedAt,
      })
      .from(documentSnapshot)
      .where(and(eq(documentSnapshot.organizationId, orgId)))
      .orderBy(desc(documentSnapshot.publishedAt))
      .limit(limite),
  );
}
