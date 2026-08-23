import { withTenant } from "@/lib/db/tenant";
import {
  company,
  documentSnapshot,
  ghgInventory,
  ghgActivityRow,
  reportProject,
  kpiValue,
  energyBalance,
  energyVectorInput,
  supplierAssessment,
  supplierAnswer,
  soaDeclaration,
  soaControlDecision, briberySystem, briberyRequirementState, mogModel, mogProcess, mogScenario,
  wbSystem, wbRequirementState } from "@/lib/db/schema";
import { MODULI_AZIENDA, type ModuloAzienda } from "./moduli";
import { and, count, desc, eq, isNotNull } from "drizzle-orm";

// Stato dei cinque moduli di un'azienda, per il fascicolo.
//
// Regola che tiene veloce questa pagina: il fascicolo mostra fatti CONTABILI
// (quale esercizio, quante celle valorizzate, quale versione pubblicata e
// quando), non indici ricalcolati. Gli indici stanno dentro i moduli, dove
// sono già calcolati per il lavoro che si sta facendo lì. Rifarli qui per
// cinque moduli significherebbe eseguire cinque motori a ogni apertura di una
// pagina che serve solo a scegliere dove andare.

export type StatoModulo = "non-avviato" | "in-corso" | "pubblicato";

export type VoceFascicolo = {
  modulo: ModuloAzienda;
  stato: StatoModulo;
  /** Esercizio più recente, per i moduli annuali; null per gli altri. */
  anno: number | null;
  /** Misura di compilazione contata dal DB, con la sua unità di misura. */
  riempimento: { valore: number; etichetta: string } | null;
  /** Ultima versione pubblicata, se esiste. */
  pubblicato: { snapshotId: string; versione: number; quando: Date; anno: number } | null;
  /** Rotta da aprire: l'esercizio se c'è, altrimenti l'ingresso del modulo. */
  href: string;
};

export type Fascicolo = {
  azienda: { id: string; nome: string; settore: string | null; sede: string | null; ateco: string | null; stato: "active" | "archived"; isDemo: boolean };
  voci: VoceFascicolo[];
  documentiTotali: number;
};

/** Ultimo snapshot per tipo, con la versione più alta. */
type UltimoDoc = { tipo: string; anno: number; versione: number; id: string; publishedAt: Date };

