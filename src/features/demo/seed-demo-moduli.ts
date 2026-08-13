import { randomUUID } from "node:crypto";
import { asc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  energyBalance, energyVectorInput, energyAllocation, energyEndUseState,
  energyDriverValue, energyMeasure, energyNarrative,
  supplierAssessment, supplierAnswer, supplierQuestion,
  soaDeclaration, soaModule, soaControlDecision, soaControl,
} from "@/lib/db/schema";
import { latestEnergySetId } from "@/features/energy/balances";
import { latestSupplierSetId } from "@/features/supplier/assessments";
import { latestSoaSetId } from "@/features/soa/declarations";
import type { withTenant } from "@/lib/db/tenant";

// Gli altri tre percorsi dell'azienda dimostrativa: diagnosi energetica,
// autovalutazione ESG, Dichiarazione di Applicabilità.
//
// Stanno in un file a parte perché `seed-demo-org.ts` copre già due moduli e
// cinque in un file solo non si leggono più. Girano nella STESSA transazione:
// un'azienda dimostrativa a metà è peggio di una che non c'è, perché sembra un
// guasto del prodotto invece che un seed non arrivato.
//
// I dati sono gli stessi di Meccanica Adriatica: 612.000 kWh e 42.500 Smc qui
// sono gli stessi numeri che stanno nell'inventario GHG. Un cliente che apre due
// percorsi della stessa azienda e trova consumi diversi smette di fidarsi di
// entrambi, ed è la prima cosa che un consulente controlla.

type Tx = Parameters<Parameters<typeof withTenant>[1]>[0];

/* ─────────────────────────────── diagnosi energetica ─────────────────────────── */

// [vettore, quantità nell'unità del vettore, costo €]
const VETTORI: [string, string, string | null][] = [
  ["ele", "612000", "128520"],
  ["ele_go", "180000", null],
  ["fv", "42000", "0"],
  ["gas", "42500", "38250"],
  ["gasolio_t", "8600", "14620"],
];

// I dodici mesi devono sommare al totale del vettore, altrimenti il grafico
// mensile racconta un anno diverso da quello del bilancio.
const MENSILI: Record<string, string[]> = {
  ele: ["56000", "54000", "52000", "50000", "48000", "50000", "42000", "36000", "50000", "54000", "58000", "62000"],
  gas: ["6800", "6200", "5100", "3400", "1700", "850", "400", "400", "1200", "3200", "5450", "7800"],
};

// [uso, vettore, quantità]. Per ciascun vettore la somma fa il totale: è la
// quadratura, ed è il controllo che il passo 3 mostra per primo.
const RIPARTIZIONE: [string, string, string][] = [
  ["U02", "ele", "68000"], ["U03", "ele", "214000"], ["U07", "ele", "118000"],
  ["U08", "ele", "46000"], ["U10", "ele", "38000"], ["U13", "ele", "12000"],
  ["U15", "ele", "54000"], ["U16", "ele", "32000"], ["U19", "ele", "30000"],
  ["U03", "fv", "26000"], ["U07", "fv", "16000"],
  ["U02", "gas", "9500"], ["U13", "gas", "33000"],
  ["U20", "gasolio_t", "8600"],
];

// [uso, attivo, metodo, nota]
const USI: [string, boolean, "mis" | "cal" | "sti" | null, string | null][] = [
  ["U01", false, null, "Nessun forno fusorio: i semilavorati arrivano già colati."],
  ["U02", true, "mis", "Contatore dedicato sul forno di trattamento termico."],
  ["U03", true, "mis", "Somma dei contatori di reparto (torni, centri di lavoro, rettifiche)."],
  ["U07", true, "mis", "Contatore sulla sala compressori."],
  ["U08", true, "cal", "Assorbimento di targa dei gruppi frigo per le ore di funzionamento registrate."],
  ["U10", true, "sti", "Stima da potenza installata e ore di aspirazione dei reparti."],
  ["U13", true, "cal", "Ripartizione della centrale termica sulle volumetrie riscaldate."],
  ["U15", true, "cal", "Censimento dei corpi illuminanti per le ore di accensione."],
  ["U16", true, "sti", "Sala server e postazioni uffici: stima da potenza assorbita media."],
  ["U19", true, "cal", "Consumi di ricarica dei carrelli elettrici."],
  ["U20", true, "mis", "Litri di gasolio dai rifornimenti della flotta."],
];

