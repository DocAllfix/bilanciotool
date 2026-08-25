"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireConsultant } from "@/features/auth/guards";
import { daErrore, type ActionEsito } from "@/features/esito";
import {
  aCentesimi,
  creaCompenso,
  eliminaCompenso,
  eliminaIncasso,
  registraIncasso,
  setCampoCompenso,
} from "./index";

const idSchema = z.string().min(1);
const CAMPI = ["descrizione", "importo", "scadenza", "note", "stato"] as const;

export async function creaCompensoAction(dati: {
  companyId: string;
  descrizione: string;
  importo: string;
  scadenza?: string | null;
  note?: string | null;
}): Promise<ActionEsito<{ id: string }>> {
  try {
    const s = await requireConsultant();
    const v = z
      .object({
        companyId: z.string().min(1, "Scegli l'azienda"),
        descrizione: z.string().trim().min(1, "La descrizione è obbligatoria").max(300),
        importo: z.string().trim().min(1, "L'importo è obbligatorio"),
        scadenza: z.string().trim().max(10).optional().nullable(),
        note: z.string().trim().max(2000).optional().nullable(),
      })
      .parse(dati);

    // ⚠️ L'importo si converte QUI, una volta sola, e in centesimi interi. Il numero non
    // attraversa mai il confine come decimale: dal browser arriva testo, e dal testo
    // esce un intero o un rifiuto.
    const centesimi = aCentesimi(v.importo);
    if (centesimi === null) throw new Error("L'importo non è valido: scrivilo come 1.450,00");

    const id = await creaCompenso(s.userId, s.orgId, {
      companyId: v.companyId,
      descrizione: v.descrizione,
      importo: centesimi,
      scadenza: v.scadenza || null,
      note: v.note || null,
    });
    revalidatePath("/compensi");
    return { ok: true, dati: { id } };
  } catch (e) {
    return daErrore(e);
  }
}

export async function setCampoCompensoAction(
  compensoId: string,
  campo: (typeof CAMPI)[number],
  valore: string | null,
): Promise<ActionEsito<null>> {
  try {
    const s = await requireConsultant();
    const c = z.enum(CAMPI).parse(campo);
    const v = z.string().max(2000).nullable().parse(valore);
    await setCampoCompenso(s.userId, s.orgId, idSchema.parse(compensoId), c, v);
    revalidatePath("/compensi");
    return { ok: true, dati: null };
  } catch (e) {
    return daErrore(e);
  }
}

export async function registraIncassoAction(
  compensoId: string,
  importo: string,
  data: string,
  note?: string | null,
): Promise<ActionEsito<{ id: string }>> {
  try {
    const s = await requireConsultant();
    const centesimi = aCentesimi(z.string().trim().min(1).parse(importo));
    if (centesimi === null || centesimi <= 0) throw new Error("L'importo non è valido: scrivilo come 500,00");
    const d = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "La data va scritta come AAAA-MM-GG").parse(data);
    const id = await registraIncasso(s.userId, s.orgId, idSchema.parse(compensoId), {
      importo: centesimi,
      data: d,
      note: note?.trim() || null,
    });
    revalidatePath("/compensi");
    return { ok: true, dati: { id } };
  } catch (e) {
    return daErrore(e);
  }
}

export async function eliminaIncassoAction(incassoId: string): Promise<ActionEsito<null>> {
  try {
    const s = await requireConsultant();
    await eliminaIncasso(s.userId, s.orgId, idSchema.parse(incassoId));
    revalidatePath("/compensi");
    return { ok: true, dati: null };
  } catch (e) {
    return daErrore(e);
  }
}

export async function eliminaCompensoAction(compensoId: string): Promise<ActionEsito<null>> {
  try {
    const s = await requireConsultant();
    await eliminaCompenso(s.userId, s.orgId, idSchema.parse(compensoId));
    revalidatePath("/compensi");
    return { ok: true, dati: null };
  } catch (e) {
    return daErrore(e);
  }
}
