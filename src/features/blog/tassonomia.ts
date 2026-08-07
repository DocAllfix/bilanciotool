// Archivi (categorie e tag) e briciole di pane.

import type { Termine } from "./tipi";

/**
 * Da quanti articoli in su un archivio merita di stare negli indici.
 *
 * Sotto questa soglia la pagina di categoria è, di fatto, una copia sbiadita dell'unico
 * articolo che contiene: stesso argomento, stesse parole, meno sostanza. Le due pagine
 * finiscono per farsi concorrenza, e Google ne sceglie una — di solito non quella che
 * vorremmo. Sopra la soglia diventa un punto di raccolta vero, che ha senso posizionare.
 *
 * È una soglia e non un interruttore per una ragione pratica: si autocorregge. Un archivio
 * entra negli indici da solo quando si riempie, e nessuno deve ricordarsi di cambiare
 * un'impostazione sei mesi dopo. Gli archivi sotto soglia restano comunque navigabili: sono
 * `noindex, follow`, quindi i lettori li usano e Google segue i collegamenti agli articoli.
 */
export const SOGLIA_ARCHIVIO = 3;

export function archivioIndicizzabile(quantiArticoli: number): boolean {
  return quantiArticoli >= SOGLIA_ARCHIVIO;
}

export type Briciola = { nome: string; url: string };

const MARCHIO = "EvalisDeck";

function radice(sito: string): Briciola[] {
  const base = sito.replace(/\/+$/, "");
  return [
    { nome: MARCHIO, url: base },
    { nome: "Blog", url: `${base}/blog` },
  ];
}

/**
 * Il percorso di un articolo. È quello che Google mostra sotto il titolo del risultato al
 * posto dell'indirizzo nudo, e dice al lettore dove si trova prima ancora che clicchi.
 *
 * L'ultima briciola è la pagina corrente: nello schema `BreadcrumbList` ci va comunque, con
 * il suo indirizzo, perché la posizione finale del percorso è parte del percorso.
 */
export function bricioleArticolo(
  sito: string,
  articolo: { title: string; slug: string; categoria?: Termine },
): Briciola[] {
  const base = sito.replace(/\/+$/, "");
  return [
    ...radice(sito),
    ...(articolo.categoria
      ? [{ nome: articolo.categoria.nome, url: `${base}/blog/categoria/${articolo.categoria.slug}` }]
      : []),
    { nome: articolo.title, url: `${base}/blog/${articolo.slug}` },
  ];
}

/** Il percorso di una pagina di archivio. */
export function bricioleArchivio(sito: string, tipo: "categoria" | "tag", termine: Termine): Briciola[] {
  const base = sito.replace(/\/+$/, "");
  return [...radice(sito), { nome: termine.nome, url: `${base}/blog/${tipo}/${termine.slug}` }];
}

/** Lo schema BreadcrumbList, pronto da mettere in pagina. */
export function schemaBriciole(briciole: Briciola[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: briciole.map((b, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: b.nome,
      item: b.url,
    })),
  };
}
