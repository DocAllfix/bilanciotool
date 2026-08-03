import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { randomUUID } from "node:crypto";
import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import { user, organization, member, orgEntitlement, company, auditLog, soaControlDecision } from "@/lib/db/schema";
import {
  createDeclaration, setDecisionField, setModule, setRuoli, toggleMotivazione, updateProfilo, listDecisions,
} from "@/features/soa/declarations";
import { getSoaData } from "@/features/soa/queries";
import { publishSoaSnapshot, getSnapshot } from "@/features/documents/snapshot";
import { documentSnapshot } from "@/lib/db/schema";

// Ciclo completo della Dichiarazione di Applicabilità sui fatti del database:
// quello che il motore calcola in memoria deve risultare identico partendo
// dalle righe realmente scritte, sul dataset di esempio del prototipo.
const url = process.env.DATABASE_URL;

const RUN = Date.now();
const orgId = `org-soa-${RUN}`;
const userId = `user-soa-${RUN}`;
let companyId = "";
let declarationId = "";

describe.skipIf(!url)("modulo SoA — ciclo completo", () => {
  beforeAll(async () => {
    await db.insert(user).values({ id: userId, name: "Consulente SGSI", email: `soa-${RUN}@example.com` });
    await db.insert(organization).values({ id: orgId, name: "Studio SGSI", slug: `soa-${RUN}` });
    await db.insert(member).values({ id: randomUUID(), organizationId: orgId, userId, role: "owner" });
    await db.insert(orgEntitlement).values({ organizationId: orgId, status: "active" });
    companyId = randomUUID();
    await db.insert(company).values({ id: companyId, organizationId: orgId, nome: "Servizi Cloud di prova S.r.l." });
  });

  afterAll(async () => {
    await db.delete(auditLog).where(eq(auditLog.organizationId, orgId));
    await db.delete(documentSnapshot).where(eq(documentSnapshot.organizationId, orgId));
    await db.delete(company).where(eq(company.organizationId, orgId));
    await db.delete(orgEntitlement).where(eq(orgEntitlement.organizationId, orgId));
    await db.delete(member).where(eq(member.organizationId, orgId));
    await db.delete(organization).where(eq(organization.id, orgId));
    await db.delete(user).where(inArray(user.id, [userId]));
  });

  it("crea la dichiarazione, una sola per azienda", async () => {
    declarationId = await createDeclaration(userId, orgId, { companyId });
    await updateProfilo(userId, orgId, declarationId, {
      sede: "Aversa (CE)",
      scope: "Progettazione ed erogazione di servizi applicativi in cloud.",
      redatto: "Responsabile del SGSI",
      approvato: "Direzione generale",
    });
    await expect(createDeclaration(userId, orgId, { companyId })).rejects.toThrow();
  });

  it("all'inizio in ambito ci sono i soli 93 controlli della 27001", async () => {
    const d = (await getSoaData(userId, orgId, companyId))!;
    expect(d.catalogo!.controlli.length).toBe(174);
    expect(d.esito!.totale).toBe(93);
    expect(d.esito!.applicabili).toBe(93);
    // Nessuno stato assegnato: l'indice è zero, non "non calcolabile".
    expect(d.esito!.indice).toBe(0);
    expect(d.esito!.fascia.key).toBe("non_presidiato");
  });

  it("attivare un modulo allarga l'ambito", async () => {
    await setModule(userId, orgId, declarationId, { frameworkKey: "27017", attivo: true });
    expect((await getSoaData(userId, orgId, companyId))!.esito!.totale).toBe(100);
    await setModule(userId, orgId, declarationId, { frameworkKey: "27018", attivo: true });
    await setModule(userId, orgId, declarationId, { frameworkKey: "27701B", attivo: true });
    const d = (await getSoaData(userId, orgId, companyId))!;
    expect(d.esito!.totale).toBe(143); // 93 + 7 + 25 + 18
    // Spegnere lo riporta indietro senza perdere le decisioni già prese.
    await setModule(userId, orgId, declarationId, { frameworkKey: "27017", attivo: false });
    expect((await getSoaData(userId, orgId, companyId))!.esito!.totale).toBe(136);
    await setModule(userId, orgId, declarationId, { frameworkKey: "27017", attivo: true });
  });

  it("riproduce il golden del prototipo partendo dalle righe scritte", async () => {
    const d0 = (await getSoaData(userId, orgId, companyId))!;
    const inAmbito = d0.catalogo!.controlli.filter((c) => c.inAmbito);
    expect(inAmbito.length).toBe(143);

    // Caricamento di volume in un colpo solo: l'aggiornamento per singolo campo
    // è già provato dai test successivi, qui serve la massa di righe su cui il
    // motore deve riprodurre i numeri del prototipo.
    const seq = ["av", "at", "pa", "pl", "nd", "", "at", "pa"] as const;
    const righe = inAmbito.map((c, i) => {
      const st = seq[i % seq.length];
      return {
        id: randomUUID(),
        organizationId: orgId,
        declarationId,
        frameworkKey: c.frameworkKey,
        controlloId: c.controlloId,
        applicabile: true,
        stato: (st === "" ? null : st) as "nd" | "pl" | "pa" | "at" | "av" | null,
        motivazioni: i % 7 !== 3 ? ["rv"] : [],
        responsabile: i % 5 !== 4 ? "Responsabile del SGSI" : null,
        riferimentoDoc:
          (st === "av" || st === "at") && i % 11 !== 5 ? `DOC-${c.controlloId.replace(/\./g, "")}` : null,
      };
    });
    await db.insert(soaControlDecision).values(righe);

    // Le due esclusioni passano invece dall'API vera, comprese le regole:
    // una motivata e una muta, che il controllo di coerenza dovrà trovare.
    await setDecisionField(userId, orgId, declarationId, "27001", "8.4", "applicabile", "no");
    await setDecisionField(userId, orgId, declarationId, "27001", "8.4", "giustificazione",
      "L'organizzazione non sviluppa software: non esiste codice sorgente proprietario da proteggere.");
    await setDecisionField(userId, orgId, declarationId, "27001", "8.30", "applicabile", "no");

    const d = (await getSoaData(userId, orgId, companyId))!;
    expect(d.esito!.applicabili).toBe(141);
    expect(d.esito!.esclusi).toBe(2);
    expect(d.esito!.indice).toBe(51);
    expect(d.esito!.conStato).toBe(123);
    expect(d.esito!.attuati).toBe(52);
    expect(d.esito!.perFramework["27001"].punteggio).toBe(50);
    expect(d.esito!.perFramework["27017"].punteggio).toBe(59);
    expect(d.esito!.perFramework["27018"].punteggio).toBe(49);
    expect(d.esito!.perFramework["27701B"].punteggio).toBe(51);
  }, 120_000);

  it("le motivazioni si accendono e spengono una per volta, senza sovrascriversi", async () => {
    const chiave = { frameworkKey: "27001", controlloId: "5.1" } as const;
    await toggleMotivazione(userId, orgId, declarationId, { ...chiave, motivazione: "ol", attiva: true });
    await toggleMotivazione(userId, orgId, declarationId, { ...chiave, motivazione: "oc", attiva: true });
    const leggi = async () => {
      const [r] = await db
        .select()
        .from(soaControlDecision)
        .where(and(
          eq(soaControlDecision.declarationId, declarationId),
          eq(soaControlDecision.frameworkKey, "27001"),
          eq(soaControlDecision.controlloId, "5.1"),
        ));
      return r.motivazioni;
    };
    expect([...(await leggi())].sort()).toEqual(["oc", "ol", "rv"]);

    // Riaccendere una motivazione già presente non la duplica.
    await toggleMotivazione(userId, orgId, declarationId, { ...chiave, motivazione: "ol", attiva: true });
    expect((await leggi()).filter((m) => m === "ol").length).toBe(1);

    await toggleMotivazione(userId, orgId, declarationId, { ...chiave, motivazione: "oc", attiva: false });
    expect([...(await leggi())].sort()).toEqual(["ol", "rv"]);
  });

  it("cambiare uno stato non cancella il riferimento documentale", async () => {
    await setDecisionField(userId, orgId, declarationId, "27001", "5.1", "riferimentoDoc", "POL-001");
    await setDecisionField(userId, orgId, declarationId, "27001", "5.1", "stato", "pa");
    const righe = await listDecisions(userId, orgId, declarationId);
    const r = righe.find((x) => x.frameworkKey === "27001" && x.controlloId === "5.1")!;
    expect(r.stato).toBe("pa");
    expect(r.riferimentoDoc).toBe("POL-001");
    expect(r.responsabile).toBe("Responsabile del SGSI");
    await setDecisionField(userId, orgId, declarationId, "27001", "5.1", "stato", "av");
  });

  it("le verifiche di coerenza trovano i rilievi che un auditor muove per primi", async () => {
    const d = (await getSoaData(userId, orgId, companyId))!;
    const per = (k: string) => d.stato!.rilievi.find((r) => r.key === k);
    // 8.4 è escluso e motivato, 8.30 escluso e muto.
    expect(per("esclusioni_senza_giustificazione")!.controlli).toEqual(["8.30"]);
    expect(per("senza_stato")!.controlli.length).toBe(d.esito!.applicabili - d.esito!.conStato);
    expect(per("inclusioni_senza_motivazione")!.controlli.length).toBeGreaterThan(0);
    expect(d.esito!.rilieviAperti).toBeGreaterThan(0);
  });

  it("«nessun servizio cloud» non produce l'avviso sul cloud", async () => {
    // Il falso positivo del prototipo: con le regex su testo libero l'avviso
    // compariva proprio a chi aveva dichiarato di non usare il cloud.
    await setRuoli(userId, orgId, declarationId, { ruoloCloud: "nessuno", ruoloPrivacy: "nessuno" });
    const d = (await getSoaData(userId, orgId, companyId))!;
    expect(d.stato!.avvisi.some((a) => a.key === "cloud_senza_27017")).toBe(false);
    // E il caso opposto viene segnalato: moduli PIMS accesi senza il ruolo.
    expect(d.stato!.avvisi.some((a) => a.key === "pims_senza_ruolo")).toBe(true);

    await setRuoli(userId, orgId, declarationId, { ruoloCloud: "entrambi", ruoloPrivacy: "responsabile" });
    const d2 = (await getSoaData(userId, orgId, companyId))!;
    expect(d2.stato!.avvisi.some((a) => a.key === "cloud_senza_27017")).toBe(false); // il 27017 è attivo
    expect(d2.stato!.avvisi.some((a) => a.key === "responsabile_senza_27701b")).toBe(false); // e anche il B
    expect(d2.stato!.avvisi.some((a) => a.key === "pims_senza_ruolo")).toBe(false);
  });

  it("il piano mette in testa i cardine e i controlli senza stato", async () => {
    const d = (await getSoaData(userId, orgId, companyId))!;
    expect(d.stato!.piano.length).toBe(d.esito!.applicabili - d.esito!.attuati);
    const primaMedia = d.stato!.piano.findIndex((v) => v.priorita === "media");
    expect(d.stato!.piano.slice(0, primaMedia).every((v) => v.priorita === "alta")).toBe(true);
  });

  it("valori fuori dominio respinti dal codice E dal database", async () => {
    await expect(
      setDecisionField(userId, orgId, declarationId, "27001", "5.2", "stato", "quasi"),
    ).rejects.toThrow(/non ammesso/i);
    await expect(
      toggleMotivazione(userId, orgId, declarationId, {
        frameworkKey: "27001", controlloId: "5.2", motivazione: "zz" as never, attiva: true,
      }),
    ).rejects.toThrow();
    // Il vincolo sull'array regge anche scavalcando il codice.
    await expect(
      db.insert(soaControlDecision).values({
        id: randomUUID(),
        organizationId: orgId,
        declarationId,
        frameworkKey: "27001",
        controlloId: "ZZ.9",
        motivazioni: ["inventata"],
      }),
    ).rejects.toThrow();
  });

  it("la Dichiarazione si congela e si RIGENERA coi dati nuovi", async () => {
    type Dati = { esito: { indice: number; applicabili: number }; catalogo: { controlli: unknown[] } };
    const snapId = await publishSoaSnapshot(userId, orgId, companyId);
    const v1 = (await getSnapshot(userId, orgId, snapId))!;
    expect(v1.tipo).toBe("soa");
    expect(v1.versione).toBe(1);
    expect(v1.anno).toBe(0);
    const indiceCongelato = (v1.dati as Dati).esito.indice;
    expect(indiceCongelato).toBe(51);
    // Nello snapshot vanno SOLO i controlli in ambito, non l'intero catalogo.
    expect((v1.dati as Dati).catalogo.controlli.length).toBe(143);

    // Tre controlli senza stato passano ad "attuato e verificato".
    const d0 = (await getSoaData(userId, orgId, companyId))!;
    const muti = d0.stato!.decisioni.filter((x) => x.applicabile && !x.stato).slice(0, 3);
    expect(muti.length).toBe(3);
    for (const m of muti) {
      await setDecisionField(userId, orgId, declarationId, m.frameworkKey, m.controlloId, "stato", "av");
    }
    const vivo = (await getSoaData(userId, orgId, companyId))!.esito!;
    expect(vivo.indice).toBeGreaterThan(51);

    // La revisione già consegnata all'organismo di certificazione NON cambia.
    expect(((await getSnapshot(userId, orgId, snapId))!.dati as Dati).esito.indice).toBe(51);

    // La nuova porta l'indice aggiornato, identico a quello vivo.
    const snapId2 = await publishSoaSnapshot(userId, orgId, companyId);
    const v2 = (await getSnapshot(userId, orgId, snapId2))!;
    expect(v2.versione).toBe(2);
    expect((v2.dati as Dati).esito.indice).toBe(vivo.indice);
    expect((v2.dati as Dati).esito.indice).not.toBe(indiceCongelato);

    await expect(
      db.update(documentSnapshot).set({ dati: { manomesso: true } }).where(eq(documentSnapshot.id, snapId)),
    ).rejects.toThrow();
  });

  it("account expired: scrittura bloccata, lettura consentita", async () => {
    await db.update(orgEntitlement).set({ status: "expired" }).where(eq(orgEntitlement.organizationId, orgId));
    await expect(
      setDecisionField(userId, orgId, declarationId, "27001", "5.3", "stato", "at"),
    ).rejects.toMatchObject({ code: "read_only" });
    await expect(getSoaData(userId, orgId, companyId)).resolves.toBeDefined();
    await db.update(orgEntitlement).set({ status: "active" }).where(eq(orgEntitlement.organizationId, orgId));
  });
});
