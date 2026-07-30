"use client";

import { useRouter } from "next/navigation";
import { archiveCompanyAction, restoreCompanyAction } from "@/features/companies/actions";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Archive, ArchiveRestore, MoreVertical } from "lucide-react";

export function AziendaAzioni({ companyId, archiviata }: { companyId: string; archiviata: boolean }) {
  const router = useRouter();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Altre azioni">
          <MoreVertical className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {archiviata ? (
          <DropdownMenuItem
            onClick={async () => {
              const esito = await restoreCompanyAction(companyId);
              if (!esito.ok) alert(esito.errore);
              router.refresh();
            }}
          >
            <ArchiveRestore className="size-4" /> Ripristina
          </DropdownMenuItem>
        ) : (
          <DropdownMenuItem
            onClick={async () => {
              if (!confirm("Archiviare l'azienda? Resterà consultabile in sola lettura e uscirà dai limiti del piano.")) return;
              const esito = await archiveCompanyAction(companyId);
              if (!esito.ok) alert(esito.errore);
              router.refresh();
            }}
          >
            <Archive className="size-4" /> Archivia
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
