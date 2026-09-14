"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { fmtDataBreve } from "@/lib/format";
import type { Messaggio, StatoTicket } from "@/features/assistenza";
import { cambiaStatoAction, rispondiAction, rispondiStaffAction } from "@/features/assistenza/actions";
import { STATO_PER_STAFF, STATO_PER_UTENTE } from "@/features/assistenza/etichette";

// La conversazione di una richiesta, dalle due parti.
//
// ⚠️ Un componente solo per l'utente e per lo staff, con `come` a decidere quale azione
// chiamare. Due copie divergerebbero: è già successo in questo progetto con i registri, e
// la seconda copia resta sempre indietro. Ciò che cambia davvero sono i COMANDI (lo stato
// lo muove solo lo staff), non il modo di mostrare i messaggi.

export function Conversazione({
  come,
  ticketId,
  oggetto,
  stato,
  messaggi,
  intestazione,
}: {
  come: "utente" | "staff";
  ticketId: string;
  oggetto: string;
  stato: StatoTicket;
  messaggi: Messaggio[];
  /** Solo per lo staff: chi ha scritto e da quale studio. */
  intestazione?: string;
}) {
  const router = useRouter();
  const [inCorso, avvia] = useTransition();
  const [errore, setErrore] = useState<string | null>(null);
  const [testo, setTesto] = useState("");

  async function invia() {
    setErrore(null);
    const esito =
      come === "staff" ? await rispondiStaffAction(ticketId, testo) : await rispondiAction(ticketId, testo);
    if (!esito.ok) {
      setErrore(esito.errore);
      return;
    }
    setTesto("");
    // ⚠️ `router.refresh()` fuori dalla richiamata della transizione: dentro, dopo il
    // commit non c'è più una transizione a cui l'aggiornamento possa restare appeso, e si
    // perde. È la correzione pagata tre volte sul portafoglio.
    avvia(() => {});
    setTimeout(() => router.refresh(), 0);
  }

  async function muovi(nuovo: StatoTicket) {
    setErrore(null);
    const esito = await cambiaStatoAction(ticketId, nuovo);
    if (!esito.ok) {
      setErrore(esito.errore);
      return;
    }
    setTimeout(() => router.refresh(), 0);
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-5 py-8" data-conversazione={ticketId}>
      <header className="mb-6">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="font-display text-xl font-semibold tracking-tight">{oggetto}</h1>
          <Badge variant={stato === "chiuso" ? "outline" : "secondary"} data-stato={stato}>
            {(come === "staff" ? STATO_PER_STAFF : STATO_PER_UTENTE)[stato]}
          </Badge>
        </div>
        {intestazione && <p className="mt-1.5 text-[13px] text-muted-foreground">{intestazione}</p>}
      </header>

      <ol className="space-y-3">
        {messaggi.map((m) => (
          <li
            key={m.id}
            data-messaggio={m.staff ? "staff" : "utente"}
            className={
              m.staff
                ? "rounded-lg border border-primary/25 bg-accent p-4"
                : "rounded-lg border bg-card p-4"
            }
          >
            <div className="mb-1.5 flex items-center justify-between gap-3 text-[12px] text-muted-foreground">
              <span className="font-medium">{m.staff ? "Assistenza EvalisDeck" : "La richiesta"}</span>
              <span>{fmtDataBreve(m.createdAt)}</span>
            </div>
            <p className="whitespace-pre-wrap text-[13px] leading-relaxed">{m.testo}</p>
          </li>
        ))}
      </ol>

      <div className="mt-6 rounded-lg border bg-card p-4">
        <Label htmlFor="risposta">{come === "staff" ? "Rispondi allo studio" : "Aggiungi un messaggio"}</Label>
        <Textarea
          id="risposta"
          className="mt-1.5"
          rows={5}
          maxLength={8000}
          value={testo}
          onChange={(e) => setTesto(e.target.value)}
          placeholder={come === "staff" ? "La risposta arriva per email a chi ha scritto." : "Scrivi qui."}
        />
        {errore && (
          <p role="alert" className="mt-2 text-[13px] text-destructive">
            {errore}
          </p>
        )}
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Button size="sm" onClick={invia} disabled={inCorso || !testo.trim()} data-invia>
            Invia
          </Button>
          {come === "staff" &&
            (stato === "chiuso" ? (
              <Button size="sm" variant="outline" onClick={() => muovi("aperto")} data-riapri>
                Riapri
              </Button>
            ) : (
              <Button size="sm" variant="outline" onClick={() => muovi("chiuso")} data-chiudi>
                Segna come risolta
              </Button>
            ))}
        </div>
        {come === "utente" && stato === "chiuso" && (
          <p className="mt-2 text-[12px] text-muted-foreground">
            La richiesta è segnata come risolta. Se scrivi ancora, torna aperta.
          </p>
        )}
      </div>
    </div>
  );
}
