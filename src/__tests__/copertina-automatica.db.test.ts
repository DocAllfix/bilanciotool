import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { randomUUID } from "node:crypto";
import { db } from "@/lib/db";
import {
  user, organization, member, orgEntitlement, company, auditLog, documentSnapshot, documentCodice,
  reportProject, narrativeSection,
} from "@/lib/db/schema";
import { publishBilancioSnapshot, getSnapshot } from "@/features/documents/snapshot";
import { chiaviImmagini } from "@/features/documents/immagini";
import { setCopertinaModo, versioneConImmaginiSuperate } from "@/features/companies/immagini";
import { createReportProject, setCompanyImage } from "@/features/report/projects";
import { deleteObject } from "@/lib/storage";
import { and, desc, eq, inArray } from "drizzle-orm";

// Le due difese nate dalla copertina uscita tagliata il 30 settembre 2026.
//
// 1. Il modo della copertina si decide dalla FORMA dell'immagine, sul server, all'unica
//    strada di caricamento: una locandina A4 a pagina intera, una fotografia sopra il titolo.
// 2. Il pannello avvisa quando le immagini sono cambiate DOPO l'ultima versione pubblicata:
//    la copertina era stata cambiata due minuti dopo la pubblicazione, e niente lo diceva.

const url = process.env.DATABASE_URL;
const RUN = Date.now();
const orgId = `org-cop-auto-${RUN}`;
const userId = `user-cop-auto-${RUN}`;
const companyId = randomUUID();

// Un PNG vero di un pixel, con le misure dell'intestazione riscritte. Il server non decodifica
// l'immagine — legge i primi byte e l'intestazione — quindi per lui questo È un file di quelle
// misure. La somma di controllo dell'IHDR resta quella di prima: nessuno qui la verifica.
const PNG_1PX =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";
function pngDi(larghezza: number, altezza: number): string {
  const b = Buffer.from(PNG_1PX, "base64");
  b.writeUInt32BE(larghezza, 16);
  b.writeUInt32BE(altezza, 20);
  return `data:image/png;base64,${b.toString("base64")}`;
}

const daPulire = new Set<string>();
async function azienda() {
  const [c] = await db.select().from(company).where(eq(company.id, companyId));
  if (c?.logoStorageKey) daPulire.add(c.logoStorageKey);
  if (c?.coverStorageKey) daPulire.add(c.coverStorageKey);
  return c!;
}

describe.skipIf(!url)("copertina: modo dalla forma, e avviso dopo la pubblicazione", () => {
  let projectId = "";

  beforeAll(async () => {
    await db.insert(user).values({ id: userId, name: "Consulente", email: `cop-auto-${RUN}@example.com` });
    await db.insert(organization).values({ id: orgId, name: "Studio Copertine", slug: `cop-auto-${RUN}` });
    await db.insert(member).values({ id: randomUUID(), organizationId: orgId, userId, role: "owner" });
    await db
      .insert(orgEntitlement)
      .values({ organizationId: orgId, status: "active", piano: "studio", activatedAt: new Date() });
    await db.insert(company).values({ id: companyId, organizationId: orgId, nome: "Copertine S.r.l." });
    projectId = await createReportProject(userId, orgId, { companyId, anno: 2025 });
  });

  afterAll(async () => {
    await azienda();
    const snaps = await db.select().from(documentSnapshot).where(eq(documentSnapshot.organizationId, orgId));
    for (const s of snaps) for (const k of chiaviImmagini(s.dati)) daPulire.add(k);
    for (const k of daPulire) await deleteObject(orgId, k).catch(() => undefined);
    await db.delete(auditLog).where(eq(auditLog.organizationId, orgId));
    await db.delete(documentCodice).where(eq(documentCodice.organizationId, orgId));
    await db.delete(documentSnapshot).where(eq(documentSnapshot.organizationId, orgId));
    await db.delete(narrativeSection).where(eq(narrativeSection.projectId, projectId));
    await db.delete(reportProject).where(eq(reportProject.companyId, companyId));
    await db.delete(company).where(eq(company.organizationId, orgId));
    await db.delete(orgEntitlement).where(eq(orgEntitlement.organizationId, orgId));
    await db.delete(member).where(eq(member.organizationId, orgId));
    await db.delete(organization).where(eq(organization.id, orgId));
    await db.delete(user).where(inArray(user.id, [userId]));
  });

  it("⚠️ una locandina A4 verticale va a PAGINA INTERA da sola, e l'audit dice perché", async () => {
    expect((await azienda()).copertinaModo).toBe("foto"); // il predefinito della colonna
    await setCompanyImage(userId, orgId, companyId, "cover", pngDi(1754, 2480));
    expect((await azienda()).copertinaModo).toBe("pagina");
    const [riga] = await db
      .select()
      .from(auditLog)
      .where(and(eq(auditLog.organizationId, orgId), eq(auditLog.azione, "company.cover.set")))
      .orderBy(desc(auditLog.createdAt))
      .limit(1);
    expect(riga.dettagli).toEqual({ modo: "pagina", dallaForma: true });
  });

  it("⚠️ una fotografia orizzontale torna a FOTOGRAFIA", async () => {
    await setCompanyImage(userId, orgId, companyId, "cover", pngDi(2480, 1654));
    expect((await azienda()).copertinaModo).toBe("foto");
  });

  it("caricare il LOGO non tocca il modo della copertina", async () => {
    await setCopertinaModo(userId, orgId, companyId, "pagina");
    await setCompanyImage(userId, orgId, companyId, "logo", pngDi(600, 600)); // quadrato: sarebbe «foto»
    expect((await azienda()).copertinaModo).toBe("pagina");
  });

  it("⚠️ il caso del 30 settembre: pubblicato, poi cambiato il modo → l'avviso nomina la versione", async () => {
    await setCopertinaModo(userId, orgId, companyId, "foto");
    expect(await versioneConImmaginiSuperate(userId, orgId, companyId, "bilancio", 2025)).toBeNull(); // niente pubblicato

    const snapId = await publishBilancioSnapshot(userId, orgId, companyId, 2025);
    const v = (await getSnapshot(userId, orgId, snapId))!.versione;
    // Appena pubblicato, le immagini coincidono: nessun avviso.
    expect(await versioneConImmaginiSuperate(userId, orgId, companyId, "bilancio", 2025)).toBeNull();

    await setCopertinaModo(userId, orgId, companyId, "pagina");
    expect(await versioneConImmaginiSuperate(userId, orgId, companyId, "bilancio", 2025)).toBe(v);

    // Tornando al modo di allora l'avviso sparisce: dice quello che è vero, non che «qualcosa
    // è stato toccato».
    await setCopertinaModo(userId, orgId, companyId, "foto");
    expect(await versioneConImmaginiSuperate(userId, orgId, companyId, "bilancio", 2025)).toBeNull();
  });

  it("⚠️ una copertina nuova fa scattare l'avviso, e ripubblicare lo spegne", async () => {
    await setCompanyImage(userId, orgId, companyId, "cover", pngDi(1754, 2480));
    const superata = await versioneConImmaginiSuperate(userId, orgId, companyId, "bilancio", 2025);
    expect(superata).not.toBeNull();

    await publishBilancioSnapshot(userId, orgId, companyId, 2025);
    expect(await versioneConImmaginiSuperate(userId, orgId, companyId, "bilancio", 2025)).toBeNull();
  });

  it("l'avviso è per documento: un altro tipo senza versioni non ne ha", async () => {
    expect(await versioneConImmaginiSuperate(userId, orgId, companyId, "ghg", 2025)).toBeNull();
  });
});
