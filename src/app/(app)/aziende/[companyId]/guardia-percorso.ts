import { notFound } from "next/navigation";
import { getSessionOrNull, orgAttivaVerificata } from "@/features/auth/guards";
import { percorsiVisibili } from "@/features/auth/percorsi";
import type { ModuloAzienda } from "@/features/companies/moduli";

/**
 * Le pagine di un percorso non assegnato NON ESISTONO per chi non lo ha (fascia «Azienda»).
 *
 * ⚠️ `notFound()` e non un'eccezione: dentro un componente server diventerebbe un 500 (lo
 * stesso motivo di `staff/guardia.ts`). E «non ti è stato assegnato» confermerebbe che la
 * pagina c'è. Il divieto vero sta comunque sul server, in `requirePercorso`: questa è la
 * metà che riguarda la lettura.
 *
 * Senza sessione o senza studio non decide niente: ci pensa la pagina, come sempre.
 */
export async function guardiaPercorso(modulo: ModuloAzienda): Promise<void> {
  const s = await getSessionOrNull();
  if (!s) return;
  const esito = await orgAttivaVerificata(s);
  if (typeof esito === "string") return;
  const visibili = await percorsiVisibili({ userId: s.userId, orgId: esito.orgId, role: esito.role });
  if (visibili && !visibili.has(modulo)) notFound();
}
