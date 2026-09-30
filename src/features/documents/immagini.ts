import { sql } from "drizzle-orm";
import { documentSnapshot } from "@/lib/db/schema";
import { copyObject, deleteObject } from "@/lib/storage";
import type { Tx } from "@/lib/db/tenant";

// Le immagini dei documenti pubblicati.
//
// ⚠️ IL DIFETTO CHE QUESTO FILE CHIUDE, provato con le funzioni vere il 29 settembre 2026.
// Lo snapshot congelava la CHIAVE del logo, della copertina e delle foto dei capitoli, e il
// commento accanto diceva che quelle chiavi erano «stabili». Non lo erano: cambiando il logo
// dell'azienda, `setCompanyImage` caricava il nuovo e CANCELLAVA il vecchio, e lo stesso
// facevano le due `removeMedia` togliendo una foto dal racconto. Da quel momento il bilancio
// già pubblicato chiedeva un file che non c'era più, `signedUrl` sollevava, e dentro il
// `Promise.all` che risolve le immagini non mancava un logo: non si apriva più il DOCUMENTO.
//
// Il rimedio è lo stesso principio dello snapshot, applicato fino in fondo: un documento
// pubblicato si congela, e un'immagine è un dato. Alla pubblicazione si fa una copia sua di
// ogni immagine che mostra, sotto una chiave che nessun comando dell'app tocca più.
//
// ⚠️ E I DOCUMENTI PUBBLICATI PRIMA DEL RIMEDIO puntano ancora ai file dell'azienda. Il loro
// `dati` non si può riscrivere — il trigger della migrazione 0002 lo impedisce, ed è giusto
// così — quindi la protezione per loro sta dall'altra parte: un file che un documento
// pubblicato usa non si cancella. Resta in archivio, perché ormai appartiene alla storia.

type DatiConImmagini = {
  /** Logo e copertina congelati da `salvaSnapshot` per TUTTI i documenti. */
  copertina?: { logoKey?: string | null; coverKey?: string | null; modo?: string | null } | null;
  /** Il posto dove il bilancio li teneva prima: i bilanci già pubblicati li hanno ancora qui. */
  azienda?: { logoKey?: string | null; coverKey?: string | null } | null;
  capitoli?: { media?: { storageKey?: string | null }[] | null }[] | null;
};

export type CopertinaCongelata = { logoKey: string | null; coverKey: string | null; modo: "foto" | "pagina" };

/**
 * Logo, copertina e modo con cui un documento pubblicato è stato congelato.
 *
 * I documenti pubblicati prima del 29 settembre 2026 non hanno `copertina`: quelli del
 * bilancio tenevano le chiavi in `azienda`, gli altri non avevano immagini affatto. Il
 * modo, per loro, è quello che era sempre stato — una fotografia sopra il titolo — ed è
 * esattamente ciò che c'era stampato sul PDF consegnato.
 */
export function copertinaDelloSnapshot(dati: unknown): CopertinaCongelata {
  const d = (dati ?? {}) as DatiConImmagini;
  const c = d.copertina;
  if (c) {
    return { logoKey: c.logoKey ?? null, coverKey: c.coverKey ?? null, modo: c.modo === "pagina" ? "pagina" : "foto" };
  }
  return { logoKey: d.azienda?.logoKey ?? null, coverKey: d.azienda?.coverKey ?? null, modo: "foto" };
}

/** Le chiavi delle immagini che un documento mostra, nello stesso ordine in cui le trova. */
export function chiaviImmagini(dati: unknown): string[] {
  const d = (dati ?? {}) as DatiConImmagini;
  const trovate: string[] = [];
  const aggiungi = (k: string | null | undefined) => {
    if (k && !trovate.includes(k)) trovate.push(k);
  };
  aggiungi(d.copertina?.logoKey);
  aggiungi(d.copertina?.coverKey);
  aggiungi(d.azienda?.logoKey);
  aggiungi(d.azienda?.coverKey);
  for (const c of d.capitoli ?? []) for (const m of c.media ?? []) aggiungi(m.storageKey);
  return trovate;
}

