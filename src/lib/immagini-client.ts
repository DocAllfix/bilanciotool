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
export async function fileADataUrl(file: File, maxLato = 1600, qualita = 0.85): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const scala = Math.min(1, maxLato / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scala);
  canvas.height = Math.round(bitmap.height * scala);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL(file.type === "image/png" ? "image/png" : "image/jpeg", qualita);
}
