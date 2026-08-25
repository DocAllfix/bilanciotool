import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { company, companyContact, orgEntitlement } from "@/lib/db/schema";
import { creaStudio, pulisciStudio } from "./comune";
import {
  aggiornaAnagrafica,
  aggiornaCampoContatto,
  creaContatto,
  elencaContatti,
  eliminaContatto,
  promuoviContatto,
} from "@/features/companies/contatti";

// La rubrica dell'azienda cliente e l'anagrafica: flusso e confine di tenant.
//
// Due cose si provano qui e non altrove:
//   1. che **un solo contatto per azienda** possa essere principale, e che a imporlo sia
//      il DATABASE — non la buona volonta' della funzione che promuove;
//   2. che il confine fra studi regga, e regga **anche in sviluppo**, dove la connessione
//      e' privilegiata e RLS non scatta. E' il caso in cui un difetto passa inosservato:
//      in produzione le policy lo coprirebbero, e nessuno saprebbe che il filtro
//      applicativo manca.

const RUN = Date.now();
let A: Awaited<ReturnType<typeof creaStudio>>;
let B: Awaited<ReturnType<typeof creaStudio>>;

beforeAll(async () => {
  A = await creaStudio({ prefisso: "cont-a", run: RUN, nomeAzienda: "Azienda dello studio A" });
  B = await creaStudio({ prefisso: "cont-b", run: RUN, nomeAzienda: "Azienda dello studio B" });
  for (const s of [A, B]) {
    await db.insert(orgEntitlement).values({ organizationId: s.orgId, status: "active" });
  }
});

afterAll(async () => {
  for (const s of [A, B]) {
    await db.delete(companyContact).where(eq(companyContact.organizationId, s.orgId));
    await pulisciStudio(s.orgId, s.userId);
  }
});

describe("rubrica dei contatti", () => {
  it("crea, elenca e aggiorna un campo per volta", async () => {
    const id = await creaContatto(A.userId, A.orgId, A.companyId, {
      nome: "Giulia Ferri",
      ruolo: "Responsabile HSE",
      email: "g.ferri@example.com",
    });

    let contatti = await elencaContatti(A.userId, A.orgId, A.companyId);
    expect(contatti.map((c) => c.nome)).toEqual(["Giulia Ferri"]);
    expect(contatti[0].ruolo).toBe("Responsabile HSE");

    // ⚠️ Il punto del test: si manda UN campo, e gli altri restano. E' la regola nata da
    // tre difetti dello stesso segno (F7, F12, F13), in cui rimandare la riga intera da
    // props stantie azzerava cio' che era appena stato salvato.
    await aggiornaCampoContatto(A.userId, A.orgId, id, "telefono", "081 1234567");
    contatti = await elencaContatti(A.userId, A.orgId, A.companyId);
    expect(contatti[0].telefono).toBe("081 1234567");
    expect(contatti[0].email).toBe("g.ferri@example.com");
    expect(contatti[0].ruolo).toBe("Responsabile HSE");

    await eliminaContatto(A.userId, A.orgId, id);
    expect(await elencaContatti(A.userId, A.orgId, A.companyId)).toEqual([]);
  });

  it("un nome vuoto non e' un contatto", async () => {
    const id = await creaContatto(A.userId, A.orgId, A.companyId, { nome: "Da svuotare" });
    await expect(aggiornaCampoContatto(A.userId, A.orgId, id, "nome", "   ")).rejects.toThrow(/vuoto/i);
    await eliminaContatto(A.userId, A.orgId, id);
  });

  it("il principale e' UNO SOLO, e lo impone il database", async () => {
    const primo = await creaContatto(A.userId, A.orgId, A.companyId, { nome: "Primo", principale: true });
    const secondo = await creaContatto(A.userId, A.orgId, A.companyId, { nome: "Secondo" });

    // La prova che il vincolo e' del database e non della funzione: si tenta di
    // accendere il secondo scrivendo DIRETTAMENTE la riga, senza passare da
    // `promuoviContatto`. Deve essere l'indice parziale a respingere.
    await expect(
      db.update(companyContact).set({ principale: true }).where(eq(companyContact.id, secondo)),
    ).rejects.toThrow();

    // Passando dalla funzione, invece, riesce: spegne il precedente nella stessa
    // transazione, che e' l'unico modo di non urtare il vincolo.
    await promuoviContatto(A.userId, A.orgId, secondo);
    const dopo = await elencaContatti(A.userId, A.orgId, A.companyId);
    expect(dopo.filter((c) => c.principale).map((c) => c.nome)).toEqual(["Secondo"]);

    // E il principale esce per primo dall'elenco: e' la domanda che si fa a una rubrica.
    expect(dopo[0].nome).toBe("Secondo");

    for (const id of [primo, secondo]) await eliminaContatto(A.userId, A.orgId, id);
  });
});

