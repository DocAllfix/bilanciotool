import { and, asc, count, eq, inArray } from "drizzle-orm";
import { withTenant } from "@/lib/db/tenant";
import {
  company,
  corpusBlock,
  corpusBlockOverride,
  corpusDocState,
  corpusDocument,
  corpusPlaceholder,
  corpusRegister,
  corpusRegisterColumn,
  corpusRegisterRow,
  organization,
} from "@/lib/db/schema";
import type { Blocco } from "@/lib/calc/corpus/blocchi";
import type { Contesto, Segnaposto } from "@/lib/calc/corpus/segnaposto";

// Le LETTURE del corpus documentale.
//
// ⚠️ Questo file è nato in ritardo, e la sua assenza è stata il difetto più grande della
// Fase A. Il motore c'era, le mutazioni c'erano (`documenti.ts`, `registri.ts`) e i test
// erano verdi — ma **non esisteva una sola funzione esportata che leggesse il corpus**.
// Le due `select` presenti fuori dai test erano guardie interne: verificano che un
// documento esista prima di scriverci. Senza una lettura non c'è niente da mostrare:
// 447 documenti, 6.489 blocchi e 70 registri erano seminati e irraggiungibili.
//
// Il test non poteva accorgersene: `corpus-flow.db.test.ts` verifica le scritture
// interrogando il database direttamente, quindi certificava la metà che funzionava.
//
// ⚠️ E non è una rifinitura: nel prototipo del Sistema integrato QAS gli aspetti
// ambientali e i pericoli sono DUE DEI SEDICI REGISTRI, non due viste proprie. Senza
// questa superficie, due dei tre motori di quel modulo non avrebbero un posto dove
// prendere i dati.

/** Lo stato di un documento per una certa azienda, coi valori predefiniti. */
export type StatoDocumento = {
  stato: "da_personalizzare" | "in_redazione" | "approvato" | "non_applicabile";
  revisione: string;
  dataEmissione: string | null;
  note: string | null;
  integrazioni: string | null;
};

const STATO_INIZIALE: StatoDocumento = {
  stato: "da_personalizzare",
  revisione: "01",
  dataEmissione: null,
  note: null,
  integrazioni: null,
};

export type VoceCorpus = {
  code: string;
  tipo: "procedura" | "modulo";
  titolo: string;
  fase: string | null;
  rif: string | null;
  proCode: string | null;
  ordine: number;
} & StatoDocumento;

/**
 * L'elenco delle procedure o dei moduli, con lo stato che quell'azienda ha dato a
 * ciascuno.
 *
 * ⚠️ Lo stato è una LEFT JOIN con un valore predefinito, non una riga obbligatoria: un
 * documento mai toccato non ha una riga in `corpus_doc_state`, e crearne 447 alla
 * creazione dell'azienda significherebbe scrivere mezzo milione di righe vuote per il
 * portafoglio di uno studio. Il valore predefinito sta qui, in un posto solo.
 */
export async function listaCorpus(
  userId: string,
  orgId: string,
  companyId: string,
  contentSetId: string,
  tipo: "procedura" | "modulo",
): Promise<VoceCorpus[]> {
  return withTenant({ userId, orgId }, async (tx) => {
    const [documenti, stati] = await Promise.all([
      tx
        .select()
        .from(corpusDocument)
        .where(and(eq(corpusDocument.contentSetId, contentSetId), eq(corpusDocument.tipo, tipo)))
        .orderBy(asc(corpusDocument.ordine)),
      tx
        .select()
        .from(corpusDocState)
        .where(
          and(
            eq(corpusDocState.companyId, companyId),
            eq(corpusDocState.organizationId, orgId),
            eq(corpusDocState.contentSetId, contentSetId),
          ),
        ),
    ]);

    const perCodice = new Map(stati.map((s) => [s.docCode, s]));
    return documenti.map((d) => {
      const s = perCodice.get(d.code);
      return {
        code: d.code,
        tipo: d.tipo,
        titolo: d.titolo,
        fase: d.fase,
        rif: d.rif,
        proCode: d.proCode,
        ordine: d.ordine,
        stato: s?.stato ?? STATO_INIZIALE.stato,
        revisione: s?.revisione ?? STATO_INIZIALE.revisione,
        dataEmissione: s?.dataEmissione ?? null,
        note: s?.note ?? null,
        integrazioni: s?.integrazioni ?? null,
      };
    });
  });
}

/** Quanti documenti per stato: serve al contatore della vista e al quadro del modulo. */
export async function contaCorpus(
  userId: string,
  orgId: string,
  companyId: string,
  contentSetId: string,
): Promise<{ procedure: number; moduli: number; approvate: number }> {
  const [pro, mod] = await Promise.all([
    listaCorpus(userId, orgId, companyId, contentSetId, "procedura"),
    listaCorpus(userId, orgId, companyId, contentSetId, "modulo"),
  ]);
  return {
    procedure: pro.length,
    moduli: mod.length,
    approvate: pro.filter((p) => p.stato === "approvato").length,
  };
}

