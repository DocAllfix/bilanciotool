"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { PannelloPubblicazione } from "@/components/documento/pannello-pubblicazione";
import { SENZA_ESERCIZIO } from "@/features/documents/tipi";
import { VistaQuadro } from "./vista-quadro";
import { VistaOrganizzazione } from "./vista-organizzazione";
import { VistaSoci } from "./vista-soci";
import { VistaRequisiti } from "./vista-requisiti";
import { COLORE_LIVELLO, type DatiAnticorruzione } from "./types";

// Il sistema ISO 37001 è un fascicolo che si consulta, non un percorso a passi: cinque
// viste di lavoro più i documenti. La vista sta nell'indirizzo, quindi si può mandare a
// un collega e sopravvive al tasto indietro.

const VISTE = [
  { k: "quadro", n: "Quadro" },
  { k: "organizzazione", n: "Organizzazione" },
  { k: "soci", n: "Soci in affari" },
  { k: "requisiti", n: "Requisiti" },
  { k: "documenti", n: "Documenti" },
] as const;

export function AnticorruzioneShell({
  companyId,
  dati,
  vistaIniziale,
}: {
  companyId: string;
  dati: DatiAnticorruzione;
  vistaIniziale: string;
}) {
  const router = useRouter();
  const vista = VISTE.some((v) => v.k === vistaIniziale) ? vistaIniziale : "quadro";
  const vai = (v: string) =>
    router.replace(`/aziende/${companyId}/anticorruzione?vista=${v}`, { scroll: false });

  const k = dati.indicatori;
  const contatore: Record<string, string | null> = {
    quadro: null,
    organizzazione: null,
    soci: k.sociTotali ? String(k.sociTotali) : null,
    requisiti: `${k.requisitiValutati}/${k.requisitiTotali}`,
    documenti: null,
  };

  // Il livello più alto fra i rapporti attivi: è l'informazione che un consulente
  // cerca per prima, e sta nell'intestazione perché non dipende dalla vista aperta.
  const peggiore = ["Critico", "Alto", "Medio", "Basso"].find((l) =>
    dati.soci.some((s) => s.stato !== "Cessato" && s.livello === l),
  );

  return (
    <div className="mx-auto w-full max-w-6xl">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground">
            <Link href="/dashboard" className="hover:underline">
              Portafoglio
            </Link>{" "}
            ·{" "}
            <Link href={`/aziende/${companyId}`} className="hover:underline">
              Fascicolo
            </Link>{" "}
            · Prevenzione della corruzione
          </p>
          <h1 className="truncate font-display text-2xl font-semibold tracking-tight">{dati.azienda.nome}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            UNI ISO 37001 · {k.requisitiTotali} requisiti · {k.sociAttivi} rapporti attivi
            {dati.conformita !== null ? ` · conformità ${dati.conformita}%` : ""}
          </p>
        </div>
        {peggiore && (
          <Badge style={{ background: COLORE_LIVELLO[peggiore], color: "white" }} data-slot="kpi">
            Esposizione massima: {peggiore}
          </Badge>
        )}
      </div>

      <nav aria-label="Viste del sistema anticorruzione" className="mt-6 overflow-x-auto">
        <ol className="flex min-w-max gap-1 rounded-lg border bg-card p-1">
          {VISTE.map((v) => (
            <li key={v.k}>
              <button
                type="button"
                onClick={() => vai(v.k)}
                aria-current={vista === v.k ? "page" : undefined}
                data-tour={`pc-vista-${v.k}`}
                className={cn(
                  "flex items-center gap-2 rounded-md px-3 py-2 text-[13px] font-medium transition-colors",
                  vista === v.k
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                )}
              >
                {v.n}
                {contatore[v.k] && (
                  <span
                    className={cn(
                      "rounded-full px-1.5 py-0.5 font-mono text-[10px]",
                      vista === v.k ? "bg-primary-foreground/20" : "bg-muted",
                    )}
                    data-slot="kpi"
                  >
                    {contatore[v.k]}
                  </span>
                )}
              </button>
            </li>
          ))}
        </ol>
      </nav>

      <div className="mt-6">
        {vista === "quadro" && <VistaQuadro dati={dati} vai={vai} />}
        {vista === "organizzazione" && <VistaOrganizzazione companyId={companyId} dati={dati} />}
        {vista === "soci" && <VistaSoci companyId={companyId} dati={dati} />}
        {vista === "requisiti" && <VistaRequisiti companyId={companyId} dati={dati} />}
        {vista === "documenti" && (
          <div className="space-y-6">
            <p className="text-sm text-muted-foreground">
              Due documenti, con destinatari diversi. La <strong>Relazione</strong> è ciò che si porta
              all&apos;organo di governo: dice a quali rapporti si è esposti e quali obblighi restano aperti. La{" "}
              <strong>Matrice</strong> è ciò che un auditor sfoglia riga per riga, e riporta tutti i{" "}
              {k.requisitiTotali} requisiti — compresi quelli non ancora valutati, perché in un documento di
              conformità il vuoto è l&apos;informazione più importante.
            </p>
            <PannelloPubblicazione
              companyId={companyId}
              tipo="relazione_pc"
              anno={SENZA_ESERCIZIO}
              readyPct={dati.conformita ?? 0}
            />
            <PannelloPubblicazione
              companyId={companyId}
              tipo="matrice_pc"
              anno={SENZA_ESERCIZIO}
              readyPct={Math.round((k.requisitiValutati / Math.max(1, k.requisitiTotali)) * 100)}
            />
          </div>
        )}
      </div>
    </div>
  );
}
