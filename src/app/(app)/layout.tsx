import { redirect } from "next/navigation";
import { getSessionOrNull } from "@/features/auth/guards";
import { firstMembershipOrgId } from "@/features/auth/orgs";
import { getAccountStatus } from "@/features/entitlement";
import { CollapsibleShell } from "@/components/app-shell/collapsible-shell";
import { DemoBanner } from "@/components/app-shell/demo-banner";
import { MobileNav } from "@/components/app-shell/mobile-nav";
import { HelpButton } from "@/components/app-shell/help-button";

// Shell dell'app: sidebar scura collassabile + area di lavoro chiara e densa.
// Gate server-side: senza sessione si torna al login (il server è la verità).
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await getSessionOrNull();
  if (!session) redirect("/login");
  const orgId = session.activeOrganizationId ?? (await firstMembershipOrgId(session.userId));
  const status = orgId ? await getAccountStatus(session.userId, orgId) : "demo";

  return (
    <>
      <CollapsibleShell nome={session.name} email={session.email}>
        <MobileNav />
        {status === "demo" && <DemoBanner />}
        {status === "past_due" && (
          <div className="border-b border-warning/40 bg-warning-subtle px-5 py-2.5 text-sm">
            Il rinnovo non è andato a buon fine: aggiorna il metodo di pagamento per non interrompere il servizio.
          </div>
        )}
        {status === "expired" && (
          <div className="border-b border-warning/40 bg-warning-subtle px-5 py-2.5 text-sm">
            Abbonamento scaduto: account in sola lettura. I tuoi dati restano consultabili ed esportabili.
          </div>
        )}
        <main className="flex-1 px-5 py-6 md:px-8 md:py-8">{children}</main>
      </CollapsibleShell>
      <HelpButton />
    </>
  );
}
