import { withTenant } from "@/lib/db/tenant";
import { auditLog, company, documentSnapshot, ghgActivityRow, ghgInventory, reportProject } from "@/lib/db/schema";
import { computeInventory } from "@/lib/calc/ghg/totals";
import { dec, toFixedStr } from "@/lib/calc/shared/decimal";
import type { TipoDocumento } from "@/features/documents/tipi";
import { desc, eq, inArray } from "drizzle-orm";

// Statistiche del portafoglio: per ogni azienda l'ultimo inventario e il totale
// location-based CALCOLATO al volo (i derivati non sono mai persistiti).

export type CompanyCardStats = {
  id: string;
  nome: string;
  settore: string | null;
  sede: string | null;
  stato: "active" | "archived";
  isDemo: boolean;
  ultimoAnno: number | null;
  inventoryId: string | null;
  voci: number;
  totL: string | null;
  documenti: number;
  haBilancio: boolean;
};

// Quadro dello studio: documenti pubblicati e attività recente. Etichette
// leggibili derivate dal nome macchina delle azioni di audit.
export type DocumentoRecente = {
  id: string;
  companyNome: string;
  tipo: TipoDocumento;
  anno: number;
  versione: number;
  publishedAt: Date;
};

export type VoceAttivita = { etichetta: string; companyNome: string | null; quando: Date };

const ETICHETTE_AUDIT: Record<string, string> = {
  "company.create": "Nuova azienda in portafoglio",
  "company.archive": "Azienda archiviata",
  "company.restore": "Azienda ripristinata",
  "ghg.inventory.create": "Nuovo inventario GHG",
  "ghg.boundaries.update": "Confini dell'inventario aggiornati",
  "ghg.source.set": "Registro sorgenti aggiornato",
  "ghg.row.create": "Voce di attività inserita",
  "ghg.row.update": "Voce di attività modificata",
  "ghg.row.duplicate": "Voce di attività duplicata",
  "ghg.row.delete": "Voce di attività eliminata",
  "ghg.factor.upsert": "Fattore di emissione personalizzato",
  "ghg.factor.delete": "Fattore riportato alla piattaforma",
  "ghg.target.create": "Obiettivo di riduzione definito",
  "ghg.target.delete": "Obiettivo di riduzione rimosso",
  "ghg.baseyear.set": "Anno base impostato",
  "ghg.checklist.set": "Checklist di verifica aggiornata",
  "ghg.meta.update": "Impostazioni inventario aggiornate",
  "ghg.import": "Inventario importato dal prototipo",
  "report.project.create": "Nuovo bilancio di sostenibilità",
  "report.profilo.update": "Profilo dell'organizzazione aggiornato",
  "report.materialita.set": "Valutazione di materialità",
  "report.soglia.set": "Soglia di materialità modificata",
  "report.kpi.set": "Indicatore KPI aggiornato",
  "report.gestione.set": "Politica su tema materiale",
  "report.capitolo.save": "Capitolo del racconto salvato",
  "report.media.add": "Elemento visivo aggiunto",
  "report.media.remove": "Elemento visivo rimosso",
  "report.impostazioni.update": "Impostazioni bilancio aggiornate",
  "report.import": "Bilancio importato dal prototipo",
  "energy.balance.create": "Nuovo bilancio energetico",
  "energy.profilo.update": "Sito e perimetro aggiornati",
  "energy.baseyear.set": "Anno di riferimento impostato",
  "energy.vettore.set": "Consumo di un vettore aggiornato",
  "energy.fattore.upsert": "Fattore di conversione personalizzato",
  "energy.fattore.delete": "Fattore riportato alla piattaforma",
  "energy.uso.set": "Uso finale aggiornato",
  "energy.driver.set": "Variabile di riferimento aggiornata",
  "energy.intervento.create": "Intervento di miglioramento proposto",
  "energy.intervento.update": "Intervento di miglioramento modificato",
  "energy.intervento.delete": "Intervento di miglioramento rimosso",
  "energy.capitolo.save": "Capitolo della diagnosi salvato",
  "energy.media.add": "Elemento visivo aggiunto alla diagnosi",
  "energy.media.remove": "Elemento visivo rimosso dalla diagnosi",
  "documento.ghg.publish": "Rapporto GHG pubblicato",
  "documento.bilancio.publish": "Bilancio pubblicato",
  "demo.seed": "Organizzazione dimostrativa creata",
  "org.create": "Studio creato",
};

export type PortfolioOverview = {
  documentiTotali: number;
  recenti: DocumentoRecente[];
  attivita: VoceAttivita[];
};

