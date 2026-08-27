"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

// Il modulo di candidatura al Programma Fondatori.
//
// ⚠️ Perché un modulo e non un `mailto:`. Su molti telefoni un `mailto:` non apre niente
// se non c'è un client di posta configurato: il pulsante sembra rotto, e per un richiamo
// «posti limitati» che si legge soprattutto da telefono è una candidatura persa senza
// che nessuno lo sappia. L'indirizzo resta scritto sotto, per chi preferisce scrivere.
//
// ⚠️ E dice che cosa succede ai dati. Chi si candida non è un cliente: non ha accettato
// niente, non ha un account, e ci sta lasciando nome, email e telefono. La rotta non
// salva nulla — la candidatura diventa un'email e basta — e va detto qui, dove la
// persona decide, non solo nell'informativa.

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
      <label htmlFor={id} className="block text-[13px] font-medium text-sidebar-foreground/85">
        {etichetta}
        {!richiesto && <span className="ml-1.5 text-sidebar-foreground/45">facoltativo</span>}
      </label>
      <input
        id={id}
        name={id}
        type={tipo}
        required={richiesto}
        autoComplete={autoComplete}
        className="mt-1.5 w-full rounded-md border border-sidebar-foreground/25 bg-sidebar-accent/70 px-3 py-2 text-[15px] text-white outline-none placeholder:text-sidebar-foreground/40 focus-visible:ring-2 focus-visible:ring-sidebar-primary"
      />
    </div>
  );
}

export function ModuloFondatori() {
  const [stato, setStato] = useState<Stato>("fermo");
  const inCorso = stato === "invio";

  async function invia(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setStato("invio");
    try {
      const r = await fetch("/api/fondatori", {
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
      <div className="rounded-xl border border-sidebar-border bg-sidebar-accent/30 p-6">
        <p className="font-display text-[19px] font-semibold text-white">Candidatura ricevuta.</p>
        <p className="mt-2 text-[14px] leading-relaxed text-sidebar-foreground/75">
          Ti rispondiamo entro pochi giorni lavorativi. Se nel frattempo vuoi aggiungere qualcosa, scrivi a{" "}
          <a href="mailto:info@evalisdeck.it" className="underline underline-offset-4">
            info@evalisdeck.it
          </a>
          .
        </p>
      </div>
    );
  }

  return (
    // ⚠️ `method="post"` NON e' decorativo. Un <form onSubmit> senza method e' un modulo
    // GET: finche' React e' attivo `preventDefault` ferma tutto, ma PRIMA
    // DELL'IDRATAZIONE l'invio e' quello nativo, e i campi finiscono nella query string.
    // Qui dentro ci sono nome, email e telefono di una persona: andrebbero nella barra
    // degli indirizzi, nella cronologia, nei log di ogni proxy e nel Referer.
    // Trovato dalla guardia `moduli-post-pure`, scritta il 27 agosto per lo stesso
    // difetto sui sedici moduli di accesso — e su questo, nuovo di un'ora, ha morso.
    <form method="post" onSubmit={invia} className="rounded-xl border border-sidebar-border bg-sidebar-accent/25 p-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <Campo id="nome" etichetta="Nome e cognome" richiesto autoComplete="name" />
        <Campo id="studio" etichetta="Studio" autoComplete="organization" />
        <Campo id="email" etichetta="Email" tipo="email" richiesto autoComplete="email" />
        <Campo id="telefono" etichetta="Telefono" tipo="tel" autoComplete="tel" />
      </div>

      <div className="mt-4">
        <label htmlFor="messaggio" className="block text-[13px] font-medium text-sidebar-foreground/85">
          Su quali aziende pensi di usarlo
          <span className="ml-1.5 text-sidebar-foreground/45">facoltativo</span>
        </label>
        <textarea
          id="messaggio"
          name="messaggio"
          rows={3}
          className="mt-1.5 w-full rounded-md border border-sidebar-foreground/25 bg-sidebar-accent/70 px-3 py-2 text-[15px] text-white outline-none focus-visible:ring-2 focus-visible:ring-sidebar-primary"
        />
      </div>

      {/* ⚠️ Trappola per i robot: nascosta agli occhi E ai lettori di schermo, e fuori
          dall'ordine di tabulazione. Un umano non la compila mai; se arriva piena, la
          rotta risponde «va bene» e non manda niente. */}
      <div aria-hidden className="absolute left-[-9999px] h-0 w-0 overflow-hidden">
        <label htmlFor="sito">Sito</label>
        <input id="sito" name="sito" type="text" tabIndex={-1} autoComplete="off" />
      </div>

      {typeof stato === "object" && (
        <p role="alert" className="mt-4 text-[13.5px] text-destructive-foreground">
          {stato.errore}
        </p>
      )}

      <div className="mt-5 flex flex-wrap items-center gap-4">
        <Button type="submit" variant="secondary" disabled={inCorso}>
          {inCorso ? "Invio in corso…" : "Candidati al Programma"}
        </Button>
        <p className="text-[12.5px] leading-relaxed text-sidebar-foreground/55">
          Non salviamo niente: la candidatura ci arriva per email.{" "}
          <Link href="/privacy" className="underline underline-offset-4">
            Come trattiamo i dati
          </Link>
        </p>
      </div>
    </form>
  );
}
