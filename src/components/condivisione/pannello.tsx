"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Copy, Link2, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { creaCollegamentoAction, revocaCollegamentoAction } from "@/features/condivisione/actions";
import { DURATE, DURATA_PREDEFINITA } from "@/features/condivisione/token";
import type { Collegamento } from "@/features/condivisione";
import { fmtDataBreve } from "@/lib/format";

// Il pannello con cui lo studio genera e revoca i collegamenti per il cliente.
//
// Il collegamento appena creato si mostra UNA volta sola, in evidenza, con il comando per
// copiarlo: dopo non è più recuperabile, perché nel database c'è solo l'impronta. Dirlo
// mentre lo si mostra evita la telefonata del giorno dopo.

const data = (d: Date | string) =>
  fmtDataBreve(d);

const ETICHETTA = {
  valido: { testo: "Attivo", variante: "default" as const },
  scaduto: { testo: "Scaduto", variante: "secondary" as const },
  revocato: { testo: "Disattivato", variante: "secondary" as const },
};

export function PannelloCondivisione({
  companyId,
  collegamenti,
}: {
  companyId: string;
  collegamenti: Collegamento[];
}) {
  const [giorni, setGiorni] = useState<number>(DURATA_PREDEFINITA);
  const [nota, setNota] = useState("");
  const [appena, setAppena] = useState<{ url: string; scadeIl: string } | null>(null);
  const [inCorso, setInCorso] = useState(false);
  const [copiato, setCopiato] = useState(false);
  const router = useRouter();

  async function genera() {
    setInCorso(true);
    const esito = await creaCollegamentoAction({ companyId, giorni, nota });
    setInCorso(false);
    if (!esito.ok) {
      toast.error(esito.errore);
      return;
    }
    setAppena(esito.dati ?? null);
    setNota("");
    setCopiato(false);
    router.refresh();
  }

  async function copia(url: string) {
    try {
      await navigator.clipboard.writeText(url);
      setCopiato(true);
      toast.success("Collegamento copiato.");
    } catch {
      // Alcuni browser negano gli appunti senza gesto diretto: il campo resta selezionabile.
      toast.error("Copialo a mano dal campo qui sopra.");
    }
  }

  async function revoca(id: string) {
    const esito = await revocaCollegamentoAction(companyId, id);
    if (!esito.ok) {
      toast.error(esito.errore);
      return;
    }
    toast.success("Collegamento disattivato: da adesso non apre più.");
    router.refresh();
  }

  return (
    <div className="mt-10">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        Collegamento per il cliente
      </h2>
      <p className="mt-2 max-w-prose text-[13px] leading-relaxed text-muted-foreground">
        Genera un indirizzo con cui l&apos;azienda scarica i propri documenti pubblicati. Non serve che si
        registri, e scade da solo.
      </p>

      {appena && (
        <div className="mt-4 rounded-lg border border-primary/30 bg-accent p-4">
          <p className="text-sm font-medium text-accent-foreground">
            Ecco il collegamento. Copialo adesso: non potrai rileggerlo.
          </p>
          <div className="mt-2 flex flex-col gap-2 sm:flex-row">
            <Input readOnly value={appena.url} onFocus={(e) => e.currentTarget.select()} className="flex-1 font-mono text-[12.5px]" />
            <Button onClick={() => copia(appena.url)} className="shrink-0">
              {copiato ? <Check className="size-4" /> : <Copy className="size-4" />}
              {copiato ? "Copiato" : "Copia"}
            </Button>
          </div>
          <p className="mt-2 text-[12.5px] text-accent-foreground/90">
            Valido fino al {data(appena.scadeIl)}. Se lo perdi, generane un altro e disattiva questo.
          </p>
        </div>
      )}

      <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-end">
        <div className="flex-1">
          <label htmlFor="cond-nota" className="text-[13px] font-medium">
            A chi lo mandi <span className="font-normal text-muted-foreground">(facoltativo)</span>
          </label>
          <Input
            id="cond-nota"
            value={nota}
            onChange={(e) => setNota(e.target.value)}
            placeholder="dott. Rossi, amministrazione…"
            maxLength={120}
            className="mt-1.5"
          />
        </div>
        <div>
          <label htmlFor="cond-durata" className="text-[13px] font-medium">
            Durata
          </label>
          <select
            id="cond-durata"
            value={giorni}
            onChange={(e) => setGiorni(Number(e.target.value))}
            className="mt-1.5 h-9 w-full rounded-md border bg-transparent px-3 text-sm sm:w-36"
          >
            {DURATE.map((d) => (
              <option key={d.giorni} value={d.giorni}>
                {d.etichetta}
              </option>
            ))}
          </select>
        </div>
        <Button onClick={genera} disabled={inCorso} className="shrink-0">
          <Link2 className="size-4" /> {inCorso ? "Genero…" : "Genera collegamento"}
        </Button>
      </div>

      {collegamenti.length > 0 && (
        <ul className="mt-5 divide-y rounded-lg border">
          {collegamenti.map((c) => {
            const e = ETICHETTA[c.stato];
            return (
              <li key={c.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{c.nota || "Senza nota"}</p>
                  <p className="text-[12.5px] text-muted-foreground">
                    creato il {data(c.creatoIl)} · scade il {data(c.scadeIl)} ·{" "}
                    {c.aperture === 0
                      ? "mai aperto"
                      : `aperto ${c.aperture} ${c.aperture === 1 ? "volta" : "volte"}`}
                  </p>
                </div>
                <Badge variant={e.variante} className="shrink-0">
                  {e.testo}
                </Badge>
                {c.stato === "valido" && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => revoca(c.id)}
                    className="text-muted-foreground hover:text-destructive"
                  >
                    <X className="size-4" /> Disattiva
                  </Button>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
