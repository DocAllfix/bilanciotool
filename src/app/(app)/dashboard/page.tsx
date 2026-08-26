import type { Metadata } from "next";
import Link from "next/link";
import { requireConsultant } from "@/features/auth/guards";
import { getCompanyUsage } from "@/features/entitlement";
import { getPortfolioOverview, listCompaniesWithStats } from "@/features/companies/queries";
import { getScadenzario, testoMotivo } from "@/features/companies/scadenzario";
import { getStatiPortafoglio } from "@/features/companies/stati-moduli";
import { MODULI_AZIENDA, MODULI_PER_AREA } from "@/features/companies/moduli";
import { conteggioDaFare, oggiIso } from "@/features/agenda";
import { elencaCompensi } from "@/features/compensi";
import { euro, riepilogo as riepilogoCompensi } from "@/lib/calc/compensi/importi";
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
  const [aziende, usage, quadro, scadenzario, stati, agendaOggi, compensi] = await withTenant(
    { userId: s.userId, orgId: s.orgId },
    () =>
      Promise.all([
        listCompaniesWithStats(s.userId, s.orgId),
        getCompanyUsage(s.userId, s.orgId),
        getPortfolioOverview(s.userId, s.orgId),
        getScadenzario(s.userId, s.orgId),
        getStatiPortafoglio(s.userId, s.orgId),
        // L'agenda dello studio, dentro la stessa transazione delle altre letture.
        conteggioDaFare(s.userId, s.orgId, oggiIso()),
        elencaCompensi(s.userId, s.orgId),
      ]),
  );
  // L'andamento economico dello studio: si calcola dalle righe, mai persistito.
  const soldi = riepilogoCompensi(compensi, oggiIso());
  const attive = aziende.filter((a) => a.stato === "active");
  const archiviate = aziende.filter((a) => a.stato === "archived");
  // Solo le voci che chiedono un'azione, e non l'elenco completo dei
  // «mai avviato»: un promemoria per ogni modulo mai toccato di ogni azienda
  // sarebbe rumore, non lavoro.
  const daFare = scadenzario.filter((v) => v.motivo !== "mai-avviato");

  // ⚠️ LA DIMOSTRATIVA SI MOSTRA, MA NON SI CONTA.
  //
  // Lo scadenzario misura «cosa e' indietro», e i percorsi dell'azienda d'esempio lo
  // sono davvero: hanno esercizi mai pubblicati. Tecnicamente il numero era corretto, e
  // proprio per questo ingannava — un conto nuovo apriva il portafoglio e leggeva DODICI
  // lavori in ritardo il primo giorno, tutti nostri.
  //
  // E non era un fastidio del primo giorno. Lo scadenzario ordinava gia' la dimostrativa
  // per ultima (`scadenzario.ts`), segno che qualcuno si era accorto che pesava: ma
  // metterla in fondo non la toglie dal totale. Quei dodici restano finche' lo studio non
  // la archivia, e un consulente con otto clienti veri leggerebbe «26 da riprendere» di
  // cui dodici non suoi. Il numero che dovrebbe guidargli la mattina diventa quello di
  // cui diffidare.
  //
  // C'e' gia' un precedente esplicito: i limiti del piano ESCLUDONO la dimostrativa. La
  // stessa azienda non puo' essere fuori da un conteggio e dentro un altro.
  const daFareVeri = daFare.filter((v) => !v.isDemo);
  const daFareDemo = daFare.filter((v) => v.isDemo);
  const statiPerAzienda = new Map(stati.aziende.map((a) => [a.id, a.moduli]));
  // La prima cosa da fare per ciascuna azienda, per la riga sotto i numeri.
  const prossimaPerAzienda = new Map<string, string>();
  for (const v of daFare) {
    if (!prossimaPerAzienda.has(v.companyId)) {
      const m = MODULI_AZIENDA.find((x) => x.href === v.modulo)!;
      prossimaPerAzienda.set(v.companyId, `${m.nome}${v.anno ? ` ${v.anno}` : ""}: ${testoMotivo(v.motivo)}`);
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
            {daFareVeri.length}
          </dd>
          <dt className="text-[13px] text-muted-foreground">
            {daFareVeri.length === 1 ? "percorso da riprendere" : "percorsi da riprendere"}
          </dt>
        </div>
        {/* ⚠️ L'AGENDA ACCANTO ai percorsi da riprendere, e con parole diverse. Sono
            due elenchi che si somigliano abbastanza da confondersi: quello sopra lo
            calcola il prodotto e si chiude lavorandoci, questo lo scrive lo studio e si
            spunta. Metterli vicini con la stessa etichetta li avrebbe fusi nella testa
            di chi legge; metterli vicini con etichette diverse è ciò che li distingue. */}
        <div className="flex items-baseline gap-2">
          <dd className="text-xl font-semibold tracking-tight" data-slot="kpi" data-agenda-oggi={agendaOggi}>
            {agendaOggi}
          </dd>
          <dt className="text-[13px] text-muted-foreground">
            {agendaOggi === 1 ? "voce in agenda" : "voci in agenda"} per oggi
            {agendaOggi > 0 && (
              <>
                {" · "}
                <Link className="font-medium underline underline-offset-4" href="/agenda">
                  apri
                </Link>
              </>
            )}
          </dt>
        </div>
        {/* L'andamento economico. Compare solo se c'e' qualcosa da incassare: uno
            studio che non ha ancora registrato un compenso non ha bisogno di vedersi
            dire «0,00 €», che si legge come un rimprovero. */}
        {soldi.daIncassare > 0 && (
          <div className="flex items-baseline gap-2">
            <dd className="text-xl font-semibold tracking-tight" data-slot="kpi" data-da-incassare={soldi.daIncassare}>
              {euro(soldi.daIncassare)} €
            </dd>
            <dt className="text-[13px] text-muted-foreground">
              da incassare{" · "}
              <Link className="font-medium underline underline-offset-4" href="/compensi">
                apri
              </Link>
            </dt>
          </div>
        )}
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
                {/* Una casella per GRUPPO, non per percorso, e con dentro il rapporto
                    «avviati su totale»: pieno = almeno un documento consegnato,
                    contorno = lavoro aperto, tratteggio = niente.

                    ⚠️ Qui c'era una casella per modulo, e la storia di questa riga e'
                    la storia del difetto che torna. Con due moduli andava; a cinque gli
                    ultimi due finirono fuori dal bordo; a undici, cinque per riga davano
                    5+5+1 con l'ultima orfana, e si passo' a quattro per riga. Ogni volta
                    la risposta era «cambiamo il numero di colonne», che rimanda il
                    problema al modulo dopo. Con tre gruppi il numero smette di essere
                    una cosa da indovinare, e la card regge un dodicesimo percorso senza
                    cambiare una riga — perche' il percorso entra in un gruppo che
                    esiste gia'.

                    ⚠️ E si perde qualcosa, detto invece che taciuto: dalla card non si
                    salta piu' dentro un singolo percorso. Il salto e' di un clic piu'
                    lungo, e passa dal fascicolo — che e' il posto dove i percorsi di
                    un'azienda stanno tutti, con stato, esercizio e ultima versione. */}
                {/* `data-percorsi` e `data-gruppo` sono gli ancoraggi dei collaudi. Il
                    nome accessibile NON e' quello che si legge: a schermo c'e' «2/4»,
                    che a un lettore di schermo arriverebbe come «due barra quattro». */}
                <CardFooter data-percorsi="" className="relative z-20 flex gap-1 p-2">
                  {MODULI_PER_AREA.map((g) => {
                    const stati = g.moduli.map(
                      (m) => moduli.find((x) => x.modulo === m.href)?.stato ?? "non-avviato",
                    );
                    const avviati = stati.filter((s) => s !== "non-avviato").length;
                    const pubblicati = stati.filter((s) => s === "pubblicato").length;
                    return (
                      <Link
                        key={g.area}
                        // Al FASCICOLO, ancorato al gruppo: la card non ha piu' un
                        // collegamento per percorso, e il posto dove i percorsi si
                        // aprono uno per uno e' il fascicolo. L'ancora ci porta gia'
                        // in mezzo, invece che in cima a una pagina da scorrere.
                        href={`/aziende/${a.id}#gruppo-${g.area}`}
                        data-gruppo={g.area}
                        // ⚠️ Il nome accessibile dice i NUMERI, non solo il gruppo: a
                        // schermo il rapporto si legge, a un lettore di schermo «2/4»
                        // arriverebbe come «due barra quattro».
                        aria-label={`${g.nome}: ${avviati} percorsi avviati su ${g.moduli.length}${
                          pubblicati > 0
                            ? `, ${pubblicati} con documento pubblicato`
                            : ", nessun documento pubblicato"
                        }`}
                        className="flex w-[calc(33.333%-0.17rem)] min-w-0 flex-col items-center gap-1 rounded-md px-1 py-1.5 text-center transition-colors hover:bg-accent"
                      >
                        {/* Il rapporto al posto dell'icona. Con undici percorsi la
                            casella per modulo era un pittogramma di 14px con
                            un'etichetta di 10: dodici di quelli, per ogni azienda del
                            portafoglio, sono il muro che il committente ha chiesto di
                            smontare. Tre numeri si leggono da lontano e dicono di piu'. */}
                        <span
                          className={
                            "flex h-7 min-w-9 items-center justify-center rounded-md border px-1.5 font-mono text-[11px] font-semibold tabular-nums transition-colors " +
                            (pubblicati > 0
                              ? `border-transparent ${g.colore.pieno}`
                              : avviati > 0
                                ? g.colore.tenue
                                : "border-dashed border-border text-muted-foreground/60")
                          }
                        >
                          {avviati}/{g.moduli.length}
                        </span>
                        <span
                          className={
                            "w-full truncate text-[10px] font-medium leading-none " +
                            (avviati === 0 ? "text-muted-foreground/60" : "text-foreground")
                          }
                        >
                          {g.breve}
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
          {daFareVeri.length === 0 ? (
            <p className="mt-3 text-[13px] leading-relaxed text-muted-foreground">
              {daFareDemo.length
                ? "Niente in sospeso sulle tue aziende."
                : "Niente in sospeso: ogni percorso avviato è stato pubblicato."}
            </p>
          ) : (
            <ul className="mt-3 space-y-1">
              {daFareVeri.slice(0, 6).map((v) => {
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
                        {/* ⚠️ Va a capo, non tronca: il nome del modulo e' lo stesso
                            che compare nel fascicolo e nella barra laterale, e due dei
                            dodici sono lunghi. Una lista che va a capo su due voci non e'
                            un problema — sotto c'e' spazio bianco — mentre un nome corto
                            e DIVERSO da quello del resto del prodotto lo era. */}
                        <span className="block text-[13px] font-medium leading-snug">
                          {m.nome}
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
          {daFareVeri.length > 6 && (
            <p className="mt-2 text-[11px] text-muted-foreground">e altri {daFareVeri.length - 6}</p>
          )}

          {/* ⚠️ La dimostrativa si mostra SOTTO, e dichiarata. Toglierla del tutto
              avrebbe risolto il numero e perso il senso: quei percorsi esistono per far
              vedere il prodotto pieno a chi si e' appena registrato. Il difetto non era
              mostrarli, era CONTARLI come lavoro proprio. */}
          {daFareDemo.length > 0 && (
            <div className="mt-5 border-t pt-4" data-demo-scadenzario>
              <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                Nell&apos;azienda dimostrativa
              </p>
              <ul className="mt-2 space-y-1">
                {daFareDemo.slice(0, 3).map((v) => {
                  const m = MODULI_AZIENDA.find((x) => x.href === v.modulo)!;
                  return (
                    <li key={`demo-${v.companyId}-${v.modulo}`}>
                      <Link
                        href={v.href}
                        className="group -mx-2 flex items-start gap-2.5 rounded-md px-2 py-1.5 transition-colors hover:bg-accent"
                      >
                        <m.icona
                          className="mt-0.5 size-3.5 shrink-0 text-muted-foreground"
                          strokeWidth={1.75}
                        />
                        <span className="min-w-0 flex-1 text-[12px] leading-snug">
                          {m.nome}
                          {v.anno !== null && <span className="text-muted-foreground"> · {v.anno}</span>}
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
              {daFareDemo.length > 3 && (
                <p className="mt-1.5 text-[11px] text-muted-foreground">
                  e altri {daFareDemo.length - 3} percorsi da esplorare
                </p>
              )}
            </div>
          )}
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
