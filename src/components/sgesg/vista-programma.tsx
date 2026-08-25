"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CampoTesto } from "@/components/comune/campo";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Check, CircleDashed, Play } from "lucide-react";
import type { VistaProgramma } from "@/features/sgesg/programma";
import type { StatoFase } from "@/lib/calc/sgesg/avanzamento";
import { setCampoProgrammaAction, setNotaFaseAction, setStatoFaseAction } from "@/features/sgesg/actions";

// Le otto fasi del metodo, viste come un percorso da attraversare.
//
// ⚠️ NON è uno stepper a passi bloccanti, ed è una scelta. Nelle otto fasi si lavora
// avanti e indietro — la materialità si riapre quando la diagnosi trova qualcosa, i dati
// si rifanno quando la strategia cambia un target — e uno stepper che pretende l'ordine
// costringerebbe a barare per procedere. È la stessa ragione per cui l'autovalutazione
// fornitore è sei viste e non uno stepper: certe cose si consultano, non si percorrono.

const ETICHETTA: Record<StatoFase, string> = {
  da_avviare: "Da avviare",
  in_corso: "In corso",
  conclusa: "Conclusa",
};

const STANDARD = [
  { v: "ESRS", n: "ESRS (VSME)" },
  { v: "GRI", n: "GRI" },
  { v: "ENTRAMBI", n: "Entrambi" },
] as const;

const STATI_PROGRAMMA = [
  { v: "avvio", n: "In avvio" },
  { v: "in_corso", n: "In corso" },
  { v: "sospeso", n: "Sospeso" },
  { v: "concluso", n: "Concluso" },
] as const;

