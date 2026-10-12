"use client";

import { useRouter } from "next/navigation";

import { cn } from "@/lib/utils";
import { PannelloPubblicazione } from "@/components/documento/pannello-pubblicazione";
import { SENZA_ESERCIZIO } from "@/features/documents/tipi";
import { useGdpr, type DatiGdpr } from "./comune";
import { VistaQuadro } from "./vista-quadro";
import { VistaOrganizzazione } from "./vista-organizzazione";
import { VistaTrattamenti } from "./vista-trattamenti";
import { VistaConformita } from "./vista-conformita";
import { VistaRischi } from "./vista-rischi";
import { VistaPolitica } from "./vista-politica";
import { VistaIndicatori } from "./vista-indicatori";
import { VistaRegistri } from "./vista-registri";
import { VistaVerifica } from "./vista-verifica";

// Il percorso Protezione dei dati è un FASCICOLO che si consulta, non uno stepper: il
// registro si riapre quando arriva un trattamento nuovo, la conformità si riprende dove si
// era lasciata. Le chiavi delle viste sono quelle dei segnali del motore, così un segnale
// porta dritto dove si rimedia.

const VISTE = [
  { k: "quadro", n: "Quadro" },
  { k: "org", n: "Organizzazione" },
  { k: "trat", n: "Trattamenti" },
  { k: "gap", n: "Conformità" },
  { k: "ris", n: "Rischi e responsabili" },
  { k: "pol", n: "Politica e piano" },
  { k: "dati", n: "Indicatori" },
  { k: "reg", n: "Registri" },
  { k: "verifica", n: "Verifica" },
  { k: "documenti", n: "Documenti" },
] as const;

const DOCUMENTI = [
  { tipo: "registro_trattamenti", nota: "Il registro dell'art. 30, una scheda per trattamento." },
  { tipo: "modello_privacy", nota: "Organizzazione, regole, rischi, responsabili, registri e conformità in un documento solo." },
  { tipo: "politica_privacy", nota: "Il testo della politica, con approvazione e firma." },
  { tipo: "dpia", nota: "Il vaglio dei trattamenti e una scheda per ogni valutazione d'impatto necessaria." },
  { tipo: "conformita_gdpr", nota: "L'indice, il piano di adeguamento e il dettaglio dei requisiti." },
  { tipo: "relazione_privacy", nota: "La relazione dell'esercizio scelto, con il confronto sull'anno precedente." },
] as const;

export function GdprShell({
  companyId,
  dati,
  vistaIniziale,
  anniDisponibili,
}: {
  companyId: string;
  dati: DatiGdpr;
  vistaIniziale: string;
  anniDisponibili: number[];
}) {
  const router = useRouter();
  const cmd = useGdpr(companyId, dati.sistema.id);
  const vista = VISTE.some((v) => v.k === vistaIniziale) ? vistaIniziale : "quadro";
  const indirizzo = (v: string, anno = dati.anno) => `/aziende/${companyId}/gdpr?vista=${v}&anno=${anno}`;
  const vai = (v: string) => router.replace(indirizzo(v), { scroll: false });

  const k = dati.conformita;
  const contatore: Record<string, string | null> = {
    quadro: `${dati.avanzamento.percentuale}%`,
    org: null,
    trat: String(dati.trattamenti.length),
    gap: `${k.valutati}/${k.totale}`,
    ris: String(dati.fornitori.length),
    pol: null,
    dati: null,
    reg: null,
    verifica: dati.verifica.aperte ? String(dati.verifica.aperte) : null,
    documenti: null,
  };

  return (
    <div className="mx-auto w-full max-w-6xl">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground">Protezione dei dati personali · Reg. (UE) 2016/679 · D.Lgs. 196/2003</p>
          <h1 className="truncate font-display text-2xl font-semibold tracking-tight">{dati.azienda.nome}</h1>
        </div>
        <label className="flex items-center gap-2 text-sm text-muted-foreground" data-tour="gdpr-esercizio">
          Esercizio
          <select
            className="h-8 rounded-md border bg-background px-2 text-sm text-foreground"
            value={dati.anno}
            onChange={(e) => router.replace(indirizzo(vista, Number(e.currentTarget.value)), { scroll: false })}
          >
            {anniDisponibili.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
        </label>
      </div>

      <nav className="mt-5 flex flex-wrap gap-1 border-b" aria-label="Viste del modulo">
        {VISTE.map((v) => (
          <button
            key={v.k}
            onClick={() => vai(v.k)}
            data-tour={`gdpr-vista-${v.k}`}
            aria-current={vista === v.k ? "page" : undefined}
            className={cn(
              "-mb-px border-b-2 px-3 py-2 text-sm transition-colors",
              vista === v.k ? "border-primary font-medium text-foreground" : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            {v.n}
            {contatore[v.k] && " "}
            {contatore[v.k] && <span className="ml-1.5 text-[11px] tabular-nums text-muted-foreground">{contatore[v.k]}</span>}
          </button>
        ))}
      </nav>

      {/* `key` sul sistema e sull'esercizio: i campi salvano sfocandosi e non sono
          controllati, quindi cambiando anno devono rinascere coi valori di quell'anno. */}
      <div className="mt-6" key={`${vista}-${dati.anno}`}>
        {vista === "quadro" && <VistaQuadro dati={dati} vai={vai} />}
        {vista === "org" && <VistaOrganizzazione dati={dati} cmd={cmd} />}
        {vista === "trat" && <VistaTrattamenti dati={dati} cmd={cmd} />}
        {vista === "gap" && <VistaConformita dati={dati} cmd={cmd} />}
        {vista === "ris" && <VistaRischi dati={dati} cmd={cmd} />}
        {vista === "pol" && <VistaPolitica dati={dati} cmd={cmd} />}
        {vista === "dati" && <VistaIndicatori dati={dati} cmd={cmd} />}
        {vista === "reg" && <VistaRegistri dati={dati} cmd={cmd} />}
        {vista === "verifica" && <VistaVerifica dati={dati} vai={vai} />}
        {vista === "documenti" && (
          <div className="space-y-6">
            <p className="max-w-3xl text-sm text-muted-foreground">
              Sei documenti, ciascuno una serie di revisioni. La relazione annuale riferisce l&apos;esercizio scelto in alto
              ({dati.anno}); gli altri fotografano lo stato del sistema alla data di pubblicazione. Dei registri delle
              richieste e delle violazioni i documenti riportano soltanto conteggi.
            </p>
            {DOCUMENTI.map((d) => (
              <div key={d.tipo} data-doc-gdpr={d.tipo}>
                <p className="mb-2 text-sm text-muted-foreground">{d.nota}</p>
                {/* ⚠️ `readyPct` dice quanto è stato GUARDATO: un documento con l'indice al
                    90% ma metà dei requisiti mai valutati non è pronto. */}
                <PannelloPubblicazione
                  companyId={companyId}
                  tipo={d.tipo}
                  anno={SENZA_ESERCIZIO}
                  esercizio={dati.anno}
                  readyPct={dati.avanzamento.percentuale}
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
