"use client";

import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { PannelloPubblicazione } from "@/components/documento/pannello-pubblicazione";
import { SENZA_ESERCIZIO } from "@/features/documents/tipi";
import { SezioneCorpus, type DatiCorpus, type VistaCorpus } from "@/components/corpus/sezione-corpus";
import { VistaQuadro } from "./vista-quadro";
import { VistaProgramma } from "./vista-programma";
import { VistaPartner } from "./vista-partner";
import type { DatiFilieraPieno } from "./types";

// Due diligence di filiera: quadro, programma, partner, le tre del corpus e i documenti.

const VISTE = [
  { k: "quadro", n: "Quadro" },
  { k: "programma", n: "Programma" },
  { k: "partner", n: "Partner" },
  { k: "procedure", n: "Procedure" },
  { k: "moduli", n: "Modulistica" },
  { k: "registri", n: "Registri" },
  { k: "documenti", n: "Documenti" },
] as const;

const VISTE_CORPUS: readonly string[] = ["procedure", "moduli", "registri"];

export function FilieraShell({
  companyId,
  dati,
  vistaIniziale,
  partnerAperto,
  corpus,
  contatoriCorpus,
}: {
  companyId: string;
  dati: DatiFilieraPieno;
  vistaIniziale: string;
  partnerAperto: string | null;
  corpus: DatiCorpus;
  contatoriCorpus: { procedure: number; moduli: number; approvate: number };
}) {
  const router = useRouter();
  const vista = VISTE.some((v) => v.k === vistaIniziale) ? vistaIniziale : "quadro";
  const base = `/aziende/${companyId}/filiera`;
  const vai = (v: string) => router.replace(`${base}?vista=${v}`, { scroll: false });
  // Il partner aperto sta NELL'INDIRIZZO: si condivide, e il tasto indietro chiude la
  // scheda invece di uscire dal modulo.
  const apri = (id: string | null) =>
    router.replace(id ? `${base}?vista=partner&p=${id}` : `${base}?vista=partner`, { scroll: false });

  const q = dati.quadro;
  const contatore: Record<string, string | null> = {
    quadro: `${q.coperturaSpesa}%`,
    programma: null,
    partner: `${q.valutati}/${q.partnerVivi}`,
    procedure: `${contatoriCorpus.approvate}/${contatoriCorpus.procedure}`,
    moduli: String(contatoriCorpus.moduli),
    registri: corpus.registri.length ? String(corpus.registri.reduce((a, r) => a + r.righe, 0)) : null,
    documenti: null,
  };

  return (
    <div className="mx-auto w-full max-w-6xl">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground">
            Due diligence di filiera · Linee guida OCSE · Direttiva (UE) 2024/1760
          </p>
          <h1 className="truncate font-display text-2xl font-semibold">{dati.azienda.nome}</h1>
        </div>
        <p className="text-[12px] text-muted-foreground">
          {q.partnerVivi} partner in essere · copertura {q.coperturaSpesa}% della spesa
        </p>
      </div>

      <nav className="mt-5 flex flex-wrap gap-1 border-b" aria-label="Viste del modulo">
        {VISTE.map((v) => (
          <button
            key={v.k}
            onClick={() => vai(v.k)}
            data-tour={`fil-vista-${v.k}`}
            aria-current={vista === v.k ? "page" : undefined}
            className={cn(
              "-mb-px border-b-2 px-3 py-2 text-[13px] transition-colors",
              vista === v.k
                ? "border-area-filiera font-medium text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            {v.n}
            {contatore[v.k] && (
              <span className="ml-1.5 font-mono text-[11px] tabular-nums text-muted-foreground">
                {contatore[v.k]}
              </span>
            )}
          </button>
        ))}
      </nav>

      <div className="py-6">
        {vista === "quadro" && <VistaQuadro dati={dati} vai={vai} />}
        {vista === "programma" && <VistaProgramma companyId={companyId} dati={dati} />}
        {vista === "partner" && (
          <VistaPartner companyId={companyId} dati={dati} apertoId={partnerAperto} apri={apri} />
        )}
        {VISTE_CORPUS.includes(vista) && (
          <SezioneCorpus
            companyId={companyId}
            contentSetId={dati.programma.contentSetId}
            vista={vista as VistaCorpus}
            rotta={base}
            dati={corpus}
          />
        )}
        {vista === "documenti" && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              La <strong>Dichiarazione annuale</strong> è l&apos;unico documento del prodotto con un obbligo di
              pubblicazione dietro: la direttiva all&apos;articolo 16 chiede che sia resa accessibile. Per
              questo porta anche il registro dei partner e non solo i numeri aggregati — chi la riceve deve
              poter risalire dal numero alla riga che lo produce.
            </p>
            <PannelloPubblicazione
              companyId={companyId}
              tipo="dichiarazione_filiera"
              anno={SENZA_ESERCIZIO}
              readyPct={q.coperturaSpesa}
            />
          </div>
        )}
      </div>
    </div>
  );
}
