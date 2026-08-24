"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Trash2 } from "lucide-react";
import {
  eliminaPartnerAction,
  setCampoPartnerAction,
  setFlagAction,
  setPunteggioAction,
} from "@/features/filiera/actions";
import { Button } from "@/components/ui/button";
import { CampoData, CampoScelta, CampoTesto } from "@/components/comune/campo";
import { CASCADING, LIVELLI, QUALIFICHE, SI_NO, SOSTITUIBILITA, STATI_RAPPORTO } from "@/features/filiera/validation";
import { AREE_CRITICHE, maturita, punteggioInerente } from "@/lib/calc/filiera/rischio";
import { cn } from "@/lib/utils";
import type { DatiFilieraPieno } from "./types";
import type { PartnerValutato } from "@/features/filiera/queries";

// La scheda di un partner: identificazione, manodopera, rapporto, qualifica, e i due assi.
//
// ⚠️ L'anteprima dei due assi usa le STESSE funzioni pure del server (`punteggioInerente`,
// `maturita`): riscrivere qui l'aritmetica significherebbe due numeri che possono
// divergere, e il consulente crederebbe a quello che vede mentre il documento porta
// l'altro.

const COLORE_RESIDUO: Record<string, string> = {
  Critico: "var(--destructive)",
  Alto: "var(--destructive)",
  Medio: "var(--warning)",
  Basso: "var(--success)",
};

