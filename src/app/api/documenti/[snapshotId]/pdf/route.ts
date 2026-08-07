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

// Chromium serverless supera i 10s di default. 60s è il tetto del piano Vercel
// Hobby: se si passa a Pro si può alzare fino a 300.
export const maxDuration = 60;
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest, { params }: { params: Promise<{ snapshotId: string }> }) {
  try {
    const { snapshotId } = await params;
    const s = await requireConsultant();
    await requireEntitlement(s.userId, s.orgId, "generate_pdf");
    const snap = await getSnapshot(s.userId, s.orgId, snapshotId);
    if (!snap) return NextResponse.json({ errore: "Documento inesistente" }, { status: 404 });

    // Se il PDF di questa versione esiste già, si serve quello e Chromium non parte.
    //
    // Non è una cache: lo snapshot è immutabile per costruzione (il trigger della
    // migrazione 0002 blocca l'update dei dati per chiunque), quindi il PDF di una data
    // versione non può cambiare. Rigenerarlo a ogni richiesta era lavoro sprecato — e
    // l'unica difesa seria contro un pulsante «scarica» premuto venti volte: meglio
    // togliere il costo che limitare la frequenza con cui lo si paga.
    //
    // Conseguenza accettata: se cambiamo l'impaginazione, i PDF già archiviati restano
    // come sono. È coerente con la natura del documento — quello consegnato al cliente è
    // quello, e chi vuole il nuovo aspetto ripubblica, ottenendo una nuova versione.
    if (snap.pdfStorageKey) {
      const { signedUrl } = await import("@/lib/storage");
      return NextResponse.redirect(await signedUrl(s.orgId, snap.pdfStorageKey, 300), { status: 302 });
    }

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
    // Diagnostica del solo problema noto (binari Chromium non inclusi nella
    // funzione serverless): senza, l'errore in produzione è cieco.
    let diagnostica: unknown;
    if (msg.includes("@sparticuz/chromium")) {
      try {
        const { readdirSync, existsSync } = await import("node:fs");
        const base = "/var/task/node_modules/@sparticuz/chromium";
        diagnostica = {
          pacchetto: existsSync(base) ? readdirSync(base) : "assente",
          bin: existsSync(`${base}/bin`) ? readdirSync(`${base}/bin`) : "assente",
          cwd: process.cwd(),
        };
      } catch (err) {
        diagnostica = String(err);
      }
    }
    return NextResponse.json({ errore: msg, diagnostica }, { status: 500 });
  }
}
