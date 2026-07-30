import { withTenant } from "@/lib/db/tenant";
import {
  company, ghgActivityRow, ghgChecklistStatus, ghgInventory, ghgSourceSelection, ghgTarget,
  kpiValue, materialityAssessment, narrativeSection, reportProject, topicManagement,
} from "@/lib/db/schema";
import { latestContentSetId } from "@/features/ghg/inventories";
import { logAudit } from "@/lib/audit";
import { randomUUID } from "node:crypto";

// AZIENDA DEMO: creata alla registrazione per ogni nuovo studio. È il cuore del
// funnel pre-vendita: l'utente esplora percorsi COMPILATI con dati realistici,
// il tour lo accompagna, il paywall blocca solo la creazione di aziende proprie.
// Esclusa dai limiti (isDemo) e dal conteggio. Insert in batch: il seed gira
// dentro il hook di signup e non deve pesare.

const B = {
  forma: "Meccanica Adriatica S.r.l.", piva: "07566620723", sede: "Bari, via delle Officine 12",
  settore: "Componenti meccanici di precisione", ateco: "25.62",
  siti: "Stabilimento di Bari (produzione); deposito di Modugno (logistica)",
  dipendenti: "48", responsabile: "Ing. Paola Ranieri — HSE Manager", consolidamento: "Controllo operativo",
  perimetroOrg: "La società non detiene partecipazioni: il perimetro coincide con la persona giuridica, con i due siti operativi di Bari e Modugno.",
  perimetroOp: "Incluse tutte le emissioni dirette (categoria 1) e da energia importata (categoria 2). Le categorie 3-6 sono state esaminate: incluse le trasferte di lavoro, escluse le restanti per non significatività documentata.",
  periodo: "1 gennaio – 31 dicembre",
  significativita: "Soglia del 5% sul totale stimato, combinata con la rilevanza per i clienti automotive.",
  metodologia: "Metodo per dati di attività: quantità da fatture e registri moltiplicate per fattori documentati (ISPRA 2025, DEFRA 2025).",
  verifica: "Verifica in corso",
  motivoBase: "Il 2024 è il primo esercizio con dati completi e verificabili su entrambi i siti.",
  regolaRicalcolo: "Ricalcolo dell'anno base per variazioni strutturali che modificano il totale delle categorie 1 e 2 di oltre il 5%.",
};

// [src, cat, desc, factorKey, um, q, fe, extra]
const VOCI_2025: [string, string, string, string, string, string, string, Record<string, string | null>][] = [
  ["1a", "1", "Gas naturale — centrale termica", "gas_smc", "Smc", "42500", "1.9755", {}],
  ["1b", "1", "Gasolio flotta furgoni", "gasolio_auto", "litri", "8600", "2.687", {}],
  ["1c", "1", "Ricarica R410A climatizzazione", "r410a", "kg", "6", "2088", { dq: "M" }],
  ["2a", "2", "Energia elettrica siti produttivi", "ee_loc", "kWh", "612000", "0.2565", { mkt: "0.457", go: "180000", dq: "M" }],
  ["3d", "3", "Trasferte aeree commerciali", "aereo_corto", "pax·km", "38000", "0.158", { dq: "S", ev: "Note spese 2025" }],
];
const VOCI_2024: typeof VOCI_2025 = [
  ["1a", "1", "Gas naturale — centrale termica", "gas_smc", "Smc", "45800", "1.9755", {}],
  ["1b", "1", "Gasolio flotta furgoni", "gasolio_auto", "litri", "9400", "2.687", {}],
  ["2a", "2", "Energia elettrica siti produttivi", "ee_loc", "kWh", "598000", "0.2565", { mkt: "0.457", go: "120000", dq: "M" }],
];

const SORGENTI: [string, "in" | "out" | "na", string | null][] = [
  ["1a", "in", null], ["1b", "in", null], ["1c", "in", null],
  ["1d", "na", "Nessun processo chimico o fisico che generi emissioni non di combustione."],
  ["2a", "in", null], ["3d", "in", null],
  ["4e", "out", "Rifiuti gestiti dal consorzio di distretto: quota non significativa (<1% del totale stimato)."],
];

