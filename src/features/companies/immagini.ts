import { and, eq } from "drizzle-orm";
import { withTenant } from "@/lib/db/tenant";
import { company } from "@/lib/db/schema";
import { signedUrl } from "@/lib/storage";
import { requireEntitlement } from "@/features/entitlement";
import { logAudit } from "@/lib/audit";

// Logo e copertina dell'AZIENDA, per tutti i documenti.
//
// Stavano dentro il bilancio (`features/report/projects.ts`), perché era l'unico
// documento che li usava. Da quando li usano tutti e ventidue, sono una proprietà
// dell'azienda: si caricano una volta e valgono per ogni percorso. Il caricamento vero
// resta `setCompanyImage` — spostarlo non cambiava niente e rischiava di rompere il
// bilancio — e qui si aggiunge ciò che mancava: leggerle da qualunque percorso, e
// scegliere come si usa la copertina.

export type ModoCopertina = "foto" | "pagina";

export type ImmaginiAzienda = {
  logoUrl: string | null;
  coverUrl: string | null;
  modo: ModoCopertina;
};

/** Le immagini correnti, con indirizzi firmati per l'anteprima. */
export async function getImmaginiAzienda(userId: string, orgId: string, companyId: string): Promise<ImmaginiAzienda> {
  const [c] = await withTenant({ userId, orgId }, (tx) =>
    tx
      .select({ logo: company.logoStorageKey, cover: company.coverStorageKey, modo: company.copertinaModo })
      .from(company)
      // Il filtro esplicito sull'organizzazione sta qui IN AGGIUNTA a RLS: in sviluppo la
      // connessione è privilegiata e le policy non scattano (regola del 3 agosto).
      .where(and(eq(company.id, companyId), eq(company.organizationId, orgId))),
  );
  if (!c) throw new Error("Azienda inesistente o di un altro tenant");
  // Un'anteprima che manca non deve togliere le altre: si mostra ciò che c'è.
  const firma = (k: string | null) => (k ? signedUrl(orgId, k, 1800).catch(() => null) : Promise.resolve(null));
  const [logoUrl, coverUrl] = await Promise.all([firma(c.logo), firma(c.cover)]);
  return { logoUrl, coverUrl, modo: c.modo };
}

/**
 * Come si usa la copertina: fotografia sopra il titolo, o pagina intera già impaginata.
 *
 * Una scelta di chi carica, non una deduzione dalle proporzioni: una foto verticale non
 * è una copertina finita, e una copertina finita può non avere esattamente le
 * proporzioni di un A4. Vale per i documenti pubblicati DA ORA: quelli già pubblicati
 * hanno congelato il modo con cui sono usciti.
 */
export async function setCopertinaModo(
  userId: string,
  orgId: string,
  companyId: string,
  modo: ModoCopertina,
): Promise<void> {
  if (modo !== "foto" && modo !== "pagina") throw new Error("Modo della copertina non valido");
  await requireEntitlement(userId, orgId, "write_data");
  await withTenant({ userId, orgId }, async (tx) => {
    const aggiornate = await tx
      .update(company)
      .set({ copertinaModo: modo })
      .where(and(eq(company.id, companyId), eq(company.organizationId, orgId)))
      .returning({ id: company.id });
    if (!aggiornate.length) throw new Error("Azienda inesistente o di un altro tenant");
    await logAudit(tx, {
      organizationId: orgId,
      userId,
      azione: "company.copertina_modo.set",
      entita: "company",
      entitaId: companyId,
      dettagli: { modo },
    });
  });
}