// [variabile, 2025, 2024]
const VARIABILI: [string, string, string][] = [
  ["prod", "1250", "1180"],
  ["add", "48", "46"],
  ["sup", "4200", "4200"],
  ["suptot", "6800", "6800"],
  ["gg", "228", "226"],
  ["fatt", "5200000", "4900000"],
];

const INTERVENTI = [
  {
    descrizione: "Sostituzione del compressore a vite con macchina a inverter e rifacimento della rete aria",
    vettoreKey: "ele", quantita: "68000", investimento: "42000", incentivo: null,
    usoKey: "U07", stato: "approvato" as const, annoPrevisto: 2026,
    note: "Risparmio stimato dal confronto fra assorbimento specifico attuale (0,118 kWh/Nm³) e dichiarato della macchina nuova, sulle ore di funzionamento registrate. Non include il recupero delle perdite di rete, quantificate a parte.",
  },
  {
    descrizione: "Relamping a LED dei reparti produttivi e del piazzale",
    vettoreKey: "ele", quantita: "39000", investimento: "28000", incentivo: "5600",
    usoKey: "U15", stato: "realizzato" as const, annoPrevisto: 2025,
    note: "Censimento di 214 corpi illuminanti sostituiti; risparmio a parità di illuminamento misurato in cinque punti campione.",
  },
  {
    descrizione: "Recupero del calore dai compressori per il preriscaldo dell'acqua tecnica",
    vettoreKey: "gas", quantita: "4200", investimento: "16000", incentivo: null,
    usoKey: "U13", stato: "valutato" as const, annoPrevisto: 2027,
    note: "Ipotesi: recupero del 60% del calore dissipato nelle ore di contemporaneità fra sala compressori e fabbisogno termico. Da confermare con una campagna di misura invernale.",
  },
];

const CAPITOLI_ENE: [string, string][] = [
  ["sintesi", "Nel 2025 il sito ha consumato 1.017 MWh di energia primaria, per 181.390 euro. Il 60% dell'elettricità va alle macchine di lavorazione e all'aria compressa: sono le due utenze su cui si decide la bolletta.\n\nTre interventi sono stati valutati. Il relamping è già stato realizzato. La sostituzione del compressore, approvata, vale da sola 68.000 kWh l'anno e rientra in poco più di tre anni."],
  ["contesto", "Meccanica Adriatica lavora componenti di precisione per l'automotive su due turni, 228 giorni l'anno, nello stabilimento di Bari. La superficie coperta è di 6.800 m², di cui 4.200 riscaldati.\n\nL'impianto fotovoltaico da 200 kWp, entrato in servizio a marzo 2025, ha coperto 42.000 kWh in autoconsumo. Il contratto di fornitura elettrica prevede garanzie d'origine per 180.000 kWh."],
  ["azioni", "La priorità è l'aria compressa: 118.000 kWh l'anno per un servizio che non trasforma il prodotto. Il compressore attuale lavora a carico parziale per gran parte del turno, e il rifacimento della rete elimina perdite stimate in un quinto della portata.\n\nIl secondo fronte è il riscaldamento: 33.000 Smc su volumetrie in parte non isolate. Il recupero termico dai compressori affronta il fabbisogno di acqua tecnica senza toccare la centrale."],
];

/* ─────────────────────────── autovalutazione ESG ──────────────────────────────── */

