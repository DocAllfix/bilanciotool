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

// La chiave DEVE iniziare con l'orgId: è il perimetro del tenant sullo Storage.
function assertScoped(orgId: string, storageKey: string): void {
  if (!orgId || !storageKey.startsWith(`${orgId}/`)) {
    throw new Error("Chiave storage fuori dal perimetro del tenant");
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

export const isStorageConfigured = () => Boolean(env.SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY);
