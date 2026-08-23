"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus } from "lucide-react";
import { creaFascicoloAction } from "@/features/segnalazioni/actions";
import { CANALI_RICEZIONE, STATI_FASCICOLO } from "@/features/segnalazioni/validation";
import { statoTermine, urgenza } from "@/lib/calc/segnalazioni/relazione";
import { fmtData } from "@/lib/format";
import { COLORE_TERMINE, NOME_TERMINE, type DatiSegnalazioni } from "./types";

// Il registro delle segnalazioni: ordinato per urgenza, non per data.
//
// ⚠️ L'elenco non porta il contenuto della segnalazione, e non è una scelta grafica: il
// contenuto si legge aprendo il fascicolo, e quel gesto lascia una riga nel registro
// degli accessi. Mostrarlo qui renderebbe l'audit una formalità — i fatti sarebbero già
// usciti, senza che nessuno risulti averli visti.

export function VistaRegistro({
  companyId,
  dati,
  oggi,
}: {
  companyId: string;
  dati: DatiSegnalazioni;
  oggi: string;
}) {
  const [filtroStato, setFiltroStato] = useState<string>("");

  const righe = dati.fascicoli
    .filter((f) => !filtroStato || f.stato === filtroStato)
    .sort((a, b) => urgenza(a, oggi) - urgenza(b, oggi) || a.numero - b.numero);

  return (
    <div className="space-y-6" data-tour="wb-registro">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm text-muted-foreground">
            {dati.fascicoli.length} fascicoli · ordinati per urgenza dei termini
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Select value={filtroStato || "__tutti"} onValueChange={(v) => setFiltroStato(v === "__tutti" ? "" : v)}>
            <SelectTrigger className="w-[220px]" aria-label="Filtra per stato">
              <SelectValue placeholder="Tutti gli stati" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__tutti">Tutti gli stati</SelectItem>
              {STATI_FASCICOLO.map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <NuovoFascicolo companyId={companyId} systemId={dati.assetto.id} />
        </div>
      </div>

      {righe.length === 0 ? (
        <div className="rounded-xl border px-4 py-8 text-center text-[13px] text-muted-foreground">
          {dati.fascicoli.length === 0 ? (
            <>
              <p className="font-medium text-foreground">Nessuna segnalazione registrata.</p>
              <p className="mt-2">
                Le segnalazioni arrivano sul canale dell&apos;organizzazione — la piattaforma, la casella
                dedicata, il telefono — e qui se ne apre il fascicolo di gestione. Non registrare mai nominativi:
                si usa il codice di collegamento.
              </p>
            </>
          ) : (
            <p>Nessun fascicolo in questo stato.</p>
          )}
        </div>
      ) : (
        <ul className="divide-y rounded-xl border">
          {righe.map((f) => {
            const a = statoTermine(f, "avviso", oggi);
            const r = statoTermine(f, "riscontro", oggi);
            return (
              <li key={f.id}>
                <Link
                  href={`/aziende/${companyId}/segnalazioni/fascicolo/${f.id}`}
                  className="flex flex-wrap items-center gap-3 px-4 py-3 hover:bg-muted/40"
                  data-slot="riga-fascicolo"
                >
                  <span className="w-8 font-mono text-sm tabular-nums font-semibold">{f.numero}</span>
                  <span className="w-24 shrink-0 text-[12px] text-muted-foreground">
                    {f.dataRicezione ? fmtData(f.dataRicezione) : "—"}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-[13px]">
                    {f.ambito || <span className="text-muted-foreground">ambito non indicato</span>}
                    {f.anonima && (
                      <span className="ml-2 rounded bg-muted px-1.5 py-0.5 text-[11px] text-muted-foreground">
                        anonima
                      </span>
                    )}
                  </span>
                  <Pastiglia stato={a} etichetta="avviso" />
                  <Pastiglia stato={r} etichetta="riscontro" />
                  <span className="w-32 shrink-0 text-right text-[12px] text-muted-foreground">{f.stato}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}

      <p className="text-[12px] text-muted-foreground">
        Aprire un fascicolo lascia una riga nel registro degli accessi, con chi, quando e su quale fascicolo. È
        un obbligo del decreto, non una scelta del prodotto: un registro compilato solo dopo una contestazione
        non ha valore probatorio.
      </p>
    </div>
  );
}

function Pastiglia({ stato, etichetta }: { stato: keyof typeof NOME_TERMINE; etichetta: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-[12px]" title={`${etichetta}: ${NOME_TERMINE[stato]}`}>
      <span className="size-2 rounded-full" style={{ background: COLORE_TERMINE[stato] }} />
      <span className="hidden text-muted-foreground sm:inline">{NOME_TERMINE[stato]}</span>
    </span>
  );
}

function NuovoFascicolo({ companyId, systemId }: { companyId: string; systemId: string }) {
  const router = useRouter();
  const [aperto, setAperto] = useState(false);
  const [data, setData] = useState(() => new Date().toISOString().slice(0, 10));
  const [canale, setCanale] = useState<string>(CANALI_RICEZIONE[0]);
  const [anonima, setAnonima] = useState(false);
  const [errore, setErrore] = useState<string | null>(null);
  const [inCorso, setInCorso] = useState(false);

  async function crea() {
    setErrore(null);
    setInCorso(true);
    const esito = await creaFascicoloAction(companyId, systemId, {
      dataRicezione: data,
      canale: canale as (typeof CANALI_RICEZIONE)[number],
      anonima,
    });
    setInCorso(false);
    if (!esito.ok) {
      setErrore(esito.errore);
      return;
    }
    setAperto(false);
    // Dopo aver creato qualcosa si NAVIGA verso quel qualcosa: chi apre un fascicolo
    // vuole compilarlo, e sul registro il solo aggiornamento non basterebbe comunque.
    router.push(`/aziende/${companyId}/segnalazioni/fascicolo/${esito.dati!.id}`);
  }

  return (
    <Dialog open={aperto} onOpenChange={setAperto}>
      <DialogTrigger asChild>
        <Button data-tour="wb-nuovo">
          <Plus className="size-4" /> Nuovo fascicolo
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Apri il fascicolo di una segnalazione</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <p className="text-[13px] text-muted-foreground">
            Il numero progressivo lo assegna il sistema e non si riusa: anche eliminando un fascicolo, quel
            numero resta bruciato. I registri delle ritorsioni e degli accessi vi rimandano.
          </p>
          <div className="space-y-1.5">
            <Label htmlFor="wb-nf-data">Data di ricezione</Label>
            <Input id="wb-nf-data" type="date" value={data} onChange={(e) => setData(e.target.value)} />
            <p className="text-[12px] text-muted-foreground">
              Da qui decorrono i sette giorni per l&apos;avviso e i tre mesi per il riscontro.
            </p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="wb-nf-canale">Canale di ricezione</Label>
            <Select value={canale} onValueChange={setCanale}>
              <SelectTrigger id="wb-nf-canale" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CANALI_RICEZIONE.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <label className="flex items-center gap-2 text-[13px]">
            <input
              type="checkbox"
              checked={anonima}
              onChange={(e) => setAnonima(e.target.checked)}
              aria-label="Segnalazione anonima"
            />
            Segnalazione anonima
          </label>
          {errore && (
            <p className="text-[13px] text-destructive" role="alert">
              {errore}
            </p>
          )}
        </div>
        <DialogFooter>
          <Button onClick={crea} disabled={inCorso}>
            {inCorso ? "Apertura…" : "Apri il fascicolo"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
