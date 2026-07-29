import type { Tx } from "@/lib/db/tenant";
import { auditLog } from "@/lib/db/schema";

// Append-only: INSERT sempre dentro la transazione dell'operazione; UPDATE/DELETE
// sono revocati a livello di grant per il ruolo app. Non deve mai bloccare
// l'operazione principale se fallisce fuori transazione critica.
export async function logAudit(
  tx: Tx,
  entry: {
    organizationId: string;
    userId: string;
    azione: string;
    entita?: string;
    entitaId?: string;
    dettagli?: Record<string, unknown>;
  },
): Promise<void> {
  await tx.insert(auditLog).values(entry);
}
