import type { MetadataRoute } from "next";
import { env } from "@/lib/env";
import { elencoBlog, blogVisibileAiMotori } from "@/features/blog/fonte";
import { AGGIORNATO_AL } from "@/lib/legale";

// La sitemap.
//
// Regola nostra, diversa dal progetto da cui arriva il blog: **le pagine del prodotto
// ci sono sempre**. Se il CMS non risponde, `elencoBlog()` restituisce un elenco vuoto
// (vedi `fonte.ts`) e la sitemap perde gli articoli, non sé stessa. Una sitemap che si
// svuota perché la macchina che ospita un blog è in manutenzione direbbe a Google che
// il sito è sparito.
//
// Il blog entra solo con `BLOG_VISIBILE_AI_MOTORI=1`: finché nel CMS c'è l'articolo di
// prova, `/blog` risponde ma resta fuori dagli indici.
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const ora = new Date();

  // `lastModified` si dichiara solo dove la data la sappiamo davvero.
  //
  // Le pagine legali hanno una data di aggiornamento vera, la stessa stampata in fondo al
  // testo: se cambia il documento cambia il campo, ed è esattamente quello che il campo
  // deve dire. La home non ce l'ha, e metterci l'istante della compilazione significherebbe
  // dichiararla modificata a ogni rilascio, anche a quelli che non la toccano. Il campo è
  // facoltativo: meglio tacere che affermare una cosa che non sappiamo. Google usa la
  // propria scansione quando manca, e impara a ignorarlo quando lo trova sempre diverso.
  const legali = new Date(AGGIORNATO_AL);

  const prodotto: MetadataRoute.Sitemap = [
    { url: `${base}/`, changeFrequency: "weekly", priority: 1 },
    { url: `${base}/privacy`, lastModified: legali, changeFrequency: "yearly", priority: 0.2 },
    { url: `${base}/termini`, lastModified: legali, changeFrequency: "yearly", priority: 0.2 },
    { url: `${base}/cookie`, lastModified: legali, changeFrequency: "yearly", priority: 0.2 },
  ];

  if (!blogVisibileAiMotori()) return prodotto;

  const articoli = await elencoBlog();
  if (articoli.length === 0) return prodotto;

  return [
    ...prodotto,
    { url: `${base}/blog`, lastModified: ora, changeFrequency: "weekly", priority: 0.8 },
    ...articoli.map((a) => ({
      url: `${base}/blog/${a.slug}`,
      // La data di modifica è quella vera dell'articolo: dichiararne una falsa (oggi, a
      // ogni rigenerazione) insegna a Google a non fidarsi del campo.
      lastModified: a.dateModified ? new Date(a.dateModified) : a.date ? new Date(a.date) : ora,
      changeFrequency: "monthly" as const,
      priority: 0.6,
    })),
  ];
}
