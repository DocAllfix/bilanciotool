import { env } from "@/lib/env";
import { elencoBlog, blogVisibileAiMotori } from "@/features/blog/fonte";
import { indirizzoCanonico } from "@/lib/indirizzo";
import { AREE_VETRINA, QUANTI_PERCORSI } from "@/components/landing/percorsi-vetrina";

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

/**
 * I percorsi, presi dal registro dei moduli.
 *
 * ⚠️ Scritti a mano invecchiano in silenzio, e questa pagina lo ha dimostrato due volte.
 * Ha dichiarato «l'integrazione fra i **due** percorsi» fino al 27 agosto 2026, quando il
 * prodotto ne aveva dodici. E ha pubblicato «**30** derivati automatici» mentre i derivati
 * che `deriveKpi` calcola davvero sono **25**.
 *
 * Quel «30» e' poi ricomparso in un documento commerciale scritto da un consulente
 * esterno, che si era fidato di noi. Un numero falso su una pagina fatta apposta per
 * essere letta dai modelli linguistici non resta dov'e': viene ripetuto.
 */
function elencoPercorsi(): string {
  const NL = "\n";
  return AREE_VETRINA.map(
    (g) =>
      `### ${g.nome}` +
      NL +
      NL +
      g.percorsi.map((p) => `- **${p.titolo}** (${p.norma}): ${p.punto}`).join(NL),
  ).join(NL + NL);
}

// llms.txt: presentazione leggibile dagli assistenti AI (GEO).
// Gli articoli entrano qui insieme alla sitemap: `robots.ts` ammette esplicitamente
// GPTBot, ClaudeBot e PerplexityBot, e un blog reso da noi produce testo citabile.
export async function GET() {
  const base = indirizzoCanonico();
  const testo = `# EvalisDeck

> Piattaforma SaaS italiana per la rendicontazione di sostenibilità, la conformità e i sistemi di gestione delle PMI: inventari di gas serra secondo ISO 14064-1:2018, bilanci di sostenibilità con riferimento ai GRI Standards 2021 e alla struttura ESRS/VSME, diagnosi energetiche, Modello 231, ISO 37001, whistleblowing, due diligence di filiera, SGI qualità-ambiente-sicurezza, SA8000 e Statement of Applicability ISO/IEC 27001. Pensata per studi di consulenza che gestiscono un portafoglio di aziende clienti.

## Cosa fa

- ${QUANTI_PERCORSI} percorsi guidati in ${AREE_VETRINA.length} gruppi. Ogni azienda del portafoglio ha il proprio fascicolo e apre solo i percorsi che le servono.
- Integrazione fra i percorsi: la sezione emissioni del bilancio legge direttamente dall'inventario GHG della stessa azienda, senza ricopiare il dato.
- Pubblicazione con versioni immutabili a livello di database, PDF impaginato e codice di verifica pubblico.

## I percorsi

${elencoPercorsi()}

## Modello

Abbonamento annuale per studio: primo anno con avviamento incluso, rinnovo a prezzo ridotto. Demo guidata gratuita su un'azienda d'esempio. Dati ospitati nell'Unione Europea.

## Pagine

- [Home](${base}/)
- [Bilancio d'esempio (PDF)](${base}/esempi/esempio-bilancio-2025.pdf)
- [Rapporto GHG d'esempio (PDF)](${base}/esempi/esempio-rapporto-ghg-2025.pdf)
${await sezioneBlog(base)}`;
  return new Response(testo, { headers: { "Content-Type": "text/plain; charset=utf-8" } });
}