export async function getFascicolo(userId: string, orgId: string, companyId: string): Promise<Fascicolo | null> {
  return withTenant({ userId, orgId }, async (tx) => {
    // Anti-IDOR esplicito: l'id da solo non basta a dare accesso.
    const [az] = await tx
      .select()
      .from(company)
      .where(and(eq(company.id, companyId), eq(company.organizationId, orgId)));
    if (!az) return null;

    // Tutte le radici dei cinque moduli in parallelo: cinque select piccole,
    // non cinque motori.
    const [inventari, progetti, bilanciEnergia, valutazione, dichiarazione, sistemaPc, modello231, sistemaWb, documenti] = await Promise.all([
      tx
        .select({ id: ghgInventory.id, anno: ghgInventory.anno })
        .from(ghgInventory)
        .where(and(eq(ghgInventory.companyId, companyId), eq(ghgInventory.organizationId, orgId)))
        .orderBy(desc(ghgInventory.anno)),
      tx
        .select({ id: reportProject.id, anno: reportProject.anno })
        .from(reportProject)
        .where(and(eq(reportProject.companyId, companyId), eq(reportProject.organizationId, orgId)))
        .orderBy(desc(reportProject.anno)),
      tx
        .select({ id: energyBalance.id, anno: energyBalance.anno })
        .from(energyBalance)
        .where(and(eq(energyBalance.companyId, companyId), eq(energyBalance.organizationId, orgId)))
        .orderBy(desc(energyBalance.anno)),
      tx
        .select({ id: supplierAssessment.id })
        .from(supplierAssessment)
        .where(and(eq(supplierAssessment.companyId, companyId), eq(supplierAssessment.organizationId, orgId))),
      tx
        .select({ id: soaDeclaration.id })
        .from(soaDeclaration)
        .where(and(eq(soaDeclaration.companyId, companyId), eq(soaDeclaration.organizationId, orgId))),
      tx
        .select({ id: briberySystem.id })
        .from(briberySystem)
        .where(and(eq(briberySystem.companyId, companyId), eq(briberySystem.organizationId, orgId))),
      tx
        .select({ id: mogModel.id })
        .from(mogModel)
        .where(and(eq(mogModel.companyId, companyId), eq(mogModel.organizationId, orgId))),
      tx
        .select({ id: wbSystem.id })
        .from(wbSystem)
        .where(and(eq(wbSystem.companyId, companyId), eq(wbSystem.organizationId, orgId))),
      tx
        .select({
          id: documentSnapshot.id,
          tipo: documentSnapshot.tipo,
          anno: documentSnapshot.anno,
          versione: documentSnapshot.versione,
          publishedAt: documentSnapshot.publishedAt,
        })
        .from(documentSnapshot)
        .where(and(eq(documentSnapshot.companyId, companyId), eq(documentSnapshot.organizationId, orgId)))
        .orderBy(desc(documentSnapshot.publishedAt)),
    ]);

    const invId = inventari[0]?.id ?? null;
    const progId = progetti[0]?.id ?? null;
    const eneId = bilanciEnergia[0]?.id ?? null;
    const supId = valutazione[0]?.id ?? null;
    const soaId = dichiarazione[0]?.id ?? null;
    const pcId = sistemaPc[0]?.id ?? null;
    const mogId = modello231[0]?.id ?? null;
    const wbId = sistemaWb[0]?.id ?? null;
    const annoBilancio = progetti[0]?.anno ?? null;

    // Conteggi di riempimento: un COUNT per modulo avviato, zero query per gli altri.
    const zero = Promise.resolve([{ n: 0 }]);
    const [nVoci, nKpi, nCelle, nRisposte, nDecisioni, nRequisiti, nScenari, nRequisitiWb] = await Promise.all([
      invId
        ? tx.select({ n: count() }).from(ghgActivityRow).where(eq(ghgActivityRow.inventoryId, invId))
        : zero,
      // I KPI sono per azienda+anno, non per progetto: si contano sull'esercizio
      // del progetto piu recente. `valore` e NOT NULL, quindi esistere basta.
      progId && annoBilancio !== null
        ? tx
            .select({ n: count() })
            .from(kpiValue)
            .where(and(eq(kpiValue.companyId, companyId), eq(kpiValue.anno, annoBilancio)))
        : zero,
      eneId
        ? tx.select({ n: count() }).from(energyVectorInput).where(eq(energyVectorInput.balanceId, eneId))
        : zero,
      supId
        ? tx
            .select({ n: count() })
            .from(supplierAnswer)
            .where(and(eq(supplierAnswer.assessmentId, supId), isNotNull(supplierAnswer.risposta)))
        : zero,
      soaId
        ? tx
            .select({ n: count() })
            .from(soaControlDecision)
            .where(and(eq(soaControlDecision.declarationId, soaId), isNotNull(soaControlDecision.stato)))
        : zero,
      pcId
        ? tx
            .select({ n: count() })
            .from(briberyRequirementState)
            .where(and(eq(briberyRequirementState.systemId, pcId), isNotNull(briberyRequirementState.stato)))
        : zero,

      // Il riempimento del 231 si conta sugli SCENARI, non sui requisiti: la mappatura
      // processo-reato e' il lavoro vero, e un Modello con novanta presidi valutati e
      // zero scenari non e' un Modello avviato.
      mogId
        ? tx
            .select({ n: count() })
            .from(mogScenario)
            .innerJoin(mogProcess, eq(mogProcess.id, mogScenario.processId))
            .where(eq(mogProcess.modelId, mogId))
        : zero,

      // ⚠️ Il riempimento delle segnalazioni si conta sui REQUISITI valutati, non sui
      // fascicoli aperti. Contare i fascicoli farebbe apparire «vuoto» un canale a cui
      // nessuno ha segnalato niente — e il modulo dice l'esatto contrario: zero
      // segnalazioni non e' un risultato, e non e' nemmeno una mancanza del consulente.
      // I canali invece nascono tre alla creazione, quindi contarli darebbe «3» a un
      // assetto in cui nessuno ha ancora scritto una riga.
      wbId
        ? tx
            .select({ n: count() })
            .from(wbRequirementState)
            .where(and(eq(wbRequirementState.systemId, wbId), isNotNull(wbRequirementState.stato)))
        : zero,
    ]);

    // Per ogni tipo di documento, la versione più alta (l'elenco è già ordinato
    // per data di pubblicazione, quindi il primo incontrato è il più recente).
    const ultimoPerTipo = new Map<string, UltimoDoc>();
    for (const d of documenti) if (!ultimoPerTipo.has(d.tipo)) ultimoPerTipo.set(d.tipo, d);

    const radici: Record<ModuloAzienda, { avviato: boolean; anno: number | null; riempimento: VoceFascicolo["riempimento"] }> = {
      ghg: {
        avviato: !!invId,
        anno: inventari[0]?.anno ?? null,
        riempimento: invId ? { valore: nVoci[0].n, etichetta: nVoci[0].n === 1 ? "voce di attività" : "voci di attività" } : null,
      },
      bilancio: {
        avviato: !!progId,
        anno: progetti[0]?.anno ?? null,
        riempimento: progId ? { valore: nKpi[0].n, etichetta: nKpi[0].n === 1 ? "indicatore compilato" : "indicatori compilati" } : null,
      },
      energetico: {
        avviato: !!eneId,
        anno: bilanciEnergia[0]?.anno ?? null,
        riempimento: eneId ? { valore: nCelle[0].n, etichetta: nCelle[0].n === 1 ? "vettore valorizzato" : "vettori valorizzati" } : null,
      },
      fornitore: {
        avviato: !!supId,
        anno: null,
        riempimento: supId ? { valore: nRisposte[0].n, etichetta: "risposte su 37" } : null,
      },
      soa: {
        avviato: !!soaId,
        anno: null,
        riempimento: soaId ? { valore: nDecisioni[0].n, etichetta: nDecisioni[0].n === 1 ? "controllo valutato" : "controlli valutati" } : null,
      },
      anticorruzione: {
        avviato: !!pcId,
        anno: null,
        riempimento: pcId
          ? { valore: nRequisiti[0].n, etichetta: nRequisiti[0].n === 1 ? "requisito valutato" : "requisiti valutati" }
          : null,
      },
      mog231: {
        avviato: !!mogId,
        anno: null,
        riempimento: mogId
          ? { valore: nScenari[0].n, etichetta: nScenari[0].n === 1 ? "scenario mappato" : "scenari mappati" }
          : null,
      },
      segnalazioni: {
        avviato: !!wbId,
        anno: null,
        riempimento: wbId
          ? {
              valore: nRequisitiWb[0].n,
              etichetta: nRequisitiWb[0].n === 1 ? "requisito valutato" : "requisiti valutati",
            }
          : null,
      },
    };

    const voci: VoceFascicolo[] = MODULI_AZIENDA.map((m) => {
      const r = radici[m.href];
      const doc = ultimoPerTipo.get(m.documenti[0]) ?? null;
      const base = `/aziende/${companyId}/${m.href}`;
      return {
        modulo: m.href,
        stato: doc ? "pubblicato" : r.avviato ? "in-corso" : "non-avviato",
        anno: r.anno,
        riempimento: r.riempimento,
        pubblicato: doc
          ? { snapshotId: doc.id, versione: doc.versione, quando: doc.publishedAt, anno: doc.anno }
          : null,
        // I moduli annuali hanno la pagina dell'esercizio; gli altri no. Puntare
        // all'ingresso quando l'esercizio esiste costerebbe un redirect in più.
        href: m.perEsercizio && r.anno !== null ? `${base}/${r.anno}` : base,
      };
    });

    return {
      azienda: {
        id: az.id,
        nome: az.nome,
        settore: az.settore,
        sede: az.sede,
        ateco: az.ateco,
        stato: az.stato,
        isDemo: az.isDemo,
      },
      voci,
      documentiTotali: documenti.length,
    };
  });
}

/** Documenti pubblicati dell'azienda, per l'elenco in fondo al fascicolo. */
export async function listDocumentiAzienda(userId: string, orgId: string, companyId: string) {
  return withTenant({ userId, orgId }, (tx) =>
    tx
      .select({
        id: documentSnapshot.id,
        tipo: documentSnapshot.tipo,
        anno: documentSnapshot.anno,
        versione: documentSnapshot.versione,
        publishedAt: documentSnapshot.publishedAt,
      })
      .from(documentSnapshot)
      .where(and(eq(documentSnapshot.companyId, companyId), eq(documentSnapshot.organizationId, orgId)))
      .orderBy(desc(documentSnapshot.publishedAt))
      .limit(20),
  );
}

/** Nomi delle aziende dello studio, per il selettore della sidebar contestuale. */
export async function listCompanyNames(userId: string, orgId: string) {
  return withTenant({ userId, orgId }, (tx) =>
    tx
      .select({ id: company.id, nome: company.nome, stato: company.stato })
      .from(company)
      .where(and(eq(company.organizationId, orgId), eq(company.stato, "active")))
      .orderBy(company.nome),
  );
}
