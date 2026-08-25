import Link from "next/link";
import { redirect } from "next/navigation";
import { TITOLARE } from "@/lib/legale";
import { getSessionOrNull } from "@/features/auth/guards";
import { firstMembershipOrgId } from "@/features/auth/orgs";
import { getAccountStatus } from "@/features/entitlement";
import { listCompanyNames } from "@/features/companies/fascicolo";
import { withTenant } from "@/lib/db/tenant";
import { CollapsibleShell } from "@/components/app-shell/collapsible-shell";
import { DemoBanner } from "@/components/app-shell/demo-banner";
import { MobileNav } from "@/components/app-shell/mobile-nav";
import { HelpButton } from "@/components/app-shell/help-button";
import { BenvenutoDemo } from "@/components/onboarding/benvenuto-demo";

// Shell dell'app: sidebar scura collassabile + area di lavoro chiara e densa.
// Gate server-side: senza sessione si torna al login (il server è la verità).
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await getSessionOrNull();
  if (!session) redirect("/login");
  const orgId = session.activeOrganizationId ?? (await firstMembershipOrgId(session.userId));
  // Stato e nomi in parallelo: la navigazione contestuale vive sopra la rotta
  // dell'azienda, quindi i nomi non possono arrivarle da un contesto sottostante.
  //
  // ⚠️ Dentro UNA transazione sola. Le due letture ne aprivano una ciascuna, e su questo
  // database `BEGIN`, le GUC e `COMMIT` costano ~300 ms a testa: la barra
  // dell'applicazione le pagava a OGNI pagina, non solo sulla dashboard. `withTenant`
  // riusa quella aperta nella stessa catena di chiamate, quindi le due dentro non
  // cambiano di una riga. Misurato: 426 + 443 ms diventano una transazione sola.
  const [status, aziende] = orgId
    ? await withTenant({ userId: session.userId, orgId }, () =>
        Promise.all([
          getAccountStatus(session.userId, orgId),
          listCompanyNames(session.userId, orgId),
        ]),
      )
    : (["demo", [] as { id: string; nome: string; stato: "active" | "archived" }[]] as const);

  return (
    <>
      <CollapsibleShell nome={session.name} email={session.email} aziende={aziende}>
        <MobileNav aziende={aziende} />
        {status === "demo" && <DemoBanner />}
        {status === "past_due" && (
          <div className="border-b border-warning/40 bg-warning-subtle px-5 py-2.5 text-sm">
            Il rinnovo non è andato a buon fine:{" "}
            <Link href="/impostazioni/abbonamento" className="font-medium underline underline-offset-2">
              sistema il metodo di pagamento
            </Link>{" "}
            per non interrompere il servizio.
          </div>
        )}
        {status === "expired" && (
          <div className="border-b border-warning/40 bg-warning-subtle px-5 py-2.5 text-sm">
            Abbonamento scaduto: account in sola lettura. I tuoi dati restano consultabili ed esportabili.{" "}
            <Link href="/impostazioni/abbonamento" className="font-medium underline underline-offset-2">
              Riattiva lo studio
            </Link>
            .
          </div>
        )}
        <main className="flex-1 px-5 py-6 md:px-8 md:py-8">{children}</main>
        {/* I documenti legali devono essere raggiungibili anche da dentro l'app:
            chi lavora qui non torna alla landing per cercarli. */}
        <footer className="border-t px-5 py-4 md:px-8">
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-muted-foreground">
            <span>
              {TITOLARE.ragioneSociale} · P.IVA {TITOLARE.partitaIva}
            </span>
            <Link href="/privacy" className="tocco-comodo transition-colors hover:text-foreground">
              Privacy
            </Link>
            <Link href="/cookie" className="tocco-comodo transition-colors hover:text-foreground">
              Cookie
            </Link>
            <Link href="/termini" className="tocco-comodo transition-colors hover:text-foreground">
              Termini
            </Link>
            <span className="ml-auto">Dati ospitati nell&apos;Unione Europea</span>
          </div>
        </footer>
      </CollapsibleShell>
      <HelpButton inProva={status === "demo"} />
      {/* La sequenza di benvenuto sta nella shell perché attraversa le pagine: montata
          in una sola di esse, si spegnerebbe alla prima navigazione. */}
      <BenvenutoDemo inProva={status === "demo"} />
    </>
  );
}
