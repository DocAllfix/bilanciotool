// Ridimensionamento di un'immagine PRIMA di mandarla al server, nel browser.
//
// Sta qui perché era scritto tre volte, corpo identico carattere per carattere, in
// `report/passo-organizzazione.tsx`, `report/passo-racconto.tsx` e
// `energy/passo-racconto-energia.tsx`. L'unica differenza era la firma: uno pretendeva
// `maxLato`, gli altri due lo avevano a 1600. Il valore predefinito qui copre entrambi i
// casi, e chi carica un logo passa la sua misura.
//
// Perché ridimensionare nel browser e non sul server: il limite di 3-5 MB che le funzioni
// di caricamento applicano è l'ultima rete, non la prima. Una fotografia da telefono
// supera i 5 MB con facilità, e farla viaggiare per poi rifiutarla significa far
// aspettare il consulente un minuto per dirgli di no.

/**
 * Legge un file scelto dall'utente e lo restituisce come dataURL, rimpicciolito.
 *
 * Il formato si CONSERVA: un PNG resta PNG (la trasparenza serve ai loghi), tutto il
 * resto diventa JPEG. `qualita` vale solo per il JPEG, il PNG la ignora.
 *
 * `scala` non supera mai 1: un'immagine più piccola del limite non viene ingrandita,
 * che la renderebbe solo più sfocata e più pesante.
 */
export async function fileADataUrl(
  file: File,
  maxLato = 1600,
  qualita = 0.85,
  /**
   * Converte in JPEG anche un PNG. Serve alle COPERTINE: non hanno trasparenza, e una
   * copertina a pagina intera in PNG a risoluzione di stampa pesa facilmente più dei 3 MB
   * che il server accetta — e il rifiuto arriverebbe con un messaggio che chi ha caricato
   * un file normalissimo non capirebbe. Il logo resta PNG: lì la trasparenza serve.
   */
  forzaJpeg = false,
): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const scala = Math.min(1, maxLato / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scala);
  canvas.height = Math.round(bitmap.height * scala);
  const g = canvas.getContext("2d")!;
  const jpeg = forzaJpeg || file.type !== "image/png";
  // Un PNG trasparente convertito in JPEG avrebbe il fondo NERO: il JPEG non ha canale
  // alfa, e i pixel trasparenti diventano neri. Si dipinge prima il bianco della carta.
  if (jpeg) {
    g.fillStyle = "#ffffff";
    g.fillRect(0, 0, canvas.width, canvas.height);
  }
  g.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL(jpeg ? "image/jpeg" : "image/png", qualita);
}

/**
 * La misura con cui si carica una copertina.
 *
 * 2.480 px sul lato lungo sono i 300 dpi di un A4 sul lato corto (210 mm), cioè ~210 dpi
 * sul lato lungo: abbastanza per una copertina a pagina intera stampata, e un JPEG a
 * quella misura sta abbondantemente sotto i 3 MB. Con i 1.800 di prima una copertina
 * a pagina intera usciva a circa 150 dpi.
 */
export const LATO_COPERTINA = 2480;
