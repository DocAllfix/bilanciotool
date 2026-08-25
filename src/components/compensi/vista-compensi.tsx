"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Trash2, Wallet } from "lucide-react";
// ⚠️ `euro` dal modulo PURO e i TIPI da `features`: importare le funzioni dal modulo
// che tocca il database trascinerebbe `postgres` nel bundle del browser.
import { euro, type Riepilogo, type StatoCompenso } from "@/lib/calc/compensi/importi";
import type { VoceCompenso } from "@/features/compensi";
import {
  creaCompensoAction,
  eliminaCompensoAction,
  eliminaIncassoAction,
  registraIncassoAction,
  setCampoCompensoAction,
} from "@/features/compensi/actions";

// I compensi dello studio.
//
// ⚠️ Questa pagina non compare da nessuna parte dentro un'azienda: né nel fascicolo, né
// in un percorso. Non è un dettaglio di navigazione, è la difesa: il collegamento del
// portale cliente è per AZIENDA, e tutto ciò che sta in una pagina dell'azienda è
// materiale che un giorno qualcuno potrebbe includere «per comodità». Un importo che ci
// arrivasse sarebbe il prezzo di uno studio visibile al cliente che lo paga.

const STATI: { v: StatoCompenso; n: string }[] = [
  { v: "previsto", n: "Previsto" },
  { v: "concordato", n: "Concordato" },
  { v: "fatturato", n: "Fatturato" },
  { v: "incassato", n: "Incassato" },
];

