import { db } from "@/lib/db";
import { withTenant } from "@/lib/db/tenant";
import {
  company, documentSnapshot,
  kpiDefinition, kpiSection, materialityTopic, narrativeTemplate, organization,
  orgEntitlement, reportProject, user,
} from "@/lib/db/schema";
import { marchioDaCongelare } from "./marchio";
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
import { getSoaData } from "@/features/soa/queries";
import { getAnticorruzione } from "@/features/anticorruzione/queries";
import { getMog231 } from "@/features/mog231/queries";
import { getSegnalazioni } from "@/features/segnalazioni/queries";
import { getSgiQas } from "@/features/sgiqas/queries";
import { getFiliera } from "@/features/filiera/queries";
import { getSa8000 } from "@/features/sa8000/queries";
import { statistiche, statoTermine, urgenza } from "@/lib/calc/segnalazioni/relazione";
import { avvisoEntro, riscontroEntro } from "@/lib/calc/segnalazioni/termini";
import { SENZA_ESERCIZIO, DOCUMENTI } from "./tipi";
import { toFixedStr, type Decimal } from "@/lib/calc/shared/decimal";
import type { TipoDocumento } from "./tipi";
import { signedUrl } from "@/lib/storage";
import { and, asc, desc, eq, sql } from "drizzle-orm";
import { randomUUID } from "node:crypto";

// PUBBLICAZIONE: l'unico punto del sistema in cui i valori derivati vengono
// SCRITTI — dentro lo snapshot JSONB immutabile. Ripubblicare = nuova versione.
// Il documento renderizza SOLO dallo snapshot: le modifiche successive ai dati
// vivi non lo toccano (garanzia d'audit).

