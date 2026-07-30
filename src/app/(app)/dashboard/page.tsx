import type { Metadata } from "next";
import Link from "next/link";
import { requireConsultant } from "@/features/auth/guards";
import { getCompanyUsage } from "@/features/entitlement";
import { listCompaniesWithStats } from "@/features/companies/queries";
import { NuovaAziendaDialog } from "@/components/portfolio/nuova-azienda-dialog";
import { AziendaAzioni } from "@/components/portfolio/azienda-azioni";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { fmtNum } from "@/lib/format";
import { Factory, Leaf } from "lucide-react";

export const metadata: Metadata = { title: "Portafoglio" };
export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const s = await requireConsultant();
  const [aziende, usage] = await Promise.all([
    listCompaniesWithStats(s.userId, s.orgId),
    getCompanyUsage(s.userId, s.orgId),
  ]);
  const attive = aziende.filter((a) => a.stato === "active");
  const archiviate = aziende.filter((a) => a.stato === "archived");

  return (
    <div className="mx-auto w-full max-w-6xl">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Portafoglio</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {attive.length === 1 ? "1 azienda attiva" : `${attive.length} aziende attive`}
            {archiviate.length > 0 && ` · ${archiviate.length} in archivio`}
          </p>
        </div>
        <NuovaAziendaDialog atLimit={usage.atLimit} limite={usage.limit} />
      </div>

      {usage.nearLimit && !usage.atLimit && (
        <div className="mt-4 rounded-lg border border-warning/40 bg-warning-subtle px-4 py-3 text-sm">
          Stai per raggiungere il limite del piano: {usage.active} aziende attive su {usage.limit}.
        </div>
      )}
      {usage.atLimit && (
        <div className="mt-4 rounded-lg border border-warning/40 bg-warning-subtle px-4 py-3 text-sm">
          Hai raggiunto il limite di {usage.limit} aziende attive. Archivia un&apos;azienda oppure{" "}
          <a className="font-medium underline" href="mailto:info@example.com">contattaci per il piano Studio</a>.
        </div>
      )}

      {attive.length === 0 ? (
        <Card className="mt-10">
          <CardContent className="flex flex-col items-center py-14 text-center">
            <span className="flex size-12 items-center justify-center rounded-full bg-accent text-accent-foreground">
              <Leaf className="size-6" strokeWidth={1.75} />
            </span>
            <h2 className="mt-4 text-lg font-semibold tracking-tight">Il portafoglio è vuoto</h2>
            <p className="mt-1 max-w-sm text-sm text-muted-foreground">
              Crea la prima azienda cliente e avvia il suo inventario GHG: il percorso guidato fa il resto.
            </p>
            <div className="mt-5">
              <NuovaAziendaDialog atLimit={usage.atLimit} limite={usage.limit} />
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {attive.map((a) => (
            <Card key={a.id} className="group transition-shadow hover:shadow-md">
              <CardHeader>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h2 className="truncate text-[15px] font-semibold tracking-tight">{a.nome}</h2>
                    <p className="mt-0.5 truncate text-xs text-muted-foreground">
                      {[a.settore, a.sede].filter(Boolean).join(" · ") || "profilo da completare"}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    {a.isDemo && <Badge variant="outline">Demo</Badge>}
                    <AziendaAzioni companyId={a.id} archiviata={false} />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <dl className="grid grid-cols-2 gap-3 border-t pt-3">
                  <div>
                    <dt className="text-[11px] uppercase tracking-wide text-muted-foreground">
                      tCO₂e {a.ultimoAnno ? `· ${a.ultimoAnno}` : ""}
                    </dt>
                    <dd className="mt-0.5 text-lg font-semibold tracking-tight" data-slot="kpi">
                      {a.totL ? fmtNum(a.totL, 1) : "—"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[11px] uppercase tracking-wide text-muted-foreground">Voci inserite</dt>
                    <dd className="mt-0.5 text-lg font-semibold tracking-tight" data-slot="kpi">{a.voci}</dd>
                  </div>
                </dl>
              </CardContent>
              <CardFooter className="gap-2">
                <Button variant="outline" size="sm" asChild>
                  <Link href={`/aziende/${a.id}/ghg`}>
                    <Factory className="size-3.5" /> Inventario GHG
                  </Link>
                </Button>
                <Button variant="outline" size="sm" disabled title="Il modulo Bilancio arriva nella prossima fase">
                  Bilancio
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}

      {archiviate.length > 0 && (
        <div className="mt-10">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Archivio</h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {archiviate.map((a) => (
              <Card key={a.id} className="opacity-70">
                <CardHeader>
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h3 className="truncate text-sm font-semibold">{a.nome}</h3>
                      <p className="text-xs text-muted-foreground">sola lettura · non conta nel limite</p>
                    </div>
                    <AziendaAzioni companyId={a.id} archiviata />
                  </div>
                </CardHeader>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
