"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  aggiungiScenarioAction,
  creaProcessoAction,
  eliminaProcessoAction,
  eliminaScenarioAction,
  setCampoProcessoAction,
  setCampoScenarioAction,
} from "@/features/mog231/actions";
import { ADEGUATEZZE, SCALA_IMPATTO, SCALA_PROBABILITA } from "@/features/mog231/validation";
import { accettabile, livelloDelProcesso, rischioInerente, rischioResiduo } from "@/lib/calc/mog231/rischio";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { Plus, Trash2 } from "lucide-react";
import { CampoTesto } from "@/components/comune/campo";
import { COLORE_LIVELLO, type DatiMog231, type Scenario } from "./types";

// Processi sensibili e scenari: il cuore del Modello.
//
// ⚠️ Il rischio si ricalcola nel browser con LE STESSE FUNZIONI PURE del server
// (`rischioInerente`, `rischioResiduo`, `accettabile`, `livelloDelProcesso`). Non è
// un'ottimizzazione: è l'unico modo perché l'anteprima non possa divergere dal salvato.
// Riscrivere qui la matrice a due stadi darebbe due aritmetiche, e la prima volta che
// divergono il numero a schermo è plausibile e sbagliato.

/** Dal gradino numerico alla stringa che il motore legge. Vedi `queries.ts`. */
const scalaP = (n: number | null) => (n ? (SCALA_PROBABILITA[n - 1] ?? "") : "");
const scalaI = (n: number | null) => (n ? (SCALA_IMPATTO[n - 1] ?? "") : "");

export function VistaProcessi({ companyId, dati }: { companyId: string; dati: DatiMog231 }) {
  const router = useRouter();
  const [selezionato, setSelezionato] = useState<string | null>(dati.processi[0]?.id ?? null);
  const [nuovo, setNuovo] = useState("");
  const [errore, setErrore] = useState<string | null>(null);
  const processo = dati.processi.find((p) => p.id === selezionato) ?? null;

  async function crea(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (nuovo.trim().length < 2) return;
    setErrore(null);
    const esito = await creaProcessoAction(companyId, dati.modello.id, nuovo.trim());
    if (!esito.ok) { setErrore(esito.errore); return; }
    setNuovo("");
    setSelezionato(esito.dati!.id);
    router.refresh();
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[20rem_1fr]" data-tour="mog-processi">
      <div>
        <form onSubmit={crea} className="flex gap-2">
          <Input
            id="mog-nuovo-processo"
            value={nuovo}
            onChange={(e) => setNuovo(e.currentTarget.value)}
            placeholder="Nome del processo sensibile"
            aria-label="Nuovo processo sensibile"
          />
          <Button type="submit" disabled={nuovo.trim().length < 2}>
            <Plus className="size-4" /> Aggiungi
          </Button>
        </form>
        {errore && <p className="mt-2 text-[12px] text-destructive" role="alert">{errore}</p>}

        <ul className="mt-3 divide-y rounded-xl border">
          {dati.processi.length === 0 && (
            <li className="px-4 py-6 text-center text-[13px] text-muted-foreground">
              Nessun processo sensibile. L&apos;art. 6 comma 2 lettera a) chiede di individuare le attività nel
              cui ambito i reati possono essere commessi: è da qui che si comincia.
            </li>
          )}
          {dati.processi.map((p) => (
            <li key={p.id}>
              <button
                type="button"
                onClick={() => setSelezionato(p.id)}
                aria-current={selezionato === p.id ? "true" : undefined}
                data-processo={p.id}
                className={cn(
                  "flex w-full items-center gap-3 px-4 py-3 text-left transition-colors",
                  selezionato === p.id ? "bg-accent" : "hover:bg-accent/60",
                )}
              >
                <span
                  className="size-2.5 shrink-0 rounded-full"
                  style={{ background: p.livello ? COLORE_LIVELLO[p.livello] : "var(--border)" }}
                />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13px] font-medium">{p.nome}</span>
                  <span className="block text-[12px] text-muted-foreground">
                    {p.scenari === 0 ? "nessun reato associato" : `${p.scenari} reati · ${p.livello ?? "da valutare"}`}
                  </span>
                </span>
                {p.nonAccettabili > 0 && (
                  <span className="shrink-0 rounded-full bg-destructive/10 px-1.5 py-0.5 font-mono text-[11px] text-destructive">
                    {p.nonAccettabili}
                  </span>
                )}
              </button>
            </li>
          ))}
        </ul>
      </div>

      {processo ? <Scheda key={processo.id} companyId={companyId} dati={dati} processoId={processo.id} /> : null}
    </div>
  );
}

