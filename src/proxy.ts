import { NextResponse, type NextRequest } from "next/server";
import { eRimosso } from "@/features/blog/rimossi";

// Il 410 sugli articoli rimossi.
//
// Sta qui e non nella pagina perché una pagina Next può rispondere 404, non 410. E la
// distinzione conta: il 404 dice a Google «non lo trovo adesso» e l'indirizzo resta
// nell'indice per mesi; il 410 dice «rimosso» e lo toglie in fretta.
//
// ⚠️ QUESTO GIRA SU OGNI RICHIESTA, comprese quelle del prodotto — portafoglio, percorsi,
// generazione dei documenti. Per questo la prima riga è un'uscita: tutto ciò che non è
// `/blog/` esce prima di toccare qualunque altra cosa. Un middleware che fa lavoro inutile
// lo fa su ogni pagina di ogni utente.
//
// `matcher` limita già l'attivazione a `/blog/*`, ma il controllo esplicito resta: il
// matcher è configurazione, e la configurazione si cambia per distrazione.

export function proxy(req: NextRequest) {
  const percorso = req.nextUrl.pathname;
  if (!percorso.startsWith("/blog/")) return NextResponse.next();

  if (eRimosso(percorso)) {
    return new NextResponse(
      "<!doctype html><meta charset=utf-8><title>Articolo rimosso</title>" +
        "<p>Questo articolo è stato rimosso definitivamente.",
      {
        status: 410,
        headers: {
          "content-type": "text/html; charset=utf-8",
          // Non deve restare in cache al bordo: se un giorno l'elenco cambia, la
          // risposta deve cambiare con lui.
          "cache-control": "no-store",
        },
      },
    );
  }

  return NextResponse.next();
}

export const config = {
  matcher: "/blog/:percorso*",
};
