"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireConsultant } from "@/features/auth/guards";
import { EntitlementError } from "@/features/entitlement";
import { creaCollegamento, revocaCollegamento } from "./index";
import { DURATE, DURATA_PREDEFINITA } from "./token";
import type { ActionEsito } from "@/features/companies/actions";

// Server action del portale cliente. Come tutte le altre: il client riceve
// `{ok} | {ok:false, errore, codice?}`, mai un'eccezione nuda.

const schema = z.object({
  companyId: z.string().min(1),
  giorni: z.coerce
    .number()
    .refine((g) => DURATE.some((d) => d.giorni === g), "Durata non prevista")
    .catch(DURATA_PREDEFINITA),
  nota: z.string().trim().max(120).optional(),
});

export async function creaCollegamentoAction(
  input: unknown,
): Promise<ActionEsito<{ url: string; scadeIl: string }>> {
  const p = schema.safeParse(input);
  if (!p.success) return { ok: false, errore: p.error.issues[0]?.message ?? "Dati non validi" };

  try {
    const s = await requireConsultant();
    const { token, scadeIl } = await creaCollegamento(s.userId, s.orgId, p.data.companyId, {
      giorni: p.data.giorni,
      nota: p.data.nota,
    });
    revalidatePath(`/aziende/${p.data.companyId}`);
    // L'indirizzo si costruisce QUI e non nel browser: il client non deve indovinare il
    // dominio pubblico, che in produzione è diverso da quello su cui gira.
    const base = (process.env.NEXT_PUBLIC_APP_URL ?? "").replace(/\/+$/, "");
    return { ok: true, dati: { url: `${base}/documenti-cliente/${token}`, scadeIl: scadeIl.toISOString() } };
  } catch (e) {
    if (e instanceof EntitlementError) return { ok: false, errore: e.message, codice: e.code };
    return { ok: false, errore: e instanceof Error ? e.message : "Collegamento non creato" };
  }
}

export async function revocaCollegamentoAction(
  companyId: string,
  id: string,
): Promise<ActionEsito> {
  try {
    const s = await requireConsultant();
    await revocaCollegamento(s.userId, s.orgId, id);
    revalidatePath(`/aziende/${companyId}`);
    return { ok: true };
  } catch (e) {
    if (e instanceof EntitlementError) return { ok: false, errore: e.message, codice: e.code };
    return { ok: false, errore: e instanceof Error ? e.message : "Revoca non riuscita" };
  }
}
