import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { db } from "@/lib/db";
import {
  orgEntitlement,
  corpusBlock,
  corpusBlockOverride,
  corpusDocState,
  corpusRegisterRow,
} from "@/lib/db/schema";
import { setStatoDocumento, setOverride } from "@/features/corpus/documenti";
import { aggiungiRiga, aggiornaRiga, eliminaRiga } from "@/features/corpus/registri";
import { creaStudio, pulisciStudio } from "./comune";
import { and, count, eq } from "drizzle-orm";

// Il servizio del corpus. Tre cose sono da provare e non da dedurre: il progressivo che
// non si duplica, l'aggiornamento per singolo campo che non azzera gli altri, e i confini
// che devono rifiutare.

const url = process.env.DATABASE_URL;
const RUN = Date.now();
const SET = "wb-v1";
const REG = "ritorsioni";

let S: Awaited<ReturnType<typeof creaStudio>>;
let A: Awaited<ReturnType<typeof creaStudio>>;

describe.skipIf(!url)("il servizio del corpus", () => {
  beforeAll(async () => {
    S = await creaStudio({
      prefisso: "cflow",
      run: RUN,
      nomeStudio: "Studio Flusso",
      nomeAzienda: "Azienda Flusso",
    });
    // L'entitlement resta scritto qui e non in un aiutante condiviso: in alcuni test
    // questa riga E' il test, e nasconderla toglierebbe la spiegazione insieme alla
    // ripetizione.
    await db.insert(orgEntitlement).values({ organizationId: S.orgId, status: "active" });

    A = await creaStudio({
      prefisso: "cflow-altro",
      run: RUN,
      nomeStudio: "Studio Altro",
      nomeAzienda: "Azienda Altrui",
    });
    await db.insert(orgEntitlement).values({ organizationId: A.orgId, status: "active" });
  });

  afterAll(async () => {
    for (const st of [S, A]) {
      await db.delete(corpusRegisterRow).where(eq(corpusRegisterRow.organizationId, st.orgId));
      await db.delete(corpusBlockOverride).where(eq(corpusBlockOverride.organizationId, st.orgId));
      await db.delete(corpusDocState).where(eq(corpusDocState.organizationId, st.orgId));
      await db.delete(orgEntitlement).where(eq(orgEntitlement.organizationId, st.orgId));
      await pulisciStudio(st.orgId, st.userId);
    }
  });

  // ⚠️ Il difetto B6, provato sul percorso applicativo e non solo sul vincolo.
  it("il progressivo cresce, e una cancellazione NON lo fa riciclare", async () => {
    const base = { companyId: S.companyId, contentSetId: SET, registerId: REG };
    const uno = await aggiungiRiga(S.userId, S.orgId, { ...base, dati: { sogg: "COD-1" } });
    const due = await aggiungiRiga(S.userId, S.orgId, { ...base, dati: { sogg: "COD-2" } });
    const tre = await aggiungiRiga(S.userId, S.orgId, { ...base, dati: { sogg: "COD-3" } });

    expect([uno.numero, due.numero, tre.numero]).toEqual([1, 2, 3]);
    expect([uno.riferimento, due.riferimento, tre.riferimento]).toEqual(["RT001", "RT002", "RT003"]);

    // Nei prototipi il numero viene da `righe.length + 1`: cancellata una riga di mezzo,
    // la successiva riuserebbe il 3 e due righe porterebbero lo stesso riferimento.
    await db.delete(corpusRegisterRow).where(eq(corpusRegisterRow.id, due.id));
    const quattro = await aggiungiRiga(S.userId, S.orgId, { ...base, dati: { sogg: "COD-4" } });
    expect(quattro.numero, "il progressivo non torna indietro").toBe(4);
    expect(quattro.riferimento).toBe("RT004");
  });

  it("modificare una riga fonde i campi invece di sostituirli", async () => {
    const r = await aggiungiRiga(S.userId, S.orgId, {
      companyId: S.companyId,
      contentSetId: SET,
      registerId: REG,
      dati: { sogg: "COD-M", qual: "Segnalante", mot: "motivazione iniziale" },
    });
    await aggiornaRiga(S.userId, S.orgId, {
      companyId: S.companyId,
      rowId: r.id,
      dati: { qual: "Facilitatore" },
    });

    const [dopo] = await db.select().from(corpusRegisterRow).where(eq(corpusRegisterRow.id, r.id));
    const dati = dopo.dati as Record<string, string>;
    expect(dati.qual, "il campo toccato cambia").toBe("Facilitatore");
    expect(dati.sogg, "gli altri restano").toBe("COD-M");
    expect(dati.mot, "anche quelli scritti prima").toBe("motivazione iniziale");

    // Un valore svuotato si toglie: una cella vuota e una cella con "" sono la stessa cosa
    // per chi legge, e due rappresentazioni della stessa cosa divergono sempre.
    await aggiornaRiga(S.userId, S.orgId, {
      companyId: S.companyId,
      rowId: r.id,
      dati: { mot: "" },
    });
    const [poi] = await db.select().from(corpusRegisterRow).where(eq(corpusRegisterRow.id, r.id));
    expect("mot" in (poi.dati as object), "il campo svuotato sparisce").toBe(false);
    expect((poi.dati as Record<string, string>).sogg).toBe("COD-M");
  });

  it("non si modifica ne' si elimina la riga di un altro studio", async () => {
    const mia = await aggiungiRiga(S.userId, S.orgId, {
      companyId: S.companyId,
      contentSetId: SET,
      registerId: REG,
      dati: { sogg: "COD-X" },
    });
    await expect(
      aggiornaRiga(A.userId, A.orgId, { companyId: A.companyId, rowId: mia.id, dati: { sogg: "hack" } }),
    ).rejects.toThrow(/inesistente o di un altro studio/i);
    await expect(eliminaRiga(A.userId, A.orgId, A.companyId, mia.id)).rejects.toThrow(
      /inesistente o di un altro studio/i,
    );

    // La prova sta nel database, non nel messaggio.
    const [dopo] = await db.select().from(corpusRegisterRow).where(eq(corpusRegisterRow.id, mia.id));
    expect(dopo, "la riga esiste ancora").toBeTruthy();
    expect((dopo.dati as Record<string, string>).sogg).toBe("COD-X");
  });

  it("eliminare una riga non rinumera le altre", async () => {
    const base = { companyId: S.companyId, contentSetId: SET, registerId: "eventi" };
    const a = await aggiungiRiga(S.userId, S.orgId, { ...base, dati: {} });
    const b = await aggiungiRiga(S.userId, S.orgId, { ...base, dati: {} });
    const c = await aggiungiRiga(S.userId, S.orgId, { ...base, dati: {} });
    expect([a.numero, b.numero, c.numero]).toEqual([1, 2, 3]);

    await eliminaRiga(S.userId, S.orgId, S.companyId, b.id);
    const [terza] = await db.select().from(corpusRegisterRow).where(eq(corpusRegisterRow.id, c.id));
    expect(terza.numero, "i riferimenti gia' scritti altrove restano validi").toBe(3);
  });

  it("un campo non previsto dal registro viene rifiutato", async () => {
    await expect(
      aggiungiRiga(S.userId, S.orgId, {
        companyId: S.companyId,
        contentSetId: SET,
        registerId: REG,
        dati: { sogg: "COD-9", campo_inventato: "x" },
      }),
    ).rejects.toThrow(/non previsti.*campo_inventato/i);
  });

  it("un registro che non esiste viene rifiutato", async () => {
    await expect(
      aggiungiRiga(S.userId, S.orgId, {
        companyId: S.companyId,
        contentSetId: SET,
        registerId: "registro_inventato",
        dati: {},
      }),
    ).rejects.toThrow(/non presente nel corpus/i);
  });

  // Il confine fra due studi si prova col FATTO, non col messaggio: la riga che non
  // compare nel database e' la certezza, il rifiuto a schermo e' solo un indizio.
  it("non si scrive sull'azienda di un altro studio", async () => {
    await expect(
      aggiungiRiga(S.userId, S.orgId, {
        companyId: A.companyId,
        contentSetId: SET,
        registerId: REG,
        dati: { sogg: "intruso" },
      }),
    ).rejects.toThrow(/altro studio/i);

    const [{ n }] = await db
      .select({ n: count() })
      .from(corpusRegisterRow)
      .where(eq(corpusRegisterRow.companyId, A.companyId));
    expect(n, "nessuna riga scritta sull'azienda altrui").toBe(0);
  });

  // ⚠️ La regola nata in Fase 7 e ripetuta in Fase 12: mai rimandare la riga intera.
  it("aggiornare un campo NON azzera gli altri", async () => {
    const doc = { companyId: S.companyId, contentSetId: SET, docCode: "PWB-01" };
    await setStatoDocumento(S.userId, S.orgId, { ...doc, note: "una nota che deve restare" });
    await setStatoDocumento(S.userId, S.orgId, { ...doc, revisione: "07" });
    await setStatoDocumento(S.userId, S.orgId, { ...doc, stato: "approvato" });

    const [r] = await db
      .select()
      .from(corpusDocState)
      .where(
        and(
          eq(corpusDocState.companyId, S.companyId),
          eq(corpusDocState.contentSetId, SET),
          eq(corpusDocState.docCode, "PWB-01"),
        ),
      );
    expect(r.note, "la nota e' sopravvissuta a due scritture successive").toBe(
      "una nota che deve restare",
    );
    expect(r.revisione).toBe("07");
    expect(r.stato).toBe("approvato");
  });

  it("un documento che non esiste nel corpus viene rifiutato", async () => {
    await expect(
      setStatoDocumento(S.userId, S.orgId, {
        companyId: S.companyId,
        contentSetId: SET,
        docCode: "PWB-99",
        stato: "approvato",
      }),
    ).rejects.toThrow(/non presente nel corpus/i);
  });

  it("il testo su misura si scrive, e un testo vuoto lo RIMUOVE", async () => {
    const [b] = await db
      .select()
      .from(corpusBlock)
      .where(eq(corpusBlock.contentSetId, SET))
      .limit(1);
    const rif = {
      companyId: S.companyId,
      contentSetId: b.contentSetId,
      docCode: b.docCode,
      blockId: b.blockId,
    };

    const scritto = await setOverride(S.userId, S.orgId, { ...rif, testo: "testo su misura" });
    expect(scritto.rimosso).toBe(false);

    const [dopo] = await db
      .select()
      .from(corpusBlockOverride)
      .where(
        and(
          eq(corpusBlockOverride.companyId, S.companyId),
          eq(corpusBlockOverride.blockId, b.blockId),
        ),
      );
    expect(dopo.testo).toBe("testo su misura");

    // Vuoto significa «torna all'originale»: si cancella invece di salvare una stringa
    // vuota, cosi' il segno «testo su misura» accanto al documento resta veritiero.
    const tolto = await setOverride(S.userId, S.orgId, { ...rif, testo: "   " });
    expect(tolto.rimosso).toBe(true);
    const [{ n }] = await db
      .select({ n: count() })
      .from(corpusBlockOverride)
      .where(eq(corpusBlockOverride.companyId, S.companyId));
    expect(n).toBe(0);
  });

  it("un blocco inventato viene rifiutato dalla chiave esterna", async () => {
    // Drizzle incapsula l'errore di Postgres: il nome del vincolo sta nella CAUSA, e un
    // controllo sul solo messaggio esterno fallirebbe pur essendo stato bloccato davvero.
    const messaggio = (e: unknown) => {
      const err = e as { message?: string; cause?: { message?: string } };
      return `${err?.message ?? ""} ${err?.cause?.message ?? ""}`;
    };
    await expect(
      setOverride(S.userId, S.orgId, {
        companyId: S.companyId,
        contentSetId: SET,
        docCode: "PWB-01",
        blockId: "chiave_mai_esistita",
        testo: "non deve entrare",
      }).catch((e) => Promise.reject(new Error(messaggio(e)))),
    ).rejects.toThrow(/corpus_block_override_block_fk|foreign key|violates/i);

    const [{ n }] = await db
      .select({ n: count() })
      .from(corpusBlockOverride)
      .where(eq(corpusBlockOverride.companyId, S.companyId));
    expect(n, "niente e' entrato").toBe(0);
  });

  it("uno studio senza capacita' di scrivere non scrive", async () => {
    await db
      .update(orgEntitlement)
      .set({ status: "expired" })
      .where(eq(orgEntitlement.organizationId, A.orgId));
    await expect(
      aggiungiRiga(A.userId, A.orgId, {
        companyId: A.companyId,
        contentSetId: SET,
        registerId: REG,
        dati: {},
      }),
      // Un `toThrow()` nudo passerebbe per QUALUNQUE errore -- anche per un refuso nel
      // nome di una tabella. Qui si pretende il rifiuto giusto.
    ).rejects.toThrow(/sola lettura/i);

    const [{ n }] = await db
      .select({ n: count() })
      .from(corpusRegisterRow)
      .where(eq(corpusRegisterRow.organizationId, A.orgId));
    expect(n, "la prova e' la riga che non c'e'").toBe(0);
  });
});