export type DocumentoCorpus = {
  /** La versione dei contenuti da cui viene: serve a ogni scrittura successiva. */
  contentSetId: string;
  documento: VoceCorpus;
  blocchi: Blocco[];
  /** Il testo su misura del cliente, per chiave di blocco. */
  override: Record<string, string>;
  segnaposti: Segnaposto[];
  contesto: Contesto;
};

/**
 * Un documento intero, pronto per il renderer: blocchi, personalizzazioni, segnaposto e
 * il contesto da cui i token pescano.
 *
 * ⚠️ Il contesto si costruisce QUI e non nel componente. `studio` è il nome dello studio
 * — è lui che redige, ed è ciò che va nella casella «Redatto da» della testata di ogni
 * procedura; `azienda` è l'anagrafica del cliente, che va in «Approvato da». Nei
 * prototipi le due caselle pescavano dalla stessa fonte, ed è la ragione per cui il token
 * `[Resp. Due Diligence]` risultava orfano in quattro moduli su cinque: era un residuo di
 * copia-incolla nella casella sbagliata.
 */
export async function documentoCorpus(
  userId: string,
  orgId: string,
  companyId: string,
  contentSetId: string,
  docCode: string,
  /** L'anagrafica del modulo chiamante: solo lui sa dove tiene ragione sociale e sede. */
  anagrafica: Record<string, string | null | undefined>,
  opzioni?: { revisione?: string | null; data?: string | null },
): Promise<DocumentoCorpus | null> {
  return withTenant({ userId, orgId }, async (tx) => {
    const [voce] = await tx
      .select()
      .from(corpusDocument)
      .where(and(eq(corpusDocument.contentSetId, contentSetId), eq(corpusDocument.code, docCode)));
    if (!voce) return null;

    const [az] = await tx
      .select({ nome: company.nome })
      .from(company)
      .where(and(eq(company.id, companyId), eq(company.organizationId, orgId)));
    if (!az) return null;

    const [blocchi, override, segnaposti, stati, studio] = await Promise.all([
      tx
        .select({ blockId: corpusBlock.blockId, tipo: corpusBlock.tipo, contenuto: corpusBlock.contenuto })
        .from(corpusBlock)
        .where(and(eq(corpusBlock.contentSetId, contentSetId), eq(corpusBlock.docCode, docCode)))
        .orderBy(asc(corpusBlock.ordine)),
      tx
        .select({ blockId: corpusBlockOverride.blockId, testo: corpusBlockOverride.testo })
        .from(corpusBlockOverride)
        .where(
          and(
            eq(corpusBlockOverride.companyId, companyId),
            eq(corpusBlockOverride.organizationId, orgId),
            eq(corpusBlockOverride.contentSetId, contentSetId),
            eq(corpusBlockOverride.docCode, docCode),
          ),
        ),
      tx.select().from(corpusPlaceholder).where(eq(corpusPlaceholder.contentSetId, contentSetId)),
      tx
        .select()
        .from(corpusDocState)
        .where(
          and(
            eq(corpusDocState.companyId, companyId),
            eq(corpusDocState.organizationId, orgId),
            eq(corpusDocState.contentSetId, contentSetId),
            eq(corpusDocState.docCode, docCode),
          ),
        ),
      tx.select({ nome: organization.name }).from(organization).where(eq(organization.id, orgId)),
    ]);

    const s = stati[0];
    return {
      contentSetId,
      documento: {
        code: voce.code,
        tipo: voce.tipo,
        titolo: voce.titolo,
        fase: voce.fase,
        rif: voce.rif,
        proCode: voce.proCode,
        ordine: voce.ordine,
        stato: s?.stato ?? STATO_INIZIALE.stato,
        revisione: s?.revisione ?? STATO_INIZIALE.revisione,
        dataEmissione: s?.dataEmissione ?? null,
        note: s?.note ?? null,
        integrazioni: s?.integrazioni ?? null,
      },
      blocchi: blocchi as Blocco[],
      override: Object.fromEntries(override.map((o) => [o.blockId, o.testo])),
      segnaposti: segnaposti as Segnaposto[],
      contesto: {
        studio: studio[0]?.nome ?? null,
        azienda: { nome: az.nome, ...anagrafica },
        revisione: opzioni?.revisione ?? s?.revisione ?? null,
        data: opzioni?.data ?? s?.dataEmissione ?? null,
      },
    };
  });
}

export type VoceRegistro = {
  registerId: string;
  nome: string;
  descrizione: string | null;
  modCode: string | null;
  proCode: string | null;
  capitolo: string | null;
  ordine: number;
  righe: number;
};

