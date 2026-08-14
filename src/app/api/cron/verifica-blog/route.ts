// Il giro quotidiano sui controlli del blog.
//
// Serve perché metà di ciò che tiene in piedi il posizionamento non «avviene»: è uno
// STATO, e lo stato deriva. Un aggiornamento di Yoast può rimettere la sua sitemap,
// qualcuno tocca un'impostazione, un plugin nuovo cambia i permalink. Nessuno se ne
// accorge finché il danno non è in Search Console tre settimane dopo.
//
// I controlli girano anche dopo ogni pubblicazione (dal webhook), ma quelli intercettano
// solo ciò che rompe una pubblicazione. Questo intercetta la deriva.
//
// Accesso: `Authorization: Bearer <CRON_SECRET>`, impostato da Vercel. Senza, 404.

import { verificaBlog, riepilogo } from "@/features/blog/verifica";
import { blogVisibileAiMotori } from "@/features/blog/fonte";
import { inviaAllarmeBlog } from "@/lib/email";
import { bearerCoincide } from "@/lib/segreti";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(req: Request) {
  const segreto = process.env.CRON_SECRET;
  if (!bearerCoincide(req.headers.get("authorization"), segreto)) {
    return new Response(null, { status: 404 });
  }

  const sito = (process.env.NEXT_PUBLIC_APP_URL ?? "").replace(/\/+$/, "");
  if (!sito) return Response.json({ ok: false, motivo: "NEXT_PUBLIC_APP_URL mancante" });

  const esiti = await verificaBlog({
    sito,
    cms: process.env.BLOG_CMS_URL?.replace(/\/+$/, ""),
    visibileAiMotori: blogVisibileAiMotori(),
  });
  const { ok, righe } = riepilogo(esiti);

  // Un allarme al giorno solo quando c'è qualcosa che non va: una mail quotidiana che dice
  // «tutto bene» si impara a ignorare, ed è il modo migliore per non vedere quella vera.
  if (!ok) await inviaAllarmeBlog(righe);

  return Response.json({ ok, esiti, quando: new Date().toISOString() });
}
