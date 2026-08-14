"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireConsultant } from "@/features/auth/guards";
import { creaCollegamento, revocaCollegamento } from "./index";
import { DURATE, DURATA_PREDEFINITA } from "./token";
import { daErrore, type ActionEsito } from "@/features/esito";
import { companyIdSchema } from "@/features/campi";

// Server action del portale cliente. Come tutte le altre: il client riceve
// `{ok} | {ok:false, errore, codice?}`, mai un'eccezione nuda.
//
// `daErrore` come gli altri nove file di azione. Qui c'era una gestione propria, scritta
// prima che quella comune esistesse, e quando la comune e' stata corretta -- il catch-all
// rimandava al browser il messaggio di QUALUNQUE eccezione, frammenti di query Postgres
// compresi -- questo file non c'era, perche' non aveva `daErrore` da correggere.
//
// I messaggi di dominio non cambiano: `daErrore` lascia passare gli `Error` scritti da
// noi. Cambia solo l'errore d'infrastruttura, che ora dice una frase invece di raccontare
// l'interno.

const schema = z.object({
  companyId: companyIdSchema,
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
    return daErrore(e);
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
    return daErrore(e);
  }
}
