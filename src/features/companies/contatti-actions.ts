"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireConsultant } from "@/features/auth/guards";
import { daErrore, type ActionEsito } from "@/features/esito";
import {
  aggiornaAnagrafica,
  aggiornaCampoContatto,
  creaContatto,
  eliminaContatto,
  promuoviContatto,
} from "./contatti";

// Server action = endpoint HTTP: chiunque puo' chiamarle con qualunque argomento, quindi
// la validazione sta qui e la guardia di sessione anche. Il rifiuto torna al client come
// `{ok:false, errore}`, mai come eccezione nuda.

const idSchema = z.string().min(1);

/** La rotta del fascicolo, che e' dove la scheda cliente vive. */
const rotta = (companyId: string) => `/aziende/${companyId}`;

const nuovoSchema = z.object({
  nome: z.string().trim().min(1, "Il nome del contatto e' obbligatorio").max(200),
  ruolo: z.string().trim().max(200).optional().nullable(),
  // ⚠️ L'email si valida, ma il campo resta FACOLTATIVO: una rubrica di studio ha
  // contatti di cui si conosce solo il telefono, e pretendere l'indirizzo costringerebbe
  // a inventarlo. La stringa vuota diventa `null`, non un errore.
  email: z.string().trim().max(320).optional().nullable(),
  telefono: z.string().trim().max(60).optional().nullable(),
  note: z.string().trim().max(2000).optional().nullable(),
  principale: z.boolean().optional(),
});

const CAMPI_CONTATTO = ["nome", "ruolo", "email", "telefono", "note"] as const;
const CAMPI_ANAGRAFICA = ["piva", "settore", "ateco", "sede", "nazione", "sitoWeb", "dipendenti", "fatturato"] as const;

/** Vero se sembra un'email. Non e' una validazione RFC: e' un filtro contro i refusi. */
function emailPlausibile(v: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v);
}

export async function creaContattoAction(
  companyId: string,
  dati: z.input<typeof nuovoSchema>,
): Promise<ActionEsito<{ id: string }>> {
  try {
    const s = await requireConsultant();
    const c = nuovoSchema.parse(dati);
    if (c.email && !emailPlausibile(c.email)) throw new Error("L'indirizzo email non sembra valido");
    const id = await creaContatto(s.userId, s.orgId, idSchema.parse(companyId), {
      ...c,
      ruolo: c.ruolo || null,
      email: c.email || null,
      telefono: c.telefono || null,
      note: c.note || null,
    });
    revalidatePath(rotta(companyId));
    return { ok: true, dati: { id } };
  } catch (e) {
    return daErrore(e);
  }
}

export async function aggiornaCampoContattoAction(
  companyId: string,
  contattoId: string,
  campo: (typeof CAMPI_CONTATTO)[number],
  valore: string | null,
): Promise<ActionEsito<null>> {
  try {
    const s = await requireConsultant();
    // ⚠️ Il campo si valida contro un elenco CHIUSO e non si passa alla query cosi' com'e':
    // finisce dentro un `set({[campo]: ...})`, e un nome arbitrario che arriva dalla rete
    // deciderebbe quale colonna scrivere.
    const c = z.enum(CAMPI_CONTATTO).parse(campo);
    const v = z.string().max(2000).nullable().parse(valore);
    if (c === "email" && v && !emailPlausibile(v)) throw new Error("L'indirizzo email non sembra valido");
    await aggiornaCampoContatto(s.userId, s.orgId, idSchema.parse(contattoId), c, v);
    revalidatePath(rotta(companyId));
    return { ok: true, dati: null };
  } catch (e) {
    return daErrore(e);
  }
}

export async function promuoviContattoAction(companyId: string, contattoId: string): Promise<ActionEsito<null>> {
  try {
    const s = await requireConsultant();
    await promuoviContatto(s.userId, s.orgId, idSchema.parse(contattoId));
    revalidatePath(rotta(companyId));
    return { ok: true, dati: null };
  } catch (e) {
    return daErrore(e);
  }
}

export async function eliminaContattoAction(companyId: string, contattoId: string): Promise<ActionEsito<null>> {
  try {
    const s = await requireConsultant();
    await eliminaContatto(s.userId, s.orgId, idSchema.parse(contattoId));
    revalidatePath(rotta(companyId));
    return { ok: true, dati: null };
  } catch (e) {
    return daErrore(e);
  }
}

export async function aggiornaAnagraficaAction(
  companyId: string,
  campo: (typeof CAMPI_ANAGRAFICA)[number],
  valore: string | null,
): Promise<ActionEsito<null>> {
  try {
    const s = await requireConsultant();
    const c = z.enum(CAMPI_ANAGRAFICA).parse(campo);
    const v = z.string().max(500).nullable().parse(valore);
    await aggiornaAnagrafica(s.userId, s.orgId, idSchema.parse(companyId), c, v);
    revalidatePath(rotta(companyId));
    return { ok: true, dati: null };
  } catch (e) {
    return daErrore(e);
  }
}