describe("anagrafica dell'azienda", () => {
  it("la nazione si normalizza in maiuscolo, ma non si indovina", async () => {
    await aggiornaAnagrafica(A.userId, A.orgId, A.companyId, "nazione", "it");
    const [az] = await db.select().from(company).where(eq(company.id, A.companyId));
    expect(az.nazione).toBe("IT");

    // ⚠️ «Italia» NON diventa «IT». Convertire un nome di paese in un codice sembra
    // gentile finche' non tocca all'Irlanda, che diventerebbe «IR» — cioe' l'Iran.
    await expect(
      aggiornaAnagrafica(A.userId, A.orgId, A.companyId, "nazione", "Italia"),
    ).rejects.toThrow(/due lettere/i);
  });

  it("dipendenti e fatturato non possono essere negativi", async () => {
    await expect(aggiornaAnagrafica(A.userId, A.orgId, A.companyId, "dipendenti", "-1")).rejects.toThrow();
    await expect(aggiornaAnagrafica(A.userId, A.orgId, A.companyId, "fatturato", "-10")).rejects.toThrow();

    await aggiornaAnagrafica(A.userId, A.orgId, A.companyId, "dipendenti", "42");
    await aggiornaAnagrafica(A.userId, A.orgId, A.companyId, "fatturato", "1234567,89");
    const [az] = await db.select().from(company).where(eq(company.id, A.companyId));
    expect(az.dipendenti).toBe(42);
    // NUMERIC, non float: la virgola italiana e' accettata e il valore resta esatto.
    expect(az.fatturato).toBe("1234567.89");
  });
});

describe("confine fra studi", () => {
  it("lo studio B non vede, non tocca e non cancella i contatti dello studio A", async () => {
    const id = await creaContatto(A.userId, A.orgId, A.companyId, { nome: "Solo di A" });

    // Non li elenca.
    expect(await elencaContatti(B.userId, B.orgId, A.companyId)).toEqual([]);

    // Non li aggiorna, pur conoscendone l'identificativo.
    await expect(
      aggiornaCampoContatto(B.userId, B.orgId, id, "nome", "Rubato"),
    ).rejects.toThrow(/altro studio/i);

    // Non li promuove.
    await expect(promuoviContatto(B.userId, B.orgId, id)).rejects.toThrow(/altro studio/i);

    // Non li cancella.
    await expect(eliminaContatto(B.userId, B.orgId, id)).rejects.toThrow(/altro studio/i);

    // ⚠️ La prova non e' il messaggio: e' la RIGA CHE NON E' CAMBIATA. Un rifiuto
    // raccontato bene e una scrittura riuscita in silenzio si somigliano troppo.
    const [c] = await db.select().from(companyContact).where(eq(companyContact.id, id));
    expect(c.nome).toBe("Solo di A");
    expect(c.organizationId).toBe(A.orgId);

    await eliminaContatto(A.userId, A.orgId, id);
  });

  it("lo studio B non appende un contatto a un'azienda dello studio A", async () => {
    await expect(
      creaContatto(B.userId, B.orgId, A.companyId, { nome: "Intruso" }),
    ).rejects.toThrow(/altro studio/i);

    const righe = await db
      .select()
      .from(companyContact)
      .where(and(eq(companyContact.companyId, A.companyId), eq(companyContact.organizationId, B.orgId)));
    expect(righe).toEqual([]);
  });

  it("lo studio B non modifica l'anagrafica di un'azienda dello studio A", async () => {
    await expect(
      aggiornaAnagrafica(B.userId, B.orgId, A.companyId, "sede", "Altrove"),
    ).rejects.toThrow(/altro studio/i);
    const [az] = await db.select().from(company).where(eq(company.id, A.companyId));
    expect(az.sede).toBeNull();
  });
});
