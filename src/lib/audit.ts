import type { Tx } from "@/lib/db/tenant";
import { auditLog } from "@/lib/db/schema";

// Append-only: INSERT sempre dentro la transazione dell'operazione; UPDATE/DELETE
// sono revocati a livello di grant per il ruolo app. Non deve mai bloccare
// l'operazione principale se fallisce fuori transazione critica.
export async function logAudit(
  tx: Tx,
  entry: {
    organizationId: string;
    /** `null` per le azioni di sistema: il webhook di Stripe non lo preme nessuno, e
     *  attribuirlo a un utente qualsiasi renderebbe la cronologia una bugia. La colonna
     *  lo ammetteva già; era il tipo a non ammetterlo. */
    userId: string | null;
    azione: string;
    entita?: string;
    entitaId?: string;
    dettagli?: Record<string, unknown>;
  },
): Promise<void> {
  await tx.insert(auditLog).values(entry);
}
