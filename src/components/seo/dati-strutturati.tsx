import { jsonLd } from "@/features/blog/seo";

/**
 * I dati strutturati, messi dove i motori li leggono e non dove li legge il cliente.
 *
 * ⚠️ ESISTE PER TOGLIERE UNA TRAPPOLA. `jsonLd()` restituisce una STRINGA, non un
 * elemento: si usa dentro `dangerouslySetInnerHTML` di uno `<script>`. Ma il nome legge
 * come se producesse il tag, il tipo `string` in JSX è perfettamente valido, e scritto
 * come `{jsonLd(OFFERTE)}` React lo rende come TESTO.
 *
 * È successo il 27 agosto 2026 sulla pagina prezzi: in fondo alla pagina compariva il
 * JSON per intero, e siccome è una riga unica lunga migliaia di caratteri la pagina
 * sfondava di 601 pixel su un telefono da 360. Nessun errore, nessun avviso: solo un
 * muro di testo dove doveva esserci il piede.
 *
 * Il collaudo aveva misurato lo sfondamento subito e correttamente. A perdere tempo è
 * stata l'ipotesi — la tabella larga sembrava il colpevole ovvio — e sei esperimenti
 * sono serviti a smentirla. La foto lo ha detto al primo sguardo: **quando la misura e
 * l'ipotesi non tornano, si guarda la cosa.**
 *
 * Un pericolo si evita, non si filtra: qui il tag c'è sempre, e chi usa questo
 * componente non può sbagliarlo.
 */
export function DatiStrutturati({ dato }: { dato: unknown }) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(dato) }} />;
}
