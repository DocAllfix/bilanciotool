"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { CampoData, CampoScelta, CampoTesto } from "@/components/comune/campo";
import { RendeCorpus } from "./rende-corpus";
import { ETICHETTA_STATO } from "./vista-procedure";
import { setOverrideAction, setStatoDocumentoAction } from "@/features/corpus/actions";
import { testoParagrafo } from "@/lib/calc/corpus/blocchi";
import { STATI_DOC } from "@/features/corpus/validation";
import type { DocumentoCorpus } from "@/features/corpus/letture";
import type { ActionEsito } from "@/features/esito";

// Un documento del corpus: si legge, si personalizza blocco per blocco, si approva.
//
// ⚠️ La personalizzazione punta al blocco per CHIAVE, mai per posizione. Nei prototipi
// era indicizzata per posizione nell'array (`ovr[7]`): bastava che un blocco si
// spostasse — cioè un aggiornamento del contenuto metodologico — e il testo di ogni
// cliente scivolava sul paragrafo sbagliato, in silenzio. Qui la chiave è derivata dal
// contenuto e la riga ha una chiave esterna vera.

export function VistaDocumento({
  companyId,
  rotta,
  dati,
  tornaA,
}: {
  companyId: string;
  /** La rotta da rivalidare. La conosce il modulo: il corpus è condiviso da sei. */
  rotta: string;
  dati: DocumentoCorpus;
  tornaA: string;
}) {
  const [modifica, setModifica] = useState(false);
  const d = dati.documento;

  const salvaStato = (campo: string) => (valore: string | null) =>
    setStatoDocumentoAction(rotta, {
      companyId,
      contentSetId: dati.contentSetId,
      docCode: d.code,
      [campo]: valore ?? "",
    } as never);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href={tornaA}
          className="inline-flex items-center gap-1.5 text-[13px] text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" /> Torna all&apos;elenco
        </Link>
        <Button
          size="sm"
          variant={modifica ? "default" : "ghost"}
          onClick={() => setModifica((m) => !m)}
          data-tour="corpus-personalizza"
        >
          {modifica ? "Chiudi la personalizzazione" : "Personalizza il testo"}
        </Button>
      </div>

      <div>
        <p className="font-mono text-[12px] text-muted-foreground">
          {d.code}
          {d.rif ? ` · ${d.rif}` : ""}
        </p>
        <h2 className="font-display text-xl font-semibold">{d.titolo}</h2>
        <p className="mt-0.5 text-[12px] text-muted-foreground">
          {ETICHETTA_STATO[d.stato]} · revisione {d.revisione}
        </p>
      </div>

      {modifica ? (
        <Personalizzazione companyId={companyId} rotta={rotta} dati={dati} salvaStato={salvaStato} />
      ) : (
        <article className="corpus-lettura rounded-xl border p-5" data-slot="documento-corpus">
          <RendeCorpus
            blocchi={dati.blocchi}
            override={dati.override}
            segnaposti={dati.segnaposti}
            contesto={dati.contesto}
          />
        </article>
      )}
    </div>
  );
}

/**
 * La modalità di personalizzazione: stato del documento e testo dei blocchi.
 *
 * ⚠️ Solo i blocchi di TESTO si personalizzano. Le tabelle e i riquadri firma no, ed è
 * una scelta del motore (`conOverride` li restituisce intatti): una tabella è una griglia
 * di celle, e sostituirla con una stringa la distruggerebbe senza che nessuno se ne
 * accorga fino alla stampa.
 */
