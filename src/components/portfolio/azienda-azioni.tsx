"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { archiveCompanyAction, restoreCompanyAction } from "@/features/companies/actions";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Archive, ArchiveRestore, MoreVertical } from "lucide-react";

// Archiviazione e ripristino di un'azienda.
//
// Erano l'unico punto del prodotto a usare `confirm()` e `alert()` del browser: finestre
// grigie di sistema in mezzo a un'interfaccia che ovunque altro chiede conferma con un
// dialogo suo e comunica gli esiti con gli avvisi in basso. Oltre allo stacco, `alert()`
// blocca il thread e su alcuni browser viene soppresso del tutto: un errore riferito
// così può non arrivare mai a chi lo deve leggere.

export function AziendaAzioni({
  companyId,
  nome,
  archiviata,
}: {
  companyId: string;
  nome?: string;
  archiviata: boolean;
}) {
  const router = useRouter();
  const [chiedeConferma, setChiedeConferma] = useState(false);
  const [inCorso, avvia] = useTransition();
  /** Sale di uno a ogni operazione riuscita: è il segnale che fa partire il rinfresco. */
  const [fatte, setFatte] = useState(0);

  // ⚠️ `router.refresh()` sta in un EFFETTO, e non dentro la transizione.
  //
  // La storia di questo punto è lunga tre correzioni, e ognuna misurata:
  //
  //  1. chiamato nello stesso tick in cui il dialogo si chiude, non si applicava MAI:
  //     l'azienda archiviata restava fra le attive. Provato con finestre di 45 e 200s.
  //  2. rimandato con `setTimeout(..., 0)` si applicava in circa sette secondi — ma
  //     restava DENTRO la richiamata di `useTransition`, e da lì è tornato a mancare in
  //     modo intermittente quando la dashboard è passata da cinque a undici moduli e il
  //     suo tempo di risposta da circa un secondo a quattro-otto. Misurato: a volte
  //     sette secondi, a volte mai in tre minuti — e una ricarica mostrava subito la
  //     pagina giusta, quindi il server rispondeva bene ed era il client a non applicare.
  //  3. in un effetto, il rinfresco parte DOPO che React ha eseguito il commit e la
  //     transizione è finita. Non è un ritardo più lungo: è un momento diverso, l'unico
  //     in cui non c'è una transizione in corso a cui l'aggiornamento possa restare
  //     appeso.
  //
  // La controprova è stata fatta rimettendo il `setTimeout` dentro la transizione e
  // ripetendo il ciclo archivia/ripristina quattro volte: **quattro aggiornamenti su
  // otto non sono mai arrivati**, e una ricarica mostrava subito la pagina giusta. Con
  // l'effetto, zero su sei, fra i 6,2 e gli 8,5 secondi. Lo strumento è
  // `node scripts/misura-archiviazione.mjs`, e una misura sola non basta: il difetto è
  // intermittente, quindi «ha funzionato una volta» non distingue corretto da fortunato.
  //
  // Il secondo fattore, indipendente da questo, era `revalidatePath("/dashboard")` nelle
  // azioni: vedi il commento in `src/features/companies/actions.ts`. Bastava uno dei due
  // a rompere l'aggiornamento.
  //
  // Il controllo che diventa rosso se una delle tre torna indietro è
  // `npm run qa -- portafoglio-aggiorna`, che non ricarica MAI la pagina.
  useEffect(() => {
    if (fatte > 0) router.refresh();
  }, [fatte, router]);

  function esegui(azione: () => Promise<{ ok: boolean; errore?: string }>, riuscito: string) {
    avvia(async () => {
      const esito = await azione();
      if (!esito.ok) {
        toast.error(esito.errore ?? "Operazione non riuscita");
        return;
      }
      setChiedeConferma(false);
      toast.success(riuscito);
      setFatte((n) => n + 1);
    });
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" aria-label="Altre azioni">
            <MoreVertical className="size-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {archiviata ? (
            <DropdownMenuItem
              onClick={() => esegui(() => restoreCompanyAction(companyId), "Azienda ripristinata")}
            >
              <ArchiveRestore className="size-4" /> Ripristina
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem onSelect={() => setChiedeConferma(true)}>
              <Archive className="size-4" /> Archivia
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={chiedeConferma} onOpenChange={setChiedeConferma}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Archiviare {nome ? `«${nome}»` : "l'azienda"}?</DialogTitle>
            <DialogDescription>
              Resterà consultabile in sola lettura e uscirà dai limiti del piano. I documenti già
              pubblicati non cambiano, e puoi ripristinarla quando vuoi.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setChiedeConferma(false)} disabled={inCorso}>
              Annulla
            </Button>
            <Button
              onClick={() => esegui(() => archiveCompanyAction(companyId), "Azienda archiviata")}
              disabled={inCorso}
            >
              {inCorso ? "Archiviazione…" : "Archivia"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
