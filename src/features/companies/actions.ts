"use server";

import { revalidatePath } from "next/cache";
import { requireConsultant } from "@/features/auth/guards";
import { EntitlementError, getCompanyUsage } from "@/features/entitlement";
import { archiveCompany, createCompany, restoreCompany } from "./index";
import { z } from "zod";

// Server actions del portafoglio: guard di sessione → funzioni server (F1/F4).
// Il client riceve sempre {ok} | {ok:false, errore, codice?}: mai eccezioni nude.

export type ActionEsito<T = undefined> =
  | { ok: true; dati?: T }
  | { ok: false; errore: string; codice?: string };

const nuovaAziendaSchema = z.object({
  nome: z.string().trim().min(2, "Indica la denominazione"),
  settore: z.string().trim().optional().default(""),
  sede: z.string().trim().optional().default(""),
  piva: z.string().trim().optional().default(""),
  ateco: z.string().trim().optional().default(""),
});

function daErrore(e: unknown): ActionEsito<never> {
  if (e instanceof EntitlementError) return { ok: false, errore: e.message, codice: e.code };
  if (e instanceof z.ZodError) return { ok: false, errore: e.issues[0]?.message ?? "Dati non validi" };
  return { ok: false, errore: e instanceof Error ? e.message : "Operazione non riuscita" };
}

export async function createCompanyAction(input: unknown): Promise<ActionEsito<{ id: string }>> {
  try {
    const s = await requireConsultant();
    const v = nuovaAziendaSchema.parse(input);
    const id = await createCompany(s.userId, s.orgId, v);
    revalidatePath("/dashboard");
    return { ok: true, dati: { id } };
  } catch (e) {
    return daErrore(e);
  }
}

export async function archiveCompanyAction(companyId: string): Promise<ActionEsito> {
  try {
    const s = await requireConsultant();
    await archiveCompany(s.userId, s.orgId, companyId);
    revalidatePath("/dashboard");
    return { ok: true };
  } catch (e) {
    return daErrore(e);
  }
}

export async function restoreCompanyAction(companyId: string): Promise<ActionEsito> {
  try {
    const s = await requireConsultant();
    await restoreCompany(s.userId, s.orgId, companyId);
    revalidatePath("/dashboard");
    return { ok: true };
  } catch (e) {
    return daErrore(e);
  }
}

export async function getUsageAction(): Promise<ActionEsito<Awaited<ReturnType<typeof getCompanyUsage>>>> {
  try {
    const s = await requireConsultant();
    return { ok: true, dati: await getCompanyUsage(s.userId, s.orgId) };
  } catch (e) {
    return daErrore(e);
  }
}
