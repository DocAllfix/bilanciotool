import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { randomUUID } from "node:crypto";
import { db } from "@/lib/db";
import {
  user, organization, member, orgEntitlement, company, auditLog, documentSnapshot,
  documentCodice, reportProject, narrativeSection, mediaAsset, ghgInventory,
} from "@/lib/db/schema";
import { publishBilancioSnapshot, publishGhgSnapshot, getSnapshot, resolveSnapshotImages } from "@/features/documents/snapshot";
import { cartellaDelDocumento, chiaviImmagini, copertinaDelloSnapshot } from "@/features/documents/immagini";
import { setCopertinaModo } from "@/features/companies/immagini";
import { createInventory } from "@/features/ghg/inventories";
import { createReportProject, setCompanyImage } from "@/features/report/projects";
import { addMedia, removeMedia } from "@/features/report/chapters";
import { deleteObject, signedUrl } from "@/lib/storage";
import { eq, inArray } from "drizzle-orm";

// Le immagini di un documento pubblicato sopravvivono a ciò che l'azienda fa DOPO.
//
// ⚠️ IL DIFETTO, PROVATO PRIMA DI CORREGGERLO. Lo snapshot congelava la chiave del logo,
// della copertina e delle foto; cambiando il logo, `setCompanyImage` caricava il nuovo e
// CANCELLAVA il vecchio. Da lì il bilancio già pubblicato chiedeva un file che non c'era più
// e `resolveSnapshotImages` sollevava «Firma URL fallita (400)»: siccome le immagini si
// risolvevano in un `Promise.all`, non mancava il logo — non si apriva il DOCUMENTO.
//
// Tre fronti, tre prove:
//   · i documenti pubblicati da ora si fanno una copia propria delle immagini;
//   · quelli pubblicati PRIMA puntano ancora ai file dell'azienda, e quei file non si
//     cancellano più finché un documento li usa;
//   · un'immagine che manca comunque non fa più saltare la pagina.

const url = process.env.DATABASE_URL;
const RUN = Date.now();
const orgId = `org-img-doc-${RUN}`;
const userId = `user-img-doc-${RUN}`;
const companyId = randomUUID();

// Un PNG di un pixel, vero: il controllo sui primi byte lo pretende.
const PNG =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";

/** Tutte le chiavi d'archivio toccate dal test, per non lasciare file dietro. */
const daPulire = new Set<string>();

async function logoAttuale(): Promise<string | null> {
  const [c] = await db.select().from(company).where(eq(company.id, companyId));
  if (c?.logoStorageKey) daPulire.add(c.logoStorageKey);
  if (c?.coverStorageKey) daPulire.add(c.coverStorageKey);
  return c?.logoStorageKey ?? null;
}

/** La pagina del documento si apre, e quell'immagine ha un indirizzo? */
async function siApre(snapId: string, chiave: string): Promise<boolean> {
  const snap = await getSnapshot(userId, orgId, snapId);
  for (const k of chiaviImmagini(snap!.dati)) daPulire.add(k);
  const urls = await resolveSnapshotImages(orgId, snap!.dati);
  return urls.has(chiave);
}