export function SchedaPartner({
  companyId,
  dati,
  valutato,
  chiudi,
}: {
  companyId: string;
  dati: DatiFilieraPieno;
  valutato: PartnerValutato;
  chiudi: () => void;
}) {
  const router = useRouter();
  const p = valutato.partner;
  const [punteggi, setPunteggi] = useState<Record<string, number>>(valutato.punteggi);
  const [flag, setFlag] = useState<string[]>(p.flag);
  const [errore, setErrore] = useState<string | null>(null);

  // Il testo: un campo per volta, e il valore precedente non passa mai dal browser.
  const testo =
    (campo: string) =>
    (v: string | null): Promise<{ ok: true } | { ok: false; errore: string }> =>
      setCampoPartnerAction(companyId, p.id, {
        campo,
        valore: v && v.trim() ? v : null,
      } as never);

  const numero =
    (campo: string) =>
    (v: string | null): Promise<{ ok: true } | { ok: false; errore: string }> => {
      const n = v && v.trim() ? Number(v.replace(",", ".")) : null;
      if (n !== null && !Number.isFinite(n)) {
        return Promise.resolve({ ok: false as const, errore: "Serve un numero" });
      }
      return setCampoPartnerAction(companyId, p.id, { campo, valore: n } as never);
    };

  // ⚠️ Comando ottimistico: il punteggio si accende subito e si ripristina al rifiuto.
  // Senza, la griglia risponde dopo il giro completo verso il server e si legge come rotta.
  async function scegli(genere: "dim" | "area", chiave: string, valore: number) {
    const k = `${genere}:${chiave}`;
    const prima = punteggi;
    const nuovo = { ...punteggi };
    if (punteggi[k] === valore) delete nuovo[k];
    else nuovo[k] = valore;
    setPunteggi(nuovo);
    setErrore(null);
    const esito = await setPunteggioAction(companyId, p.id, {
      genere,
      chiave,
      valore: punteggi[k] === valore ? null : valore,
    });
    if (!esito.ok) {
      setPunteggi(prima);
      setErrore(esito.errore);
      return;
    }
    router.refresh();
  }

  async function commutaFlag(chiave: string) {
    const prima = flag;
    const acceso = !flag.includes(chiave);
    setFlag(acceso ? [...flag, chiave] : flag.filter((f) => f !== chiave));
    setErrore(null);
    const esito = await setFlagAction(companyId, p.id, { chiave, acceso });
    if (!esito.ok) {
      setFlag(prima);
      setErrore(esito.errore);
      return;
    }
    router.refresh();
  }

  async function elimina() {
    setErrore(null);
    const esito = await eliminaPartnerAction(companyId, p.id);
    if (!esito.ok) {
      setErrore(esito.errore);
      return;
    }
    chiudi();
    router.refresh();
  }

  // Le stesse funzioni pure del server, sui valori che l'utente sta guardando adesso.
  const perCalcolo = {
    paese: punteggi["dim:rp"] ?? 0,
    settore: punteggi["dim:rs"] ?? 0,
    prodotto: punteggi["dim:rpr"] ?? 0,
    modello: punteggi["dim:rm"] ?? 0,
    aree: Object.fromEntries(dati.aree.map((a) => [a.key, punteggi[`area:${a.key}`] ?? 0])),
    flag: flag.length > 0,
  };
  const anteprimaInerente = punteggioInerente(perCalcolo);
  const anteprimaMaturita = maturita(perCalcolo);
  const criticheMancanti = AREE_CRITICHE.filter((k) => !(perCalcolo.aree[k] > 0));

  return (
    <div className="space-y-8" data-tour="fil-scheda">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button variant="ghost" size="sm" onClick={chiudi} data-tour="fil-torna">
          <ArrowLeft className="size-4" /> Torna al registro
        </Button>
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "rounded-md px-3 py-1.5 text-[12px] font-medium",
              valutato.residuo ? "text-white" : "border text-muted-foreground",
            )}
            style={valutato.residuo ? { background: COLORE_RESIDUO[valutato.residuo] } : undefined}
            data-slot="residuo-scheda"
          >
            {valutato.residuo ? `Rischio residuo ${valutato.residuo}` : "Rischio residuo da determinare"}
          </span>
          {valutato.mesiVerifica && (
            <span className="text-[12px] text-muted-foreground">verifica ogni {valutato.mesiVerifica} mesi</span>
          )}
        </div>
      </div>

      <h2 className="font-display text-xl font-semibold">{p.nome}</h2>
      {errore && (
        <p className="text-sm text-destructive" role="alert">
          {errore}
        </p>
      )}

      {/* ─── I due assi ─────────────────────────────────────────────────── */}
      <section aria-label="Rischio inerente" data-tour="fil-inerente">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Rischio inerente
          <span className="ml-2 font-mono text-[12px] font-normal normal-case">
            {anteprimaInerente ? anteprimaInerente.toFixed(2) : "non valutato"}
          </span>
        </h3>
        <p className="mt-1 text-[12px] text-muted-foreground">
          Dipende dal contesto, e il partner non può cambiarlo. La media si fa sulle sole dimensioni
          compilate: lasciarne una in bianco non è valutarla 1.
        </p>
        <div className="mt-3 space-y-3">
          {dati.dimensioni.map((d) => (
            <Scala
              key={d.key}
              titolo={d.nome}
              aiuto={d.descrizione}
              gradini={d.scala}
              scelto={punteggi[`dim:${d.key}`] ?? null}
              chiave={d.key}
              scegli={(v) => scegli("dim", d.key, v)}
            />
          ))}
        </div>
      </section>

      <section aria-label="Fattori aggravanti">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Fattori aggravanti
        </h3>
        <p className="mt-1 text-[12px] text-muted-foreground">
          Dichiararne anche uno solo non lascia scendere il rischio inerente sotto «Alta».
        </p>
        <ul className="mt-3 divide-y rounded-xl border" data-tour="fil-flag">
          {dati.flags.map((f) => (
            <li key={f.key} className="flex items-center gap-3 px-4 py-2.5">
              <button
                role="switch"
                aria-checked={flag.includes(f.key)}
                aria-label={f.nome}
                onClick={() => commutaFlag(f.key)}
                className={cn(
                  "relative h-5 w-9 shrink-0 rounded-full transition-colors",
                  flag.includes(f.key) ? "bg-destructive" : "bg-muted",
                )}
              >
                <span
                  className={cn(
                    "absolute top-0.5 size-4 rounded-full bg-background transition-all",
                    flag.includes(f.key) ? "left-[18px]" : "left-0.5",
                  )}
                />
              </button>
              <span className="text-[13px]">{f.nome}</span>
            </li>
          ))}
        </ul>
      </section>

      <section aria-label="Maturità del partner" data-tour="fil-maturita">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Maturità
          <span className="ml-2 font-mono text-[12px] font-normal normal-case">
            {anteprimaMaturita ? anteprimaMaturita.toFixed(2) : "non valutata"}
          </span>
        </h3>
        {criticheMancanti.length > 0 && (
          <p
            className="mt-2 rounded-md border px-3 py-2 text-[12px]"
            style={{ borderColor: "var(--warning)", color: "var(--warning)" }}
            data-slot="avviso-critiche"
          >
            {/* ⚠️ Il plurale italiano non si fa attaccando lettere in coda: «area critica non
                valutata» diventa «aree critiche non valutate», non «areae criticahe non
                valutatae». Trovato dal collaudo del percorso, che stampa il testo reso. */}
            {criticheMancanti.length === 1
              ? "Un'area critica non è stata valutata."
              : `${criticheMancanti.length} aree critiche non sono state valutate.`}{" "}
            La maturità resta limitata: il silenzio su lavoro minorile, lavoro forzato o salute e sicurezza
            non è una prova di conformità.
          </p>
        )}
        <div className="mt-3 space-y-3">
          {dati.aree.map((a) => (
            <Scala
              key={a.key}
              titolo={a.nome}
              critica={(AREE_CRITICHE as readonly string[]).includes(a.key)}
              gradini={[
                "Nessuna evidenza",
                "Dichiarato, non documentato",
                "Documentato e applicato, con qualche lacuna",
                "Documentato, applicato e verificato",
              ]}
              scelto={punteggi[`area:${a.key}`] ?? null}
              chiave={a.key}
              scegli={(v) => scegli("area", a.key, v)}
            />
          ))}
        </div>
      </section>

      {/* ─── L'anagrafica ───────────────────────────────────────────────── */}
      <Gruppo titolo="Identificazione">
        <CampoTesto id={`fil-${p.id}-nome`} etichetta="Ragione sociale" valore={p.nome} salva={testo("nome")} />
        <CampoTesto id={`fil-${p.id}-cod`} etichetta="Codice interno" valore={p.codiceInterno} salva={testo("codiceInterno")} />
        <CampoTesto id={`fil-${p.id}-piva`} etichetta="Partita IVA" valore={p.piva} salva={testo("piva")}
          aiuto="E' la chiave con cui, quando il fornitore usa a sua volta EvalisDeck, si potranno ricevere i suoi dati invece di ridigitarli" />
        <CampoScelta id={`fil-${p.id}-liv`} etichetta="Livello nella filiera" valore={p.livello} opzioni={LIVELLI} salva={testo("livello")} />
        <CampoTesto id={`fil-${p.id}-cat`} etichetta="Categoria merceologica" valore={p.categoria} salva={testo("categoria")} />
        <CampoTesto id={`fil-${p.id}-paese`} etichetta="Paese del sito produttivo" valore={p.paese} salva={testo("paese")} />
        <CampoTesto id={`fil-${p.id}-sito`} etichetta="Sito e indirizzo" valore={p.sito} multiriga salva={testo("sito")}
          aiuto="L'unita' di analisi e' il SITO, non la sede legale: un partner con piu' stabilimenti genera profili distinti" />
        <CampoTesto id={`fil-${p.id}-att`} etichetta="Attivita' svolta" valore={p.attivita} salva={testo("attivita")} />
      </Gruppo>

      <Gruppo titolo="Manodopera">
        <CampoTesto id={`fil-${p.id}-add`} etichetta="Addetti totali" valore={p.addetti === null ? null : String(p.addetti)} salva={numero("addetti")} />
        <CampoTesto id={`fil-${p.id}-somm`} etichetta="di cui somministrati o stagionali" valore={p.somministrati === null ? null : String(p.somministrati)} salva={numero("somministrati")} />
        <CampoScelta id={`fil-${p.id}-migr`} etichetta="Presenza di lavoratori migranti" valore={p.migranti} opzioni={SI_NO} salva={testo("migranti")} />
        <CampoTesto id={`fil-${p.id}-ag`} etichetta="Agenzie di reclutamento impiegate" valore={p.agenzie} multiriga salva={testo("agenzie")} />
        <CampoScelta id={`fil-${p.id}-sub`} etichetta="Ricorso a subappalto" valore={p.subappalto} opzioni={SI_NO} salva={testo("subappalto")} />
      </Gruppo>

      <Gruppo titolo="Rapporto commerciale">
        <CampoTesto id={`fil-${p.id}-spesa`} etichetta="Spesa annua (€)" valore={p.spesa} salva={numero("spesa")}
          aiuto="La copertura della filiera si misura sulla spesa: senza questo numero il partner non pesa nel quadro" />
        <CampoTesto id={`fil-${p.id}-quota`} etichetta="Peso stimato sul fatturato del partner (%)" valore={p.quotaFatturato} salva={numero("quotaFatturato")}
          aiuto="Determina la leva disponibile, e va valutato prima di ogni ipotesi di interruzione del rapporto" />
        <CampoScelta id={`fil-${p.id}-sost`} etichetta="Sostituibilita'" valore={p.sostituibilita} opzioni={SOSTITUIBILITA} salva={testo("sostituibilita")} />
        <CampoData id={`fil-${p.id}-dal`} etichetta="Rapporto attivo dal" valore={p.rapportoDal} salva={testo("rapportoDal")} />
      </Gruppo>

      <Gruppo titolo="Qualifica e contratto">
        <CampoScelta id={`fil-${p.id}-qual`} etichetta="Stato di qualifica" valore={p.qualifica} opzioni={QUALIFICHE} salva={testo("qualifica")} />
        <CampoData id={`fil-${p.id}-qualv`} etichetta="Validita' della qualifica fino al" valore={p.qualificaValidaAl} salva={testo("qualificaValidaAl")} />
        <CampoScelta id={`fil-${p.id}-cod-cond`} etichetta="Codice di condotta accettato" valore={p.codiceCondotta} opzioni={SI_NO} salva={testo("codiceCondotta")} />
        <CampoScelta id={`fil-${p.id}-clau`} etichetta="Clausole contrattuali inserite" valore={p.clausole} opzioni={SI_NO} salva={testo("clausole")} />
        <CampoScelta id={`fil-${p.id}-casc`} etichetta="Cascading verificato ai livelli successivi" valore={p.cascading} opzioni={CASCADING} salva={testo("cascading")}
          aiuto="«Non richiesto» non e' «no»: un partner di ultimo livello non ha nessuno a cui trasmettere le clausole" />
        <CampoScelta id={`fil-${p.id}-aff`} etichetta="Canale di reclamo comunicato ai lavoratori" valore={p.canaleAffisso} opzioni={SI_NO} salva={testo("canaleAffisso")}
          aiuto="Verificabile in audit: e' il presupposto dell'accessibilita' del meccanismo" />
        <CampoScelta id={`fil-${p.id}-stato`} etichetta="Stato del rapporto" valore={p.stato} opzioni={STATI_RAPPORTO} salva={testo("stato")}
          aiuto="Un rapporto cessato esce da ogni conteggio, spesa compresa" />
        <CampoTesto id={`fil-${p.id}-note`} etichetta="Note" valore={p.note} multiriga salva={testo("note")} />
      </Gruppo>

      <div className="border-t pt-4">
        <Elimina elimina={elimina} nome={p.nome} />
      </div>
    </div>
  );
}

