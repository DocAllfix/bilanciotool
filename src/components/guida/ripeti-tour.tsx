"use client";

import { useState } from "react";
import { RotateCcw, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TOURS } from "@/lib/tour/registry";

// Rimette i tour come non visti.
//
// Il completamento sta in localStorage, non nel database: cambiare browser li rifà
// vedere, ed è la scelta giusta rispetto al rischio opposto di non vederli mai. Qui
// si toglie quel segno, così il tour riparte da solo alla prossima visita — che è
// come lo incontra chi entra per la prima volta, e quindi come va rivisto.

export function RipetiTour() {
  const [fatto, setFatto] = useState(false);

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={() => {
        for (const t of TOURS) localStorage.removeItem(`evalisdeck-tour:${t.pageId}`);
        setFatto(true);
      }}
    >
      {fatto ? <Check className="size-4" /> : <RotateCcw className="size-4" />}
      {fatto ? "Fatto: riappaiono alla prossima visita" : "Rivedi i tour dall'inizio"}
    </Button>
  );
}
