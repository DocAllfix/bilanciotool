import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { and, eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { orgEntitlement, nis2Assessment, nis2Profile, nis2RequirementState, nis2System } from "@/lib/db/schema";
import { creaStudio, pulisciStudio, type Studio } from "./comune";
import {
  aggiornaAmbito,
  aggiornaAssetto,
  creaAutovalutazione,
  creaSistema,
  getQuadro,
  setCampoRequisito,
} from "@/features/nis2/profilo";

// IL CICLO DEI DUE PERCORSI NIS2, sui fatti scritti nel database.
//
// ⚠️ Il test che vale piu' di tutti sta in fondo: **una risposta sola per requisito**. E'
// la decisione che governa tutto lo schema, ed e' l'unica che, se qualcuno un domani la
// disfacesse separando le tabelle, non produrrebbe nessun errore — solo due numeri diversi
// per la stessa azienda, in due schermate che si aprono entrambe.

const url = process.env.DATABASE_URL;
const run = Date.now();

describe.skipIf(!url)("NIS2: il ciclo dei due percorsi", () => {
  let S: Studio;

  beforeAll(async () => {
    S = await creaStudio({ prefisso: "nis2", run, nomeAzienda: "Reti Adriatiche S.p.A." });
    await db.insert(orgEntitlement).values({ organizationId: S.orgId, status: "active" });
  });

  afterAll(async () => {
    await db.delete(nis2RequirementState).where(eq(nis2RequirementState.organizationId, S.orgId));
    await db.delete(nis2Assessment).where(eq(nis2Assessment.organizationId, S.orgId));
    await db.delete(nis2System).where(eq(nis2System.organizationId, S.orgId));
    await db.delete(nis2Profile).where(eq(nis2Profile.organizationId, S.orgId));
    await pulisciStudio(S.orgId, S.userId);
  });

  it("prima che qualcuno apra un percorso, il profilo non c'e' e il catalogo si', ", async () => {
    const q = await getQuadro(S.userId, S.orgId, S.companyId, "autovalutazione");
    expect(q).not.toBeNull();
    expect(q!.profilo).toBeNull();
    expect(q!.ambito).toBeNull();
    // I ventitre settori e gli otto criteri arrivano comunque: servono a compilare la
    // scheda d'ambito, che e' la prima cosa che si fa.
    expect(q!.allegati.primo.length + q!.allegati.secondo.length).toBe(23);
    expect(q!.criteri).toHaveLength(8);
  });

  it("aprire l'autovalutazione crea la sua radice e il profilo condiviso", async () => {
    const id = await creaAutovalutazione(S.userId, S.orgId, S.companyId);
    expect(id).toBeTruthy();

    const profili = await db
      .select()
      .from(nis2Profile)
      .where(eq(nis2Profile.companyId, S.companyId));
    expect(profili).toHaveLength(1);
    expect(profili[0].obiettivo).toBe(3);

    // ⚠️ E NON accende l'altro percorso. Con una radice sola condivisa, il portafoglio
    // avrebbe mostrato come avviato un percorso che nessuno ha aperto.
    const sistemi = await db.select().from(nis2System).where(eq(nis2System.companyId, S.companyId));
    expect(sistemi).toHaveLength(0);
  });

  it("riaprirla non ne crea una seconda", async () => {
    const a = await creaAutovalutazione(S.userId, S.orgId, S.companyId);
    const b = await creaAutovalutazione(S.userId, S.orgId, S.companyId);
    expect(a).toBe(b);
    expect(await db.select().from(nis2Assessment).where(eq(nis2Assessment.companyId, S.companyId)))
      .toHaveLength(1);
  });

  it("l'ambito si calcola e non si persiste", async () => {
    await aggiornaAmbito(S.userId, S.orgId, S.companyId, {
      settore: "Energia",
      dimensione: "grande",
      criteri: [],
    });
    const q = await getQuadro(S.userId, S.orgId, S.companyId, "autovalutazione");
    expect(q!.ambito!.classe).toBe("essenziale");
    expect(q!.ambito!.via).toBe("grande_allegato_1");
    expect(q!.ambito!.sanzione).toEqual({ massimo: 10_000_000, percentuale: 2 });

    // ⚠️ Nel database non c'e' nessuna colonna `classe`: se ci fosse, potrebbe restare
    // indietro rispetto ai suoi ingredienti e sarebbe indistinguibile da una
    // classificazione corretta.
    const [riga] = await db.select().from(nis2Profile).where(eq(nis2Profile.companyId, S.companyId));
    expect(Object.keys(riga)).not.toContain("classe");
    expect(riga.settore).toBe("Energia");
  });

  it("un criterio specifico scavalca la dimensione, e si vede sul dato vero", async () => {
    await aggiornaAmbito(S.userId, S.orgId, S.companyId, {
      settore: "Commercio al dettaglio",
      dimensione: "micro",
      criteri: ["c1"],
    });
    const q = await getQuadro(S.userId, S.orgId, S.companyId, "autovalutazione");
    expect(q!.ambito!.classe).toBe("essenziale");
    expect(q!.ambito!.via).toBe("criterio_specifico");

    // Tolto il criterio, quella micro impresa non e' piu' classificabile da qui: il
    // settore non sta in nessuno dei due allegati.
    await aggiornaAmbito(S.userId, S.orgId, S.companyId, { criteri: [] });
    const dopo = await getQuadro(S.userId, S.orgId, S.companyId, "autovalutazione");
    expect(dopo!.ambito!.classe).toBeNull();
    expect(dopo!.ambito!.via).toBe("settore_non_elencato");

    await aggiornaAmbito(S.userId, S.orgId, S.companyId, { settore: "Energia", dimensione: "grande" });
  });

  it("l'assetto si aggiorna, e una data impossibile non passa", async () => {
    await aggiornaAssetto(S.userId, S.orgId, S.companyId, {
      responsabile: "M. Rossi",
      comunicazioneIl: "2026-01-15",
    });
    const [riga] = await db.select().from(nis2Profile).where(eq(nis2Profile.companyId, S.companyId));
    expect(riga.responsabile).toBe("M. Rossi");
    expect(riga.comunicazioneIl).toBe("2026-01-15");

    // ⚠️ `new Date("2026-02-31")` non solleva: scivola al 3 marzo. Da una data che
    // nessuno ha scritto discenderebbero i termini della roadmap.
    await expect(
      aggiornaAssetto(S.userId, S.orgId, S.companyId, { comunicazioneIl: "2026-02-31" }),
    ).rejects.toThrow();
  });

  it("⚠️ un requisito applicabile e non valutato pesa ZERO", async () => {
    // Un solo requisito al massimo, su 124 applicabili nell'autovalutazione.
    await setCampoRequisito(S.userId, S.orgId, S.companyId, {
      requirementKey: "G.01",
      campo: "livello",
      valore: 4,
    });
    const q = await getQuadro(S.userId, S.orgId, S.companyId, "autovalutazione");
    expect(q!.conformita!.applicabili).toBe(124);
    expect(q!.conformita!.valutati).toBe(1);
    // 100 su 124 requisiti → 1%. Mediando sui soli valutati sarebbe 100.
    expect(q!.conformita!.percentuale).toBe(1);
    expect(q!.conformita!.percentuale).not.toBe(100);
  });

  it("«non applicabile» esce dal denominatore e azzera il livello", async () => {
    await setCampoRequisito(S.userId, S.orgId, S.companyId, {
      requirementKey: "R.01",
      campo: "livello",
      valore: 2,
    });
    await setCampoRequisito(S.userId, S.orgId, S.companyId, {
      requirementKey: "R.01",
      campo: "nonApplicabile",
      valore: true,
    });

    const [riga] = await db
      .select()
      .from(nis2RequirementState)
      .where(
        and(
          eq(nis2RequirementState.companyId, S.companyId),
          eq(nis2RequirementState.requirementKey, "R.01"),
        ),
      );
    // ⚠️ Il livello sparisce: un numero accanto a un «non applicabile» sarebbe un valore
    // che nessuno usa — quel requisito e' fuori dal denominatore — e confonderebbe chi
    // legge la riga. Lo pretende anche un CHECK della migrazione 0055.
    expect(riga.nonApplicabile).toBe(true);
    expect(riga.livello).toBeNull();

    const q = await getQuadro(S.userId, S.orgId, S.companyId, "autovalutazione");
    expect(q!.conformita!.applicabili).toBe(123);
  });

  it("⚠️ salvare un campo NON ne azzera un altro", async () => {
    // E' la regola piu' costosa di questo progetto, alla quinta occorrenza. Il client non
    // manda mai la riga intera: si scrive un campo e gli altri restano.
    await setCampoRequisito(S.userId, S.orgId, S.companyId, {
      requirementKey: "A.01",
      campo: "livello",
      valore: 2,
    });
    await setCampoRequisito(S.userId, S.orgId, S.companyId, {
      requirementKey: "A.01",
      campo: "evidenza",
      valore: "Verbale del 12 marzo",
    });
    await setCampoRequisito(S.userId, S.orgId, S.companyId, {
      requirementKey: "A.01",
      campo: "note",
      valore: "Da riverificare in autunno",
    });

    const [riga] = await db
      .select()
      .from(nis2RequirementState)
      .where(
        and(
          eq(nis2RequirementState.companyId, S.companyId),
          eq(nis2RequirementState.requirementKey, "A.01"),
        ),
      );
    expect(riga.livello).toBe(2);
    expect(riga.evidenza).toBe("Verbale del 12 marzo");
    expect(riga.note).toBe("Da riverificare in autunno");
  });

  it("un requisito che il catalogo non conosce viene RIFIUTATO", async () => {
    // ⚠️ Non scartato a valle: rifiutato. Una riga fantasma non comparirebbe a schermo —
    // la vista rende il catalogo — ma i conteggi la vedrebbero, e la conformita'
    // cambierebbe per una risposta che nessuna schermata mostra.
    await expect(
      setCampoRequisito(S.userId, S.orgId, S.companyId, {
        requirementKey: "Z.99",
        campo: "livello",
        valore: 3,
      }),
    ).rejects.toThrow(/sconosciuto/i);
  });

  it("gli scostamenti sono i valutati SOTTO l'obiettivo, non i non valutati", async () => {
    const q = await getQuadro(S.userId, S.orgId, S.companyId, "autovalutazione");
    const chiavi = q!.conformita!.scostamenti.map((s) => s.key);
    // A.01 sta a 2 con obiettivo 3 → scostamento. G.01 sta a 4 → no. I 121 mai valutati
    // non sono scostamenti: sono una lacuna di istruttoria, e vanno dette altrove.
    expect(chiavi).toContain("A.01");
    expect(chiavi).not.toContain("G.01");
    expect(q!.conformita!.scostamenti.length).toBeLessThan(10);
  });

  it("⚠️ LA RISPOSTA E' UNA SOLA: quella dell'autovalutazione la vede il sistema di gestione", async () => {
    // E' la decisione che governa tutto lo schema. Se un domani qualcuno separasse le
    // tabelle, questo test sarebbe l'unica cosa che se ne accorgerebbe: nessun errore,
    // solo due numeri diversi per la stessa azienda in due schermate che si aprono
    // entrambe, e nessuno saprebbe quale vale.
    await creaSistema(S.userId, S.orgId, S.companyId);

    const auto = await getQuadro(S.userId, S.orgId, S.companyId, "autovalutazione");
    const sistema = await getQuadro(S.userId, S.orgId, S.companyId, "sistema");

    const livello = (q: typeof auto, key: string) =>
      q!.requisiti.find((r) => r.key === key)?.stato?.livello ?? null;

    expect(livello(auto, "G.01")).toBe(4);
    expect(livello(sistema, "G.01")).toBe(4);

    // E la modifica fatta dal sistema si vede nell'autovalutazione.
    await setCampoRequisito(S.userId, S.orgId, S.companyId, {
      requirementKey: "G.01",
      campo: "livello",
      valore: 1,
    });
    const dopo = await getQuadro(S.userId, S.orgId, S.companyId, "autovalutazione");
    expect(livello(dopo, "G.01")).toBe(1);

    // Una riga sola nel database, non due.
    const righe = await db
      .select()
      .from(nis2RequirementState)
      .where(
        and(
          eq(nis2RequirementState.companyId, S.companyId),
          eq(nis2RequirementState.requirementKey, "G.01"),
        ),
      );
    expect(righe).toHaveLength(1);
  });

  it("⚠️ e la garanzia viene dal DATABASE, non dal mio codice", async () => {
    // La prova che conta non e' che le mie funzioni scrivano una riga sola: e' che una
    // SECONDA riga per la stessa coppia non possa esistere, nemmeno scrivendola a mano
    // aggirando il codice. Senza questo, «una risposta sola» sarebbe una convenzione, e
    // le convenzioni si dimenticano.
    await expect(
      db.insert(nis2RequirementState).values({
        organizationId: S.orgId,
        companyId: S.companyId,
        requirementKey: "G.01",
        livello: 0,
      }),
    ).rejects.toThrow();

    const righe = await db
      .select()
      .from(nis2RequirementState)
      .where(
        and(
          eq(nis2RequirementState.companyId, S.companyId),
          eq(nis2RequirementState.requirementKey, "G.01"),
        ),
      );
    // La riga di prima e' intatta: il rifiuto non l'ha toccata.
    expect(righe).toHaveLength(1);
    expect(righe[0].livello).toBe(1);
  });

  it("il PERIMETRO decide che cosa ciascun percorso mostra", async () => {
    const auto = await getQuadro(S.userId, S.orgId, S.companyId, "autovalutazione");
    const sistema = await getQuadro(S.userId, S.orgId, S.companyId, "sistema");

    expect(auto!.requisiti).toHaveLength(124);
    expect(sistema!.requisiti).toHaveLength(126);

    const chiaviAuto = new Set(auto!.requisiti.map((r) => r.key));
    // I due che esistono solo nel sistema di gestione.
    expect(chiaviAuto.has("G.11")).toBe(false);
    expect(chiaviAuto.has("G.12")).toBe(false);
    expect(sistema!.requisiti.some((r) => r.key === "G.11")).toBe(true);

    // ⚠️ E il denominatore della conformita' cambia con lui: sarebbe sbagliato contare
    // nell'autovalutazione due requisiti che quel percorso non mostra e nessuno puo'
    // quindi compilare.
    expect(auto!.conformita!.applicabili).toBeLessThan(sistema!.conformita!.applicabili);
  });
});
