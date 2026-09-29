"use client";

import { useState } from "react";
import { ProvaEnergia } from "./prova-energia";
import { RichiamoAcquisto } from "@/components/vetrina/richiamo-acquisto";

// Lo strumento e il richiamo, legati da un fatto solo: la persona ha visto i propri numeri.
//
// ⚠️ Stanno insieme in un componente client perché la pagina è STATICA e non può tenere
// stato. E il legame è un fatto — «è arrivata ai risultati» — non un timer: il richiamo
// arriva dopo il valore, mai prima. Il tempo resta come ripiego dentro `RichiamoAcquisto`,
// per chi legge la pagina senza toccare niente.
export function ProvaEnergiaConRichiamo() {
  const [visto, setVisto] = useState(false);
  return (
    <>
      <ProvaEnergia onRisultati={() => setVisto(true)} />
      <RichiamoAcquisto visto={visto} />
    </>
  );
}
