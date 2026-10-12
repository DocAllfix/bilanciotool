"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { CampoData, CampoScelta, CampoTesto } from "@/components/comune/campo";
import { BottoneElimina } from "@/components/comune/bottone-elimina";
import { GARANZIE, QUALIFICHE } from "@/lib/calc/gdpr/tipi";
import { CONTRATTI, ESITI_DPIA, ESITI_FORNITORE, STATI_DPIA } from "@/features/gdpr/validation";
import { CampoCasella, Intro, type ComandiGdpr, type DatiGdpr, type Esito } from "./comune";

// Vista 4 — Rischi e responsabili.
//
// ⚠️ Un rischio con la sola probabilità o la sola gravità è «da valutare», non zero: il
// prototipo lo contava come rischio nullo e il trattamento spariva dalla matrice.
//
// ⚠️ «Non dovuto» per il contratto ex art. 28 vale SOLO per un titolare autonomo. Il
// prototipo lo accettava anche per un responsabile, e il fornitore risultava coperto.

type Trattamento = DatiGdpr["trattamenti"][number];
type Fornitore = DatiGdpr["fornitori"][number];

const TONO: Record<string, "destructive" | "secondary" | "outline"> = { alto: "destructive", medio: "secondary", basso: "outline" };

export function VistaRischi({ dati, cmd }: { dati: DatiGdpr; cmd: ComandiGdpr }) {
  const [aperto, setAperto] = useState<string | null>(null);
  const [errore, setErrore] = useState<string | null>(null);
  const r = dati.rischi;
  const f = dati.statoFornitori;

  async function nuovoFornitore() {
    setErrore(null);
    const e = await cmd.crea("fornitore");
    if (!e.ok) return setErrore(e.errore);
    if (e.dati) setAperto(String(e.dati));
  }

  return (
    <div className="space-y-6">
      <Intro titolo="Rischi per gli interessati">
        Per ogni trattamento: i criteri che rendono necessaria la valutazione d&apos;impatto (da {dati.parametri.sogliaDpia} in su),
        probabilità e gravità da 1 a 5, le misure. {r.valutati} valutati su {r.trattamenti}: {r.alti} alti, {r.medi} medi,{" "}
        {r.bassi}{" "}bassi.
      </Intro>

      {dati.trattamenti.length === 0 ? (
        <p className="text-sm text-muted-foreground">Prima si registrano i trattamenti, nella vista Trattamenti.</p>
      ) : (
        <div className="space-y-2" data-rischi>
          {dati.trattamenti.map((t, i) => (
            <SchedaRischio key={t.id} t={t} i={i} dati={dati} cmd={cmd} />
          ))}
        </div>
      )}

      <div className="pt-4">
        <Intro titolo="Responsabili e altri soggetti esterni">
          Chi tratta dati per conto dell&apos;organizzazione, il contratto ex art. 28 e i trasferimenti verso paesi terzi.{" "}
          {f.fornitori} registrati, contratti coperti {f.quotaContratti === null ? "—" : `${f.quotaContratti}%`}.
        </Intro>
        <div className="mb-3 flex flex-wrap items-center gap-3">
          <Button onClick={nuovoFornitore} data-tour="gdpr-nuovo-fornitore">
            <Plus className="size-4" /> Nuovo soggetto esterno
          </Button>
          {errore && (
            <p role="alert" className="text-sm text-destructive">
              {errore}
            </p>
          )}
        </div>
        <div className="space-y-2" data-fornitori>
          {dati.fornitori.map((x, i) => (
            <SchedaFornitore key={x.id} f={x} i={i} cmd={cmd} aperto={aperto === x.id} />
          ))}
        </div>
      </div>
    </div>
  );
}

function SchedaRischio({ t, i, dati, cmd }: { t: Trattamento; i: number; dati: DatiGdpr; cmd: ComandiGdpr }) {
  const id = (c: string) => `gdpr-ris-${t.id}-${c}`;
  const salva = (c: string) => cmd.riga("trattamento", t.id, c);
  const titolo = t.nome?.trim() || `Trattamento ${i + 1}`;
  const scala = (asse: "probabilita" | "gravita") => dati.catalogo.scale.filter((s) => s.asse === asse);
  return (
    <details className="rounded-lg border bg-card" data-rischio={t.id}>
      <summary className="flex cursor-pointer list-none items-center gap-3 px-4 py-3">
        <span className="min-w-0 flex-1 truncate font-medium">{titolo}</span>
        <span className="text-[12px] tabular-nums text-muted-foreground">
          {t.numeroCriteri} criteri{t.dpiaNecessaria ? " · valutazione d'impatto necessaria" : ""}
        </span>
        {t.classe ? (
          <Badge variant={TONO[t.classe]} data-classe={t.classe}>
            {t.livello} · {t.classe}
          </Badge>
        ) : (
          <Badge variant="outline">da valutare</Badge>
        )}
      </summary>
      <div className="space-y-5 border-t px-4 py-4">
        <fieldset>
          <legend className="text-sm font-medium">Criteri di vaglio (Linee guida WP248)</legend>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            {dati.catalogo.criteri.map((c) => (
              <CampoCasella
                key={c.key}
                id={id(`criterio-${c.key}`)}
                etichetta={c.testo}
                valore={t.criteri.includes(c.key)}
                salva={(acceso) => cmd.criterio(t.id, c.key, acceso)}
              />
            ))}
          </div>
        </fieldset>
        <div className="grid gap-4 sm:grid-cols-2">
          <SceltaScala id={id("probabilita")} etichetta="Probabilità" valore={t.probabilita} voci={scala("probabilita")} salva={salva("probabilita")} />
          <SceltaScala id={id("gravita")} etichetta="Gravità per l'interessato" valore={t.gravita} voci={scala("gravita")} salva={salva("gravita")} />
          <div className="sm:col-span-2">
            <CampoTesto id={id("mitigazione")} etichetta="Misure di mitigazione" valore={t.mitigazione} multiriga salva={salva("mitigazione")} />
          </div>
        </div>
        {t.dpiaNecessaria && (
          <div className="grid gap-4 rounded-md border border-dashed p-4 sm:grid-cols-2" data-dpia={t.id}>
            <p className="text-sm font-medium sm:col-span-2">Valutazione d&apos;impatto (art. 35)</p>
            <CampoScelta id={id("dpiaStato")} etichetta="Stato" valore={t.dpiaStato} opzioni={STATI_DPIA} salva={salva("dpiaStato")} />
            <CampoData id={id("dpiaData")} etichetta="Data" valore={t.dpiaData} salva={salva("dpiaData")} />
            <div className="sm:col-span-2">
              <CampoTesto id={id("dpiaNecessita")} etichetta="Necessità e proporzionalità" valore={t.dpiaNecessita} multiriga salva={salva("dpiaNecessita")} />
            </div>
            <CampoTesto id={id("dpiaParere")} etichetta="Parere del responsabile della protezione dei dati" valore={t.dpiaParere} salva={salva("dpiaParere")} />
            <CampoScelta id={id("dpiaEsito")} etichetta="Esito" valore={t.dpiaEsito} opzioni={ESITI_DPIA} salva={salva("dpiaEsito")} />
          </div>
        )}
      </div>
    </details>
  );
}

