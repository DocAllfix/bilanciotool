import type { Metadata } from "next";
import { requireConsultant } from "@/features/auth/guards";
import { can, getAccountStatus } from "@/features/entitlement";
import { elencaAgenda, oggiIso } from "@/features/agenda";
import { aziendeAttive } from "@/features/companies/lettori-condivisi";
import { VistaAgenda } from "@/components/agenda/vista-agenda";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Agenda" };

export default async function AgendaPage() {
  const s = await requireConsultant();
  const [voci, aziende, stato] = await Promise.all([
    elencaAgenda(s.userId, s.orgId, { includiChiuse: true }),
    aziendeAttive(s.userId, s.orgId),
    getAccountStatus(s.userId, s.orgId),
  ]);

  return (
    <VistaAgenda
      voci={voci}
      aziende={aziende.map((a) => ({ id: a.id, nome: a.nome }))}
      // ⚠️ «Oggi» lo decide il SERVER e arriva come prop. Calcolarlo nel componente
      // client significherebbe che il primo render sul server e quello nel browser
      // possono cadere in due giorni diversi — succede intorno a mezzanotte e durante
      // il cambio d'ora — e React lo segnala come disallineamento di idratazione, con
      // le voci «di oggi» che cambiano sotto gli occhi.
      oggi={oggiIso()}
      soloLettura={!can(stato, "write_data")}
    />
  );
}
