"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { CampoScelta, CampoTesto } from "@/components/comune/campo";
import { BottoneElimina } from "@/components/comune/bottone-elimina";
import { BASI, CONDIZIONI_9 } from "@/lib/calc/gdpr/tipi";
import { RUOLI_TRATTAMENTO } from "@/features/gdpr/validation";
import { CampoCasella, Intro, pl, type ComandiGdpr, type DatiGdpr } from "./comune";

// Vista 2 — Registro dei trattamenti (art. 30). Un trattamento per finalità.
//
// ⚠️ Una riga appena creata si APRE: chi preme «Nuovo trattamento» vuole compilarlo, e
// trovarlo chiuso in fondo a un elenco lungo lo costringerebbe a cercarlo.

const SI_NO = ["Sì", "No"] as const;

type Trattamento = DatiGdpr["trattamenti"][number];

export function VistaTrattamenti({ dati, cmd }: { dati: DatiGdpr; cmd: ComandiGdpr }) {
  const [aperto, setAperto] = useState<string | null>(null);
  const [errore, setErrore] = useState<string | null>(null);
  const presenti = new Set(dati.trattamenti.map((t) => t.tipoKey).filter(Boolean));
  const disponibili = dati.catalogo.trattamentiTipo.filter((t) => !presenti.has(t.key));

  async function nuovo() {
    setErrore(null);
    const e = await cmd.crea("trattamento");
    if (!e.ok) return setErrore(e.errore);
    if (e.dati) setAperto(String(e.dati));
  }

  async function daCatalogo(key: string) {
    setErrore(null);
    const e = await cmd.trattamentoTipo(key);
    if (!e.ok) return setErrore(e.errore);
    if (e.dati) setAperto(String(e.dati));
  }

  return (
    <div className="space-y-6">
      <Intro titolo="Registro dei trattamenti">
        Un trattamento per finalità, con i sette elementi dell&apos;art. 30: finalità, base giuridica, interessati, categorie di
        dati, destinatari, conservazione e misure di sicurezza. {pl(dati.registro.trattamenti, "registrato", "registrati")}, completezza media{" "}
        {Math.round(dati.registro.completezza * 100)}%.
      </Intro>

      <div className="flex flex-wrap items-center gap-3">
        <Button onClick={nuovo} data-tour="gdpr-nuovo-trattamento">
          <Plus className="size-4" /> Nuovo trattamento
        </Button>
        {errore && (
          <p role="alert" className="text-sm text-destructive">
            {errore}
          </p>
        )}
      </div>

      {disponibili.length > 0 && (
        <Card data-tour="gdpr-catalogo-trattamenti">
          <CardHeader>
            <h3 className="text-[15px] font-semibold tracking-tight">Trattamenti tipici</h3>
            <p className="text-sm text-muted-foreground">
              Precompilati con finalità, base, interessati, dati e conservazione tipici: si aggiungono e si adattano.
            </p>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {disponibili.map((t) => (
              <Button key={t.key} variant="outline" size="sm" onClick={() => daCatalogo(t.key)} aria-label={`Aggiungi «${t.nome}»`}>
                <Plus className="size-3.5" /> {t.nome}
              </Button>
            ))}
          </CardContent>
        </Card>
      )}

      {dati.trattamenti.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nessun trattamento registrato.</p>
      ) : (
        <div className="space-y-2" data-trattamenti>
          {dati.trattamenti.map((t, i) => (
            <SchedaTrattamento key={t.id} t={t} i={i} cmd={cmd} aperto={aperto === t.id} />
          ))}
        </div>
      )}
    </div>
  );
}