function Personalizzazione({
  companyId,
  rotta,
  dati,
  salvaStato,
}: {
  companyId: string;
  rotta: string;
  dati: DocumentoCorpus;
  salvaStato: (campo: string) => (valore: string | null) => Promise<ActionEsito>;
}) {
  const d = dati.documento;
  const modificabili = dati.blocchi.filter((b) => b.tipo === "p" || b.tipo === "h");

  return (
    <div className="space-y-6">
      <section aria-label="Stato del documento">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Stato del documento
        </h3>
        <div className="mt-3 grid gap-4 rounded-xl border p-4 sm:grid-cols-2">
          <CampoScelta
            id={`corpus-stato-${d.code}`}
            etichetta="Stato"
            valore={d.stato}
            opzioni={STATI_DOC.map((s) => ETICHETTA_STATO[s])}
            salva={async (v) => {
              const chiave = STATI_DOC.find((s) => ETICHETTA_STATO[s] === v) ?? null;
              return salvaStato("stato")(chiave);
            }}
          />
          <CampoTesto
            id={`corpus-rev-${d.code}`}
            etichetta="Revisione"
            valore={d.revisione}
            salva={salvaStato("revisione")}
          />
          <CampoData
            id={`corpus-data-${d.code}`}
            etichetta="Data di emissione"
            valore={d.dataEmissione}
            salva={salvaStato("dataEmissione")}
          />
          <CampoTesto
            id={`corpus-note-${d.code}`}
            etichetta="Note"
            valore={d.note}
            multiriga
            salva={salvaStato("note")}
          />
        </div>
      </section>

      <section aria-label="Testo del documento">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Testo, blocco per blocco
        </h3>
        <p className="mt-1 text-[12px] text-muted-foreground">
          Il testo comune resta quello del catalogo: qui si scrive la versione di questa azienda. Svuotare il
          campo riporta il blocco all&apos;originale.
        </p>
        <div className="mt-3 space-y-4">
          {modificabili.map((b) => (
            <Blocco
              key={b.blockId}
              companyId={companyId}
              rotta={rotta}
              contentSetId={dati.contentSetId}
              docCode={d.code}
              blockId={b.blockId}
              originale={testoParagrafo(b.contenuto)}
              suMisura={dati.override[b.blockId] ?? null}
            />
          ))}
        </div>
      </section>
    </div>
  );
}

function Blocco({
  companyId,
  rotta,
  contentSetId,
  docCode,
  blockId,
  originale,
  suMisura,
}: {
  companyId: string;
  rotta: string;
  contentSetId: string;
  docCode: string;
  blockId: string;
  originale: string;
  suMisura: string | null;
}) {
  const router = useRouter();
  const [valore, setValore] = useState(suMisura ?? originale);
  const [personalizzato, setPersonalizzato] = useState(suMisura !== null);
  const [errore, setErrore] = useState<string | null>(null);
  const id = `blocco-${blockId}`;

  async function salva(testo: string) {
    setErrore(null);
    const esito = await setOverrideAction(rotta, { companyId, contentSetId, docCode, blockId, testo });
    if (!esito.ok) {
      setErrore(esito.errore);
      return;
    }
    // ⚠️ Il vuoto NON è un testo vuoto: significa «torna all'originale». L'azione lo dice,
    // e il campo torna a mostrare il testo di catalogo senza ricaricare la pagina.
    if (esito.dati?.rimosso) {
      setPersonalizzato(false);
      setValore(originale);
    } else {
      setPersonalizzato(true);
    }
    setTimeout(() => router.refresh(), 0);
  }

  return (
    <div className="rounded-lg border p-3" data-slot="blocco-corpus" data-blocco={blockId}>
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <Label htmlFor={id} className="font-mono text-[11px] text-muted-foreground">
          {blockId}
          {personalizzato && <span className="ml-2 text-primary">su misura</span>}
        </Label>
        {personalizzato && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => salva("")}
            aria-label={`Ripristina il testo originale del blocco ${blockId}`}
          >
            <RotateCcw className="size-3.5" /> Ripristina
          </Button>
        )}
      </div>
      <Textarea
        id={id}
        value={valore}
        onChange={(e) => setValore(e.target.value)}
        onBlur={(e) => {
          if (e.target.value !== (suMisura ?? originale)) salva(e.target.value);
        }}
        rows={Math.min(10, Math.max(2, Math.ceil(valore.length / 90)))}
      />
      {errore && (
        <p className="mt-1 text-[12px] text-destructive" role="alert">
          {errore}
        </p>
      )}
    </div>
  );
}
