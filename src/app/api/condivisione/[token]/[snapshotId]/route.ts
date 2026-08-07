import { NextResponse } from "next/server";
import { withTenant } from "@/lib/db/tenant";
import { documentSnapshot } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { apriCollegamento } from "@/features/condivisione";
import { signedUrl } from "@/lib/storage";

export const dynamic = "force-dynamic";

// Il download dal portale del cliente.
//
// ⚠️ Serve SOLO il PDF già archiviato, e non lo genera mai. La generazione avvia Chromium,
// e mettere Chromium dietro un indirizzo pubblico — per quanto protetto da un token — è
// un modo per farsi svuotare il budget da chiunque ricarichi la pagina. Il PDF esiste già:
// lo studio lo produce quando pubblica.
//
// Se manca, si risponde che non è disponibile invece di generarlo al volo: è una condizione
// che lo studio può risolvere in dieci secondi, e non vale il rischio.

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ token: string; snapshotId: string }> },
) {
  const { token, snapshotId } = await params;

  // Il collegamento si verifica PRIMA di toccare il documento: nessuna informazione esce
  // finché non è dimostrato che chi chiede ha la credenziale.
  const apertura = await apriCollegamento(token);
  if (apertura.esito !== "ok") return new NextResponse(null, { status: 404 });

  const voce = apertura.documenti.find((d) => d.id === snapshotId);
  // Il documento deve appartenere a QUESTO collegamento: un id valido di un'altra azienda
  // non deve poter essere scaricato passando dal token sbagliato.
  if (!voce) return new NextResponse(null, { status: 404 });

  const righe = await withTenant({ platformAdmin: true }, async (tx) =>
    tx
      .select({
        organizationId: documentSnapshot.organizationId,
        chiave: documentSnapshot.pdfStorageKey,
      })
      .from(documentSnapshot)
      .where(eq(documentSnapshot.id, snapshotId))
      .limit(1),
  );

  const snap = righe[0];
  if (!snap?.chiave) {
    return NextResponse.json(
      { errore: "Il documento non è ancora disponibile per il download. Chiedi allo studio di generarlo." },
      { status: 409 },
    );
  }

  // URL firmato a vita breve invece di far transitare i byte da qui: il file lo serve
  // l'archivio, e il collegamento firmato scade da solo.
  const url = await signedUrl(snap.organizationId, snap.chiave, 300);
  return NextResponse.redirect(url, { status: 302 });
}
