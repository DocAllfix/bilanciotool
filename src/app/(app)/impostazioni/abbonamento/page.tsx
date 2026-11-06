import Link from "next/link";
import { requireActiveOrg } from "@/features/auth/guards";
import { getQuadroAbbonamento } from "@/features/studio/queries";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { DialogoAcquisto } from "@/components/impostazioni/dialogo-acquisto";
import { PulsantePortale } from "@/components/impostazioni/pulsante-portale";
import { ComandiAbbonamento } from "@/components/impostazioni/comandi-abbonamento";
import { InterruttorePeriodo, PeriodoProvider, PrezzoFascia } from "@/components/prezzi/periodo";
import { PIANI, aziendeTesto, fasceVendibili, type Periodo } from "@/lib/prezzi";
import { TITOLARE } from "@/lib/legale";
import { fmtDataEstesa } from "@/lib/format";
import { bloccoAlCheckout } from "@/features/billing/gia-abbonato";

export const dynamic = "force-dynamic";

const data = (d: Date | null) => (d ? fmtDataEstesa(d) : "—");

const ETICHETTA_STATO = {
  demo: { testo: "Demo", variante: "secondary" as const },
  active: { testo: "Attivo", variante: "default" as const },
  past_due: { testo: "Pagamento sospeso", variante: "destructive" as const },
  expired: { testo: "Scaduto", variante: "destructive" as const },
};

function Capacita({ etichetta, usati, totali }: { etichetta: string; usati: number; totali: number }) {
  const pct = totali > 0 ? Math.min(100, Math.round((usati / totali) * 100)) : 0;
  return (
    <div>
      <div className="flex items-baseline justify-between text-sm">
        <span className="text-muted-foreground">{etichetta}</span>
        <span className="tabular-nums">
          <span className="font-medium text-foreground">{usati}</span> di {totali}
        </span>
      </div>
      <Progress value={pct} className="mt-2 h-1.5" />
    </div>
  );
}

/** «Attivo dal … · si rinnova ogni mese, il prossimo il …», detto com'è davvero. */
function rigaStato(a: Awaited<ReturnType<typeof getQuadroAbbonamento>>): string {
  if (!a.piano) {
    return "Stai usando la demo: puoi lavorare sull'azienda d'esempio, ma non creare le tue né pubblicare documenti.";
  }
  const dal = `Attivo dal ${data(a.attivatoIl)}`;
  if (!a.rinnovoIl) return dal;
  if (a.disdettaAFinePeriodo) return `${dal} · disdetto: resta attivo fino al ${data(a.rinnovoIl)}, poi non si rinnova`;
  const come = a.periodo === "mese" ? "si rinnova ogni mese" : a.periodo === "anno" ? "si rinnova ogni anno" : "si rinnova";
  return `${dal} · ${come}, il prossimo il ${data(a.rinnovoIl)}`;
}

