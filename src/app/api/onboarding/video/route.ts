import { NextResponse } from "next/server";
import { requireSession } from "@/features/auth/guards";
import { signedUrl } from "@/lib/storage";

// Il video di benvenuto, servito a chi ha già fatto l'accesso.
//
// Non sta in `public/`: tredici megabyte nel repository lo raddoppierebbero, e ogni
// rimontaggio ne aggiungerebbe altrettanti per sempre — la storia di git non dimentica.
// Sta nell'archivio, dove un file si sostituisce.
//
// Il bucket è privato e va bene così: questo video si mostra dentro l'applicazione, a
// chi è entrato. La sessione serve, l'indirizzo firmato dura un'ora — più che
// sufficiente per due minuti di riproduzione, e non resta valido per sempre se qualcuno
// lo copia dalla barra del browser.

export const dynamic = "force-dynamic";

/** `_piattaforma` non può essere l'identificativo di un'organizzazione: prefisso riservato. */
const CHIAVE = "_piattaforma/onboarding/benvenuto-v1.mp4";

export async function GET() {
  // Senza sessione la risposta è 404 e basta: dire «esiste ma non è tuo» sarebbe
  // raccontare a un anonimo che cosa c'è dietro.
  try {
    await requireSession();
  } catch {
    return new NextResponse(null, { status: 404 });
  }

  // Da qui in poi un fallimento è un GUASTO NOSTRO, e va detto. Un `catch` unico che
  // restituisce 404 a chiunque fa sembrare «il file non c'è» una configurazione
  // sbagliata dell'archivio, e la diagnosi parte dalla parte opposta del sistema.
  try {
    return NextResponse.redirect(await signedUrl("_piattaforma", CHIAVE, 3600), { status: 302 });
  } catch (e) {
    console.error("[onboarding] video non firmabile:", e);
    return new NextResponse(null, { status: 503 });
  }
}
