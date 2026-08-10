"use client";

import { useState } from "react";
import { toast } from "sonner";
import { CreditCard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { apriCheckoutAction } from "@/features/billing/actions";
import type { PianoKey } from "@/lib/prezzi";

// Il comando che porta al pagamento.
//
// Resta «in corso» finché il browser non è passato a Stripe: fra il clic e il cambio
// di pagina passa un secondo abbondante — si crea un cliente e una sessione — e senza
// segnale la gente preme due volte, aprendo due sessioni per lo stesso acquisto.

export function PulsanteAcquisto({
  piano,
  etichetta,
  variante = "default",
}: {
  piano: PianoKey;
  etichetta: string;
  variante?: "default" | "outline";
}) {
  const [inCorso, setInCorso] = useState(false);

  async function acquista() {
    setInCorso(true);
    const esito = await apriCheckoutAction({ piano });
    if (!esito.ok) {
      setInCorso(false);
      toast.error(esito.errore);
      return;
    }
    // Non si azzera `inCorso`: la pagina sta per cambiare, e riabilitare il pulsante
    // nel frattempo inviterebbe a premerlo di nuovo.
    window.location.href = esito.dati!.url;
  }

  return (
    <Button onClick={acquista} disabled={inCorso} variant={variante} size="sm" className="w-full">
      <CreditCard className="size-4" />
      {inCorso ? "Apro il pagamento…" : etichetta}
    </Button>
  );
}
