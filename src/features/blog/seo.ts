// Riscrittura degli URL che arrivano da WordPress sul dominio pubblico.
//
// E' LA FUNZIONE PIU' IMPORTANTE DELL'INTERO BLOG. Yoast genera canonical, og:url e schema
// puntati al dominio del CMS. Se li pubblicassimo cosi', ogni articolo direbbe a Google
// "l'originale sta su cms.evalisdeck.it" — un dominio chiuso al pubblico e marcato noindex.
// Risultato: Google deindicizza le NOSTRE pagine in favore di pagine che non puo' nemmeno
// vedere, e il blog sparisce dalla ricerca.
//
// Regola, senza eccezioni: WordPress fornisce i VALORI, il frontend decide gli URL.

import type { SeoArticolo } from "./tipi";

/** Un URL del CMS diventa lo stesso percorso sul dominio pubblico. Gli altri restano intatti. */
export function riportaSuPubblico(url: string | undefined, cms: string, pubblico: string): string | undefined {
  if (!url) return undefined;
  if (!cms) return url;
  const cmsNorm = cms.replace(/\/+$/, "");
  const pubNorm = pubblico.replace(/\/+$/, "");
  // sia http che https del CMS, con o senza "www"
  const host = cmsNorm.replace(/^https?:\/\//, "");
  const rx = new RegExp(`https?://(www\\.)?${host.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`, "gi");
  return url.replace(rx, pubNorm);
}

/**
 * Riscrive OGNI riferimento al CMS dentro un frammento di HTML: link, immagini, srcset.
 * Serve al corpo degli articoli: un link scritto dal redattore verso un altro articolo viene
 * salvato da WordPress come URL assoluto del CMS, e pubblicato cosi' porterebbe il visitatore
 * su un dominio chiuso, regalandogli anche autorita'.
 */
export function riscriviLinkInterni(html: string, cms: string, pubblico: string): string {
  if (!html || !cms) return html ?? "";
  return riportaSuPubblico(html, cms, pubblico) ?? html;
}

/**
 * Toglie il nome del sito accodato al titolo.
 *
 * Yoast lo mette in fondo a ogni titolo, e il nostro layout ne accoda un altro: il risultato
 * e' «Titolo - EvalisDeck · EvalisDeck», che oltre a leggersi male occupa il posto delle
 * parole vere nei 60 caratteri che Google mostra.
 *
 * Si potrebbe spegnere dal pannello di Yoast, ma un'impostazione si riattiva con un
 * aggiornamento o con una distrazione, e nessuno se ne accorge. Qui il suffisso da togliere
 * non e' scritto a mano: e' `og_site_name`, cioe' lo dichiara lo stesso CMS che lo ha messo.
 */
export function senzaMarchioInCoda(titolo: string, nomeSito: string | undefined): string {
  if (!nomeSito) return titolo;
  const separatori = "-–—|·»:";
  const re = new RegExp(
    `\\s*[${separatori}]\\s*${nomeSito.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*$`,
    "i",
  );
  const ripulito = titolo.replace(re, "").trim();
  // Un titolo che era SOLO il marchio resta com'era: meglio ridondante che vuoto.
  return ripulito || titolo;
}

/**
 * Traduce `yoast_head_json` nei metadati della pagina, con TUTTI gli URL riportati sul dominio
 * pubblico. Il canonical viene comunque FORZATO su `/blog/<slug>`: anche se Yoast fornisse un
 * valore strano, l'indirizzo canonico dei nostri articoli lo decidiamo noi.
 */
export function seoDaYoast(
  yoast: Record<string, unknown> | undefined,
  opts: { slug: string; cms: string; pubblico: string },
): SeoArticolo {
  const y = (yoast ?? {}) as Record<string, unknown>;
  const og = (y["og_image"] as Array<{ url?: string }> | undefined)?.[0]?.url;

  const stringa = (k: string): string | undefined => {
    const v = y[k];
    return typeof v === "string" && v.trim() ? v.trim() : undefined;
  };

  const nomeSito = stringa("og_site_name");
  const pulisci = (v: string | undefined) => (v ? senzaMarchioInCoda(v, nomeSito) : undefined);

  return {
    title: pulisci(stringa("title")),
    description: stringa("description") ?? stringa("og_description"),
    // canonical SEMPRE nostro, mai quello di Yoast
    canonical: `${opts.pubblico.replace(/\/+$/, "")}/blog/${opts.slug}`,
    ogTitle: pulisci(stringa("og_title") ?? stringa("title")),
    ogDescription: stringa("og_description") ?? stringa("description"),
    ogImage: riportaSuPubblico(og, opts.cms, opts.pubblico),
  };
}

/**
 * Serializza dati strutturati per un `<script type="application/ld+json">`.
 *
 * `JSON.stringify` **non** scappa il carattere `<`: un titolo che contenesse
 * `</script><script>…` chiuderebbe il tag e il resto diventerebbe codice eseguibile
 * nella pagina. Non e' un'ipotesi di scuola — questi valori (titolo, riassunto, nome
 * dell'autore, biografia) li scrive chi ha accesso al CMS, e sul CMS c'e' un editor
 * esterno: il consulente SEO.
 *
 * L'attenuante «gli autori sono fidati» qui non regge. Un editor esterno e' una persona
 * in piu' che puo' sbagliare o farsi rubare le credenziali, e il costo di questa riga e'
 * zero.
 *
 * Si scappa anche `>` e i separatori di riga U+2028/U+2029: non chiudono un tag, ma sono
 * fine-riga per il parser JavaScript e spezzano lo script anche se il JSON e' valido.
 * Le sequenze `\uXXXX` restano JSON legittimo, quindi Google legge esattamente lo stesso
 * dato.
 */
export function jsonLd(dato: unknown): string {
  return JSON.stringify(dato)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
}
