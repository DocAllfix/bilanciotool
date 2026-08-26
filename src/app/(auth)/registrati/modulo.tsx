"use client";

import { useState } from "react";
import Link from "next/link";
import { authClient } from "@/lib/auth/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

// Il modulo di iscrizione, con due usi.
//
// Chi arriva da «prova la demo» atterra sul portafoglio, dove lo accoglie il video e il
// giro guidato. Chi arriva da «attiva il servizio» ha gia' deciso: portarlo sulla demo
// sarebbe fargli rifare la strada che ha appena saltato apposta.
//
// La differenza sta nella ROTTA e non in un parametro d'indirizzo, ed e' una scelta:
// queste pagine sono statiche, e `useSearchParams` su una pagina statica arriva solo
// dopo l'idratazione — il titolo comparirebbe sbagliato e poi cambierebbe sotto gli
// occhi. Due pagine, due contenuti gia' giusti alla prima pennellata.

export function ModuloIscrizione({
  destinazione,
  perAcquisto = false,
  emailFissa,
  senzaGuscio = false,
}: {
  destinazione: string;
  perAcquisto?: boolean;
  /** L'indirizzo e' gia' deciso: lo impone un invito, e cambiarlo lo renderebbe inutile.
   *  Chi si iscrivesse con un'altra email si vedrebbe poi rifiutare l'accettazione, e
   *  senza capire perche' — il posto giusto per dirglielo e' prima, non dopo. */
  emailFissa?: string;
  /** Senza la propria `Card`: serve quando il modulo vive dentro un'altra scheda, e due
   *  schede annidate si leggono come un errore di impaginazione. */
  senzaGuscio?: boolean;
}) {
  const [errore, setErrore] = useState<string | null>(null);
  const [inviata, setInviata] = useState(false);
  const [inCorso, setInCorso] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrore(null);
    setInCorso(true);
    const form = new FormData(e.currentTarget);
    const { error } = await authClient.signUp.email({
      name: String(form.get("nome")),
      email: String(form.get("email")),
      password: String(form.get("password")),
      callbackURL: destinazione,
    });
    setInCorso(false);
    if (error) {
      setErrore(error.message ?? "Registrazione non riuscita. Riprova.");
      return;
    }
    // Con la verifica dell'indirizzo accesa NON si entra subito: Better Auth non crea
    // la sessione finché l'email non è confermata. Mandare a /dashboard significherebbe
    // sbattere la persona sul login due secondi dopo essersi iscritta, senza spiegazione.
    setInviata(true);
  }

  // Schermata di attesa: la registrazione è riuscita, manca la conferma dell'indirizzo.
  // Dice cosa fare, dove guardare, e che la posta indesiderata è il posto più probabile
  // dove trovarla — che è la ragione numero uno per cui un'iscrizione si ferma qui.
  // `Guscio` e' la `Card` di questo modulo, oppure niente: quando vive dentro un'altra
  // scheda — la pagina di accettazione di un invito — due schede annidate si leggono
  // come un errore di impaginazione.
  const Guscio = senzaGuscio ? "div" : Card;

  if (inviata) {
    return (
      <Guscio>
        <CardHeader className={senzaGuscio ? "px-0 pt-0" : undefined}>
          <h1 className="text-lg font-semibold tracking-tight">Controlla la tua posta</h1>
          <p className="text-sm text-muted-foreground">
            Ti abbiamo mandato un messaggio per confermare l&apos;indirizzo. Apri il collegamento che
            trovi dentro e il tuo studio è pronto.
          </p>
        </CardHeader>
        <CardContent className={`space-y-3 text-sm text-muted-foreground${senzaGuscio ? " px-0 pb-0" : ""}`}>
          <p>
            Se non lo vedi entro qualche minuto, guarda tra la <b>posta indesiderata</b>: è lì che
            finisce quasi sempre il primo messaggio di un mittente nuovo.
          </p>
          <p>
            Sbagliato indirizzo?{" "}
            <button
              type="button"
              onClick={() => setInviata(false)}
              className="font-medium text-foreground underline underline-offset-4"
            >
              Torna indietro e correggilo
            </button>
          </p>
        </CardContent>
      </Guscio>
    );
  }

  return (
    <Guscio>
      <CardHeader className={senzaGuscio ? "px-0 pt-0" : undefined}>
        <h1 className="text-lg font-semibold tracking-tight">
          {perAcquisto ? "Attiva il tuo studio" : "Crea il tuo account"}
        </h1>
        <p className="text-sm text-muted-foreground">
          {perAcquisto
            ? "Confermi l'indirizzo e ti portiamo dritto alla scelta del piano. La registrazione è gratuita: paghi solo quando decidi, e puoi vedere il listino prima."
            : "Registrandoti apri il tuo studio in modalità demo: esplori tutto con un’azienda di esempio, senza impegno."}
        </p>
      </CardHeader>
      <CardContent className={senzaGuscio ? "px-0 pb-0" : undefined}>
        <form method="post" onSubmit={onSubmit} className="space-y-4" noValidate>
          <div className="space-y-1.5">
            <Label htmlFor="nome">Nome e cognome</Label>
            <Input id="nome" name="nome" autoComplete="name" required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="email">Email di lavoro</Label>
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              defaultValue={emailFissa}
              readOnly={Boolean(emailFissa)}
              // `readOnly` e non `disabled`: un campo disabilitato non viene inviato col
              // modulo, e l'iscrizione partirebbe senza indirizzo.
              className={emailFissa ? "bg-muted text-muted-foreground" : undefined}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="password">Password</Label>
            <Input id="password" name="password" type="password" autoComplete="new-password" minLength={8} required />
            <p className="text-xs text-muted-foreground">Almeno 8 caratteri.</p>
          </div>
          {errore && (
            <p role="alert" className="text-sm text-destructive">
              {errore}
            </p>
          )}
          <Button type="submit" className="w-full" disabled={inCorso}>
            {inCorso ? "Creazione in corso…" : perAcquisto ? "Prosegui verso i piani" : "Crea l'account"}
          </Button>
        </form>
        <p className="mt-4 text-center text-sm text-muted-foreground">
          Hai già un account?{" "}
          <Link href="/login" className="font-medium text-primary hover:underline">
            Accedi
          </Link>
        </p>
      </CardContent>
    </Guscio>
  );
}

