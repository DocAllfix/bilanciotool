import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { orgEntitlement, wbChannel, wbReport, wbRequirementState, wbSystem } from "@/lib/db/schema";
import { creaStudio, pulisciStudio } from "./comune";
import {
  aggiornaProfilo,
  creaAssetto,
  creaCanale,
  creaFascicolo,
  eliminaCanale,
  eliminaFascicolo,
  setCampoCanale,
  setCampoFascicolo,
  setCampoRequisito,
} from "@/features/segnalazioni/sistema";
import { getFascicolo, getSegnalazioni } from "@/features/segnalazioni/queries";

// Il confine fra due studi, provato con gli identificativi VERI dell'altro.
//
// ⚠️ In sviluppo questo test misura lo strato APPLICATIVO e nient'altro: la connessione
// locale è privilegiata, quindi le policy RLS non scattano e l'unica cosa che ferma il
// vicino è il filtro `organization_id` esplicito nella clausola `where`. È il motivo per
// cui quel filtro c'è anche dove RLS lo renderebbe ridondante — e il motivo per cui
// toglierlo «perché tanto c'è RLS» fa passare tutto in sviluppo e niente in produzione.
// Con `RLS_FORCE_ROLE=app_rls` lo stesso test misura entrambi gli strati.
//
// ⚠️ E la prova di un divieto è la RIGA CHE NON CAMBIA nel database, non il messaggio:
// «bloccato in silenzio» e «riuscito in silenzio» si somigliano molto, e sono opposti.

const RUN = Date.now();
let alfa: Awaited<ReturnType<typeof creaStudio>>;
let beta: Awaited<ReturnType<typeof creaStudio>>;
let sistemaAlfa: string;
let fascicoloAlfa: string;
let canaleAlfa: string;

beforeAll(async () => {
  alfa = await creaStudio({ prefisso: "wbA", run: RUN, nomeAzienda: "Alfa Costruzioni S.r.l." });
  beta = await creaStudio({ prefisso: "wbB", run: RUN, nomeAzienda: "Beta Servizi S.r.l." });
  await db.insert(orgEntitlement).values([
    { organizationId: alfa.orgId, status: "active" },
    { organizationId: beta.orgId, status: "active" },
  ]);

  sistemaAlfa = await creaAssetto(alfa.userId, alfa.orgId, { companyId: alfa.companyId });
  await aggiornaProfilo(alfa.userId, alfa.orgId, sistemaAlfa, { gestore: "Dott.ssa Rinaldi" });
  const f = await creaFascicolo(alfa.userId, alfa.orgId, sistemaAlfa, {
    dataRicezione: "2026-02-10", canale: "Scritto informatico", anonima: true,
  });
  fascicoloAlfa = f.id;
  await setCampoFascicolo(alfa.userId, alfa.orgId, fascicoloAlfa, { codice: "CODICE-DI-ALFA" });

  const [c] = await db.select().from(wbChannel).where(eq(wbChannel.systemId, sistemaAlfa));
  canaleAlfa = c.id;

  // Beta ha il proprio assetto: il vicino è un cliente vero, non un intruso senza dati.
  await creaAssetto(beta.userId, beta.orgId, { companyId: beta.companyId });
});

afterAll(async () => {
  for (const org of [alfa.orgId, beta.orgId]) {
    await db.delete(wbRequirementState).where(eq(wbRequirementState.organizationId, org));
    await db.delete(wbReport).where(eq(wbReport.organizationId, org));
    await db.delete(wbChannel).where(eq(wbChannel.organizationId, org));
    await db.delete(wbSystem).where(eq(wbSystem.organizationId, org));
  }
  await pulisciStudio(alfa.orgId, alfa.userId);
  await pulisciStudio(beta.orgId, beta.userId);
});

describe("beta non vede alfa", () => {
  it("l'assetto di alfa, chiesto con l'azienda di alfa, non esiste per beta", async () => {
    expect(await getSegnalazioni(beta.userId, beta.orgId, alfa.companyId)).toBeNull();
  });

  it("il fascicolo di alfa non si apre, e l'accesso non si registra", async () => {
    // `getFascicolo` scrive nel registro degli accessi: se il confine cedesse, beta
    // avrebbe letto un fascicolo di alfa e la riga sarebbe finita nel registro di beta —
    // cioè la prova dell'accesso sarebbe finita dove alfa non la guarda mai.
    expect(await getFascicolo(beta.userId, beta.orgId, fascicoloAlfa)).toBeNull();
  });

  it("beta vede il proprio, e il proprio soltanto", async () => {
    const suo = await getSegnalazioni(beta.userId, beta.orgId, beta.companyId);
    expect(suo?.assetto).not.toBeNull();
    expect(suo!.fascicoli).toEqual([]);
    expect(suo!.assetto!.gestore).toBeNull();
  });
});

