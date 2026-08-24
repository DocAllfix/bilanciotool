import { NextRequest, NextResponse } from "next/server";
import { AuthError, ForbiddenError, requireConsultant } from "@/features/auth/guards";
import { EntitlementError, requireEntitlement } from "@/features/entitlement";
import { renderPdf } from "@/features/documents/pdf";
import { anagraficaPerEdizione } from "@/features/corpus/anagrafiche";
import { withTenant } from "@/lib/db/tenant";
import { logAudit } from "@/lib/audit";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

// Il PDF di un documento del corpus: una procedura o un modulo.
//
// ⚠️ NON si archivia, al contrario dei documenti pubblicati. Quelli sono immutabili per
// costruzione, quindi il loro PDF non puo' cambiare e conservarlo e' un risparmio netto.
// Il corpus e' vivo: un PDF archiviato sarebbe la fotografia di ieri servita come se
// fosse quella di oggi, e il cliente firmerebbe una procedura che nel prodotto e' gia'
// diversa. Si rigenera, e si paga Chromium ogni volta — e' il prezzo giusto per un
// documento che deve dire il vero.
//
// ⚠️ Serve `generate_pdf`, come per gli altri: chi e' in prova guarda il corpus a schermo
// e non se lo porta via.

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ companyId: string; contentSetId: string; docCode: string }> },
) {
  const { companyId, contentSetId, docCode } = await params;

  // La guardia sta FUORI dal try del lavoro: dentro lo stesso catch, «non sei
  // autenticato» e «Chromium non parte» uscirebbero entrambi come 500.
  let s;
  try {
    s = await requireConsultant();
    await requireEntitlement(s.userId, s.orgId, "generate_pdf");
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ errore: "Non autenticato" }, { status: 401 });
    if (e instanceof EntitlementError || e instanceof ForbiddenError) {
      return NextResponse.json({ errore: "Operazione non consentita" }, { status: 403 });
    }
    return NextResponse.json({ errore: "Non autorizzato" }, { status: 401 });
  }

  try {
    // Il confine di tenant: l'anagrafica esiste solo se quel modulo e' avviato per
    // QUELL'azienda di QUESTO studio. Senza, la pagina di stampa direbbe 404 dopo aver
    // gia' acceso Chromium.
    const anagrafica = await anagraficaPerEdizione(s.userId, s.orgId, companyId, contentSetId);
    if (!anagrafica) return NextResponse.json({ errore: "Documento inesistente" }, { status: 404 });

    const pdf = await renderPdf(
      `/corpus/${companyId}/${encodeURIComponent(contentSetId)}/${encodeURIComponent(docCode)}`,
      req.headers.get("cookie") ?? "",
    );

    await withTenant({ userId: s.userId, orgId: s.orgId }, (tx) =>
      logAudit(tx, {
        organizationId: s.orgId,
        userId: s.userId,
        azione: "corpus.documento.pdf",
        entita: "corpus_document",
        entitaId: `${contentSetId}:${docCode}`,
      }),
    );

    return new NextResponse(new Uint8Array(pdf), {
      headers: {
        "content-type": "application/pdf",
        "content-disposition": `inline; filename="${docCode.replace(/[^A-Za-z0-9._-]/g, "-")}.pdf"`,
      },
    });
  } catch (e) {
    console.error("[corpus pdf]", e);
    return NextResponse.json({ errore: "Generazione non riuscita" }, { status: 503 });
  }
}
