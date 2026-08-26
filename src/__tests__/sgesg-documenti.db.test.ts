import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  documentCodice,
  documentSnapshot,
  orgEntitlement,
  sgesgFase,
  sgesgProgramma,
  sgesgSchedaDato,
} from "@/lib/db/schema";
import { creaStudio, pulisciStudio } from "./comune";
import { creaProgramma } from "@/features/sgesg/programma";
import { setCampoScheda } from "@/features/sgesg/schede";
import { publishSgesgSnapshot } from "@/features/documents/snapshot";
import { DOCUMENTI_SGESG, documentiDellaFase, documentoSgesg } from "@/features/sgesg/documenti";
import { DOCUMENTI, TIPI_DOCUMENTO } from "@/features/documents/tipi";
import { sgesgSchedaDef } from "@/lib/db/schema";

// I quattro documenti del metodo ESG.
//
// ⚠️ Passano dalla strozzatura `salvaSnapshot`, e questo file lo PROVA invece di
// crederlo: marchio congelato, edizione dei contenuti, codice di verifica. Se un domani
// qualcuno scrivesse una funzione di pubblicazione che salta la strozzatura, questi
// controlli cadrebbero.

const RUN = Date.now();
const ANNO = 2025;
let A: Awaited<ReturnType<typeof creaStudio>>;
let progA = "";

async function pulisci(orgId: string) {
  const snap = await db.select({ id: documentSnapshot.id }).from(documentSnapshot).where(eq(documentSnapshot.organizationId, orgId));
  for (const s of snap) await db.delete(documentCodice).where(eq(documentCodice.snapshotId, s.id));
  await db.delete(documentSnapshot).where(eq(documentSnapshot.organizationId, orgId));
  await db.delete(sgesgSchedaDato).where(eq(sgesgSchedaDato.organizationId, orgId));
  await db.delete(sgesgFase).where(eq(sgesgFase.organizationId, orgId));
  await db.delete(sgesgProgramma).where(eq(sgesgProgramma.organizationId, orgId));
}

beforeAll(async () => {
  A = await creaStudio({ prefisso: "sgd-a", run: RUN, nomeAzienda: "Azienda dei documenti" });
  await db.insert(orgEntitlement).values({ organizationId: A.orgId, status: "active" });
  progA = await creaProgramma(A.userId, A.orgId, { companyId: A.companyId, anno: ANNO });
});

afterAll(async () => {
  await pulisci(A.orgId);
  await pulisciStudio(A.orgId, A.userId);
});

describe("il registro dei quattro documenti", () => {
  it("ogni documento del metodo e' un tipo registrato, con nome e nome di file", () => {
    for (const d of DOCUMENTI_SGESG) {
      expect(TIPI_DOCUMENTO, `${d.tipo} non e' un tipo di documento`).toContain(d.tipo);
      expect(DOCUMENTI[d.tipo].nome.length).toBeGreaterThan(3);
      expect(DOCUMENTI[d.tipo].file).toMatch(/^[a-z-]+$/);
      // ⚠️ Sono ANNUALI: un'offerta del 2025 e una del 2026 sono due documenti, non due
      // revisioni dello stesso. Con `mostraAnno: false` finirebbero nel ramo
      // `SENZA_ESERCIZIO`, dove l'unicita' e' (azienda, tipo, versione).
      expect(DOCUMENTI[d.tipo].mostraAnno, `${d.tipo} non e' annuale`).toBe(true);
    }
  });

  it("ogni documento nomina schede che esistono nel catalogo", async () => {
    const chiavi = new Set(
      (await db.select({ key: sgesgSchedaDef.key }).from(sgesgSchedaDef).where(eq(sgesgSchedaDef.setId, "sgesg-v1")))
        .map((r) => r.key),
    );
    for (const d of DOCUMENTI_SGESG) {
      expect(d.schede.length, `${d.tipo} non ha schede`).toBeGreaterThan(0);
      for (const k of d.schede) {
        expect(chiavi.has(k), `${d.tipo} cita la scheda inesistente ${k}`).toBe(true);
      }
    }
  });

  it("nessuna fase produce due volte lo stesso documento", () => {
    const tipi = DOCUMENTI_SGESG.map((d) => d.tipo);
    expect(new Set(tipi).size).toBe(tipi.length);
    expect(documentiDellaFase("proc00").map((d) => d.tipo)).toEqual(["offerta_esg"]);
    expect(documentiDellaFase("proc02")).toEqual([]);
  });
});