// Per i documenti non annuali `anno` è SENZA_ESERCIZIO (0): il filtro degenera
// in (companyId, tipo) e le revisioni formano una serie unica e monotona.
async function prossimaVersione(
  orgId: string,
  companyId: string,
  tipo: TipoDocumento,
  anno: number,
): Promise<number> {
  // Dentro `withTenant`: `document_snapshot` ha una policy RLS, e con la connessione
  // ristretta una lettura senza contesto tornerebbe VUOTA. Non darebbe errore: darebbe
  // versione 1 a ogni pubblicazione, e la seconda violerebbe l'unicità. Un difetto che
  // si manifesta come «non riesco a ripubblicare», lontanissimo dalla sua causa.
  const rows = await withTenant({ orgId }, (tx) =>
    tx
      .select({ versione: documentSnapshot.versione })
      .from(documentSnapshot)
      .where(and(eq(documentSnapshot.companyId, companyId), eq(documentSnapshot.tipo, tipo), eq(documentSnapshot.anno, anno)))
      .orderBy(desc(documentSnapshot.versione))
      .limit(1),
  );
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

// ------------------------------------------------------------------ SoA
export async function publishSoaSnapshot(userId: string, orgId: string, companyId: string): Promise<string> {
  await requireEntitlement(userId, orgId, "generate_pdf");
  const d = await getSoaData(userId, orgId, companyId);
  if (!d || !d.dichiarazione || !d.catalogo || !d.stato || !d.esito) {
    throw new Error("Nessuna Dichiarazione da pubblicare per questa azienda");
  }

  const dati = {
    generatoIl: new Date().toISOString(),
    azienda: d.azienda,
    dichiarazione: {
      sogliaObiettivo: d.dichiarazione.sogliaObiettivo,
      ruoloPrivacy: d.dichiarazione.ruoloPrivacy,
      ruoloCloud: d.dichiarazione.ruoloCloud,
      profilo: d.dichiarazione.profilo,
    },
    catalogo: {
      quadri: d.catalogo.quadri,
      sezioni: d.catalogo.sezioni,
      // SOLO i controlli in ambito: la Dichiarazione elenca quello che copre,
      // non l'intero catalogo delle norme esistenti.
      controlli: d.catalogo.controlli.filter((c) => c.inAmbito),
      stati: d.catalogo.stati,
      motivazioni: d.catalogo.motivazioni,
      fasce: d.catalogo.fasce,
    },
    stato: {
      moduliAttivi: d.stato.moduliAttivi,
      decisioni: d.stato.decisioni,
      piano: d.stato.piano,
      rilievi: d.stato.rilievi,
    },
    esito: d.esito, // derivati congelati QUI
  };

  return salvaSnapshot(userId, orgId, companyId, "soa", SENZA_ESERCIZIO, dati);
}

/**
 * La Relazione annuale sulla prevenzione della corruzione.
 *
 * È il documento che la funzione anticorruzione porta all'organo di governo: dice
 * quanti soci in affari sono sopra la soglia, quanti obblighi sono aperti, a che punto
 * è la conformità ai 91 requisiti. Si congela QUI, insieme ai derivati: il livello di
 * rischio di un socio cambia il giorno in cui si aggiorna una dimensione, e una
 * relazione già consegnata non deve cambiare sotto i piedi di chi l'ha ricevuta.
 */
export async function publishRelazionePcSnapshot(
  userId: string,
  orgId: string,
  companyId: string,
): Promise<string> {
  await requireEntitlement(userId, orgId, "generate_pdf");
  const d = await getAnticorruzione(userId, orgId, companyId);
  if (!d?.sistema) throw new Error("Nessun sistema anticorruzione da pubblicare per questa azienda");
  const azienda = d.azienda;

  const dati = {
    generatoIl: new Date().toISOString(),
    azienda,
    sistema: d.sistema,
    // I soci con i loro derivati: livello, obblighi applicabili e aperti. Nel documento
    // NON si ricalcola niente — è la ragione per cui stanno qui e non si rende dai dati
    // vivi. I rapporti cessati restano, perché la relazione racconta anche cosa è
    // finito nel periodo; gli indicatori invece li escludono.
    soci: d.soci.map((s) => ({
      nome: s.nome,
      categoria: s.categoria,
      paese: s.paeseOperativita,
      stato: s.stato,
      livello: s.livello,
      sopraSoglia: s.sopraSoglia,
      livelloDD: s.livelloDD,
      frequenzaDD: s.frequenzaDD,
      dueDiligenceIl: s.dueDiligenceIl,
      ddScaduta: s.ddScaduta,
      obblighi: s.obblighi,
      aperti: s.aperti,
    })),
    capitoli: d.capitoli.map((c) => ({
      key: c.key,
      nome: c.nome,
      descrizione: c.descrizione,
      requisiti: c.requisiti,
      valutati: c.valutati,
      conformita: c.conformita,
    })),
    conformita: d.conformita,
    indicatori: d.indicatori,
  };

  return salvaSnapshot(userId, orgId, companyId, "relazione_pc", SENZA_ESERCIZIO, dati);
}

/**
 * La Matrice di conformità: i 91 requisiti con stato, evidenza e procedura.
 *
 * È il documento che un auditor sfoglia riga per riga. A differenza della Relazione
 * contiene il TESTO di ogni requisito: chi lo riceve deve poter leggere la domanda
 * accanto alla risposta, senza avere la norma sul tavolo.
 */
export async function publishMatricePcSnapshot(
  userId: string,
  orgId: string,
  companyId: string,
): Promise<string> {
  await requireEntitlement(userId, orgId, "generate_pdf");
  const d = await getAnticorruzione(userId, orgId, companyId);
  if (!d?.sistema) throw new Error("Nessun sistema anticorruzione da pubblicare per questa azienda");
  const azienda = d.azienda;
  const statoPerChiave = new Map(d.statiRequisiti.map((r) => [r.requirementKey, r]));

  const dati = {
    generatoIl: new Date().toISOString(),
    azienda,
    sistema: { ragione: d.sistema.ragione, scopo: d.sistema.scopo, revisione: d.sistema.revisione, dataAdozione: d.sistema.dataAdozione },
    capitoli: d.capitoli.map((c) => ({
      key: c.key,
      nome: c.nome,
      descrizione: c.descrizione,
      conformita: c.conformita,
      valutati: c.valutati,
      requisiti: d.catalogo.requisiti
        .filter((r) => r.chapterKey === c.key)
        .map((r) => {
          const s = statoPerChiave.get(r.key);
          return {
            key: r.key,
            riferimento: r.riferimento,
            procedura: r.procedura,
            testo: r.testo,
            stato: s?.stato ?? null,
            note: s?.note ?? null,
            evidenza: s?.evidenza ?? null,
          };
        }),
    })),
    conformita: d.conformita,
    requisitiTotali: d.indicatori.requisitiTotali,
    requisitiValutati: d.indicatori.requisitiValutati,
  };

  return salvaSnapshot(userId, orgId, companyId, "matrice_pc", SENZA_ESERCIZIO, dati);
}

/**
 * La Matrice reati-processi.
 *
 * È il documento che un giudice guarda per primo: dice quali reati presupposto
 * riguardano l'ente, in quali processi possono essere commessi, con quale rischio
 * inerente e quale rischio residuo dopo i presidi.
 *
 * Comprende anche i reati dichiarati applicabili e NON associati a nessun processo. Non
 * è un difetto dell'elenco: è la lacuna più importante che un Modello possa avere, e
 * tacerla renderebbe il documento un'autoassoluzione.
 */
export async function publishMatrice231Snapshot(
  userId: string,
  orgId: string,
  companyId: string,
): Promise<string> {
  await requireEntitlement(userId, orgId, "generate_pdf");
  const d = await getMog231(userId, orgId, companyId);
  if (!d?.modello) throw new Error("Nessun Modello 231 da pubblicare per questa azienda");

  const nomeReato = new Map(d.catalogo.reati.map((r) => [r.key, r]));
  const appPerReato = new Map(d.applicabilita.map((a) => [a.crimeKey, a]));
  const perProcesso = new Map<string, typeof d.scenari>();
  for (const s of d.scenari) {
    const e = perProcesso.get(s.processId) ?? [];
    e.push(s);
    perProcesso.set(s.processId, e);
  }

  const dati = {
    generatoIl: new Date().toISOString(),
    azienda: d.azienda,
    modello: d.modello,
    famiglie: d.catalogo.famiglie,
    // I derivati si congelano QUI: il rischio residuo di uno scenario cambia il giorno
    // in cui si aggiorna un presidio, e una matrice consegnata non deve cambiare sotto
    // gli occhi di chi l'ha ricevuta.
    processi: d.processi.map((p) => ({
      nome: p.nome,
      area: p.area,
      responsabile: p.responsabile,
      descrizione: p.descrizione,
      presidi: p.presidi,
      livello: p.livello,
      scenari: (perProcesso.get(p.id) ?? []).map((s) => ({
        reato: s.crimeKey,
        titolo: nomeReato.get(s.crimeKey)?.titolo ?? s.crimeKey,
        famiglia: nomeReato.get(s.crimeKey)?.familyKey ?? null,
        probabilita: s.probabilita,
        impatto: s.impatto,
        adeguatezza: s.adeguatezza,
        inerente: s.inerente,
        residuo: s.residuo,
        accettabile: s.accettabile,
        modalita: s.modalita,
        note: s.note,
      })),
    })),
    reati: d.catalogo.reati.map((r) => ({
      key: r.key,
      titolo: r.titolo,
      famiglia: r.familyKey,
      applicabile: appPerReato.get(r.key)?.applicabile ?? null,
      motivazione: appPerReato.get(r.key)?.motivazione ?? null,
      processi: d.scenari.filter((s) => s.crimeKey === r.key).length,
    })),
    indicatori: d.indicatori,
  };

  return salvaSnapshot(userId, orgId, companyId, "matrice_231", SENZA_ESERCIZIO, dati);
}

/**
 * La Relazione dell'Organismo di Vigilanza all'organo amministrativo.
 *
 * Periodica, con un destinatario esterno alla funzione che la redige: merita versioni
 * congelate. Riferisce sull'idoneità del Modello — i dieci pilastri — e sugli scenari
 * che restano non accettabili.
 */
export async function publishRelazioneOdvSnapshot(
  userId: string,
  orgId: string,
  companyId: string,
): Promise<string> {
  await requireEntitlement(userId, orgId, "generate_pdf");
  const d = await getMog231(userId, orgId, companyId);
  if (!d?.modello) throw new Error("Nessun Modello 231 da pubblicare per questa azienda");

  const nomeReato = new Map(d.catalogo.reati.map((r) => [r.key, r.titolo]));
  const nomeProcesso = new Map(d.processi.map((p) => [p.id, p.nome]));

  const dati = {
    generatoIl: new Date().toISOString(),
    azienda: d.azienda,
    modello: d.modello,
    pilastri: d.pilastri.map((p) => ({
      key: p.key,
      nome: p.nome,
      descrizione: p.descrizione,
      requisiti: p.requisiti,
      valutati: p.valutati,
      idoneita: p.idoneita,
    })),
    idoneita: d.idoneita,
    // Gli scenari NON accettabili, che è ciò su cui l'organo amministrativo deve
    // deliberare. Quelli non ancora valutati ci sono dentro, e sono i più importanti:
    // un rischio non misurato non è un rischio assente.
    daDeliberare: d.scenari
      .filter((s) => !s.accettabile)
      .map((s) => ({
        processo: nomeProcesso.get(s.processId) ?? "—",
        reato: s.crimeKey,
        titolo: nomeReato.get(s.crimeKey) ?? s.crimeKey,
        residuo: s.residuo,
        valutato: s.residuo !== null,
      })),
    indicatori: d.indicatori,
  };

  return salvaSnapshot(userId, orgId, companyId, "relazione_odv", SENZA_ESERCIZIO, dati);
}

/**
 * La relazione periodica sulle segnalazioni (D.Lgs. 24/2023).
 *
 * ⚠️ QUESTO DOCUMENTO PUÒ RAGGIUNGERE IL PORTALE CLIENTE, e la conseguenza è nella
 * scelta dei campi: niente oggetto, niente fatti segnalati, niente codice del
 * segnalante, niente qualità caso per caso. La qualità si aggrega — «quante da soggetti
 * esterni» — perché «la numero 4 è di un ex dipendente», in un'azienda di trenta
 * persone, è un nome.
 *
 * Il livello di rischio di ritorsione, per la stessa ragione, esce solo come conteggio.
 */
export async function publishRelazioneWbSnapshot(
  userId: string,
  orgId: string,
  companyId: string,
): Promise<string> {
  await requireEntitlement(userId, orgId, "generate_pdf");
  const d = await getSegnalazioni(userId, orgId, companyId);
  if (!d?.assetto) throw new Error("Nessuna gestione delle segnalazioni da pubblicare per questa azienda");

  // La data di pubblicazione è anche il momento rispetto al quale i termini sono
  // giudicati: congelata qui, il documento non cambia più verdetto col passare dei
  // giorni — che è esattamente ciò che un documento consegnato non deve fare.
  const oggi = new Date().toISOString().slice(0, 10);

  const dati = {
    generatoIl: new Date().toISOString(),
    riferitaAl: oggi,
    azienda: d.azienda,
    assetto: d.assetto,
    canale: {
      forme: d.canali.map((c) => ({
        forma: c.forma,
        attiva: c.attiva,
        descrizione: c.descrizione,
        fornitore: c.fornitore,
        riservatezza: c.riservatezza,
        attivatoIl: c.attivatoIl,
      })),
      stato: d.canale.stato,
      consultazione: d.canale.consultazione,
      condivisioneAmmessa: d.canale.condivisioneAmmessa,
    },
    statistiche: statistiche(d.fascicoli, oggi),
    capitoli: d.conformita.perCapitolo.map((c) => ({
      key: c.capitolo.key,
      nome: c.capitolo.nome,
      descrizione: c.capitolo.descrizione,
      requisiti: c.requisiti,
      valutati: c.valutati,
      conformita: c.indice,
    })),
    conformita: d.conformita.indice,
    requisitiValutati: d.conformita.valutati,
    requisitiTotali: d.conformita.totale,
    // Il prospetto per fascicolo, di soli dati di processo.
    prospetto: d.fascicoli
      .slice()
      .sort((a, b) => urgenza(a, oggi) - urgenza(b, oggi) || a.numero - b.numero)
      .map((f) => ({
        numero: f.numero,
        dataRicezione: f.dataRicezione,
        canale: f.canale,
        anonima: f.anonima,
        stato: f.stato,
        esito: f.esito,
        avvisoEntro: avvisoEntro(f.dataRicezione),
        avvisoReso: f.avvisoReso,
        statoAvviso: statoTermine(f, "avviso", oggi),
        riscontroEntro: riscontroEntro(f.dataRicezione, f.avvisoReso),
        riscontroReso: f.riscontroReso,
        statoRiscontro: statoTermine(f, "riscontro", oggi),
      })),
  };

  return salvaSnapshot(userId, orgId, companyId, "relazione_wb", SENZA_ESERCIZIO, dati);
}

/**
 * Il Riesame di direzione del sistema integrato (ISO 9001 · 14001 · 45001, §9.3).
 *
 * ⚠️ Congela il PERIMETRO delle norme insieme ai numeri. Un riesame consegnato dice
 * «conformità 72%»: se domani si aggiunge la 45001 al perimetro quel numero cambia, e il
 * documento non deve seguirlo — chi lo ha ricevuto ha in mano il giudizio su un altro
 * sistema.
 */
export async function publishRiesameQasSnapshot(
  userId: string,
  orgId: string,
  companyId: string,
): Promise<string> {
  await requireEntitlement(userId, orgId, "generate_pdf");
  const d = await getSgiQas(userId, orgId, companyId);
  if (!d?.sistema) throw new Error("Nessun sistema integrato da pubblicare per questa azienda");

  const dati = {
    generatoIl: new Date().toISOString(),
    azienda: d.azienda,
    sistema: d.sistema,
    perimetro: d.sistema.norme,
    norme: d.norme.filter((n) => d.sistema!.norme.includes(n.key)),
    capitoli: d.conformita.perCapitolo.map((c) => ({
      key: c.capitolo.key,
      nome: c.capitolo.nome,
      requisiti: c.requisiti,
      valutati: c.valutati,
      conformita: c.indice,
    })),
    perNorma: d.conformita.perNorma.map((n) => ({
      key: n.norma.key,
      nome: n.norma.nome,
      norma: n.norma.norma,
      requisiti: n.requisiti,
      valutati: n.valutati,
      conformita: n.indice,
    })),
    conformita: d.conformita.indice,
    requisitiValutati: d.conformita.valutati,
    requisitiTotali: d.conformita.totale,
    // Gli indicatori con l'ultima rilevazione e la serie: il riesame vive di tendenze,
    // e un valore senza storia non dice se si sta migliorando.
    indicatori: d.indicatori.map((i) => ({
      codice: i.codice,
      nome: i.nome,
      ambito: i.ambito,
      um: i.um,
      target: i.target,
      soglia: i.soglia,
      versoPositivo: i.versoPositivo,
      stato: i.stato,
      tendenza: i.tendenza,
      ultimo: i.ultimo ? { periodo: i.ultimo.periodo, valore: i.ultimo.valore } : null,
      rilevazioni: i.serie.length,
    })),
    // Le lacune, che un riesame deve riportare: tacerle lo renderebbe un'autoassoluzione.
    nonConformi: d.inPerimetro
      .filter((r) => d.stati.find((s) => s.requirementKey === r.key)?.stato === "Non conforme")
      .map((r) => ({ key: r.key, riferimento: r.riferimento, testo: r.testo, norme: r.norme })),
  };

  return salvaSnapshot(userId, orgId, companyId, "riesame_qas", SENZA_ESERCIZIO, dati);
}

/**
 * Il Manuale del sistema SA8000/2026.
 *
 * ⚠️ E' cio' che si esibisce in audit di certificazione, e riporta i criteri NON attuati
 * insieme a quelli attuati. Un manuale che elencasse solo cio' che funziona sarebbe
 * inutile all'auditor, che entra proprio per cercare il resto — e dannoso all'azienda,
 * perche' un rilievo trovato dall'ente vale piu' di uno dichiarato.
 */
export async function publishManualeSa8000Snapshot(
  userId: string,
  orgId: string,
  companyId: string,
): Promise<string> {
  await requireEntitlement(userId, orgId, "generate_pdf");
  const d = await getSa8000(userId, orgId, companyId);
  if (!d?.sistema) throw new Error("Nessun sistema SA8000 da pubblicare per questa azienda");

  const stato = new Map(d.stati.map((s) => [s.criterionKey, s]));

  const dati = {
    generatoIl: new Date().toISOString(),
    azienda: d.azienda,
    sistema: d.sistema,
    sezioni: d.perSezione.map((s) => ({
      key: s.sezione.key,
      nome: s.sezione.nome,
      criteri: s.criteri,
      valutati: s.valutati,
      percentuale: s.percentuale,
    })),
    gruppi: d.perGruppo.map((g) => ({
      key: g.gruppo.key,
      sezione: g.gruppo.sectionKey,
      nome: g.gruppo.nome,
      criteri: g.criteri,
      valutati: g.valutati,
      percentuale: g.percentuale,
    })),
    criteri: d.criteri.map((c) => ({
      key: c.key,
      sezione: c.sectionKey,
      gruppo: c.groupKey,
      testo: c.testo,
      procedure: c.procedure,
      stato: stato.get(c.key)?.stato ?? null,
      evidenza: stato.get(c.key)?.evidenza ?? null,
    })),
    completamento: d.completamento,
    dettaglio: d.dettaglio,
  };

  return salvaSnapshot(userId, orgId, companyId, "manuale_sa8000", SENZA_ESERCIZIO, dati);
}

/**
 * La Dichiarazione annuale sulla due diligence di filiera.
 *
 * ⚠️ È l'unico dei nuovi documenti con un obbligo di PUBBLICAZIONE dietro: la CSDDD
 * all'articolo 16 chiede che sia resa accessibile. Per questo congela anche i partner
 * uno per uno con il loro rischio residuo, e non solo il quadro: chi la riceve deve
 * poter risalire dal numero aggregato alla riga che lo produce, altrimenti la
 * dichiarazione è un'affermazione senza appoggio.
 */
export async function publishDichiarazioneFilieraSnapshot(
  userId: string,
  orgId: string,
  companyId: string,
): Promise<string> {
  await requireEntitlement(userId, orgId, "generate_pdf");
  const d = await getFiliera(userId, orgId, companyId);
  if (!d?.programma) throw new Error("Nessun programma di due diligence da pubblicare per questa azienda");

  const dati = {
    generatoIl: new Date().toISOString(),
    azienda: d.azienda,
    programma: d.programma,
    fasi: d.fasi.map((f) => ({ key: f.key, nome: f.nome, descrizione: f.descrizione })),
    dimensioni: d.dimensioni.map((x) => ({ key: x.key, nome: x.nome })),
    aree: d.aree.map((a) => ({ key: a.key, nome: a.nome })),
    flags: d.flags.map((f) => ({ key: f.key, nome: f.nome })),
    partner: d.partner.map((v) => ({
      nome: v.partner.nome,
      paese: v.partner.paese,
      livello: v.partner.livello,
      categoria: v.partner.categoria,
      stato: v.partner.stato,
      spesa: v.partner.spesa,
      qualifica: v.partner.qualifica,
      flag: v.partner.flag,
      punteggi: v.punteggi,
      inerente: v.inerente,
      categoriaInerente: v.categoria,
      maturita: v.maturita,
      residuo: v.residuo,
      mesiVerifica: v.mesiVerifica,
      criticheMancanti: v.criticheMancanti,
      vivo: v.vivo,
    })),
    quadro: d.quadro,
  };

  return salvaSnapshot(userId, orgId, companyId, "dichiarazione_filiera", SENZA_ESERCIZIO, dati);
}

/** Il marchio del documento, deciso qui una volta sola. Vedi `marchio.ts`: leggerlo
 *  alla visualizzazione farebbe cambiare intestazione a un PDF già consegnato. */
async function marchioCorrente(orgId: string) {
  const [ent, org] = await Promise.all([
    withTenant({ orgId }, (tx) =>
      tx
        .select({ whiteLabel: orgEntitlement.whiteLabel })
        .from(orgEntitlement)
        .where(eq(orgEntitlement.organizationId, orgId))
        .limit(1),
    ),
    db.select({ nome: organization.name }).from(organization).where(eq(organization.id, orgId)).limit(1),
  ]);
  return marchioDaCongelare({
    whiteLabel: ent[0]?.whiteLabel ?? false,
    nomeStudio: org[0]?.nome,
  });
}

async function salvaSnapshot(
  userId: string,
  orgId: string,
  companyId: string,
  tipo: TipoDocumento,
  anno: number,
  dati: Record<string, unknown>,
): Promise<string> {
  const versione = await prossimaVersione(orgId, companyId, tipo, anno);
  const id = randomUUID();
  // Il marchio si aggiunge QUI, nella strozzatura comune ai cinque documenti: metterlo
  // in ciascuna funzione di pubblicazione significherebbe dimenticarlo nella sesta.
  const marchio = await marchioCorrente(orgId);
  await withTenant({ userId, orgId }, async (tx) => {
    await tx.insert(documentSnapshot).values({
      id,
      organizationId: orgId,
      companyId,
      tipo,
      anno,
      versione,
      dati: { ...dati, marchio },
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

  await festeggiaIlPrimoDocumento(userId, orgId, companyId, tipo, id);
  return id;
}

/**
 * Avvisa lo studio quando pubblica il suo PRIMO documento.
 *
 * Non tiene stato: se subito dopo l'inserimento i documenti dell'organizzazione sono
 * esattamente uno, quello era il primo — una condizione che non potrà mai ripresentarsi.
 * Una tabella di supporto per ricordare «email già mandata» sarebbe un dato in più da
 * mantenere per sapere ciò che i dati dicono già.
 *
 * **Non può far fallire una pubblicazione.** Sta fuori dalla transazione e ingoia i
 * propri errori: un guasto della posta non deve mai togliere a un consulente il
 * documento che ha appena prodotto.
 */
async function festeggiaIlPrimoDocumento(
  userId: string,
  orgId: string,
  companyId: string,
  tipo: TipoDocumento,
  snapshotId: string,
): Promise<void> {
  try {
    const [{ n } = { n: 0 }] = await withTenant({ userId, orgId }, (tx) =>
      tx
        .select({ n: sql<number>`count(*)::int` })
        .from(documentSnapshot)
        .where(eq(documentSnapshot.organizationId, orgId)),
    );
    if (n !== 1) return;

    const [persona] = await db.select({ email: user.email }).from(user).where(eq(user.id, userId));
    if (!persona?.email) return;
    const az = await withTenant({ userId, orgId }, (tx) =>
      tx.select({ nome: company.nome }).from(company).where(eq(company.id, companyId)),
    );

    const base = (process.env.NEXT_PUBLIC_APP_URL ?? "").replace(/\/+$/, "");
    const { sendPrimoDocumentoEmail } = await import("@/lib/email");
    await sendPrimoDocumentoEmail(persona.email, {
      nomeDocumento: DOCUMENTI[tipo].nome,
      azienda: az[0]?.nome ?? "la tua azienda",
      url: `${base}/documento/${snapshotId}`,
      urlAzienda: `${base}/aziende/${companyId}`,
    });
  } catch (e) {
    console.error("[email] primo documento non inviata per", orgId, e);
  }
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
