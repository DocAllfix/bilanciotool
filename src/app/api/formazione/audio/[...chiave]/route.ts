import { NextResponse } from "next/server";

import { requireSession } from "@/features/auth/guards";
import { traccia } from "@/features/formazione/audio";
import { signedUrl } from "@/lib/storage";

// L'audio dei corsi, servito a chi ha fatto l'accesso.
//
// Non sta in `public/`: trenta megabyte nel repository lo triplicherebbero, e ogni
// rigenerazione ne aggiungerebbe altrettanti per sempre. Sta nell'archivio, dove un file
// si sostituisce, sotto il prefisso riservato `_piattaforma`.

export const dynamic = "force-dynamic";

export async function GET(_req: Request, ctx: { params: Promise<{ chiave: string[] }> }) {
  const { chiave } = await ctx.params;

  // Senza sessione la risposta è 404 e basta: dire «esiste ma non è tuo» racconterebbe a
  // un anonimo che cosa c'è dietro.
  try {
    await requireSession();
  } catch {
    return new NextResponse(null, { status: 404 });
  }

  // ⚠️ IL PERCORSO NON SI COSTRUISCE DAI SEGMENTI DELL'INDIRIZZO: si cerca la chiave nel
  // manifesto, e quello che non c'è è 404. Un controllo per espressione regolare («niente
  // punto punto, niente barre») è un elenco di cose vietate, e basta dimenticarne una;
  // l'appartenenza a un insieme noto non ha modi di essere aggirata. Questo prodotto ha già
  // pagato un attraversamento di percorso su una chiave presa dall'indirizzo.
  const t = traccia(chiave.join("/"));
  if (!t) return new NextResponse(null, { status: 404 });

  // Da qui in poi un fallimento è un GUASTO NOSTRO e va detto: un `catch` unico che
  // restituisce 404 a chiunque fa sembrare «il file non c'è» un archivio mal configurato,
  // e la diagnosi parte dalla parte opposta del sistema.
  try {
    return NextResponse.redirect(await signedUrl("_piattaforma", t.chiave_archivio, 3600), { status: 302 });
  } catch (e) {
    console.error("[formazione] traccia non firmabile:", e);
    return new NextResponse(null, { status: 503 });
  }
}
