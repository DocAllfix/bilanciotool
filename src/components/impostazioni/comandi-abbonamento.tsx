"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { annullaDisdettaAction, disdiciAbbonamentoAction, passaAllAnnualeAction } from "@/features/billing/actions";
import { PIANI, euro, prezzoDiVendita, risparmioAnnuo, type PianoKey, type Periodo } from "@/lib/prezzi";

// I comandi dell'abbonamento in corso: disdire, ripensarci, passare all'annuale.
//
// ⚠️ Nessun `confirm()` nativo: Playwright li scarta da soli e alcuni browser li sopprimono.
// La conferma è una finestra del prodotto, e dice CHE COSA succede prima che succeda.
//
// ⚠️ Dopo ogni comando la pagina si rinfresca in un EFFETTO, non dentro la transizione: è la
// regola nata dal portafoglio che non si aggiornava (4 volte su 8), dove un `router.refresh()`
// chiamato dentro `useTransition` restava appeso e si perdeva. Lo stato vero lo scrive il
// server rileggendo l'abbonamento da Stripe, non questo componente.

function Conferma({
  apri,
  titolo,
  testo,
  azione,
  etichetta,
  variante = "default",
  onConferma,
}: {
  apri: string;
  titolo: string;
  testo: string;
  azione: string;
  etichetta: string;
  variante?: "default" | "outline" | "destructive";
  onConferma: () => Promise<boolean>;
}) {
  const [aperto, setAperto] = useState(false);
  const [inCorso, avvia] = useTransition();
  return (
    <Dialog open={aperto} onOpenChange={(v) => !inCorso && setAperto(v)}>
      <DialogTrigger asChild>
        <Button variant={variante === "destructive" ? "outline" : variante} size="sm">
          {apri}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md" data-modale>
        <DialogHeader>
          <DialogTitle>{titolo}</DialogTitle>
          <DialogDescription>{testo}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => setAperto(false)} disabled={inCorso}>
            Annulla
          </Button>
          <Button
            variant={variante === "destructive" ? "destructive" : "default"}
            disabled={inCorso}
            onClick={() =>
              avvia(async () => {
                if (await onConferma()) setAperto(false);
              })
            }
          >
            {inCorso ? azione : etichetta}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function ComandiAbbonamento({
  piano,
  periodo,
  disdetto,
  scadenza,
}: {
  piano: PianoKey;
  periodo: Periodo | null;
  disdetto: boolean;
  /** «12 novembre 2027», già scritta dal server. */
  scadenza: string | null;
}) {
  const router = useRouter();
  const [fatti, setFatti] = useState(0);
  useEffect(() => {
    if (fatti > 0) router.refresh();
  }, [fatti, router]);
  const p = PIANI[piano];
  const annuale = prezzoDiVendita(p, "anno");
  const risparmio = risparmioAnnuo(p);

  async function esegui(fn: () => Promise<{ ok: boolean; errore?: string }>, ok: string): Promise<boolean> {
    const esito = await fn();
    if (!esito.ok) {
      toast.error(esito.errore ?? "Non è stato possibile completare l'operazione.");
      return false;
    }
    toast.success(ok);
    setFatti((n) => n + 1);
    return true;
  }

  return (
    <div className="flex flex-wrap items-center gap-3" data-comandi-abbonamento>
      {periodo === "mese" && annuale && !disdetto && (
        <Conferma
          apri={`Passa all'annuale${risparmio ? ` e risparmia ${euro(risparmio)}` : ""}`}
          titolo="Passare all'annuale"
          testo={`Paghi oggi ${euro(annuale.importo)} + IVA per un anno, e Stripe scala la parte del mese già pagata e non ancora usata. Il cambio vale solo se il pagamento va a buon fine: altrimenti l'abbonamento resta mensile.`}
          azione="Pago l'annuale…"
          etichetta={`Paga ${euro(annuale.importo)} + IVA`}
          onConferma={() => esegui(passaAllAnnualeAction, "Fatto: il tuo abbonamento ora è annuale.")}
        />
      )}
      {disdetto ? (
        <Conferma
          apri="Annulla la disdetta"
          titolo="Annullare la disdetta"
          testo={`L'abbonamento torna a rinnovarsi da solo${scadenza ? ` il ${scadenza}` : ""}, allo stesso prezzo.`}
          azione="Annullo…"
          etichetta="Sì, continua a rinnovarlo"
          onConferma={() => esegui(annullaDisdettaAction, "Disdetta annullata: l'abbonamento si rinnoverà.")}
        />
      ) : (
        <Conferma
          apri="Disdici il rinnovo"
          titolo="Disdire il rinnovo"
          testo={`L'abbonamento resta pienamente attivo${scadenza ? ` fino al ${scadenza}` : " fino alla fine del periodo pagato"}, poi non si rinnova. I dati restano tuoi: dopo la scadenza l'account passa in sola lettura e i documenti pubblicati restano scaricabili. Puoi ripensarci fino a quel giorno.`}
          azione="Disdico…"
          etichetta="Disdici il rinnovo"
          variante="destructive"
          onConferma={() => esegui(disdiciAbbonamentoAction, "Disdetta registrata: l'abbonamento non si rinnoverà.")}
        />
      )}
    </div>
  );
}
