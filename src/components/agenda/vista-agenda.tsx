"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CalendarPlus, Check, RotateCcw, Trash2 } from "lucide-react";
import type { TipoVoce, VoceConAzienda } from "@/features/agenda";
import { creaVoceAction, eliminaVoceAction, setStatoVoceAction } from "@/features/agenda/actions";

// L'agenda dello studio.
//
// ⚠️ NON è lo scadenzario, e la pagina lo dice. Quello si calcola e misura quali percorsi
// sono indietro rispetto a ciò che la norma impone; questa raccoglie ciò che lo studio ha
// deciso. Un consulente che spuntasse «GHG 2025 da pubblicare» crederebbe di aver chiuso
// un lavoro che nessuno ha fatto, ed è la ragione per cui i due elenchi restano separati.

const TIPI: { v: TipoVoce; n: string; d: string }[] = [
  { v: "azione", n: "Da fare", d: "Una cosa da fare, spesso oggi" },
  { v: "scadenza", n: "Scadenza", d: "Una data entro cui qualcosa è dovuto" },
  { v: "milestone", n: "Traguardo", d: "Un passaggio del lavoro che vale segnare" },
];

const ETICHETTA: Record<TipoVoce, string> = {
  azione: "Da fare",
  scadenza: "Scadenza",
  milestone: "Traguardo",
};

export function VistaAgenda({
  voci,
  aziende,
  oggi,
  soloLettura,
}: {
  voci: VoceConAzienda[];
  aziende: { id: string; nome: string }[];
  /** Oggi lo decide il SERVER e arriva come prop: vedi la nota qui sotto. */
  oggi: string;
  soloLettura?: boolean;
}) {
  const router = useRouter();
  const [inCorso, avvia] = useTransition();
  const [nuova, setNuova] = useState(false);
  const [tipo, setTipo] = useState<TipoVoce>("azione");
  const [errore, setErrore] = useState<string | null>(null);
  const [daAggiornare, setDaAggiornare] = useState(false);

  if (daAggiornare && !inCorso) {
    setDaAggiornare(false);
    router.refresh();
  }

  async function aggiungi(form: FormData) {
    setErrore(null);
    const esito = await creaVoceAction({
      tipo,
      titolo: String(form.get("titolo") ?? ""),
      data: String(form.get("data") ?? ""),
      note: String(form.get("note") ?? ""),
      companyId: String(form.get("companyId") ?? "") || null,
    });
    if (!esito.ok) {
      setErrore(esito.errore);
      return;
    }
    setNuova(false);
    setDaAggiornare(true);
  }

  const comando = (fn: () => Promise<{ ok: boolean; errore?: string }>) =>
    avvia(async () => {
      setErrore(null);
      const e = await fn();
      if (!e.ok) setErrore(e.errore ?? "Non riuscito");
      else setDaAggiornare(true);
    });

  const aperte = voci.filter((v) => v.stato === "aperta");
  const chiuse = voci.filter((v) => v.stato !== "aperta");

  return (
    <div className="mx-auto w-full max-w-4xl">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight">Agenda</h1>
          <p className="mt-1 max-w-prose text-sm text-muted-foreground">
            Le date che decidi tu: consegne promesse, riunioni, cose da fare.
          </p>
        </div>
        {!soloLettura && !nuova && (
          <Button onClick={() => setNuova(true)} data-nuova-voce="">
            <CalendarPlus className="size-4" aria-hidden />
            Aggiungi
          </Button>
        )}
      </div>

      {/* ⚠️ La distinzione dallo scadenzario è DETTA, non lasciata intuire. I due elenchi
          si somigliano abbastanza da confondersi, e confonderli fa credere chiuso un
          lavoro che nessuno ha fatto. */}
      <p className="mt-4 max-w-prose rounded-lg border bg-muted/40 px-4 py-3 text-[13px] leading-relaxed text-muted-foreground">
        Questa è l&apos;agenda dello studio. I <b className="text-foreground">percorsi da riprendere</b> stanno
        nel portafoglio e non si spuntano: si chiudono lavorandoci, e li calcola il prodotto da solo.
      </p>

      {errore && (
        <p className="mt-4 text-[13px] text-destructive" role="alert">
          {errore}
        </p>
      )}

      {nuova && (
        <form action={aggiungi} className="mt-5 rounded-xl border p-4">
          <fieldset className="space-y-2">
            <legend className="text-sm font-medium">Che cos&apos;è</legend>
            <div className="grid gap-2 sm:grid-cols-3">
              {TIPI.map((t) => (
                <button
                  key={t.v}
                  type="button"
                  data-tipo={t.v}
                  aria-pressed={tipo === t.v}
                  onClick={() => setTipo(t.v)}
                  className={
                    "rounded-lg border p-3 text-left transition-colors " +
                    (tipo === t.v ? "border-primary bg-primary/10" : "hover:bg-accent")
                  }
                >
                  <span className="block text-[14px] font-semibold tracking-tight">{t.n}</span>
                  <span className="mt-0.5 block text-[12px] leading-relaxed text-muted-foreground">{t.d}</span>
                </button>
              ))}
            </div>
          </fieldset>

          <div className="mt-4 grid gap-3 sm:grid-cols-4">
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="nv-titolo">Titolo</Label>
              <Input id="nv-titolo" name="titolo" required autoFocus />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="nv-data">Data</Label>
              {/* `defaultValue` a oggi: la data più probabile è quella, e chiederla vuota
                  costringe a digitarla ogni volta. */}
              <Input id="nv-data" name="data" type="date" defaultValue={oggi} required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="nv-azienda">Azienda</Label>
              <select
                id="nv-azienda"
                name="companyId"
                className="h-9 w-full rounded-md border bg-transparent px-3 text-sm"
              >
                {/* ⚠️ «Nessuna» è la prima opzione e non un ripiego: metà del lavoro di
                    uno studio non riguarda un cliente preciso. */}
                <option value="">Nessuna</option>
                {aziende.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.nome}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5 sm:col-span-4">
              <Label htmlFor="nv-note">Note</Label>
              <Input id="nv-note" name="note" />
            </div>
          </div>

          <div className="mt-4 flex items-center gap-2">
            <Button type="submit" size="sm">
              Salva
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={() => setNuova(false)}>
              Annulla
            </Button>
          </div>
        </form>
      )}

      <Elenco
        titolo="Da fare"
        voci={aperte}
        oggi={oggi}
        vuoto="Niente in agenda. Aggiungi una consegna promessa o una riunione: resta qui, non in un'email da ritrovare."
        soloLettura={soloLettura}
        comando={comando}
      />

      {chiuse.length > 0 && (
        <Elenco
          titolo="Chiuse"
          voci={chiuse}
          oggi={oggi}
          vuoto=""
          soloLettura={soloLettura}
          comando={comando}
        />
      )}
    </div>
  );
}

