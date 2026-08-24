import { NextRequest, NextResponse } from "next/server";
import { AuthError, ForbiddenError, requireConsultant } from "@/features/auth/guards";
import { EntitlementError, requireEntitlement } from "@/features/entitlement";
import { renderPdf } from "@/features/documents/pdf";
import { getFascicolo, getSegnalazioni } from "@/features/segnalazioni/queries";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

// Il PDF di un fascicolo. NON si archivia, e non e' un documento pubblicato.
//
// ⚠️ Non archiviarlo non e' una dimenticanza: un PDF nell'archivio sarebbe un contenuto
// riservato che vive fuori dal fascicolo, con una chiave d'archivio e una vita propria —
// e il portale cliente serve i PDF gia' archiviati. Non esistendo, non puo' finirci.
//
// ⚠️ Serve `export`, non `generate_pdf`: portare fuori un fascicolo e' un'esportazione di
// dati riservati, e chi e' in prova non lo fa.

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ companyId: string; reportId: string }> },
) {
  const { companyId, reportId } = await params;

  let s;
  try {
    s = await requireConsultant();
    await requireEntitlement(s.userId, s.orgId, "export");
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ errore: "Non autenticato" }, { status: 401 });
    if (e instanceof EntitlementError || e instanceof ForbiddenError) {
      return NextResponse.json({ errore: "Operazione non consentita" }, { status: 403 });
    }
    return NextResponse.json({ errore: "Non autorizzato" }, { status: 401 });
  }

  try {
    // Il confine PRIMA di accendere Chromium. `getFascicolo` registra anche l'accesso:
    // la stampa e' una consultazione, e va nel registro come tale.
    const [f, dati] = await Promise.all([
      getFascicolo(s.userId, s.orgId, reportId),
      getSegnalazioni(s.userId, s.orgId, companyId),
    ]);
    if (!f || !dati?.assetto || f.systemId !== dati.assetto.id) {
      return NextResponse.json({ errore: "Fascicolo inesistente" }, { status: 404 });
    }

    const pdf = await renderPdf(`/fascicolo/${companyId}/${reportId}`, req.headers.get("cookie") ?? "");
    return new NextResponse(new Uint8Array(pdf), {
      headers: {
        "content-type": "application/pdf",
        "content-disposition": `inline; filename="fascicolo-${f.numero}.pdf"`,
      },
    });
  } catch (e) {
    console.error("[fascicolo pdf]", e);
    return NextResponse.json({ errore: "Generazione non riuscita" }, { status: 503 });
  }
}