describe("pubblicazione", () => {
  it("congela il compilato delle schede che il documento dichiara", async () => {
    await setCampoScheda(A.userId, A.orgId, progA, "00E", "validita_gg", "30");
    const id = await publishSgesgSnapshot(A.userId, A.orgId, A.companyId, ANNO, "offerta_esg");
    const [snap] = await db.select().from(documentSnapshot).where(eq(documentSnapshot.id, id));
    const d = snap.dati as Record<string, unknown>;
    expect(snap.tipo).toBe("offerta_esg");
    expect(snap.anno).toBe(ANNO);
    const schede = d.schede as { key: string; dati: Record<string, unknown> }[];
    expect(schede.map((s) => s.key)).toEqual(["00E"]);
    expect(schede[0].dati.validita_gg).toBe("30");
  });

  it("porta il MARCHIO e l'EDIZIONE, perche' passa dalla strozzatura", async () => {
    // ⚠️ Non si verifica che il codice li scriva: si verifica che ci SIANO. E' il modo
    // di accorgersi se un domani qualcuno pubblicasse saltando `salvaSnapshot`.
    const [snap] = await db
      .select()
      .from(documentSnapshot)
      .where(and(eq(documentSnapshot.organizationId, A.orgId), eq(documentSnapshot.tipo, "offerta_esg")));
    const d = snap.dati as Record<string, unknown>;
    expect(d).toHaveProperty("marchio");
    // ⚠️ L'edizione sta DENTRO `dati`, non in una colonna dello snapshot: la scrive
    // `salvaSnapshot` insieme al marchio, ed e' proprio per questo che trovarla qui
    // prova che il documento e' passato dalla strozzatura.
    expect(d.edizione).toBe("sgesg-v1");
  });

  it("riceve un codice di verifica, come ogni documento emesso", async () => {
    const [snap] = await db
      .select()
      .from(documentSnapshot)
      .where(and(eq(documentSnapshot.organizationId, A.orgId), eq(documentSnapshot.tipo, "offerta_esg")));
    const [cod] = await db.select().from(documentCodice).where(eq(documentCodice.snapshotId, snap.id));
    expect(cod).toBeDefined();
    expect(cod.tipo).toBe("offerta_esg");
    expect(cod.anno).toBe(ANNO);
  });

  it("il documento DICHIARA cio' che non contiene", async () => {
    const id = await publishSgesgSnapshot(A.userId, A.orgId, A.companyId, ANNO, "diagnosi_esg");
    const [snap] = await db.select().from(documentSnapshot).where(eq(documentSnapshot.id, id));
    const d = snap.dati as Record<string, unknown>;
    // ⚠️ Lo snapshot e' immutabile: cio' che si scrive oggi resta scritto per sempre, e
    // allora si scrive il vero. Il rapporto di diagnosi non porta il registro delle
    // lacune, e lo dice in apertura invece di lasciarlo intuire.
    expect(String(d.avvertenza)).toMatch(/registri a righe/i);
    expect(String(d.avvertenza)).toMatch(/lacune/i);
  });

  it("ripubblicare crea la versione successiva, e la prima resta", async () => {
    const primi = await db
      .select()
      .from(documentSnapshot)
      .where(and(eq(documentSnapshot.organizationId, A.orgId), eq(documentSnapshot.tipo, "offerta_esg")));
    await setCampoScheda(A.userId, A.orgId, progA, "00E", "validita_gg", "60");
    await publishSgesgSnapshot(A.userId, A.orgId, A.companyId, ANNO, "offerta_esg");
    const dopo = await db
      .select()
      .from(documentSnapshot)
      .where(and(eq(documentSnapshot.organizationId, A.orgId), eq(documentSnapshot.tipo, "offerta_esg")));
    expect(dopo.length).toBe(primi.length + 1);
    expect(Math.max(...dopo.map((s) => s.versione))).toBe(2);

    // ⚠️ La versione 1 NON e' cambiata: e' cio' che l'immutabilita' significa, e il
    // cliente ha in mano quella.
    const v1 = dopo.find((s) => s.versione === 1)!;
    const schede = (v1.dati as { schede: { dati: Record<string, unknown> }[] }).schede;
    expect(schede[0].dati.validita_gg).toBe("30");
  });

  it("senza programma non si pubblica niente", async () => {
    await expect(
      publishSgesgSnapshot(A.userId, A.orgId, A.companyId, 2019, "offerta_esg"),
    ).rejects.toThrow(/Nessun programma/i);
  });

  it("un tipo che non appartiene al metodo viene rifiutato", () => {
    expect(documentoSgesg("ghg")).toBeNull();
  });
});