describe.skipIf(!url)("immagini dei documenti pubblicati", () => {
  let projectId = "";

  beforeAll(async () => {
    await db.insert(user).values({ id: userId, name: "Consulente", email: `img-doc-${RUN}@example.com` });
    await db.insert(organization).values({ id: orgId, name: "Studio Immagini", slug: `img-doc-${RUN}` });
    await db.insert(member).values({ id: randomUUID(), organizationId: orgId, userId, role: "owner" });
    await db
      .insert(orgEntitlement)
      .values({ organizationId: orgId, status: "active", piano: "studio", activatedAt: new Date() });
    await db.insert(company).values({ id: companyId, organizationId: orgId, nome: "Immagini S.r.l." });
    projectId = await createReportProject(userId, orgId, { companyId, anno: 2025 });
  });

  afterAll(async () => {
    await logoAttuale();
    for (const k of daPulire) await deleteObject(orgId, k).catch(() => undefined);
    await db.delete(auditLog).where(eq(auditLog.organizationId, orgId));
    await db.delete(documentCodice).where(eq(documentCodice.organizationId, orgId));
    await db.delete(documentSnapshot).where(eq(documentSnapshot.organizationId, orgId));
    await db.delete(mediaAsset).where(eq(mediaAsset.organizationId, orgId));
    await db.delete(narrativeSection).where(eq(narrativeSection.projectId, projectId));
    await db.delete(reportProject).where(eq(reportProject.companyId, companyId));
    await db.delete(ghgInventory).where(eq(ghgInventory.companyId, companyId));
    await db.delete(company).where(eq(company.organizationId, orgId));
    await db.delete(orgEntitlement).where(eq(orgEntitlement.organizationId, orgId));
    await db.delete(member).where(eq(member.organizationId, orgId));
    await db.delete(organization).where(eq(organization.id, orgId));
    await db.delete(user).where(inArray(user.id, [userId]));
  });

  it("⚠️ il documento pubblicato si fa una copia PROPRIA del logo", async () => {
    await setCompanyImage(userId, orgId, companyId, "logo", PNG);
    const dellAzienda = await logoAttuale();
    const snapId = await publishBilancioSnapshot(userId, orgId, companyId, 2025);
    const snap = await getSnapshot(userId, orgId, snapId);
    const nelDocumento = copertinaDelloSnapshot(snap!.dati).logoKey!;
    daPulire.add(nelDocumento);

    // La chiave del documento sta nella cartella del documento, non in quella dell'azienda:
    // se fosse la stessa, cambiare il logo tornerebbe a rompere il bilancio pubblicato.
    expect(nelDocumento).not.toBe(dellAzienda);
    expect(nelDocumento.startsWith(`${cartellaDelDocumento(orgId, snapId)}/`)).toBe(true);
    expect(await siApre(snapId, nelDocumento)).toBe(true);
  });

  it("⚠️ CAMBIARE il logo dopo la pubblicazione non rompe il bilancio pubblicato", async () => {
    // È la sequenza che prima faceva sollevare «Firma URL fallita (400)».
    const [snap] = await db.select().from(documentSnapshot).where(eq(documentSnapshot.organizationId, orgId));
    const nelDocumento = copertinaDelloSnapshot(snap.dati).logoKey!;

    await setCompanyImage(userId, orgId, companyId, "logo", PNG);
    await logoAttuale();
    expect(await siApre(snap.id, nelDocumento)).toBe(true);
  });

  it("⚠️ e nemmeno TOGLIERLO", async () => {
    const [snap] = await db.select().from(documentSnapshot).where(eq(documentSnapshot.organizationId, orgId));
    const nelDocumento = copertinaDelloSnapshot(snap.dati).logoKey!;

    await setCompanyImage(userId, orgId, companyId, "logo", null);
    expect(await logoAttuale()).toBeNull();
    expect(await siApre(snap.id, nelDocumento)).toBe(true);
  });

  it("⚠️ una foto tolta dal racconto DOPO la pubblicazione resta nel documento", async () => {
    const mediaId = await addMedia(userId, orgId, projectId, "lettera", { tipo: "img", dataUrl: PNG });
    const snapId = await publishBilancioSnapshot(userId, orgId, companyId, 2025);
    const snap = await getSnapshot(userId, orgId, snapId);
    const foto = chiaviImmagini(snap!.dati).find((k) => k.includes("/snapshot/"))!;
    expect(foto, "la foto del capitolo non è stata copiata nella cartella del documento").toBeTruthy();

    await removeMedia(userId, orgId, mediaId);
    expect(await siApre(snapId, foto)).toBe(true);
  });

  it("⚠️ anche un documento che NON è il bilancio porta il logo e la copertina", async () => {
    // Stavano solo nel bilancio: gli altri ventuno uscivano senza il logo dell'azienda anche
    // quando era stato caricato. Ora li aggiunge la strozzatura comune, per tutti.
    await setCompanyImage(userId, orgId, companyId, "logo", PNG);
    await setCompanyImage(userId, orgId, companyId, "cover", PNG);
    await logoAttuale();
    await createInventory(userId, orgId, { companyId, anno: 2025 });
    const snapId = await publishGhgSnapshot(userId, orgId, companyId, 2025);
    const snap = await getSnapshot(userId, orgId, snapId);
    const c = copertinaDelloSnapshot(snap!.dati);
    expect(c.logoKey, "il GHG pubblicato non porta il logo").toBeTruthy();
    expect(c.coverKey, "il GHG pubblicato non porta la copertina").toBeTruthy();
    // E se ne è fatto una copia sua, come il bilancio.
    for (const k of [c.logoKey!, c.coverKey!]) {
      expect(k.startsWith(`${cartellaDelDocumento(orgId, snapId)}/`), k).toBe(true);
      expect(await siApre(snapId, k)).toBe(true);
    }
  });

  it("⚠️ il modo della copertina si congela: cambiarlo dopo non tocca il documento pubblicato", async () => {
    // Un documento consegnato con la copertina a pagina intera non deve diventare, il giorno
    // dopo, un documento con la fotografia sopra il titolo perché qualcuno ha cambiato idea.
    await setCopertinaModo(userId, orgId, companyId, "pagina");
    const snapId = await publishGhgSnapshot(userId, orgId, companyId, 2025);
    expect(copertinaDelloSnapshot((await getSnapshot(userId, orgId, snapId))!.dati).modo).toBe("pagina");

    await setCopertinaModo(userId, orgId, companyId, "foto");
    expect(copertinaDelloSnapshot((await getSnapshot(userId, orgId, snapId))!.dati).modo).toBe("pagina");
    const dopo = await publishGhgSnapshot(userId, orgId, companyId, 2025);
    expect(copertinaDelloSnapshot((await getSnapshot(userId, orgId, dopo))!.dati).modo).toBe("foto");
  });

  it("un modo della copertina inventato viene rifiutato, anche aggirando l'interfaccia", async () => {
    await expect(setCopertinaModo(userId, orgId, companyId, "poster" as never)).rejects.toThrow();
  });

  it("i documenti pubblicati prima leggono ancora logo e copertina dal posto di allora", async () => {
    // Prima del 29 settembre il bilancio li teneva in `azienda`; gli altri non li avevano.
    expect(copertinaDelloSnapshot({ azienda: { logoKey: "a", coverKey: "b" } })).toEqual({ logoKey: "a", coverKey: "b", modo: "foto" });
    expect(copertinaDelloSnapshot({ azienda: { nome: "x" } })).toEqual({ logoKey: null, coverKey: null, modo: "foto" });
  });

  it("⚠️ i documenti pubblicati PRIMA del rimedio: il file che usano non si cancella", async () => {
    // Questi snapshot puntano direttamente al file dell'azienda, e il loro `dati` non si può
    // riscrivere — il trigger della 0002 lo vieta. La protezione sta dall'altra parte.
    await setCompanyImage(userId, orgId, companyId, "logo", PNG);
    const vecchio = (await logoAttuale())!;
    const legacyId = randomUUID();
    await db.insert(documentSnapshot).values({
      id: legacyId,
      organizationId: orgId,
      companyId,
      tipo: "bilancio",
      anno: 2024,
      versione: 1,
      dati: { azienda: { nome: "Immagini S.r.l.", logoKey: vecchio, coverKey: null }, capitoli: [] },
      publishedBy: userId,
    });

    // L'azienda cambia logo: senza la protezione il file vecchio verrebbe cancellato.
    await setCompanyImage(userId, orgId, companyId, "logo", PNG);
    await logoAttuale();
    expect(await siApre(legacyId, vecchio)).toBe(true);
  });

  it("un file che NESSUN documento usa si cancella ancora, come prima", async () => {
    // La protezione non deve trasformarsi in un archivio che cresce per sempre: il logo
    // caricato e sostituito senza mai pubblicare niente se ne va.
    const altraId = randomUUID();
    await db.insert(company).values({ id: altraId, organizationId: orgId, nome: "Mai Pubblicata S.r.l." });
    await setCompanyImage(userId, orgId, altraId, "logo", PNG);
    const [c1] = await db.select().from(company).where(eq(company.id, altraId));
    const primo = c1.logoStorageKey!;
    await setCompanyImage(userId, orgId, altraId, "logo", PNG);
    const [c2] = await db.select().from(company).where(eq(company.id, altraId));
    daPulire.add(c2.logoStorageKey!);

    // Si chiede all'archivio DIRETTAMENTE, non attraverso `resolveSnapshotImages`: quella
    // funzione tace sulle immagini mancanti per scelta, e un controllo che passasse di lì
    // cadrebbe insieme al suo — due prove legate non dicono quale delle due ha ceduto.
    await expect(signedUrl(orgId, primo, 60), "il file sostituito è ancora in archivio").rejects.toThrow();
  });

  it("⚠️ un'immagine che manca non fa più saltare la pagina", async () => {
    // Difesa in profondità: se per qualunque ragione un file non c'è, il documento si apre
    // lo stesso senza quell'immagine, invece di non aprirsi affatto.
    const inesistente = `${orgId}/companies/${companyId}/logo-mai-esistito.png`;
    const urls = await resolveSnapshotImages(orgId, {
      azienda: { logoKey: inesistente, coverKey: null },
      capitoli: [],
    });
    expect(urls.has(inesistente)).toBe(false);
  });
});
