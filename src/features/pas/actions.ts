"use server";

import { revalidatePath } from "next/cache";
import { requireConsultant } from "@/features/auth/guards";
import { daErrore, type ActionEsito } from "@/features/esito";
import { oggiIso } from "@/lib/calc/comune/tempo-italia";
import {
  avviaSistema,
  caricaPianoTipo,
  creaRiga,
  eliminaRiga,
  inserisciModelloPolitica,
  setCampoRequisito,
  setCampoRiga,
  setCampoSistema,
  setContenutoPolitica,
  setMisura,
  setParametro,
} from "./sistema";
import type { TipoRiga } from "./validation";

// Server action = endpoint HTTP: la validazione vive in `sistema.ts`. Qui la guardia di
// sessione e la traduzione dell'eccezione in un esito che il client sa leggere.
//
// ⚠️ Mai `revalidatePath("/dashboard")` (regola del 23 agosto): la pagina che si rinfresca
// è quella del percorso.

const rotta = (companyId: string) => `/aziende/${companyId}/pas24000`;

async function esegui<T>(companyId: string, fn: (s: { userId: string; orgId: string }) => Promise<T>): Promise<ActionEsito<T>> {
  try {
    const s = await requireConsultant();
    const dati = await fn(s);
    revalidatePath(rotta(companyId));
    return { ok: true, dati };
  } catch (e) {
    return daErrore(e);
  }
}

export async function avviaSistemaAction(companyId: string) {
  return esegui(companyId, (s) => avviaSistema(s.userId, s.orgId, { companyId }));
}

export async function setCampoSistemaAction(companyId: string, systemId: string, campo: string, valore: unknown) {
  return esegui(companyId, (s) => setCampoSistema(s.userId, s.orgId, systemId, campo, valore));
}

export async function setParametroAction(companyId: string, systemId: string, campo: string, valore: unknown) {
  return esegui(companyId, (s) => setParametro(s.userId, s.orgId, systemId, { campo: campo as never, valore: valore as never }));
}

export async function setContenutoPoliticaAction(companyId: string, systemId: string, chiave: string, acceso: boolean) {
  return esegui(companyId, (s) => setContenutoPolitica(s.userId, s.orgId, systemId, { chiave, acceso }));
}

export async function inserisciModelloPoliticaAction(companyId: string, systemId: string) {
  return esegui(companyId, (s) => inserisciModelloPolitica(s.userId, s.orgId, systemId));
}

export async function setCampoRequisitoAction(companyId: string, systemId: string, requisitoKey: string, campo: string, valore: unknown) {
  return esegui(companyId, (s) => setCampoRequisito(s.userId, s.orgId, systemId, requisitoKey, campo, valore));
}

export async function setMisuraAction(companyId: string, systemId: string, anno: number, chiave: string, valore: string) {
  return esegui(companyId, (s) => setMisura(s.userId, s.orgId, systemId, { anno, chiave, valore }));
}

export async function creaRigaAction(companyId: string, systemId: string, tipo: TipoRiga) {
  return esegui(companyId, (s) => creaRiga(s.userId, s.orgId, systemId, tipo, oggiIso()));
}

export async function setCampoRigaAction(companyId: string, tipo: TipoRiga, id: string, campo: string, valore: unknown) {
  return esegui(companyId, (s) => setCampoRiga(s.userId, s.orgId, tipo, id, campo, valore));
}

export async function eliminaRigaAction(companyId: string, tipo: TipoRiga, id: string) {
  return esegui(companyId, (s) => eliminaRiga(s.userId, s.orgId, tipo, id));
}

export async function caricaPianoTipoAction(companyId: string, systemId: string) {
  return esegui(companyId, (s) => caricaPianoTipo(s.userId, s.orgId, systemId));
}
