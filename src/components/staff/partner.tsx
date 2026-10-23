"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BottoneElimina } from "@/components/comune/bottone-elimina";
import { attribuisciPartnerAction, rimuoviPartnerAction } from "@/features/partner/actions";

// L'attribuzione a mano: per il cliente del partner che all'iscrizione non ha scritto il
// codice. Si cerca lo studio per l'email del titolare, perché è ciò che lo staff conosce.

export function AttribuzioneManuale({ partner }: { partner: { codice: string; nome: string }[] }) {
  const router = useRouter();
  const [errore, setErrore] = useState<string | null>(null);
  const [inCorso, avvia] = useTransition();

  function invia(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const f = new FormData(form);
    setErrore(null);
    avvia(async () => {
      const r = await attribuisciPartnerAction({
        email: String(f.get("email") ?? ""),
        codice: String(f.get("codice") ?? ""),
        nota: String(f.get("nota") ?? ""),
      });
      if (!r.ok) {
        setErrore(r.errore);
        return;
      }
      const d = r.dati;
      toast.success(d?.prima ? `${d.studio}: partner spostato da ${d.prima}` : `${d?.studio ?? "Studio"}: partner attribuito`);
      form.reset();
      router.refresh();
    });
  }

  return (
    <form method="post" onSubmit={invia} className="grid gap-3 rounded-lg border bg-card p-4 sm:grid-cols-2" data-attribuzione-manuale="">
      <div className="space-y-1.5 sm:col-span-2">
        <Label htmlFor="partner-email">Email del titolare dello studio</Label>
        <Input id="partner-email" name="email" type="email" required autoComplete="off" />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="partner-codice">Partner</Label>
        <select
          id="partner-codice"
          name="codice"
          required
          className="h-9 w-full rounded-md border bg-background px-3 text-sm"
          defaultValue={partner[0]?.codice ?? ""}
        >
          {partner.map((p) => (
            <option key={p.codice} value={p.codice}>
              {p.nome && p.nome !== p.codice ? `${p.codice} — ${p.nome}` : p.codice}
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="partner-nota">Nota (facoltativa)</Label>
        <Input id="partner-nota" name="nota" maxLength={500} placeholder="Per esempio: segnalato dal partner il 23 ottobre" />
      </div>
      {errore && (
        <p role="alert" className="text-sm text-destructive sm:col-span-2">
          {errore}
        </p>
      )}
      <div className="sm:col-span-2">
        <Button type="submit" disabled={inCorso}>
          {inCorso ? "Attribuzione in corso…" : "Attribuisci al partner"}
        </Button>
      </div>
    </form>
  );
}

export function RimuoviAttribuzione({ orgId, studio, codice }: { orgId: string; studio: string; codice: string }) {
  const router = useRouter();
  return (
    <BottoneElimina
      etichetta={`Togli il partner ${codice} da ${studio}`}
      titolo={`Togliere ${codice} da «${studio}»?`}
      descrizione="Le fatture di questo studio non compariranno più fra quelle del partner, e la mail di vendita dirà «nessuno». Resta scritto nel registro attività."
      onConferma={async () => {
        const r = await rimuoviPartnerAction(orgId);
        if (!r.ok) {
          toast.error(r.errore);
          return;
        }
        toast.success(`${studio}: partner tolto`);
        router.refresh();
      }}
    />
  );
}
