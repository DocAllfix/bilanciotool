import { env } from "@/lib/env";

// Supabase Storage via REST, senza SDK (la Data API del progetto è disattivata;
// lo Storage è un servizio separato e risponde con la service_role key).
//
// MODELLO DI SICUREZZA: la chiave service_role vive SOLO sul server. L'isolamento
// per tenant è applicativo: ogni chiave oggetto inizia con l'orgId e TUTTE le
// funzioni qui esigono l'orgId come primo segmento — i chiamanti sono le funzioni
// feature già dietro guard/withTenant. La lettura dal client passa da URL firmati
// a scadenza, mai dal bucket pubblico.

const BUCKET = "media";

function base(): { url: string; key: string } {
  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("Storage non configurato: SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY mancanti in .env");
  }
  return { url: `${env.SUPABASE_URL}/storage/v1`, key: env.SUPABASE_SERVICE_ROLE_KEY };
}

const headers = (key: string, extra?: Record<string, string>) => ({
  Authorization: `Bearer ${key}`,
  apikey: key,
  ...extra,
});

let bucketPronto = false;
export async function ensureBucket(): Promise<void> {
  if (bucketPronto) return;
  const { url, key } = base();
  const res = await fetch(`${url}/bucket/${BUCKET}`, { headers: headers(key) });
  if (res.status === 404 || res.status === 400) {
    const crea = await fetch(`${url}/bucket`, {
      method: "POST",
      headers: headers(key, { "Content-Type": "application/json" }),
      body: JSON.stringify({ id: BUCKET, name: BUCKET, public: false }),
    });
    if (!crea.ok && crea.status !== 409) {
      throw new Error(`Creazione bucket fallita: ${crea.status} ${await crea.text()}`);
    }
  }
  bucketPronto = true;
}

/** Caratteri ammessi in un segmento di chiave. Tutto il resto è rifiutato. */
const SEGMENTO_VALIDO = /^[A-Za-z0-9._-]+$/;
const LUNGHEZZA_MASSIMA = 512;

/**
 * Il perimetro del tenant sull'archivio: la chiave DEVE iniziare con l'orgId **ed**
 * essere un percorso piatto, senza risalite e senza caratteri da interpretare.
 *
 * Il solo prefisso non bastava, ed era un buco vero. `<org>/reports/p/../../../altrove`
 * comincia con `<org>/` e superava il controllo testuale — ma la chiave finisce dentro
 * un indirizzo, e il parser URL **normalizza i `..`**: il file atterrava fuori dal
 * perimetro. Poiché un pezzo di quella chiave (`templateKey`) arrivava dal client e una
 * server action è un endpoint HTTP, chiunque avesse `write_data` — cioè anche un conto
 * di PROVA — poteva scrivere ovunque nel bucket, compreso il video di benvenuto che
 * vede ogni nuovo cliente.
 *
 * Si controlla segmento per segmento invece di cercare la sequenza `..` nella stringa:
 * cercare sottostringhe in un percorso è il modo classico di lasciare aperta la
 * variante codificata. Qui ciò che non è esplicitamente ammesso non passa.
 *
 * Esportata perché è LA frontiera dell'archivio, e una frontiera va provata da sola.
 */
export function assertScoped(orgId: string, storageKey: string): void {
  if (!orgId) throw new Error("Chiave storage senza organizzazione");
  if (storageKey.length > LUNGHEZZA_MASSIMA) throw new Error("Chiave storage troppo lunga");
  // Lo slash finale nel confronto tiene separate due organizzazioni di cui una è
  // prefisso dell'altra.
  if (!storageKey.startsWith(`${orgId}/`)) {
    throw new Error("Chiave storage fuori dal perimetro del tenant");
  }
  for (const segmento of storageKey.split("/")) {
    if (segmento === "" || segmento === "." || segmento === ".." || !SEGMENTO_VALIDO.test(segmento)) {
      throw new Error("Chiave storage con segmenti non ammessi");
    }
  }
  // `%2e%2e` e `%2f` sopravvivono alla normalizzazione dell'URL e vengono decodificati
  // dal servizio di archiviazione: il segmento sembra innocuo qui e non lo è di là.
  if (/%2e|%2f/i.test(storageKey)) {
    throw new Error("Chiave storage con caratteri codificati");
  }
}

/**
 * Controlla un valore che sta per diventare **un segmento** di chiave d'archivio.
 *
 * `assertScoped` è l'ultima rete, ma fermarsi lì significherebbe scoprire il problema
 * quando la chiave è già composta, con un messaggio che non dice quale pezzo era
 * sbagliato. Qui si respinge all'ingresso il valore che arriva dal client — `templateKey`,
 * `projectId`, `balanceId` — prima che entri nella stringa.
 *
 * Stessa regola dei segmenti di `assertScoped`, e non una seconda copia: due regole per
 * la stessa cosa divergono, e quella che diverge è sempre quella che decide.
 */
export function assertSegmentoChiave(valore: string, cosa: string): void {
  if (!valore || valore.length > 128 || !SEGMENTO_VALIDO.test(valore) || valore === "." || valore === "..") {
    throw new Error(`${cosa} non valido`);
  }
}

