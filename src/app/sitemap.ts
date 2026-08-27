import type { MetadataRoute } from "next";
import { env } from "@/lib/env";
import { elencoBlog, terminiBlog, blogVisibileAiMotori } from "@/features/blog/fonte";
import { archivioIndicizzabile } from "@/features/blog/tassonomia";
import { AGGIORNATO_AL } from "@/lib/legale";
import { indirizzoCanonico } from "@/lib/indirizzo";

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
  const base =indirizzoCanonico();
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
    // ⚠️ «Quanto costa EvalisDeck» e' una domanda che si fa a un motore di ricerca, e da
    // qualche tempo a un modello linguistico. Se la risposta non sta su una nostra pagina
    // la costruisce qualcun altro, o non arriva. Priorita' alta: e' la seconda pagina del
    // sito per intenzione d'acquisto.
    //
    // ⚠️ NESSUN `lastModified`: non lo conosciamo. Un valore generato a ogni richiesta
    // dice «modificata adesso» per sempre, e Google impara a ignorare il campo — anche
    // quando poi diciamo il vero.
    { url: `${base}/prezzi`, changeFrequency: "monthly", priority: 0.9 },
    // ⚠️ La verifica sta in sitemap perche' e' una pagina che vogliamo si TROVI: chi
    // riceve un documento non sa che esiste, e la cerca. Non espone niente finche' non
    // le si da' un codice, quindi non ha la riserva del portale cliente.
    { url: `${base}/verifica`, changeFrequency: "yearly", priority: 0.5 },
    { url: `${base}/privacy`, lastModified: legali, changeFrequency: "yearly", priority: 0.2 },
    { url: `${base}/termini`, lastModified: legali, changeFrequency: "yearly", priority: 0.2 },
    { url: `${base}/cookie`, lastModified: legali, changeFrequency: "yearly", priority: 0.2 },
  ];

  if (!blogVisibileAiMotori()) return prodotto;

  // A blog acceso `/blog` c'è sempre, anche senza articoli: è una pagina indicizzabile e
  // collegata dal menu, e una pagina così che manca dalla sitemap è un buco — lo stesso che
  // `verifica-sitemap.mjs` va a cercare. Gli articoli si aggiungono se ci sono.
  const articoli = await elencoBlog();

  // L'elenco è «modificato» quando esce o cambia un articolo, non quando qualcuno lo apre:
  // la sua data è quella dell'articolo più recente. Senza articoli non si dichiara niente,
  // per la stessa ragione della home.
  const piuRecente = articoli
    .map((a) => a.dateModified ?? a.date)
    .filter((d): d is string => Boolean(d))
    .sort()
    .at(-1);

  // Gli archivi entrano SOLO se hanno abbastanza articoli: sotto soglia sono `noindex`, e
  // un indirizzo noindex dentro la sitemap è una contraddizione che Search Console segnala.
  // La stessa soglia governa le due cose, così non possono discordare.
  const archivi: MetadataRoute.Sitemap = [];
  for (const tipo of ["categoria", "tag"] as const) {
    for (const { termine, quanti } of await terminiBlog(tipo)) {
      if (!archivioIndicizzabile(quanti)) continue;
      archivi.push({
        url: `${base}/blog/${tipo}/${termine.slug}`,
        changeFrequency: "weekly",
        priority: 0.4,
      });
    }
  }

  return [
    ...prodotto,
    ...archivi,
    {
      url: `${base}/blog`,
      ...(piuRecente ? { lastModified: new Date(piuRecente) } : {}),
      changeFrequency: "weekly",
      priority: 0.8,
    },
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
