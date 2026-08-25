"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireConsultant } from "@/features/auth/guards";
import { daErrore, type ActionEsito } from "@/features/esito";
import { creaVoce, eliminaVoce, setCampoVoce, setStatoVoce } from "./index";

// Server action = endpoint HTTP: validazione e guardia di sessione qui, e il rifiuto
// torna come `{ok:false, errore}` — mai un'eccezione nuda al client.

const idSchema = z.string().min(1);
const CAMPI = ["titolo", "note", "data"] as const;

const nuovaSchema = z.object({
  tipo: z.enum(["scadenza", "milestone", "azione"]),
  titolo: z.string().trim().min(1, "Il titolo è obbligatorio").max(300),
  data: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "La data va scritta come AAAA-MM-GG"),
  note: z.string().trim().max(4000).optional().nullable(),
  companyId: z.string().min(1).optional().nullable(),
});

export async function creaVoceAction(dati: z.input<typeof nuovaSchema>): Promise<ActionEsito<{ id: string }>> {
  try {
    const s = await requireConsultant();
    const v = nuovaSchema.parse(dati);
    const id = await creaVoce(s.userId, s.orgId, {
      tipo: v.tipo,
      titolo: v.titolo,
      data: v.data,
      note: v.note || null,
      companyId: v.companyId || null,
    });
    revalidatePath("/agenda");
    return { ok: true, dati: { id } };
  } catch (e) {
    return daErrore(e);
  }
}

export async function setCampoVoceAction(
  voceId: string,
  campo: (typeof CAMPI)[number],
  valore: string | null,
): Promise<ActionEsito<null>> {
  try {
    const s = await requireConsultant();
    // ⚠️ Elenco CHIUSO: il campo finisce dentro un `set({[campo]: …})`, e un nome
    // arbitrario che arriva dalla rete deciderebbe quale colonna scrivere.
    const c = z.enum(CAMPI).parse(campo);
    const v = z.string().max(4000).nullable().parse(valore);
    await setCampoVoce(s.userId, s.orgId, idSchema.parse(voceId), c, v);
    revalidatePath("/agenda");
    return { ok: true, dati: null };
  } catch (e) {
    return daErrore(e);
  }
}

export async function setStatoVoceAction(
  voceId: string,
  stato: "aperta" | "fatta" | "annullata",
): Promise<ActionEsito<null>> {
  try {
    const s = await requireConsultant();
    const st = z.enum(["aperta", "fatta", "annullata"]).parse(stato);
    await setStatoVoce(s.userId, s.orgId, idSchema.parse(voceId), st);
    revalidatePath("/agenda");
    revalidatePath("/dashboard");
    return { ok: true, dati: null };
  } catch (e) {
    return daErrore(e);
  }
}

export async function eliminaVoceAction(voceId: string): Promise<ActionEsito<null>> {
  try {
    const s = await requireConsultant();
    await eliminaVoce(s.userId, s.orgId, idSchema.parse(voceId));
    revalidatePath("/agenda");
    return { ok: true, dati: null };
  } catch (e) {
    return daErrore(e);
  }
}
