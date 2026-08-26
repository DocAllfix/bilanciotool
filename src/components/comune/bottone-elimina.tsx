"use client";

import { useState, useTransition } from "react";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

// Il comando distruttivo del prodotto, con la sua conferma.
//
// ⚠️ Nasce per togliere gli ultimi tre `confirm()` nativi (voce e obiettivo
// dell'inventario GHG, elemento del racconto del Bilancio), rimasti dopo che il 13
// agosto 2026 erano stati tolti dal solo gesto dell'archiviazione e dati per chiusi.
//
// Un `confirm()` e' una finestra del BROWSER: non porta il marchio, non si puo'
// descrivere — quindi non puo' dire che cosa si perde e che cosa no — e in piu' alcuni
// browser la sopprimono. Il prodotto ha gia' un dialogo suo, quello dell'archiviazione:
// questo componente lo rende riusabile per i gesti che eliminano una riga.
//
// ⚠️ Tre chiamanti e una domanda sola — «elimina questo, conferma prima» — che e' il
// criterio con cui in questo progetto si decide se accorpare: non «si somigliano?» ma
// «rispondono alla stessa domanda?».
export function BottoneElimina({
  etichetta,
  titolo,
  descrizione,
  onConferma,
  className,
}: {
  /** Nome accessibile del pulsante: e' cio' che un lettore di schermo annuncia. */
  etichetta: string;
  /** La domanda, con dentro il nome di cio' che sparisce. */
  titolo: string;
  /** Che cosa succede davvero. Un `confirm()` non poteva dirlo. */
  descrizione: string;
  onConferma: () => Promise<unknown>;
  className?: string;
}) {
  const [aperto, setAperto] = useState(false);
  const [inCorso, avvia] = useTransition();

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        aria-label={etichetta}
        className={className}
        onClick={() => setAperto(true)}
      >
        <Trash2 className="size-3.5" />
      </Button>

      <Dialog open={aperto} onOpenChange={setAperto}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{titolo}</DialogTitle>
            <DialogDescription>{descrizione}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAperto(false)} disabled={inCorso}>
              Annulla
            </Button>
            <Button
              variant="destructive"
              disabled={inCorso}
              onClick={() =>
                avvia(async () => {
                  await onConferma();
                  setAperto(false);
                })
              }
            >
              {inCorso ? "Eliminazione…" : "Elimina"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