describe("beta non scrive su alfa", () => {
  it("aggiornare l'assetto di alfa fallisce, e il dato di alfa resta", async () => {
    await expect(
      aggiornaProfilo(beta.userId, beta.orgId, sistemaAlfa, { gestore: "Sono passato di qui" }),
    ).rejects.toThrow(/altro tenant/);

    const [row] = await db.select().from(wbSystem).where(eq(wbSystem.id, sistemaAlfa));
    expect(row.gestore).toBe("Dott.ssa Rinaldi");
  });

  it("scrivere nel fascicolo di alfa fallisce, e il codice resta quello", async () => {
    await expect(
      setCampoFascicolo(beta.userId, beta.orgId, fascicoloAlfa, { codice: "SOSTITUITO-DA-BETA" }),
    ).rejects.toThrow(/altro tenant/);

    const [row] = await db.select().from(wbReport).where(eq(wbReport.id, fascicoloAlfa));
    expect(row.codice).toBe("CODICE-DI-ALFA");
  });

  it("aprire un fascicolo dentro l'assetto di alfa fallisce, e non ne nasce nessuno", async () => {
    const prima = await db.select().from(wbReport).where(eq(wbReport.systemId, sistemaAlfa));
    await expect(
      creaFascicolo(beta.userId, beta.orgId, sistemaAlfa, {
        dataRicezione: "2026-04-01", canale: "Altro", anonima: false,
      }),
    ).rejects.toThrow(/altro tenant/);
    const dopo = await db.select().from(wbReport).where(eq(wbReport.systemId, sistemaAlfa));
    expect(dopo.length).toBe(prima.length);
  });

  it("istituire un canale dentro l'assetto di alfa fallisce, e non ne nasce nessuno", async () => {
    // Il caso che il solo `where` non copre: la riga NUOVA non ha ancora un
    // `organization_id` da confrontare. Serve `pretendiAssetto`, cioè un controllo
    // esplicito sul padre — ed è il punto in cui un modulo scritto in fretta si scopre.
    const prima = await db.select().from(wbChannel).where(eq(wbChannel.systemId, sistemaAlfa));
    await expect(
      creaCanale(beta.userId, beta.orgId, sistemaAlfa, { forma: "Orale" }),
    ).rejects.toThrow(/altro tenant/);
    const dopo = await db.select().from(wbChannel).where(eq(wbChannel.systemId, sistemaAlfa));
    expect(dopo.length).toBe(prima.length);
  });

  it("valutare un requisito nell'assetto di alfa fallisce, e non ne nasce nessuno", async () => {
    // Stesso caso del canale: `onConflictDoUpdate` su una riga che non esiste ancora
    // creerebbe una valutazione nell'assetto del vicino, con l'organizzazione di beta
    // sopra. Il confine è nel controllo del padre.
    await expect(
      setCampoRequisito(beta.userId, beta.orgId, sistemaAlfa, {
        requirementKey: "A.01", campo: "stato", valore: "Conforme",
      }),
    ).rejects.toThrow(/altro tenant/);
    const righe = await db.select().from(wbRequirementState).where(eq(wbRequirementState.systemId, sistemaAlfa));
    expect(righe.length).toBe(0);
  });

  it("modificare o rimuovere il canale di alfa fallisce, e il canale resta", async () => {
    await expect(
      setCampoCanale(beta.userId, beta.orgId, canaleAlfa, { campo: "attiva", valore: true }),
    ).rejects.toThrow(/altro tenant/);
    await expect(eliminaCanale(beta.userId, beta.orgId, canaleAlfa)).rejects.toThrow(/altro tenant/);

    const [row] = await db.select().from(wbChannel).where(eq(wbChannel.id, canaleAlfa));
    expect(row).toBeDefined();
    expect(row.attiva).toBe(false);
  });

  it("eliminare il fascicolo di alfa fallisce, e il fascicolo resta", async () => {
    await expect(eliminaFascicolo(beta.userId, beta.orgId, fascicoloAlfa)).rejects.toThrow(/altro tenant/);
    const [row] = await db.select().from(wbReport).where(eq(wbReport.id, fascicoloAlfa));
    expect(row).toBeDefined();
  });
});
