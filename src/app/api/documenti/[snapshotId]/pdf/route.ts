import { NextRequest, NextResponse } from "next/server";
import { requireConsultant } from "@/features/auth/guards";
import { requireEntitlement } from "@/features/entitlement";
import { getSnapshot } from "@/features/documents/snapshot";
import { renderPdf } from "@/features/documents/pdf";
import { uploadObject } from "@/lib/storage";
import { withTenant } from "@/lib/db/tenant";
import { documentSnapshot } from "@/lib/db/schema";
import { logAudit } from "@/lib/audit";
import { eq } from "drizzle-orm";

export const maxDuration = 120; // Chromium serverless: servono più dei 10s di default
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest, { params }: { params: Promise<{ snapshotId: string }> }) {
  try {
    const { snapshotId } = await params;
    const s = await requireConsultant();
    await requireEntitlement(s.userId, s.orgId, "generate_pdf");
    const snap = await getSnapshot(s.userId, s.orgId, snapshotId);
    if (!snap) return NextResponse.json({ errore: "Documento inesistente" }, { status: 404 });

    // Il browser headless naviga la stessa pagina con la sessione dell'utente.
    const pdf = await renderPdf(`/documento/${snapshotId}`, req.headers.get("cookie") ?? "");

    // Archivio: il PDF si conserva accanto allo snapshot (unica colonna mutabile).
    const key = `${s.orgId}/documenti/${snap.companyId}/${snap.tipo}-${snap.anno}-v${snap.versione}.pdf`;
    await uploadObject(s.orgId, key, pdf, "application/pdf");
    await withTenant({ userId: s.userId, orgId: s.orgId }, async (tx) => {
      await tx.update(documentSnapshot).set({ pdfStorageKey: key }).where(eq(documentSnapshot.id, snapshotId));
      await logAudit(tx, {
        organizationId: s.orgId,
        userId: s.userId,
        azione: `documento.${snap.tipo}.pdf`,
        entita: "document_snapshot",
        entitaId: snapshotId,
      });
    });

    return new NextResponse(new Uint8Array(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${snap.tipo}-${snap.anno}-v${snap.versione}.pdf"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Generazione PDF non riuscita";
    return NextResponse.json({ errore: msg }, { status: 500 });
  }
}
