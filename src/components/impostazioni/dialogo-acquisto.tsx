"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Check, CreditCard, Minus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { apriCheckoutAction } from "@/features/billing/actions";
import { PIANI, ESTENSIONI, euro, prezzoDiVendita, prezzoEstensione, type PianoKey, MAX_BLOCCHI_AZIENDE, MAX_ACCESSI_EXTRA } from "@/lib/prezzi";

// La scelta di che cosa si compra, prima di andare a pagare.
//
// Le estensioni esistevano dappertutto — prezzi su Stripe, righe nel checkout, lettura
// nel webhook, somma nei limiti, marchio congelato nello snapshot — tranne in una
// schermata che le vendesse. Erano quattro prodotti costruiti e invendibili: il
// white-label si attivava solo scrivendo a mano nel database.
//
// Il totale si mostra QUI, prima di uscire verso Stripe: chi arriva sulla pagina di
// pagamento e trova un importo che non si aspettava chiude, e non torna.

// I tetti vengono dal listino, non riscritti qui: il server applica gli stessi, e due
// numeri in due posti divergono al primo che cambia.
const MAX_BLOCCHI = MAX_BLOCCHI_AZIENDE;
const MAX_ACCESSI = MAX_ACCESSI_EXTRA;

function Contatore({
  etichetta,
  dettaglio,
  valore,
  imposta,
  massimo,
  prezzo,
}: {
  etichetta: string;
  dettaglio: string;
  valore: number;
  imposta: (n: number) => void;
  massimo: number;
  prezzo: number;
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-lg border p-3">
      <div className="min-w-0">
        <p className="text-sm font-medium">{etichetta}</p>
        <p className="text-[12.5px] leading-relaxed text-muted-foreground">
          {dettaglio} · {euro(prezzo)} l&apos;anno
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-1">
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="size-8"
          aria-label={`Togli: ${etichetta}`}
          disabled={valore === 0}
          onClick={() => imposta(valore - 1)}
        >
          <Minus className="size-3.5" />
        </Button>
        <span className="w-8 text-center text-sm font-medium tabular-nums" aria-live="polite">
          {valore}
        </span>
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="size-8"
          aria-label={`Aggiungi: ${etichetta}`}
          disabled={valore >= massimo}
          onClick={() => imposta(valore + 1)}
        >
          <Plus className="size-3.5" />
        </Button>
      </div>
    </div>
  );
}

