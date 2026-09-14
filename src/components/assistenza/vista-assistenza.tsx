"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ArrowRight, LifeBuoy, MessageSquarePlus } from "lucide-react";
// ⚠️ Mai `toLocaleDateString`: dipende dai dati ICU del runtime, e server e browser ne
// hanno due diversi — React butterebbe via l'HTML del server con l'errore #418.
import { fmtDataBreve } from "@/lib/format";
import { FAQ } from "@/features/assistenza/faq";
import type { StatoTicket, Ticket } from "@/features/assistenza";
import { STATO_PER_UTENTE } from "@/features/assistenza/etichette";
import { apriTicketAction } from "@/features/assistenza/actions";

// L'assistenza: prima si prova a rispondere, poi si scrive.
//
// ⚠️ L'assistente è un PERCORSO, non un modello (strada A, decisa dal committente): due
// scelte — l'ambito, poi la domanda — e la risposta scritta. Ogni ramo finisce nello
// stesso posto, «non ho risolto», che apre la richiesta con l'oggetto già compilato: è la
// differenza fra una guida e un'assistenza.

export function VistaAssistenza({ ticket }: { ticket: Ticket[] }) {
  const router = useRouter();
  const [inCorso, avvia] = useTransition();
  const [categoria, setCategoria] = useState<string | null>(null);
  const [voce, setVoce] = useState<string | null>(null);
  const [scrivi, setScrivi] = useState<{ oggetto: string } | null>(null);
  const [errore, setErrore] = useState<string | null>(null);

  const cat = FAQ.find((c) => c.id === categoria) ?? null;
  const v = cat?.voci.find((x) => x.id === voce) ?? null;

  async function invia(form: FormData) {
    setErrore(null);
    const esito = await apriTicketAction({
      oggetto: String(form.get("oggetto") ?? ""),
      testo: String(form.get("testo") ?? ""),
    });
    if (!esito.ok) {
      setErrore(esito.errore);
      return;
    }
    setScrivi(null);
    setCategoria(null);
    setVoce(null);
    avvia(() => router.push(`/assistenza/${esito.dati!.id}`));
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-5 py-8" data-assistenza>
      <header className="mb-8">
        <h1 className="font-display text-2xl font-semibold tracking-tight">Assistenza</h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          Prima proviamo a rispondere subito. Se la risposta non c'è, ci scrivi e ti rispondiamo per email.
        </p>
      </header>

      {/* ── L'assistente guidato ─────────────────────────────────────────────── */}
      <section className="rounded-lg border bg-card p-5" data-assistente>
        <div className="flex items-center gap-2 text-[13px] font-medium">
          <LifeBuoy className="size-4 text-primary" aria-hidden />
          Di che cosa si tratta?
        </div>

        {!cat && (
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            {FAQ.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => {
                  setCategoria(c.id);
                  setVoce(null);
                }}
                className="rounded-md border px-3.5 py-3 text-left transition-colors hover:border-primary/40 hover:bg-accent"
              >
                <span className="block text-sm font-medium">{c.titolo}</span>
                <span className="mt-0.5 block text-[12px] text-muted-foreground">{c.quando}</span>
              </button>
            ))}
          </div>
        )}

        {cat && (
          <div className="mt-4">
            <button
              type="button"
              onClick={() => (voce ? setVoce(null) : setCategoria(null))}
              className="text-[12px] text-muted-foreground underline underline-offset-2"
            >
              ← Torna indietro
            </button>

            {!v && (
              <ul className="mt-3 divide-y rounded-md border">
                {cat.voci.map((x) => (
                  <li key={x.id}>
                    <button
                      type="button"
                      onClick={() => setVoce(x.id)}
                      className="flex w-full items-center justify-between gap-3 px-3.5 py-3 text-left text-sm transition-colors hover:bg-muted/50"
                    >
                      {x.domanda}
                      <ArrowRight className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                    </button>
                  </li>
                ))}
              </ul>
            )}

            {v && (
              <div className="mt-3 rounded-md border bg-background p-4" data-risposta={v.id}>
                <h2 className="text-sm font-semibold">{v.domanda}</h2>
                <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">{v.risposta}</p>
                {v.rimando && (
                  <Link
                    href={v.rimando.href}
                    className="mt-3 inline-flex items-center gap-1.5 text-[13px] font-medium text-primary underline underline-offset-2"
                  >
                    {v.rimando.etichetta}
                    <ArrowRight className="size-3.5" aria-hidden />
                  </Link>
                )}
                <div className="mt-4 border-t pt-3">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setScrivi({ oggetto: `${cat.titolo}: ${v.domanda}` })}
                  >
                    Non ho risolto: scrivo all'assistenza
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        {!scrivi && (
          <div className="mt-4 border-t pt-4">
            <Button size="sm" onClick={() => setScrivi({ oggetto: "" })} data-nuova-richiesta>
              <MessageSquarePlus className="size-4" aria-hidden />
              Scrivi all'assistenza
            </Button>
          </div>
        )}
      </section>

      {/* ── La richiesta ─────────────────────────────────────────────────────── */}
      {scrivi && (
        <form action={invia} className="mt-4 rounded-lg border bg-card p-5" data-form-richiesta>
          <h2 className="text-sm font-semibold">Nuova richiesta</h2>
          <div className="mt-3 grid gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="oggetto">Oggetto</Label>
              <Input
                id="oggetto"
                name="oggetto"
                defaultValue={scrivi.oggetto}
                maxLength={200}
                required
                placeholder="In poche parole, che cosa succede"
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="testo">Messaggio</Label>
              <Textarea
                id="testo"
                name="testo"
                rows={6}
                maxLength={8000}
                required
                placeholder="Che cosa stavi facendo, che cosa ti aspettavi e che cosa è successo. Se riguarda un'azienda o un documento, scrivi quale."
              />
            </div>
            {errore && (
              <p role="alert" className="text-[13px] text-destructive">
                {errore}
              </p>
            )}
            <div className="flex items-center gap-2">
              <Button type="submit" size="sm" disabled={inCorso}>
                Invia la richiesta
              </Button>
              <Button type="button" variant="ghost" size="sm" onClick={() => setScrivi(null)}>
                Annulla
              </Button>
            </div>
            <p className="text-[12px] text-muted-foreground">
              Ti rispondiamo per email, e la conversazione resta qui. La richiesta la vedi solo tu e chi ti assiste:
              i colleghi dello studio no.
            </p>
          </div>
        </form>
      )}

      {/* ── Le richieste già aperte ──────────────────────────────────────────── */}
      <section className="mt-8" data-mie-richieste>
        <h2 className="text-[13px] font-semibold uppercase tracking-wide text-muted-foreground">Le tue richieste</h2>
        {ticket.length === 0 ? (
          <p className="mt-2 text-[13px] text-muted-foreground">Non hai ancora scritto all'assistenza.</p>
        ) : (
          <ul className="mt-2 divide-y rounded-lg border bg-card">
            {ticket.map((t) => (
              <li key={t.id}>
                <Link
                  href={`/assistenza/${t.id}`}
                  className="flex items-center justify-between gap-3 px-4 py-3 transition-colors hover:bg-muted/50"
                  data-ticket={t.id}
                >
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium">{t.oggetto}</span>
                    <span className="text-[12px] text-muted-foreground">
                      Aggiornata il {fmtDataBreve(t.updatedAt)}
                    </span>
                  </span>
                  <Badge variant={t.stato === "chiuso" ? "outline" : "secondary"}>
                    {STATO_PER_UTENTE[t.stato as StatoTicket]}
                  </Badge>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
