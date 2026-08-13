"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AvvisoReimpostata } from "./avviso-reimpostata";
import { authClient } from "@/lib/auth/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function LoginPage() {
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
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <Card>
      <CardHeader>
        <h1 className="text-lg font-semibold tracking-tight">Accedi</h1>
        <p className="text-sm text-muted-foreground">Entra nel tuo studio.</p>
      </CardHeader>
      <CardContent>
        <Suspense fallback={null}>
          <AvvisoReimpostata />
        </Suspense>
        <form onSubmit={onSubmit} className="space-y-4" noValidate>
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input id="email" name="email" type="email" autoComplete="email" required />
          </div>
          <div className="space-y-1.5">
            <div className="flex items-baseline justify-between gap-3">
              <Label htmlFor="password">Password</Label>
              {/* Sta accanto al campo, non in fondo alla pagina: si cerca nel momento
                  esatto in cui non ci si ricorda che cosa scrivere qui. */}
              <Link
                href="/password-dimenticata"
                className="text-[13px] text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
              >
                Non la ricordi?
              </Link>
            </div>
            <Input id="password" name="password" type="password" autoComplete="current-password" required />
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
        <p className="mt-4 text-center text-sm text-muted-foreground">
          Non hai un account?{" "}
          <Link href="/registrati" className="font-medium text-primary hover:underline">
            Prova la demo guidata
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
