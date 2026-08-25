"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireConsultant } from "@/features/auth/guards";
import { daErrore, type ActionEsito } from "@/features/esito";
import { percorsoModulo } from "@/features/companies/moduli";
import { creaProgramma, setCampoProgramma, setNotaFase, setStatoFase } from "./programma";

// Server action = endpoint HTTP: chiunque puo' chiamarle con qualunque argomento. La
// validazione sta qui, la guardia di sessione anche, e il rifiuto torna come
// `{ok:false, errore}` — mai come eccezione nuda al client.

const idSchema = z.string().min(1);
const CAMPI = ["standard", "stato", "responsabile", "dataInizio", "dataFine", "note"] as const;

/** ⚠️ La rotta dell'ESERCIZIO, non quella del percorso: `/aziende/X/sgesg` non
 *  invalida `/aziende/X/sgesg/2026`. E' la regola nata in Fase 12. */
const rotta = (companyId: string, anno: number) => percorsoModulo(companyId, "sgesg", anno);

export async function creaProgrammaAction(
  companyId: string,
  anno: number,
  standard: "GRI" | "ESRS" | "ENTRAMBI",
): Promise<ActionEsito<{ id: string }>> {
  try {
    const s = await requireConsultant();
    const a = z.coerce.number().int().min(2000).max(2100).parse(anno);
    const st = z.enum(["GRI", "ESRS", "ENTRAMBI"]).parse(standard);
    const id = await creaProgramma(s.userId, s.orgId, {
      companyId: idSchema.parse(companyId),
      anno: a,
      standard: st,
    });
    revalidatePath(rotta(companyId, a));
    return { ok: true, dati: { id } };
  } catch (e) {
    return daErrore(e);
  }
}

export async function setCampoProgrammaAction(
  companyId: string,
  anno: number,
  programId: string,
  campo: (typeof CAMPI)[number],
  valore: string | null,
): Promise<ActionEsito<null>> {
  try {
    const s = await requireConsultant();
    // ⚠️ Il campo si valida contro un elenco CHIUSO: finisce dentro un `set({[campo]:…})`,
    // e un nome arbitrario che arriva dalla rete deciderebbe quale colonna scrivere.
    const c = z.enum(CAMPI).parse(campo);
    const v = z.string().max(4000).nullable().parse(valore);
    await setCampoProgramma(s.userId, s.orgId, idSchema.parse(programId), c, v);
    revalidatePath(rotta(companyId, anno));
    return { ok: true, dati: null };
  } catch (e) {
    return daErrore(e);
  }
}

export async function setStatoFaseAction(
  companyId: string,
  anno: number,
  programId: string,
  faseKey: string,
  stato: "da_avviare" | "in_corso" | "conclusa",
): Promise<ActionEsito<null>> {
  try {
    const s = await requireConsultant();
    const st = z.enum(["da_avviare", "in_corso", "conclusa"]).parse(stato);
    await setStatoFase(s.userId, s.orgId, idSchema.parse(programId), idSchema.parse(faseKey), st);
    revalidatePath(rotta(companyId, anno));
    return { ok: true, dati: null };
  } catch (e) {
    return daErrore(e);
  }
}

export async function setNotaFaseAction(
  companyId: string,
  anno: number,
  programId: string,
  faseKey: string,
  note: string | null,
): Promise<ActionEsito<null>> {
  try {
    const s = await requireConsultant();
    const v = z.string().max(4000).nullable().parse(note);
    await setNotaFase(s.userId, s.orgId, idSchema.parse(programId), idSchema.parse(faseKey), v);
    revalidatePath(rotta(companyId, anno));
    return { ok: true, dati: null };
  } catch (e) {
    return daErrore(e);
  }
}