export function VistaProgrammaEsg({
  companyId,
  nomeAzienda,
  vista,
  soloLettura,
}: {
  companyId: string;
  nomeAzienda: string;
  vista: VistaProgramma;
  soloLettura?: boolean;
}) {
  const router = useRouter();
  const { programma: p, fasi, avanzamento: av } = vista;
  const [inCorso, avvia] = useTransition();
  const [errore, setErrore] = useState<string | null>(null);
  const [daAggiornare, setDaAggiornare] = useState(false);
  // Stato ottimistico dei comandi: un interruttore che aspetta il viaggio di rete si
  // legge come rotto. Si ripristina da solo se il server rifiuta.
  const [ottimistico, setOttimistico] = useState<Record<string, StatoFase>>({});

  if (daAggiornare && !inCorso) {
    setDaAggiornare(false);
    router.refresh();
  }

  const campo = (c: Parameters<typeof setCampoProgrammaAction>[3]) => async (v: string | null) => {
    const esito = await setCampoProgrammaAction(companyId, p.anno, p.id, c, v);
    if (esito.ok) setDaAggiornare(true);
    return esito;
  };

  function cambiaStato(faseKey: string, stato: StatoFase) {
    const precedente = ottimistico[faseKey] ?? fasi.find((f) => f.key === faseKey)?.stato ?? "da_avviare";
    setOttimistico((o) => ({ ...o, [faseKey]: stato }));
    setErrore(null);
    avvia(async () => {
      const esito = await setStatoFaseAction(companyId, p.anno, p.id, faseKey, stato);
      if (!esito.ok) {
        setOttimistico((o) => ({ ...o, [faseKey]: precedente }));
        setErrore(esito.errore);
        return;
      }
      setDaAggiornare(true);
    });
  }

  const statoDi = (k: string, base: StatoFase) => ottimistico[k] ?? base;

  return (
    <div className="mx-auto w-full max-w-4xl" data-sgesg="">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
        Sistema di gestione ESG
      </p>
      <h1 className="font-display mt-1 text-2xl font-semibold tracking-tight">{nomeAzienda}</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Esercizio {p.anno} · le otto fasi del metodo
      </p>

      {/* ── avanzamento ─────────────────────────────────────────────────────── */}
      <dl className="mt-5 flex flex-wrap items-baseline gap-x-8 gap-y-3 border-y py-4">
        <div className="flex items-baseline gap-2">
          <dd className="text-xl font-semibold tracking-tight" data-slot="kpi" data-avanzamento={av.percentuale}>
            {av.percentuale}%
          </dd>
          <dt className="text-[13px] text-muted-foreground">avanzamento</dt>
        </div>
        <div className="flex items-baseline gap-2">
          <dd className="text-xl font-semibold tracking-tight" data-slot="kpi">
            {av.concluse}
            <span className="text-muted-foreground">/{av.totali}</span>
          </dd>
          <dt className="text-[13px] text-muted-foreground">
            {av.concluse === 1 ? "fase conclusa" : "fasi concluse"}
          </dt>
        </div>
        {av.prossima && (
          <div className="text-[13px] text-muted-foreground">
            Prossima: <b className="text-foreground">{fasi.find((f) => f.key === av.prossima)?.nome}</b>
          </div>
        )}
      </dl>

      {/* ⚠️ La barra dice quanto è CONCLUSO, non quanto è stato toccato: una fase
          aperta e lasciata a metà non è mezzo lavoro fatto, e mostrarla come tale
          farebbe consegnare un programma che si crede più avanti di dov'è. */}
      <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div
          className="h-full bg-area-ecosostenibilita transition-[width] duration-500"
          style={{ width: `${av.percentuale}%` }}
        />
      </div>

      {errore && (
        <p className="mt-3 text-[13px] text-destructive" role="alert">
          {errore}
        </p>
      )}

      {/* ── scheda del programma ────────────────────────────────────────────── */}
      <section className="mt-8" aria-labelledby="prog-scheda">
        <h2 id="prog-scheda" className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Il programma
        </h2>
        <div className="mt-3 grid gap-4 rounded-xl border p-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="space-y-1.5">
            <label htmlFor="pg-standard" className="text-sm font-medium">
              Standard
            </label>
            <select
              id="pg-standard"
              defaultValue={p.standard}
              disabled={soloLettura}
              className="h-9 w-full rounded-md border bg-transparent px-3 text-sm"
              onChange={(e) =>
                avvia(async () => {
                  const esito = await setCampoProgrammaAction(companyId, p.anno, p.id, "standard", e.target.value);
                  if (!esito.ok) setErrore(esito.errore);
                  else setDaAggiornare(true);
                })
              }
            >
              {STANDARD.map((s) => (
                <option key={s.v} value={s.v}>
                  {s.n}
                </option>
              ))}
            </select>
            <p className="text-[12px] text-muted-foreground">Decide l&apos;indice dei contenuti del documento.</p>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="pg-stato" className="text-sm font-medium">
              Stato del lavoro
            </label>
            <select
              id="pg-stato"
              defaultValue={p.stato}
              disabled={soloLettura}
              className="h-9 w-full rounded-md border bg-transparent px-3 text-sm"
              onChange={(e) =>
                avvia(async () => {
                  const esito = await setCampoProgrammaAction(companyId, p.anno, p.id, "stato", e.target.value);
                  if (!esito.ok) setErrore(esito.errore);
                  else setDaAggiornare(true);
                })
              }
            >
              {STATI_PROGRAMMA.map((s) => (
                <option key={s.v} value={s.v}>
                  {s.n}
                </option>
              ))}
            </select>
          </div>

          <CampoTesto
            id="pg-responsabile"
            etichetta="Responsabile"
            valore={p.responsabile}
            aiuto="Chi dello studio segue il lavoro"
            salva={campo("responsabile")}
          />
          <CampoTesto
            id="pg-inizio"
            etichetta="Inizio"
            valore={p.dataInizio}
            aiuto="AAAA-MM-GG"
            salva={campo("dataInizio")}
          />
          <CampoTesto
            id="pg-fine"
            etichetta="Fine prevista"
            valore={p.dataFine}
            aiuto="AAAA-MM-GG"
            salva={campo("dataFine")}
          />
          <div className="sm:col-span-2 lg:col-span-1">
            <CampoTesto id="pg-note" etichetta="Note" valore={p.note} multiriga salva={campo("note")} />
          </div>
        </div>
      </section>

      {/* ── le otto fasi ────────────────────────────────────────────────────── */}
      <section className="mt-8" aria-labelledby="prog-fasi">
        <h2 id="prog-fasi" className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Le fasi del metodo
        </h2>
        <ul className="mt-3 space-y-3" data-fasi="">
          {fasi.map((f) => {
            const stato = statoDi(f.key, f.stato);
            return (
              <li key={f.key} className="rounded-xl border p-4" data-fase={f.key} data-stato={stato}>
                <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
                      <span className="font-mono text-[11px] uppercase tracking-wide text-muted-foreground">
                        {f.codice}
                      </span>
                      <h3 className="text-[15px] font-semibold tracking-tight">{f.nome}</h3>
                      <Badge variant={stato === "conclusa" ? "default" : "outline"}>{ETICHETTA[stato]}</Badge>
                    </div>
                    <p className="mt-1.5 max-w-prose text-[13px] leading-relaxed text-muted-foreground">
                      {f.scopo}
                    </p>
                  </div>

                  {!soloLettura && (
                    <div className="flex shrink-0 items-center gap-1">
                      {/* ⚠️ Tre comandi espliciti e non un ciclo su un pulsante solo:
                          «avanza» costringerebbe a passare per «in corso» per tornare
                          indietro, e a indovinare dove si finisce. Il nome accessibile
                          porta la FASE, perché otto fasi con lo stesso nome di comando
                          sono otto pulsanti identici per un lettore di schermo. */}
                      <Button
                        variant="ghost"
                        size="sm"
                        aria-label={`${f.nome}: segna da avviare`}
                        aria-pressed={stato === "da_avviare"}
                        data-comando="da_avviare"
                        onClick={() => cambiaStato(f.key, "da_avviare")}
                      >
                        <CircleDashed className="size-4" aria-hidden />
                      </Button>
                      <Button
                        variant={stato === "in_corso" ? "secondary" : "ghost"}
                        size="sm"
                        aria-label={`${f.nome}: segna in corso`}
                        aria-pressed={stato === "in_corso"}
                        data-comando="in_corso"
                        onClick={() => cambiaStato(f.key, "in_corso")}
                      >
                        <Play className="size-4" aria-hidden />
                      </Button>
                      <Button
                        variant={stato === "conclusa" ? "default" : "ghost"}
                        size="sm"
                        aria-label={`${f.nome}: segna conclusa`}
                        aria-pressed={stato === "conclusa"}
                        data-comando="conclusa"
                        onClick={() => cambiaStato(f.key, "conclusa")}
                      >
                        <Check className="size-4" aria-hidden />
                      </Button>
                    </div>
                  )}
                </div>

                {!soloLettura && (
                  <details className="group mt-3">
                    <summary className="cursor-pointer list-none text-[12px] text-muted-foreground marker:content-none hover:text-foreground">
                      <span className="group-open:hidden">+ note della fase</span>
                      <span className="hidden group-open:inline">− chiudi</span>
                    </summary>
                    <div className="mt-2">
                      <CampoTesto
                        // L'identificativo porta la chiave della fase: otto campi sulla
                        // stessa pagina con lo stesso `id` farebbero puntare l'etichetta
                        // dell'uno al campo dell'altro.
                        id={`fase-${f.key}-note`}
                        etichetta="Note"
                        etichettaNascosta
                        valore={f.note}
                        multiriga
                        salva={async (v) => {
                          const esito = await setNotaFaseAction(companyId, p.anno, p.id, f.key, v);
                          if (esito.ok) setDaAggiornare(true);
                          return esito;
                        }}
                      />
                    </div>
                  </details>
                )}
              </li>
            );
          })}
        </ul>
      </section>

      <p className="mt-8 max-w-prose text-[12px] leading-relaxed text-muted-foreground">
        Le schede da compilare dentro ciascuna fase, e i documenti che il percorso produce, arrivano nelle
        fasi successive del piano di sviluppo.
      </p>
    </div>
  );
}
