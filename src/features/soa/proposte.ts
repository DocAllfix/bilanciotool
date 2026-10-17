import { and, eq, isNull } from "drizzle-orm";
import { withTenant } from "@/lib/db/tenant";
import { gdprSystem, gdprTrattamento } from "@/lib/db/schema";
import { propostaRuoloPrivacy } from "@/lib/calc/proposte-compliance";

// Il ruolo privacy proposto alla creazione della dichiarazione, dal percorso GDPR della
// stessa azienda. È il valore iniziale della tendina, col motivo accanto: lo sceglie chi crea.
//
// ⚠️ Rivela solo il ruolo derivato, non il registro: chi lavora sulla SoA senza il percorso
// GDPR assegnato vede «titolare» o «responsabile», non i trattamenti.

export async function propostaPrivacyDaGdpr(userId: string, orgId: string, companyId: string) {
  return withTenant({ userId, orgId }, async (tx) => {
    const [s] = await tx
      .select({ id: gdprSystem.id, ruolo: gdprSystem.ruolo })
      .from(gdprSystem)
      .where(and(eq(gdprSystem.companyId, companyId), eq(gdprSystem.organizationId, orgId)))
      .limit(1);
    if (!s) return null;
    const t = await tx
      .select({ ruolo: gdprTrattamento.ruolo })
      .from(gdprTrattamento)
      .where(and(eq(gdprTrattamento.systemId, s.id), eq(gdprTrattamento.organizationId, orgId), isNull(gdprTrattamento.propostaMotivo)));
    return propostaRuoloPrivacy(s.ruolo, t.map((x) => x.ruolo));
  });
}
