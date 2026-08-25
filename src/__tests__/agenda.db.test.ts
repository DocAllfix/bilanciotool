import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { agendaVoce, orgEntitlement } from "@/lib/db/schema";
import { creaStudio, pulisciStudio } from "./comune";
import {
  conteggioDaFare,
  creaVoce,
  elencaAgenda,
  eliminaVoce,
  oggiIso,
  setCampoVoce,
  setStatoVoce,
} from "@/features/agenda";
import { getScadenzario } from "@/features/companies/scadenzario";

// L'agenda dello studio, e il fatto che NON tocca lo scadenzario.
//
// ⚠️ I due elenchi rispondono a due domande diverse: lo scadenzario si calcola e dice
// quali percorsi sono indietro rispetto a cio' che la norma impone; l'agenda raccoglie
// cio' che lo studio ha deciso. L'ultimo `describe` di questo file prova che restano
// separati — perche' il giorno in cui si mescolassero, spuntare una voce farebbe credere
// chiuso un lavoro che nessuno ha fatto.

const RUN = Date.now();
let A: Awaited<ReturnType<typeof creaStudio>>;
let B: Awaited<ReturnType<typeof creaStudio>>;

beforeAll(async () => {
  A = await creaStudio({ prefisso: "ag-a", run: RUN, nomeAzienda: "Azienda A" });
  B = await creaStudio({ prefisso: "ag-b", run: RUN, nomeAzienda: "Azienda B" });
  for (const s of [A, B]) await db.insert(orgEntitlement).values({ organizationId: s.orgId, status: "active" });
});

afterAll(async () => {
  for (const s of [A, B]) {
    await db.delete(agendaVoce).where(eq(agendaVoce.organizationId, s.orgId));
    await pulisciStudio(s.orgId, s.userId);
  }
});

describe("oggi", () => {
  it("e' il giorno LOCALE, non quello UTC", () => {
    // ⚠️ Alle 00:30 del quindici, `toISOString()` direbbe ancora il quattordici, e «le
    // voci di oggi» mostrerebbe quelle di ieri. Sui termini di legge vale la regola
    // opposta (UTC) e i due casi non si contraddicono: li' conta il termine, qui conta
    // il giorno in cui uno si trova.
    const mezzanotteEMezza = new Date(2026, 2, 15, 0, 30, 0);
    expect(oggiIso(mezzanotteEMezza)).toBe("2026-03-15");
  });

  it("mette lo zero davanti a mesi e giorni a una cifra", () => {
    expect(oggiIso(new Date(2026, 0, 5))).toBe("2026-01-05");
  });
});

describe("agenda", () => {
  it("una voce si crea, si elenca e porta il nome dell'azienda", async () => {
    await creaVoce(A.userId, A.orgId, {
      tipo: "scadenza",
      titolo: "Consegna bozza bilancio",
      data: "2026-09-15",
      companyId: A.companyId,
    });
    const v = await elencaAgenda(A.userId, A.orgId);
    expect(v).toHaveLength(1);
    expect(v[0].titolo).toBe("Consegna bozza bilancio");
    expect(v[0].companyNome).toBe("Azienda A");
    expect(v[0].creataDa).toBe(A.userId);
  });

  it("una voce senza azienda e' legittima", async () => {
    // Meta' del lavoro di uno studio non riguarda un cliente preciso.
    await creaVoce(A.userId, A.orgId, { tipo: "azione", titolo: "Rinnovo accreditamento", data: "2026-10-01" });
    const v = await elencaAgenda(A.userId, A.orgId);
    expect(v.find((x) => x.titolo === "Rinnovo accreditamento")!.companyId).toBeNull();
  });

  it("esce ordinata per data, dalla piu' vicina", async () => {
    await creaVoce(A.userId, A.orgId, { tipo: "azione", titolo: "Telefonata", data: "2026-08-20" });
    const v = await elencaAgenda(A.userId, A.orgId);
    expect(v.map((x) => x.data)).toEqual(["2026-08-20", "2026-09-15", "2026-10-01"]);
  });

  it("una data che non esiste viene rifiutata, non fatta scivolare", async () => {
    // ⚠️ `new Date("2026-02-31")` non solleva: scivola al 3 marzo. Su una consegna
    // promessa a un cliente un giorno inventato non e' un dettaglio.
    await expect(
      creaVoce(A.userId, A.orgId, { tipo: "azione", titolo: "Mai", data: "2026-02-31" }),
    ).rejects.toThrow(/AAAA-MM-GG/);
    expect((await elencaAgenda(A.userId, A.orgId)).find((x) => x.titolo === "Mai")).toBeUndefined();
  });

  it("un titolo vuoto non e' una voce", async () => {
    await expect(
      creaVoce(A.userId, A.orgId, { tipo: "azione", titolo: "   ", data: "2026-09-01" }),
    ).rejects.toThrow(/vuoto/i);
  });

  it("chiudere scrive la data, riaprire la CANCELLA", async () => {
    const id = await creaVoce(A.userId, A.orgId, { tipo: "azione", titolo: "Da chiudere", data: "2026-08-21" });
    await setStatoVoce(A.userId, A.orgId, id, "fatta");
    let [r] = await db.select().from(agendaVoce).where(eq(agendaVoce.id, id));
    expect(r.stato).toBe("fatta");
    expect(r.chiusaIl).not.toBeNull();

    // ⚠️ Il «quando l'ho fatta» non deve sopravvivere alla riapertura: la voce direbbe
    // di essere stata chiusa un giorno in cui era aperta. Lo pretende anche il CHECK.
    await setStatoVoce(A.userId, A.orgId, id, "aperta");
    [r] = await db.select().from(agendaVoce).where(eq(agendaVoce.id, id));
    expect(r.chiusaIl).toBeNull();
    await eliminaVoce(A.userId, A.orgId, id);
  });

  it("le chiuse spariscono dall'elenco corrente ma restano se le si chiede", async () => {
    const id = await creaVoce(A.userId, A.orgId, { tipo: "azione", titolo: "Fatta", data: "2026-08-22" });
    await setStatoVoce(A.userId, A.orgId, id, "fatta");
    expect((await elencaAgenda(A.userId, A.orgId)).find((x) => x.id === id)).toBeUndefined();
    expect(
      (await elencaAgenda(A.userId, A.orgId, { includiChiuse: true })).find((x) => x.id === id),
    ).toBeDefined();
    await eliminaVoce(A.userId, A.orgId, id);
  });

  it("modificare un campo non tocca gli altri", async () => {
    const id = await creaVoce(A.userId, A.orgId, {
      tipo: "azione",
      titolo: "Con note",
      data: "2026-08-23",
      note: "Chiamare prima delle 10",
    });
    await setCampoVoce(A.userId, A.orgId, id, "data", "2026-08-24");
    const [r] = await db.select().from(agendaVoce).where(eq(agendaVoce.id, id));
    expect(r.data).toBe("2026-08-24");
    expect(r.note).toBe("Chiamare prima delle 10");
    expect(r.titolo).toBe("Con note");
    await eliminaVoce(A.userId, A.orgId, id);
  });

  it("il conteggio del cruscotto prende le aperte fino a oggi, non quelle future", async () => {
    const n = await conteggioDaFare(A.userId, A.orgId, "2026-09-01");
    // «Telefonata» (08-20) e «Consegna bozza» (09-15): solo la prima e' entro il 1 settembre.
    expect(n).toBe(1);
    expect(await conteggioDaFare(A.userId, A.orgId, "2026-12-31")).toBe(3);
  });
});

