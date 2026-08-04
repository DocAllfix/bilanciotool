import { env } from "@/lib/env";
import { elencoBlog, blogVisibileAiMotori } from "@/features/blog/fonte";

/** Gli articoli, se il blog e' acceso per i motori. Vuoto altrimenti, e vuoto se il
 *  CMS non risponde: questa pagina non deve mai fallire per colpa del blog. */
async function sezioneBlog(base: string): Promise<string> {
  if (!blogVisibileAiMotori()) return "";
  const articoli = await elencoBlog();
  if (articoli.length === 0) return "";
  const righe = articoli
    .slice(0, 50)
    .map((a) => `- [${a.title}](${base}/blog/${a.slug})${a.excerpt ? ` — ${a.excerpt}` : ""}`)
    .join("\n");
  return ["", "## Articoli", "", righe, ""].join("\n");
}

// llms.txt: presentazione leggibile dagli assistenti AI (GEO).
// Gli articoli entrano qui insieme alla sitemap: `robots.ts` ammette esplicitamente
// GPTBot, ClaudeBot e PerplexityBot, e un blog reso da noi produce testo citabile.
export async function GET() {
  const base = env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const testo = `# EvalisDeck

> Piattaforma SaaS italiana per la rendicontazione di sostenibilità delle PMI: inventari di gas serra secondo ISO 14064-1:2018 e bilanci di sostenibilità con riferimento ai GRI Standards 2021 e alla struttura ESRS/VSME. Pensata per studi di consulenza che gestiscono un portafoglio di aziende clienti.

## Cosa fa

- Percorso guidato in 8 passi per l'inventario GHG: confini, registro di 25 sorgenti, dati di attività, fattori di emissione documentati, risultati con doppia rendicontazione Scope 2 (location e market-based), incertezza combinata, anno base e obiettivi, rapporto conforme al §9.3.1.
- Percorso guidato in 7 passi per il bilancio: analisi di doppia rilevanza su 18 temi con guide di valutazione, 49 indicatori su due esercizi con 30 derivati automatici, politiche e obiettivi sui temi materiali, capitoli narrativi, documento impaginato con indice GRI/ESRS.
- Integrazione fra i due percorsi: la sezione emissioni del bilancio legge direttamente dall'inventario GHG della stessa azienda.
- Pubblicazione con versioni immutabili e PDF impaginato.

## Modello

Abbonamento annuale per studio: primo anno con avviamento incluso, rinnovo a prezzo ridotto. Demo guidata gratuita su un'azienda d'esempio. Dati ospitati nell'Unione Europea.

## Pagine

- [Home](${base}/)
- [Bilancio d'esempio (PDF)](${base}/esempi/esempio-bilancio-2025.pdf)
- [Rapporto GHG d'esempio (PDF)](${base}/esempi/esempio-rapporto-ghg-2025.pdf)
${await sezioneBlog(base)}`;
  return new Response(testo, { headers: { "Content-Type": "text/plain; charset=utf-8" } });
}
