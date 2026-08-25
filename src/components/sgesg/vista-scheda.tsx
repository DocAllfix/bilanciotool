"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CampoTesto } from "@/components/comune/campo";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Check, Info } from "lucide-react";
import type { CampoDef, VistaScheda } from "@/features/sgesg/schede";
import { setCampoSchedaAction, setStatoSchedaAction } from "@/features/sgesg/schede-actions";

// UN renderer per tutte e 63 le schede.
//
// ⚠️ È la decisione che tiene in piedi il piano. In `esg-nexus-v2` le schede sono 63
// componenti React scritti a mano: portarle una per una sarebbe stato 63 file nuovi da
// mantenere per sempre. Questo progetto ha già affrontato lo stesso bivio col corpus —
// 447 documenti resi da un componente solo — e sa come finisce l'altra strada.
//
// ⚠️ Ogni campo salva DA SOLO e manda solo se stesso, e il server scrive nel JSONB con
// `jsonb_set`: mai «leggi, modifica, riscrivi». È lo stesso difetto che ha azzerato la
// quantità salvando il costo, e su un oggetto JSON si ripresenterebbe identico.

export function VistaSchedaEsg({
  companyId,
  anno,
  faseKey,
  faseNome,
  programId,
  vista,
  soloLettura,
}: {
  companyId: string;
  anno: number;
  faseKey: string;
  faseNome: string;
  programId: string;
  vista: VistaScheda;
  soloLettura?: boolean;
}) {
  const router = useRouter();
  const { def, dati, stato } = vista;
  const [inCorso, avvia] = useTransition();
  const [errore, setErrore] = useState<string | null>(null);
  const [statoLocale, setStatoLocale] = useState(stato);
  const [daAggiornare, setDaAggiornare] = useState(false);

  if (daAggiornare && !inCorso) {
    setDaAggiornare(false);
    router.refresh();
  }

  const salva = (campo: string) => async (v: string | string[] | null) => {
    const esito = await setCampoSchedaAction(companyId, anno, faseKey, programId, def.key, campo, v);
    if (esito.ok) setDaAggiornare(true);
    return esito;
  };

  function cambiaStato(nuovo: "bozza" | "completata") {
    const precedente = statoLocale;
    setStatoLocale(nuovo);
    setErrore(null);
    avvia(async () => {
      const esito = await setStatoSchedaAction(companyId, anno, faseKey, programId, def.key, nuovo);
      if (!esito.ok) {
        setStatoLocale(precedente);
        setErrore(esito.errore);
        return;
      }
      setDaAggiornare(true);
    });
  }

  const indietro = `/aziende/${companyId}/sgesg/${anno}/${faseKey}`;

  return (
    <div className="mx-auto w-full max-w-4xl" data-scheda={def.key}>
      <Link
        href={indietro}
        className="inline-flex items-center gap-1.5 text-[13px] font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-3.5" aria-hidden />
        {faseNome}
      </Link>

      <div className="mt-3 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="font-mono text-[11px] uppercase tracking-wide text-muted-foreground">{def.codice}</p>
          <h1 className="font-display mt-1 text-2xl font-semibold tracking-tight">{def.titolo}</h1>
          {def.sottotitolo && (
            <p className="mt-1 max-w-prose text-sm text-muted-foreground">{def.sottotitolo}</p>
          )}
        </div>
        <Badge variant={statoLocale === "completata" ? "default" : "outline"} data-stato={statoLocale}>
          {statoLocale === "completata" ? "Completata" : statoLocale === "bozza" ? "In bozza" : "Non aperta"}
        </Badge>
      </div>

      {def.istruzione && (
        <div className="mt-5 flex gap-3 rounded-xl border border-area-ecosostenibilita/35 bg-area-ecosostenibilita/10 p-4">
          <Info className="mt-0.5 size-4 shrink-0 text-area-ecosostenibilita" aria-hidden />
          <p className="max-w-prose text-[13px] leading-relaxed">{def.istruzione}</p>
        </div>
      )}

      {errore && (
        <p className="mt-4 text-[13px] text-destructive" role="alert">
          {errore}
        </p>
      )}

      {/* ⚠️ Le schede con logica lo DICONO. Ventuno delle 63 sono tabelle e registri
          senza un campo indipendente — Risk Register, Matrice RACI, Valutazione IRO — e
          renderle come schede vuote le farebbe sembrare rotte. Il prodotto dichiara
          quello che non fa ancora, invece di mostrare il nulla. */}
      {def.haLogica ? (
        <div className="mt-6 rounded-xl border border-dashed p-6">
          <h2 className="text-[15px] font-semibold tracking-tight">Questa scheda è una tabella di lavoro</h2>
          <p className="mt-1.5 max-w-prose text-[13px] leading-relaxed text-muted-foreground">
            Non è un elenco di campi: è un registro a righe, e la sua compilazione ha una schermata
            dedicata che arriva con lo sviluppo successivo. Qui restano le sezioni previste dal metodo,
            così sai che cosa dovrà contenere.
          </p>
          {def.sezioni.length > 0 && (
            <ul className="mt-4 space-y-1.5">
              {def.sezioni.map((z, i) => (
                <li key={i} className="text-[13px] text-muted-foreground">
                  · {z.t}
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : (
        <div className="mt-6 space-y-6">
          {def.sezioni.map((z, i) => (
            <section key={i} aria-labelledby={`sez-${i}`}>
              <h2 id={`sez-${i}`} className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                {z.t}
              </h2>
              <div className="mt-3 grid gap-4 rounded-xl border p-4 sm:grid-cols-2">
                {z.c.map((c) => (
                  <Campo
                    key={c.k}
                    campo={c}
                    schedaKey={def.key}
                    valore={dati[c.k]}
                    soloLettura={soloLettura}
                    salva={salva(c.k)}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      {!soloLettura && !def.haLogica && (
        <div className="mt-8 flex flex-wrap items-center gap-3 border-t pt-5">
          <Button
            variant={statoLocale === "completata" ? "default" : "outline"}
            data-comando="completata"
            aria-pressed={statoLocale === "completata"}
            onClick={() => cambiaStato(statoLocale === "completata" ? "bozza" : "completata")}
          >
            <Check className="size-4" aria-hidden />
            {statoLocale === "completata" ? "Completata" : "Segna come completata"}
          </Button>
          {/* ⚠️ Lo stato è DICHIARATO, non dedotto dal riempimento: una scheda si può
              considerare chiusa con campi facoltativi vuoti, ed è un giudizio del
              consulente che il prodotto non deve indovinare al posto suo. */}
          <p className="text-[12px] text-muted-foreground">
            Lo dichiari tu: i campi facoltativi possono restare vuoti.
          </p>
        </div>
      )}
    </div>
  );
}

/** Un campo del catalogo, reso secondo il tipo che la scheda ha dichiarato. */
function Campo({
  campo,
  schedaKey,
  valore,
  soloLettura,
  salva,
}: {
  campo: CampoDef;
  schedaKey: string;
  valore: unknown;
  soloLettura?: boolean;
  // ⚠️ Un tipo solo per tutti i campi, array compreso: separarlo in due firme avrebbe
  // costretto il chiamante a sapere in anticipo che tipo di campo sta per rendere,
  // cioe' a duplicare la decisione che questo componente esiste per prendere.
  salva: (v: string | string[] | null) => Promise<{ ok: boolean; errore?: string }>;
}) {
  // ⚠️ L'identificativo porta la SCHEDA e la chiave: due schede sulla stessa pagina non
  // esistono oggi, ma due campi con lo stesso `id` fanno puntare l'etichetta dell'uno al
  // campo dell'altro, ed è un difetto che questo progetto ha già incontrato.
  const id = `sc-${schedaKey}-${campo.k}`;
  const largo = campo.w && campo.w > 1;
  const etichetta = campo.l + (campo.r ? " *" : "");

  if (campo.t === "scelte" && campo.o?.length) {
    return (
      <div className="sm:col-span-2">
        <ScegliPiu id={id} etichetta={etichetta} opzioni={campo.o} valore={valore} soloLettura={soloLettura} salva={salva} />
      </div>
    );
  }

  if (campo.t === "scelta" && campo.o?.length) {
    return (
      <div className={largo ? "sm:col-span-2" : undefined}>
        <ScegliUno id={id} etichetta={etichetta} opzioni={campo.o} valore={valore} soloLettura={soloLettura} salva={salva} />
      </div>
    );
  }

  return (
    <div className={largo ? "sm:col-span-2" : undefined}>
      <CampoTesto
        id={id}
        etichetta={etichetta}
        valore={valore === undefined || valore === null ? null : String(valore)}
        multiriga={campo.t === "testo_lungo"}
        salva={salva as never}
      />
    </div>
  );
}

function ScegliUno({
  id,
  etichetta,
  opzioni,
  valore,
  soloLettura,
  salva,
}: {
  id: string;
  etichetta: string;
  opzioni: string[];
  valore: unknown;
  soloLettura?: boolean;
  salva: (v: string | string[] | null) => Promise<{ ok: boolean; errore?: string }>;
}) {
  const [scelto, setScelto] = useState(valore === undefined || valore === null ? "" : String(valore));
  const [errore, setErrore] = useState<string | null>(null);
  const [, avvia] = useTransition();

  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{etichetta}</Label>
      <select
        id={id}
        value={scelto}
        disabled={soloLettura}
        className="h-9 w-full rounded-md border bg-transparent px-3 text-sm"
        onChange={(e) => {
          const v = e.target.value;
          const precedente = scelto;
          // Comando ottimistico: una tendina che aspetta il viaggio di rete si legge
          // come rotta. Si ripristina da sola se il server rifiuta.
          setScelto(v);
          setErrore(null);
          avvia(async () => {
            const esito = await salva(v === "" ? null : v);
            if (!esito.ok) {
              setScelto(precedente);
              setErrore(esito.errore ?? "Non salvato");
            }
          });
        }}
      >
        <option value="">—</option>
        {opzioni.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
      {errore && (
        <p className="text-[12px] text-destructive" role="alert">
          {errore}
        </p>
      )}
    </div>
  );
}

/**
 * Scelta multipla: il valore salvato e' un ARRAY, non una stringa con le virgole.
 *
 * ⚠️ Concatenare con una virgola sembra piu' semplice e non lo e': la prima opzione che
 * contiene una virgola nel proprio testo rende impossibile rileggere la scelta, e nel
 * catalogo ce ne sono. Un array e' quello che il campo e', e il JSONB lo tiene.
 */
function ScegliPiu({
  id,
  etichetta,
  opzioni,
  valore,
  soloLettura,
  salva,
}: {
  id: string;
  etichetta: string;
  opzioni: string[];
  valore: unknown;
  soloLettura?: boolean;
  salva: (v: string | string[] | null) => Promise<{ ok: boolean; errore?: string }>;
}) {
  const iniziale = Array.isArray(valore) ? (valore as string[]) : [];
  const [scelte, setScelte] = useState<string[]>(iniziale);
  const [errore, setErrore] = useState<string | null>(null);
  const [, avvia] = useTransition();

  function commuta(o: string) {
    const precedente = scelte;
    const nuove = scelte.includes(o) ? scelte.filter((x) => x !== o) : [...scelte, o];
    setScelte(nuove);
    setErrore(null);
    avvia(async () => {
      const esito = await salva(nuove.length ? nuove : null);
      if (!esito.ok) {
        setScelte(precedente);
        setErrore(esito.errore ?? "Non salvato");
      }
    });
  }

  return (
    <fieldset className="space-y-2" id={id}>
      <legend className="text-sm font-medium">{etichetta}</legend>
      <div className="flex flex-wrap gap-1.5">
        {opzioni.map((o) => (
          <button
            key={o}
            type="button"
            disabled={soloLettura}
            aria-pressed={scelte.includes(o)}
            // Il nome accessibile porta l'ETICHETTA del campo: dodici campi a scelta
            // multipla con opzioni omonime darebbero pulsanti indistinguibili.
            aria-label={`${etichetta}: ${o}`}
            onClick={() => commuta(o)}
            className={
              "rounded-full border px-3 py-1 text-[12.5px] transition-colors " +
              (scelte.includes(o)
                ? "border-area-ecosostenibilita bg-area-ecosostenibilita/15 font-medium"
                : "hover:bg-accent")
            }
          >
            {o}
          </button>
        ))}
      </div>
      {errore && (
        <p className="text-[12px] text-destructive" role="alert">
          {errore}
        </p>
      )}
    </fieldset>
  );
}
