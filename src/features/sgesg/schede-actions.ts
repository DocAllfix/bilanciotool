"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireConsultant } from "@/features/auth/guards";
import { daErrore, type ActionEsito } from "@/features/esito";
import { setCampoScheda, setStatoScheda } from "./schede";

const idSchema = z.string().min(1);

/** ⚠️ La rotta della SCHEDA, non quella del percorso: la pagina padre non si invalida
 *  da sola, ed e' la regola nata in Fase 12 con l'esercizio energetico. */
const rotta = (companyId: string, anno: number, fase: string, scheda: string) =>
  `/aziende/${companyId}/sgesg/${anno}/${fase}/${scheda}`;

export async function setCampoSchedaAction(
  companyId: string,
  anno: number,
  fase: string,
  programId: string,
  schedaKey: string,
  campo: string,
  valore: string | string[] | null,
): Promise<ActionEsito<null>> {
  try {
    const s = await requireConsultant();
    // Il campo NON si valida contro un elenco chiuso qui: sono 314 chiavi che vivono nel
    // catalogo, ed e' `setCampoScheda` a confrontarle con le sezioni della scheda dentro
    // la transazione. Qui si limita la forma, che e' quanto un endpoint puo' sapere.
    const c = z.string().min(1).max(120).parse(campo);
    const v = z.union([z.string().max(20000), z.array(z.string().max(500)).max(200), z.null()]).parse(valore);
    await setCampoScheda(s.userId, s.orgId, idSchema.parse(programId), idSchema.parse(schedaKey), c, v);
    revalidatePath(rotta(companyId, anno, fase, schedaKey));
    return { ok: true, dati: null };
  } catch (e) {
    return daErrore(e);
  }
}

export async function setStatoSchedaAction(
  companyId: string,
  anno: number,
  fase: string,
  programId: string,
  schedaKey: string,
  stato: "bozza" | "completata",
): Promise<ActionEsito<null>> {
  try {
    const s = await requireConsultant();
    const st = z.enum(["bozza", "completata"]).parse(stato);
    await setStatoScheda(s.userId, s.orgId, idSchema.parse(programId), idSchema.parse(schedaKey), st);
    revalidatePath(rotta(companyId, anno, fase, schedaKey));
    revalidatePath(`/aziende/${companyId}/sgesg/${anno}/${fase}`);
    return { ok: true, dati: null };
  } catch (e) {
    return daErrore(e);
  }
}
