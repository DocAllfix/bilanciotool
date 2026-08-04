// Anteprima delle bozze: il consulente preme «Anteprima» in WordPress e vede l'articolo
// col disegno del sito vero, prima che sia pubblico.
//
// Senza questa rotta il bottone di WordPress porterebbe a un indirizzo del CMS, che è
// chiuso: il consulente scriverebbe alla cieca.
//
// Accesso: ?token=<BLOG_PREVIEW_TOKEN>. Senza token valido risponde 404 e non 401.
// Questo token viaggia negli indirizzi (cronologia, referrer), ed è per questo che è
// SEPARATO da quello del webhook, che non lascia mai il server.

import { draftMode } from "next/headers";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

/** Solo slug veri: senza questo controllo il parametro diventerebbe un rimando aperto. */
const SLUG_VALIDO = /^[a-z0-9][a-z0-9-]{0,199}$/;

export async function GET(req: Request) {
  const token = process.env.BLOG_PREVIEW_TOKEN;
  const url = new URL(req.url);

  if (!token || url.searchParams.get("token") !== token) {
    return new Response(null, { status: 404 });
  }

  const slug = (url.searchParams.get("slug") ?? "").toLowerCase();
  if (!SLUG_VALIDO.test(slug)) {
    return new Response("slug non valido", { status: 400 });
  }

  // Da qui la pagina articolo legge dal CMS anche le bozze, e non finisce in cache.
  (await draftMode()).enable();
  redirect(`/blog/${slug}`);
}
