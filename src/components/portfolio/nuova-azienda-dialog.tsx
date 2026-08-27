"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createCompanyAction } from "@/features/companies/actions";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus } from "lucide-react";

export function NuovaAziendaDialog({
  atLimit,
  limite,
  variante = "bottone",
  usate,
}: {
  atLimit: boolean;
  limite: number;
  /** "cella" rende l'ultima casella della griglia del portafoglio: è l'azione
   *  principale della pagina, che stava solo in alto a destra, e dice il limite
   *  del piano nel punto in cui serve saperlo. */
  variante?: "bottone" | "cella";
  usate?: number;
}) {
  const router = useRouter();
  const [aperto, setAperto] = useState(false);
  const [errore, setErrore] = useState<string | null>(null);
  const [inCorso, setInCorso] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrore(null);
    setInCorso(true);
    const f = new FormData(e.currentTarget);
    const esito = await createCompanyAction({
      nome: f.get("nome"),
      settore: f.get("settore"),
      sede: f.get("sede"),
      piva: f.get("piva"),
      ateco: f.get("ateco"),
    });
    setInCorso(false);
    if (!esito.ok) {
      setErrore(esito.errore);
      return;
    }
    setAperto(false);
    // ⚠️ Si NAVIGA verso l'azienda appena creata, non si aggiorna il portafoglio.
    //
    // Non è una scelta di comodo: `router.refresh()` su questa pagina non applica mai
    // l'albero che il server restituisce, e per la creazione non bastano i due rimedi
    // che risolvono archiviazione e ripristino (togliere `revalidatePath` dall'azione,
    // rimandare l'aggiornamento al tick successivo). Misurato con finestre fino a 90
    // secondi: la card non compare. Con la navigazione: 7 secondi, e si atterra sul
    // fascicolo dell'azienda.
    //
    // È anche la cosa giusta da fare. Chi ha appena creato un'azienda vuole aprirla, ed
    // è ciò che fanno già i moduli SoA ed energetico dopo aver creato un esercizio.
    // L'alternativa, oggi, è che non succeda visibilmente niente.
    //
    // `qa -- portafoglio-aggiorna` diventa rosso se questo comportamento cambia.
    router.push(`/aziende/${esito.dati!.id}`);
  }

  if (atLimit) {
    return (
      <Button disabled title={`Limite di ${limite} aziende attive raggiunto`}>
        <Plus className="size-4" /> Nuova azienda
      </Button>
    );
  }

  const innesco =
    variante === "cella" ? (
      <button
        type="button"
        className="hidden min-h-[190px] w-full flex-col items-center justify-center gap-2 rounded-xl border border-dashed text-muted-foreground transition-colors hover:border-primary/45 hover:bg-accent hover:text-foreground sm:flex"
      >
        <span className="flex size-9 items-center justify-center rounded-full border border-dashed">
          <Plus className="size-4" />
        </span>
        <span className="text-[13px] font-medium">Nuova azienda</span>
        {usate !== undefined && (
          <span className="text-[11px]" data-slot="kpi">
            {usate} di {limite}
          </span>
        )}
      </button>
    ) : (
      <Button data-tour="nuova-azienda">
        <Plus className="size-4" /> Nuova azienda
      </Button>
    );

  return (
    <Dialog open={aperto} onOpenChange={setAperto}>
      <DialogTrigger asChild>{innesco}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nuova azienda</DialogTitle>
          <DialogDescription>Aggiungi un&apos;azienda cliente al portafoglio dello studio.</DialogDescription>
        </DialogHeader>
        <form method="post" onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="na-nome">Denominazione *</Label>
            <Input id="na-nome" name="nome" placeholder="Alfa S.r.l." required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="na-settore">Settore</Label>
              <Input id="na-settore" name="settore" placeholder="Componenti meccanici" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="na-sede">Sede</Label>
              <Input id="na-sede" name="sede" placeholder="Bari" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="na-piva">Partita IVA</Label>
              <Input id="na-piva" name="piva" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="na-ateco">Codice ATECO</Label>
              <Input id="na-ateco" name="ateco" placeholder="25.62" className="font-mono" />
            </div>
          </div>
          {errore && (
            <p role="alert" className="text-sm text-destructive">{errore}</p>
          )}
          <DialogFooter>
            <Button type="submit" disabled={inCorso}>{inCorso ? "Creazione…" : "Crea azienda"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
