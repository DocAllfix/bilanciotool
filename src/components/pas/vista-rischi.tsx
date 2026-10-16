"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CampoData, CampoScelta, CampoTesto } from "@/components/comune/campo";
import { BottoneElimina } from "@/components/comune/bottone-elimina";
import { CampoCasella, Intro, SceltaScala, pct, pl } from "@/components/comune/percorso";
import { CATEGORIE_FORNITORE, ESITI_FORNITORE, RISCHI_FORNITORE } from "@/lib/calc/pas/tipi";
import { AMBITI_VOCI, SceltaVoce, vociAree, type ComandiPas, type DatiPas } from "./comune";

// Rischi sociali e due diligence sui fornitori (6.1, 8.1.3, A.1).
//
// ⚠️ La gravità è PER LE PERSONE esposte, non per l'azienda: un rischio che costa poco
// all'organizzazione e molto a un lavoratore è un rischio alto.
//
// ⚠️ Un rischio con la sola probabilità o la sola gravità è «da valutare», non zero: il
// prototipo lo contava come rischio nullo e spariva dalla matrice.

type Rischio = DatiPas["rischi"][number];
type Fornitore = DatiPas["fornitori"][number];

const TONO: Record<string, "destructive" | "secondary" | "outline"> = { alto: "destructive", medio: "secondary", basso: "outline" };

export function VistaRischi({ dati, cmd }: { dati: DatiPas; cmd: ComandiPas }) {
  const [aperto, setAperto] = useState<string | null>(null);
  const [errore, setErrore] = useState<string | null>(null);
  const r = dati.statoRischi;
  const f = dati.statoFornitori;

  async function nuovo(tipo: "rischio" | "fornitore") {
    setErrore(null);
    const e = await cmd.crea(tipo);
    if (!e.ok) return setErrore(e.errore);
    if (e.dati) setAperto(String(e.dati));
  }

  return (
    <div className="space-y-6">
      <Intro titolo="Rischi sociali">
        Probabilità e gravità per le persone, da 1 a 5: alto da {dati.parametri.alto}, medio da {dati.parametri.medio}.{" "}
        {pl(r.valutati, "valutato", "valutati")} su {r.totale}: {pl(r.alti, "alto", "alti")}, {pl(r.medi, "medio", "medi")},{" "}
        {pl(r.bassi, "basso", "bassi")}.
      </Intro>
      {r.altiScoperti.length > 0 && (
        <p role="alert" className="text-sm text-destructive" data-alti-scoperti>
          {pl(r.altiScoperti.length, "rischio alto è", "rischi alti sono")}{" "}senza misure di prevenzione.
        </p>
      )}
      <div className="flex flex-wrap items-center gap-3">
        <Button size="sm" onClick={() => nuovo("rischio")} data-tour="pas-nuovo-rischio">
          <Plus className="size-3.5" /> Nuovo rischio
        </Button>
        {errore && (
          <p role="alert" className="text-sm text-destructive">
            {errore}
          </p>
        )}
      </div>
      <div className="space-y-2" data-rischi>
        {dati.rischi.map((x, i) => (
          <SchedaRischio key={x.id} x={x} i={i} dati={dati} cmd={cmd} aperto={aperto === x.id} />
        ))}
      </div>

      <div className="pt-4">
        <Intro titolo="Fornitori e due diligence">
          I fornitori rilevanti per i rischi sociali, la clausola, il questionario e la verifica.{" "}
          {pl(f.fornitori, "censito", "censiti")}, con clausola {pct(f.quotaClausola)}, verificati {pct(f.quotaVerificati)}.
          {f.altiMaiVerificati.length ? ` A rischio alto e mai verificati: ${f.altiMaiVerificati.join(", ")}.` : ""}
        </Intro>
        <Button size="sm" onClick={() => nuovo("fornitore")} data-tour="pas-nuovo-fornitore">
          <Plus className="size-3.5" /> Nuovo fornitore
        </Button>
        <div className="mt-3 space-y-2" data-fornitori>
          {dati.fornitori.map((x, i) => (
            <SchedaFornitore key={x.id} f={x} i={i} cmd={cmd} aperto={aperto === x.id} />
          ))}
        </div>
      </div>
    </div>
  );
}

