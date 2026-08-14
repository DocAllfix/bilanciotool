import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { randomUUID } from "node:crypto";
import { db } from "@/lib/db";
import {
  organization, member, orgEntitlement, company, reportProject, narrativeSection,
  mediaAsset, auditLog, user,
} from "@/lib/db/schema";
import { saveChapter, addMedia } from "@/features/report/chapters";
import { latestContentSetId } from "@/features/ghg/inventories";
import { eq } from "drizzle-orm";

// L'attacco vero, provato attraverso la funzione di dominio.
//
// `assertScoped` ha il suo test puro. Questo prova la CATENA: che un `templateKey`
// ostile passato a `addMedia`/`saveChapter` — come farebbe un client modificato, perché
// una server action è un endpoint HTTP e il tipo TypeScript non esiste a runtime — venga
// respinto PRIMA di toccare l'archivio.
//
// Il caso che ha dato il nome al rilievo: `../../_piattaforma/onboarding/benvenuto-v1`
// sovrascriveva il video di benvenuto che vede ogni nuovo cliente, e bastava un conto di
// PROVA, perché la prova possiede `write_data`.

const url = process.env.DATABASE_URL;
const RUN = Date.now();
const orgId = `org-trav-${RUN}`;
const userId = `user-trav-${RUN}`;
const companyId = `az-trav-${RUN}`;
const projectId = randomUUID();

const OSTILI = [
  "../../_piattaforma/onboarding/benvenuto-v1",
  "../altro-studio/loghi/logo",
  "..",
  ".",
  "a/b",
  "%2e%2e/altrove",
  "lettera; rm -rf",
  "",
];

describe.skipIf(!url)("path traversal nella chiave d'archivio", () => {
  beforeAll(async () => {
    await db.insert(user).values({ id: userId, name: "Attaccante", email: `trav-${RUN}@example.com` });
    await db.insert(organization).values({ id: orgId, name: "Studio Trav", slug: `trav-${RUN}` });
    await db.insert(member).values({ id: randomUUID(), organizationId: orgId, userId, role: "owner" });
    // Stato «demo»: è il punto del rilievo. La prova possiede `write_data`, quindi
    // l'attacco non richiedeva nemmeno un abbonamento.
    await db.insert(orgEntitlement).values({ organizationId: orgId, status: "demo" });
    await db.insert(company).values({ id: companyId, organizationId: orgId, nome: "Bersaglio S.r.l." });
    await db.insert(reportProject).values({
      id: projectId, organizationId: orgId, companyId, anno: 2025,
      contentSetId: await latestContentSetId("report"),
    });
  });

  afterAll(async () => {
    await db.delete(mediaAsset).where(eq(mediaAsset.organizationId, orgId));
    await db.delete(narrativeSection).where(eq(narrativeSection.organizationId, orgId));
    await db.delete(reportProject).where(eq(reportProject.organizationId, orgId));
    await db.delete(auditLog).where(eq(auditLog.organizationId, orgId));
    await db.delete(company).where(eq(company.organizationId, orgId));
    await db.delete(orgEntitlement).where(eq(orgEntitlement.organizationId, orgId));
    await db.delete(member).where(eq(member.organizationId, orgId));
    await db.delete(organization).where(eq(organization.id, orgId));
    await db.delete(user).where(eq(user.id, userId));
  });

  it("un capitolo con una chiave ostile viene respinto", async () => {
    for (const ostile of OSTILI) {
      await expect(
        saveChapter(userId, orgId, projectId, ostile, { type: "doc", content: [] }),
        `templateKey «${ostile}»`,
      ).rejects.toThrow();
    }
  });

  it("una fotografia con una chiave ostile viene respinta PRIMA di toccare l'archivio", async () => {
    // Un PNG minimo valido: se la difesa non scattasse, il caricamento partirebbe.
    const png =
      "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";
    for (const ostile of OSTILI) {
      await expect(
        addMedia(userId, orgId, projectId, ostile, { tipo: "img", dataUrl: png }),
        `templateKey «${ostile}»`,
      ).rejects.toThrow();
    }
  });

  it("nessuna riga è rimasta nel database dopo i tentativi", async () => {
    // La prova che conta: non l'eccezione, ma il fatto che niente sia stato scritto.
    const sezioni = await db.select().from(narrativeSection).where(eq(narrativeSection.organizationId, orgId));
    const media = await db.select().from(mediaAsset).where(eq(mediaAsset.organizationId, orgId));
    expect(sezioni).toHaveLength(0);
    expect(media).toHaveLength(0);
  });

  it("un capitolo con una chiave legittima passa ancora", async () => {
    // La difesa non deve aver chiuso la porta anche a chi lavora.
    await expect(
      saveChapter(userId, orgId, projectId, "lettera", { type: "doc", content: [] }),
    ).resolves.toBeUndefined();
    const sezioni = await db.select().from(narrativeSection).where(eq(narrativeSection.organizationId, orgId));
    expect(sezioni).toHaveLength(1);
    expect(sezioni[0].templateKey).toBe("lettera");
  });
});
