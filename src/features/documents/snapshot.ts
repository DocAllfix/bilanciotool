import { db } from "@/lib/db";
import { withTenant } from "@/lib/db/tenant";
import {
  checklistRequirement, company, documentSnapshot, ghgCategory, ghgSourceType, ghgTarget,
  kpiDefinition, kpiSection, materialityTopic, narrativeTemplate, reportProject,
} from "@/lib/db/schema";
import { logAudit } from "@/lib/audit";
import { requireEntitlement } from "@/features/entitlement";
import { getResults } from "@/features/ghg/results";
import { getWizardData } from "@/features/ghg/queries";
import { getKpiWithDerived } from "@/features/report/kpi";
import { getMateriality } from "@/features/report/materiality";
import { listTopicManagement } from "@/features/report/policies";
import { listChapters } from "@/features/report/chapters";
import { getEmissionsBridge } from "@/features/report/ghg-bridge";
import { getWizardData as getEnergyWizardData } from "@/features/energy/queries";
import { listChapters as listEnergyChapters } from "@/features/energy/narrative";
import { getSupplierData } from "@/features/supplier/queries";
import { SENZA_ESERCIZIO } from "./tipi";
import { toFixedStr, type Decimal } from "@/lib/calc/shared/decimal";
import type { TipoDocumento } from "./tipi";
import { signedUrl } from "@/lib/storage";
import { and, asc, desc, eq } from "drizzle-orm";
import { randomUUID } from "node:crypto";

// PUBBLICAZIONE: l'unico punto del sistema in cui i valori derivati vengono
// SCRITTI — dentro lo snapshot JSONB immutabile. Ripubblicare = nuova versione.
// Il documento renderizza SOLO dallo snapshot: le modifiche successive ai dati
// vivi non lo toccano (garanzia d'audit).

// Per i documenti non annuali `anno` è SENZA_ESERCIZIO (0): il filtro degenera
// in (companyId, tipo) e le revisioni formano una serie unica e monotona.
async function prossimaVersione(companyId: string, tipo: TipoDocumento, anno: number): Promise<number> {
  const rows = await db
    .select({ versione: documentSnapshot.versione })
    .from(documentSnapshot)
    .where(and(eq(documentSnapshot.companyId, companyId), eq(documentSnapshot.tipo, tipo), eq(documentSnapshot.anno, anno)))
    .orderBy(desc(documentSnapshot.versione))
    .limit(1);
  return (rows[0]?.versione ?? 0) + 1;
}

const s = (d: Decimal, dp = 6) => toFixedStr(d, dp);

// ------------------------------------------------------------------ GHG
export async function publishGhgSnapshot(userId: string, orgId: string, companyId: string, anno: number): Promise<string> {
  await requireEntitlement(userId, orgId, "generate_pdf");
  const wiz = await getWizardData(userId, orgId, companyId, anno);
  if (!wiz || !wiz.inventario || !wiz.catalogo || !wiz.stato) {
    throw new Error("Nessun inventario da pubblicare per questo periodo");
  }
  const risultati = await getResults(userId, orgId, wiz.inventario.id);
  const az = await withTenant({ userId, orgId }, async (tx) => {
    const [a] = await tx.select().from(company).where(eq(company.id, companyId));
    return a!;
  });

  const dati = {
    generatoIl: new Date().toISOString(),
    azienda: { nome: az.nome, settore: az.settore, sede: az.sede },
    inventario: {
      anno: wiz.inventario.anno,
      annoBase: wiz.inventario.annoBase,
      gwpSetKey: wiz.inventario.gwpSetKey,
      boundaries: wiz.inventario.boundaries,
      ricavi: wiz.inventario.ricavi,
      fte: wiz.inventario.fte,
      produzione: wiz.inventario.produzione,
      umProduzione: wiz.inventario.umProduzione,
    },
    catalogo: {
      categorie: wiz.catalogo.categorie,
      sorgenti: wiz.catalogo.sorgenti,
      requisiti: wiz.catalogo.requisiti,
    },
    sorgenti: wiz.stato.sorgenti,
    checklist: wiz.stato.checklist,
    righe: wiz.stato.righe,
    obiettivi: wiz.stato.obiettivi,
    fattoriUsati: wiz.catalogo.fattori.filter((f) => wiz.stato.righe.some((r) => r.factorKey === f.key)),
    risultati, // derivati congelati QUI
  };

  return salvaSnapshot(userId, orgId, companyId, "ghg", anno, dati);
}