export async function uploadObject(
  orgId: string,
  storageKey: string,
  body: Buffer | Uint8Array,
  contentType: string,
): Promise<void> {
  assertScoped(orgId, storageKey);
  await ensureBucket();
  const { url, key } = base();
  const res = await fetch(`${url}/object/${BUCKET}/${storageKey}`, {
    method: "POST",
    headers: headers(key, { "Content-Type": contentType, "x-upsert": "true" }),
    body: body as BodyInit,
  });
  if (!res.ok) throw new Error(`Upload fallito (${res.status}): ${await res.text()}`);
}

export async function deleteObject(orgId: string, storageKey: string): Promise<void> {
  assertScoped(orgId, storageKey);
  const { url, key } = base();
  await fetch(`${url}/object/${BUCKET}/${storageKey}`, { method: "DELETE", headers: headers(key) });
}

export async function signedUrl(orgId: string, storageKey: string, expiresInSec = 3600): Promise<string> {
  assertScoped(orgId, storageKey);
  const { url, key } = base();
  const res = await fetch(`${url}/object/sign/${BUCKET}/${storageKey}`, {
    method: "POST",
    headers: headers(key, { "Content-Type": "application/json" }),
    body: JSON.stringify({ expiresIn: expiresInSec }),
  });
  if (!res.ok) throw new Error(`Firma URL fallita (${res.status})`);
  const j = (await res.json()) as { signedURL: string };
  return `${base().url}${j.signedURL}`;
}

// Decodifica un dataURL (import dal prototipo) in buffer + content type.
export function parseDataUrl(dataUrl: string): { buffer: Buffer; contentType: string } | null {
  const m = /^data:([\w/+.-]+);base64,(.+)$/.exec(dataUrl);
  if (!m) return null;
  return { buffer: Buffer.from(m[2], "base64"), contentType: m[1] };
}

/**
 * Le immagini che accettiamo, riconosciute dai PRIMI BYTE e non da quello che dice il
 * client.
 *
 * Il tipo dichiarato in un dataURL lo scrive il browser, cioè chiunque: `parseDataUrl`
 * lo legge dalla stringa, e il controllo era `startsWith("image/")`. Ci passava
 * `image/svg+xml` — e un SVG **è un documento eseguibile**: contiene `<script>`. Quel
 * tipo finiva poi nel `Content-Type` che l'archivio restituisce al browser, quindi
 * l'indirizzo firmato serviva contenuto attivo sotto un dominio di cui il cliente si
 * fida. Nessun cookie di sessione a rischio (origine diversa), ma è hosting di script
 * per chiunque abbia `write_data` — cioè anche un conto di prova.
 *
 * Sono ammessi tutti i formati RASTER, non solo quelli che il nostro browser produce
 * (`canvas.toDataURL` fa solo PNG e JPEG). Il motivo è l'import dagli archivi del
 * prototipo: lì i dataURL li ha scritti un altro programma, e una whitelist più
 * stretta farebbe **sparire in silenzio** le fotografie di chi migra. Un GIF o un WebP
 * non eseguono niente: il confine giusto è «immagine vera», non «formato nostro».
 */
const IMMAGINI = {
  "image/png": { ext: "png", firma: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a] },
  "image/jpeg": { ext: "jpg", firma: [0xff, 0xd8, 0xff] },
  "image/gif": { ext: "gif", firma: [0x47, 0x49, 0x46, 0x38] },
  // Il WebP si riconosce in DUE punti: «RIFF» all'inizio e «WEBP» all'ottavo byte.
  // Il solo «RIFF» lo hanno anche WAV e AVI.
  "image/webp": { ext: "webp", firma: [0x52, 0x49, 0x46, 0x46], firmaOtto: [0x57, 0x45, 0x42, 0x50] },
} as const;

/** `image/jpg` non è il nome ufficiale, ma qualche programma lo scrive lo stesso. */
const ALIAS: Record<string, keyof typeof IMMAGINI> = { "image/jpg": "image/jpeg" };

export type ImmagineAmmessa = { contentType: keyof typeof IMMAGINI; ext: string };

/**
 * Restituisce tipo ed estensione se il buffer È davvero quell'immagine, `null` altrimenti.
 *
 * L'estensione arriva da qui e mai dalla stringa del client: `contentType.split("/")[1]`
 * su `image/svg+xml` produceva il nome di file `qualcosa.svg+xml`.
 */
export function immagineValida(buffer: Buffer, contentTypeDichiarato: string): ImmagineAmmessa | null {
  const tipo = (ALIAS[contentTypeDichiarato] ?? contentTypeDichiarato) as keyof typeof IMMAGINI;
  const v = IMMAGINI[tipo];
  if (!v) return null;
  const combacia = (firma: readonly number[], da: number) =>
    buffer.length >= da + firma.length && firma.every((b, i) => buffer[da + i] === b);
  if (!combacia(v.firma, 0)) return null;
  if ("firmaOtto" in v && !combacia(v.firmaOtto, 8)) return null;
  return { contentType: tipo, ext: v.ext };
}

export const isStorageConfigured = () => Boolean(env.SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY);
