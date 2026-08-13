"use client";

import { useState, useTransition } from "react";
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

  function esegui(azione: () => Promise<{ ok: boolean; errore?: string }>, riuscito: string) {
    avvia(async () => {
      const esito = await azione();
      if (!esito.ok) {
        toast.error(esito.errore ?? "Operazione non riuscita");
        return;
      }
      setChiedeConferma(false);
      toast.success(riuscito);
      router.refresh();
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
