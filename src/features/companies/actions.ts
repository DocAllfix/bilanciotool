"use server";

import { requireConsultant } from "@/features/auth/guards";
import { getCompanyUsage } from "@/features/entitlement";
import { archiveCompany, createCompany, restoreCompany } from "./index";
import { z } from "zod";
// ⚠️ QUI NON SI CHIAMA `revalidatePath("/dashboard")`, e la ragione e' misurata.
//
// Con quella riga, il `router.refresh()` che il client esegue subito dopo **non applica
// mai** l'albero che il server restituisce: la card di un'azienda appena creata non
// compare, quella appena archiviata non sparisce, quella ripristinata non torna fra le
// attive. Provato con finestre di 45 e di 200 secondi, su tre comandi diversi — il
// dialogo della creazione, il dialogo di conferma dell'archiviazione e la voce di menu
// del ripristino, che un dialogo non ce l'ha. Togliendo la riga: 7,7 secondi.
// Rimettendola: mai. Nei due sensi, nella stessa sessione.
//
// **Il meccanismo non e' capito**, e va detto: l'ipotesi che il difetto nascesse dal
// revalidare la pagina su cui ci si trova e' stata SMENTITA — la pagina di un modulo
// fa la stessa cosa e si aggiorna lo stesso, anche con la forma a pattern che su una
// rotta dinamica invalida davvero.
//
// **Perche' toglierlo e' sicuro**: `/dashboard` e' `force-dynamic` e la cache del
// router client ha `staleTimes.dynamic: 0`. Non c'e' nessuna cache da invalidare — ne'
// sul server, che rende a ogni richiesta, ne' sul client, che rifa' la richiesta a ogni
// navigazione. La riga non stava proteggendo niente, e stava rompendo l'unica cosa che
// funzionava.
//
// Chi aggiunge un'azione su questa pagina non la rimetta: `router.refresh()` basta, e
// c'e' un controllo (`qa -- portafoglio-aggiorna`) che diventa rosso se torna.

import { daErrore, type ActionEsito } from "@/features/esito";

// Server actions del portafoglio: guard di sessione → funzioni server (F1/F4).
// Il client riceve sempre {ok} | {ok:false, errore, codice?}: mai eccezioni nude.

const nuovaAziendaSchema = z.object({
  nome: z.string().trim().min(2, "Indica la denominazione"),
  settore: z.string().trim().optional().default(""),
  sede: z.string().trim().optional().default(""),
  piva: z.string().trim().optional().default(""),
  ateco: z.string().trim().optional().default(""),
});

export async function createCompanyAction(input: unknown): Promise<ActionEsito<{ id: string }>> {
  try {
    const s = await requireConsultant();
    const v = nuovaAziendaSchema.parse(input);
    const id = await createCompany(s.userId, s.orgId, v);
    return { ok: true, dati: { id } };
  } catch (e) {
    return daErrore(e);
  }
}

export async function archiveCompanyAction(companyId: string): Promise<ActionEsito> {
  try {
    const s = await requireConsultant();
    await archiveCompany(s.userId, s.orgId, companyId);
    return { ok: true };
  } catch (e) {
    return daErrore(e);
  }
}

export async function restoreCompanyAction(companyId: string): Promise<ActionEsito> {
  try {
    const s = await requireConsultant();
    await restoreCompany(s.userId, s.orgId, companyId);
    return { ok: true };
  } catch (e) {
    return daErrore(e);
  }
}