// Le risposte dell'azienda dimostrativa. Il quadro voluto: sopra la soglia di 60,
// forte su lavoro e ambiente, scoperta sulla catena di fornitura — che è la lacuna
// più comune nelle PMI manifatturiere, e quella che il piano deve saper mostrare.
const RISPOSTE: Record<string, "si" | "parziale" | "no" | "na"> = {
  B1: "si", B2: "si", B3: "si", B4: "parziale", B5: "si",
  E1: "si", E2: "si", E3: "parziale", E4: "si", E5: "no", E6: "parziale", E7: "si", E8: "na", E9: "no",
  S1: "si", S2: "si", S3: "si", S4: "si", S5: "parziale", S6: "si", S7: "parziale", S8: "no", S9: "si",
  G1: "si", G2: "parziale", G3: "si", G4: "no", G5: "parziale", G6: "si", G7: "si", G8: "no",
  P1: "parziale", P2: "parziale", P3: "no", P4: "si", P5: "no", P6: "na",
};

const NOTE: Record<string, string> = {
  B4: "Obiettivi fissati su emissioni e sicurezza; mancano quelli su acqua e rifiuti.",
  E5: "Nessuna valutazione formale del rischio idrico: il sito non insiste su area a stress idrico.",
  E8: "Non applicabile: nessuna sostanza in Allegato XIV REACH nei cicli di lavorazione.",
  G4: "Il canale di segnalazione esiste ma non garantisce l'anonimato: adeguamento previsto entro giugno.",
  P3: "I fornitori non sono ancora valutati su criteri ESG: è il primo punto del piano.",
  P6: "Non applicabile: nessun approvvigionamento di minerali da aree di conflitto.",
};

// [domanda, responsabile, scadenza, stato]
const AZIONI: [string, string, string, "da_avviare" | "in_corso" | "completata"][] = [
  ["P3", "Ufficio Acquisti", "2026-06-30", "in_corso"],
  ["G4", "Direzione Generale", "2026-06-30", "in_corso"],
  ["P1", "Ufficio Acquisti", "2026-09-30", "da_avviare"],
  ["E9", "HSE Manager", "2026-12-31", "da_avviare"],
  ["S8", "Risorse Umane", "2026-09-30", "da_avviare"],
];

/* ────────────────────── Dichiarazione di Applicabilità ────────────────────────── */

// Un'azienda meccanica che non sviluppa software: i controlli sullo sviluppo sicuro
// si escludono, e la norma chiede di motivare le esclusioni — non le inclusioni.
const ESCLUSI: Record<string, string> = {
  "8.25": "L'organizzazione non sviluppa software: non esistono attività di sviluppo interne né affidate a terzi nel perimetro del SGSI.",
  "8.26": "Nessuno sviluppo applicativo interno: i requisiti di sicurezza sono richiesti ai fornitori nei capitolati (controllo 5.20).",
  "8.27": "Nessuna architettura applicativa progettata internamente.",
  "8.28": "Nessuna scrittura di codice nel perimetro.",
  "8.29": "Nessun collaudo di sicurezza su codice proprio; i test sui sistemi acquistati sono coperti dal controllo 8.32.",
  "8.30": "Nessuno sviluppo esternalizzato in corso.",
  "8.31": "Non esistono ambienti di sviluppo: i sistemi sono acquistati e configurati.",
};

const RESPONSABILI = ["Responsabile IT", "Direzione Generale", "Responsabile Qualità", "RSPP"];
const RIFERIMENTI = ["PSI-01 Politica del SGSI", "PRO-04 Gestione degli accessi", "PRO-07 Gestione degli asset", "IST-12 Continuità operativa", "REG-02 Registro dei trattamenti"];

/** Stato di ciascun controllo: i cardine stanno mediamente meglio, com'è nei fatti
 *  di chi si sta certificando — sono quelli su cui si è lavorato per primi. */
