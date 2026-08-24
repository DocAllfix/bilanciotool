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

export const ETICHETTE_AUDIT: Record<string, string> = {
  // I sei moduli di conformità: il corpus documentale e i suoi registri.
  "corpus.documento.stato": "Documento del sistema aggiornato",
  "anticorruzione.sistema.create": "Sistema anticorruzione avviato",
  "anticorruzione.profilo.set": "Profilo del sistema anticorruzione aggiornato",
  "anticorruzione.socio.create": "Socio in affari censito",
  "anticorruzione.socio.set": "Socio in affari aggiornato",
  "anticorruzione.socio.delete": "Socio in affari rimosso",
  "anticorruzione.requisito.set": "Requisito ISO 37001 valutato",
  "mog231.modello.create": "Modello 231 avviato",
  "mog231.profilo.set": "Profilo del Modello 231 aggiornato",
  "mog231.processo.create": "Processo sensibile individuato",
  "mog231.processo.set": "Processo sensibile aggiornato",
  "mog231.processo.delete": "Processo sensibile rimosso",
  "mog231.scenario.create": "Reato ricondotto a un processo",
  "mog231.scenario.set": "Scenario di rischio valutato",
  "mog231.scenario.delete": "Scenario di rischio rimosso",
  "mog231.reato.set": "Applicabilità di un reato dichiarata",
  "mog231.requisito.set": "Presidio del Modello 231 valutato",
  // Gestione delle segnalazioni. ⚠️ Le etichette NON nominano mai il contenuto di un
  // fascicolo: questa cronologia si vede nel quadro dello studio, il fascicolo no.
  // «Fascicolo di segnalazione aperto» dice che è successo qualcosa, non che cosa.
  "segnalazioni.assetto.create": "Gestione delle segnalazioni avviata",
  "segnalazioni.profilo.set": "Assetto delle segnalazioni aggiornato",
  "segnalazioni.canale.create": "Modalità del canale istituita",
  "segnalazioni.canale.set": "Modalità del canale aggiornata",
  "segnalazioni.canale.delete": "Modalità del canale rimossa",
  "segnalazioni.fascicolo.create": "Fascicolo di segnalazione aperto",
  "segnalazioni.fascicolo.set": "Fascicolo di segnalazione aggiornato",
  "segnalazioni.fascicolo.read": "Accesso a un fascicolo di segnalazione",
  "segnalazioni.fascicolo.delete": "Fascicolo di segnalazione eliminato",
  "segnalazioni.requisito.set": "Requisito D.Lgs. 24/2023 valutato",
  // Sistema di gestione integrato QAS.
  "sgiqas.sistema.create": "Sistema integrato QAS avviato",
  "sgiqas.profilo.set": "Profilo del sistema integrato aggiornato",
  "sgiqas.norme.set": "Perimetro delle norme aggiornato",
  "sgiqas.requisito.set": "Requisito del sistema integrato valutato",
  "sgiqas.indicatore.create": "Indicatore di prestazione creato",
  "sgiqas.indicatore.set": "Indicatore di prestazione aggiornato",
  "sgiqas.indicatore.delete": "Indicatore di prestazione rimosso",
  "sgiqas.indicatori.base": "Indicatori di partenza caricati",
  "sgiqas.rilevazione.set": "Rilevazione registrata",
  "sgiqas.rilevazione.delete": "Rilevazione eliminata",
  // SA8000/2026.
  "sa8000.sistema.create": "Sistema SA8000 avviato",
  "sa8000.profilo.set": "Anagrafica SA8000 aggiornata",
  "sa8000.criterio.set": "Criterio SA8000 valutato",
  "corpus.blocco.personalizza": "Testo del documento personalizzato",
  "corpus.blocco.ripristina": "Testo del documento ripristinato",
  "corpus.registro.aggiungi": "Registrazione inserita",
  "corpus.registro.aggiorna": "Registrazione modificata",
  "corpus.registro.elimina": "Registrazione eliminata",
  "billing.checkout.apri": "Pagamento avviato",
  "billing.abbonamento.aggiorna": "Abbonamento aggiornato",
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
  "supplier.valutazione.create": "Nuova autovalutazione fornitore",
  "supplier.profilo.update": "Anagrafica del fornitore aggiornata",
  "supplier.soglia.set": "Soglia richiesta dal committente",
  "supplier.risposta.set": "Questionario fornitore aggiornato",
  "soa.dichiarazione.create": "Nuova Dichiarazione di Applicabilità",
  "soa.profilo.update": "Contesto del sistema di gestione aggiornato",
  "soa.ruoli.set": "Ruoli privacy e cloud dichiarati",
  "soa.modulo.set": "Modulo esteso attivato o disattivato",
  "soa.controllo.set": "Decisione su un controllo aggiornata",
  // Le azioni sui documenti si compongono a runtime (`documento.${tipo}.publish`
  // e `.pdf`), quindi aggiungendo un tipo di documento NON compare nessun errore:
  // l'etichetta manca e in interfaccia si legge il nome macchina. E successo con
  // i tre moduli nuovi. Il test `etichette-audit` confronta questo elenco con i
  // tipi realmente pubblicabili e fallisce se restano indietro.
  "documento.ghg.publish": "Rapporto GHG pubblicato",
  "documento.ghg.pdf": "Rapporto GHG scaricato in PDF",
  "documento.bilancio.publish": "Bilancio pubblicato",
  "documento.bilancio.pdf": "Bilancio scaricato in PDF",
  "documento.energetico.publish": "Diagnosi energetica pubblicata",
  "documento.energetico.pdf": "Diagnosi energetica scaricata in PDF",
  "documento.attestato.publish": "Attestato del fornitore pubblicato",
  "documento.attestato.pdf": "Attestato scaricato in PDF",
  "documento.soa.publish": "Dichiarazione di Applicabilità pubblicata",
  "documento.relazione_pc.publish": "Relazione anticorruzione pubblicata",
  "documento.matrice_pc.publish": "Matrice ISO 37001 pubblicata",
  "documento.matrice_231.publish": "Matrice reati-processi pubblicata",
  "documento.relazione_odv.publish": "Relazione dell'OdV pubblicata",
  "documento.relazione_wb.publish": "Relazione sulle segnalazioni pubblicata",
  "documento.riesame_qas.publish": "Riesame di direzione pubblicato",
  "documento.manuale_sa8000.publish": "Manuale SA8000 pubblicato",
  "condivisione.create": "Collegamento per il cliente generato",
  "condivisione.revoke": "Collegamento per il cliente disattivato",
  "documento.soa.pdf": "Dichiarazione scaricata in PDF",
  "documento.relazione_pc.pdf": "Relazione anticorruzione scaricata in PDF",
  "documento.matrice_pc.pdf": "Matrice ISO 37001 scaricata in PDF",
  "documento.matrice_231.pdf": "Matrice reati-processi scaricata in PDF",
  "documento.relazione_odv.pdf": "Relazione dell'OdV scaricata in PDF",
  "documento.relazione_wb.pdf": "Relazione sulle segnalazioni scaricata in PDF",
  "documento.riesame_qas.pdf": "Riesame di direzione scaricato in PDF",
  "documento.manuale_sa8000.pdf": "Manuale SA8000 scaricato in PDF",
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
      // Solo le colonne che il motore usa: `select *` qui tirava su ogni riga di
      // attività con tutti i campi (descrizione, note, fonte del fattore…) per
      // calcolare un totale che ne usa nove.
      invIds.length
        ? tx
            .select({
              id: ghgActivityRow.id,
              inventoryId: ghgActivityRow.inventoryId,
              categoryKey: ghgActivityRow.categoryKey,
              sourceTypeKey: ghgActivityRow.sourceTypeKey,
              quantita: ghgActivityRow.quantita,
              fe: ghgActivityRow.fe,
              feMarket: ghgActivityRow.feMarket,
              quotaGo: ghgActivityRow.quotaGo,
              feBiogenic: ghgActivityRow.feBiogenic,
              dq: ghgActivityRow.dq,
              incertezza: ghgActivityRow.incertezza,
            })
            .from(ghgActivityRow)
            .where(inArray(ghgActivityRow.inventoryId, invIds))
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
