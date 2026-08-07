import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { randomUUID } from "node:crypto";
import { db } from "@/lib/db";
import { user, organization, member, orgEntitlement, company, auditLog, documentSnapshot } from "@/lib/db/schema";
import { publishGhgSnapshot, publishBilancioSnapshot, getSnapshot } from "@/features/documents/snapshot";
import { marchioDelloSnapshot } from "@/features/documents/marchio";
import { createInventory } from "@/features/ghg/inventories";
import { addActivityRow, updateActivityRow, listActivityRows } from "@/features/ghg/activity-data";
import { createReportProject } from "@/features/report/projects";
import { setKpiValue } from "@/features/report/kpi";
import { eq, inArray, sql } from "drizzle-orm";

// Pubblicazione: lo snapshot congela i derivati; è IMMUTABILE a livello DB
// (trigger); modificare i dati vivi dopo la pubblicazione non lo tocca.
const url = process.env.DATABASE_URL;

const RUN = Date.now();
const orgId = `org-doc-${RUN}`;
const userId = `user-doc-${RUN}`;
let companyId = "";

describe.skipIf(!url)("documenti: snapshot e immutabilità", () => {
  beforeAll(async () => {
    await db.insert(user).values({ id: userId, name: "Publisher", email: `doc-${RUN}@example.com` });
    await db.insert(organization).values({ id: orgId, name: "Studio Doc", slug: `doc-${RUN}` });
    await db.insert(member).values({ id: randomUUID(), organizationId: orgId, userId, role: "owner" });
    await db.insert(orgEntitlement).values({ organizationId: orgId, status: "active" });
    companyId = randomUUID();
    await db.insert(company).values({ id: companyId, organizationId: orgId, nome: "Delta S.r.l." });
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

  it("pubblica il GHG: derivati congelati; i dati vivi cambiano, lo snapshot NO", async () => {
    const invId = await createInventory(userId, orgId, { companyId, anno: 2025 });
    await addActivityRow(userId, orgId, invId, {
      sourceTypeKey: "1a", categoryKey: "1", descrizione: "Gas", um: "Smc", quantita: "12500", fe: "1.9755", dq: "F",
    });
    const snapId = await publishGhgSnapshot(userId, orgId, companyId, 2025);
    const snap = await getSnapshot(userId, orgId, snapId);
    const dati = snap!.dati as { risultati: { totL: string } };
    expect(dati.risultati.totL).toBe("24.69375");
    expect(snap!.versione).toBe(1);

    // Modifica dei dati vivi DOPO la pubblicazione...
    const [riga] = await listActivityRows(userId, orgId, invId);
    await updateActivityRow(userId, orgId, riga.id, {
      sourceTypeKey: "1a", categoryKey: "1", descrizione: "Gas", um: "Smc", quantita: "99999", fe: "1.9755", dq: "F",
    });
    // ...lo snapshot pubblicato NON cambia
    const rilettura = await getSnapshot(userId, orgId, snapId);
    expect((rilettura!.dati as { risultati: { totL: string } }).risultati.totL).toBe("24.69375");

    // Ripubblicare = versione 2 CON I DATI NUOVI, non solo "diversi":
    // 99.999 Smc x 1,9755 kgCO2e/Smc / 1000 = 197,548 tCO2e.
    const snapId2 = await publishGhgSnapshot(userId, orgId, companyId, 2025);
    const snap2 = await getSnapshot(userId, orgId, snapId2);
    expect(snap2!.versione).toBe(2);
    expect(Number((snap2!.dati as { risultati: { totL: string } }).risultati.totL)).toBeCloseTo(197.548, 3);
    // E la versione 1 resta consultabile col valore di allora.
    const v1 = await getSnapshot(userId, orgId, snapId);
    expect((v1!.dati as { risultati: { totL: string } }).risultati.totL).toBe("24.69375");
  });

  it("il trigger DB blocca QUALSIASI update dei dati, anche privilegiato", async () => {
    const [snap] = await db.select().from(documentSnapshot).where(eq(documentSnapshot.organizationId, orgId)).limit(1);
    // Drizzle incapsula l'errore Postgres: si asserisce il COMPORTAMENTO —
    // l'update fallisce e la riga resta intatta.
    await expect(
      db.update(documentSnapshot).set({ dati: { manomesso: true } }).where(eq(documentSnapshot.id, snap.id)),
    ).rejects.toThrow();
    await expect(
      db.execute(sql`update document_snapshot set versione = 99 where id = ${snap.id}`),
    ).rejects.toThrow();
    const [rilettura] = await db.select().from(documentSnapshot).where(eq(documentSnapshot.id, snap.id));
    expect(rilettura.dati).toEqual(snap.dati);
    expect(rilettura.versione).toBe(snap.versione);
    // L'unica colonna mutabile: la chiave del PDF
    await expect(
      db.update(documentSnapshot).set({ pdfStorageKey: "x/test.pdf" }).where(eq(documentSnapshot.id, snap.id)),
    ).resolves.toBeDefined();
  });

  it("pubblica il Bilancio: derivati congelati nello snapshot", async () => {
    await createReportProject(userId, orgId, { companyId, anno: 2025 });
    await setKpiValue(userId, orgId, companyId, { kpiKey: "en_ele", anno: 2025, valore: "100000" });
    const snapId = await publishBilancioSnapshot(userId, orgId, companyId, 2025);
    const snap = await getSnapshot(userId, orgId, snapId);
    const dati = snap!.dati as { kpi: { derivati: Record<string, string> }; bridge: { corrente: { stato: string } } };
    expect(dati.kpi.derivati.scope2Loc).toBe("25.65");
    expect(dati.bridge.corrente.stato).toBe("ok"); // il bridge vede l'inventario del test precedente

    // Il KPI cambia: la revisione già consegnata resta ferma, la nuova recepisce.
    // 200.000 kWh x 0,2565 kgCO2/kWh / 1000 = 51,30 tCO2e.
    await setKpiValue(userId, orgId, companyId, { kpiKey: "en_ele", anno: 2025, valore: "200000" });
    const fermo = await getSnapshot(userId, orgId, snapId);
    expect((fermo!.dati as typeof dati).kpi.derivati.scope2Loc).toBe("25.65");

    const snapId2 = await publishBilancioSnapshot(userId, orgId, companyId, 2025);
    const snap2 = await getSnapshot(userId, orgId, snapId2);
    expect(snap2!.versione).toBe(2);
    expect((snap2!.dati as typeof dati).kpi.derivati.scope2Loc).toBe("51.3");
  });

  it("white-label: il marchio si congela alla pubblicazione, e spegnere l'estensione non lo riscrive", async () => {
    // Senza estensione, il documento porta il nostro marchio.
    const nostro = await publishGhgSnapshot(userId, orgId, companyId, 2025);
    expect(marchioDelloSnapshot((await getSnapshot(userId, orgId, nostro))!.dati)).toEqual({
      nome: "EvalisDeck",
      nostro: true,
    });

    // Lo studio compra il white-label: da qui in poi i documenti portano il suo nome.
    await db.update(orgEntitlement).set({ whiteLabel: true }).where(eq(orgEntitlement.organizationId, orgId));
    const suo = await publishGhgSnapshot(userId, orgId, companyId, 2025);
    expect(marchioDelloSnapshot((await getSnapshot(userId, orgId, suo))!.dati)).toEqual({
      nome: "Studio Doc",
      nostro: false,
    });

    // L'estensione scade. Il PDF già consegnato al cliente NON cambia intestazione:
    // è la ragione per cui il marchio sta nello snapshot e non si rilegge a ogni vista.
    await db.update(orgEntitlement).set({ whiteLabel: false }).where(eq(orgEntitlement.organizationId, orgId));
    expect(marchioDelloSnapshot((await getSnapshot(userId, orgId, suo))!.dati)).toEqual({
      nome: "Studio Doc",
      nostro: false,
    });
    // Mentre quello che si pubblica DOPO la scadenza torna al nostro.
    const dopo = await publishGhgSnapshot(userId, orgId, companyId, 2025);
    expect(marchioDelloSnapshot((await getSnapshot(userId, orgId, dopo))!.dati).nostro).toBe(true);
  });

  it("demo: la pubblicazione è dietro paywall (generate_pdf)", async () => {
    await db.update(orgEntitlement).set({ status: "demo" }).where(eq(orgEntitlement.organizationId, orgId));
    await expect(publishGhgSnapshot(userId, orgId, companyId, 2025)).rejects.toMatchObject({ code: "paywall" });
    await db.update(orgEntitlement).set({ status: "active" }).where(eq(orgEntitlement.organizationId, orgId));
  });
});