export default async function AbbonamentoPage({
  searchParams,
}: {
  searchParams: Promise<{ fascia?: string; periodo?: string }>;
}) {
  const s = await requireActiveOrg();
  // La fascia e il periodo scelti sulla vetrina (`/attiva/<fascia>`) arrivano fin qui. Si
  // validano contro il listino: un valore inventato nell'indirizzo non deve aprire niente.
  const { fascia, periodo: periodoUrl } = await searchParams;
  const scelta = fasceVendibili().find((k) => k === fascia) ?? null;
  const periodoIniziale: Periodo = periodoUrl === "mese" ? "mese" : "anno";
  const a = await getQuadroAbbonamento(s.userId, s.orgId);
  const stato = ETICHETTA_STATO[a.status];
  // La stessa funzione che decide lato server se il checkout puo' partire: qui decide se
  // ha senso mostrarlo. Una domanda, una risposta.
  const blocco = await bloccoAlCheckout(s.userId, s.orgId);
  // Chi puo' gestire l'abbonamento: la stessa domanda che si fanno le server action.
  const amministra = s.role === "owner" || s.role === "admin";

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-medium">{a.nomePiano ?? "Nessun piano attivo"}</h2>
              <p className="mt-1 text-sm text-muted-foreground" data-stato-abbonamento>
                {rigaStato(a)}
              </p>
            </div>
            <Badge variant={a.disdettaAFinePeriodo ? "secondary" : stato.variante} className="shrink-0">
              {a.disdettaAFinePeriodo && a.status === "active" ? "Disdetto" : stato.testo}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          <Capacita etichetta="Aziende attive" usati={a.aziendeUsate} totali={a.aziendeTotali} />
          <Capacita etichetta="Accessi" usati={a.accessiUsati} totali={a.accessiTotali} />

          {(a.aziendeExtra > 0 || a.accessiExtra > 0) && (
            <ul className="border-t pt-4 text-sm text-muted-foreground">
              {a.aziendeExtra > 0 && <li>+{a.aziendeExtra} aziende oltre il piano</li>}
              {a.accessiExtra > 0 && <li>+{a.accessiExtra} accessi oltre il piano</li>}
            </ul>
          )}

          {a.rimborsabile && (
            <p className="rounded-lg border border-border bg-muted/40 p-3 text-[13px] leading-relaxed">
              <b>Puoi ancora ripensarci.</b> Non hai pubblicato nessun documento e non sono passati quattordici
              giorni dall&apos;attivazione: hai diritto al rimborso integrale. Scrivi a{" "}
              <a href={`mailto:${TITOLARE.email}`} className="font-medium text-primary hover:underline">
                {TITOLARE.email}
              </a>
              .
            </p>
          )}
        </CardContent>
      </Card>

      {/* La condizione è la STESSA che applica il server (`bloccoAlCheckout`), non una
          seconda regola scritta a mano: alla disdetta `piano` resta valorizzato, e con
          `!a.piano` uno studio SCADUTO non avrebbe più modo di riabbonarsi. */}
      {!blocco && (
        <PeriodoProvider iniziale={periodoIniziale}>
          <Card>
            <CardHeader>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="font-medium">I piani</h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Annuale o mensile, sempre allo stesso prezzo. Tutti i percorsi sono compresi.
                  </p>
                </div>
                <InterruttorePeriodo />
              </div>
            </CardHeader>
            <CardContent>
              <ul className="grid gap-3 md:grid-cols-3">
                {fasceVendibili().map((k) => {
                  const p = PIANI[k];
                  return (
                    // ⚠️ `flex h-full flex-col` e il comando spinto in fondo: le descrizioni
                    // non vanno a capo tutte allo stesso modo, e senza questo i pulsanti si
                    // disallineano — si vede solo guardando.
                    <li
                      key={k}
                      className={
                        "flex h-full flex-col rounded-lg border p-4 " +
                        (scelta === k ? "border-primary/60 ring-1 ring-primary/20" : "")
                      }
                      data-fascia={k}
                    >
                      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">
                        {p.pubblico === "azienda" ? "Per la tua azienda" : "Per i consulenti"}
                      </p>
                      <p className="mt-1 font-medium">{p.nome}</p>
                      <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">{p.descrizione}</p>
                      <div className="mt-3">
                        <PrezzoFascia piano={k} compatto />
                      </div>
                      <ul className="mt-3 space-y-1 text-[13px] text-muted-foreground">
                        <li>{p.usoInterno ? "1 azienda, la tua" : aziendeTesto(p.aziende)}</li>
                        <li>{p.accessi} accessi</li>
                        {p.usoInterno && <li>Percorsi assegnati a ciascun collega</li>}
                      </ul>
                      <div className="mt-auto space-y-2 pt-4">
                        <DialogoAcquisto piano={k} etichetta="Attiva" apriSubito={scelta === k} />
                        {a.piano === k && (
                          <p className="text-center text-[12px] text-muted-foreground">Il tuo piano precedente</p>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>

              <p className="mt-5 border-t pt-4 text-[13px] text-muted-foreground">
                Oltre 30 aziende, gruppi e reti: {PIANI.enterprise.nome}, con condizioni su misura.{" "}
                <Link href="/prezzi#enterprise" className="font-medium text-primary hover:underline">
                  Contattaci
                </Link>
                .
              </p>

              <div className="mt-6 rounded-lg border border-primary/30 bg-accent p-4">
                <p className="text-sm font-medium text-accent-foreground">Preferisci il bonifico?</p>
                <p className="mt-1 text-[13px] leading-relaxed text-accent-foreground/90">
                  I pulsanti qui sopra portano al pagamento con carta e attivano l&apos;account subito. Se ti serve
                  invece una fattura da pagare a bonifico, o condizioni particolari, scrivi a{" "}
                  <a href={`mailto:${TITOLARE.email}?subject=Attivazione%20EvalisDeck`} className="font-medium underline">
                    {TITOLARE.email}
                  </a>{" "}
                  indicando il piano.
                </p>
              </div>
            </CardContent>
          </Card>
        </PeriodoProvider>
      )}

      {/* Chi ha già un piano: come si paga, come si disdice, dove sono le fatture. */}
      {a.piano && (
        <Card>
          <CardHeader>
            <h2 className="font-medium">Il tuo abbonamento</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Gli accessi per le persone che lavorano con te e i documenti col tuo marchio sono{" "}
              <strong className="font-medium text-foreground">compresi</strong> nel piano: non si comprano a parte.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* ⚠️ I comandi si mostrano SOLO a chi li può usare e SOLO dove Stripe li accetta.
                Gli abbonamenti del listino precedente hanno uno Schedule a due fasi, e
                Stripe rifiuta di cambiarli direttamente: per loro resta l'email. Il divieto
                comunque sta sul server (`gestione.ts`): questa è presentazione. */}
            {amministra && a.gestibileDaQui && a.status !== "expired" && (
              <ComandiAbbonamento
                piano={a.piano}
                periodo={a.periodo}
                disdetto={a.disdettaAFinePeriodo}
                scadenza={a.rinnovoIl ? data(a.rinnovoIl) : null}
              />
            )}

            <div className="flex flex-wrap items-center gap-3 border-t pt-4">
              {amministra ? (
                <>
                  <PulsantePortale />
                  <p className="text-[12.5px] text-muted-foreground">
                    Ricevute, fatture, carta e dati fiscali. Le emette Stripe a ogni pagamento.
                  </p>
                </>
              ) : (
                <p className="text-[12.5px] leading-relaxed text-muted-foreground">
                  Le fatture, il metodo di pagamento e la disdetta li gestisce chi amministra l&apos;account.
                </p>
              )}
            </div>

            <div className="rounded-lg border border-primary/30 bg-accent p-4 text-[13px] leading-relaxed text-accent-foreground">
              <p>
                {a.gestibileDaQui
                  ? "Per cambiare piano scrivi a "
                  : "Per cambiare piano o disdire il rinnovo scrivi a "}
                <a
                  href={`mailto:${TITOLARE.email}?subject=Abbonamento%20EvalisDeck%20-%20${encodeURIComponent(a.nomePiano ?? "")}`}
                  className="font-medium underline"
                >
                  {TITOLARE.email}
                </a>
                . Rispondiamo entro un giorno lavorativo.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {a.status === "past_due" && (
        <Card>
          <CardHeader>
            <h2 className="font-medium">Il rinnovo non è andato a buon fine</h2>
          </CardHeader>
          <CardContent className="text-sm leading-relaxed text-muted-foreground">
            Il servizio resta attivo, ma va sistemato il metodo di pagamento da «Fatture e metodo di pagamento». Se
            serve, scrivici a{" "}
            <a href={`mailto:${TITOLARE.email}`} className="font-medium text-primary hover:underline">
              {TITOLARE.email}
            </a>{" "}
            e lo risolviamo insieme.
          </CardContent>
        </Card>
      )}

      <p className="text-[13px] text-muted-foreground">
        Condizioni, rinnovo e rimborsi sono nei <Link href="/termini" className="text-primary hover:underline">termini
        e condizioni</Link>.
      </p>
    </div>
  );
}
