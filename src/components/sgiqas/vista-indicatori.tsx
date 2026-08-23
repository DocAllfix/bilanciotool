"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CampoScelta, CampoTesto } from "@/components/comune/campo";
import {
  caricaIndicatoriBaseAction,
  creaIndicatoreAction,
  eliminaIndicatoreAction,
  eliminaRilevazioneAction,
  setCampoIndicatoreAction,
  setRilevazioneAction,
} from "@/features/sgiqas/actions";
import { AMBITI_INDICATORE, FREQUENZE, TIPI_INDICATORE } from "@/features/sgiqas/validation";
import { COLORE_STATO, NOME_STATO, type DatiSgiQas, type Indicatore } from "./types";

// Gli indicatori di prestazione, con la loro serie storica.
//
// ⚠️ Uno stato «non rilevato» non è un fallimento del prodotto: è ciò che deve comparire
// quando nessuno ha fissato un target. Nel prototipo un indicatore senza target risultava
// «a target», e lo stesso dato mancante dava due verdetti opposti a seconda del verso.

export function VistaIndicatori({ companyId, dati }: { companyId: string; dati: DatiSgiQas }) {
  const router = useRouter();
  const [apertoId, setApertoId] = useState<string | null>(null);
  const [nuovo, setNuovo] = useState("");
  const [errore, setErrore] = useState<string | null>(null);
  const [inCorso, setInCorso] = useState(false);

  async function crea() {
    if (nuovo.trim().length < 2) return;
    setErrore(null);
    setInCorso(true);
    const esito = await creaIndicatoreAction(companyId, dati.sistema.id, { nome: nuovo.trim() });
    setInCorso(false);
    if (!esito.ok) { setErrore(esito.errore); return; }
    setNuovo("");
    setApertoId(esito.dati!.id);
    setTimeout(() => router.refresh(), 0);
  }

  async function caricaBase() {
    setErrore(null);
    setInCorso(true);
    const esito = await caricaIndicatoriBaseAction(companyId, dati.sistema.id);
    setInCorso(false);
    if (!esito.ok) { setErrore(esito.errore); return; }
    setTimeout(() => router.refresh(), 0);
  }

  const aperto = dati.indicatori.find((i) => i.id === apertoId) ?? null;

  return (
    <div className="space-y-5" data-tour="qas-indicatori">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm text-muted-foreground">
            {dati.indicatori.length} indicatori ·{" "}
            {dati.indicatori.filter((i) => i.stato === "no").length} fuori soglia ·{" "}
            {dati.indicatori.filter((i) => i.target === null).length} senza target
          </p>
        </div>
        <div className="flex flex-wrap items-end gap-2">
          <div className="space-y-1.5">
            <Label htmlFor="qas-nuovo-ind">Nuovo indicatore</Label>
            <Input
              id="qas-nuovo-ind"
              value={nuovo}
              onChange={(e) => setNuovo(e.target.value)}
              placeholder="Denominazione"
              className="w-[260px]"
            />
          </div>
          <Button onClick={crea} disabled={inCorso || nuovo.trim().length < 2} data-tour="qas-aggiungi-ind">
            <Plus className="size-4" /> Aggiungi
          </Button>
          <Button variant="ghost" onClick={caricaBase} disabled={inCorso} data-tour="qas-indicatori-base">
            Carica i 20 di partenza
          </Button>
        </div>
      </div>

      {errore && (
        <p className="text-[13px] text-destructive" role="alert">
          {errore}
        </p>
      )}

      {dati.indicatori.length === 0 ? (
        <p className="rounded-xl border px-4 py-8 text-center text-[13px] text-muted-foreground">
          Nessun indicatore. Senza indicatori il riesame di direzione non può riferire sulle prestazioni, che è
          il primo degli elementi in ingresso richiesti dal punto 9.3. Il set di partenza propone venti
          indicatori con target e soglie <strong>da adattare</strong>.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-xl border">
          <table className="w-full text-[13px]">
            <thead className="border-b bg-muted/40">
              <tr>
                <th className="px-3 py-2 text-left font-medium" style={{ width: "80px" }}>Codice</th>
                <th className="px-3 py-2 text-left font-medium">Indicatore</th>
                <th className="px-3 py-2 text-left font-medium" style={{ width: "120px" }}>Ultimo</th>
                <th className="px-3 py-2 text-left font-medium" style={{ width: "90px" }}>Target</th>
                <th className="px-3 py-2 text-left font-medium" style={{ width: "150px" }}>Stato</th>
                <th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody>
              {dati.indicatori.map((i) => (
                <tr key={i.id} className="border-b last:border-0" data-slot="riga-indicatore">
                  <td className="px-3 py-2 font-mono text-[12px]">{i.codice ?? "—"}</td>
                  <td className="px-3 py-2">
                    {i.nome}
                    {i.ambito && <div className="text-[11px] text-muted-foreground">{i.ambito}</div>}
                  </td>
                  <td className="px-3 py-2">
                    {i.ultimo?.valore ?? "—"}
                    {i.um ? ` ${i.um}` : ""}
                    {i.ultimo && <div className="font-mono text-[11px] text-muted-foreground">{i.ultimo.periodo}</div>}
                  </td>
                  <td className="px-3 py-2">{i.target ?? <span className="text-muted-foreground">—</span>}</td>
                  <td className="px-3 py-2">
                    <span className="inline-flex items-center gap-1.5">
                      <span className="size-2 rounded-full" style={{ background: COLORE_STATO[i.stato] }} />
                      {NOME_STATO[i.stato]}
                    </span>
                    {i.tendenza !== 0 && (
                      <div className="text-[11px] text-muted-foreground">
                        {i.tendenza > 0 ? "in miglioramento" : "in peggioramento"}
                      </div>
                    )}
                  </td>
                  <td className="px-3 py-2 text-right">
                    <button
                      className="text-[12px] underline underline-offset-2"
                      onClick={() => setApertoId(apertoId === i.id ? null : i.id)}
                      aria-expanded={apertoId === i.id}
                      aria-label={`Apri ${i.nome}`}
                    >
                      {apertoId === i.id ? "Chiudi" : "Apri"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {aperto && (
        <SchedaIndicatore key={aperto.id} companyId={companyId} indicatore={aperto} onChiudi={() => setApertoId(null)} />
      )}
    </div>
  );
}

function SchedaIndicatore({
  companyId,
  indicatore: i,
  onChiudi,
}: {
  companyId: string;
  indicatore: Indicatore;
  onChiudi: () => void;
}) {
  const router = useRouter();
  const [conferma, setConferma] = useState(false);
  const [errore, setErrore] = useState<string | null>(null);

  const salva = (campo: string) => (valore: string | null) =>
    setCampoIndicatoreAction(companyId, i.id, { campo, valore } as never);

  async function elimina() {
    const esito = await eliminaIndicatoreAction(companyId, i.id);
    if (!esito.ok) { setErrore(esito.errore); return; }
    onChiudi();
    setTimeout(() => router.refresh(), 0);
  }

  return (
    <div className="rounded-xl border p-4" data-slot="scheda-indicatore">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <p className="text-[13px] font-semibold">{i.nome}</p>
        {conferma ? (
          <span className="flex flex-wrap items-center gap-2">
            <span className="text-[12px] text-muted-foreground">
              Eliminare l&apos;indicatore e tutte le sue rilevazioni?
            </span>
            <Button variant="destructive" size="sm" onClick={elimina}>Elimina</Button>
            <Button variant="ghost" size="sm" onClick={() => setConferma(false)}>Annulla</Button>
          </span>
        ) : (
          <Button variant="ghost" size="sm" onClick={() => setConferma(true)}>Elimina</Button>
        )}
      </div>
      {errore && <p className="mb-2 text-[12px] text-destructive" role="alert">{errore}</p>}

      <div className="grid gap-4 sm:grid-cols-2">
        <CampoTesto id={`qas-i-cod-${i.id}`} etichetta="Codice" valore={i.codice} salva={salva("codice")} />
        <CampoTesto id={`qas-i-nome-${i.id}`} etichetta="Denominazione" valore={i.nome} salva={salva("nome")} />
        <CampoScelta id={`qas-i-amb-${i.id}`} etichetta="Ambito" valore={i.ambito} opzioni={AMBITI_INDICATORE} salva={salva("ambito")} />
        <CampoScelta id={`qas-i-tipo-${i.id}`} etichetta="Tipo" valore={i.tipo} opzioni={TIPI_INDICATORE} salva={salva("tipo")}
          aiuto="Proattivo: misura la prevenzione. Reattivo: misura ciò che è già accaduto" />
        <CampoTesto id={`qas-i-proc-${i.id}`} etichetta="Processo di riferimento" valore={i.processo} salva={salva("processo")} />
        <CampoTesto id={`qas-i-um-${i.id}`} etichetta="Unità di misura" valore={i.um} salva={salva("um")} />
        <CampoTesto id={`qas-i-formula-${i.id}`} etichetta="Formula di calcolo" valore={i.formula} multiriga salva={salva("formula")} />
        <CampoTesto id={`qas-i-fonte-${i.id}`} etichetta="Fonte del dato" valore={i.fonte} salva={salva("fonte")} />
        <CampoScelta id={`qas-i-freq-${i.id}`} etichetta="Frequenza" valore={i.frequenza} opzioni={FREQUENZE} salva={salva("frequenza")} />
        <CampoTesto id={`qas-i-resp-${i.id}`} etichetta="Responsabile della rilevazione" valore={i.responsabile} salva={salva("responsabile")} />
        <CampoTesto id={`qas-i-target-${i.id}`} etichetta="Target" valore={i.target} salva={salva("target")}
          aiuto="Lasciarlo vuoto NON significa «target zero»: l'indicatore risulta non rilevato" />
        <CampoTesto id={`qas-i-soglia-${i.id}`} etichetta="Soglia di attenzione" valore={i.soglia} salva={salva("soglia")} />
        <CampoScelta id={`qas-i-verso-${i.id}`} etichetta="Verso di miglioramento"
          valore={i.versoPositivo ? "Crescente" : "Decrescente"} opzioni={["Crescente", "Decrescente"]}
          salva={async (v) => setCampoIndicatoreAction(companyId, i.id, { campo: "versoPositivo", valore: v === "Crescente" })}
          aiuto="Crescente se un valore più alto è migliore" />
        <CampoTesto id={`qas-i-note-${i.id}`} etichetta="Note sul criterio di calcolo" valore={i.note} multiriga salva={salva("note")}
          aiuto="Ogni modifica del criterio va annotata: la serie storica va ricostruita o interrotta esplicitamente" />
      </div>

      <Serie companyId={companyId} indicatore={i} />
    </div>
  );
}

/** La serie storica: una riga per periodo, e il periodo non si ripete. */
function Serie({ companyId, indicatore: i }: { companyId: string; indicatore: Indicatore }) {
  const router = useRouter();
  const [periodo, setPeriodo] = useState("");
  const [valore, setValore] = useState("");
  const [errore, setErrore] = useState<string | null>(null);

  async function aggiungi() {
    setErrore(null);
    const esito = await setRilevazioneAction(companyId, { indicatorId: i.id, periodo, valore });
    if (!esito.ok) { setErrore(esito.errore); return; }
    setPeriodo("");
    setValore("");
    setTimeout(() => router.refresh(), 0);
  }

  async function elimina(p: string) {
    const esito = await eliminaRilevazioneAction(companyId, i.id, p);
    if (!esito.ok) { setErrore(esito.errore); return; }
    setTimeout(() => router.refresh(), 0);
  }

  return (
    <section className="mt-5" aria-label="Serie storica">
      <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Rilevazioni</h3>
      <div className="mt-2 flex flex-wrap items-end gap-2">
        <div className="space-y-1.5">
          <Label htmlFor={`qas-per-${i.id}`}>Periodo</Label>
          <Input id={`qas-per-${i.id}`} value={periodo} onChange={(e) => setPeriodo(e.target.value)}
            placeholder="2026-03" className="w-[130px]" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={`qas-val-${i.id}`}>Valore</Label>
          <Input id={`qas-val-${i.id}`} value={valore} onChange={(e) => setValore(e.target.value)}
            placeholder="98" className="w-[110px]" />
        </div>
        <Button size="sm" onClick={aggiungi} disabled={!periodo} data-tour="qas-aggiungi-rilevazione">
          Registra
        </Button>
      </div>
      <p className="mt-1 text-[12px] text-muted-foreground">
        Forme ammesse: «2026», «2026-03», «2026-T1», «2026-S1». Riscrivere lo stesso periodo aggiorna il
        valore: due rilevazioni per lo stesso mese renderebbero il grafico una domanda senza risposta.
      </p>
      {errore && <p className="mt-1 text-[12px] text-destructive" role="alert">{errore}</p>}

      {i.serie.length > 0 && (
        <ul className="mt-3 divide-y rounded-lg border">
          {i.serie.map((r) => (
            <li key={r.id} className="flex items-center gap-3 px-3 py-2 text-[13px]">
              <span className="w-24 font-mono text-[12px]">{r.periodo}</span>
              <span className="flex-1 font-mono tabular-nums">
                {r.valore}
                {i.um ? ` ${i.um}` : ""}
              </span>
              <button
                className="text-[12px] underline underline-offset-2"
                onClick={() => elimina(r.periodo)}
                aria-label={`Elimina la rilevazione ${r.periodo}`}
              >
                Elimina
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
