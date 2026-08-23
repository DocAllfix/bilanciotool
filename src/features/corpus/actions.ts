"use server";

import { revalidatePath } from "next/cache";
import { requireConsultant } from "@/features/auth/guards";
import { daErrore, type ActionEsito } from "@/features/esito";
import { setOverride, setStatoDocumento } from "./documenti";
import { aggiornaRiga, aggiungiRiga, eliminaRiga } from "./registri";
import type { aggiornaRigaSchema, overrideSchema, rigaRegistroSchema, statoDocumentoSchema } from "./validation";
import type { z } from "zod";

// Le azioni del corpus documentale, condivise da tutti i moduli di conformità.
//
// Server action = endpoint HTTP: i tipi TypeScript non esistono a runtime, quindi la
// validazione vive in `documenti.ts` e `registri.ts`. Qui solo la guardia di sessione e
// la traduzione dell'eccezione in un esito che il client sa leggere.
//
// ⚠️ La rotta da rivalidare arriva DAL CHIAMANTE, e non si costruisce qui. Il corpus è
// condiviso fra sei moduli e la stessa procedura si apre da indirizzi diversi
// (`/aziende/X/mog231?vista=procedure`, `/aziende/X/soa?...`): indovinare la rotta
// significherebbe rivalidare la pagina di un altro modulo e lasciare stantia quella che
// l'utente sta guardando. È il difetto gia' pagato sull'energetico, dove
// `/aziende/X/energetico` non invalidava `/aziende/X/energetico/2025`.

export async function setStatoDocumentoAction(
  rotta: string,
  input: z.input<typeof statoDocumentoSchema>,
): Promise<ActionEsito> {
  try {
    const s = await requireConsultant();
    await setStatoDocumento(s.userId, s.orgId, input);
    revalidatePath(rotta);
    return { ok: true };
  } catch (e) { return daErrore(e); }
}

/**
 * Il testo su misura di un blocco.
 *
 * Il vuoto NON è un testo vuoto: significa «torna all'originale», e la mutazione cancella
 * la riga invece di scrivere una stringa vuota. L'esito lo dice al client, che deve
 * rimettere il testo di catalogo senza ricaricare.
 */
export async function setOverrideAction(
  rotta: string,
  input: z.input<typeof overrideSchema>,
): Promise<ActionEsito<{ rimosso: boolean }>> {
  try {
    const s = await requireConsultant();
    const dati = await setOverride(s.userId, s.orgId, input);
    revalidatePath(rotta);
    return { ok: true, dati };
  } catch (e) { return daErrore(e); }
}

export async function aggiungiRigaAction(
  rotta: string,
  input: z.input<typeof rigaRegistroSchema>,
): Promise<ActionEsito<{ id: string; numero: number; riferimento: string | null }>> {
  try {
    const s = await requireConsultant();
    const dati = await aggiungiRiga(s.userId, s.orgId, input);
    revalidatePath(rotta);
    return { ok: true, dati };
  } catch (e) { return daErrore(e); }
}

/**
 * Una registrazione, **un campo per volta**.
 *
 * ⚠️ La mutazione accetta una mappa, ma il client ne manda una con UNA chiave sola, e la
 * mutazione rilegge il resto dal database dentro la transazione. È la regola pagata tre
 * volte da questo progetto — materialità in F7, costi dell'energetico in F12, punteggi
 * fornitore — e qui il rischio è massimo: una riga di registro ha fino a diciotto colonne
 * sulla stessa schermata, e rimandarle tutte da props stantie azzererebbe quelle toccate
 * un attimo prima.
 */
export async function aggiornaRigaAction(
  rotta: string,
  input: z.input<typeof aggiornaRigaSchema>,
): Promise<ActionEsito> {
  try {
    const s = await requireConsultant();
    if (Object.keys(input.dati ?? {}).length !== 1) {
      throw new Error("Si aggiorna un campo per volta: la riga non si rimanda mai intera");
    }
    await aggiornaRiga(s.userId, s.orgId, input);
    revalidatePath(rotta);
    return { ok: true };
  } catch (e) { return daErrore(e); }
}

export async function eliminaRigaAction(
  rotta: string,
  companyId: string,
  rowId: string,
): Promise<ActionEsito> {
  try {
    const s = await requireConsultant();
    await eliminaRiga(s.userId, s.orgId, companyId, rowId);
    revalidatePath(rotta);
    return { ok: true };
  } catch (e) { return daErrore(e); }
}