// ------------------------------------------------------------------ Bilancio
export async function publishBilancioSnapshot(userId: string, orgId: string, companyId: string, anno: number): Promise<string> {
  await requireEntitlement(userId, orgId, "generate_pdf");
  const proj = await withTenant({ userId, orgId }, async (tx) => {
    const rows = await tx.select().from(reportProject).where(eq(reportProject.companyId, companyId));
    return rows.find((r) => r.anno === anno) ?? null;
  });
  if (!proj) throw new Error("Nessun bilancio da pubblicare per questo esercizio");

  const [az, kpi, materialita, gestione, capitoli, bridge, temi, sezioni, defs, templates] = await Promise.all([
    withTenant({ userId, orgId }, async (tx) => (await tx.select().from(company).where(eq(company.id, companyId)))[0]!),
    getKpiWithDerived(userId, orgId, companyId, anno),
    getMateriality(userId, orgId, proj.id),
    listTopicManagement(userId, orgId, proj.id),
    listChapters(userId, orgId, proj.id),
    getEmissionsBridge(userId, orgId, companyId, anno),
    db.select().from(materialityTopic).where(eq(materialityTopic.setId, proj.contentSetId)).orderBy(asc(materialityTopic.ordine)),
    db.select().from(kpiSection).where(eq(kpiSection.setId, proj.contentSetId)).orderBy(asc(kpiSection.ordine)),
    db.select().from(kpiDefinition).where(eq(kpiDefinition.setId, proj.contentSetId)).orderBy(asc(kpiDefinition.ordine)),
    db.select().from(narrativeTemplate).where(eq(narrativeTemplate.setId, proj.contentSetId)).orderBy(asc(narrativeTemplate.ordine)),
  ]);

  // Immagini: nello snapshot vanno le CHIAVI storage (stabili); gli URL firmati
  // si generano alla visualizzazione.
  const dati = {
    generatoIl: new Date().toISOString(),
    azienda: {
      nome: az.nome,
      settore: az.settore,
      sede: az.sede,
      logoKey: az.logoStorageKey,
      coverKey: az.coverStorageKey,
    },
    progetto: {
      anno: proj.anno,
      standard: proj.standard,
      perimetro: proj.perimetro,
      profilo: proj.profilo,
      soglia: Number(proj.sogliaMaterialita),
    },
    catalogo: {
      temi: temi.map((t) => ({ key: t.key, pillar: t.pillar, nome: t.nome, riferimenti: t.riferimenti })),
      sezioni: sezioni.map((x) => ({ key: x.key, nome: x.nome, riferimenti: x.riferimenti, pillar: x.pillar })),
      kpi: defs.map((d) => ({ key: d.key, sectionKey: d.sectionKey, nome: d.nome, um: d.um })),
      capitoli: templates.map((t) => ({ key: t.key, nome: t.nome })),
    },
    materialita: {
      soglia: materialita.soglia,
      perTopic: materialita.esito.perTopic,
      materialKeys: materialita.esito.materialKeys,
    },
    kpi: {
      corrente: kpi.corrente,
      precedente: kpi.precedente,
      // Derivati congelati QUI (entrambi gli anni, per le variazioni del documento)
      derivati: Object.fromEntries(Object.entries(kpi.derivati).map(([k, v]) => [k, s(v as Decimal)])),
      derivatiPrecedente: Object.fromEntries(Object.entries(kpi.derivatiPrecedente).map(([k, v]) => [k, s(v as Decimal)])),
    },
    gestione,
    capitoli: capitoli.map((c) => ({
      templateKey: c.templateKey,
      contenuto: c.contenuto,
      media: c.media.map((m) => ({
        tipo: m.tipo,
        storageKey: m.storageKey,
        chartKey: m.chartKey,
        didascalia: m.didascalia,
        credito: m.credito,
        larghezza: m.larghezza,
        posizione: m.posizione,
      })),
    })),
    bridge,
  };

  return salvaSnapshot(userId, orgId, companyId, "bilancio", anno, dati);
}

// ------------------------------------------------------------------ Energetico
export async function publishEnergySnapshot(userId: string, orgId: string, companyId: string, anno: number): Promise<string> {
  await requireEntitlement(userId, orgId, "generate_pdf");
  const wiz = await getEnergyWizardData(userId, orgId, companyId, anno);
  if (!wiz || !wiz.bilancio || !wiz.catalogo || !wiz.stato || !wiz.risultati) {
    throw new Error("Nessun bilancio energetico da pubblicare per questo esercizio");
  }

  // Nello snapshot vanno SOLO i fattori effettivamente usati, già risolti con le
  // eventuali personalizzazioni: il documento deve poter dichiarare i valori con
  // cui i suoi numeri sono stati ottenuti, anche se la libreria cambia dopo.
  const capitoli = await listEnergyChapters(userId, orgId, wiz.bilancio.id);
  const usati = new Set([
    ...wiz.stato.inputs.map((i) => i.vettoreKey),
    ...wiz.stato.celle.map((c) => c.vettoreKey),
    ...wiz.stato.misure.map((m) => m.vettoreKey),
  ]);

  const dati = {
    generatoIl: new Date().toISOString(),
    azienda: { nome: wiz.azienda.nome, settore: wiz.azienda.settore, sede: wiz.azienda.sede },
    bilancio: {
      anno: wiz.bilancio.anno,
      annoBase: wiz.bilancio.annoBase,
      profilo: wiz.bilancio.profilo,
    },
    catalogo: {
      vettori: wiz.catalogo.vettori.filter((v) => usati.has(v.key)),
      aree: wiz.catalogo.aree,
      usi: wiz.catalogo.usi.map((u) => ({
        key: u.key, nome: u.nome, areaKey: u.areaKey, attivo: u.attivo, metodo: u.metodo, nota: u.nota,
      })),
      driver: wiz.catalogo.driver,
      indicatori: wiz.catalogo.indicatori,
      capitoli: wiz.catalogo.capitoli,
      metodi: wiz.catalogo.metodi,
    },
    stato: {
      inputs: wiz.stato.inputs,
      celle: wiz.stato.celle,
      driver: wiz.stato.driver,
      misure: wiz.stato.misure,
    },
    // Le fotografie: nello snapshot vanno le CHIAVI di archiviazione, stabili nel
    // tempo, non gli URL firmati che scadono. Si rileggono dal capitolo, non
    // dalla vista del percorso, che porta già gli indirizzi temporanei.
    capitoli: capitoli.map((c) => ({
      templateKey: c.templateKey,
      contenuto: c.contenuto,
      media: c.media.map((m) => ({
        tipo: m.tipo,
        storageKey: m.storageKey,
        chartKey: m.chartKey,
        didascalia: m.didascalia,
        credito: m.credito,
        larghezza: m.larghezza,
        posizione: m.posizione,
      })),
    })),
    risultati: wiz.risultati, // derivati congelati QUI
  };

  return salvaSnapshot(userId, orgId, companyId, "energetico", anno, dati);
}

