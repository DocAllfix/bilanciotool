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

export function NuovaAziendaDialog({ atLimit, limite }: { atLimit: boolean; limite: number }) {
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
    router.refresh();
  }

  if (atLimit) {
    return (
      <Button disabled title={`Limite di ${limite} aziende attive raggiunto`}>
        <Plus className="size-4" /> Nuova azienda
      </Button>
    );
  }

  return (
    <Dialog open={aperto} onOpenChange={setAperto}>
      <DialogTrigger asChild>
        <Button data-tour="nuova-azienda">
          <Plus className="size-4" /> Nuova azienda
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nuova azienda</DialogTitle>
          <DialogDescription>Aggiungi un&apos;azienda cliente al portafoglio dello studio.</DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
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
