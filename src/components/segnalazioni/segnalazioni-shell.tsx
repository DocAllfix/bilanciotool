"use client";

import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { PannelloPubblicazione } from "@/components/documento/pannello-pubblicazione";
import { SENZA_ESERCIZIO } from "@/features/documents/tipi";
import { VistaQuadro } from "./vista-quadro";
import { VistaAssetto } from "./vista-assetto";
import { VistaCanale } from "./vista-canale";
import { VistaRegistro } from "./vista-registro";
import { VistaConformita } from "./vista-conformita";
import { SezioneCorpus, vociCorpus, type DatiCorpus, type VistaCorpus } from "@/components/corpus/sezione-corpus";
import type { DatiSegnalazioni } from "./types";

// La gestione delle segnalazioni è un fascicolo che si consulta, non un percorso a
// passi: cinque viste di lavoro più i documenti. La vista sta nell'indirizzo, quindi si
// manda a un collega e sopravvive al tasto indietro.

const VISTE = [
  { k: "quadro", n: "Quadro" },
  { k: "assetto", n: "Assetto" },
  { k: "canale", n: "Canale" },
  { k: "registro", n: "Segnalazioni" },
  { k: "conformita", n: "Conformità" },
  // Le tre viste del CORPUS, uguali in tutti i moduli di conformità.
  { k: "procedure", n: "Procedure" },
  { k: "moduli", n: "Modulistica" },
  { k: "registri", n: "Registri" },
  { k: "documenti", n: "Documenti" },
] as const;

const VISTE_CORPUS: readonly string[] = ["procedure", "moduli", "registri"];

export function SegnalazioniShell({
  companyId,
  dati,
  vistaIniziale,
  oggi,
  corpus,
  contatoriCorpus,
}: {
  companyId: string;
  dati: DatiSegnalazioni;
  vistaIniziale: string;
  corpus: DatiCorpus;
  contatoriCorpus: { procedure: number; moduli: number; approvate: number };
  /** ⚠️ Dal server: in un componente client sarebbe l'orologio del browser, e i termini
   *  «in scadenza» cambierebbero fra il render del server e l'idratazione. */
  oggi: string;
}) {
  const router = useRouter();
  const vista = VISTE.some((v) => v.k === vistaIniziale) ? vistaIniziale : "quadro";
  const vai = (v: string) => router.replace(`/aziende/${companyId}/segnalazioni?vista=${v}`, { scroll: false });

  const aperte = dati.fascicoli.filter((f) => f.stato !== "Chiusa" && f.stato !== "Archiviata").length;
  const contatore: Record<string, string | null> = {
    quadro: dati.conformita.indice === null ? null : `${dati.conformita.indice}%`,
    assetto: null,
    canale: `${dati.canale.stato.coperte.length}/3`,
    registro: `${aperte}/${dati.fascicoli.length}`,
    conformita: `${dati.conformita.valutati}/${dati.conformita.totale}`,
    // ⚠️ I contatori del corpus arrivano da una lettura DEDICATA, non dai dati della
    // vista: la barra li mostra sempre, e caricare 447 documenti per scrivere tre numeri
    // sarebbe il costo peggiore del prodotto.
    procedure: `${contatoriCorpus.approvate}/${contatoriCorpus.procedure}`,
    moduli: String(contatoriCorpus.moduli),
    registri: corpus.registri.length ? String(corpus.registri.reduce((a, r) => a + r.righe, 0)) : null,
    documenti: null,
  };

  return (
    <div className="mx-auto w-full max-w-6xl">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground">Gestione delle segnalazioni · D.Lgs. 24/2023</p>
          <h1 className="truncate font-display text-2xl font-semibold">{dati.azienda.nome}</h1>
        </div>
        <p className="text-[12px] text-muted-foreground">
          {dati.canale.stato.conforme ? "Canale a norma" : "Canale non conforme all'art. 4"}
        </p>
      </div>

      <nav className="mt-5 flex flex-wrap gap-1 border-b" aria-label="Viste del modulo">
        {VISTE.map((v) => (
          <button
            key={v.k}
            onClick={() => vai(v.k)}
            data-tour={`wb-vista-${v.k}`}
            aria-current={vista === v.k ? "page" : undefined}
            className={cn(
              "-mb-px border-b-2 px-3 py-2 text-[13px] transition-colors",
              vista === v.k
                ? "border-area-compliance font-medium text-foreground"
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
        {vista === "quadro" && <VistaQuadro dati={dati} oggi={oggi} vai={vai} />}
        {vista === "assetto" && <VistaAssetto companyId={companyId} dati={dati} />}
        {vista === "canale" && <VistaCanale companyId={companyId} dati={dati} />}
        {vista === "registro" && <VistaRegistro companyId={companyId} dati={dati} oggi={oggi} />}
        {vista === "conformita" && <VistaConformita companyId={companyId} dati={dati} />}
        {VISTE_CORPUS.includes(vista) && (
          <SezioneCorpus
            companyId={companyId}
            contentSetId={dati.assetto.contentSetId}
            vista={vista as VistaCorpus}
            rotta={`/aziende/${companyId}/segnalazioni`}
            dati={corpus}
          />
        )}
        {vista === "documenti" && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              La relazione periodica riferisce all&apos;organo di controllo sull&apos;assetto del canale, sul
              rispetto dei termini e sulla conformità del sistema. <strong>Non contiene</strong> l&apos;identità
              delle persone segnalanti né il contenuto delle segnalazioni: i dati sono aggregati o limitati agli
              estremi di processo, come impone l&apos;art. 12.
            </p>
            <p className="text-sm text-muted-foreground">
              Pubblicare congela la situazione al giorno della pubblicazione, compreso il giudizio sui termini:
              una relazione consegnata non deve cambiare verdetto col passare delle settimane.
            </p>
            {/* Il completamento e' la conformita' valutata: sotto il 60% il pannello
                avvisa che il documento mostrera' le lacune. Qui e' il numero giusto —
                una relazione resa con settanta requisiti su ottantadue non guardati
                riferisce all'organo di controllo cio' che nessuno ha verificato. */}
            <PannelloPubblicazione
              companyId={companyId}
              tipo="relazione_wb"
              anno={SENZA_ESERCIZIO}
              readyPct={dati.conformita.indice ?? 0}
            />
          </div>
        )}
      </div>
    </div>
  );
}
