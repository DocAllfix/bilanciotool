import type { Metadata } from "next";
import Link from "next/link";
import { requireConsultant } from "@/features/auth/guards";
import { getCompanyUsage } from "@/features/entitlement";
import { getPortfolioOverview, listCompaniesWithStats } from "@/features/companies/queries";
import { getScadenzario, testoMotivo } from "@/features/companies/scadenzario";
import { MODULI_AZIENDA } from "@/features/companies/moduli";
import { NuovaAziendaDialog } from "@/components/portfolio/nuova-azienda-dialog";
import { AziendaAzioni } from "@/components/portfolio/azienda-azioni";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { etichettaDocumento } from "@/features/documents/tipi";
import { fmtNum, fmtRelativa } from "@/lib/format";
import { ExternalLink, FileText, Leaf } from "lucide-react";

export const metadata: Metadata = { title: "Portafoglio" };
export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const s = await requireConsultant();
  const [aziende, usage, quadro, scadenzario] = await Promise.all([
    listCompaniesWithStats(s.userId, s.orgId),
    getCompanyUsage(s.userId, s.orgId),
    getPortfolioOverview(s.userId, s.orgId),
    getScadenzario(s.userId, s.orgId),
  ]);
  const attive = aziende.filter((a) => a.stato === "active");
  const archiviate = aziende.filter((a) => a.stato === "archived");
  // Solo le voci che chiedono un'azione, e non l'elenco completo dei
  // «mai avviato»: un promemoria per ogni modulo mai toccato di ogni azienda
  // sarebbe rumore, non lavoro.
  const daFare = scadenzario.filter((v) => v.motivo !== "mai-avviato");

  return (
    <div className="mx-auto w-full max-w-6xl">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight">Portafoglio</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Il quadro dello studio e le aziende che rendiconti.
          </p>
        </div>
        <NuovaAziendaDialog atLimit={usage.atLimit} limite={usage.limit} />
      </div>

      {/* Quadro dello studio: banda quieta di numeri reali, calcolati al volo */}
      <dl className="mt-5 flex flex-wrap items-baseline gap-x-8 gap-y-3 border-y py-4">
        <div className="flex items-baseline gap-2">
          <dd className="text-xl font-semibold tracking-tight" data-slot="kpi">{attive.length}</dd>
          <dt className="text-[13px] text-muted-foreground">
            {attive.length === 1 ? "azienda attiva" : "aziende attive"}
            {archiviate.length > 0 && ` (+${archiviate.length} in archivio)`}
          </dt>
        </div>
        <div className="flex items-baseline gap-2">
          <dd className="text-xl font-semibold tracking-tight" data-slot="kpi">
            {daFare.length}
          </dd>
          <dt className="text-[13px] text-muted-foreground">
            {daFare.length === 1 ? "percorso da riprendere" : "percorsi da riprendere"}
          </dt>
        </div>
        <div className="flex items-baseline gap-2">
          <dd className="text-xl font-semibold tracking-tight" data-slot="kpi">{quadro.documentiTotali}</dd>
          <dt className="text-[13px] text-muted-foreground">
            {quadro.documentiTotali === 1 ? "documento pubblicato" : "documenti pubblicati"}
          </dt>
        </div>
        {quadro.attivita[0] && (
          <div className="ml-auto hidden text-[13px] text-muted-foreground lg:block">
            Ultima attività: {fmtRelativa(quadro.attivita[0].quando)}
          </div>
        )}
      </dl>

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

      <div className="mt-6 grid gap-8 lg:grid-cols-[minmax(0,1fr)_290px]">
        <div className="min-w-0">
          {attive.length === 0 ? (
            <Card>
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
            <div className="grid gap-4 sm:grid-cols-2">
              {attive.map((a) => (
                <Card
                  key={a.id}
                  className="group relative transition-all hover:-translate-y-0.5 hover:border-primary/35 hover:shadow-md"
                  {...(a.isDemo ? { "data-tour": "azienda-demo" } : {})}
                >
                  {/* L'intera card apre il FASCICOLO, non un modulo: con cinque
                      percorsi mandare dritti al GHG era una scelta arbitraria. */}
                  <Link
                    href={`/aziende/${a.id}`}
                    aria-label={`Apri ${a.nome}`}
                    className="absolute inset-0 z-0 rounded-xl"
                  />
                  <CardHeader>
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <h2 className="truncate text-[15px] font-semibold tracking-tight group-hover:text-primary">
                          {a.nome}
                        </h2>
                        <p className="mt-0.5 truncate text-xs text-muted-foreground">
                          {[a.settore, a.sede].filter(Boolean).join(" · ") || "profilo da completare"}
                        </p>
                      </div>
                      <div className="relative z-10 flex shrink-0 items-center gap-1">
                        {a.isDemo && <Badge variant="outline">Demo</Badge>}
                        <AziendaAzioni companyId={a.id} archiviata={false} />
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <dl className="grid grid-cols-3 gap-3 border-t pt-3">
                      <div>
                        <dt className="text-[11px] uppercase tracking-wide text-muted-foreground">
                          tCO₂e {a.ultimoAnno ? `· ${a.ultimoAnno}` : ""}
                        </dt>
                        <dd className="mt-0.5 text-lg font-semibold tracking-tight" data-slot="kpi">
                          {a.totL ? fmtNum(a.totL, 1) : "—"}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-[11px] uppercase tracking-wide text-muted-foreground">Voci</dt>
                        <dd className="mt-0.5 text-lg font-semibold tracking-tight" data-slot="kpi">{a.voci}</dd>
                      </div>
                      <div>
                        <dt className="text-[11px] uppercase tracking-wide text-muted-foreground">Documenti</dt>
                        <dd className="mt-0.5 text-lg font-semibold tracking-tight" data-slot="kpi">{a.documenti}</dd>
                      </div>
                    </dl>
                  </CardContent>
                  {/* Cinque moduli in una riga di caselle uguali, non cinque bottoni in fila:
                      con etichette a larghezza libera il footer non stava nella card e
                      Fornitore e SoA finivano tagliati fuori, irraggiungibili. */}
                  <CardFooter className="relative z-10 grid grid-cols-5 gap-1 p-2">
                    {MODULI_AZIENDA.map((m) => (
                      <Link
                        key={m.href}
                        href={`/aziende/${a.id}/${m.href}`}
                        // Colore esplicito: senza, i moduli già aperti rendevano col
                        // colore dei link visitati e la riga usciva a due tinte.
                        className="flex min-w-0 flex-col items-center gap-1 rounded-md px-1 py-2 text-center text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                      >
                        <m.icona className="size-4 shrink-0" strokeWidth={1.75} />
                        <span className="w-full truncate text-[10.5px] font-medium leading-none">{m.etichetta}</span>
                      </Link>
                    ))}
                  </CardFooter>
                </Card>
              ))}
            </div>
          )}

          {archiviate.length > 0 && (
            <div className="mt-10">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Archivio</h2>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
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

        {/* Colonna dello studio: documenti pubblicati e flusso di attività */}
        <aside className="min-w-0 space-y-8 lg:border-l lg:pl-8">
          {/* Da riprendere: righe, non grafici. La domanda del mattino è
              «cosa ho lasciato a metà», e a quella si risponde con un elenco. */}
          <section aria-label="Da riprendere">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Da riprendere</h2>
            {daFare.length === 0 ? (
              <p className="mt-3 text-[13px] leading-relaxed text-muted-foreground">
                Niente in sospeso: ogni percorso avviato è stato pubblicato.
              </p>
            ) : (
              <ul className="mt-3 space-y-1">
                {daFare.slice(0, 6).map((v) => {
                  const m = MODULI_AZIENDA.find((x) => x.href === v.modulo)!;
                  return (
                    <li key={`${v.companyId}-${v.modulo}`}>
                      <Link
                        href={v.href}
                        className="group -mx-2 flex items-start gap-2.5 rounded-md px-2 py-2 transition-colors hover:bg-accent"
                      >
                        <m.icona
                          className="mt-0.5 size-4 shrink-0 text-muted-foreground group-hover:text-accent-foreground"
                          strokeWidth={1.75}
                        />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[13px] font-medium">
                            {m.etichetta}
                            {v.anno !== null && <span className="text-muted-foreground"> · {v.anno}</span>}
                          </span>
                          <span className="block truncate text-[11px] text-muted-foreground">
                            {v.companyNome} · {testoMotivo(v.motivo)}
                          </span>
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
            {daFare.length > 6 && (
              <p className="mt-2 text-[11px] text-muted-foreground">e altri {daFare.length - 6}</p>
            )}
          </section>

          <section aria-label="Documenti pubblicati">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Documenti pubblicati
            </h2>
            {quadro.recenti.length === 0 ? (
              <p className="mt-3 text-[13px] leading-relaxed text-muted-foreground">
                Ancora nessuno: completa un percorso e pubblica la prima versione. Il documento
                pubblicato resta congelato per sempre.
              </p>
            ) : (
              <ul className="mt-3 space-y-1">
                {quadro.recenti.map((d) => (
                  <li key={d.id}>
                    <a
                      href={`/documento/${d.id}`}
                      target="_blank"
                      rel="noopener"
                      className="group flex items-center gap-2.5 rounded-md px-2 py-2 -mx-2 transition-colors hover:bg-accent"
                    >
                      <FileText className="size-4 shrink-0 text-muted-foreground group-hover:text-accent-foreground" strokeWidth={1.75} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[13px] font-medium">
                          {etichettaDocumento(d.tipo, d.anno, true)}
                          <span className="text-muted-foreground"> · v{d.versione}</span>
                        </span>
                        <span className="block truncate text-[11px] text-muted-foreground">{d.companyNome}</span>
                      </span>
                      <ExternalLink className="size-3.5 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section aria-label="Attività recente">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Attività recente
            </h2>
            {quadro.attivita.length === 0 ? (
              <p className="mt-3 text-[13px] leading-relaxed text-muted-foreground">
                Qui vedrai le ultime operazioni dello studio, passo per passo.
              </p>
            ) : (
              <ol className="mt-3 space-y-3">
                {quadro.attivita.map((v, i) => (
                  <li key={i} className="flex gap-2.5 text-[13px]">
                    <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-primary/50" aria-hidden />
                    <span className="min-w-0">
                      <span className="block leading-snug">{v.etichetta}</span>
                      <span className="block text-[11px] text-muted-foreground">
                        {[v.companyNome, fmtRelativa(v.quando)].filter(Boolean).join(" · ")}
                      </span>
                    </span>
                  </li>
                ))}
              </ol>
            )}
          </section>
        </aside>
      </div>
    </div>
  );
}
