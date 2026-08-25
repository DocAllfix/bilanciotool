import type { Metadata } from "next";
import { requireConsultant } from "@/features/auth/guards";
import { can, getAccountStatus } from "@/features/entitlement";
import { elencaCompensi, riepilogo } from "@/features/compensi";
import { oggiIso } from "@/features/agenda";
import { aziendeAttive } from "@/features/companies/lettori-condivisi";
import { VistaCompensi } from "@/components/compensi/vista-compensi";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Compensi" };

// ⚠️ Questa pagina è dello STUDIO e non compare da nessuna parte dentro un'azienda.
// Il collegamento del portale cliente è per azienda: tutto ciò che sta in una pagina
// dell'azienda è materiale che un giorno qualcuno potrebbe includere «per comodità».

export default async function CompensiPage() {
  const s = await requireConsultant();
  const [voci, aziende, stato] = await Promise.all([
    elencaCompensi(s.userId, s.orgId),
    aziendeAttive(s.userId, s.orgId),
    getAccountStatus(s.userId, s.orgId),
  ]);
  const oggi = oggiIso();

  return (
    <VistaCompensi
      voci={voci}
      riepilogo={riepilogo(voci, oggi)}
      aziende={aziende.map((a) => ({ id: a.id, nome: a.nome }))}
      oggi={oggi}
      soloLettura={!can(stato, "write_data")}
    />
  );
}
