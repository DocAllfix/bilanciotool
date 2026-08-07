"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { authClient } from "@/lib/auth/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

// Rinomina dello studio.
//
// Passa dalle API di Better Auth e non da una nostra server action: l'organizzazione è
// roba sua, e scriverla da due parti diverse significa che prima o poi le due strade
// divergono. I permessi li applica il plugin, che conosce i ruoli.

export function FormNomeStudio({
  nomeIniziale,
  organizationId,
  puoModificare,
}: {
  nomeIniziale: string;
  organizationId: string;
  puoModificare: boolean;
}) {
  const [nome, setNome] = useState(nomeIniziale);
  const [salvataggio, setSalvataggio] = useState(false);
  const router = useRouter();

  const cambiato = nome.trim() !== nomeIniziale && nome.trim().length > 0;

  async function salva() {
    setSalvataggio(true);
    try {
      const { error } = await authClient.organization.update({
        organizationId,
        data: { name: nome.trim() },
      });
      if (error) {
        toast.error(error.message ?? "Non è stato possibile rinominare lo studio.");
        return;
      }
      toast.success("Nome dello studio aggiornato.");
      router.refresh();
    } catch {
      toast.error("Non è stato possibile rinominare lo studio.");
    } finally {
      setSalvataggio(false);
    }
  }

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
      <div className="flex-1">
        <Label htmlFor="nome-studio">Nome dello studio</Label>
        <Input
          id="nome-studio"
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          disabled={!puoModificare || salvataggio}
          maxLength={120}
          className="mt-1.5"
        />
      </div>
      {puoModificare && (
        <Button onClick={salva} disabled={!cambiato || salvataggio} className="shrink-0">
          {salvataggio ? "Salvo…" : "Salva"}
        </Button>
      )}
    </div>
  );
}