const KPI: [string, string, string][] = [
  ["en_ele", "612000", "598000"], ["en_ele_go", "180000", "120000"], ["en_auto", "42000", "0"],
  ["en_gas", "42500", "45800"], ["en_flotta_d", "8600", "9400"], ["ac_prel", "3400", "3600"],
  ["ri_np", "96", "104"], ["ri_p", "11", "14"], ["ri_rec", "82", "78"], ["ma_tot", "1480", "1420"],
  ["ma_ric", "210", "160"], ["hr_tot", "48", "46"], ["hr_don", "14", "12"], ["hr_ind", "44", "42"],
  ["hr_u30", "9", "8"], ["hr_o50", "15", "14"], ["hr_ass", "5", "4"], ["hr_ces", "3", "5"],
  ["hr_dis", "2", "2"], ["si_ore", "79000", "76500"], ["si_inf", "1", "3"], ["si_gg", "12", "61"],
  ["fo_ore", "640", "410"], ["fo_sic", "280", "220"], ["re_don", "29400", "28100"], ["re_uom", "31200", "30400"],
  ["ec_ric", "5200000", "4900000"], ["ec_for", "118", "121"], ["ec_loc", "94", "95"], ["go_forq", "36", "18"],
  ["go_cda", "5", "5"], ["go_cdad", "2", "2"], ["go_seg", "1", "0"], ["go_cor", "0", "0"], ["go_san", "0", "1"],
];

const MATERIALITA: [string, number, number][] = [
  ["T01", 4, 3], ["T02", 4, 4], ["T06", 3, 3], ["T07", 5, 4], ["T08", 3, 3], ["T10", 4, 3],
  ["T13", 4, 4], ["T16", 3, 3], ["T03", 2, 2], ["T04", 2, 1], ["T09", 3, 2], ["T14", 2, 3],
];

const GESTIONE: [string, string, string, string, string, string, string][] = [
  ["T01", "Politica energetica e climatica approvata dal CdA a marzo 2024, integrata nel sistema ISO 14001.", "Fotovoltaico da 200 kWp sul tetto dello stabilimento; contratto con Garanzia d'Origine per il 30% dei prelievi.", "−30% Scope 1+2", "2024", "2030", "HSE Manager"],
  ["T07", "Sistema di gestione della sicurezza ISO 45001, obiettivo infortuni zero.", "Programma near-miss (38 segnalazioni), formazione carrelli, nuova segnaletica di reparto.", "Indice di frequenza < 10", "2024", "2027", "RSPP"],
  ["T13", "Sistema qualità IATF 16949 per le forniture automotive.", "Difettosità ridotta a 12 ppm; audit di seconda parte superati con i tre clienti principali.", "Difettosità < 10 ppm", "2025", "2027", "Quality Manager"],
];

const CAPITOLI: [string, string][] = [
  ["lettera", "Il 2025 è stato l'anno in cui la sostenibilità è passata dai propositi ai numeri. Abbiamo installato il fotovoltaico, ridotto di un terzo gli infortuni e, per la prima volta, misurato per intero le nostre emissioni secondo la ISO 14064-1.\n\nQuesto documento racconta come lavoriamo: ai nostri clienti, alle banche che ci accompagnano e soprattutto alle 48 persone che ogni giorno costruiscono questa azienda."],
  ["identita", "Meccanica Adriatica nasce a Bari nel 1987 come officina di tornitura conto terzi. Oggi produce componenti meccanici di precisione per l'automotive e la meccanica agricola, con 48 dipendenti e un fatturato di 5,2 milioni di euro.\n\nLa proprietà è alla seconda generazione familiare; dal 2019 l'azienda è certificata ISO 9001 e IATF 16949, dal 2023 ISO 14001 e 45001."],
  ["metodo", "Il bilancio è redatto con riferimento ai GRI Standards 2021 e tiene conto della struttura del modulo VSME. I dati provengono dai sistemi gestionali aziendali e dall'inventario GHG redatto secondo ISO 14064-1."],
];

const testoATiptap = (testo: string) => ({
  type: "doc",
  content: testo.split(/\n\n/).map((p) => ({ type: "paragraph", content: [{ type: "text", text: p }] })),
});

