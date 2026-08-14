import { randomUUID } from "node:crypto";
import { db } from "@/lib/db";
import { organization, member, orgEntitlement, company, auditLog, user } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

// L'allestimento che diciotto test su database ripetono.
//
// Esiste perché era già stato sentito come necessario da due autori diversi: `creaStudio`
// e `pulisciStudio` sono state scritte **due volte, con lo stesso nome**, in
// `navigazione.db.test.ts` e `soa-confine-tenant.db.test.ts`, e nessuna delle due è
// finita in un posto comune. Quando la stessa astrazione nasce due volte da sola, è il
// momento di darle una casa.
//
// ── Che cosa NON sta qui, e perché ────────────────────────────────────────────
//
// **L'entitlement.** Sembra la cosa più ripetuta di tutte (`{ status: "active" }` dodici
// volte) ed è invece l'unica che deve restare scritta in ogni test, perché in tre casi
// **è il test**:
//   · `piani-limiti` usa `professional` per verificare i limiti di quel piano;
//   · `storage-traversal` usa `demo` perché il punto è che la prova possiede già
//     `write_data`;
//   · `upload-immagini` passa `piano` + `activatedAt` insieme, e ha un commento che
//     spiega il CHECK `org_entitlement_piano_attivo_ck` della migrazione 0012.
// Un valore predefinito nasconderebbe la premessa di quei tre, e li farebbe passare
// dicendo un'altra cosa.
//
// **Le tabelle di modulo.** La coda di `afterAll` le accetta dal chiamante: l'ordine è
// vincolato dalle chiavi esterne, e ogni test sa quali ha sporcato.

export type Studio = {
  orgId: string;
  userId: string;
  /** Presente solo se si è chiesta un'azienda. */
  companyId: string;
};

/**
 * Crea utente, studio, appartenenza e (se richiesto) un'azienda.
 *
 * **Non crea l'entitlement**: lo scrive il test, perché in tre casi su diciotto quella
 * riga è la premessa che il test sta verificando.
 */
export async function creaStudio(opts: {
  /** Prefisso dei nomi, per riconoscere le righe di un test che ha lasciato sporco. */
  prefisso: string;
  /** Deve essere unico per esecuzione: di solito `Date.now()`. */
  run: number | string;
  nomeStudio?: string;
  /** Nome dell'azienda. Molti test lo asseriscono: si passa esplicito, mai generato. */
  nomeAzienda?: string;
}): Promise<Studio> {
  const { prefisso, run } = opts;
  const orgId = `org-${prefisso}-${run}`;
  const userId = `user-${prefisso}-${run}`;
  const companyId = `az-${prefisso}-${run}`;

  await db.insert(user).values({
    id: userId,
    name: opts.nomeStudio ?? "Consulente",
    email: `${prefisso}-${run}@example.com`,
  });
  await db.insert(organization).values({
    id: orgId,
    name: opts.nomeStudio ?? `Studio ${prefisso}`,
    slug: `${prefisso}-${run}`,
  });
  await db.insert(member).values({ id: randomUUID(), organizationId: orgId, userId, role: "owner" });
  if (opts.nomeAzienda) {
    await db.insert(company).values({ id: companyId, organizationId: orgId, nome: opts.nomeAzienda });
  }
  return { orgId, userId, companyId };
}

/**
 * Cancella la coda comune: audit, azienda, entitlement, appartenenza, studio, utente.
 *
 * L'ordine è vincolato dalle chiavi esterne e va dal più dipendente al meno. Le tabelle
 * del modulo — inventari, bilanci, dichiarazioni — si cancellano **prima** di chiamare
 * questa, perché solo il test sa quali ha toccato.
 */
export async function pulisciStudio(orgId: string, userId: string): Promise<void> {
  await db.delete(auditLog).where(eq(auditLog.organizationId, orgId));
  await db.delete(company).where(eq(company.organizationId, orgId));
  await db.delete(orgEntitlement).where(eq(orgEntitlement.organizationId, orgId));
  await db.delete(member).where(eq(member.organizationId, orgId));
  await db.delete(organization).where(eq(organization.id, orgId));
  await db.delete(user).where(eq(user.id, userId));
}