/** L'elenco dei registri, con quante registrazioni ha ciascuno. */
export async function listaRegistri(
  userId: string,
  orgId: string,
  companyId: string,
  contentSetId: string,
): Promise<VoceRegistro[]> {
  return withTenant({ userId, orgId }, async (tx) => {
    const [registri, conteggi] = await Promise.all([
      tx
        .select()
        .from(corpusRegister)
        .where(eq(corpusRegister.contentSetId, contentSetId))
        .orderBy(asc(corpusRegister.ordine)),
      tx
        .select({ registerId: corpusRegisterRow.registerId, n: count() })
        .from(corpusRegisterRow)
        .where(
          and(
            eq(corpusRegisterRow.companyId, companyId),
            eq(corpusRegisterRow.organizationId, orgId),
            eq(corpusRegisterRow.contentSetId, contentSetId),
          ),
        )
        .groupBy(corpusRegisterRow.registerId),
    ]);

    const perId = new Map(conteggi.map((c) => [c.registerId, c.n]));
    return registri.map((r) => ({ ...r, righe: perId.get(r.registerId) ?? 0 }));
  });
}

export type ColonnaRegistro = {
  chiave: string;
  etichetta: string;
  tipo: "text" | "ta" | "sel" | "date" | "num" | "crit" | "partner";
  inTabella: boolean;
  larghezza: string | null;
  opzioni: string[] | null;
  prefissoAuto: string | null;
  hint: string | null;
  ordine: number;
};

export type RigaRegistro = {
  id: string;
  numero: number;
  riferimento: string | null;
  dati: Record<string, unknown>;
};

/** Un registro: la sua definizione, le colonne e le registrazioni dell'azienda. */
export async function registroCorpus(
  userId: string,
  orgId: string,
  companyId: string,
  contentSetId: string,
  registerId: string,
): Promise<{ registro: VoceRegistro; colonne: ColonnaRegistro[]; righe: RigaRegistro[] } | null> {
  return withTenant({ userId, orgId }, async (tx) => {
    const [def] = await tx
      .select()
      .from(corpusRegister)
      .where(and(eq(corpusRegister.contentSetId, contentSetId), eq(corpusRegister.registerId, registerId)));
    if (!def) return null;

    const [colonne, righe] = await Promise.all([
      tx
        .select()
        .from(corpusRegisterColumn)
        .where(
          and(
            eq(corpusRegisterColumn.contentSetId, contentSetId),
            eq(corpusRegisterColumn.registerId, registerId),
          ),
        )
        .orderBy(asc(corpusRegisterColumn.ordine)),
      tx
        .select({
          id: corpusRegisterRow.id,
          numero: corpusRegisterRow.numero,
          riferimento: corpusRegisterRow.riferimento,
          dati: corpusRegisterRow.dati,
        })
        .from(corpusRegisterRow)
        .where(
          and(
            eq(corpusRegisterRow.companyId, companyId),
            eq(corpusRegisterRow.organizationId, orgId),
            eq(corpusRegisterRow.contentSetId, contentSetId),
            eq(corpusRegisterRow.registerId, registerId),
          ),
        )
        .orderBy(asc(corpusRegisterRow.numero)),
    ]);

    return {
      registro: { ...def, righe: righe.length },
      colonne: colonne.map((c) => ({ ...c, opzioni: (c.opzioni as string[] | null) ?? null })),
      righe: righe.map((r) => ({ ...r, dati: (r.dati as Record<string, unknown>) ?? {} })),
    };
  });
}

/**
 * Le righe di più registri in un colpo solo.
 *
 * Serve ai quadri che contano cose sparse — «aspetti significativi senza controllo
 * operativo», «autorizzazioni scadute», «non conformità oltre il termine» — dove una
 * query per registro significherebbe sedici viaggi per disegnare una schermata.
 */
export async function righeDiRegistri(
  userId: string,
  orgId: string,
  companyId: string,
  contentSetId: string,
  registerIds: readonly string[],
): Promise<Record<string, RigaRegistro[]>> {
  if (!registerIds.length) return {};
  return withTenant({ userId, orgId }, async (tx) => {
    const righe = await tx
      .select({
        registerId: corpusRegisterRow.registerId,
        id: corpusRegisterRow.id,
        numero: corpusRegisterRow.numero,
        riferimento: corpusRegisterRow.riferimento,
        dati: corpusRegisterRow.dati,
      })
      .from(corpusRegisterRow)
      .where(
        and(
          eq(corpusRegisterRow.companyId, companyId),
          eq(corpusRegisterRow.organizationId, orgId),
          eq(corpusRegisterRow.contentSetId, contentSetId),
          inArray(corpusRegisterRow.registerId, [...registerIds]),
        ),
      )
      .orderBy(asc(corpusRegisterRow.numero));

    const out: Record<string, RigaRegistro[]> = Object.fromEntries(registerIds.map((r) => [r, []]));
    for (const r of righe) {
      out[r.registerId].push({
        id: r.id,
        numero: r.numero,
        riferimento: r.riferimento,
        dati: (r.dati as Record<string, unknown>) ?? {},
      });
    }
    return out;
  });
}
