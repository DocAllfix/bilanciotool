import { decodificaEntita } from "./mappa";

// L'indice dei contenuti di un articolo, ricavato dai suoi titoli.
//
// Serve a due lettori diversi. A chi cerca una cosa sola — «chi è obbligato» — e non
// vuole scorrere duemila parole per trovarla. E ai motori di ricerca, che dalle ancore
// di una pagina ricavano i collegamenti diretti a una sezione: senza `id` nel testo
// quella possibilità non esiste, e WordPress gli `id` non li mette.
//
// Le voci e l'HTML si producono INSIEME, in un passaggio solo, ed è la scelta che regge
// tutto il resto: un indice calcolato da una parte e le ancore scritte dall'altra sono
// due elenchi destinati a divergere, e il giorno che divergono l'indice continua a
// sembrare funzionante mentre porta nel vuoto.

export type VoceIndice = {
  id: string;
  testo: string;
  livello: 2 | 3;
};

/** Sotto questa soglia l'indice non si mostra: due voci non sono una mappa, sono due
 *  righe in più fra chi legge e l'articolo. */
export const SOGLIA_INDICE = 3;

/** Da «Cos'è la rendicontazione» a `cose-la-rendicontazione`. */
function identificativo(testo: string): string {
  return (
    testo
      .toLowerCase()
      // gli accenti si scompongono e si buttano via: `à` → `a`, non `-`
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/['’`]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60)
      .replace(/-+$/g, "") || "sezione"
  );
}

const SOLO_TESTO = /<[^>]+>/g;

/**
 * Legge i titoli di secondo e terzo livello, garantisce che ognuno abbia un `id` unico
 * e restituisce l'HTML con quegli `id` dentro.
 *
 * H1 e H4 restano fuori di proposito: il primo è il titolo dell'articolo, gli altri
 * sono dettagli dentro una sezione. Un indice che li elencasse tutti smetterebbe di
 * essere una mappa.
 */
export function indiceDaHtml(html: string): { html: string; voci: VoceIndice[] } {
  const voci: VoceIndice[] = [];
  const usati = new Set<string>();

  const nuovo = html.replace(
    /<(h[23])([^>]*)>([\s\S]*?)<\/\1>/gi,
    (intero, tag: string, attributi: string, dentro: string) => {
      const testo = decodificaEntita(dentro.replace(SOLO_TESTO, "")).replace(/\s+/g, " ").trim();
      if (!testo) return intero;

      const esistente = attributi.match(/\bid=["']([^"']+)["']/i)?.[1];
      let id = esistente ?? identificativo(testo);
      // Due titoli uguali produrrebbero due ancore uguali, e il browser salterebbe
      // sempre alla prima: la seconda voce dell'indice porterebbe nel posto sbagliato
      // senza dare alcun segnale.
      if (!esistente) {
        let n = 2;
        while (usati.has(id)) id = `${identificativo(testo)}-${n++}`;
      }
      usati.add(id);

      voci.push({ id, testo, livello: tag.toLowerCase() === "h2" ? 2 : 3 });
      return esistente ? intero : `<${tag}${attributi} id="${id}">${dentro}</${tag}>`;
    },
  );

  return { html: voci.length ? nuovo : html, voci };
}
