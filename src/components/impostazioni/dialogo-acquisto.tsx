"use client";

import { useState } from "react";
import { toast } from "sonner";
import { CreditCard } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { apriCheckoutAction } from "@/features/billing/actions";
import { PIANI, euro, aziendeTesto, prezzoDiVendita, type PianoKey, type Periodo } from "@/lib/prezzi";
import { InterruttorePeriodo, PrezzoFascia, usePeriodo } from "@/components/prezzi/periodo";

// La scelta di che cosa si compra, prima di andare a pagare.
//
// Il totale si mostra QUI, prima di uscire verso Stripe: chi arriva sulla pagina di
// pagamento e trova un importo che non si aspettava chiude, e non torna.
//
// ⚠️ Dal 6 novembre 2026 si sceglie solo il PERIODO: blocchi di aziende, accessi e marchio
// non si vendono più (gli accessi e il marchio sono inclusi, e chi cresce passa al piano
// più capiente). Il prezzo è lo stesso a ogni rinnovo.

export function DialogoAcquisto({
  piano,
  etichetta,
  variante = "default",
  apriSubito = false,
  periodoIniziale,
}: {
  piano: PianoKey;
  etichetta: string;
  variante?: "default" | "outline";
  /** Chi arriva da `/attiva/<fascia>` ha già scelto sulla vetrina: il dialogo si apre da
   *  solo su quella fascia. Chiudendolo si toglie la fascia dall'indirizzo, altrimenti
   *  un ricarico — o il tasto indietro dopo essere usciti verso Stripe — lo riaprirebbe
   *  addosso a chi l'aveva appena chiuso. */
  apriSubito?: boolean;
  /** Facoltativo: senza, il periodo è quello scelto nell'interruttore della pagina
   *  (`PeriodoProvider`), letto ogni volta che la finestra si apre. */
  periodoIniziale?: Periodo;
}) {
  const pagina = usePeriodo();
  const [aperto, setAperto] = useState(apriSubito);
  const [periodo, setPeriodo] = useState<Periodo>(periodoIniziale ?? pagina.periodo);
  const [inCorso, setInCorso] = useState(false);

  function cambiaApertura(v: boolean) {
    // Si apre sul periodo che la pagina mostra in quel momento: chi ha guardato il mensile
    // e preme «Attiva» deve trovarsi davanti il mensile, non l'annuale di quando la
    // pagina si è caricata.
    if (v) setPeriodo(periodoIniziale ?? pagina.periodo);
    setAperto(v);
    if (!v && apriSubito && typeof window !== "undefined") {
      const u = new URL(window.location.href);
      if (u.searchParams.has("fascia") || u.searchParams.has("periodo")) {
        u.searchParams.delete("fascia");
        u.searchParams.delete("periodo");
        window.history.replaceState(null, "", u.pathname + (u.search || "") + u.hash);
      }
    }
  }

  const p = PIANI[piano];
  const prezzo = prezzoDiVendita(p, periodo);

  async function acquista() {
    setInCorso(true);
    const esito = await apriCheckoutAction({ piano, periodo });
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
    <Dialog open={aperto} onOpenChange={cambiaApertura}>
      <DialogTrigger asChild>
        <Button variant={variante} size="sm" className="w-full">
          <CreditCard className="size-3.5" /> {etichetta}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{p.nome}</DialogTitle>
          <DialogDescription>
            {p.usoInterno ? "1 azienda, la tua" : aziendeTesto(p.aziende)} · {p.accessi}{" "}accessi · tutti i percorsi
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <InterruttorePeriodo periodo={periodo} onCambia={setPeriodo} />
          <div className="rounded-lg border bg-muted/40 p-4">
            <PrezzoFascia piano={piano} periodo={periodo} compatto />
            <p className="mt-3 border-t pt-3 text-[12px] leading-relaxed text-muted-foreground">
              {periodo === "anno"
                ? "Si rinnova da solo ogni anno, allo stesso prezzo. Lo disdici quando vuoi da questa pagina: resta attivo fino alla fine dell'anno pagato."
                : "Si rinnova da solo ogni mese. Lo disdici quando vuoi da questa pagina, e puoi passare all'annuale in ogni momento."}{" "}
              Rimborso integrale entro quattordici giorni dal primo pagamento, se non hai ancora pubblicato un documento.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => cambiaApertura(false)} disabled={inCorso}>
            Annulla
          </Button>
          <Button onClick={acquista} disabled={inCorso || !prezzo}>
            {inCorso ? "Apro il pagamento…" : prezzo ? `Paga ${euro(prezzo.importo)} + IVA` : "Non disponibile"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
