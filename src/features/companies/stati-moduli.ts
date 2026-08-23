import { withTenant } from "@/lib/db/tenant";
import {
  company,
  documentSnapshot,
  ghgInventory,
  reportProject,
  energyBalance,
  supplierAssessment,
  soaDeclaration, briberySystem, mogModel, wbSystem } from "@/lib/db/schema";
import { MODULI_AZIENDA, type ModuloAzienda } from "./moduli";
import type { StatoModulo } from "./fascicolo";
import { and, desc, eq, max } from "drizzle-orm";

// Stato dei cinque moduli per OGNI azienda dello studio, in un passaggio solo.
//
// Sette query aggregate per l'intero portafoglio, non cinque per azienda: con
// dieci aziende la differenza è fra sette viaggi e cinquanta. Il fascicolo
// (`fascicolo.ts`) fa la stessa cosa per una sola azienda e in più conta il
// riempimento; qui i conteggi non servono, serve lo stato.
//
// Da questa lettura sola nascono tre cose che prima erano tre query diverse:
// le caselle accese sulle card, la banda dei servizi dello studio e lo
// scadenzario.

export type StatoAziendaModulo = {
  modulo: ModuloAzienda;
  stato: StatoModulo;
  /** Esercizio più recente per i moduli annuali, null per gli altri. */
  anno: number | null;
  /** Esercizio più recente pubblicato, se esiste. */
  annoPubblicato: number | null;
};

export type AziendaConStati = {
  id: string;
  nome: string;
  isDemo: boolean;
  moduli: StatoAziendaModulo[];
};

export type ContoServizio = {
  modulo: ModuloAzienda;
  nome: string;
  avviati: number;
  pubblicati: number;
  totale: number;
};

export type StatiPortafoglio = {
  aziende: AziendaConStati[];
  /** Quante aziende hanno ciascun servizio avviato e quante pubblicato. */
  servizi: ContoServizio[];
};

export async function getStatiPortafoglio(userId: string, orgId: string): Promise<StatiPortafoglio> {
  // Ogni select porta il proprio filtro sull'organizzazione oltre alle policy
  // RLS: in sviluppo la connessione è privilegiata e le policy non scattano.
  return withTenant({ userId, orgId }, async (tx) => {
    const [aziende, ghg, bil, ene, sup, soa, pc, mog, wb, docs] = await Promise.all([
      tx
        .select({ id: company.id, nome: company.nome, isDemo: company.isDemo })
        .from(company)
        .where(and(eq(company.organizationId, orgId), eq(company.stato, "active")))
        .orderBy(desc(company.createdAt)),
      tx
        .select({ companyId: ghgInventory.companyId, anno: max(ghgInventory.anno) })
        .from(ghgInventory)
        .where(eq(ghgInventory.organizationId, orgId))
        .groupBy(ghgInventory.companyId),
      tx
        .select({ companyId: reportProject.companyId, anno: max(reportProject.anno) })
        .from(reportProject)
        .where(eq(reportProject.organizationId, orgId))
        .groupBy(reportProject.companyId),
      tx
        .select({ companyId: energyBalance.companyId, anno: max(energyBalance.anno) })
        .from(energyBalance)
        .where(eq(energyBalance.organizationId, orgId))
        .groupBy(energyBalance.companyId),
      tx
        .select({ companyId: supplierAssessment.companyId })
        .from(supplierAssessment)
        .where(eq(supplierAssessment.organizationId, orgId)),
      tx
        .select({ companyId: soaDeclaration.companyId })
        .from(soaDeclaration)
        .where(eq(soaDeclaration.organizationId, orgId)),
      tx
        .select({ companyId: briberySystem.companyId })
        .from(briberySystem)
        .where(eq(briberySystem.organizationId, orgId)),
      tx
        .select({ companyId: mogModel.companyId })
        .from(mogModel)
        .where(eq(mogModel.organizationId, orgId)),
      tx
        .select({ companyId: wbSystem.companyId })
        .from(wbSystem)
        .where(eq(wbSystem.organizationId, orgId)),
      tx
        .select({
          companyId: documentSnapshot.companyId,
          tipo: documentSnapshot.tipo,
          anno: max(documentSnapshot.anno),
        })
        .from(documentSnapshot)
        .where(eq(documentSnapshot.organizationId, orgId))
        .groupBy(documentSnapshot.companyId, documentSnapshot.tipo),
    ]);

    // I due moduli non annuali non hanno un anno: la radice esiste e basta.
    type Radice = { anno: number | null };
    const radici: Record<ModuloAzienda, Map<string, Radice>> = {
      ghg: new Map(ghg.map((r) => [r.companyId, { anno: r.anno }])),
      bilancio: new Map(bil.map((r) => [r.companyId, { anno: r.anno }])),
      energetico: new Map(ene.map((r) => [r.companyId, { anno: r.anno }])),
      fornitore: new Map(sup.map((r) => [r.companyId, { anno: null }])),
      soa: new Map(soa.map((r) => [r.companyId, { anno: null }])),
      anticorruzione: new Map(pc.map((r) => [r.companyId, { anno: null }])),
      mog231: new Map(mog.map((r) => [r.companyId, { anno: null }])),
      segnalazioni: new Map(wb.map((r) => [r.companyId, { anno: null }])),
    };
    const pubblicati = new Map(docs.map((d) => [`${d.companyId}|${d.tipo}`, d.anno ?? 0]));

    const conStati: AziendaConStati[] = aziende.map((a) => ({
      id: a.id,
      nome: a.nome,
      isDemo: a.isDemo,
      moduli: MODULI_AZIENDA.map((m) => {
        const radice = radici[m.href].get(a.id);
        const annoPubblicato = pubblicati.get(`${a.id}|${m.documenti[0]}`) ?? null;
        const anno = m.perEsercizio ? (radice?.anno ?? null) : null;
        return {
          modulo: m.href,
          // «Pubblicato» vuol dire che ESISTE un documento consegnato, non che
          // sia dell'esercizio in corso: quello è un ritardo, e lo dice lo
          // scadenzario. Qui la casella accesa risponde a «questo servizio è
          // stato erogato almeno una volta».
          stato: annoPubblicato !== null ? "pubblicato" : radice ? "in-corso" : "non-avviato",
          anno,
          annoPubblicato,
        };
      }),
    }));

    // Le aziende dimostrative non contano nei servizi dello studio: sono per
    // provare il prodotto, non lavoro consegnato a un cliente.
    const reali = conStati.filter((a) => !a.isDemo);
    const servizi: ContoServizio[] = MODULI_AZIENDA.map((m) => {
      const stati = reali.map((a) => a.moduli.find((x) => x.modulo === m.href)!.stato);
      return {
        modulo: m.href,
        nome: m.nome,
        avviati: stati.filter((s) => s !== "non-avviato").length,
        pubblicati: stati.filter((s) => s === "pubblicato").length,
        totale: reali.length,
      };
    });

    return { aziende: conStati, servizi };
  });
}