describe("l'agenda e lo scadenzario restano due cose", () => {
  it("creare voci d'agenda non cambia lo scadenzario di una virgola", async () => {
    // ⚠️ La prova non e' che «non ci sono errori»: e' che l'elenco calcolato sia identico
    // prima e dopo. Se i due si mescolassero, spuntare una voce d'agenda farebbe credere
    // chiuso un lavoro che nessuno ha fatto.
    const prima = await getScadenzario(A.userId, A.orgId);
    await creaVoce(A.userId, A.orgId, {
      tipo: "scadenza",
      titolo: "Pubblicare il GHG 2025",
      data: "2026-09-30",
      companyId: A.companyId,
    });
    const dopo = await getScadenzario(A.userId, A.orgId);
    expect(dopo).toEqual(prima);
  });

  it("lo scadenzario non contiene voci d'agenda", async () => {
    const s = await getScadenzario(A.userId, A.orgId);
    // Lo scadenzario ha una forma sua: percorsi, non titoli scritti a mano.
    expect(s.every((v) => "modulo" in v)).toBe(true);
    expect(s.some((v) => (v as { titolo?: string }).titolo === "Pubblicare il GHG 2025")).toBe(false);
  });
});

describe("confine fra studi", () => {
  it("lo studio B non vede, non tocca e non cancella l'agenda di A", async () => {
    const id = await creaVoce(A.userId, A.orgId, { tipo: "azione", titolo: "Solo di A", data: "2026-08-25" });

    expect((await elencaAgenda(B.userId, B.orgId)).find((x) => x.id === id)).toBeUndefined();
    await expect(setCampoVoce(B.userId, B.orgId, id, "titolo", "Rubata")).rejects.toThrow(/altro studio/i);
    await expect(setStatoVoce(B.userId, B.orgId, id, "fatta")).rejects.toThrow(/altro studio/i);
    await expect(eliminaVoce(B.userId, B.orgId, id)).rejects.toThrow(/altro studio/i);

    // ⚠️ La prova e' la riga che non e' cambiata, non il messaggio.
    const [r] = await db.select().from(agendaVoce).where(eq(agendaVoce.id, id));
    expect(r.titolo).toBe("Solo di A");
    expect(r.stato).toBe("aperta");
    expect(r.organizationId).toBe(A.orgId);
  });

  it("lo studio B non appende una voce a un'azienda dello studio A", async () => {
    await expect(
      creaVoce(B.userId, B.orgId, {
        tipo: "azione",
        titolo: "Intrusa",
        data: "2026-08-26",
        companyId: A.companyId,
      }),
    ).rejects.toThrow(/altro studio/i);
    const righe = await db.select().from(agendaVoce).where(eq(agendaVoce.organizationId, B.orgId));
    expect(righe).toEqual([]);
  });
});