function SchedaRischio({ x, i, dati, cmd, aperto }: { x: Rischio; i: number; dati: DatiPas; cmd: ComandiPas; aperto: boolean }) {
  const id = (c: string) => `pas-ris-${x.id}-${c}`;
  const salva = (c: string) => cmd.riga("rischio", x.id, c);
  const titolo = x.testo?.trim() || `Rischio ${i + 1}`;
  const scala = (asse: "probabilita" | "gravita") => dati.catalogo.scale.filter((s) => s.asse === asse);
  return (
    <details className="rounded-lg border bg-card" open={aperto || undefined} data-rischio={x.id}>
      <summary className="flex cursor-pointer list-none items-center gap-3 px-4 py-3">
        <span className="w-9 shrink-0 font-mono text-[12px] text-muted-foreground">{x.area}</span>
        <span className="min-w-0 flex-1 truncate font-medium">{titolo}</span>
        <span className="hidden text-[12px] text-muted-foreground sm:inline">{x.ambito === "F" ? "fornitura" : "organizzazione"}</span>
        {x.classe ? (
          <Badge variant={TONO[x.classe]} data-classe={x.classe}>
            {x.livello} · {x.classe}
          </Badge>
        ) : (
          <Badge variant="outline">da valutare</Badge>
        )}
      </summary>
      <div className="grid gap-4 border-t px-4 py-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <CampoTesto id={id("testo")} etichetta="Rischio" valore={x.testo} salva={salva("testo")} />
        </div>
        <SceltaVoce id={id("area")} etichetta="Area" valore={x.area} voci={vociAree(dati, true)} salva={salva("area")} />
        <SceltaVoce id={id("ambito")} etichetta="Ambito" valore={x.ambito} voci={AMBITI_VOCI} salva={salva("ambito")} />
        <SceltaScala id={id("probabilita")} etichetta="Probabilità" valore={x.probabilita} voci={scala("probabilita")} salva={salva("probabilita")} />
        <SceltaScala id={id("gravita")} etichetta="Gravità per le persone" valore={x.gravita} voci={scala("gravita")} salva={salva("gravita")} />
        <div className="sm:col-span-2">
          <CampoTesto id={id("misure")} etichetta="Misure di prevenzione e mitigazione" valore={x.misure} multiriga salva={salva("misure")} />
        </div>
        <CampoTesto id={id("responsabile")} etichetta="Responsabile" valore={x.responsabile} salva={salva("responsabile")} />
        <div className="flex items-end justify-end">
          <BottoneElimina
            etichetta={`Elimina il rischio ${i + 1}`}
            titolo="Eliminare il rischio dall'inventario?"
            descrizione="Il rischio esce dall'inventario. I documenti già pubblicati non cambiano."
            onConferma={() => cmd.elimina("rischio", x.id)}
          />
        </div>
      </div>
    </details>
  );
}

function SchedaFornitore({ f, i, cmd, aperto }: { f: Fornitore; i: number; cmd: ComandiPas; aperto: boolean }) {
  const id = (c: string) => `pas-forn-${f.id}-${c}`;
  const salva = (c: string) => cmd.riga("fornitore", f.id, c);
  const titolo = f.nome?.trim() || `Fornitore ${i + 1}`;
  return (
    <details className="rounded-lg border bg-card" open={aperto || undefined} data-fornitore={f.id}>
      <summary className="flex cursor-pointer list-none items-center gap-3 px-4 py-3">
        <span className="min-w-0 flex-1 truncate font-medium">{titolo}</span>
        {f.rischio === "Alto" && !f.verificatoIl && <Badge variant="destructive">alto, mai verificato</Badge>}
        <span className="text-[12px] text-muted-foreground">{f.categoria}</span>
      </summary>
      <div className="grid gap-4 border-t px-4 py-4 sm:grid-cols-2">
        <CampoTesto id={id("nome")} etichetta="Fornitore" valore={f.nome} salva={salva("nome")} />
        <CampoScelta id={id("categoria")} etichetta="Categoria" valore={f.categoria} opzioni={CATEGORIE_FORNITORE} salva={salva("categoria")} />
        <CampoTesto id={id("paese")} etichetta="Paese" valore={f.paese} salva={salva("paese")} />
        <CampoScelta id={id("rischio")} etichetta="Rischio sociale" valore={f.rischio} opzioni={RISCHI_FORNITORE} salva={salva("rischio")} />
        <CampoCasella id={id("clausola")} etichetta="Ha sottoscritto i requisiti sociali" valore={f.clausola} salva={salva("clausola")} />
        <CampoCasella id={id("questionario")} etichetta="Ha risposto al questionario" valore={f.questionario} salva={salva("questionario")} />
        <CampoData id={id("verificatoIl")} etichetta="Verificato il" valore={f.verificatoIl} salva={salva("verificatoIl")} />
        <CampoScelta id={id("esito")} etichetta="Esito della verifica" valore={f.esito} opzioni={ESITI_FORNITORE} salva={salva("esito")} />
        <div className="flex justify-end sm:col-span-2">
          <BottoneElimina
            etichetta={`Elimina il fornitore «${titolo}»`}
            titolo={`Eliminare «${titolo}»?`}
            descrizione="Il fornitore esce dall'elenco. I documenti già pubblicati non cambiano."
            onConferma={() => cmd.elimina("fornitore", f.id)}
          />
        </div>
      </div>
    </details>
  );
}