export async function seedDemoCompany(userId: string, orgId: string): Promise<string> {
  const [ghgSet, reportSet] = await Promise.all([latestContentSetId("ghg"), latestContentSetId("report")]);
  const companyId = randomUUID();
  const inv25 = randomUUID();
  const inv24 = randomUUID();
  const projId = randomUUID();

  await withTenant({ userId, orgId }, async (tx) => {
    await tx.insert(company).values({
      id: companyId,
      organizationId: orgId,
      nome: "Meccanica Adriatica S.r.l. (demo)",
      settore: "Componenti meccanici di precisione",
      sede: "Bari",
      piva: "07566620723",
      ateco: "25.62",
      isDemo: true,
    });

    await tx.insert(ghgInventory).values([
      { id: inv25, organizationId: orgId, companyId, anno: 2025, annoBase: 2024, gwpSetKey: "AR6", contentSetId: ghgSet, boundaries: B, ricavi: "5200000", fte: "48", produzione: "1250", umProduzione: "t" },
      { id: inv24, organizationId: orgId, companyId, anno: 2024, annoBase: 2024, gwpSetKey: "AR6", contentSetId: ghgSet, boundaries: B, ricavi: "4900000", fte: "46", produzione: "1180", umProduzione: "t" },
    ]);

    const riga = (inventoryId: string) => (v: (typeof VOCI_2025)[number]) => ({
      id: randomUUID(),
      organizationId: orgId,
      inventoryId,
      sourceTypeKey: v[0],
      categoryKey: v[1],
      descrizione: v[2],
      factorKey: v[3],
      um: v[4],
      quantita: v[5],
      fe: v[6],
      feMarket: v[7].mkt ?? null,
      quotaGo: v[7].go ?? null,
      dq: (v[7].dq ?? "F") as "M" | "F" | "C" | "E" | "S",
      sede: "Stabilimento di Bari",
      evidenza: v[7].ev ?? "Fatture e registri",
    });
    await tx.insert(ghgActivityRow).values([...VOCI_2025.map(riga(inv25)), ...VOCI_2024.map(riga(inv24))]);

    await tx.insert(ghgSourceSelection).values(
      SORGENTI.map(([k, stato, motivazione]) => ({
        id: randomUUID(), organizationId: orgId, inventoryId: inv25, sourceTypeKey: k, stato, motivazione,
      })),
    );
    await tx.insert(ghgChecklistStatus).values(
      ["v1", "v2", "v4", "v6", "v7", "v8"].map((k) => ({
        id: randomUUID(), organizationId: orgId, inventoryId: inv25, requirementKey: k, stato: "ok" as const,
      })),
    );
    await tx.insert(ghgTarget).values({
      id: randomUUID(), organizationId: orgId, companyId,
      nome: "Riduzione emissioni dirette e da energia", ambito: "12", riduzionePct: "30", annoTarget: 2030,
      note: "Fotovoltaico 200 kWp e contratto GO al 100%",
    });

    await tx.insert(reportProject).values({
      id: projId, organizationId: orgId, companyId, anno: 2025, contentSetId: reportSet,
      standard: "GRI 2021 — opzione con riferimento",
      perimetro: "Tutte le sedi operative: stabilimento di Bari e deposito di Modugno.",
      profilo: { forma: "S.r.l.", piva: B.piva, sede: "Bari", settore: B.settore, ateco: B.ateco, sitiop: "Bari (produzione), Modugno (logistica)", mercati: "Automotive e meccanica agricola, Italia ed export UE", contatto: "sostenibilita@esempio.it" },
      sogliaMaterialita: "3",
    });
    await tx.insert(materialityAssessment).values(
      MATERIALITA.map(([t, imp, fin]) => ({
        id: randomUUID(), organizationId: orgId, projectId: projId, topicKey: t, scoreImpact: imp, scoreFinancial: fin,
      })),
    );
    await tx.insert(kpiValue).values(
      KPI.flatMap(([k, v25, v24]) => [
        { id: randomUUID(), organizationId: orgId, companyId, anno: 2025, kpiKey: k, valore: v25 },
        { id: randomUUID(), organizationId: orgId, companyId, anno: 2024, kpiKey: k, valore: v24 },
      ]),
    );
    await tx.insert(topicManagement).values(
      GESTIONE.map(([t, politica, azioni, target, annoBase, annoTarget, responsabile]) => ({
        id: randomUUID(), organizationId: orgId, projectId: projId, topicKey: t,
        politica, azioni, target, annoBase, annoTarget, responsabile,
      })),
    );
    await tx.insert(narrativeSection).values(
      CAPITOLI.map(([k, testo]) => ({
        id: randomUUID(), organizationId: orgId, projectId: projId, templateKey: k, contenuto: testoATiptap(testo),
      })),
    );

    await logAudit(tx, { organizationId: orgId, userId, azione: "demo.seed", entita: "company", entitaId: companyId });
  });
  return companyId;
}
