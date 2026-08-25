import type { Metadata } from "next";
import Link from "next/link";
import { requireConsultant } from "@/features/auth/guards";
import { getCompanyUsage } from "@/features/entitlement";
import { getPortfolioOverview, listCompaniesWithStats } from "@/features/companies/queries";
import { getScadenzario, testoMotivo } from "@/features/companies/scadenzario";
import { getStatiPortafoglio } from "@/features/companies/stati-moduli";
import { MODULI_AZIENDA } from "@/features/companies/moduli";
import { withTenant } from "@/lib/db/tenant";
import { NuovaAziendaDialog } from "@/components/portfolio/nuova-azienda-dialog";
import { AziendaAzioni } from "@/components/portfolio/azienda-azioni";
import { ServiziStudio } from "@/components/portfolio/servizi-studio";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { etichettaDocumento } from "@/features/documents/tipi";
import { fmtNum, fmtRelativa } from "@/lib/format";
import { ExternalLink, FileText, Leaf } from "lucide-react";

export const metadata: Metadata = { title: "Portafoglio" };
export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const s = await requireConsultant();
  // ⚠️ UNA transazione per tutta la pagina, e le cinque letture la riusano.
  //
  // Ognuna apriva la propria: sei transazioni, e su questo database l'apertura e la
  // chiusura costano ~300 ms a testa — quasi due secondi spesi prima di leggere un dato,
  // su una pagina che si apre a ogni accesso. `withTenant` ora riusa quella aperta nella
  // stessa catena di chiamate (vedi `lib/db/tenant.ts`), quindi basta aprirla qui e le
  // funzioni dentro non cambiano di una riga.
  //
  // ⚠️ Tutto DENTRO l'unica transazione, radici comprese. Prima le radici si chiedevano
  // fuori, perché aprivano la propria e annidarle esauriva il pool: da quando
  // `withTenant` riusa quella aperta nella stessa catena di chiamate, l'annidamento è
  // sicuro — e chiederle fuori costava una transazione intera, cioè ~300 ms su questo
  // database.
  const [aziende, usage, quadro, scadenzario, stati] = await withTenant(
    { userId: s.userId, orgId: s.orgId },
    () =>
      Promise.all([
        listCompaniesWithStats(s.userId, s.orgId),
        getCompanyUsage(s.userId, s.orgId),
        getPortfolioOverview(s.userId, s.orgId),
        getScadenzario(s.userId, s.orgId),
        getStatiPortafoglio(s.userId, s.orgId),
      ]),
  );
  const attive = aziende.filter((a) => a.stato === "active");
  const archiviate = aziende.filter((a) => a.stato === "archived");
  // Solo le voci che chiedono un'azione, e non l'elenco completo dei
  // «mai avviato»: un promemoria per ogni modulo mai toccato di ogni azienda
  // sarebbe rumore, non lavoro.
  const daFare = scadenzario.filter((v) => v.motivo !== "mai-avviato");
  const statiPerAzienda = new Map(stati.aziende.map((a) => [a.id, a.moduli]));
  // La prima cosa da fare per ciascuna azienda, per la riga sotto i numeri.
  const prossimaPerAzienda = new Map<string, string>();
  for (const v of daFare) {
    if (!prossimaPerAzienda.has(v.companyId)) {
      const m = MODULI_AZIENDA.find((x) => x.href === v.modulo)!;
      prossimaPerAzienda.set(v.companyId, `${m.etichetta}${v.anno ? ` ${v.anno}` : ""}: ${testoMotivo(v.motivo)}`);
    }
  }

  return (
    <div className="mx-auto w-full max-w-6xl">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight">Portafoglio</h1>
          <p className="mt-1 text-sm text-muted-foreground">Il quadro dello studio e le aziende che rendiconti.</p>
        </div>
        <NuovaAziendaDialog atLimit={usage.atLimit} limite={usage.limit} />
      </div>

      {/* Quadro dello studio: banda quieta di numeri reali, calcolati al volo */}
      <dl className="mt-5 flex flex-wrap items-baseline gap-x-8 gap-y-3 border-y py-4">
        <div className="flex items-baseline gap-2">
          <dd className="text-xl font-semibold tracking-tight" data-slot="kpi">
            {attive.length}
          </dd>
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
          <dd className="text-xl font-semibold tracking-tight" data-slot="kpi">
            {quadro.documentiTotali}
          </dd>
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
          {/* Prima mandava a una email, che è un vicolo cieco travestito da aiuto: con i
              piani, la strada per allargare la capacità è una pagina del prodotto. */}
          Hai raggiunto il limite di {usage.limit} aziende attive. Archivia un&apos;azienda oppure{" "}
          <Link className="font-medium underline" href="/impostazioni/abbonamento">
            aggiungi capacità al tuo piano
          </Link>
          .
        </div>
      )}

      {/* Una colonna sola. Prima la pagina era divisa in due colonne di altezza
          molto diversa (le card a sinistra, tre sezioni impilate a destra), e il
          dislivello lasciava centinaia di pixel vuoti a sinistra: il vuoto non
          era «sotto le card», era il dislivello. */}
      {attive.length === 0 ? (
        <Card className="mt-6">
          <CardContent className="flex flex-col items-center py-14 text-center">
            <span className="flex size-12 items-center justify-center rounded-full bg-accent text-accent-foreground">
              <Leaf className="size-6" strokeWidth={1.75} />
            </span>
            <h2 className="mt-4 text-lg font-semibold tracking-tight">Il portafoglio è vuoto</h2>
            <p className="mt-1 max-w-sm text-sm text-muted-foreground">
              Crea la prima azienda cliente e avvia il suo primo percorso: le schermate guidate fanno il resto.
            </p>
            <div className="mt-5">
              <NuovaAziendaDialog atLimit={usage.atLimit} limite={usage.limit} />
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {attive.map((a) => {
            const moduli = statiPerAzienda.get(a.id) ?? [];
            const prossima = prossimaPerAzienda.get(a.id);
            return (
              <Card
                key={a.id}
                className="group relative transition-all hover:-translate-y-0.5 hover:border-primary/35 hover:shadow-md"
                {...(a.isDemo ? { "data-tour": "azienda-demo" } : {})}
              >
                {/* L'intera card apre il FASCICOLO, non un modulo: con cinque
                    percorsi mandare dritti al GHG era una scelta arbitraria.

                    ⚠️ Il collegamento sta a `z-10`, SOPRA il testo della card, e i
                    comandi veri salgono a `z-20`. Con `z-0` era sotto tutto: un clic sul
                    nome dell'azienda colpiva il titolo — che non e' interattivo — e non
                    succedeva niente. La card si annunciava cliccabile per intero e lo era
                    solo negli spazi vuoti. Misurato con `elementFromPoint` su quattro
                    punti: nessuno raggiungeva il collegamento.

                    Il prezzo: il testo della card non si seleziona piu' col trascinamento.
                    E' il compromesso normale di una card cliccabile, e qui il testo e'
                    un nome e tre numeri che stanno tutti nel fascicolo. */}
                <Link href={`/aziende/${a.id}`} aria-label={`Apri ${a.nome}`} className="absolute inset-0 z-10 rounded-xl" />
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
                    <div className="relative z-20 flex shrink-0 items-center gap-1">
                      {a.isDemo && <Badge variant="outline">Demo</Badge>}
                      <AziendaAzioni companyId={a.id} nome={a.nome} archiviata={false} />
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
                      <dd className="mt-0.5 text-lg font-semibold tracking-tight" data-slot="kpi">
                        {a.voci}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-[11px] uppercase tracking-wide text-muted-foreground">Documenti</dt>
                      <dd className="mt-0.5 text-lg font-semibold tracking-tight" data-slot="kpi">
                        {a.documenti}
                      </dd>
                    </div>
                  </dl>
                  {/* La cosa da fare, in chiaro: è l'informazione che fa aprire
                      la card, e prima non c'era da nessuna parte. */}
                  <p className="mt-3 truncate text-[12px] text-muted-foreground" title={prossima ?? undefined}>
                    {prossima ? (
                      <>
                        <span className="font-medium text-warning">Da fare</span> · {prossima}
                      </>
                    ) : (
                      <>
                        <span className="font-medium text-success">In pari</span> · nessun percorso in sospeso
                      </>
                    )}
                  </p>
                </CardContent>
                {/* Una casella di stato per percorso, non un bottone: piena =
                    documento consegnato, contorno = avviato, tratteggio = da avviare.
                    Il colore è quello dell'AREA, lo stesso ovunque, e siccome il
                    registro è ordinato per area le caselle si raggruppano da sole.

                    ⚠️ Righe che vanno a capo, non `grid-cols-5`. Il numero fisso è
                    lo stesso difetto che aveva già mandato Fornitore e SoA fuori dal
                    bordo quando i moduli passarono da due a cinque: con undici, una
                    griglia a cinque colonne o taglia o schiaccia. Celle di larghezza
                    fissa che vanno a capo reggono qualunque numero, e l'etichetta
                    resta leggibile invece di sparire.

                    ⚠️ QUATTRO per riga, non cinque, e la ragione si vede solo guardando:
                    con cinque, undici moduli fanno 5+5+1 e l'ultima casella resta orfana
                    su una riga sua — «Segnalazioni», che e' anche l'etichetta piu' lunga.
                    Con quattro fanno 4+4+3, e ogni casella guadagna un quarto di
                    larghezza: le due etichette che si troncavano ci stanno. Non e' un
                    numero da indovinare a ogni modulo aggiunto — con dodici sarebbe
                    4+4+4 — ma va riguardato, e i collaudi funzionali non lo dicono. */}
                {/* `data-percorsi` e `data-modulo` sono gli ancoraggi dei collaudi.
                    Il nome accessibile della casella NON e' il nome del modulo: e'
                    «Fornitore: da avviare», perche' dichiara anche lo stato. Cercarla
                    per nome secco non trova niente, e i nomi cambiano quando cambia la
                    disposizione. La chiave del registro no. */}
                <CardFooter data-percorsi="" className="relative z-20 flex flex-wrap gap-1 p-2">
                  {MODULI_AZIENDA.map((m) => {
                    const st = moduli.find((x) => x.modulo === m.href)?.stato ?? "non-avviato";
                    return (
                      <Link
                        key={m.href}
                        href={`/aziende/${a.id}/${m.href}`}
                        data-modulo={m.href}
                        aria-label={`${m.nome}: ${
                          st === "pubblicato" ? "documento pubblicato" : st === "in-corso" ? "in corso" : "da avviare"
                        }`}
                        className="flex w-[calc(25%-0.2rem)] min-w-0 flex-col items-center gap-1 rounded-md px-1 py-1.5 text-center transition-colors hover:bg-accent"
                      >
                        <span
                          className={
                            "flex size-7 items-center justify-center rounded-md border transition-colors " +
                            (st === "pubblicato"
                              ? `border-transparent ${m.colore.pieno}`
                              : st === "in-corso"
                                ? m.colore.tenue
                                : "border-dashed border-border text-muted-foreground/60")
                          }
                        >
                          <m.icona className="size-3.5" strokeWidth={2} />
                        </span>
                        <span
                          className={
                            "w-full truncate text-[10px] font-medium leading-none " +
                            (st === "non-avviato" ? "text-muted-foreground/60" : "text-foreground")
                          }
                        >
                          {m.etichetta}
                        </span>
                      </Link>
                    );
                  })}
                </CardFooter>
              </Card>
            );
          })}

          {/* Cella fantasma: l'azione principale della pagina, oggi solo in alto
              a destra, e il limite del piano detto dove serve saperlo. */}
          {!usage.atLimit && (
            <NuovaAziendaDialog
              atLimit={usage.atLimit}
              limite={usage.limit}
              variante="cella"
              usate={usage.active}
            />
          )}
        </div>
      )}

      <ServiziStudio servizi={stati.servizi} />

      <div className="mt-10 grid gap-8 lg:grid-cols-[1fr_1fr_290px]">
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
                        <span className="block truncate text-[12px] text-muted-foreground">
                          {v.companyNome} · {testoMotivo(v.motivo)}
                        </span>
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
          {daFare.length > 6 && <p className="mt-2 text-[11px] text-muted-foreground">e altri {daFare.length - 6}</p>}
        </section>

        <section aria-label="Documenti pubblicati">
          <div className="flex items-baseline justify-between gap-3">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Documenti pubblicati</h2>
            {quadro.documentiTotali > 0 && (
              <Link href="/documenti" className="tocco-comodo text-[12px] font-medium text-primary hover:underline">
                Archivio
              </Link>
            )}
          </div>
          {quadro.recenti.length === 0 ? (
            <p className="mt-3 text-[13px] leading-relaxed text-muted-foreground">
              Ancora nessuno: completa un percorso e pubblica la prima versione. Il documento pubblicato resta congelato
              per sempre.
            </p>
          ) : (
            <ul className="mt-3 space-y-1">
              {quadro.recenti.map((d) => (
                <li key={d.id}>
                  <a
                    href={`/documento/${d.id}`}
                    target="_blank"
                    rel="noopener"
                    className="group -mx-2 flex items-center gap-2.5 rounded-md px-2 py-2 transition-colors hover:bg-accent"
                  >
                    <FileText
                      className="size-4 shrink-0 text-muted-foreground group-hover:text-accent-foreground"
                      strokeWidth={1.75}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13px] font-medium">
                        {etichettaDocumento(d.tipo, d.anno, true)}
                        <span className="text-muted-foreground"> · v{d.versione}</span>
                      </span>
                      <span className="block truncate text-[12px] text-muted-foreground">{d.companyNome}</span>
                    </span>
                    <ExternalLink className="size-3.5 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                  </a>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section aria-label="Attività recente">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Attività recente</h2>
          {quadro.attivita.length === 0 ? (
            <p className="mt-3 text-[13px] leading-relaxed text-muted-foreground">
              Qui vedrai le ultime operazioni dello studio, passo per passo.
            </p>
          ) : (
            <ol className="mt-3 space-y-3">
              {quadro.attivita.slice(0, 5).map((v, i) => (
                <li key={i} className="flex gap-2.5 text-[13px]">
                  <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-primary/50" aria-hidden />
                  <span className="min-w-0">
                    <span className="block leading-snug">{v.etichetta}</span>
                    <span className="block text-[12px] text-muted-foreground">
                      {[v.companyNome, fmtRelativa(v.quando)].filter(Boolean).join(" · ")}
                    </span>
                  </span>
                </li>
              ))}
            </ol>
          )}
        </section>
      </div>

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
                    <AziendaAzioni companyId={a.id} nome={a.nome} archiviata />
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
