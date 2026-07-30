import { redirect } from "next/navigation";
import { getSessionOrNull } from "@/features/auth/guards";
import { firstMembershipOrgId } from "@/features/auth/orgs";
import { getAccountStatus } from "@/features/entitlement";
import { SidebarNav } from "@/components/app-shell/sidebar-nav";
import { UserMenu } from "@/components/app-shell/user-menu";
import { DemoBanner } from "@/components/app-shell/demo-banner";
import { HelpButton } from "@/components/app-shell/help-button";
import { ThemeToggle } from "@/components/theme-toggle";
import { Leaf } from "lucide-react";

// Shell dell'app: sidebar scura fissa + area di lavoro chiara e densa.
// Gate server-side: senza sessione si torna al login (il server è la verità).
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await getSessionOrNull();
  if (!session) redirect("/login");
  const orgId = session.activeOrganizationId ?? (await firstMembershipOrgId(session.userId));
  const status = orgId ? await getAccountStatus(session.userId, orgId) : "demo";

  return (
    <div className="flex min-h-dvh w-full">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col border-r border-sidebar-border bg-sidebar md:flex">
        <div className="flex items-center gap-2.5 px-6 pb-5 pt-6">
          <span className="flex size-7 items-center justify-center rounded-md bg-sidebar-primary text-sidebar-primary-foreground">
            <Leaf className="size-4" strokeWidth={2} />
          </span>
          <span className="text-[15px] font-semibold tracking-tight text-white">EvalisDeck</span>
        </div>
        <SidebarNav />
        <div className="mt-auto border-t border-sidebar-border p-3">
          <div className="flex items-center gap-1">
            <div className="min-w-0 flex-1">
              <UserMenu nome={session.name} email={session.email} />
            </div>
            <ThemeToggle className="text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground" />
          </div>
        </div>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col md:pl-60">
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
      </div>
      <HelpButton />
    </div>
  );
}
