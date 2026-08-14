import { NextRequest, NextResponse } from "next/server";
import { AuthError, ForbiddenError, requireConsultant } from "@/features/auth/guards";
import { EntitlementError, requireEntitlement } from "@/features/entitlement";
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
  const { snapshotId } = await params;

  // La GUARDIA sta fuori dal `try` del lavoro, ed e' la stessa forma della rotta del
  // video. Dentro lo stesso `catch`, un "non sei autenticato" e un "Chromium non
  // parte" uscivano entrambi come 500: il client non poteva distinguere una sessione
  // scaduta da un guasto nostro, e nemmeno noi leggendo i log.
  let s;
  try {
    s = await requireConsultant();
    await requireEntitlement(s.userId, s.orgId, "generate_pdf");
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ errore: "Non autenticato" }, { status: 401 });
    if (e instanceof EntitlementError || e instanceof ForbiddenError) {
      return NextResponse.json({ errore: "Operazione non consentita" }, { status: 403 });
    }
    console.error("[pdf] guardia fallita:", e);
    return NextResponse.json({ errore: "Non autorizzato" }, { status: 401 });
  }

  try {
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
    // Il dettaglio resta nei LOG, dove serve a noi. Al client va una frase e basta.
    //
    // Prima usciva `e.message` grezzo: per un errore Postgres contiene frammenti di
    // query e nomi di colonna, per un errore dell'archivio il corpo della risposta di
    // Supabase. E la "diagnostica" elencava al browser il contenuto di
    // `/var/task/node_modules` con la cartella di lavoro della funzione: era servita
    // una volta, per capire perche' Chromium non partisse su Vercel, e non e' piu'
    // stata tolta. Quella diagnosi ora si legge in Sentry e nei log della funzione,
    // che e' dove va guardata comunque.
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes("@sparticuz/chromium")) {
      const { readdirSync, existsSync } = await import("node:fs");
      const base = "/var/task/node_modules/@sparticuz/chromium";
      console.error("[pdf] binari Chromium:", {
        pacchetto: existsSync(base) ? readdirSync(base) : "assente",
        bin: existsSync(`${base}/bin`) ? readdirSync(`${base}/bin`) : "assente",
        cwd: process.cwd(),
      });
    }
    console.error("[pdf] generazione fallita per lo snapshot", snapshotId, e);
    return NextResponse.json({ errore: "Generazione del PDF non riuscita" }, { status: 500 });
  }
}
