"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { CampoData, CampoTesto } from "@/components/comune/campo";
import { Intro, pct, type ComandiGdpr, type DatiGdpr, type Esito } from "./comune";

// Vista 3 — Conformità: novantanove requisiti in dodici gruppi, ciascuno con la sua guida.
//
// ⚠️ Lo stato si sceglie con quattro pulsanti e si annulla ripremendo quello acceso: «da
// valutare» non è uno stato che si sceglie, è l'assenza di una scelta, e pesa zero.
//
// ⚠️ Il NOME ACCESSIBILE di ogni pulsante porta la chiave del requisito («P-01:
// Conforme»): più requisiti citano lo stesso articolo, e sei pulsanti con lo stesso nome
// sono sei comandi indistinguibili per un lettore di schermo (difetto già visto in ISO 37001).

const STATI = [
  { k: "c", n: "Conforme", tono: "bg-success-subtle text-success border-success/40" },
  { k: "p", n: "Parziale", tono: "bg-warning-subtle text-warning border-warning/50" },
  { k: "n", n: "Non conforme", tono: "bg-destructive/10 text-destructive border-destructive/40" },
  { k: "na", n: "Non pertinente", tono: "bg-muted text-muted-foreground border-border" },
] as const;

const FILTRI = [
  ["tutti", "Tutti"],
  ["da", "Da valutare"],
  ["aperti", "Parziali e non conformi"],
] as const;