function Scheda({ companyId, dati, processoId }: { companyId: string; dati: DatiMog231; processoId: string }) {
  const router = useRouter();
  const [errore, setErrore] = useState<string | null>(null);
  const [daAggiungere, setDaAggiungere] = useState<string>("");
  const processo = dati.processi.find((p) => p.id === processoId)!;
  // Copia locale dei soli scenari di questo processo: le scelte devono rispondere al
  // clic, e il rischio residuo ricalcolarsi sotto gli occhi.
  const [scenari, setScenari] = useState<Scenario[]>(dati.scenari.filter((s) => s.processId === processoId));

  const nomeReato = new Map(dati.catalogo.reati.map((r) => [r.key, r]));
  const gia = new Set(scenari.map((s) => s.crimeKey));
  // Solo i reati dichiarati applicabili: associare a un processo un reato che non
  // riguarda l'ente e' rumore, e nasconde quelli che invece contano.
  const applicabili = dati.catalogo.reati.filter(
    (r) => dati.applicabilita.find((a) => a.crimeKey === r.key)?.applicabile === "Sì" && !gia.has(r.key),
  );

  const livello = livelloDelProcesso(
    scenari.map((s) => rischioResiduo(scalaP(s.probabilita), scalaI(s.impatto), s.adeguatezza ?? "")),
  );

  async function salvaScenario(id: string, campo: string, valore: unknown) {
    const prima = scenari;
    setScenari((ss) => ss.map((s) => (s.id === id ? ({ ...s, [campo]: valore } as Scenario) : s)));
    setErrore(null);
    const esito = await setCampoScenarioAction(companyId, id, { campo, valore } as Parameters<
      typeof setCampoScenarioAction
    >[2]);
    if (!esito.ok) { setScenari(prima); setErrore(esito.errore); return; }
    router.refresh();
  }

  async function aggiungi() {
    if (!daAggiungere) return;
    setErrore(null);
    const esito = await aggiungiScenarioAction(companyId, processoId, daAggiungere);
    if (!esito.ok) { setErrore(esito.errore); return; }
    // ⚠️ Lo scenario si aggiunge ALLO STATO LOCALE, non si aspetta il refresh.
    //
    // `scenari` nasce dalle props ma vive di vita propria — deve, perche' le scelte di
    // probabilita' e impatto devono rispondere al clic. Il `key` di questa scheda e'
    // l'id del processo, che non cambia: `router.refresh()` porta props nuove ma
    // `useState` tiene le vecchie, e il reato associato non compariva mai. Misurato: la
    // riga era nel database e lo schermo diceva «nessun reato associato».
    setScenari((ss) => [
      ...ss,
      {
        id: esito.dati!.id,
        organizationId: "",
        processId: processoId,
        crimeKey: daAggiungere,
        probabilita: null,
        impatto: null,
        adeguatezza: null,
        modalita: null,
        note: null,
        updatedAt: new Date(),
        inerente: null,
        residuo: null,
        accettabile: false,
      } as Scenario,
    ]);
    setDaAggiungere("");
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="truncate font-display text-lg font-semibold">{processo.nome}</h2>
          <p className="text-[13px] text-muted-foreground">
            {livello ? (
              <>Rischio del processo: <strong style={{ color: COLORE_LIVELLO[livello] }}>{livello}</strong> — il peggiore dei suoi scenari</>
            ) : (
              "Nessuno scenario valutato"
            )}
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          data-tour="mog-elimina-processo"
          onClick={async () => {
            const esito = await eliminaProcessoAction(companyId, processoId);
            if (!esito.ok) { setErrore(esito.errore); return; }
            router.refresh();
          }}
        >
          <Trash2 className="size-4" /> Rimuovi
        </Button>
      </div>

      {errore && <p className="text-sm text-destructive" role="alert">{errore}</p>}

      <div className="grid gap-4 rounded-xl border p-4 sm:grid-cols-2">
        <CampoTesto id="mog-p-area" etichetta="Area aziendale" valore={processo.area}
          salva={(v) => setCampoProcessoAction(companyId, processoId, { campo: "area", valore: v ?? "" })} />
        <CampoTesto id="mog-p-resp" etichetta="Responsabile" valore={processo.responsabile}
          salva={(v) => setCampoProcessoAction(companyId, processoId, { campo: "responsabile", valore: v ?? "" })} />
        <CampoTesto id="mog-p-descr" etichetta="Descrizione dell'attività" valore={processo.descrizione} multiriga
          salva={(v) => setCampoProcessoAction(companyId, processoId, { campo: "descrizione", valore: v ?? "" })} />
        <CampoTesto id="mog-p-presidi" etichetta="Presidi in essere" valore={processo.presidi} multiriga
          salva={(v) => setCampoProcessoAction(companyId, processoId, { campo: "presidi", valore: v ?? "" })} />
      </div>

      <section aria-label="Reati ipotizzabili in questo processo">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Reati ipotizzabili
          </h3>
          <div className="flex gap-2">
            <Select value={daAggiungere} onValueChange={setDaAggiungere}>
              <SelectTrigger className="w-[22rem]" aria-label="Reato da associare">
                <SelectValue placeholder={applicabili.length ? "Scegli un reato applicabile" : "Nessun reato applicabile disponibile"} />
              </SelectTrigger>
              <SelectContent>
                {applicabili.map((r) => (
                  <SelectItem key={r.key} value={r.key}>
                    {r.key} — {r.titolo}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={aggiungi} disabled={!daAggiungere} data-tour="mog-aggiungi-reato">
              <Plus className="size-4" /> Associa
            </Button>
          </div>
        </div>
        <p className="mt-1 text-[12px] text-muted-foreground">
          Si scelgono solo fra i reati dichiarati <strong>applicabili</strong>{" "}
          all&apos;ente: associare un reato che non lo riguarda è rumore, e nasconde quelli che contano.
        </p>

        <ul className="mt-3 space-y-3">
          {scenari.length === 0 && (
            <li className="rounded-xl border px-4 py-6 text-center text-[13px] text-muted-foreground">
              Nessun reato associato a questo processo.
            </li>
          )}
          {scenari.map((s) => {
            const prob = scalaP(s.probabilita);
            const imp = scalaI(s.impatto);
            const adeg = s.adeguatezza ?? "";
            const inerente = rischioInerente(prob, imp);
            const residuo = rischioResiduo(prob, imp, adeg);
            const ok = accettabile(prob, imp, adeg);
            return (
              <li key={s.id} className="rounded-xl border p-4" data-scenario={s.crimeKey}>
                <div className="flex flex-wrap items-start gap-3">
                  <span className="shrink-0 rounded bg-muted px-1.5 py-0.5 font-mono text-[12px]">{s.crimeKey}</span>
                  <p className="min-w-0 flex-1 text-[13px] font-medium">
                    {nomeReato.get(s.crimeKey)?.titolo ?? s.crimeKey}
                  </p>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={`Rimuovi il reato ${s.crimeKey}`}
                    onClick={async () => {
                      const esito = await eliminaScenarioAction(companyId, s.id);
                      if (!esito.ok) { setErrore(esito.errore); return; }
                      setScenari((ss) => ss.filter((x) => x.id !== s.id));
                      router.refresh();
                    }}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>

                <div className="mt-3 grid gap-3 sm:grid-cols-3">
                  <Gradini
                    etichetta="Probabilità"
                    prefisso={`${s.crimeKey} probabilità`}
                    scala={SCALA_PROBABILITA}
                    valore={s.probabilita}
                    onScegli={(n) => salvaScenario(s.id, "probabilita", n)}
                  />
                  <Gradini
                    etichetta="Impatto"
                    prefisso={`${s.crimeKey} impatto`}
                    scala={SCALA_IMPATTO}
                    valore={s.impatto}
                    onScegli={(n) => salvaScenario(s.id, "impatto", n)}
                  />
                  <div>
                    <p className="text-[12px] font-medium">Adeguatezza dei presidi</p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {ADEGUATEZZE.map((a) => (
                        <button
                          key={a}
                          type="button"
                          onClick={() => salvaScenario(s.id, "adeguatezza", s.adeguatezza === a ? null : a)}
                          aria-pressed={s.adeguatezza === a}
                          aria-label={`${s.crimeKey} presidi: ${a}`}
                          className={cn(
                            "rounded-md border px-2.5 py-1 text-[12px] transition-colors",
                            s.adeguatezza === a
                              ? "border-transparent bg-primary text-primary-foreground"
                              : "hover:bg-accent",
                          )}
                        >
                          {a}
                        </button>
                      ))}
                    </div>
                    {!s.adeguatezza && (
                      <p className="mt-1 text-[11px] text-muted-foreground">
                        Non dichiarati: valgono <strong>Assenti</strong>
                      </p>
                    )}
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-4 border-t pt-3 text-[13px]">
                  <span className="text-muted-foreground">
                    Inerente: <strong className="text-foreground">{inerente ?? "—"}</strong>
                  </span>
                  <span className="text-muted-foreground">
                    Residuo:{" "}
                    <strong style={{ color: residuo ? COLORE_LIVELLO[residuo] : undefined }}>
                      {residuo ?? "—"}
                    </strong>
                  </span>
                  <span className={cn("ml-auto text-[12px]", ok ? "text-success" : "text-destructive")} data-slot="kpi">
                    {ok ? "accettabile" : residuo ? "non accettabile" : "non valutato: non accettabile"}
                  </span>
                </div>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}

function Gradini({
  etichetta,
  prefisso,
  scala,
  valore,
  onScegli,
}: {
  etichetta: string;
  prefisso: string;
  scala: readonly string[];
  valore: number | null;
  onScegli: (n: number | null) => void;
}) {
  return (
    <div>
      <p className="text-[12px] font-medium">{etichetta}</p>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {scala.map((testo, i) => {
          const n = i + 1;
          return (
            <button
              key={n}
              type="button"
              // Ripremere annulla: e' l'unico modo di tornare a «non valutato».
              onClick={() => onScegli(valore === n ? null : n)}
              aria-pressed={valore === n}
              aria-label={`${prefisso}: ${testo}`}
              title={testo}
              className={cn(
                "rounded-md border px-2.5 py-1 font-mono text-[12px] transition-colors",
                valore === n ? "border-transparent bg-primary text-primary-foreground" : "hover:bg-accent",
              )}
            >
              {n}
            </button>
          );
        })}
      </div>
      <p className="mt-1 text-[11px] text-muted-foreground">{valore ? scala[valore - 1] : "non valutata"}</p>
    </div>
  );
}
