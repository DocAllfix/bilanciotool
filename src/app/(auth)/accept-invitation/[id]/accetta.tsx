"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { accettaInvitoAction } from "./azioni";
import { Button } from "@/components/ui/button";

export function BottoneAccetta({ invitationId, studio }: { invitationId: string; studio: string }) {
  const router = useRouter();
  const [errore, setErrore] = useState<string | null>(null);
  const [inCorso, setInCorso] = useState(false);

  async function accetta() {
    setErrore(null);
    setInCorso(true);
    const esito = await accettaInvitoAction(invitationId);
    if (!esito.ok) {
      setInCorso(false);
      setErrore(esito.errore);
      return;
    }
    // Non si resta su questa pagina: l'invito ormai e' consumato, e ricaricandola si
    // leggerebbe «gia' accettato» come se qualcosa fosse andato storto.
    //
    // `refresh()` prima di `push()`: la sessione ha cambiato organizzazione attiva, e la
    // shell del portafoglio e' resa dal server. Senza, si arriverebbe in un portafoglio
    // che mostra ancora il nulla di prima.
    router.refresh();
    router.push("/dashboard");
  }

  return (
    <div className="space-y-3">
      <Button className="w-full" onClick={accetta} disabled={inCorso}>
        {inCorso ? "Ingresso in corso…" : `Entra in ${studio}`}
      </Button>
      {errore && (
        <p role="alert" className="text-sm text-destructive">
          {errore}
        </p>
      )}
    </div>
  );
}
