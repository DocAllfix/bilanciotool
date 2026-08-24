"use server";

import { revalidatePath } from "next/cache";
import { requireConsultant } from "@/features/auth/guards";
import { daErrore, type ActionEsito } from "@/features/esito";
import { percorsoModulo } from "@/features/companies/moduli";
import { aggiornaProfilo, creaSistema, setCampoCriterio } from "./sistema";
import type { criterioSchema, profiloSchema } from "./validation";
import type { z } from "zod";

// Server action = endpoint HTTP: la validazione vive in `sistema.ts`.

const rotta = (companyId: string) => percorsoModulo(companyId, "sa8000");

export async function creaSistemaAction(companyId: string): Promise<ActionEsito<{ id: string }>> {
  try {
    const s = await requireConsultant();
    const id = await creaSistema(s.userId, s.orgId, { companyId });
    revalidatePath(rotta(companyId));
    return { ok: true, dati: { id } };
  } catch (e) { return daErrore(e); }
}

export async function aggiornaProfiloAction(
  companyId: string,
  systemId: string,
  patch: z.input<typeof profiloSchema>,
): Promise<ActionEsito> {
  try {
    const s = await requireConsultant();
    await aggiornaProfilo(s.userId, s.orgId, systemId, patch);
    revalidatePath(rotta(companyId));
    return { ok: true };
  } catch (e) { return daErrore(e); }
}

export async function setCampoCriterioAction(
  companyId: string,
  systemId: string,
  input: z.input<typeof criterioSchema>,
): Promise<ActionEsito> {
  try {
    const s = await requireConsultant();
    await setCampoCriterio(s.userId, s.orgId, systemId, input);
    revalidatePath(rotta(companyId));
    return { ok: true };
  } catch (e) { return daErrore(e); }
}
