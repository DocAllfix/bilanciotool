"use client";

import { useState } from "react";
import { toast } from "sonner";
import { ReceiptText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { apriPortaleAction } from "@/features/billing/actions";

// Il comando che porta alle fatture e al metodo di pagamento.
//
// L'indirizzo lo crea il server al momento del clic e vale pochi minuti: non si può
// preparare nel markup della pagina, e non deve restare in cronologia come un
// collegamento riutilizzabile.

export function PulsantePortale() {
  const [inCorso, setInCorso] = useState(false);

  async function apri() {
    setInCorso(true);
    const esito = await apriPortaleAction();
    if (!esito.ok) {
      setInCorso(false);
      toast.error(esito.errore);
      return;
    }
    window.location.href = esito.dati!.url;
  }

  return (
    <Button variant="outline" size="sm" onClick={apri} disabled={inCorso}>
      <ReceiptText className="size-3.5" />
      {inCorso ? "Apro…" : "Fatture e metodo di pagamento"}
    </Button>
  );
}