export async function listCompaniesWithStats(userId: string, orgId: string): Promise<CompanyCardStats[]> {
  return withTenant({ userId, orgId }, async (tx) => {
    const aziende = await tx
      .select()
      .from(company)
      .where(eq(company.organizationId, orgId))
      .orderBy(desc(company.createdAt));
    if (!aziende.length) return [];

    const inventari = await tx
      .select({ id: ghgInventory.id, companyId: ghgInventory.companyId, anno: ghgInventory.anno })
      .from(ghgInventory)
      .where(inArray(ghgInventory.companyId, aziende.map((a) => a.id)))
      .orderBy(desc(ghgInventory.anno));

    const ultimoPerAzienda = new Map<string, { id: string; anno: number }>();
    for (const inv of inventari) {
      if (!ultimoPerAzienda.has(inv.companyId)) ultimoPerAzienda.set(inv.companyId, { id: inv.id, anno: inv.anno });
    }

    const invIds = [...ultimoPerAzienda.values()].map((i) => i.id);
    const [righe, snapshots, bilanci] = await Promise.all([
      invIds.length
        ? tx.select().from(ghgActivityRow).where(inArray(ghgActivityRow.inventoryId, invIds))
        : Promise.resolve([]),
      tx
        .select({ companyId: documentSnapshot.companyId })
        .from(documentSnapshot)
        .where(eq(documentSnapshot.organizationId, orgId)),
      tx
        .select({ companyId: reportProject.companyId })
        .from(reportProject)
        .where(eq(reportProject.organizationId, orgId)),
    ]);
    const docPerAzienda = new Map<string, number>();
    for (const s of snapshots) docPerAzienda.set(s.companyId, (docPerAzienda.get(s.companyId) ?? 0) + 1);
    const conBilancio = new Set(bilanci.map((b) => b.companyId));
    const perInventario = new Map<string, typeof righe>();
    for (const r of righe) {
      const arr = perInventario.get(r.inventoryId) ?? [];
      arr.push(r);
      perInventario.set(r.inventoryId, arr);
    }

    return aziende.map((a) => {
      const ultimo = ultimoPerAzienda.get(a.id) ?? null;
      const rows = ultimo ? (perInventario.get(ultimo.id) ?? []) : [];
      const c = rows.length
        ? computeInventory(
            rows.map((r) => ({
              id: r.id,
              categoryKey: r.categoryKey,
              sourceTypeKey: r.sourceTypeKey,
              quantita: r.quantita,
              fe: r.fe,
              feMarket: r.feMarket,
              quotaGo: r.quotaGo,
              feBiogenic: r.feBiogenic,
              dq: r.dq,
              incertezza: r.incertezza,
            })),
          )
        : null;
      return {
        id: a.id,
        nome: a.nome,
        settore: a.settore,
        sede: a.sede,
        stato: a.stato,
        isDemo: a.isDemo,
        ultimoAnno: ultimo?.anno ?? null,
        inventoryId: ultimo?.id ?? null,
        voci: rows.length,
        totL: c ? toFixedStr(c.totL, 3) : null,
        documenti: docPerAzienda.get(a.id) ?? 0,
        haBilancio: conBilancio.has(a.id),
      };
    });
  });
}

// Somma delle tCO₂e (location-based) sull'ultimo esercizio di ogni azienda attiva:
// derivata al volo dalle card, mai persistita.
export function sommaPortafoglio(stats: CompanyCardStats[]): string | null {
  const attive = stats.filter((s) => s.stato === "active" && s.totL);
  if (!attive.length) return null;
  let tot = dec("0");
  for (const s of attive) tot = tot.plus(dec(s.totL!));
  return toFixedStr(tot, 1);
}

export async function getPortfolioOverview(userId: string, orgId: string): Promise<PortfolioOverview> {
  return withTenant({ userId, orgId }, async (tx) => {
    const [docs, audit] = await Promise.all([
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
        .where(eq(documentSnapshot.organizationId, orgId))
        .orderBy(desc(documentSnapshot.publishedAt)),
      tx
        .select({
          azione: auditLog.azione,
          dettagli: auditLog.dettagli,
          createdAt: auditLog.createdAt,
        })
        .from(auditLog)
        .where(eq(auditLog.organizationId, orgId))
        .orderBy(desc(auditLog.createdAt))
        .limit(60),
    ]);

    const companyIds = [...new Set(docs.map((d) => d.companyId))];
    const nomi = companyIds.length
      ? await tx
          .select({ id: company.id, nome: company.nome })
          .from(company)
          .where(inArray(company.id, companyIds))
      : [];
    const nomePerId = new Map(nomi.map((n) => [n.id, n.nome]));

    // L'attività si compatta: azioni uguali consecutive (autosave, editing fitto)
    // diventano una voce sola, per un flusso leggibile e non rumoroso.
    const attivita: VoceAttivita[] = [];
    for (const a of audit) {
      const etichetta = ETICHETTE_AUDIT[a.azione] ?? a.azione;
      const dettagli = (a.dettagli ?? {}) as Record<string, unknown>;
      const companyNome =
        typeof dettagli.companyNome === "string" ? dettagli.companyNome : null;
      const ultima = attivita[attivita.length - 1];
      if (ultima && ultima.etichetta === etichetta && ultima.companyNome === companyNome) continue;
      attivita.push({ etichetta, companyNome, quando: a.createdAt });
      if (attivita.length >= 8) break;
    }

    return {
      documentiTotali: docs.length,
      recenti: docs.slice(0, 5).map((d) => ({
        id: d.id,
        companyNome: nomePerId.get(d.companyId) ?? "—",
        tipo: d.tipo,
        anno: d.anno,
        versione: d.versione,
        publishedAt: d.publishedAt,
      })),
      attivita,
    };
  });
}
