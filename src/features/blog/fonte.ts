import type { Articolo, Autore, SeoArticolo } from "./tipi";
import { blogConfigurato } from "./config";
import * as wp from "./wp";

// Punto di raccordo tra le pagine e il CMS, e — differenza deliberata dal progetto
// da cui questo modulo arriva — **l'ammortizzatore**.
//
// Là il blog è tutto il sito, e una compilazione che non raggiunge WordPress deve
// fallire: pubblicare un blog vuoto senza accorgersene sarebbe peggio.
//
// QUI no. Questa stessa compilazione produce anche il portafoglio, i cinque percorsi
// e la generazione dei documenti: è il prodotto che i clienti pagano. Un WordPress
// spento per manutenzione non deve poter bloccare il rilascio di una correzione al
// prodotto, e un deploy urgente non deve dipendere dalla macchina che ospita un blog.
//
// Quindi `wp.ts` resta com'è — onesto, solleva quando qualcosa non va — e le eccezioni
// si fermano tutte qui: si registrano in modo rumoroso e la pagina degrada.
//
// Il rischio che l'altro progetto voleva evitare (un blog vuoto che nessuno nota) qui
// lo copre `verifica.ts`, che gira dopo ogni pubblicazione e ogni mattina: **avvisa**
// invece di fermare la produzione.

/** Registra il guasto in modo che si veda nei log di Vercel, e restituisce il ripiego. */
function ripiego<T>(operazione: string, errore: unknown, valore: T): T {
  console.error(
    `[blog] ${operazione} non riuscita: il blog degrada, il resto del sito no. ` +
      `Causa: ${errore instanceof Error ? errore.message : String(errore)}`,
  );
  return valore;
}

/** Tutti gli articoli, dal più recente. Vuoto se il CMS non è agganciato o non risponde. */
export async function elencoBlog(): Promise<Articolo[]> {
  if (!blogConfigurato()) return [];
  try {
    return await wp.elencoArticoli();
  } catch (e) {
    return ripiego("lettura dell'elenco articoli", e, []);
  }
}

/** Gli slug pubblicati, per `generateStaticParams` e per la sitemap. */
export async function slugBlog(): Promise<string[]> {
  if (!blogConfigurato()) return [];
  try {
    return await wp.slugArticoli();
  } catch (e) {
    return ripiego("lettura degli slug", e, []);
  }
}

/** Un articolo coi suoi metadati e i correlati. `null` se non esiste o se il CMS tace. */
export async function articoloBlog(
  slug: string,
  opts: { bozza?: boolean } = {},
): Promise<{ articolo: Articolo; seo: SeoArticolo; correlati: Articolo[] } | null> {
  if (!blogConfigurato()) return null;
  try {
    const trovato = await wp.articoloPerSlug(slug, opts);
    if (!trovato) return null;
    // I correlati sono un di più: se falliscono, l'articolo si legge lo stesso.
    let correlati: Articolo[] = [];
    try {
      correlati = await wp.articoliCorrelati(slug, trovato.articolo.category);
    } catch (e) {
      correlati = ripiego("lettura dei correlati", e, []);
    }
    return { ...trovato, correlati };
  } catch (e) {
    return ripiego(`lettura dell'articolo «${slug}»`, e, null);
  }
}

/**
 * Un URL vecchio a cui corrisponde un articolo rinominato: restituisce lo slug attuale,
 * così la pagina può rispondere 301 invece di 404.
 */
export async function slugSostitutivo(slug: string): Promise<string | null> {
  if (!blogConfigurato()) return null;
  try {
    return await wp.slugCorrente(slug);
  } catch (e) {
    return ripiego(`ricerca dello slug sostitutivo di «${slug}»`, e, null);
  }
}

/** Un autore coi suoi articoli. `null` se non esiste. */
export async function autoreBlog(
  slug: string,
): Promise<{ autore: Autore; articoli: Articolo[] } | null> {
  if (!blogConfigurato()) return null;
  try {
    const autore = await wp.autorePerSlug(slug);
    if (!autore) return null;
    return { autore, articoli: await wp.articoliDiAutore(slug) };
  } catch (e) {
    return ripiego(`lettura dell'autore «${slug}»`, e, null);
  }
}

/** Gli slug degli autori che hanno pubblicato. */
export async function slugAutoriBlog(): Promise<string[]> {
  if (!blogConfigurato()) return [];
  try {
    return await wp.slugAutori();
  } catch (e) {
    return ripiego("lettura degli autori", e, []);
  }
}

/**
 * Il blog è visibile ai motori di ricerca?
 *
 * Spento di partenza, e si accende con `BLOG_VISIBILE_AI_MOTORI=1`. Finché è spento:
 * `/blog` risponde ma con `noindex`, non entra in sitemap e non compare nel menu.
 *
 * Serve perché nel CMS ci sarà un **articolo di prova** usato per verificare la catena
 * intera, e un'accensione automatica «al primo articolo» scatterebbe proprio su quello.
 * Andare pubblici resta un atto deliberato — una variabile e un rilascio — invece di un
 * effetto collaterale.
 */
export function blogVisibileAiMotori(): boolean {
  return process.env.BLOG_VISIBILE_AI_MOTORI === "1";
}