// ------------------------------------------------------------------ Attestato
export async function publishSupplierSnapshot(userId: string, orgId: string, companyId: string): Promise<string> {
  await requireEntitlement(userId, orgId, "generate_pdf");
  const d = await getSupplierData(userId, orgId, companyId);
  if (!d || !d.valutazione || !d.catalogo || !d.stato || !d.esito) {
    throw new Error("Nessuna autovalutazione da pubblicare per questa azienda");
  }

  const dati = {
    generatoIl: new Date().toISOString(),
    azienda: d.azienda,
    valutazione: {
      sogliaRichiesta: d.valutazione.sogliaRichiesta,
      profilo: d.valutazione.profilo,
    },
    catalogo: d.catalogo,
    // Le sole domande con una risposta: l'attestato dichiara ciò che è stato
    // valutato, non l'intera banca domande.
    risposte: d.stato.risposte.filter((r) => r.risposta !== null),
    piano: d.stato.piano,
    esito: d.esito, // derivati congelati QUI
  };

  return salvaSnapshot(userId, orgId, companyId, "attestato", SENZA_ESERCIZIO, dati);
}

async function salvaSnapshot(
  userId: string,
  orgId: string,
  companyId: string,
  tipo: TipoDocumento,
  anno: number,
  dati: unknown,
): Promise<string> {
  const versione = await prossimaVersione(companyId, tipo, anno);
  const id = randomUUID();
  await withTenant({ userId, orgId }, async (tx) => {
    await tx.insert(documentSnapshot).values({
      id,
      organizationId: orgId,
      companyId,
      tipo,
      anno,
      versione,
      dati,
      publishedBy: userId,
    });
    await logAudit(tx, {
      organizationId: orgId,
      userId,
      azione: `documento.${tipo}.publish`,
      entita: "document_snapshot",
      entitaId: id,
      dettagli: { anno, versione },
    });
  });
  return id;
}

export async function getSnapshot(userId: string, orgId: string, snapshotId: string) {
  return withTenant({ userId, orgId }, async (tx) => {
    const [row] = await tx.select().from(documentSnapshot).where(eq(documentSnapshot.id, snapshotId));
    return row ?? null;
  });
}

export async function listSnapshots(userId: string, orgId: string, companyId: string) {
  return withTenant({ userId, orgId }, (tx) =>
    tx
      .select({
        id: documentSnapshot.id,
        tipo: documentSnapshot.tipo,
        anno: documentSnapshot.anno,
        versione: documentSnapshot.versione,
        pdfStorageKey: documentSnapshot.pdfStorageKey,
        publishedAt: documentSnapshot.publishedAt,
      })
      .from(documentSnapshot)
      .where(eq(documentSnapshot.companyId, companyId))
      .orderBy(desc(documentSnapshot.publishedAt)),
  );
}

// URL firmati per le immagini referenziate dallo snapshot (alla visualizzazione).
export async function resolveSnapshotImages(orgId: string, dati: { azienda?: { logoKey?: string | null; coverKey?: string | null }; capitoli?: { media: { storageKey: string | null }[] }[] }) {
  const urls = new Map<string, string>();
  const chiavi = new Set<string>();
  if (dati.azienda?.logoKey) chiavi.add(dati.azienda.logoKey);
  if (dati.azienda?.coverKey) chiavi.add(dati.azienda.coverKey);
  for (const c of dati.capitoli ?? []) for (const m of c.media) if (m.storageKey) chiavi.add(m.storageKey);
  await Promise.all(
    [...chiavi].map(async (k) => {
      urls.set(k, await signedUrl(orgId, k, 1800));
    }),
  );
  return urls;
}
