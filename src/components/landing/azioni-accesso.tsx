"use client";

import Link from "next/link";
import { authClient } from "@/lib/auth/client";
import { Button } from "@/components/ui/button";

// I due comandi in alto a destra dell'intestazione pubblica.
//
// La sessione si chiede dal BROWSER e non dal server, ed è una correzione, non un vezzo.
// Leggendola sul server, `headers()` rendeva impossibile generare come pagina statica
// qualunque pagina che monta questa intestazione: gli articoli del blog pubblicati dopo
// l'ultimo rilascio — cioè tutti — andavano in errore 500 alla prima visita, e la home
// veniva ricostruita a ogni singola richiesta solo per decidere l'etichetta di un
// pulsante. Una comodità non può costare la staticità di tutto il sito pubblico.
//
// Finché la risposta non arriva si mostra lo stato del visitatore anonimo: è quello di
// quasi chiunque apra una pagina pubblica, e per chi è già dentro significa vedere
// «Accedi» per un istante invece del contrario, che sarebbe più fastidioso.

export function AzioniAccesso() {
  const { data: sessione, isPending } = authClient.useSession();

  if (!isPending && sessione) {
    return (
      <Button size="sm" asChild>
        <Link href="/dashboard">Vai al portafoglio</Link>
      </Button>
    );
  }

  return (
    <>
      <Button variant="ghost" size="sm" asChild className="text-muted-foreground">
        <Link href="/login">Accedi</Link>
      </Button>
      {/* Solo da schermo largo: tre pulsanti in una barra alta quattordici unita' si
          accavallano su un telefono. Li' l'attivazione la offre il secondo pulsante
          dell'hero, che e' sopra la piega. */}
      <Button variant="outline" size="sm" asChild className="hidden md:inline-flex">
        <Link href="/attiva">Attiva il servizio</Link>
      </Button>
      <Button size="sm" asChild>
        <Link href="/registrati">Prova la demo guidata</Link>
      </Button>
    </>
  );
}