/** Una scala da 1 a 5 col nome di ogni gradino: «3 · Possibile», non «3». */
function SceltaScala({
  id,
  etichetta,
  valore,
  voci,
  salva,
}: {
  id: string;
  etichetta: string;
  valore: number | null;
  voci: { valore: number; nome: string; descrizione: string }[];
  salva: (v: unknown) => Promise<Esito>;
}) {
  const [scelto, setScelto] = useState(valore === null ? "" : String(valore));
  const [errore, setErrore] = useState<string | null>(null);
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{etichetta}</Label>
      <select
        id={id}
        className="h-9 w-full rounded-md border bg-background px-2 text-sm"
        value={scelto}
        onChange={async (e) => {
          const v = e.currentTarget.value;
          const prima = scelto;
          setScelto(v);
          setErrore(null);
          const esito = await salva(v);
          if (!esito.ok) {
            setScelto(prima);
            setErrore(esito.errore);
          }
        }}
      >
        <option value="">—</option>
        {voci.map((x) => (
          <option key={x.valore} value={String(x.valore)} title={x.descrizione}>
            {x.valore} · {x.nome}
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

function SchedaFornitore({ f, i, cmd, aperto }: { f: Fornitore; i: number; cmd: ComandiGdpr; aperto: boolean }) {
  const id = (c: string) => `gdpr-forn-${f.id}-${c}`;
  const salva = (c: string) => cmd.riga("fornitore", f.id, c);
  const titolo = f.nome?.trim() || `Soggetto esterno ${i + 1}`;
  return (
    <details className="rounded-lg border bg-card" open={aperto || undefined} data-fornitore={f.id}>
      <summary className="flex cursor-pointer list-none items-center gap-3 px-4 py-3">
        <span className="min-w-0 flex-1 truncate font-medium">{titolo}</span>
        {f.incoerente && <Badge variant="destructive">contratto incoerente</Badge>}
        <span className="text-[12px] text-muted-foreground">{f.qualifica}</span>
      </summary>
      <div className="grid gap-4 border-t px-4 py-4 sm:grid-cols-2">
        <CampoTesto id={id("nome")} etichetta="Soggetto" valore={f.nome} salva={salva("nome")} />
        <CampoTesto id={id("servizio")} etichetta="Servizio" valore={f.servizio} salva={salva("servizio")} />
        <CampoScelta id={id("qualifica")} etichetta="Qualifica" valore={f.qualifica} opzioni={QUALIFICHE} salva={salva("qualifica")} />
        <CampoScelta
          id={id("contratto")}
          etichetta="Contratto ex art. 28"
          valore={f.contratto}
          opzioni={CONTRATTI}
          aiuto="«Non dovuto» vale solo per un titolare autonomo."
          salva={salva("contratto")}
        />
        <CampoTesto id={id("paese")} etichetta="Paese del trattamento" valore={f.paese} salva={salva("paese")} />
        <CampoScelta id={id("garanzia")} etichetta="Garanzia per il trasferimento" valore={f.garanzia} opzioni={GARANZIE} salva={salva("garanzia")} />
        <CampoData id={id("verificatoIl")} etichetta="Verificato il" valore={f.verificatoIl} salva={salva("verificatoIl")} />
        <CampoScelta id={id("esito")} etichetta="Esito della verifica" valore={f.esito} opzioni={ESITI_FORNITORE} salva={salva("esito")} />
        <div className="flex justify-end sm:col-span-2">
          <BottoneElimina
            etichetta={`Elimina il soggetto «${titolo}»`}
            titolo={`Eliminare «${titolo}»?`}
            descrizione="Il soggetto esce dall'elenco dei responsabili. I documenti già pubblicati non cambiano."
            onConferma={() => cmd.elimina("fornitore", f.id)}
          />
        </div>
      </div>
    </details>
  );
}
