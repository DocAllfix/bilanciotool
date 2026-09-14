"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireActiveOrg, requirePlatformAdmin } from "@/features/auth/guards";
import { daErrore, type ActionEsito } from "@/features/esito";
import { apriTicket, cambiaStatoTicket, rispondiComeStaff, rispondiComeUtente } from "./index";

// Server action dell'assistenza: guardia di sessione e validazione qui, la logica in
// `index.ts`.
//
// ⚠️ `requireActiveOrg` e NON `requireConsultant` più `requireEntitlement`: l'assistenza
// non sta dietro il paywall. Chi ha l'abbonamento scaduto è proprio chi scrive.

const id = z.string().min(1).max(100);

export async function apriTicketAction(dati: { oggetto: string; testo: string }): Promise<ActionEsito<{ id: string }>> {
  try {
    const s = await requireActiveOrg();
    const v = z
      .object({
        oggetto: z.string().trim().min(1, "Scrivi un oggetto").max(200, "Oggetto: al massimo 200 caratteri"),
        testo: z.string().trim().min(1, "Scrivi il messaggio").max(8000, "Messaggio: al massimo 8000 caratteri"),
      })
      .parse(dati);
    const r = await apriTicket(s.userId, s.orgId, v);
    revalidatePath("/assistenza");
    return { ok: true, dati: r };
  } catch (e) {
    return daErrore(e);
  }
}

export async function rispondiAction(ticketId: string, testo: string): Promise<ActionEsito<null>> {
  try {
    const s = await requireActiveOrg();
    await rispondiComeUtente(s.userId, s.orgId, id.parse(ticketId), z.string().max(8000).parse(testo));
    revalidatePath(`/assistenza/${ticketId}`);
    return { ok: true, dati: null };
  } catch (e) {
    return daErrore(e);
  }
}

export async function rispondiStaffAction(ticketId: string, testo: string): Promise<ActionEsito<null>> {
  try {
    const s = await requirePlatformAdmin();
    await rispondiComeStaff(s.userId, id.parse(ticketId), z.string().max(8000).parse(testo));
    revalidatePath(`/staff/assistenza/${ticketId}`);
    return { ok: true, dati: null };
  } catch (e) {
    return daErrore(e);
  }
}

export async function cambiaStatoAction(ticketId: string, stato: "aperto" | "in_attesa" | "chiuso"): Promise<ActionEsito<null>> {
  try {
    const s = await requirePlatformAdmin();
    await cambiaStatoTicket(s.userId, id.parse(ticketId), z.enum(["aperto", "in_attesa", "chiuso"]).parse(stato));
    revalidatePath(`/staff/assistenza/${ticketId}`);
    return { ok: true, dati: null };
  } catch (e) {
    return daErrore(e);
  }
}
