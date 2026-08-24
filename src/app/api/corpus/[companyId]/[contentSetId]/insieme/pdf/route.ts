import { NextRequest, NextResponse } from "next/server";
import { AuthError, ForbiddenError, requireConsultant } from "@/features/auth/guards";
import { EntitlementError, requireEntitlement } from "@/features/entitlement";
import { renderPdf } from "@/features/documents/pdf";
import { anagraficaPerEdizione } from "@/features/corpus/anagrafiche";
import { withTenant } from "@/lib/db/tenant";
import { logAudit } from "@/lib/audit";

// Un fascicolo del corpus in un PDF solo: una fase intera, o tutte.
//
// ⚠️ `maxDuration` a 120 e non 60: qui Chromium impagina nove procedure invece di una, e
// il tetto di una singola non basta. E' il tetto del piano Pro; su Hobby si fermerebbe a
// 60, quindi se un giorno si torna indietro questa rotta e' la prima che si spezza.
export const maxDuration = 120;
export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ companyId: string; contentSetId: string }> },
) {
  const { companyId, contentSetId } = await params;
  const fase = req.nextUrl.searchParams.get("fase");
  const tipo = req.nextUrl.searchParams.get("tipo");

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
    const anagrafica = await anagraficaPerEdizione(s.userId, s.orgId, companyId, contentSetId);
    if (!anagrafica) return NextResponse.json({ errore: "Corpus inesistente" }, { status: 404 });

    const q = new URLSearchParams();
    if (fase) q.set("fase", fase);
    if (tipo) q.set("tipo", tipo);
    const pdf = await renderPdf(
      `/corpus/${companyId}/${encodeURIComponent(contentSetId)}/insieme?${q.toString()}`,
      req.headers.get("cookie") ?? "",
    );

    // ⚠️ L'estrazione di un fascicolo intero si REGISTRA. E' il gesto che il piano
    // distingueva dal lavorare: chi stampa una procedura sta lavorando, chi stampa
    // l'intero corpus sta raccogliendo, e la differenza si vede solo nel registro.
    await withTenant({ userId: s.userId, orgId: s.orgId }, (tx) =>
      logAudit(tx, {
        organizationId: s.orgId,
        userId: s.userId,
        azione: "corpus.insieme.pdf",
        entita: "corpus_document",
        entitaId: `${contentSetId}:${fase ?? "tutto"}`,
        dettagli: { fase, tipo },
      }),
    );

    const nome = (fase ?? "corpus").replace(/[^A-Za-z0-9._-]/g, "-");
    return new NextResponse(new Uint8Array(pdf), {
      headers: {
        "content-type": "application/pdf",
        "content-disposition": `inline; filename="${nome}.pdf"`,
      },
    });
  } catch (e) {
    console.error("[corpus insieme pdf]", e);
    return NextResponse.json({ errore: "Generazione non riuscita" }, { status: 503 });
  }
}
