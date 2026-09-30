// Come si usa una copertina, deciso dalla FORMA dell'immagine caricata.
//
// ⚠️ PERCHÉ ESISTE (30 settembre 2026). Il modo predefinito era «fotografia»: una fascia
// in alto, ritagliata dal centro, con sotto il titolo scritto dal documento. Per una
// locandina A4 già impaginata è la scelta sbagliata quasi sempre, e la prima copertina vera
// caricata in produzione è uscita così: tagliata a metà e fusa col titolo nostro. Mettere
// «pagina intera» come predefinito per tutti avrebbe rovesciato il difetto su chi carica una
// fotografia orizzontale: una foto piccola in mezzo a un foglio bianco, senza titolo.
//
// La forma distingue i due casi quasi sempre: una copertina impaginata è verticale e ha le
// proporzioni di un foglio (A4 1,414; Letter 1,294), una fotografia no. La scelta resta
// modificabile con un clic: questo è il punto di partenza, non un divieto.
//
// Puro, senza dipendenze: legge le dimensioni dall'intestazione del file, senza decodificare
// l'immagine, così gira sul server dentro `setCompanyImage` — l'unica strada di caricamento —
// e vale per qualunque schermata ci arrivi.

export type ModoCopertina = "foto" | "pagina";

/** Altezza su larghezza di un foglio: da Letter (1,294) ad A4 (1,414), con un margine. Il
 * minimo sta sopra 1,25 apposta: 4:5 è il verticale delle fotografie per i social, e resta foto. */
export const PROPORZIONI_FOGLIO = { min: 1.27, max: 1.6 } as const;

export function modoPerProporzioni(larghezza: number, altezza: number): ModoCopertina {
  if (!(larghezza > 0) || !(altezza > 0)) return "foto";
  const r = altezza / larghezza;
  return r >= PROPORZIONI_FOGLIO.min && r <= PROPORZIONI_FOGLIO.max ? "pagina" : "foto";
}

/**
 * Larghezza e altezza lette dall'intestazione di un PNG, JPEG, WebP o GIF — i quattro
 * formati che il caricamento accetta. `null` se il file non si riconosce: chi chiama non
 * deve indovinare, e in quel caso lascia il modo com'era.
 */
export function dimensioniImmagine(b: Uint8Array): { larghezza: number; altezza: number } | null {
  const u32 = (i: number) => ((b[i] << 24) | (b[i + 1] << 16) | (b[i + 2] << 8) | b[i + 3]) >>> 0;
  const u16be = (i: number) => (b[i] << 8) | b[i + 1];
  const u16le = (i: number) => b[i] | (b[i + 1] << 8);
  const u24le = (i: number) => b[i] | (b[i + 1] << 8) | (b[i + 2] << 16);
  const ascii = (i: number, n: number) => String.fromCharCode(...b.subarray(i, i + n));

  // PNG: firma di 8 byte, poi il blocco IHDR con larghezza e altezza.
  if (b.length >= 24 && b[0] === 0x89 && ascii(1, 3) === "PNG" && ascii(12, 4) === "IHDR") {
    return valide(u32(16), u32(20));
  }

  // GIF: «GIF87a» o «GIF89a», poi larghezza e altezza little-endian.
  if (b.length >= 10 && ascii(0, 4) === "GIF8") return valide(u16le(6), u16le(8));

  // WebP: RIFF…WEBP, poi uno dei tre blocchi.
  if (b.length >= 30 && ascii(0, 4) === "RIFF" && ascii(8, 4) === "WEBP") {
    const blocco = ascii(12, 4);
    if (blocco === "VP8X") return valide(u24le(24) + 1, u24le(27) + 1);
    if (blocco === "VP8 ") return valide(u16le(26) & 0x3fff, u16le(28) & 0x3fff);
    if (blocco === "VP8L") {
      const v = b[21] | (b[22] << 8) | (b[23] << 16) | (b[24] << 24);
      return valide((v & 0x3fff) + 1, ((v >>> 14) & 0x3fff) + 1);
    }
    return null;
  }

  // JPEG: si scorrono i segmenti fino a un SOF (inizio del fotogramma), che porta le misure.
  // I SOF sono 0xC0÷0xCF, esclusi 0xC4 (tabelle di Huffman), 0xC8 (riservato) e 0xCC.
  if (b.length >= 4 && b[0] === 0xff && b[1] === 0xd8) {
    let i = 2;
    while (i + 9 < b.length) {
      if (b[i] !== 0xff) return null;
      const m = b[i + 1];
      if (m === 0xff) {
        i += 1; // byte di riempimento
        continue;
      }
      if (m >= 0xc0 && m <= 0xcf && m !== 0xc4 && m !== 0xc8 && m !== 0xcc) {
        return valide(u16be(i + 7), u16be(i + 5));
      }
      if (m === 0xd9 || m === 0xda) return null; // fine immagine o dati: il SOF non c'era
      i += 2 + u16be(i + 2);
    }
    return null;
  }

  return null;
}

/** Logo, copertina e modo: come li ha l'azienda adesso, o come li ha congelati un documento. */
export type ImmaginiDiCopertina = { logoKey: string | null; coverKey: string | null; modo: ModoCopertina };

/**
 * Le immagini dell'azienda sono cambiate rispetto a quelle congelate in un documento?
 *
 * Serve all'avviso del pannello di pubblicazione: il 30 settembre una copertina è stata
 * cambiata due minuti DOPO la pubblicazione, e niente diceva che la versione pubblicata
 * restava con quella di prima. Il documento congelato non si tocca: si dice che per usare
 * le immagini nuove va pubblicata la versione successiva.
 *
 * Si confrontano i NOMI dei file, non le chiavi: alla pubblicazione ogni immagine si copia
 * nella cartella del documento come `<indice>-<nome originale>` (vedi `congelaImmagini`).
 * Il nome originale porta l'istante del caricamento, quindi due caricamenti diversi hanno
 * nomi diversi anche se il file fosse lo stesso — ed è giusto: è un altro caricamento.
 * Il modo conta solo se una copertina c'è: senza immagine non cambia niente a stampa.
 */
export function immaginiCambiate(pubblicate: ImmaginiDiCopertina, attuali: ImmaginiDiCopertina): boolean {
  const nome = (k: string | null) => (k ? (k.split("/").pop() ?? k).replace(/^\d+-/, "") : null);
  if (nome(pubblicate.logoKey) !== nome(attuali.logoKey)) return true;
  if (nome(pubblicate.coverKey) !== nome(attuali.coverKey)) return true;
  return attuali.coverKey !== null && pubblicate.modo !== attuali.modo;
}

function valide(larghezza: number, altezza: number) {
  return larghezza > 0 && altezza > 0 ? { larghezza, altezza } : null;
}