export function VistaCompensi({
  voci,
  riepilogo: r,
  aziende,
  oggi,
  soloLettura,
}: {
  voci: VoceCompenso[];
  riepilogo: Riepilogo;
  aziende: { id: string; nome: string }[];
  oggi: string;
  soloLettura?: boolean;
}) {
  const router = useRouter();
  const [inCorso, avvia] = useTransition();
  const [nuovo, setNuovo] = useState(false);
  const [apertoIncasso, setApertoIncasso] = useState<string | null>(null);
  const [errore, setErrore] = useState<string | null>(null);
  const [daAggiornare, setDaAggiornare] = useState(false);

  if (daAggiornare && !inCorso) {
    setDaAggiornare(false);
    router.refresh();
  }

  const comando = (fn: () => Promise<{ ok: boolean; errore?: string }>) =>
    avvia(async () => {
      setErrore(null);
      const e = await fn();
      if (!e.ok) setErrore(e.errore ?? "Non riuscito");
      else setDaAggiornare(true);
    });

  async function aggiungi(form: FormData) {
    setErrore(null);
    const esito = await creaCompensoAction({
      companyId: String(form.get("companyId") ?? ""),
      descrizione: String(form.get("descrizione") ?? ""),
      importo: String(form.get("importo") ?? ""),
      scadenza: String(form.get("scadenza") ?? "") || null,
    });
    if (!esito.ok) {
      setErrore(esito.errore);
      return;
    }
    setNuovo(false);
    setDaAggiornare(true);
  }

  async function incassa(compensoId: string, form: FormData) {
    setErrore(null);
    const esito = await registraIncassoAction(
      compensoId,
      String(form.get("importo") ?? ""),
      String(form.get("data") ?? ""),
    );
    if (!esito.ok) {
      setErrore(esito.errore);
      return;
    }
    setApertoIncasso(null);
    setDaAggiornare(true);
  }

  return (
    <div className="mx-auto w-full max-w-5xl">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight">Compensi</h1>
          <p className="mt-1 max-w-prose text-sm text-muted-foreground">
            Quanto hai concordato e quanto è arrivato, cliente per cliente.
          </p>
        </div>
        {!soloLettura && !nuovo && (
          <Button onClick={() => setNuovo(true)} data-nuovo-compenso="">
            <Plus className="size-4" aria-hidden />
            Aggiungi
          </Button>
        )}
      </div>

      {/* ── l'andamento ─────────────────────────────────────────────────────── */}
      <dl className="mt-5 flex flex-wrap items-baseline gap-x-8 gap-y-3 border-y py-4">
        <div className="flex items-baseline gap-2">
          <dd className="text-xl font-semibold tracking-tight" data-slot="kpi" data-concordato={r.concordato}>
            {euro(r.concordato)} €
          </dd>
          <dt className="text-[13px] text-muted-foreground">concordato</dt>
        </div>
        <div className="flex items-baseline gap-2">
          <dd className="text-xl font-semibold tracking-tight" data-slot="kpi" data-incassato={r.incassato}>
            {euro(r.incassato)} €
          </dd>
          <dt className="text-[13px] text-muted-foreground">incassato</dt>
        </div>
        <div className="flex items-baseline gap-2">
          <dd className="text-xl font-semibold tracking-tight" data-slot="kpi" data-da-incassare={r.daIncassare}>
            {euro(r.daIncassare)} €
          </dd>
          <dt className="text-[13px] text-muted-foreground">da incassare</dt>
        </div>
        {r.inRitardo > 0 && (
          <div className="flex items-baseline gap-2">
            <dd className="text-xl font-semibold tracking-tight text-warning" data-slot="kpi">
              {r.inRitardo}
            </dd>
            <dt className="text-[13px] text-muted-foreground">
              {r.inRitardo === 1 ? "scaduto e non pagato" : "scaduti e non pagati"}
            </dt>
          </div>
        )}
      </dl>

      {/* ⚠️ Detto a chiare lettere. Il committente ha deciso che il prodotto non emette
          fatture e non tocca lo SdI: gli studi hanno già un gestionale per quello. Senza
          questa riga, «Fatturato» farebbe credere che il prodotto abbia emesso qualcosa. */}
      <p className="mt-3 max-w-prose text-[12px] leading-relaxed text-muted-foreground">
        Qui si tiene il conto, non si emette niente: la fattura la fa il tuo gestionale, e questi importi
        restano dentro lo studio — non compaiono in nessun collegamento consegnato a un cliente.
      </p>

      {errore && (
        <p className="mt-4 text-[13px] text-destructive" role="alert">
          {errore}
        </p>
      )}

      {nuovo && (
        <form action={aggiungi} className="mt-5 grid gap-3 rounded-xl border p-4 sm:grid-cols-4">
          <div className="space-y-1.5">
            <Label htmlFor="nc-azienda">Azienda</Label>
            <select
              id="nc-azienda"
              name="companyId"
              required
              className="h-9 w-full rounded-md border bg-transparent px-3 text-sm"
            >
              <option value="">Scegli…</option>
              {aziende.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.nome}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="nc-descrizione">Che cosa</Label>
            <Input id="nc-descrizione" name="descrizione" required placeholder="Bilancio 2025" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="nc-importo">Importo (€)</Label>
            {/* Testo e non `type="number"`: l'importo si scrive «1.450,00» come in una
                fattura, e un campo numerico rifiuterebbe la virgola o la interpreterebbe
                secondo la lingua del browser. */}
            <Input id="nc-importo" name="importo" required inputMode="decimal" placeholder="1.450,00" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="nc-scadenza">Scadenza</Label>
            <Input id="nc-scadenza" name="scadenza" type="date" />
          </div>
          <div className="flex items-center gap-2 sm:col-span-4">
            <Button type="submit" size="sm">
              Salva
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={() => setNuovo(false)}>
              Annulla
            </Button>
          </div>
        </form>
      )}

      {voci.length === 0 ? (
        <p className="mt-8 max-w-prose text-[13px] leading-relaxed text-muted-foreground">
          Nessun compenso registrato. Aggiungine uno per sapere, senza aprire un altro programma, quanto
          hai concordato e quanto ti devono ancora.
        </p>
      ) : (
        <ul className="mt-8 divide-y rounded-xl border" data-compensi="">
          {voci.map((v) => {
            const scaduto = v.residuo > 0 && v.scadenza && v.scadenza < oggi;
            return (
              <li key={v.id} className="px-4 py-4 sm:px-5" data-compenso={v.id}>
                <div className="flex flex-wrap items-start gap-x-4 gap-y-2">
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
                      <span className="text-[15px] font-semibold tracking-tight">{v.descrizione}</span>
                      <span className="text-[13px] text-muted-foreground">{v.companyNome}</span>
                      <Badge variant={v.residuo === 0 ? "default" : "outline"}>
                        {STATI.find((s) => s.v === v.stato)?.n ?? v.stato}
                      </Badge>
                      {scaduto && <Badge variant="outline">Scaduto</Badge>}
                    </span>
                    <span className="mt-1 block text-[13px] text-muted-foreground" data-slot="kpi">
                      {euro(v.importo)} € concordati · {euro(v.incassato)} € incassati ·{" "}
                      <b className="text-foreground">{euro(v.residuo)} €</b> da incassare
                      {v.scadenza && ` · scadenza ${v.scadenza}`}
                    </span>
                  </span>

                  {!soloLettura && (
                    <span className="flex shrink-0 items-center gap-1">
                      <Button
                        variant="outline"
                        size="sm"
                        data-comando="incassa"
                        aria-label={`Registra un acconto: ${v.descrizione}`}
                        onClick={() => setApertoIncasso(apertoIncasso === v.id ? null : v.id)}
                      >
                        <Wallet className="size-4" aria-hidden />
                        Acconto
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        data-comando="elimina"
                        aria-label={`Elimina il compenso: ${v.descrizione}`}
                        onClick={() => comando(() => eliminaCompensoAction(v.id))}
                      >
                        <Trash2 className="size-4" aria-hidden />
                      </Button>
                    </span>
                  )}
                </div>

                {/* Gli acconti come RIGHE: il totale è una somma, e il secondo non
                    cancella il primo. Su un pagamento contestato la storia è l'unica
                    cosa che serve. */}
                {v.incassi.length > 0 && (
                  <ul className="mt-3 space-y-1 border-l pl-4">
                    {v.incassi.map((i) => (
                      <li key={i.id} className="flex items-baseline gap-3 text-[13px]" data-incasso={i.id}>
                        <span className="font-mono tabular-nums text-muted-foreground">{i.data}</span>
                        <span className="font-medium" data-slot="kpi">
                          {euro(i.importo)} €
                        </span>
                        {!soloLettura && (
                          <button
                            type="button"
                            aria-label={`Elimina l'acconto del ${i.data}`}
                            className="text-[12px] text-muted-foreground underline underline-offset-2 hover:text-destructive"
                            onClick={() => comando(() => eliminaIncassoAction(i.id))}
                          >
                            togli
                          </button>
                        )}
                      </li>
                    ))}
                  </ul>
                )}

                {apertoIncasso === v.id && !soloLettura && (
                  <form action={(f) => incassa(v.id, f)} className="mt-3 flex flex-wrap items-end gap-3">
                    <div className="space-y-1.5">
                      <Label htmlFor={`ic-${v.id}-importo`}>Importo (€)</Label>
                      <Input
                        id={`ic-${v.id}-importo`}
                        name="importo"
                        required
                        inputMode="decimal"
                        className="w-36"
                        // Un acconto che salda tutto è il caso più frequente: si propone
                        // il residuo, che resta modificabile.
                        defaultValue={euro(v.residuo)}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor={`ic-${v.id}-data`}>Data</Label>
                      <Input id={`ic-${v.id}-data`} name="data" type="date" defaultValue={oggi} required />
                    </div>
                    <Button type="submit" size="sm">
                      Registra
                    </Button>
                    <Button type="button" variant="ghost" size="sm" onClick={() => setApertoIncasso(null)}>
                      Annulla
                    </Button>
                  </form>
                )}

                {!soloLettura && (
                  <div className="mt-3">
                    <label htmlFor={`st-${v.id}`} className="sr-only">
                      Stato di {v.descrizione}
                    </label>
                    <select
                      id={`st-${v.id}`}
                      defaultValue={v.stato}
                      className="h-8 rounded-md border bg-transparent px-2 text-[12.5px]"
                      onChange={(e) => comando(() => setCampoCompensoAction(v.id, "stato", e.target.value))}
                    >
                      {STATI.map((s) => (
                        <option key={s.v} value={s.v}>
                          {s.n}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
