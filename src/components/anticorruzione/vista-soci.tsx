"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { creaSocioAction, eliminaSocioAction, setCampoSocioAction } from "@/features/anticorruzione/actions";
import {
  ADEGUAMENTI, CATEGORIE_SOCIO, CLAUSOLE, CONTROLLI, ESITI_DD, IMPEGNI, REMUNERAZIONI, SI_NO, STATI_RAPPORTO, VERIFICHE,
} from "@/features/anticorruzione/validation";
import { livello, superiore } from "@/lib/calc/anticorruzione/rischio";
import { statoObblighi } from "@/lib/calc/anticorruzione/obblighi";
import { socioDalDatabase } from "@/lib/calc/anticorruzione/mappa";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { Plus, Trash2 } from "lucide-react";
import { CampoData, CampoScelta, CampoTesto } from "./campo";
import { COLORE_LIVELLO, type DatiAnticorruzione, type Socio } from "./types";

// I soci in affari: elenco a sinistra, scheda a destra.
//
// ⚠️ Il livello di rischio e gli obblighi si calcolano nel browser con **le stesse
// funzioni pure del server** (`livello`, `superiore`, `statoObblighi`). Non è
// un'ottimizzazione: è l'unico modo perché l'anteprima non possa divergere dal salvato.
// Riscrivere qui la media delle dimensioni darebbe due aritmetiche, e la prima volta che
// divergono il numero a schermo sarebbe plausibile e sbagliato.

const DIMENSIONI = [
  { campo: "dimPaese", chiave: "d_paese" },
  { campo: "dimPubbliciUfficiali", chiave: "d_pu" },
  { campo: "dimNatura", chiave: "d_nat" },
  { campo: "dimValore", chiave: "d_val" },
] as const;

const FLAG = [
  { campo: "flagSuccesso", chiave: "f_succ" },
  { campo: "flagCliente", chiave: "f_cli" },
  { campo: "flagTitolarita", chiave: "f_te" },
  { campo: "flagPrecedenti", chiave: "f_prec" },
  { campo: "flagLegami", chiave: "f_leg" },
  { campo: "flagPagamenti", chiave: "f_pag" },
] as const;

export function VistaSoci({ companyId, dati }: { companyId: string; dati: DatiAnticorruzione }) {
  const router = useRouter();
  const [selezionato, setSelezionato] = useState<string | null>(dati.soci[0]?.id ?? null);
  const [nuovo, setNuovo] = useState("");
  const [errore, setErrore] = useState<string | null>(null);
  const socio = dati.soci.find((s) => s.id === selezionato) ?? null;

  async function crea(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (nuovo.trim().length < 2) return;
    setErrore(null);
    const esito = await creaSocioAction(companyId, dati.sistema.id, nuovo.trim());
    if (!esito.ok) {
      setErrore(esito.errore);
      return;
    }
    setNuovo("");
    setSelezionato(esito.dati!.id);
    router.refresh();
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[22rem_1fr]" data-tour="pc-soci">
      <div>
        <form onSubmit={crea} className="flex gap-2">
          <Input
            id="pc-nuovo-socio"
            value={nuovo}
            onChange={(e) => setNuovo(e.currentTarget.value)}
            placeholder="Ragione sociale del socio"
            aria-label="Nuovo socio in affari"
          />
          <Button type="submit" disabled={nuovo.trim().length < 2}>
            <Plus className="size-4" /> Aggiungi
          </Button>
        </form>
        {errore && (
          <p className="mt-2 text-[12px] text-destructive" role="alert">
            {errore}
          </p>
        )}

        <ul className="mt-3 divide-y rounded-xl border">
          {dati.soci.length === 0 && (
            <li className="px-4 py-6 text-center text-[13px] text-muted-foreground">
              Nessun socio in affari censito. Il registro dei soci è il cuore della norma: da lì discendono due
              diligence, impegni e clausole.
            </li>
          )}
          {dati.soci.map((s) => (
            <li key={s.id}>
              <button
                type="button"
                onClick={() => setSelezionato(s.id)}
                aria-current={selezionato === s.id ? "true" : undefined}
                data-socio={s.id}
                className={cn(
                  "flex w-full items-center gap-3 px-4 py-3 text-left transition-colors",
                  selezionato === s.id ? "bg-accent" : "hover:bg-accent/60",
                )}
              >
                <span
                  className="size-2.5 shrink-0 rounded-full"
                  style={{ background: s.livello ? COLORE_LIVELLO[s.livello] : "var(--border)" }}
                />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13px] font-medium">{s.nome}</span>
                  <span className="block text-[12px] text-muted-foreground">
                    {s.livello ?? "livello non determinato"}
                    {s.stato !== "Attivo" ? ` · ${s.stato.toLowerCase()}` : ""}
                  </span>
                </span>
                {s.aperti > 0 && (
                  <span className="shrink-0 rounded-full bg-destructive/10 px-1.5 py-0.5 font-mono text-[11px] text-destructive">
                    {s.aperti}
                  </span>
                )}
              </button>
            </li>
          ))}
        </ul>
      </div>

      {socio ? <Scheda key={socio.id} companyId={companyId} socio={socio} dati={dati} /> : null}
    </div>
  );
}

