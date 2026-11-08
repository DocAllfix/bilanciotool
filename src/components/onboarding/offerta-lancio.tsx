"use client";

import { useState } from "react";
import { X, Check } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { PIANI, aziendeTesto, fasceVendibili } from "@/lib/prezzi";
import { apriCheckoutAction } from "@/features/billing/actions";
import type { PianoKey } from "@/lib/prezzi";
import { InterruttorePeriodo, PeriodoProvider, PrezzoFascia, usePeriodo } from "@/components/prezzi/periodo";

// L'offerta, alla fine del giro guidato.
//
// Chi la legge è un consulente che ha appena visto il prodotto: non gli si vende
// entusiasmo, gli si dice cosa ottiene e quanto costa. Niente conto alla rovescia,
// niente «solo per oggi»: la scadenza della promozione è vera ed è scritta, e un
// professionista che si accorge di un'urgenza inventata smette di fidarsi anche del
// resto.
//
// ⚠️ Niente «Il più scelto»: con un listino nuovo non è un fatto, è un'etichetta, e su un
// prodotto che vende conformità un'affermazione non vera in una finestra d'acquisto è il
// peggior biglietto da visita. I tre piani stanno alla pari, ciascuno col suo pubblico.

export function OffertaLancio({ onChiudi }: { onChiudi: () => void }) {
  return (
    <PeriodoProvider>
      <Offerta onChiudi={onChiudi} />
    </PeriodoProvider>
  );
}

function Offerta({ onChiudi }: { onChiudi: () => void }) {
  const [inCorso, setInCorso] = useState<PianoKey | null>(null);
  const { periodo } = usePeriodo();
  // Tutti i piani in vendita: chi ha appena fatto il giro può essere l'azienda che fa da sé
  // o il consulente che segue clienti, e l'offerta non sa quale dei due.
  const acquistabili = fasceVendibili();

  async function acquista(piano: PianoKey) {
    setInCorso(piano);
    const esito = await apriCheckoutAction({ piano, periodo });
    if (!esito.ok) {
      setInCorso(null);
      toast.error(esito.errore);
      return;
    }
    window.location.href = esito.dati!.url;
  }

  return (
    <div
      // ⚠️ Dichiarata come finestra: il cancello di `avviaTour` la vede e non apre un giro
      // guidato sopra l'offerta. Non è decorazione — un velo sopra i prezzi si prende i
      // clic destinati al pulsante che porta al pagamento.
      data-modale="offerta"
      className="fixed inset-0 z-70 flex items-center justify-center overflow-y-auto bg-black/70 p-4 backdrop-blur-sm"
    >
      <div className="my-auto w-full max-w-4xl rounded-xl border bg-card p-6 shadow-2xl sm:p-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="font-display text-[22px] font-bold tracking-tight">
              Hai visto tutto. Ora puoi usarlo davvero.
            </h2>
            <p className="mt-1.5 max-w-2xl text-[14px] leading-relaxed text-muted-foreground">
              In prova resti libero di guardare l&apos;azienda dimostrativa. Con l&apos;abbonamento
              lavori sulla tua azienda o su quelle che segui, e pubblichi i documenti.
            </p>
          </div>
          <button
            onClick={onChiudi}
            className="tocco-comodo shrink-0 rounded-md p-1 text-muted-foreground hover:text-foreground"
            aria-label="Chiudi"
          >
            <X className="size-5" />
          </button>
        </div>

        <InterruttorePeriodo className="mt-4" />

        <div className="mt-5 grid gap-3 md:grid-cols-3">
          {acquistabili.map((k) => {
            const p = PIANI[k];
            return (
              <div key={k} className="flex flex-col rounded-lg border p-4" data-offerta-piano={k}>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-primary">
                  {p.pubblico === "azienda" ? "Per la tua azienda" : "Per i consulenti"}
                </p>
                <p className="mt-1 font-medium">{p.nome}</p>
                <p className="mt-1 text-[12.5px] leading-relaxed text-muted-foreground">{p.descrizione}</p>

                <div className="mt-3">
                  <PrezzoFascia piano={k} compatto />
                </div>

                <ul className="mt-3 space-y-1.5 text-[13px] text-muted-foreground">
                  <li className="flex items-start gap-1.5">
                    <Check className="mt-0.5 size-3.5 shrink-0 text-primary" />
                    {p.usoInterno ? "1 azienda, la tua" : aziendeTesto(p.aziende)}
                  </li>
                  <li className="flex items-start gap-1.5">
                    <Check className="mt-0.5 size-3.5 shrink-0 text-primary" />
                    {p.accessi}{" "}accessi
                  </li>
                  <li className="flex items-start gap-1.5">
                    <Check className="mt-0.5 size-3.5 shrink-0 text-primary" />
                    Tutti i percorsi
                  </li>
                </ul>

                <div className="mt-auto pt-4">
                  <Button
                    onClick={() => acquista(k)}
                    disabled={inCorso !== null}
                    variant={p.pubblico === "azienda" ? "default" : "outline"}
                    size="sm"
                    className="w-full"
                  >
                    {inCorso === k ? "Apro il pagamento…" : "Attiva"}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t pt-4">
          {/* Il rimborso non è una concessione da nascondere in fondo: è ciò che rende
              la decisione reversibile, ed è la ragione per cui una persona la prende. */}
          <p className="text-[12.5px] leading-relaxed text-muted-foreground">
            Quattordici giorni per ripensarci, finché non hai pubblicato il primo documento.
            <br className="hidden sm:block" />
            Annuale o mensile, il rinnovo si disdice quando vuoi.
          </p>
          <Button variant="ghost" size="sm" onClick={onChiudi} className="text-muted-foreground">
            Continua a esplorare
          </Button>
        </div>
      </div>
    </div>
  );
}