function SchedaTrattamento({ t, i, cmd, aperto }: { t: Trattamento; i: number; cmd: ComandiGdpr; aperto: boolean }) {
  const id = (c: string) => `gdpr-tr-${t.id}-${c}`;
  const salva = (c: string) => cmd.riga("trattamento", t.id, c);
  const titolo = t.nome?.trim() || `Trattamento ${i + 1}`;
  return (
    <details className="group rounded-lg border bg-card" open={aperto || undefined} data-trattamento={t.id}>
      <summary className="flex cursor-pointer list-none items-center gap-3 px-4 py-3">
        <span className="min-w-0 flex-1 truncate font-medium">{titolo}</span>
        {t.propostaMotivo && (
          <Badge variant="outline" className="border-primary/40 text-primary" data-proposta>
            proposto
          </Badge>
        )}
        {t.dpiaNecessaria && <Badge variant="secondary">valutazione d&apos;impatto</Badge>}
        <span className="text-[12px] tabular-nums text-muted-foreground">{Math.round(t.completezza * 100)}% completo</span>
      </summary>
      {/* Un trattamento proposto non è ancora censito: il registro consegnato non lo porta
          finché il consulente non lo guarda. Modificare un campo lo conferma; «Conferma» lo fa
          senza cambiare niente. */}
      {t.propostaMotivo && (
        <p className="border-t px-4 py-2.5 text-[12.5px] text-muted-foreground">
          {t.propostaMotivo}{" "}
          <button
            type="button"
            className="font-medium text-primary underline-offset-2 hover:underline"
            onClick={() => salva("nome")(t.nome ?? "")}
            aria-label={`Conferma il trattamento «${titolo}»`}
          >
            Conferma
          </button>
        </p>
      )}
      <div className="grid gap-4 border-t px-4 py-4 sm:grid-cols-2">
        <CampoTesto id={id("nome")} etichetta="Nome del trattamento" valore={t.nome} salva={salva("nome")} />
        <CampoScelta id={id("ruolo")} etichetta="Ruolo" valore={t.ruolo} opzioni={RUOLI_TRATTAMENTO} salva={salva("ruolo")} />
        <CampoTesto id={id("funzione")} etichetta="Funzione o ufficio" valore={t.funzione} salva={salva("funzione")} />
        <CampoScelta id={id("base")} etichetta="Base giuridica (art. 6)" valore={t.base} opzioni={BASI} salva={salva("base")} />
        <div className="sm:col-span-2">
          <CampoTesto id={id("finalita")} etichetta="Finalità" valore={t.finalita} multiriga salva={salva("finalita")} />
        </div>
        {t.base?.includes("6.1.f") && (
          <CampoScelta
            id={id("bilanciamento")}
            etichetta="Bilanciamento degli interessi documentato?"
            valore={t.bilanciamento}
            opzioni={SI_NO}
            aiuto="Il legittimo interesse regge solo se il bilanciamento è scritto (considerando 47)."
            salva={salva("bilanciamento")}
          />
        )}
        <CampoTesto id={id("interessati")} etichetta="Categorie di interessati" valore={t.interessati} salva={salva("interessati")} />
        <CampoTesto id={id("destinatari")} etichetta="Destinatari" valore={t.destinatari} salva={salva("destinatari")} />
        <div className="sm:col-span-2">
          <CampoTesto id={id("dati")} etichetta="Categorie di dati" valore={t.dati} multiriga salva={salva("dati")} />
        </div>
        <div className="space-y-3">
          <CampoCasella id={id("particolari")} etichetta="Dati particolari (art. 9)" valore={t.particolari} salva={salva("particolari")} />
          {t.particolari && (
            <CampoScelta id={id("condizione9")} etichetta="Condizione dell'art. 9.2" valore={t.condizione9} opzioni={CONDIZIONI_9} salva={salva("condizione9")} />
          )}
          <CampoCasella id={id("giudiziari")} etichetta="Dati giudiziari (art. 10)" valore={t.giudiziari} salva={salva("giudiziari")} />
        </div>
        <div className="space-y-3">
          <CampoCasella id={id("trasferimento")} etichetta="Trasferimenti verso paesi terzi" valore={t.trasferimento} salva={salva("trasferimento")} />
          {t.trasferimento && (
            <CampoTesto
              id={id("trasferimentoDettaglio")}
              etichetta="Paesi e garanzie"
              valore={t.trasferimentoDettaglio}
              salva={salva("trasferimentoDettaglio")}
            />
          )}
        </div>
        <CampoTesto id={id("conservazione")} etichetta="Termini di conservazione" valore={t.conservazione} salva={salva("conservazione")} />
        <CampoTesto id={id("sistemi")} etichetta="Sistemi e strumenti" valore={t.sistemi} salva={salva("sistemi")} />
        <div className="sm:col-span-2">
          <CampoTesto id={id("misure")} etichetta="Misure di sicurezza (art. 32)" valore={t.misure} multiriga salva={salva("misure")} />
        </div>
        <div className="flex justify-end sm:col-span-2">
          <BottoneElimina
            etichetta={`Elimina il trattamento «${titolo}»`}
            titolo={`Eliminare «${titolo}»?`}
            descrizione="Il trattamento esce dal registro insieme al suo vaglio, al rischio e alla valutazione d'impatto. I documenti già pubblicati non cambiano."
            onConferma={() => cmd.elimina("trattamento", t.id)}
          />
        </div>
      </div>
    </details>
  );
}