function Scala({
  titolo,
  aiuto,
  gradini,
  scelto,
  chiave,
  critica,
  scegli,
}: {
  titolo: string;
  aiuto?: string;
  gradini: string[];
  scelto: number | null;
  chiave: string;
  critica?: boolean;
  scegli: (v: number) => void;
}) {
  return (
    <div className="rounded-xl border p-3" data-slot="scala">
      <p className="text-[13px] font-medium">
        {titolo}
        {critica && (
          <span className="ml-2 rounded-full bg-destructive/10 px-2 py-0.5 text-[10px] font-normal text-destructive">
            area critica
          </span>
        )}
      </p>
      {aiuto && <p className="mt-0.5 text-[12px] text-muted-foreground">{aiuto}</p>}
      <div className="mt-2 grid gap-1 sm:grid-cols-4">
        {gradini.map((g, i) => (
          <button
            key={g}
            type="button"
            aria-pressed={scelto === i + 1}
            aria-label={`${titolo}: ${i + 1} — ${g}`}
            onClick={() => scegli(i + 1)}
            className={cn(
              "rounded-md border px-2 py-1.5 text-left text-[11px] transition-colors",
              scelto === i + 1 ? "border-area-filiera bg-area-filiera/15 font-medium" : "hover:bg-muted/50",
            )}
          >
            <span className="font-mono">{i + 1}</span> · {g}
          </button>
        ))}
      </div>
    </div>
  );
}

function Elimina({ elimina, nome }: { elimina: () => void; nome: string }) {
  const [chiesto, setChiesto] = useState(false);
  if (!chiesto) {
    return (
      <Button variant="ghost" size="sm" onClick={() => setChiesto(true)} data-tour="fil-elimina">
        <Trash2 className="size-4" /> Elimina il partner
      </Button>
    );
  }
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-[13px]">
        Eliminare <strong>{nome}</strong> e la sua valutazione?
      </span>
      <Button variant="destructive" size="sm" onClick={elimina} data-tour="fil-elimina-conferma">
        Elimina
      </Button>
      <Button variant="ghost" size="sm" onClick={() => setChiesto(false)}>
        Annulla
      </Button>
    </div>
  );
}

function Gruppo({ titolo, children }: { titolo: string; children: React.ReactNode }) {
  return (
    <section aria-label={titolo}>
      <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">{titolo}</h3>
      <div className="mt-3 grid gap-4 rounded-xl border p-4 sm:grid-cols-2">{children}</div>
    </section>
  );
}
