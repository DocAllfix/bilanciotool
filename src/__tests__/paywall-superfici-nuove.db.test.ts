import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  agendaVoce,
  companyContact,
  compenso,
  documentSnapshot,
  orgEntitlement,
  sgesgFase,
  sgesgProgramma,
  sgesgSchedaDato,
} from "@/lib/db/schema";
import { creaStudio, pulisciStudio } from "./comune";
import { creaContatto } from "@/features/companies/contatti";
import { creaProgramma, setStatoFase } from "@/features/sgesg/programma";
import { setCampoScheda } from "@/features/sgesg/schede";
import { publishSgesgSnapshot } from "@/features/documents/snapshot";
import { creaVoce } from "@/features/agenda";
import { creaCompenso } from "@/features/compensi";

// IL PAYWALL SULLE SUPERFICI NUOVE.
//
// ⚠️ Ogni fase di questo lavoro ha aggiunto posti in cui si scrive: contatti, programma
// ESG, schede, agenda, compensi, quattro documenti. Ognuno di quei posti e' un modo di
// aggirare l'abbonamento se qualcuno dimentica `requireEntitlement`, e dimenticarlo non
// produce nessun errore — produce un prodotto che si puo' usare senza pagare.
//
// E' gia' successo: `archiveCompany` resto' senza controllo fino al 7 agosto 2026, e un
// account in sola lettura poteva archiviare.
//
// ⚠️ La prova e' LA RIGA CHE NON COMPARE, non il messaggio. Un rifiuto raccontato bene e
// una scrittura riuscita in silenzio si somigliano troppo: il collegamento del portale
// cliente riusciva in prova senza dire niente, e il collaudo lo leggeva come «bloccato».

const RUN = Date.now();
/** In prova: e' lo stato con cui nasce ogni studio che si registra. */
let P: Awaited<ReturnType<typeof creaStudio>>;
/** Scaduto: ha pagato e non ha rinnovato — sola lettura. */
let S: Awaited<ReturnType<typeof creaStudio>>;
/** Attivo, per costruire cio' che i due non possono creare da soli. */
let A: Awaited<ReturnType<typeof creaStudio>>;
let progA = "";

async function pulisci(orgId: string) {
  await db.delete(agendaVoce).where(eq(agendaVoce.organizationId, orgId));
  await db.delete(compenso).where(eq(compenso.organizationId, orgId));
  await db.delete(companyContact).where(eq(companyContact.organizationId, orgId));
  await db.delete(documentSnapshot).where(eq(documentSnapshot.organizationId, orgId));
  await db.delete(sgesgSchedaDato).where(eq(sgesgSchedaDato.organizationId, orgId));
  await db.delete(sgesgFase).where(eq(sgesgFase.organizationId, orgId));
  await db.delete(sgesgProgramma).where(eq(sgesgProgramma.organizationId, orgId));
}

beforeAll(async () => {
  P = await creaStudio({ prefisso: "pw-p", run: RUN, nomeAzienda: "Azienda in prova" });
  S = await creaStudio({ prefisso: "pw-s", run: RUN, nomeAzienda: "Azienda scaduta" });
  A = await creaStudio({ prefisso: "pw-a", run: RUN, nomeAzienda: "Azienda attiva" });
  await db.insert(orgEntitlement).values({ organizationId: P.orgId, status: "demo" });
  await db.insert(orgEntitlement).values({ organizationId: S.orgId, status: "expired" });
  await db.insert(orgEntitlement).values({ organizationId: A.orgId, status: "active" });
  progA = await creaProgramma(A.userId, A.orgId, { companyId: A.companyId, anno: 2025 });
});

afterAll(async () => {
  for (const s of [P, S, A]) {
    await pulisci(s.orgId);
    await pulisciStudio(s.orgId, s.userId);
  }
});

/** Ogni scrittura nuova, con il conteggio che la prova. */
const SCRITTURE: {
  nome: string;
  fai: (u: string, o: string, c: string) => Promise<unknown>;
  righe: (o: string) => Promise<number>;
}[] = [
  {
    nome: "aggiungere un contatto alla rubrica",
    fai: (u, o, c) => creaContatto(u, o, c, { nome: "Intruso" }),
    righe: async (o) => (await db.select().from(companyContact).where(eq(companyContact.organizationId, o))).length,
  },
  {
    nome: "avviare un programma ESG",
    fai: (u, o, c) => creaProgramma(u, o, { companyId: c, anno: 2024 }),
    righe: async (o) => (await db.select().from(sgesgProgramma).where(eq(sgesgProgramma.organizationId, o))).length,
  },
  {
    nome: "aggiungere una voce in agenda",
    fai: (u, o) => creaVoce(u, o, { tipo: "azione", titolo: "Intrusa", data: "2026-09-01" }),
    righe: async (o) => (await db.select().from(agendaVoce).where(eq(agendaVoce.organizationId, o))).length,
  },
  {
    nome: "registrare un compenso",
    fai: (u, o, c) => creaCompenso(u, o, { companyId: c, descrizione: "Intruso", importo: 100 }),
    righe: async (o) => (await db.select().from(compenso).where(eq(compenso.organizationId, o))).length,
  },
];