export function VistaConformita({ dati, cmd }: { dati: DatiGdpr; cmd: ComandiGdpr }) {
  const [filtro, setFiltro] = useState<(typeof FILTRI)[number][0]>("tutti");
  const stati = new Map(dati.requisiti.map((r) => [r.requisitoKey, r]));
  const k = dati.conformita;

  return (
    <div className="space-y-6">
      <Intro titolo="Conformità ai requisiti">
        Indice {pct(k.indice)} · {k.conformi} conformi, {k.parziali} parziali, {k.nonConformi} non conformi, {k.nonPertinenti} non pertinenti,{" "}
        {k.daValutare}{" "}da valutare. Un parziale o un non conforme chiede l&apos;azione, chi la porta e per quando.
      </Intro>

      <div className="flex flex-wrap gap-2" role="group" aria-label="Filtra i requisiti">
        {FILTRI.map(([f, n]) => (
          <button
            key={f}
            onClick={() => setFiltro(f)}
            aria-pressed={filtro === f}
            className={cn(
              "rounded-full border px-3 py-1 text-sm",
              filtro === f ? "border-primary bg-primary/10 text-foreground" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {n}
          </button>
        ))}
      </div>

      {dati.catalogo.gruppi.map((g) => {
        const requisiti = dati.catalogo.requisiti
          .filter((r) => r.gruppoKey === g.key)
          .filter((r) => {
            const s = stati.get(r.key)?.stato ?? null;
            return filtro === "tutti" || (filtro === "da" ? !s : s === "p" || s === "n");
          });
        if (!requisiti.length) return null;
        const c = dati.conformitaGruppi[g.key];
        return (
          <details key={g.key} className="rounded-lg border bg-card" data-gruppo={g.key} open={filtro !== "tutti" || undefined}>
            <summary className="flex cursor-pointer list-none items-center gap-3 px-4 py-3">
              <span className="font-mono text-[12px] text-muted-foreground">{g.key}</span>
              <span className="min-w-0 flex-1 truncate font-medium">{g.nome}</span>
              <span className="hidden text-[12px] text-muted-foreground sm:inline">{g.riferimento}</span>
              <span className="w-24 text-right text-[12px] tabular-nums text-muted-foreground">
                {pct(c.indice)} · {c.valutati}/{c.totale}
              </span>
            </summary>
            <div className="border-t px-4 py-4">
              <div className="mb-4 rounded-md bg-muted/50 p-3 text-sm">
                <p>{g.definizione}</p>
                <p className="mt-2 font-medium">Che cosa verificare</p>
                <ul className="mt-1 list-disc space-y-0.5 pl-5 text-muted-foreground">
                  {g.verifiche.map((v, i) => (
                    <li key={i}>{v}</li>
                  ))}
                </ul>
                <p className="mt-2">
                  <span className="font-medium">Evidenze:</span> <span className="text-muted-foreground">{g.evidenze}</span>
                </p>
                <p className="mt-1">
                  <span className="font-medium">Attenzione:</span> <span className="text-muted-foreground">{g.attenzione}</span>
                </p>
              </div>
              <ul className="divide-y">
                {requisiti.map((r) => (
                  <Requisito key={r.key} r={r} st={stati.get(r.key)} cmd={cmd} />
                ))}
              </ul>
            </div>
          </details>
        );
      })}
    </div>
  );
}

type Def = DatiGdpr["catalogo"]["requisiti"][number];
type Stato = DatiGdpr["requisiti"][number] | undefined;

function Requisito({ r, st, cmd }: { r: Def; st: Stato; cmd: ComandiGdpr }) {
  // Ottimistico: il pulsante si accende subito e torna indietro se il server rifiuta.
  const [stato, setStato] = useState<string | null>(st?.stato ?? null);
  const [errore, setErrore] = useState<string | null>(null);
  const id = (c: string) => `gdpr-req-${r.key}-${c}`;
  const salva = (c: string) => cmd.requisito(r.key, c) as (v: unknown) => Promise<Esito>;

  async function scegli(k: string) {
    const nuovo = stato === k ? null : k;
    const prima = stato;
    setStato(nuovo);
    setErrore(null);
    const e = await salva("stato")(nuovo ?? "");
    if (!e.ok) {
      setStato(prima);
      setErrore(e.errore);
    }
  }

  const aperto = stato === "p" || stato === "n";
  return (
    <li className="py-3" data-requisito={r.key}>
      <div className="flex flex-wrap items-start gap-3">
        <span className="w-12 shrink-0 font-mono text-[12px] text-muted-foreground">{r.key}</span>
        <p className="min-w-0 flex-1 text-sm">
          {r.testo} <span className="text-[12px] text-muted-foreground">art. {r.riferimento}</span>
        </p>
        <div className="flex flex-wrap gap-1" role="group" aria-label={`Stato di ${r.key}`}>
          {STATI.map((s) => (
            <button
              key={s.k}
              onClick={() => scegli(s.k)}
              aria-pressed={stato === s.k}
              aria-label={`${r.key}: ${s.n}`}
              className={cn(
                "rounded-md border px-2 py-0.5 text-[12px]",
                stato === s.k ? s.tono : "border-transparent text-muted-foreground hover:border-border",
              )}
            >
              {s.n}
            </button>
          ))}
        </div>
      </div>
      {errore && (
        <p role="alert" className="mt-1 text-[12px] text-destructive">
          {errore}
        </p>
      )}
      <div className={cn("mt-3 grid gap-3 pl-0 sm:pl-15", aperto ? "sm:grid-cols-2" : "")}>
        <CampoTesto id={id("evidenza")} etichetta={`Evidenza ${r.key}`} etichettaNascosta valore={st?.evidenza ?? null} aiuto="Evidenza: dove si dimostra." salva={salva("evidenza")} />
        {aperto && (
          <>
            <CampoTesto id={id("azione")} etichetta="Azione correttiva" valore={st?.azione ?? null} salva={salva("azione")} />
            <CampoTesto id={id("responsabile")} etichetta="Responsabile" valore={st?.responsabile ?? null} salva={salva("responsabile")} />
            <CampoData id={id("scadenza")} etichetta="Scadenza" valore={st?.scadenza ?? null} salva={salva("scadenza")} />
          </>
        )}
      </div>
    </li>
  );
}