export function DialogoAcquisto({
  piano,
  etichetta,
  variante = "default",
}: {
  piano: PianoKey;
  etichetta: string;
  variante?: "default" | "outline";
}) {
  const [aperto, setAperto] = useState(false);
  const [blocchi, setBlocchi] = useState(0);
  const [accessi, setAccessi] = useState(0);
  const [marchio, setMarchio] = useState(false);
  const [inCorso, setInCorso] = useState(false);

  const p = PIANI[piano];
  const anno1 = prezzoDiVendita(p, "anno1")!;
  const rinnovo = prezzoDiVendita(p, "rinnovo")!;
  const pBlocco = prezzoEstensione(ESTENSIONI.bloccoAziende);
  const pAccesso = prezzoEstensione(ESTENSIONI.accesso);
  const pMarchio = prezzoEstensione(ESTENSIONI.whiteLabel);

  // Le estensioni costano uguale il primo anno e al rinnovo: si portano dietro con il
  // prezzo a cui sono state comprate, esattamente come il piano tiene il suo ridotto.
  const estensioni = blocchi * pBlocco.importo + accessi * pAccesso.importo + (marchio ? pMarchio.importo : 0);
  const totaleAnno1 = anno1.importo + estensioni;
  const totaleRinnovo = rinnovo.importo + estensioni;

  async function acquista() {
    setInCorso(true);
    const esito = await apriCheckoutAction({
      piano,
      // Il server conta AZIENDE, non blocchi: il blocco è un'unità di vendita.
      aziendeExtra: blocchi * ESTENSIONI.bloccoAziende.aziende,
      accessiExtra: accessi,
      whiteLabel: marchio,
    });
    if (!esito.ok) {
      setInCorso(false);
      toast.error(esito.errore);
      return;
    }
    // Non si riabilita: la pagina sta per cambiare, e un pulsante di nuovo vivo invita
    // a premerlo due volte, cioè ad aprire due sessioni per lo stesso acquisto.
    window.location.href = esito.dati!.url;
  }

  return (
    <Dialog open={aperto} onOpenChange={setAperto}>
      <DialogTrigger asChild>
        <Button variant={variante} size="sm" className="w-full">
          <CreditCard className="size-3.5" /> {etichetta}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{p.nome}</DialogTitle>
          <DialogDescription>
            {p.aziende + blocchi * ESTENSIONI.bloccoAziende.aziende} aziende ·{" "}
            {p.accessi + accessi} accessi · tutti e cinque i percorsi
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <p className="text-[12px] font-medium uppercase tracking-wider text-muted-foreground">
            Serve altra capacità?
          </p>
          <Contatore
            etichetta={`Blocchi da ${ESTENSIONI.bloccoAziende.aziende} aziende`}
            dettaglio={`+${blocchi * ESTENSIONI.bloccoAziende.aziende} aziende`}
            valore={blocchi}
            imposta={setBlocchi}
            massimo={MAX_BLOCCHI}
            prezzo={pBlocco.importo}
          />
          <Contatore
            etichetta="Accessi aggiuntivi"
            dettaglio="Una persona in più nello studio"
            valore={accessi}
            imposta={setAccessi}
            massimo={MAX_ACCESSI}
            prezzo={pAccesso.importo}
          />
          <button
            type="button"
            onClick={() => setMarchio(!marchio)}
            aria-pressed={marchio}
            className={
              "flex w-full items-center justify-between gap-4 rounded-lg border p-3 text-left transition-colors " +
              (marchio ? "border-primary/50 bg-accent" : "hover:bg-muted/50")
            }
          >
            <span className="min-w-0">
              <span className="block text-sm font-medium">Documenti col marchio del tuo studio</span>
              <span className="block text-[12.5px] leading-relaxed text-muted-foreground">
                I documenti escono col tuo nome · {euro(pMarchio.importo)} l&apos;anno
              </span>
            </span>
            <span
              className={
                "flex size-5 shrink-0 items-center justify-center rounded border " +
                (marchio ? "border-primary bg-primary text-primary-foreground" : "border-input")
              }
            >
              {marchio && <Check className="size-3.5" />}
            </span>
          </button>
        </div>

        <div className="rounded-lg border bg-muted/40 p-3">
          <p className="flex items-baseline justify-between gap-3">
            <span className="text-sm">Primo anno</span>
            <span className="flex items-baseline gap-2">
              {anno1.listino !== undefined && estensioni === 0 && (
                <span className="text-[12.5px] text-muted-foreground line-through tabular-nums">
                  {euro(anno1.listino)}
                </span>
              )}
              <span className="text-lg font-semibold tabular-nums">{euro(totaleAnno1)}</span>
            </span>
          </p>
          <p className="mt-1 flex items-baseline justify-between gap-3 text-[12.5px] text-muted-foreground">
            <span>Poi ogni anno, rinnovo automatico</span>
            <span className="tabular-nums">{euro(totaleRinnovo)}</span>
          </p>
          <p className="mt-2 border-t pt-2 text-[12px] leading-relaxed text-muted-foreground">
            IVA esclusa. Il rinnovo si disdice fino al giorno prima della scadenza.
          </p>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setAperto(false)} disabled={inCorso}>
            Annulla
          </Button>
          <Button onClick={acquista} disabled={inCorso}>
            {inCorso ? "Apro il pagamento…" : `Paga ${euro(totaleAnno1)}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
