// Il segnaposto che il consulente SEO incolla in WordPress, e che noi trasformiamo nel
// richiamo al percorso.
//
//   <div class="evalis-percorso" id="bilancio-energetico"></div>
//
// ⚠️ PERCHÉ UN SEGNAPOSTO E NON HTML VERO. Tre ragioni, tutte misurate:
//
//  1. la sanificazione degli articoli è a lista bianca stretta: dal CMS passano `div` e
//     `span` con i soli attributi `class` e `id`. Un `data-*`, uno `style` o un `onclick`
//     vengono buttati via in silenzio, ed è la difesa che impedisce a chi ha accesso al CMS
//     di infilare codice nelle nostre pagine. Il segnaposto usa apposta ciò che sopravvive;
//  2. Tailwind genera il CSS leggendo i NOSTRI file sorgente, non i contenuti di WordPress:
//     un riquadro incollato con le nostre classi uscirebbe senza stile, perché quelle classi
//     non verrebbero mai generate. È lo stesso difetto che lasciò cinque aree senza colore;
//  3. l'HTML incollato congela il disegno dentro il CMS: non segue il tema scuro, non si
//     stringe sul telefono, e il giorno in cui cambia il nome di una fascia resta indietro
//     in venti articoli.
//
// ⚠️ E se il segnaposto punta a un percorso che non esiste, o arriva prima che il codice sia
// online, NON SI VEDE NIENTE: un `div` vuoto. Chi lo incolla non può rompere la pagina.

export type PezzoArticolo =
  | { tipo: "html"; html: string }
  | { tipo: "richiamo"; slug: string };

/** Un `div` vuoto (o con soli spazi dentro), con gli attributi da leggere. */
const DIV_VUOTO = /<div\b([^>]*)>\s*<\/div>/gi;
const CLASSE = /class\s*=\s*["']([^"']*)["']/i;
const ID = /\bid\s*=\s*["']([^"']*)["']/i;

/** La classe con cui si riconosce il segnaposto. Sta qui perché la scrive una persona in un
 *  CMS: cambiarla significa rompere gli articoli già pubblicati. */
export const CLASSE_RICHIAMO = "evalis-percorso";

function slugDelRichiamo(attributi: string): string | null {
  const classi = attributi.match(CLASSE)?.[1] ?? "";
  if (!classi.split(/\s+/).includes(CLASSE_RICHIAMO)) return null;
  const id = attributi.match(ID)?.[1]?.trim();
  return id ? id : null;
}

/**
 * Divide il corpo di un articolo nei pezzi da rendere: HTML così com'è, e richiami.
 *
 * L'editor di WordPress può avvolgere il blocco in un paragrafo: il `<p>` che resterebbe
 * vuoto attorno al segnaposto si toglie, altrimenti l'articolo si ritrova uno spazio
 * fantasma là dove prima c'era il riquadro.
 */
export function dividiPerRichiami(html: string): PezzoArticolo[] {
  const pezzi: PezzoArticolo[] = [];
  let cursore = 0;

  for (const m of html.matchAll(DIV_VUOTO)) {
    const slug = slugDelRichiamo(m[1] ?? "");
    if (!slug) continue;
    const indice = m.index ?? 0;
    pezzi.push({ tipo: "html", html: html.slice(cursore, indice) });
    pezzi.push({ tipo: "richiamo", slug });
    cursore = indice + m[0].length;
  }
  pezzi.push({ tipo: "html", html: html.slice(cursore) });

  return pezzi
    .map((p) => (p.tipo === "html" ? { ...p, html: senzaParagrafoVuoto(p.html) } : p))
    .filter((p) => p.tipo === "richiamo" || p.html.trim() !== "");
}

/** `<p>` rimasto orfano attorno al segnaposto, in apertura o in chiusura. */
function senzaParagrafoVuoto(html: string): string {
  return html.replace(/<p>\s*$/i, "").replace(/^\s*<\/p>/i, "");
}
