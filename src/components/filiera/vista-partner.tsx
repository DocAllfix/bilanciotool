"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { creaPartnerAction } from "@/features/filiera/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { fmtNum } from "@/lib/format";
import { cn } from "@/lib/utils";
import { LIVELLI } from "@/features/filiera/validation";
import { SchedaPartner } from "./scheda-partner";
import type { DatiFilieraPieno } from "./types";

// Il registro dei partner, e la scheda di quello aperto.
//
// ⚠️ L'unità di analisi è il SITO, non la ragione sociale: un partner con più
// stabilimenti genera profili distinti. È scritto nell'aiuto del campo, perché è la prima
// cosa che si sbaglia e produce una valutazione che media stabilimenti incomparabili.

const COLORE_RESIDUO: Record<string, string> = {
  Critico: "var(--destructive)",
  Alto: "var(--destructive)",
  Medio: "var(--warning)",
  Basso: "var(--success)",
};

type Filtro = "tutti" | "daValutare" | "critici" | "cessati";

export function VistaPartner({
  companyId,
  dati,
  apertoId,
  apri,
}: {
  companyId: string;
  dati: DatiFilieraPieno;
  apertoId: string | null;
  apri: (id: string | null) => void;
}) {
  const [filtro, setFiltro] = useState<Filtro>("tutti");
  const aperto = dati.partner.find((p) => p.partner.id === apertoId) ?? null;

  if (aperto) {
    return <SchedaPartner companyId={companyId} dati={dati} valutato={aperto} chiudi={() => apri(null)} />;
  }

  const elenco = dati.partner.filter((p) => {
    if (filtro === "cessati") return !p.vivo;
    if (!p.vivo) return false;
    if (filtro === "daValutare") return p.residuo === null;
    if (filtro === "critici") return p.residuo === "Critico" || p.residuo === "Alto";
    return true;
  });

  const FILTRI: { k: Filtro; n: string }[] = [
    { k: "tutti", n: "In essere" },
    { k: "daValutare", n: "Da valutare" },
    { k: "critici", n: "Critici e alti" },
    { k: "cessati", n: "Cessati" },
  ];

  return (
    <div className="space-y-5" data-tour="fil-partner">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-1" role="group" aria-label="Filtra i partner">
          {FILTRI.map((f) => (
            <button
              key={f.k}
              className="rounded-md border px-2.5 py-1 text-[12px]"
              aria-pressed={filtro === f.k}
              aria-label={`Filtra: ${f.n}`}
              style={filtro === f.k ? { background: "var(--area-compliance)", color: "white" } : undefined}
              onClick={() => setFiltro(f.k)}
            >
              {f.n}
            </button>
          ))}
        </div>
        <NuovoPartner companyId={companyId} programId={dati.programma.id} apri={apri} />
      </div>

      {elenco.length === 0 ? (
        <p className="rounded-xl border px-4 py-10 text-center text-[13px] text-muted-foreground">
          {filtro === "tutti"
            ? "Nessun partner mappato. Il primo passo della fase 2 è sapere chi c'è."
            : "Nessun partner in questo filtro."}
        </p>
      ) : (
        <ul className="divide-y rounded-xl border">
          {elenco.map((v) => (
            <li key={v.partner.id}>
              <button
                className="flex w-full flex-wrap items-center gap-3 px-4 py-3 text-left hover:bg-muted/40"
                onClick={() => apri(v.partner.id)}
                data-slot="riga-partner"
              >
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13px] font-medium">{v.partner.nome}</span>
                  <span className="block truncate text-[12px] text-muted-foreground">
                    {[v.partner.paese, v.partner.livello, v.partner.categoria].filter(Boolean).join(" · ") ||
                      "da identificare"}
                  </span>
                </span>
                {v.partner.spesa && (
                  <span className="hidden w-28 shrink-0 text-right font-mono text-[12px] tabular-nums text-muted-foreground sm:inline">
                    {fmtNum(Number(v.partner.spesa), 0)} €
                  </span>
                )}
                {v.criticheMancanti.length > 0 && v.residuo && (
                  <span
                    className="shrink-0 rounded-full border px-2 py-0.5 text-[11px]"
                    style={{ borderColor: "var(--warning)", color: "var(--warning)" }}
                    title={`Aree critiche non valutate: ${v.criticheMancanti.join(", ")}`}
                  >
                    {v.criticheMancanti.length === 1
                      ? "1 area in bianco"
                      : `${v.criticheMancanti.length} aree in bianco`}
                  </span>
                )}
                <span
                  className={cn(
                    "w-24 shrink-0 rounded-md px-2 py-1 text-center text-[11px] font-medium",
                    v.residuo ? "text-white" : "border text-muted-foreground",
                  )}
                  style={v.residuo ? { background: COLORE_RESIDUO[v.residuo] } : undefined}
                  data-slot="residuo"
                >
                  {v.residuo ?? "da valutare"}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function NuovoPartner({
  companyId,
  programId,
  apri,
}: {
  companyId: string;
  programId: string;
  apri: (id: string) => void;
}) {
  const router = useRouter();
  const [aperto, setAperto] = useState(false);
  const [nome, setNome] = useState("");
  const [paese, setPaese] = useState("");
  const [livello, setLivello] = useState<string>(LIVELLI[0]);
  const [errore, setErrore] = useState<string | null>(null);
  const [inCorso, setInCorso] = useState(false);

  async function crea() {
    setErrore(null);
    setInCorso(true);
    const esito = await creaPartnerAction(companyId, programId, {
      nome,
      paese: paese || undefined,
      livello: livello as (typeof LIVELLI)[number],
    });
    setInCorso(false);
    if (!esito.ok) {
      setErrore(esito.errore);
      return;
    }
    setNome("");
    setPaese("");
    setAperto(false);
    // Dopo aver creato qualcosa si NAVIGA verso quel qualcosa: chi aggiunge un partner
    // lo aggiunge per compilarlo, e la scheda è dove si compila.
    router.refresh();
    if (esito.dati) apri(esito.dati.id);
  }

  if (!aperto) {
    return (
      <Button size="sm" onClick={() => setAperto(true)} data-tour="fil-nuovo-partner">
        Aggiungi un partner
      </Button>
    );
  }

  return (
    <div className="flex w-full flex-wrap items-end gap-2 rounded-xl border p-3">
      <div className="min-w-48 flex-1 space-y-1.5">
        <Label htmlFor="fil-nuovo-nome">Ragione sociale</Label>
        <Input
          id="fil-nuovo-nome"
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          placeholder="Nome del partner"
        />
      </div>
      <div className="w-40 space-y-1.5">
        <Label htmlFor="fil-nuovo-paese">Paese del sito</Label>
        <Input id="fil-nuovo-paese" value={paese} onChange={(e) => setPaese(e.target.value)} />
      </div>
      <div className="w-48 space-y-1.5">
        <Label htmlFor="fil-nuovo-livello">Livello</Label>
        <select
          id="fil-nuovo-livello"
          className="h-9 w-full rounded-md border bg-background px-2 text-sm"
          value={livello}
          onChange={(e) => setLivello(e.target.value)}
        >
          {LIVELLI.map((l) => (
            <option key={l}>{l}</option>
          ))}
        </select>
      </div>
      <Button size="sm" onClick={crea} disabled={inCorso || !nome.trim()} data-tour="fil-conferma-partner">
        {inCorso ? "Creazione..." : "Aggiungi"}
      </Button>
      <Button size="sm" variant="ghost" onClick={() => setAperto(false)}>
        Annulla
      </Button>
      {errore && (
        <p className="w-full text-[12px] text-destructive" role="alert">
          {errore}
        </p>
      )}
    </div>
  );
}
