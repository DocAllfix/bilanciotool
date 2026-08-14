// Rotta di prova per il monitoraggio degli errori.
//
// NB: la cartella non puo iniziare con `_`: in Next quelle sono cartelle PRIVATE,
// escluse dal routing. La rotta esisteva nel sorgente e rispondeva 404 a tutti.
//
// Esiste per una ragione sola: un sistema di allarme che non si è mai visto scattare
// non è un sistema di allarme, è una speranza. Serve a provarlo dopo ogni cambiamento
// che lo tocchi.
//
// Protetta dallo stesso segreto dei giri automatici: senza, sarebbe un modo per
// chiunque di riempirci la quota di errori.

import { bearerCoincide } from "@/lib/segreti";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const segreto = process.env.CRON_SECRET;
  if (!bearerCoincide(req.headers.get("authorization"), segreto)) {
    return new Response(null, { status: 404 });
  }
  throw new Error("Prova del monitoraggio: se leggi questo in Sentry, gli allarmi funzionano.");
}
