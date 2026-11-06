"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

// Il modulo di contatto per Enterprise (6 novembre 2026), al posto della candidatura al
// Programma Fondatori, ritirato.
//
// ⚠️ Perché un modulo e non un `mailto:`. Su molti telefoni un `mailto:` non apre niente
// se non c'è un client di posta configurato: il pulsante sembra rotto, ed è una richiesta
// persa senza che nessuno lo sappia. L'indirizzo resta scritto sotto, per chi preferisce.
//
// ⚠️ E dice che cosa succede ai dati. Chi scrive non è un cliente: non ha un account, e ci
// sta lasciando nome, email e telefono. La rotta non salva nulla — la richiesta diventa
// un'email e basta — e va detto qui, dove la persona decide, non solo nell'informativa.

type Stato = "fermo" | "invio" | "fatto" | { errore: string };

function Campo({
  id,
  etichetta,
  tipo = "text",
  richiesto = false,
  autoComplete,
}: {
  id: string;
  etichetta: string;
  tipo?: string;
  richiesto?: boolean;
  autoComplete?: string;
}) {
  return (
    <div>
      <label htmlFor={`enterprise-${id}`} className="block text-[13px] font-medium">
        {etichetta}
        {!richiesto && <span className="ml-1.5 text-muted-foreground">facoltativo</span>}
      </label>
      <input
        id={`enterprise-${id}`}
        name={id}
        type={tipo}
        required={richiesto}
        autoComplete={autoComplete}
        className="mt-1.5 w-full rounded-md border bg-background px-3 py-2 text-[15px] outline-none focus-visible:ring-2 focus-visible:ring-ring"
      />
    </div>
  );
}

export function ModuloEnterprise() {
  const [stato, setStato] = useState<Stato>("fermo");
  const inCorso = stato === "invio";

  async function invia(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setStato("invio");
    try {
      const r = await fetch("/api/contatto", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(Object.fromEntries(f.entries())),
      });
      const esito = await r.json().catch(() => ({}));
      setStato(r.ok && esito.ok ? "fatto" : { errore: esito.errore ?? "Non ha funzionato. Riprova." });
    } catch {
      setStato({ errore: "Non ha funzionato. Controlla la connessione e riprova." });
    }
  }

  if (stato === "fatto") {
    return (
      <div className="rounded-xl border bg-card p-6" data-enterprise-inviato>
        <p className="font-display text-[19px] font-semibold">Richiesta ricevuta.</p>
        <p className="mt-2 text-[14px] leading-relaxed text-muted-foreground">
          Ti rispondiamo entro un giorno lavorativo. Se nel frattempo vuoi aggiungere qualcosa, scrivi a{" "}
          <a href="mailto:info@evalisdeck.it" className="underline underline-offset-4">
            info@evalisdeck.it
          </a>
          .
        </p>
      </div>
    );
  }

  return (
    // ⚠️ `method="post"` NON è decorativo: prima dell'idratazione l'invio è quello nativo, e
    // un modulo GET metterebbe nome, email e telefono nella barra degli indirizzi.
    <form method="post" onSubmit={invia} className="rounded-xl border bg-card p-6" data-modulo-enterprise>
      <div className="grid gap-4 sm:grid-cols-2">
        <Campo id="nome" etichetta="Nome e cognome" richiesto autoComplete="name" />
        <Campo id="organizzazione" etichetta="Azienda o studio" richiesto autoComplete="organization" />
        <Campo id="email" etichetta="Email" tipo="email" richiesto autoComplete="email" />
        <Campo id="telefono" etichetta="Telefono" tipo="tel" autoComplete="tel" />
      </div>

      <div className="mt-4">
        <label htmlFor="enterprise-aziende" className="block text-[13px] font-medium">
          Quante aziende pensi di seguire
          <span className="ml-1.5 text-muted-foreground">facoltativo</span>
        </label>
        <input
          id="enterprise-aziende"
          name="aziende"
          type="text"
          inputMode="numeric"
          className="mt-1.5 w-40 rounded-md border bg-background px-3 py-2 text-[15px] outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
      </div>

      <div className="mt-4">
        <label htmlFor="enterprise-messaggio" className="block text-[13px] font-medium">
          Di che cosa avete bisogno
          <span className="ml-1.5 text-muted-foreground">facoltativo</span>
        </label>
        <textarea
          id="enterprise-messaggio"
          name="messaggio"
          rows={3}
          className="mt-1.5 w-full rounded-md border bg-background px-3 py-2 text-[15px] outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
      </div>

      {/* ⚠️ Trappola per i robot: nascosta agli occhi E ai lettori di schermo, e fuori
          dall'ordine di tabulazione. Se arriva piena, la rotta risponde «va bene» e non
          manda niente. */}
      <div aria-hidden className="absolute left-[-9999px] h-0 w-0 overflow-hidden">
        <label htmlFor="enterprise-sito">Sito</label>
        <input id="enterprise-sito" name="sito" type="text" tabIndex={-1} autoComplete="off" />
      </div>

      {typeof stato === "object" && (
        <p role="alert" className="mt-4 text-[13.5px] text-destructive">
          {stato.errore}
        </p>
      )}

      <div className="mt-5 flex flex-wrap items-center gap-4">
        <Button type="submit" disabled={inCorso}>
          {inCorso ? "Invio in corso…" : "Contattaci"}
        </Button>
        <p className="text-[12.5px] leading-relaxed text-muted-foreground">
          Non salviamo niente: la richiesta ci arriva per email.{" "}
          <Link href="/privacy" className="underline underline-offset-4">
            Come trattiamo i dati
          </Link>
        </p>
      </div>
    </form>
  );
}
