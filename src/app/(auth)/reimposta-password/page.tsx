"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { authClient } from "@/lib/auth/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

// La seconda metà del recupero: si arriva qui dal collegamento ricevuto per posta.
//
// Better Auth passa il gettone in `?token=`, e se è scaduto o già usato rimanda qui con
// `?error=INVALID_TOKEN`. Quel caso va detto in chiaro: una pagina che accetta la nuova
// password e poi fallisce al salvataggio è peggio di una che avverte subito.

const MINIMO = 8;

function Modulo() {
  const router = useRouter();
  const q = useSearchParams();
  const token = q.get("token");
  const errorePrecedente = q.get("error");
  const [errore, setErrore] = useState<string | null>(null);
  const [inCorso, setInCorso] = useState(false);

  if (!token || errorePrecedente) {
    return (
      <Card>
        <CardHeader>
          <h1 className="text-lg font-semibold tracking-tight">Collegamento non più valido</h1>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm leading-relaxed text-muted-foreground">
            I collegamenti per reimpostare la password valgono un&apos;ora e si usano una volta sola.
            Chiedine un altro: ci vuole un attimo.
          </p>
          <Link href="/password-dimenticata">
            <Button className="w-full">Chiedi un nuovo collegamento</Button>
          </Link>
        </CardContent>
      </Card>
    );
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrore(null);
    const form = new FormData(e.currentTarget);
    const password = String(form.get("password"));
    const conferma = String(form.get("conferma"));
    if (password.length < MINIMO) return setErrore(`La password deve avere almeno ${MINIMO} caratteri.`);
    if (password !== conferma) return setErrore("Le due password non coincidono.");

    setInCorso(true);
    const { error } = await authClient.resetPassword({ newPassword: password, token: token! });
    setInCorso(false);
    if (error) {
      setErrore("Il collegamento non è più valido. Chiedine un altro dalla pagina di accesso.");
      return;
    }
    // Non si entra da soli: cambiata la password, la si usa. È anche il modo di
    // verificare di averla scritta come si credeva.
    router.push("/login?reimpostata=1");
  }

  return (
    <Card>
      <CardHeader>
        <h1 className="text-lg font-semibold tracking-tight">Scegli una nuova password</h1>
        <p className="text-sm text-muted-foreground">Almeno {MINIMO} caratteri.</p>
      </CardHeader>
      <CardContent>
        <form method="post" onSubmit={onSubmit} className="space-y-4" noValidate>
          <div className="space-y-1.5">
            <Label htmlFor="password">Nuova password</Label>
            <Input id="password" name="password" type="password" autoComplete="new-password" required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="conferma">Ripetila</Label>
            <Input id="conferma" name="conferma" type="password" autoComplete="new-password" required />
          </div>
          {errore && (
            <p role="alert" className="text-sm text-destructive">
              {errore}
            </p>
          )}
          <Button type="submit" className="w-full" disabled={inCorso}>
            {inCorso ? "Salvataggio…" : "Salva la nuova password"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

export default function ReimpostaPasswordPage() {
  // `useSearchParams` obbliga a un confine di sospensione: senza, il build fallisce.
  return (
    <Suspense fallback={null}>
      <Modulo />
    </Suspense>
  );
}