function Scheda({ companyId, socio, dati }: { companyId: string; socio: Socio; dati: DatiAnticorruzione }) {
  const router = useRouter();
  const [errore, setErrore] = useState<string | null>(null);
  // Copia locale della sola riga aperta: le dimensioni e i flag devono rispondere al
  // clic, e il livello di rischio ricalcolarsi sotto gli occhi.
  const [riga, setRiga] = useState<Socio>(socio);

  const salva =
    (campo: string) =>
    async (valore: unknown) => {
      const precedente = riga[campo as keyof Socio];
      setRiga((r) => ({ ...r, [campo]: valore }));
      setErrore(null);
      const esito = await setCampoSocioAction(companyId, socio.id, {
        campo,
        valore,
      } as Parameters<typeof setCampoSocioAction>[2]);
      if (!esito.ok) {
        setRiga((r) => ({ ...r, [campo]: precedente }));
        setErrore(esito.errore);
        return esito;
      }
      router.refresh();
      return esito;
    };

  // Le STESSE funzioni pure del server, sulla riga locale.
  const modello = socioDalDatabase(riga);
  const liv = livello(modello);
  const sopra = superiore(modello);
  const obblighi = statoObblighi(modello, new Date());
  const aperti = obblighi.filter((o) => !o.assolto).length;

  async function elimina() {
    const esito = await eliminaSocioAction(companyId, socio.id);
    if (!esito.ok) {
      setErrore(esito.errore);
      return;
    }
    router.refresh();
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="truncate font-display text-lg font-semibold">{riga.nome}</h2>
          <p className="text-[13px] text-muted-foreground">
            {liv ? (
              <>
                Livello <strong style={{ color: COLORE_LIVELLO[liv] }}>{liv}</strong> ·{" "}
                {sopra ? `${obblighi.length} obblighi, ${aperti} aperti` : "sotto la soglia: nessun obbligo"}
              </>
            ) : (
              "Livello non determinato: valuta almeno una dimensione"
            )}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={elimina} data-tour="pc-elimina-socio">
          <Trash2 className="size-4" /> Rimuovi
        </Button>
      </div>

      {errore && (
        <p className="text-sm text-destructive" role="alert">
          {errore}
        </p>
      )}

      <Sezione titolo="Identificazione">
        <CampoTesto id="so-nome" etichetta="Ragione sociale" valore={riga.nome} salva={salva("nome") as never} />
        <CampoScelta id="so-cat" etichetta="Categoria di rapporto" valore={riga.categoria} opzioni={CATEGORIE_SOCIO}
          salva={salva("categoria") as never} />
        <CampoTesto id="so-paese" etichetta="Paese di operatività" valore={riga.paeseOperativita}
          salva={salva("paeseOperativita") as never} />
        <CampoTesto id="so-oggetto" etichetta="Oggetto del rapporto" valore={riga.oggetto} multiriga
          salva={salva("oggetto") as never} />
        <CampoTesto id="so-te" etichetta="Titolari effettivi" valore={riga.titolariEffettivi} multiriga
          salva={salva("titolariEffettivi") as never}
          aiuto="Persone fisiche; l'impossibilità di ricostruirli è un fattore di rischio" />
      </Sezione>

      <Sezione titolo="Rapporto economico">
        <CampoScelta id="so-remun" etichetta="Modalità di remunerazione" valore={riga.remunerazione}
          opzioni={REMUNERAZIONI} salva={salva("remunerazione") as never}
          aiuto="Provvigione e successo fanno scattare la verifica di proporzionalità del corrispettivo" />
        <CampoData id="so-dal" etichetta="Rapporto attivo dal" valore={riga.attivoDal} salva={salva("attivoDal") as never} />
        <CampoScelta id="so-controllata" etichetta="È un'organizzazione controllata" valore={riga.controllata}
          opzioni={SI_NO} salva={salva("controllata") as never} />
        {riga.controllata === "Sì" && (
          <CampoScelta id="so-adeg" etichetta="Soluzione di adeguamento" valore={riga.adeguamento}
            opzioni={ADEGUAMENTI} salva={salva("adeguamento") as never} />
        )}
        <CampoScelta id="so-stato" etichetta="Stato del rapporto" valore={riga.stato} opzioni={STATI_RAPPORTO}
          salva={salva("stato") as never} aiuto="I rapporti cessati escono dagli indicatori, non dall'elenco" />
      </Sezione>

      <section aria-label="Valutazione del rischio">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Valutazione del rischio
        </h3>
        <p className="mt-1 text-[12px] text-muted-foreground">
          La media si fa sulle sole dimensioni valutate: lasciarne una vuota non abbassa il livello, lo lascia
          fuori dal conto.
        </p>
        <div className="mt-3 space-y-4 rounded-xl border p-4">
          {DIMENSIONI.map((d) => {
            const dim = dati.catalogo.dimensioni.find((x) => x.key === d.chiave);
            if (!dim) return null;
            const valore = riga[d.campo] as number | null;
            return (
              <div key={d.campo}>
                <p className="text-[13px] font-medium">{dim.etichetta}</p>
                <p className="text-[12px] text-muted-foreground">{dim.descrizione}</p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {(dim.scala as string[]).map((testo, i) => {
                    const n = i + 1;
                    return (
                      <button
                        key={n}
                        type="button"
                        onClick={() => salva(d.campo)(valore === n ? null : n)}
                        aria-pressed={valore === n}
                        aria-label={`${dim.etichetta}: ${n} — ${testo}`}
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
                  <span className="self-center text-[12px] text-muted-foreground">
                    {valore ? (dim.scala as string[])[valore - 1] : "non valutata"}
                  </span>
                </div>
              </div>
            );
          })}

          <div className="border-t pt-4">
            <p className="text-[13px] font-medium">Fattori che alzano il livello</p>
            <div className="mt-2 space-y-1.5">
              {FLAG.map((f) => {
                const etichetta = dati.catalogo.fattori.find((x) => x.key === f.chiave)?.etichetta ?? f.chiave;
                const acceso = riga[f.campo] as boolean;
                return (
                  <label key={f.campo} className="flex items-start gap-2 text-[13px]">
                    <input
                      type="checkbox"
                      checked={acceso}
                      onChange={() => salva(f.campo)(!acceso)}
                      className="mt-0.5"
                      aria-label={etichetta}
                    />
                    <span>{etichetta}</span>
                  </label>
                );
              })}
            </div>
            <p className="mt-2 text-[12px] text-muted-foreground">
              Un fattore acceso porta almeno ad Alto. I precedenti per corruzione portano sempre a Critico,
              qualunque sia la media.
            </p>
          </div>
        </div>
      </section>

      <Sezione titolo="Adempimenti">
        <CampoData id="so-dd" etichetta="Data della due diligence" valore={riga.dueDiligenceIl}
          salva={salva("dueDiligenceIl") as never} />
        <CampoScelta id="so-dd-esito" etichetta="Esito della due diligence" valore={riga.dueDiligenceEsito}
          opzioni={ESITI_DD} salva={salva("dueDiligenceEsito") as never} />
        <CampoScelta id="so-pol" etichetta="Politica comunicata direttamente" valore={riga.politicaComunicata}
          opzioni={SI_NO} salva={salva("politicaComunicata") as never} />
        <CampoScelta id="so-imp" etichetta="Impegni anticorruzione" valore={riga.impegni} opzioni={IMPEGNI}
          salva={salva("impegni") as never}
          aiuto="La non fattibilità va registrata e valutata nel rischio, non presunta" />
        <CampoScelta id="so-clau" etichetta="Clausole contrattuali inserite" valore={riga.clausole} opzioni={CLAUSOLE}
          salva={salva("clausole") as never} />
        <CampoScelta id="so-ctrl" etichetta="Controlli anticorruzione del socio" valore={riga.controlli}
          opzioni={CONTROLLI} salva={salva("controlli") as never} />
        <CampoData id="so-form" etichetta="Formazione erogata agli addetti" valore={riga.formazioneIl}
          salva={salva("formazioneIl") as never} />
        <CampoScelta id="so-pag" etichetta="Verifica di proporzionalità del corrispettivo"
          valore={riga.verificaCorrispettivo} opzioni={VERIFICHE} salva={salva("verificaCorrispettivo") as never} />
      </Sezione>

      {obblighi.length > 0 && (
        <section aria-label="Obblighi che ne derivano">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Obblighi che ne derivano
          </h3>
          <ul className="mt-3 divide-y rounded-xl border" data-tour="pc-obblighi">
            {obblighi.map((o) => (
              <li key={o.obbligo.chiave} className="flex items-start gap-3 px-4 py-3">
                <span
                  className={cn(
                    "mt-0.5 size-2.5 shrink-0 rounded-full",
                    o.assolto ? "bg-success" : "bg-destructive",
                  )}
                />
                <span className="min-w-0 flex-1">
                  <span className="block text-[13px] font-medium">{o.obbligo.etichetta}</span>
                  <span className="block text-[12px] text-muted-foreground">
                    {o.obbligo.riferimento}
                    {o.nota ? ` · ${o.nota}` : ""}
                  </span>
                </span>
                <span className={cn("shrink-0 text-[12px]", o.assolto ? "text-success" : "text-destructive")}>
                  {o.assolto ? "assolto" : "aperto"}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function Sezione({ titolo, children }: { titolo: string; children: React.ReactNode }) {
  return (
    <section aria-label={titolo}>
      <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">{titolo}</h3>
      <div className="mt-3 grid gap-4 rounded-xl border p-4 sm:grid-cols-2">{children}</div>
    </section>
  );
}
