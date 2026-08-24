import { and, asc, count, eq } from "drizzle-orm";
import { withTenant } from "@/lib/db/tenant";
import {
  company,
  corpusDocument,
  corpusDocState,
  corpusRegister,
  corpusRegisterRow,
  saCriterion,
  saCriterionState,
  saGroup,
  saSection,
  saSystem,
} from "@/lib/db/schema";
import { completamento, percentualeCriteri, type StatoCriterio } from "@/lib/calc/sa8000/punteggio";
import { CAMPI_ANAGRAFICA } from "./validation";

// Le letture di SA8000/2026.
//
// ⚠️ Il completamento e' una media PESATA su cinque voci, e tre di quelle voci vivono nel
// CORPUS — procedure approvate, moduli approvati, registri con almeno una registrazione.
// Per questo la lettura interroga anche le tabelle del corpus: il punteggio di questo
// modulo non si puo' calcolare senza.

export async function getSa8000(userId: string, orgId: string, companyId: string) {
  return withTenant({ userId, orgId }, async (tx) => {
    const [azienda] = await tx
      .select({ id: company.id, nome: company.nome, settore: company.settore, sede: company.sede })
      .from(company)
      .where(and(eq(company.id, companyId), eq(company.organizationId, orgId)));
    if (!azienda) return null;

    const [sistema] = await tx
      .select()
      .from(saSystem)
      .where(and(eq(saSystem.companyId, companyId), eq(saSystem.organizationId, orgId)));
    if (!sistema) return { azienda, sistema: null } as const;

    const set = sistema.contentSetId;
    const [sezioni, gruppi, criteri, stati, documenti, statiDoc, registri, righeReg] = await Promise.all([
      tx.select().from(saSection).where(eq(saSection.setId, set)).orderBy(asc(saSection.ordine)),
      tx.select().from(saGroup).where(eq(saGroup.setId, set)).orderBy(asc(saGroup.ordine)),
      tx.select().from(saCriterion).where(eq(saCriterion.setId, set)).orderBy(asc(saCriterion.ordine)),
      tx
        .select()
        .from(saCriterionState)
        .where(and(eq(saCriterionState.systemId, sistema.id), eq(saCriterionState.organizationId, orgId))),
      tx
        .select({ code: corpusDocument.code, tipo: corpusDocument.tipo })
        .from(corpusDocument)
        .where(eq(corpusDocument.contentSetId, set)),
      tx
        .select({ docCode: corpusDocState.docCode, stato: corpusDocState.stato })
        .from(corpusDocState)
        .where(
          and(
            eq(corpusDocState.companyId, companyId),
            eq(corpusDocState.organizationId, orgId),
            eq(corpusDocState.contentSetId, set),
          ),
        ),
      tx.select({ registerId: corpusRegister.registerId }).from(corpusRegister).where(eq(corpusRegister.contentSetId, set)),
      tx
        .select({ registerId: corpusRegisterRow.registerId, n: count() })
        .from(corpusRegisterRow)
        .where(
          and(
            eq(corpusRegisterRow.companyId, companyId),
            eq(corpusRegisterRow.organizationId, orgId),
            eq(corpusRegisterRow.contentSetId, set),
          ),
        )
        .groupBy(corpusRegisterRow.registerId),
    ]);

    const perChiave = new Map(stati.map((s) => [s.criterionKey, s]));
    const statoDi = (k: string) => (perChiave.get(k)?.stato ?? null) as StatoCriterio | null;

    // ─── Le cinque voci del completamento ──────────────────────────────────
    //
    // ⚠️ Ogni percentuale esclude dal DENOMINATORE cio' che e' stato dichiarato non
    // applicabile, e conta come zero cio' che non e' stato ancora guardato. E' la stessa
    // regola del prototipo, ed e' la ragione per cui una procedura marcata «non
    // applicabile» non abbassa il punteggio mentre una mai aperta si'.
    const statoDoc = new Map(statiDoc.map((s) => [s.docCode, s.stato]));
    const conta = (tipo: "procedura" | "modulo") => {
      const suoi = documenti.filter((d) => d.tipo === tipo);
      const applicabili = suoi.filter((d) => statoDoc.get(d.code) !== "non_applicabile");
      const approvati = suoi.filter((d) => statoDoc.get(d.code) === "approvato").length;
      return {
        totale: suoi.length,
        applicabili: applicabili.length,
        approvati,
        percentuale: applicabili.length ? Math.round((approvati / applicabili.length) * 100) : 0,
      };
    };

    const procedure = conta("procedura");
    const moduli = conta("modulo");

    const conRighe = new Set(righeReg.map((r) => r.registerId));
    const registriPieni = registri.filter((r) => conRighe.has(r.registerId)).length;
    const pctRegistri = registri.length ? Math.round((registriPieni / registri.length) * 100) : 0;

    const compilati = CAMPI_ANAGRAFICA.filter((k) =>
      String((sistema as Record<string, unknown>)[k] ?? "").trim(),
    ).length;
    const pctAnagrafica = Math.round((compilati / CAMPI_ANAGRAFICA.length) * 100);

    const pctCriteri = percentualeCriteri(criteri.map((c) => statoDi(c.key)));

    // ─── I gruppi, con il loro punteggio ───────────────────────────────────
    //
    // ⚠️ I gruppi si riordinano per SEZIONE, e non per il proprio `ordine`. Nel
    // prototipo l'ordine dei gruppi e' quello di inserimento dell'oggetto `grp`, che
    // comincia da M1: le sezioni pero' cominciano da F, e i criteri anche (F1 e' il
    // primo). Lasciandolo com'e', chi apre i criteri trova aperto M1 mentre l'elenco
    // parte da F, e filtrando per «Criteri fondazionali» il gruppo F compare dopo
    // quindici che quel filtro ha appena tolto. Trovato dal collaudo del percorso.
    const ordineSezione = new Map(sezioni.map((sz) => [sz.key, sz.ordine]));
    const gruppiOrdinati = [...gruppi].sort(
      (a, b) =>
        (ordineSezione.get(a.sectionKey) ?? 99) - (ordineSezione.get(b.sectionKey) ?? 99) ||
        a.ordine - b.ordine,
    );
    const perGruppo = gruppiOrdinati.map((g) => {
      const suoi = criteri.filter((c) => c.groupKey === g.key);
      return {
        gruppo: g,
        criteri: suoi.length,
        valutati: suoi.filter((c) => statoDi(c.key) !== null).length,
        percentuale: percentualeCriteri(suoi.map((c) => statoDi(c.key))),
      };
    });

    const perSezione = sezioni.map((sz) => {
      const suoi = criteri.filter((c) => c.sectionKey === sz.key);
      return {
        sezione: sz,
        criteri: suoi.length,
        valutati: suoi.filter((c) => statoDi(c.key) !== null).length,
        percentuale: percentualeCriteri(suoi.map((c) => statoDi(c.key))),
      };
    });

    return {
      azienda,
      sistema,
      sezioni,
      gruppi: gruppiOrdinati,
      criteri,
      stati,
      perGruppo,
      perSezione,
      completamento: {
        anagrafica: pctAnagrafica,
        procedure: procedure.percentuale,
        moduli: moduli.percentuale,
        criteri: pctCriteri,
        registri: pctRegistri,
        totale: completamento({
          anagrafica: pctAnagrafica,
          procedure: procedure.percentuale,
          moduli: moduli.percentuale,
          criteri: pctCriteri,
          registri: pctRegistri,
        }),
      },
      dettaglio: {
        procedure,
        moduli,
        registri: { totale: registri.length, pieni: registriPieni },
        anagraficaCompilati: compilati,
        anagraficaTotale: CAMPI_ANAGRAFICA.length,
        criteriValutati: criteri.filter((c) => statoDi(c.key) !== null).length,
        criteriTotali: criteri.length,
        criteriAttuati: criteri.filter((c) => statoDi(c.key) === "ok").length,
        criteriNonAttuati: criteri.filter((c) => statoDi(c.key) === "no").length,
      },
    };
  });
}
