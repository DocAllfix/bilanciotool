import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { and, eq, isNotNull } from "drizzle-orm";
import { db } from "@/lib/db";
import { company, materialityAssessment, orgEntitlement, reportProject } from "@/lib/db/schema";
import { creaStudio, pulisciStudio, type Studio } from "./comune";
import { createReportProject, updateProfilo } from "@/features/report/projects";
import { setTopicScoreField } from "@/features/report/materiality";
import { publishBilancioSnapshot } from "@/features/documents/snapshot";
import { documentSnapshot } from "@/lib/db/schema";

// La materialità tipica del settore entra da sola nei temi vuoti, marcata «proposta».
// Prima era un'etichetta che nessuno poteva accettare, mentre il corso diceva il contrario.

const RUN = Date.now();
const DB = !!process.env.DATABASE_URL;
let S: Studio;
let pid: string;

const proposte = () => db.select().from(materialityAssessment).where(and(eq(materialityAssessment.projectId, pid), isNotNull(materialityAssessment.propostaMotivo)));

describe.skipIf(!DB)("materialità proposta dal codice ATECO", () => {
  beforeAll(async () => {
    S = await creaStudio({ prefisso: "mat-proposte", run: RUN, nomeAzienda: "Corvane Meccanica S.r.l." });
    await db.insert(orgEntitlement).values({ organizationId: S.orgId, status: "active", piano: "professional", activatedAt: new Date() });
    await db.update(company).set({ ateco: "25.62" }).where(eq(company.id, S.companyId));
  });

  afterAll(async () => {
    await db.delete(documentSnapshot).where(eq(documentSnapshot.organizationId, S.orgId)).catch(() => {});
    await db.delete(reportProject).where(eq(reportProject.organizationId, S.orgId));
    await pulisciStudio(S.orgId, S.userId);
  });

  it("il progetto nasce con i punteggi tipici della manifattura, marcati col motivo", async () => {
    pid = await createReportProject(S.userId, S.orgId, { companyId: S.companyId, anno: 2025 });
    const p = await proposte();
    expect(p.length).toBeGreaterThan(3);
    expect(p.every((x) => /Attività manifatturiere/.test(x.propostaMotivo ?? ""))).toBe(true);
  });

  it("toccare un punteggio rende il tema del consulente, e l'altro punteggio resta", async () => {
    const [t] = await proposte();
    await setTopicScoreField(S.userId, S.orgId, pid, { topicKey: t.topicKey, campo: "imp", valore: 1 });
    const [dopo] = await db.select().from(materialityAssessment).where(eq(materialityAssessment.id, t.id));
    expect(dopo.propostaMotivo).toBeNull();
    expect(dopo.scoreImpact).toBe(1);
    expect(dopo.scoreFinancial).toBe(t.scoreFinancial);
  });

  it("⚠️ nel documento pubblicato conta solo il tema toccato, non le proposte", async () => {
    const tutte = await db.select().from(materialityAssessment).where(eq(materialityAssessment.projectId, pid));
    const toccati = tutte.filter((x) => !x.propostaMotivo).map((x) => x.topicKey);
    const id = await publishBilancioSnapshot(S.userId, S.orgId, S.companyId, 2025);
    const [snap] = await db.select().from(documentSnapshot).where(eq(documentSnapshot.id, id));
    const perTopic = (snap.dati as { materialita: { perTopic: Record<string, { valutato: boolean }> } }).materialita.perTopic;
    const valutatiNelDocumento = Object.entries(perTopic).filter(([, v]) => v.valutato).map(([k]) => k);
    expect(valutatiNelDocumento.sort()).toEqual(toccati.sort());
  });

  it("⚠️ cambiando ATECO escono solo le proposte non toccate", async () => {
    const toccato = (await db.select().from(materialityAssessment).where(eq(materialityAssessment.projectId, pid))).find((x) => !x.propostaMotivo)!;
    await updateProfilo(S.userId, S.orgId, pid, { ateco: "41.20" });
    const tutte = await db.select().from(materialityAssessment).where(eq(materialityAssessment.projectId, pid));
    expect(tutte.find((x) => x.id === toccato.id)?.scoreImpact).toBe(1);
    expect((await proposte()).every((x) => /Costruzioni/.test(x.propostaMotivo ?? ""))).toBe(true);
  });

  it("un settore senza tabella curata toglie le proposte e non ne inventa", async () => {
    await updateProfilo(S.userId, S.orgId, pid, { ateco: "86.10" });
    expect(await proposte()).toEqual([]);
  });
});
