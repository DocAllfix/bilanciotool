"use client";

import { useState } from "react";
import Link from "next/link";
import { authClient } from "@/lib/auth/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

// Il recupero della password.
//
// Il server lo sapeva già fare: `sendResetPassword` è configurato dalla Fase 13, il
// modello dell'email esiste, il freno sulla frequenza pure. Mancava solo il modo di
// chiederlo — e senza, chi dimentava la password non entrava più. Per un prodotto che
// si paga a fine anno è il guasto che si scopre nel momento peggiore.
//
// La risposta è la STESSA per un indirizzo che esiste e per uno che non esiste: dire
// «questa email non risulta» trasforma la pagina in un modo per sapere chi è cliente.

export default function PasswordDimenticataPage() {
  const [inviata, setInviata] = useState(false);
  const [inCorso, setInCorso] = useState(false);
  const [errore, setErrore] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrore(null);
    setInCorso(true);
    const email = String(new FormData(e.currentTarget).get("email"));
    const { error } = await authClient.requestPasswordReset({
      email,
      redirectTo: "/reimposta-password",
    });
    setInCorso(false);
    // Anche in caso di errore si dichiara l'invio, tranne quando è il freno a parlare:
    // lì tacere sarebbe far riprovare all'infinito qualcuno che ha solo insistito.
    if (error?.status === 429) {
      setErrore("Troppe richieste ravvicinate. Riprova fra un'ora.");
      return;
    }
    setInviata(true);
  }

  if (inviata) {
    return (
      <Card>
        <CardHeader>
          <h1 className="text-lg font-semibold tracking-tight">Controlla la tua posta</h1>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm leading-relaxed text-muted-foreground">
            Se quell&apos;indirizzo corrisponde a un account, ti abbiamo mandato un collegamento per
            scegliere una password nuova. Vale un&apos;ora.
          </p>
          <p className="text-sm text-muted-foreground">
            Non arriva? Guarda nella posta indesiderata, poi{" "}
            <Link href="/password-dimenticata" className="font-medium text-primary hover:underline">
              riprova
            </Link>
            .
          </p>
          <Link href="/login" className="block text-center text-sm font-medium text-primary hover:underline">
            Torna all&apos;accesso
          </Link>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <h1 className="text-lg font-semibold tracking-tight">Password dimenticata</h1>
        <p className="text-sm text-muted-foreground">
          Scrivi l&apos;indirizzo con cui accedi: ti mandiamo un collegamento per sceglierne una nuova.
        </p>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="space-y-4" noValidate>
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input id="email" name="email" type="email" autoComplete="email" required />
          </div>
          {errore && (
            <p role="alert" className="text-sm text-destructive">
              {errore}
            </p>
          )}
          <Button type="submit" className="w-full" disabled={inCorso}>
            {inCorso ? "Invio in corso…" : "Mandami il collegamento"}
          </Button>
        </form>
        <p className="mt-4 text-center text-sm text-muted-foreground">
          Te la sei ricordata?{" "}
          <Link href="/login" className="font-medium text-primary hover:underline">
            Accedi
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
