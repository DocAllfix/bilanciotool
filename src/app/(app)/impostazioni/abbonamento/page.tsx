import Link from "next/link";
import { requireActiveOrg } from "@/features/auth/guards";
import { getQuadroAbbonamento } from "@/features/studio/queries";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { DialogoAcquisto } from "@/components/impostazioni/dialogo-acquisto";
import { PulsantePortale } from "@/components/impostazioni/pulsante-portale";
import {
  PIANI, ESTENSIONI, CHIAVI_PIANO, euro,
  prezzoDiVendita, prezzoEstensione, lancioAttivo, FINE_LANCIO,
} from "@/lib/prezzi";
import { TITOLARE } from "@/lib/legale";
import { bloccoAlCheckout } from "@/features/billing/gia-abbonato";

export const dynamic = "force-dynamic";

const data = (d: Date | null) =>
  d ? d.toLocaleDateString("it-IT", { day: "numeric", month: "long", year: "numeric" }) : "—";

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

export default async function AbbonamentoPage() {
  const s = await requireActiveOrg();
  const a = await getQuadroAbbonamento(s.userId, s.orgId);
  const stato = ETICHETTA_STATO[a.status];
  // La stessa funzione che decide lato server se il checkout puo' partire: qui decide se
  // ha senso mostrarlo. Una domanda, una risposta.
  const blocco = await bloccoAlCheckout(s.userId, s.orgId);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-medium">{a.nomePiano ?? "Nessun piano attivo"}</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {a.piano
                  ? `Attivo dal ${data(a.attivatoIl)}${a.rinnovoIl ? ` · si rinnova il ${data(a.rinnovoIl)}` : ""}`
                  : "Stai usando la demo: puoi lavorare sull'azienda d'esempio, ma non creare le tue né pubblicare documenti."}
              </p>
            </div>
            <Badge variant={stato.variante} className="shrink-0">
              {stato.testo}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          <Capacita etichetta="Aziende attive" usati={a.aziendeUsate} totali={a.aziendeTotali} />
          <Capacita etichetta="Accessi" usati={a.accessiUsati} totali={a.accessiTotali} />

          {(a.aziendeExtra > 0 || a.accessiExtra > 0 || a.whiteLabel) && (
            <ul className="border-t pt-4 text-sm text-muted-foreground">
              {a.aziendeExtra > 0 && <li>+{a.aziendeExtra} aziende oltre il piano</li>}
              {a.accessiExtra > 0 && <li>+{a.accessiExtra} accessi oltre il piano</li>}
              {a.whiteLabel && <li>Documenti col marchio del tuo studio</li>}
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

      {/* Il listino si vede SOLO qui dentro, mai sul sito pubblico: decisione del
          committente. Chi non ha ancora un piano deve capire cosa comprerebbe.

          La condizione e' la STESSA che applica il server (`bloccoAlCheckout`), non una
          seconda regola scritta a mano. Prima era `!a.piano`, e sembrava equivalente:
          non lo era. Alla disdetta `piano` resta valorizzato — `applicaAbbonamento` lo
          riscrive solo quando l'abbonamento ne contiene uno, e non lo azzera mai — quindi
          uno studio SCADUTO non vedeva piu' la scheda e non aveva alcun modo di
          riabbonarsi. Una porta chiusa dalla parte sbagliata.

          Interfaccia e server che rispondono alla stessa domanda con due condizioni
          diverse e' il modo in cui nascono sia i doppi acquisti sia i vicoli ciechi. */}
      {!blocco && (
        <Card>
          <CardHeader>
            <h2 className="font-medium">I piani</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Il primo anno comprende l&apos;avviamento. Dal secondo si rinnova da solo, a prezzo ridotto.
            </p>
            {/* La scadenza sta scritta accanto al prezzo, non in fondo in piccolo: uno
                sconto senza termine dichiarato e' un barrato che dopo sei mesi nessuno
                crede piu', e la pubblicita' ingannevole e' vietata anche fra imprese. */}
            {lancioAttivo() && (
              <p className="mt-2 inline-flex rounded-full bg-primary/10 px-3 py-1 text-[12.5px] font-medium text-primary">
                Prezzi di lancio, validi fino al{" "}
                {FINE_LANCIO.toLocaleDateString("it-IT", { day: "numeric", month: "long", year: "numeric" })}
              </p>
            )}
          </CardHeader>
          <CardContent>
            <ul className="grid gap-3 sm:grid-cols-3">
              {CHIAVI_PIANO.filter((k) => !PIANI[k].trattativa).map((k) => {
                const p = PIANI[k];
                // Prezzo mostrato e prezzo addebitato escono dalla STESSA funzione:
                // e' l'unico modo perche' non possano divergere il giorno della scadenza.
                const anno1 = prezzoDiVendita(p, "anno1")!;
                const rinnovo = prezzoDiVendita(p, "rinnovo")!;
                return (
                  <li key={k} className="rounded-lg border p-4">
                    <p className="font-medium">{p.nome}</p>
                    <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">{p.descrizione}</p>
                    <p className="mt-3 flex flex-wrap items-baseline gap-2">
                      {anno1.listino !== undefined && (
                        <span className="text-[13px] text-muted-foreground line-through tabular-nums">
                          {euro(anno1.listino)}
                        </span>
                      )}
                      <span className="text-lg font-semibold tabular-nums">{euro(anno1.importo)}</span>
                    </p>
                    <p className="text-[12.5px] text-muted-foreground">
                      primo anno, poi{" "}
                      {rinnovo.listino !== undefined && (
                        <span className="line-through">{euro(rinnovo.listino)}</span>
                      )}{" "}
                      {euro(rinnovo.importo)}{" "}l&apos;anno
                    </p>
                    <ul className="mt-3 space-y-1 text-[13px] text-muted-foreground">
                      <li>{p.aziende} aziende</li>
                      <li>{p.accessi} accessi</li>
                    </ul>
                    {/* Se questa scheda si rende, NIENTE e' attivo: il blocco esterno lo
                        garantisce. Qui c'era un ramo «Il tuo piano» e uno «Passa a questo»,
                        entrambi irraggiungibili — la scheda non si rendeva mai a chi aveva
                        un piano. Codice morto che pero' RACCONTAVA una funzione che non
                        esiste: il cambio piano da qui non e' mai stato possibile, e non
                        deve esserlo (aprirebbe un secondo abbonamento invece di cambiare
                        il primo, che e' esattamente la ragione per cui nel portale
                        `subscription_update` e' spento).

                        Resta la nota per chi si riabbona dopo una disdetta: sapere quale
                        piano aveva prima gli evita di doverlo ricordare. */}
                    <div className="mt-4 space-y-2">
                      <DialogoAcquisto piano={p.key} etichetta="Attiva" variante="default" />
                      {a.piano === p.key && (
                        <p className="text-center text-[12px] text-muted-foreground">
                          Il tuo piano precedente
                        </p>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>

            <div className="mt-5 space-y-1 border-t pt-4 text-[13px] text-muted-foreground">
              {/* Le estensioni si scelgono dentro il dialogo, insieme al piano: qui
                  basta dire che ci sono, con quanto costano. Ripetere il listino in
                  due posti significa aggiornarne uno solo, prima o poi. */}
              <p>
                Gli accessi per il tuo studio e i documenti col tuo marchio sono compresi in ogni
                fascia. Servono più aziende? Si aggiungono al piano nella stessa schermata di
                pagamento, {euro(prezzoEstensione(ESTENSIONI.bloccoAziende).importo)}{" "}l&apos;anno
                ogni {ESTENSIONI.bloccoAziende.aziende}.
              </p>
              <p>Per reti e gruppi, {PIANI.enterprise.nome}: condizioni su misura.</p>
            </div>

            {/*
              Qui c'era «il pagamento con carta direttamente da qui arriva a breve»: un
              residuo di prima che Stripe fosse in piedi. Diceva a chi stava per comprare
              che il pulsante sopra non funzionava — mentre funziona e porta al pagamento.
              Il canale scritto resta per chi preferisce il bonifico o deve concordare.
            */}
            <div className="mt-6 rounded-lg border border-primary/30 bg-accent p-4">
              <p className="text-sm font-medium text-accent-foreground">Preferisci il bonifico?</p>
              <p className="mt-1 text-[13px] leading-relaxed text-accent-foreground/90">
                Il pulsante qui sopra porta al pagamento con carta e attiva lo studio subito. Se ti serve
                invece una fattura da pagare a bonifico, o condizioni particolari, scrivi a{" "}
                <a href={`mailto:${TITOLARE.email}?subject=Attivazione%20EvalisDeck`} className="font-medium underline">
                  {TITOLARE.email}
                </a>{" "}
                indicando il piano.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Chi ha già un piano non vedeva NIENTE: né come aggiungere capacità, né come
          avere le fatture, né come disdire. Trovato dal collaudo in produzione, dove la
          pagina di un cliente attivo risultava senza un solo comando. */}
      {a.piano && (
        <Card>
          <CardHeader>
            <h2 className="font-medium">Aggiungere capacità</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Le estensioni si sommano al piano e seguono la stessa scadenza.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <ul className="grid gap-2 sm:grid-cols-3">
              {[
                [`+${ESTENSIONI.bloccoAziende.aziende} aziende`, prezzoEstensione(ESTENSIONI.bloccoAziende)],
              ].map(([etichetta, p]) => (
                <li key={etichetta as string} className="rounded-lg border p-3">
                  <p className="text-sm font-medium">{etichetta as string}</p>
                  <p className="mt-1 flex flex-wrap items-baseline gap-1.5">
                    {(p as { listino?: number }).listino !== undefined && (
                      <span className="text-[12px] text-muted-foreground line-through tabular-nums">
                        {euro((p as { listino: number }).listino)}
                      </span>
                    )}
                    <span className="text-sm font-semibold tabular-nums">
                      {euro((p as { importo: number }).importo)}
                    </span>
                    <span className="text-[12px] text-muted-foreground">l&apos;anno</span>
                  </p>
                </li>
              ))}
            </ul>
            {/* Fatture e carta se le prende da solo. Il cambio piano e la disdetta no,
                e sta scritto perché non sembri una mancanza: ogni abbonamento porta uno
                Schedule a due fasi, e cambiarlo dal portale lo scavalca. */}
            <div className="flex flex-wrap items-center gap-3 border-t pt-4">
              <PulsantePortale />
              <p className="text-[12.5px] text-muted-foreground">
                Ricevute, fatture, carta e dati fiscali.
              </p>
            </div>

            <div className="rounded-lg border border-primary/30 bg-accent p-4 text-[13px] leading-relaxed text-accent-foreground">
              <p>
                Per aggiungere un&apos;estensione a metà anno, cambiare piano o disdire il rinnovo, scrivi a{" "}
                <a
                  href={`mailto:${TITOLARE.email}?subject=Abbonamento%20EvalisDeck%20-%20${encodeURIComponent(a.nomePiano ?? "")}`}
                  className="font-medium underline"
                >
                  {TITOLARE.email}
                </a>
                . Rispondiamo entro un giorno lavorativo.
              </p>
              <p className="mt-2 text-accent-foreground/80">
                Il rinnovo è annuale e si disdice fino al giorno prima della scadenza
                {a.rinnovoIl ? ` (${data(a.rinnovoIl)})` : ""}.
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
            Il servizio resta attivo, ma va sistemato il metodo di pagamento. Scrivici a{" "}
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