function statoDi(cardine: boolean, i: number): "nd" | "pl" | "pa" | "at" | "av" {
  return cardine
    ? (["av", "at", "at", "pa"] as const)[i % 4]
    : (["at", "pa", "pl", "at", "nd"] as const)[i % 5];
}

/* ─────────────────────────────────── seed ─────────────────────────────────────── */

export async function seedDemoModuli(tx: Tx, orgId: string, companyId: string): Promise<void> {
  // I cataloghi si leggono FUORI dal perimetro del tenant: sono contenuti di
  // piattaforma, non dati dello studio.
  const [energySet, supplierSet, soaSet] = await Promise.all([
    latestEnergySetId(), latestSupplierSetId(), latestSoaSetId(),
  ]);
  const [domande, controlli] = await Promise.all([
    db.select().from(supplierQuestion).where(eq(supplierQuestion.setId, supplierSet)).orderBy(asc(supplierQuestion.ordine)),
    db.select().from(soaControl).where(eq(soaControl.setId, soaSet)).orderBy(asc(soaControl.ordine)),
  ]);

  /* ── diagnosi energetica ─────────────────────────────────────────────────── */
  const balanceId = randomUUID();
  await tx.insert(energyBalance).values({
    id: balanceId, organizationId: orgId, companyId, anno: 2025, annoBase: 2024, contentSetId: energySet,
    profilo: {
      forma: "S.r.l.", piva: "07566620723", sede: "Bari", settore: "Componenti meccanici di precisione",
      ateco: "25.62", sito: "Stabilimento di Bari, via delle Officine 12",
      attivita: "Tornitura, fresatura e rettifica di componenti di precisione per automotive e meccanica agricola.",
      turni: "Due turni, 228 giorni lavorativi", referente: "Ing. Paola Ranieri — HSE Manager",
      perimetro: "Stabilimento di Bari. Il deposito di Modugno, privo di lavorazioni, è escluso dalla diagnosi e dichiarato tale.",
      unitaProd: "t di prodotto finito",
    },
  });
  await tx.insert(energyVectorInput).values(
    VETTORI.map(([k, q, c]) => ({
      id: randomUUID(), organizationId: orgId, balanceId, vettoreKey: k, quantita: q, costo: c,
      mensili: MENSILI[k] ?? ["", "", "", "", "", "", "", "", "", "", "", ""],
    })),
  );
  await tx.insert(energyAllocation).values(
    RIPARTIZIONE.map(([uso, vet, q]) => ({
      id: randomUUID(), organizationId: orgId, balanceId, usoKey: uso, vettoreKey: vet, quantita: q,
    })),
  );
  await tx.insert(energyEndUseState).values(
    USI.map(([uso, attivo, metodo, nota]) => ({
      id: randomUUID(), organizationId: orgId, balanceId, usoKey: uso, attivo, metodo, nota,
    })),
  );
  await tx.insert(energyDriverValue).values(
    VARIABILI.flatMap(([k, v25, v24]) => [
      { id: randomUUID(), organizationId: orgId, companyId, anno: 2025, driverKey: k, valore: v25 },
      { id: randomUUID(), organizationId: orgId, companyId, anno: 2024, driverKey: k, valore: v24 },
    ]),
  );
  await tx.insert(energyMeasure).values(
    INTERVENTI.map((m, i) => ({ id: randomUUID(), organizationId: orgId, balanceId, posizione: i, ...m })),
  );
  await tx.insert(energyNarrative).values(
    CAPITOLI_ENE.map(([k, testo]) => ({
      id: randomUUID(), organizationId: orgId, balanceId, templateKey: k, contenuto: testoATiptap(testo),
    })),
  );

  /* ── autovalutazione ESG ─────────────────────────────────────────────────── */
  const assessmentId = randomUUID();
  await tx.insert(supplierAssessment).values({
    id: assessmentId, organizationId: orgId, companyId, contentSetId: supplierSet, sogliaRichiesta: 60,
    profilo: {
      committente: "Capofiliera automotive",
      riferimento: "Questionario fornitori 2026",
      referente: "Ing. Paola Ranieri — HSE Manager",
    },
  });
  const azioni = new Map(AZIONI.map(([k, r, s, st]) => [k, { r, s, st }]));
  await tx.insert(supplierAnswer).values(
    domande.map((d) => {
      const risposta = RISPOSTE[d.key] ?? null;
      const a = azioni.get(d.key);
      return {
        id: randomUUID(), organizationId: orgId, assessmentId, questionKey: d.key,
        risposta,
        nota: NOTE[d.key] ?? null,
        // Il documento c'è dove la risposta è piena: dichiarare una conformità senza
        // l'evidenza è il rilievo che il committente muove per primo.
        statoDocumento: risposta === "si" ? ("disponibile" as const)
          : risposta === "parziale" ? ("da_aggiornare" as const)
          : risposta === "no" ? ("assente" as const) : null,
        responsabile: a?.r ?? null,
        scadenza: a?.s ?? null,
        statoAzione: a?.st ?? null,
      };
    }),
  );

  /* ── Dichiarazione di Applicabilità ──────────────────────────────────────── */
  const declarationId = randomUUID();
  await tx.insert(soaDeclaration).values({
    id: declarationId, organizationId: orgId, companyId, contentSetId: soaSet,
    sogliaObiettivo: 80, ruoloPrivacy: "titolare", ruoloCloud: "cliente",
    profilo: {
      versione: "1.2", data: "2026-03-15",
      ambito: "Progettazione, produzione e vendita di componenti meccanici di precisione. Sede di Bari.",
      approvatoDa: "Direzione Generale", responsabile: "Responsabile IT",
    },
  });
  // Cliente di servizi cloud: si accende il quadro 27017. Gli altri restano spenti,
  // e i loro controlli restano fuori ambito senza dover essere motivati.
  await tx.insert(soaModule).values(
    (["27017", "27018", "27701A", "27701B"] as const).map((f) => ({
      id: randomUUID(), organizationId: orgId, declarationId, frameworkKey: f, attivo: f === "27017",
    })),
  );

  const inAmbito = controlli.filter((c) => c.frameworkKey === "27001" || c.frameworkKey === "27017");
  await tx.insert(soaControlDecision).values(
    inAmbito.map((c, i) => {
      const giustificazione = ESCLUSI[c.controlloId];
      if (giustificazione) {
        return {
          id: randomUUID(), organizationId: orgId, declarationId,
          frameworkKey: c.frameworkKey, controlloId: c.controlloId,
          applicabile: false, giustificazione, motivazioni: [], stato: null,
        };
      }
      const stato = statoDi(c.cardine, i);
      const attuato = stato === "at" || stato === "av";
      return {
        id: randomUUID(), organizationId: orgId, declarationId,
        frameworkKey: c.frameworkKey, controlloId: c.controlloId,
        applicabile: true,
        giustificazione: null,
        motivazioni: c.cardine ? ["rv", "ol"] : i % 3 === 0 ? ["rv", "oc"] : ["rv"],
        stato,
        // Un controllo attuato senza documento è uno dei rilievi che la vista
        // Verifiche elenca per prima: qui il documento c'è dove lo stato lo esige.
        riferimentoDoc: attuato ? RIFERIMENTI[i % RIFERIMENTI.length] : null,
        responsabile: RESPONSABILI[i % RESPONSABILI.length],
        scadenza: attuato ? null : `2026-${String((i % 9) + 3).padStart(2, "0")}-30`,
        statoAzione: attuato ? null : i % 2 === 0 ? ("in_corso" as const) : ("da_avviare" as const),
      };
    }),
  );
}

const testoATiptap = (testo: string) => ({
  type: "doc",
  content: testo.split(/\n\n/).map((p) => ({ type: "paragraph", content: [{ type: "text", text: p }] })),
});
