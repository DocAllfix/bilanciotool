"use client";

import { useState } from "react";
import { X, Check } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { PIANI, CHIAVI_PIANO, euro, prezzoDiVendita, lancioAttivo, FINE_LANCIO } from "@/lib/prezzi";
import { apriCheckoutAction } from "@/features/billing/actions";
import type { PianoKey } from "@/lib/prezzi";
import { fmtDataEstesa } from "@/lib/format";

// L'offerta, alla fine del giro guidato.
//
// Chi la legge è un consulente che ha appena visto il prodotto: non gli si vende
// entusiasmo, gli si dice cosa ottiene e quanto costa. Niente conto alla rovescia,
// niente «solo per oggi»: la scadenza della promozione è vera ed è scritta, e un
// professionista che si accorge di un'urgenza inventata smette di fidarsi anche del
// resto.
//
// Il piano al centro è quello consigliato — Studio — perché nella scelta fra tre
// opzioni quella di mezzo è il riferimento, e lasciarla senza indicazione costringe
// ognuno a rifare il ragionamento da capo.

export function OffertaLancio({ onChiudi }: { onChiudi: () => void }) {
  const [inCorso, setInCorso] = useState<PianoKey | null>(null);
  const acquistabili = CHIAVI_PIANO.filter((k) => !PIANI[k].trattativa);

  async function acquista(piano: PianoKey) {
    setInCorso(piano);
    const esito = await apriCheckoutAction({ piano });
    if (!esito.ok) {
      setInCorso(null);
      toast.error(esito.errore);
      return;
    }
    window.location.href = esito.dati!.url;
  }

  return (
    <div className="fixed inset-0 z-70 flex items-center justify-center overflow-y-auto bg-black/70 p-4 backdrop-blur-sm">
      <div className="my-auto w-full max-w-4xl rounded-xl border bg-card p-6 shadow-2xl sm:p-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="font-display text-[22px] font-bold tracking-tight">
              Hai visto tutto. Ora puoi usarlo davvero.
            </h2>
            <p className="mt-1.5 max-w-2xl text-[14px] leading-relaxed text-muted-foreground">
              In prova resti libero di guardare l&apos;azienda dimostrativa. Con l&apos;abbonamento
              carichi le tue aziende, pubblichi i documenti e li consegni ai clienti.
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

        {lancioAttivo() && (
          <p className="mt-4 inline-flex rounded-full bg-primary/10 px-3 py-1 text-[12.5px] font-medium text-primary">
            Prezzi di lancio, validi fino al{" "}
            {fmtDataEstesa(FINE_LANCIO)}
          </p>
        )}

        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          {acquistabili.map((k) => {
            const p = PIANI[k];
            const anno1 = prezzoDiVendita(p, "anno1")!;
            const rinnovo = prezzoDiVendita(p, "rinnovo")!;
            const consigliato = k === "studio";
            return (
              <div
                key={k}
                className={
                  "flex flex-col rounded-lg border p-4 " +
                  (consigliato ? "border-primary/50 bg-accent/40 ring-1 ring-primary/20" : "")
                }
              >
                {consigliato && (
                  <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-primary">
                    Il più scelto
                  </p>
                )}
                <p className="font-medium">{p.nome}</p>
                <p className="mt-1 text-[12.5px] leading-relaxed text-muted-foreground">{p.descrizione}</p>

                <p className="mt-3 flex flex-wrap items-baseline gap-2">
                  {anno1.listino !== undefined && (
                    <span className="text-[13px] tabular-nums text-muted-foreground line-through">
                      {euro(anno1.listino)}
                    </span>
                  )}
                  <span className="text-xl font-semibold tabular-nums">{euro(anno1.importo)}</span>
                </p>
                <p className="text-[12px] text-muted-foreground">
                  primo anno, poi {euro(rinnovo.importo)} l&apos;anno
                </p>

                <ul className="mt-3 space-y-1.5 text-[13px] text-muted-foreground">
                  <li className="flex items-start gap-1.5">
                    <Check className="mt-0.5 size-3.5 shrink-0 text-primary" />
                    {p.aziende} aziende
                  </li>
                  <li className="flex items-start gap-1.5">
                    <Check className="mt-0.5 size-3.5 shrink-0 text-primary" />
                    {p.accessi} accessi
                  </li>
                  <li className="flex items-start gap-1.5">
                    <Check className="mt-0.5 size-3.5 shrink-0 text-primary" />
                    Tutti e cinque i percorsi
                  </li>
                </ul>

                <div className="mt-4 pt-1">
                  <Button
                    onClick={() => acquista(k)}
                    disabled={inCorso !== null}
                    variant={consigliato ? "default" : "outline"}
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
            Nessun vincolo oltre l&apos;anno: il rinnovo si disdice quando vuoi.
          </p>
          <Button variant="ghost" size="sm" onClick={onChiudi} className="text-muted-foreground">
            Continua a esplorare
          </Button>
        </div>
      </div>
    </div>
  );
}
