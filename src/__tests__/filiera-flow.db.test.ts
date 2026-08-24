import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { chainPartner, orgEntitlement } from "@/lib/db/schema";
import { creaStudio, pulisciStudio } from "./comune";
import {
  creaPartner,
  creaProgramma,
  eliminaPartner,
  setCampoPartner,
  setFlag,
  setPunteggio,
} from "@/features/filiera/programma";
import { getFiliera } from "@/features/filiera/queries";

// Il ciclo completo della due diligence di filiera, sui fatti del database.
//
// ⚠️ Il caso che conta è il terzo: un partner valutato SOLO sulla governance, con le tre
// aree critiche in bianco. Nel prototipo otteneva maturità 4,0 e rischio residuo Basso,
// con verifica ogni 48 mesi — lo stesso trattamento di chi è stato valutato su tutte e
// sette le aree al massimo. Non aver detto niente su lavoro minorile, lavoro forzato e
// sicurezza veniva premiato come averlo detto bene. Vedi `rischio.ts`, difetto B2.

const RUN = Date.now();
let S: Awaited<ReturnType<typeof creaStudio>>;
let programId: string;

beforeAll(async () => {
  S = await creaStudio({ prefisso: "fil", run: RUN, nomeAzienda: "Filiera Flow S.p.A." });
  await db.insert(orgEntitlement).values({ organizationId: S.orgId, status: "active" });
  programId = await creaProgramma(S.userId, S.orgId, { companyId: S.companyId });
});

afterAll(async () => {
  await pulisciStudio(S.orgId, S.userId);
});

async function leggi() {
  const d = await getFiliera(S.userId, S.orgId, S.companyId);
  if (!d?.programma) throw new Error("programma assente");
  return d;
}

describe("il programma", () => {
  it("nasce col catalogo congelato e senza partner", async () => {
    const d = await leggi();
    expect(d.programma!.contentSetId).toBe("filiera-v1");
    expect(d.partner).toHaveLength(0);
    expect(d.quadro!.coperturaSpesa).toBe(0);
  });

  it("porta i quattro assi, le sette aree, i cinque fattori e le sei fasi", async () => {
    const d = await leggi();
    expect(d.dimensioni).toHaveLength(4);
    expect(d.aree).toHaveLength(7);
    expect(d.flags).toHaveLength(5);
    expect(d.fasi).toHaveLength(6);
  });
});

describe("un partner valutato su tutto", () => {
  let id: string;

  beforeAll(async () => {
    id = await creaPartner(S.userId, S.orgId, programId, { nome: "Completo S.r.l.", paese: "Italia" });
    await setCampoPartner(S.userId, S.orgId, id, { campo: "spesa", valore: 100_000 });
    for (const [chiave, valore] of [["rp", 3], ["rs", 3], ["rpr", 3], ["rm", 3]] as const) {
      await setPunteggio(S.userId, S.orgId, id, { genere: "dim", chiave, valore });
    }
    for (const chiave of ["gov", "min", "forz", "ora", "foa", "hs", "amb"]) {
      await setPunteggio(S.userId, S.orgId, id, { genere: "area", chiave, valore: 4 });
    }
  });

  it("ha rischio inerente Alta e maturità piena", async () => {
    const d = await leggi();
    const p = d.partner!.find((x) => x.partner.id === id)!;
    expect(p.categoria).toBe("Alta");
    expect(p.maturita).toBe(4);
    expect(p.criticheMancanti).toEqual([]);
  });

  it("il residuo e la frequenza di verifica escono dalla matrice", async () => {
    const d = await leggi();
    const p = d.partner!.find((x) => x.partner.id === id)!;
    expect(p.residuo).toBe("Medio");
    expect(p.mesiVerifica).toBe(36);
  });
});

describe("⚠️ il partner che ha risposto SOLO sulla governance", () => {
  let id: string;

  beforeAll(async () => {
    id = await creaPartner(S.userId, S.orgId, programId, { nome: "Silenzioso Ltd.", paese: "Malesia" });
    await setCampoPartner(S.userId, S.orgId, id, { campo: "spesa", valore: 100_000 });
    for (const [chiave, valore] of [["rp", 3], ["rs", 3]] as const) {
      await setPunteggio(S.userId, S.orgId, id, { genere: "dim", chiave, valore });
    }
    await setPunteggio(S.userId, S.orgId, id, { genere: "area", chiave: "gov", valore: 4 });
  });

  it("NON ottiene maturità 4: le tre aree critiche in bianco la limitano", async () => {
    const d = await leggi();
    const p = d.partner!.find((x) => x.partner.id === id)!;
    // Nel prototipo qui usciva 4. Il tetto parte dal valore più basso quando le aree
    // critiche mancano, quindi 1 + 0,9.
    expect(p.maturita).toBeCloseTo(1.9, 5);
  });

  it("e le tre aree mancanti sono dichiarate per nome", async () => {
    const d = await leggi();
    const p = d.partner!.find((x) => x.partner.id === id)!;
    expect(p.criticheMancanti).toHaveLength(3);
  });

  it("il residuo NON è Basso e la verifica non slitta a 48 mesi", async () => {
    const d = await leggi();
    const p = d.partner!.find((x) => x.partner.id === id)!;
    expect(p.residuo).not.toBe("Basso");
    expect(p.mesiVerifica).not.toBe(48);
  });

  it("valutare davvero le aree critiche fa risalire la maturità", async () => {
    for (const chiave of ["min", "forz", "hs"]) {
      await setPunteggio(S.userId, S.orgId, id, { genere: "area", chiave, valore: 4 });
    }
    const d = await leggi();
    const p = d.partner!.find((x) => x.partner.id === id)!;
    expect(p.maturita).toBe(4);
    expect(p.criticheMancanti).toEqual([]);
    // La correzione colpisce l'omissione, non la valutazione.
  });
});

