// Pubblicazione istantanea: WordPress chiama questa rotta quando un articolo viene
// pubblicato, modificato o cestinato, e la pagina si rigenera in pochi secondi — senza
// ridistribuire il sito, e senza consumare minuti di compilazione.
//
// Accesso: header `x-blog-token` === BLOG_WEBHOOK_TOKEN. Questo segreto NON finisce mai
// in un indirizzo (per quello c'è BLOG_PREVIEW_TOKEN): resta fra WordPress e il server.
//
// Senza token valido si risponde 404 e non 401: a chi bussa non diciamo nemmeno che
// questa rotta esiste.
//
// In WordPress lo chiama il mu-plugin, su `transition_post_status` e `trashed_post`, con
// `blocking => false`: chi pubblica non resta ad aspettare.

import { revalidatePath, revalidateTag } from "next/cache";
import { after } from "next/server";
import { verificaBlog, riepilogo } from "@/features/blog/verifica";
import { blogVisibileAiMotori } from "@/features/blog/fonte";
import { inviaAllarmeBlog } from "@/lib/email";
import { segretoCoincide } from "@/lib/segreti";
import { verificaConsentita } from "@/features/blog/freno";

export const dynamic = "force-dynamic";

/** Solo slug veri: il parametro finisce in `revalidatePath`. */
const SLUG_VALIDO = /^[a-z0-9][a-z0-9-]{0,199}$/;

export async function POST(req: Request) {
  const token = process.env.BLOG_WEBHOOK_TOKEN;
  if (!segretoCoincide(req.headers.get("x-blog-token"), token)) {
    return new Response(null, { status: 404 });
  }

  let slug = "";
  try {
    const body = (await req.json()) as { slug?: unknown };
    if (typeof body?.slug === "string") slug = body.slug.toLowerCase();
  } catch {
    // Corpo assente o illeggibile: si aggiorna comunque ciò che non dipende dallo slug.
  }

  // I dati letti dal CMS portano tutti l'etichetta "blog": una riga li invalida tutti.
  // `expire: 0` = subito, non alla prossima scadenza — è il senso stesso del webhook.
  revalidateTag("blog", { expire: 0 });
  // Elenco, sitemap e llms.txt cambiano a ogni pubblicazione, qualunque sia l'articolo.
  revalidatePath("/blog");
  revalidatePath("/sitemap.xml");
  revalidatePath("/llms.txt");

  const aggiornati = ["/blog", "/sitemap.xml", "/llms.txt"];
  if (SLUG_VALIDO.test(slug)) {
    revalidatePath(`/blog/${slug}`);
    aggiornati.push(`/blog/${slug}`);
  }

  // I controlli girano DOPO aver risposto: WordPress non deve restare in attesa. Se una
  // pubblicazione ha rotto qualcosa, l'avviso parte entro pochi secondi — quando c'è
  // ancora qualcuno davanti allo schermo.
  after(async () => {
    try {
      // Al massimo una verifica al minuto: la revalidazione qui sopra avviene sempre,
      // questo giro no. Venti salvataggi in un minuto non devono produrre venti giri di
      // controlli e venti allarmi uguali.
      if (!(await verificaConsentita())) return;
      const sito = (process.env.NEXT_PUBLIC_APP_URL ?? "").replace(/\/+$/, "");
      if (!sito) return;
      const esiti = await verificaBlog({
        sito,
        cms: process.env.BLOG_CMS_URL?.replace(/\/+$/, ""),
        massimoArticoli: 5,
        visibileAiMotori: blogVisibileAiMotori(),
      });
      const { ok, righe } = riepilogo(esiti);
      if (!ok) await inviaAllarmeBlog(righe);
    } catch {
      // Un controllo che non riesce a girare non deve far fallire la pubblicazione: il
      // giro quotidiano ripassa comunque.
    }
  });

  return Response.json({ ok: true, aggiornati, quando: new Date().toISOString() });
}