describe("lo SCADUTO non scrive piu' niente", () => {
  // Chi ha pagato e non ha rinnovato torna in sola lettura: i dati restano suoi e
  // consultabili — mai ostaggio — ma non se ne aggiungono di nuovi.
  for (const s of SCRITTURE) {
    it(`${s.nome} viene rifiutato, e la riga non compare`, async () => {
      const prima = await s.righe(S.orgId);
      await expect(s.fai(S.userId, S.orgId, S.companyId)).rejects.toThrow();
      // ⚠️ Il fatto che conta: la riga, non il messaggio.
      expect(await s.righe(S.orgId)).toBe(prima);
    });
  }
});

describe("la PROVA scrive, ed e' voluto", () => {
  // ⚠️ Questo blocco esiste per impedire una "correzione" sbagliata. La prova ha
  // `write_data: true` per decisione di prodotto: si lavora sull'azienda dimostrativa
  // pre-compilata, altrimenti non ci sarebbe niente da provare. Cio' che la prova NON
  // ha e' `create_company` e `generate_pdf` — non puo' farsi aziende proprie ne'
  // portarsi via un documento.
  //
  // Un test scritto d'istinto pretenderebbe che la prova non scriva niente, e chi lo
  // vedesse rosso "aggiusterebbe" il prodotto rendendo la dimostrativa inutile.
  for (const s of SCRITTURE) {
    it(`${s.nome} riesce`, async () => {
      const prima = await s.righe(P.orgId);
      await expect(s.fai(P.userId, P.orgId, P.companyId)).resolves.toBeTruthy();
      expect(await s.righe(P.orgId)).toBe(prima + 1);
    });
  }
});

describe("nessuno tocca il lavoro di un altro studio", () => {
  // ⚠️ Qui a fermare non e' l'abbonamento ma il CONFINE DI TENANT, ed e' giusto
  // che sia cosi': un account in prova che pagasse domani continuerebbe a non
  // dover vedere il programma di un altro studio.
  it("in prova non compila una scheda di un programma altrui", async () => {
    await expect(
      setCampoScheda(P.userId, P.orgId, progA, "00E", "num_offerta", "RUBATA"),
    ).rejects.toThrow();
    const righe = await db.select().from(sgesgSchedaDato).where(eq(sgesgSchedaDato.programId, progA));
    expect(righe).toEqual([]);
  });

  it("in prova non muove una fase di un programma altrui", async () => {
    await expect(setStatoFase(P.userId, P.orgId, progA, "proc00", "conclusa")).rejects.toThrow();
    expect(await db.select().from(sgesgFase).where(eq(sgesgFase.programId, progA))).toEqual([]);
  });
});

describe("i quattro documenti nuovi stanno dietro alla capacita' di pubblicare", () => {
  // ⚠️ `generate_pdf`, non `write_data`: pubblicare e' l'atto che produce il documento
  // consegnabile, ed e' la capacita' che la prova non ha. Il controllo esiste perche'
  // e' esattamente cio' che si dimentica aggiungendo un tipo nuovo.
  for (const tipo of ["offerta_esg", "verbale_avvio", "diagnosi_esg", "dossier_finale"] as const) {
    it(`in prova non si pubblica ${tipo}`, async () => {
      const prima = (await db.select().from(documentSnapshot).where(eq(documentSnapshot.organizationId, P.orgId)))
        .length;
      await expect(
        publishSgesgSnapshot(P.userId, P.orgId, P.companyId, 2025, tipo),
      ).rejects.toThrow();
      const dopo = (await db.select().from(documentSnapshot).where(eq(documentSnapshot.organizationId, P.orgId)))
        .length;
      expect(dopo).toBe(prima);
    });
  }

  it("chi ha pagato invece pubblica", async () => {
    // La controprova: senza, i controlli qui sopra passerebbero anche se la funzione
    // fosse rotta per tutti.
    const id = await publishSgesgSnapshot(A.userId, A.orgId, A.companyId, 2025, "offerta_esg");
    expect(id).toBeTruthy();
  });
});