/** La cartella che appartiene a un documento pubblicato, e a nient'altro. */
export function cartellaDelDocumento(orgId: string, snapshotId: string): string {
  return `${orgId}/snapshot/${snapshotId}`;
}

/**
 * Copia le immagini nella cartella del documento e restituisce i dati con le chiavi nuove.
 *
 * Il nome del file porta un indice davanti: due immagini diverse possono chiamarsi uguale
 * nelle loro cartelle d'origine, e la seconda sovrascriverebbe la prima in silenzio.
 *
 * Restituisce anche l'elenco delle copie fatte, perché chi pubblica possa toglierle se
 * l'inserimento dello snapshot fallisce: senza, resterebbero file orfani che nessuna riga
 * referenzia più.
 */
export async function congelaImmagini<T extends Record<string, unknown>>(
  orgId: string,
  snapshotId: string,
  dati: T,
): Promise<{ dati: T; copiate: string[] }> {
  const origine = chiaviImmagini(dati);
  if (!origine.length) return { dati, copiate: [] };

  const cartella = cartellaDelDocumento(orgId, snapshotId);
  const nuova = new Map<string, string>();
  const copiate: string[] = [];
  try {
    for (const [i, k] of origine.entries()) {
      const nome = k.split("/").pop() ?? "immagine";
      const dest = `${cartella}/${i}-${nome}`;
      await copyObject(orgId, k, dest);
      nuova.set(k, dest);
      copiate.push(dest);
    }
  } catch (e) {
    // Una pubblicazione con metà delle immagini copiate non deve lasciare metà dei file.
    await rimuoviCopie(orgId, copiate);
    throw e;
  }

  const clone = structuredClone(dati) as T & DatiConImmagini;
  const sostituisci = (k: string | null | undefined) => (k ? (nuova.get(k) ?? k) : k);
  if (clone.copertina) {
    clone.copertina.logoKey = sostituisci(clone.copertina.logoKey);
    clone.copertina.coverKey = sostituisci(clone.copertina.coverKey);
  }
  if (clone.azienda) {
    clone.azienda.logoKey = sostituisci(clone.azienda.logoKey);
    clone.azienda.coverKey = sostituisci(clone.azienda.coverKey);
  }
  for (const c of clone.capitoli ?? []) for (const m of c.media ?? []) m.storageKey = sostituisci(m.storageKey);
  return { dati: clone, copiate };
}

/** Toglie le copie di una pubblicazione non riuscita. Non solleva: è già un ripiego. */
export async function rimuoviCopie(orgId: string, chiavi: string[]): Promise<void> {
  for (const k of chiavi) await deleteObject(orgId, k).catch(() => undefined);
}

/**
 * Un documento pubblicato usa ancora questo file?
 *
 * Serve ai documenti pubblicati PRIMA del rimedio, che puntano direttamente ai file
 * dell'azienda. Si cerca la chiave dentro i dati dello snapshot come testo: le chiavi sono
 * lunghe e uniche (organizzazione, azienda, istante in millisecondi), e `position` non ha i
 * caratteri jolly di `LIKE`, quindi un trattino basso nel nome non può far combaciare una
 * chiave diversa.
 *
 * Si passa la transazione di chi chiede: la policy RLS di `document_snapshot` legge
 * `app.org_id`, che esiste solo dentro `withTenant`.
 */
export async function chiaveUsataDaDocumenti(tx: Tx, orgId: string, chiave: string): Promise<boolean> {
  const righe = await tx
    .select({ uno: sql`1` })
    .from(documentSnapshot)
    .where(
      sql`${documentSnapshot.organizationId} = ${orgId} and position(${chiave} in ${documentSnapshot.dati}::text) > 0`,
    )
    .limit(1);
  return righe.length > 0;
}
