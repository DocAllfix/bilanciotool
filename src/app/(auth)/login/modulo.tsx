"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

// Il modulo d'accesso, estratto dalla pagina perche' serve in due posti.
//
// Il secondo e' l'accettazione di un invito: chi ha gia' un account deve poter entrare
// **senza perdere l'invito**. Mandarlo su `/login` e poi in dashboard vorrebbe dire
// riportarlo al punto di partenza con l'invito in mano e nessun modo di usarlo — e
// l'unico posto che ha quel collegamento e' un'email che a quel punto ha gia' aperto.
//
// La `destinazione` la decide il SERVER e non arriva mai dal browser: un redirect aperto
// su una pagina d'accesso e' il modo classico di far atterrare qualcuno su una copia del
// modulo che raccoglie le password.

export function ModuloAccesso({
  destinazione = "/dashboard",
  idPrefisso = "",
}: {
  destinazione?: string;
  /** Prefisso per gli `id` dei campi.
   *
   *  Serve quando questo modulo divide la pagina con quello d'iscrizione — l'accettazione
   *  di un invito. Due moduli con gli stessi `id` producono HTML con identificativi
   *  duplicati, e l'etichetta «Email» dell'uno finisce a puntare al campo dell'altro: chi
   *  la clicca si ritrova il cursore nel modulo sbagliato. Il valore predefinito e' vuoto,
   *  cosi' la pagina d'accesso resta identica a com'era. */
  idPrefisso?: string;
}) {
  const idEmail = `${idPrefisso}email`;
  const idPassword = `${idPrefisso}password`;
  const router = useRouter();
  const [errore, setErrore] = useState<string | null>(null);
  const [inCorso, setInCorso] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrore(null);
    setInCorso(true);
    const form = new FormData(e.currentTarget);
    const { error } = await authClient.signIn.email({
      email: String(form.get("email")),
      password: String(form.get("password")),
    });
    setInCorso(false);
    if (error) {
      setErrore("Credenziali non valide. Controlla email e password.");
      return;
    }
    router.push(destinazione);
    router.refresh();
  }

  return (
    <form method="post" onSubmit={onSubmit} className="space-y-4" noValidate>
      <div className="space-y-1.5">
        <Label htmlFor={idEmail}>Email</Label>
        <Input id={idEmail} name="email" type="email" autoComplete="email" required />
      </div>
      <div className="space-y-1.5">
        <div className="flex items-baseline justify-between gap-3">
          <Label htmlFor={idPassword}>Password</Label>
          {/* Sta accanto al campo, non in fondo alla pagina: si cerca nel momento
              esatto in cui non ci si ricorda che cosa scrivere qui. */}
          <Link
            href="/password-dimenticata"
            className="text-[13px] text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
          >
            Non la ricordi?
          </Link>
        </div>
        <Input id={idPassword} name="password" type="password" autoComplete="current-password" required />
      </div>
      {errore && (
        <p role="alert" className="text-sm text-destructive">
          {errore}
        </p>
      )}
      <Button type="submit" className="w-full" disabled={inCorso}>
        {inCorso ? "Accesso in corso…" : "Accedi"}
      </Button>
    </form>
  );
}