function Elenco({
  titolo,
  voci,
  oggi,
  vuoto,
  soloLettura,
  comando,
}: {
  titolo: string;
  voci: VoceConAzienda[];
  oggi: string;
  vuoto: string;
  soloLettura?: boolean;
  comando: (fn: () => Promise<{ ok: boolean; errore?: string }>) => void;
}) {
  return (
    <section className="mt-8" aria-labelledby={`ag-${titolo}`}>
      <h2 id={`ag-${titolo}`} className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        {titolo}
      </h2>
      {voci.length === 0 ? (
        <p className="mt-3 max-w-prose text-[13px] leading-relaxed text-muted-foreground">{vuoto}</p>
      ) : (
        <ul className="mt-3 divide-y rounded-xl border" data-agenda="">
          {voci.map((v) => {
            // ⚠️ Il confronto fra stringhe ISO funziona ed è deliberato: `AAAA-MM-GG` si
            // ordina lessicograficamente come si ordina cronologicamente. Costruire due
            // `Date` per confrontarle rimetterebbe in gioco il fuso orario, che è
            // esattamente il problema da cui questa colonna sta alla larga.
            const scaduta = v.stato === "aperta" && v.data < oggi;
            const oggiStessa = v.stato === "aperta" && v.data === oggi;
            return (
              <li
                key={v.id}
                className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3"
                data-voce={v.id}
                data-scaduta={scaduta ? "" : undefined}
              >
                <span className="w-24 shrink-0 font-mono text-[12px] tabular-nums text-muted-foreground">
                  {v.data}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
                    <span
                      className={
                        "text-[15px] font-semibold tracking-tight " +
                        (v.stato !== "aperta" ? "text-muted-foreground line-through" : "")
                      }
                    >
                      {v.titolo}
                    </span>
                    <Badge variant="outline">{ETICHETTA[v.tipo as TipoVoce]}</Badge>
                    {scaduta && <Badge variant="outline">In ritardo</Badge>}
                    {oggiStessa && <Badge>Oggi</Badge>}
                  </span>
                  <span className="mt-0.5 block text-[13px] text-muted-foreground">
                    {[v.companyNome, v.note].filter(Boolean).join(" · ") || "—"}
                  </span>
                </span>
                {!soloLettura && (
                  <span className="flex shrink-0 items-center gap-1">
                    {v.stato === "aperta" ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        data-comando="fatta"
                        aria-label={`Segna fatta: ${v.titolo}`}
                        onClick={() => comando(() => setStatoVoceAction(v.id, "fatta"))}
                      >
                        <Check className="size-4" aria-hidden />
                      </Button>
                    ) : (
                      <Button
                        variant="ghost"
                        size="sm"
                        data-comando="riapri"
                        aria-label={`Riapri: ${v.titolo}`}
                        onClick={() => comando(() => setStatoVoceAction(v.id, "aperta"))}
                      >
                        <RotateCcw className="size-4" aria-hidden />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      data-comando="elimina"
                      aria-label={`Elimina: ${v.titolo}`}
                      onClick={() => comando(() => eliminaVoceAction(v.id))}
                    >
                      <Trash2 className="size-4" aria-hidden />
                    </Button>
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
