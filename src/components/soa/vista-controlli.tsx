"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ricalcolaAction, setDecisionFieldAction, toggleMotivazioneAction } from "@/features/soa/actions";
import { ETICHETTA_MOTIVAZIONE, ETICHETTA_STATO, MOTIVAZIONI, STATI } from "@/features/soa/validation";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { RefreshCw, Search } from "lucide-react";
import { chiave, COLORE_STATO, type PropsVista } from "./types";
import { useCoda } from "@/lib/coda";

// Vista 2 — Registro dei controlli. È la vista dove si passa il tempo: fino a
// 174 righe, ciascuna con applicabilità, motivazioni, stato, documento e
// responsabile.
//
// I filtri non sono un vezzo: senza, la vista è illeggibile. E i salvataggi si
// accodano, così chiedere il ricalcolo subito dopo non mostra numeri vecchi.

export function VistaControlli({ companyId, dichiarazione, catalogo, stato }: PropsVista) {
  const router = useRouter();
  const [errore, setErrore] = useState<string | null>(null);
  const [inCorso, setInCorso] = useState(false);
  const [apertoKey, setApertoKey] = useState<string | null>(null);

  const { accoda, attesa } = useCoda();

  // Stato locale: i comandi rispondono subito, il server segue.
  const [decisioni, setDecisioni] = useState<Record<string, { applicabile: boolean; stato: string; motivazioni: string[] }>>(
    () =>
      Object.fromEntries(
        stato.decisioni.map((d) => [
          chiave(d.frameworkKey, d.controlloId),
          { applicabile: d.applicabile, stato: d.stato ?? "", motivazioni: d.motivazioni ?? [] },
        ]),
      ),
  );
  const testualiPer = new Map(stato.decisioni.map((d) => [chiave(d.frameworkKey, d.controlloId), d]));

  const [filtri, setFiltri] = useState({ quadro: "", sezione: "", stato: "", applicabilita: "", cardine: false, rilievo: false, cerca: "" });

  const dec = (k: string) => decisioni[k] ?? { applicabile: true, stato: "", motivazioni: [] };

  const chiaviConRilievo = useMemo(() => {
    const s = new Set<string>();
    for (const r of stato.rilievi) for (const id of r.controlli) s.add(id);
    return s;
  }, [stato.rilievi]);

  const visibili = useMemo(() => {
    const q = filtri.cerca.trim().toLowerCase();
    return catalogo.controlli.filter((c) => {
      if (!c.inAmbito) return false;
      if (filtri.quadro && c.frameworkKey !== filtri.quadro) return false;
      if (filtri.sezione && c.sectionKey !== filtri.sezione) return false;
      if (filtri.cardine && !c.cardine) return false;
      const d = dec(chiave(c.frameworkKey, c.controlloId));
      if (filtri.stato && (d.stato || "vuoto") !== filtri.stato) return false;
      if (filtri.applicabilita === "si" && !d.applicabile) return false;
      if (filtri.applicabilita === "no" && d.applicabile) return false;
      if (filtri.rilievo && !chiaviConRilievo.has(c.controlloId)) return false;
      if (q && !(`${c.controlloId} ${c.titolo} ${c.evidenzaAttesa}`.toLowerCase().includes(q))) return false;
      return true;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [catalogo.controlli, filtri, decisioni, chiaviConRilievo]);

  async function salvaCampo(
    frameworkKey: string,
    controlloId: string,
    campo: "applicabile" | "giustificazione" | "stato" | "riferimentoDoc" | "responsabile" | "note",
    valore: string,
  ) {
    setErrore(null);
    const k = chiave(frameworkKey, controlloId);
    if (campo === "applicabile") setDecisioni((s) => ({ ...s, [k]: { ...dec(k), applicabile: valore === "si" } }));
    if (campo === "stato") setDecisioni((s) => ({ ...s, [k]: { ...dec(k), stato: valore } }));
    const esito = await accoda(() =>
      setDecisionFieldAction(dichiarazione.id, { frameworkKey, controlloId, campo, valore }),
    );
    if (!esito.ok) setErrore(esito.errore);
  }

  async function commutaMotivazione(frameworkKey: string, controlloId: string, motivazione: string) {
    setErrore(null);
    const k = chiave(frameworkKey, controlloId);
    const attuali = dec(k).motivazioni;
    const attiva = !attuali.includes(motivazione);
    setDecisioni((s) => ({
      ...s,
      [k]: { ...dec(k), motivazioni: attiva ? [...attuali, motivazione] : attuali.filter((m) => m !== motivazione) },
    }));
    const esito = await accoda(() =>
      toggleMotivazioneAction(dichiarazione.id, { frameworkKey, controlloId, motivazione: motivazione as "rv", attiva }),
    );
    if (!esito.ok) setErrore(esito.errore);
  }

  async function ricalcola() {
    setInCorso(true);
    await attesa();
    await ricalcolaAction(companyId);
    router.refresh();
    setInCorso(false);
  }

  const sezioniDisponibili = catalogo.sezioni.filter(
    (s) => !filtri.quadro || s.frameworkKey === filtri.quadro,
  );

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-baseline justify-between gap-4">
        <p className="max-w-3xl text-sm text-muted-foreground">
          Per ogni controllo: se è applicabile e perché, a che punto è la sua attuazione, quale documento lo
          sostiene e chi lo presidia. La norma chiede di motivare le <strong className="text-foreground">esclusioni</strong>,
          non le inclusioni: un controllo resta applicabile finché non lo escludi.
        </p>
        <div className="flex items-center gap-2">
          {errore && <p role="alert" className="text-sm text-destructive">{errore}</p>}
          <Button variant="outline" size="sm" onClick={ricalcola} disabled={inCorso}>
            <RefreshCw className={cn("size-3.5", inCorso && "animate-spin")} /> Ricalcola
          </Button>
        </div>
      </div>

      {/* Sette filtri: quadro, sezione, stato, applicabilità, cardine, rilievi, ricerca */}
      <Card>
        <CardContent className="flex flex-wrap items-end gap-3 py-4">
          <div className="min-w-40">
            <label className="text-[11px] uppercase tracking-wide text-muted-foreground" htmlFor="f-quadro">Quadro</label>
            <Select value={filtri.quadro || "tutti"} onValueChange={(v) => setFiltri((f) => ({ ...f, quadro: v === "tutti" ? "" : v, sezione: "" }))}>
              <SelectTrigger id="f-quadro" className="mt-1 w-full" aria-label="Filtra per quadro di riferimento"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="tutti">Tutti i quadri</SelectItem>
                {catalogo.quadri.filter((q) => catalogo.controlli.some((c) => c.inAmbito && c.frameworkKey === q.key))
                  .map((q) => <SelectItem key={q.key} value={q.key}>{q.abbreviazione}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="min-w-52">
            <label className="text-[11px] uppercase tracking-wide text-muted-foreground" htmlFor="f-sezione">Sezione</label>
            <Select value={filtri.sezione || "tutte"} onValueChange={(v) => setFiltri((f) => ({ ...f, sezione: v === "tutte" ? "" : v }))}>
              <SelectTrigger id="f-sezione" className="mt-1 w-full" aria-label="Filtra per sezione"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="tutte">Tutte le sezioni</SelectItem>
                {sezioniDisponibili.map((s) => <SelectItem key={s.key} value={s.key}>{s.nome}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="min-w-44">
            <label className="text-[11px] uppercase tracking-wide text-muted-foreground" htmlFor="f-stato">Stato</label>
            <Select value={filtri.stato || "tutti"} onValueChange={(v) => setFiltri((f) => ({ ...f, stato: v === "tutti" ? "" : v }))}>
              <SelectTrigger id="f-stato" className="mt-1 w-full" aria-label="Filtra per stato di attuazione"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="tutti">Tutti gli stati</SelectItem>
                <SelectItem value="vuoto">Senza stato</SelectItem>
                {STATI.map((s) => <SelectItem key={s} value={s}>{ETICHETTA_STATO[s]}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="min-w-40">
            <label className="text-[11px] uppercase tracking-wide text-muted-foreground" htmlFor="f-app">Applicabilità</label>
            <Select value={filtri.applicabilita || "tutti"} onValueChange={(v) => setFiltri((f) => ({ ...f, applicabilita: v === "tutti" ? "" : v }))}>
              <SelectTrigger id="f-app" className="mt-1 w-full" aria-label="Filtra per applicabilità"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="tutti">Tutti</SelectItem>
                <SelectItem value="si">Applicabili</SelectItem>
                <SelectItem value="no">Esclusi</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <label className="flex cursor-pointer items-center gap-2 pb-2 text-sm">
            <input
              type="checkbox"
              className="size-4 accent-primary"
              checked={filtri.cardine}
              aria-label="Mostra solo i controlli cardine"
              onChange={(e) => setFiltri((f) => ({ ...f, cardine: e.target.checked }))}
            />
            Solo cardine
          </label>
          <label className="flex cursor-pointer items-center gap-2 pb-2 text-sm">
            <input
              type="checkbox"
              className="size-4 accent-primary"
              checked={filtri.rilievo}
              aria-label="Mostra solo i controlli con un rilievo aperto"
              onChange={(e) => setFiltri((f) => ({ ...f, rilievo: e.target.checked }))}
            />
            Solo con rilievo
          </label>
          <div className="ml-auto min-w-56">
            <label className="text-[11px] uppercase tracking-wide text-muted-foreground" htmlFor="f-cerca">Ricerca</label>
            <div className="relative mt-1">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="f-cerca"
                className="pl-8"
                placeholder="Titolo, evidenza, riferimento"
                value={filtri.cerca}
                aria-label="Cerca fra i controlli"
                onChange={(e) => setFiltri((f) => ({ ...f, cerca: e.target.value }))}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <p className="text-sm text-muted-foreground" aria-live="polite">
        {visibili.length} controlli su {catalogo.controlli.filter((c) => c.inAmbito).length} in ambito
      </p>

      <div className="grid gap-2">
        {visibili.map((c) => {
          const k = chiave(c.frameworkKey, c.controlloId);
          const d = dec(k);
          const t = testualiPer.get(k);
          const aperto = apertoKey === k;
          return (
            <Card key={k} className="py-0">
              <CardHeader className="flex-row items-start justify-between gap-4 py-3.5">
                <button
                  type="button"
                  className="min-w-0 flex-1 text-left"
                  onClick={() => setApertoKey(aperto ? null : k)}
                  aria-expanded={aperto}
                  aria-label={`${aperto ? "Chiudi" : "Apri"} il controllo ${c.controlloId}`}
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className="size-2.5 shrink-0 rounded-full"
                      style={{ background: !d.applicabile ? "var(--muted)" : d.stato ? COLORE_STATO[d.stato] : "var(--border)" }}
                      aria-hidden
                    />
                    <span className="font-mono text-xs text-muted-foreground">{c.controlloId}</span>
                    <span className="font-medium">{c.titolo}</span>
                    {c.cardine && <Badge variant="outline">cardine</Badge>}
                    {!d.applicabile && <Badge variant="secondary">escluso</Badge>}
                  </div>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Evidenza attesa: {c.evidenzaAttesa}
                    {c.rimandi ? ` · richiamato anche da ${c.rimandi}` : ""}
                  </p>
                </button>
                <div className="flex shrink-0 items-center gap-2">
                  <Select
                    value={d.applicabile ? "si" : "no"}
                    onValueChange={(v) => salvaCampo(c.frameworkKey, c.controlloId, "applicabile", v)}
                  >
                    <SelectTrigger className="h-8 w-32" aria-label={`Applicabilità di ${c.controlloId}`}><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="si">Applicabile</SelectItem>
                      <SelectItem value="no">Escluso</SelectItem>
                    </SelectContent>
                  </Select>
                  {d.applicabile && (
                    <Select
                      value={d.stato || "vuoto"}
                      onValueChange={(v) => salvaCampo(c.frameworkKey, c.controlloId, "stato", v === "vuoto" ? "" : v)}
                    >
                      <SelectTrigger className="h-8 w-48" aria-label={`Stato di attuazione di ${c.controlloId}`}>
                        <SelectValue placeholder="Senza stato" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="vuoto">Senza stato</SelectItem>
                        {STATI.map((s) => <SelectItem key={s} value={s}>{ETICHETTA_STATO[s]}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  )}
                </div>
              </CardHeader>

              {aperto && (
                <CardContent className="grid gap-4 border-t py-4">
                  {d.applicabile ? (
                    <>
                      <div>
                        <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                          Motivazione dell&apos;inclusione
                        </p>
                        <div className="mt-2 flex flex-wrap gap-1.5" role="group" aria-label={`Motivazioni di ${c.controlloId}`}>
                          {MOTIVAZIONI.map((m) => {
                            const attiva = d.motivazioni.includes(m);
                            return (
                              <button
                                key={m}
                                type="button"
                                onClick={() => commutaMotivazione(c.frameworkKey, c.controlloId, m)}
                                aria-pressed={attiva}
                                aria-label={`${c.controlloId}: ${ETICHETTA_MOTIVAZIONE[m].nome}`}
                                className={cn(
                                  "rounded-md border px-2.5 py-1.5 text-xs font-medium transition-colors",
                                  attiva
                                    ? "border-primary bg-primary text-primary-foreground"
                                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                                )}
                              >
                                {ETICHETTA_MOTIVAZIONE[m].nome}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <div>
                          <label className="text-[11px] uppercase tracking-wide text-muted-foreground" htmlFor={`doc-${k}`}>
                            Riferimento documentale
                          </label>
                          <Input
                            id={`doc-${k}`}
                            className="mt-1"
                            defaultValue={t?.riferimentoDoc ?? ""}
                            placeholder="Procedura, politica o registrazione"
                            aria-label={`Riferimento documentale di ${c.controlloId}`}
                            onBlur={(e) => { if (e.target.value !== (t?.riferimentoDoc ?? "")) salvaCampo(c.frameworkKey, c.controlloId, "riferimentoDoc", e.target.value); }}
                          />
                        </div>
                        <div>
                          <label className="text-[11px] uppercase tracking-wide text-muted-foreground" htmlFor={`resp-${k}`}>
                            Responsabile
                          </label>
                          <Input
                            id={`resp-${k}`}
                            className="mt-1"
                            defaultValue={t?.responsabile ?? ""}
                            placeholder="Chi presidia il controllo"
                            aria-label={`Responsabile di ${c.controlloId}`}
                            onBlur={(e) => { if (e.target.value !== (t?.responsabile ?? "")) salvaCampo(c.frameworkKey, c.controlloId, "responsabile", e.target.value); }}
                          />
                        </div>
                      </div>
                      <div>
                        <label className="text-[11px] uppercase tracking-wide text-muted-foreground" htmlFor={`note-${k}`}>
                          Note
                        </label>
                        <Textarea
                          id={`note-${k}`}
                          rows={2}
                          className="mt-1"
                          defaultValue={t?.note ?? ""}
                          aria-label={`Note su ${c.controlloId}`}
                          onBlur={(e) => { if (e.target.value !== (t?.note ?? "")) salvaCampo(c.frameworkKey, c.controlloId, "note", e.target.value); }}
                        />
                      </div>
                    </>
                  ) : (
                    <div>
                      <label className="text-[11px] uppercase tracking-wide text-muted-foreground" htmlFor={`giust-${k}`}>
                        Giustificazione dell&apos;esclusione
                      </label>
                      <Textarea
                        id={`giust-${k}`}
                        rows={3}
                        className="mt-1"
                        defaultValue={t?.giustificazione ?? ""}
                        placeholder="Perché questo controllo non si applica all'organizzazione"
                        aria-label={`Giustificazione dell'esclusione di ${c.controlloId}`}
                        onBlur={(e) => { if (e.target.value !== (t?.giustificazione ?? "")) salvaCampo(c.frameworkKey, c.controlloId, "giustificazione", e.target.value); }}
                      />
                      <p className="mt-1 text-xs text-muted-foreground">
                        Senza motivazione l&apos;organismo di certificazione rileva una non conformità: è il
                        punto della norma che chiede di giustificare le esclusioni.
                      </p>
                    </div>
                  )}
                </CardContent>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
