import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { randomUUID } from "node:crypto";
import { db } from "@/lib/db";
import { organization, member, orgEntitlement, company, auditLog, user } from "@/lib/db/schema";
import { setCompanyImage } from "@/features/report/projects";
import { eq } from "drizzle-orm";

// Il caricamento del logo e della copertina, provato attraverso la funzione di dominio.
//
// Questo file nasce da un difetto vero, introdotto mentre si chiudeva il rilievo H1.
// In `setCompanyImage` il parametro si chiama gia' `tipo` (`"logo" | "cover"`), e il
// controllo nuovo era stato scritto `const tipo = immagineValida(...)`: la variabile
// interna OMBREGGIAVA il parametro, e la chiave d'archivio — che contiene `${tipo}` —
// sarebbe diventata `.../[object Object]-1234.png`. Il caricamento del logo si sarebbe
// rotto per tutti.
//
// TypeScript non poteva accorgersene: un template literal accetta qualunque tipo. La
// suite non poteva accorgersene: **nessun test copriva questa funzione**. E' passato per
// typecheck e per 498 test, e sarebbe finito in produzione.
//
// La lezione, e il motivo per cui il file resta: un controllo aggiunto a una funzione
// scoperta e' un controllo che nessuno ha verificato.

const url = process.env.DATABASE_URL;
const RUN = Date.now();
const orgId = `org-img-${RUN}`;
const userId = `user-img-${RUN}`;
const companyId = `az-img-${RUN}`;

// Un PNG di un pixel, vero: i primi byte devono combaciare con la firma.
const PNG =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";
const SVG = `data:image/svg+xml;base64,${Buffer.from(
  '<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>',
  "utf8",
).toString("base64")}`;

describe.skipIf(!url)("caricamento di logo e copertina", () => {
  beforeAll(async () => {
    await db.insert(user).values({ id: userId, name: "Consulente", email: `img-${RUN}@example.com` });
    await db.insert(organization).values({ id: orgId, name: "Studio Img", slug: `img-${RUN}` });
    await db.insert(member).values({ id: randomUUID(), organizationId: orgId, userId, role: "owner" });
    // `activatedAt` non e' decorativo: il CHECK `org_entitlement_piano_attivo_ck`
    // (migrazione 0012) impone che un piano abbia una data di attivazione.
    await db
      .insert(orgEntitlement)
      .values({ organizationId: orgId, status: "active", piano: "studio", activatedAt: new Date() });
    await db.insert(company).values({ id: companyId, organizationId: orgId, nome: "Bersaglio S.r.l." });
  });

  afterAll(async () => {
    await db.delete(auditLog).where(eq(auditLog.organizationId, orgId));
    await db.delete(company).where(eq(company.organizationId, orgId));
    await db.delete(orgEntitlement).where(eq(orgEntitlement.organizationId, orgId));
    await db.delete(member).where(eq(member.organizationId, orgId));
    await db.delete(organization).where(eq(organization.id, orgId));
    await db.delete(user).where(eq(user.id, userId));
  });

  it("il logo si carica, e la chiave lo dice", async () => {
    await setCompanyImage(userId, orgId, companyId, "logo", PNG);
    const [co] = await db.select().from(company).where(eq(company.id, companyId));
    expect(co.logoStorageKey).toBeTruthy();
    // Le tre asserzioni che avrebbero fermato l'ombreggiamento del parametro.
    expect(co.logoStorageKey).toContain("/logo-");
    expect(co.logoStorageKey).not.toContain("object Object");
    expect(co.logoStorageKey!.startsWith(`${orgId}/`)).toBe(true);
    expect(co.logoStorageKey).toMatch(/\.png$/);
  });

  it("la copertina prende la propria parola nella chiave, non quella del logo", async () => {
    await setCompanyImage(userId, orgId, companyId, "cover", PNG);
    const [co] = await db.select().from(company).where(eq(company.id, companyId));
    expect(co.coverStorageKey).toContain("/cover-");
    expect(co.coverStorageKey).not.toBe(co.logoStorageKey);
  });

  it("un SVG viene respinto, e nel database non resta nulla di nuovo", async () => {
    const [prima] = await db.select().from(company).where(eq(company.id, companyId));
    await expect(setCompanyImage(userId, orgId, companyId, "logo", SVG)).rejects.toThrow(/immagine/i);
    const [dopo] = await db.select().from(company).where(eq(company.id, companyId));
    expect(dopo.logoStorageKey).toBe(prima.logoStorageKey);
  });

  it("un PNG dichiarato ma con byte JPEG viene respinto", async () => {
    const bugia = `data:image/png;base64,${Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]).toString("base64")}`;
    await expect(setCompanyImage(userId, orgId, companyId, "logo", bugia)).rejects.toThrow(/immagine/i);
  });

  it("si puo' togliere il logo, e la colonna torna vuota", async () => {
    await setCompanyImage(userId, orgId, companyId, "logo", null);
    const [co] = await db.select().from(company).where(eq(company.id, companyId));
    expect(co.logoStorageKey).toBeNull();
  });
});