describe("i fattori aggravanti", () => {
  let id: string;

  beforeAll(async () => {
    id = await creaPartner(S.userId, S.orgId, programId, { nome: "Con Flag S.r.l.", paese: "Italia" });
    for (const [chiave, valore] of [["rp", 1], ["rs", 1]] as const) {
      await setPunteggio(S.userId, S.orgId, id, { genere: "dim", chiave, valore });
    }
  });

  it("senza flag il rischio inerente resta Bassa", async () => {
    const d = await leggi();
    expect(d.partner!.find((x) => x.partner.id === id)!.categoria).toBe("Bassa");
  });

  it("un flag solo lo porta ad Alta", async () => {
    await setFlag(S.userId, S.orgId, id, { chiave: "f_ag", acceso: true });
    const d = await leggi();
    expect(d.partner!.find((x) => x.partner.id === id)!.categoria).toBe("Alta");
  });

  it("accendere due volte lo stesso flag non lo duplica", async () => {
    await setFlag(S.userId, S.orgId, id, { chiave: "f_ag", acceso: true });
    const [row] = await db.select().from(chainPartner).where(eq(chainPartner.id, id));
    expect(row!.flag).toEqual(["f_ag"]);
  });

  it("spegnerlo lo riporta a Bassa", async () => {
    await setFlag(S.userId, S.orgId, id, { chiave: "f_ag", acceso: false });
    const d = await leggi();
    expect(d.partner!.find((x) => x.partner.id === id)!.categoria).toBe("Bassa");
  });
});

describe("un punteggio tolto non diventa zero: sparisce", () => {
  it("togliendo l'ultima dimensione il partner torna non valutato", async () => {
    const id = await creaPartner(S.userId, S.orgId, programId, { nome: "Da Azzerare S.r.l." });
    await setPunteggio(S.userId, S.orgId, id, { genere: "dim", chiave: "rp", valore: 3 });
    expect((await leggi()).partner!.find((x) => x.partner.id === id)!.categoria).toBe("Alta");

    await setPunteggio(S.userId, S.orgId, id, { genere: "dim", chiave: "rp", valore: null });
    const p = (await leggi()).partner!.find((x) => x.partner.id === id)!;
    expect(p.categoria).toBeNull();
    expect(p.residuo).toBeNull();
    await eliminaPartner(S.userId, S.orgId, id);
  });
});

describe("⚠️ i rapporti cessati escono da OGNI conteggio, spesa compresa", () => {
  let id: string;

  beforeAll(async () => {
    id = await creaPartner(S.userId, S.orgId, programId, { nome: "Cessato Grosso S.p.A." });
    await setCampoPartner(S.userId, S.orgId, id, { campo: "spesa", valore: 5_000_000 });
  });

  it("finché è attivo pesa sulla spesa e abbassa la copertura", async () => {
    const q = (await leggi()).quadro!;
    expect(q.spesaViva).toBeGreaterThanOrEqual(5_000_000);
    expect(q.coperturaSpesa).toBeLessThan(10);
  });

  it("dichiararlo cessato lo toglie dalla spesa e la copertura risale", async () => {
    await setCampoPartner(S.userId, S.orgId, id, { campo: "stato", valore: "Cessato" });
    const q = (await leggi()).quadro!;
    // Nel prototipo la spesa totale includeva i cessati mentre i conteggi per numerosità
    // no: un cessato grosso schiacciava ogni percentuale di copertura.
    expect(q.spesaViva).toBeLessThan(5_000_000);
    expect(q.coperturaSpesa).toBeGreaterThan(50);
    expect(q.cessati).toBe(1);
  });
});

describe("la validazione", () => {
  it("rifiuta un partner senza ragione sociale", async () => {
    await expect(creaPartner(S.userId, S.orgId, programId, { nome: "   " })).rejects.toThrow();
  });

  it("rifiuta un punteggio fuori dalla scala 1÷4", async () => {
    const id = (await leggi()).partner![0]!.partner.id;
    await expect(
      setPunteggio(S.userId, S.orgId, id, { genere: "dim", chiave: "rp", valore: 5 }),
    ).rejects.toThrow();
  });

  it("rifiuta una spesa negativa", async () => {
    const id = (await leggi()).partner![0]!.partner.id;
    await expect(
      setCampoPartner(S.userId, S.orgId, id, { campo: "spesa", valore: -1 }),
    ).rejects.toThrow();
  });

  it("rifiuta uno stato del rapporto inventato", async () => {
    const id = (await leggi()).partner![0]!.partner.id;
    await expect(
      setCampoPartner(S.userId, S.orgId, id, { campo: "stato", valore: "Boh" as never }),
    ).rejects.toThrow();
  });
});
