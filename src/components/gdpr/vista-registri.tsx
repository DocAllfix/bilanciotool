"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CampoData, CampoScelta, CampoTesto } from "@/components/comune/campo";
import { BottoneElimina } from "@/components/comune/bottone-elimina";
import { fmtDataBreve } from "@/lib/format";
import catalogo from "@/lib/db/seeds/data/gdpr-registri.json";
import { OPZIONI_REGISTRI, type TipoRiga } from "@/features/gdpr/validation";
import { CampoCasella, CampoIstante, type ComandiGdpr, type DatiGdpr } from "./comune";

// Vista 7 — I sei registri.
//
// ⚠️ NIENTE NOMINATIVI. Come nel modulo Segnalazioni, nessuna colonna per il nome
// dell'interessato: un riferimento interno e le note, con l'avviso di non scriverci nomi.
// I documenti pubblicati portano di questi registri soltanto conteggi.
//
// ⚠️ La scadenza di una richiesta e il limite delle 72 ore li calcola il SERVER, nel giorno
// e nell'ora italiani: qui si mostrano, non si ricalcolano.

const REGISTRI: { tipo: TipoRiga; chiave: string }[] = [
  { tipo: "richiesta", chiave: "dir" },
  { tipo: "violazione", chiave: "breach" },
  { tipo: "formazione", chiave: "form" },
  { tipo: "verifica", chiave: "audit" },
  { tipo: "verificaAds", chiave: "ads" },
  { tipo: "riesame", chiave: "ries" },
];

const SI_NO = ["Sì", "No"] as const;

const TERMINE: Record<string, { n: string; v: "destructive" | "secondary" | "outline" }> = {
  ok: { n: "nei termini", v: "outline" },
  late: { n: "fuori termine", v: "destructive" },
  over: { n: "scaduta", v: "destructive" },
  open: { n: "in corso", v: "secondary" },
};

const AVVISO_NOMI = "Non scrivere nomi né dati che identificano l'interessato: usa un riferimento interno.";

export function VistaRegistri({ dati, cmd }: { dati: DatiGdpr; cmd: ComandiGdpr }) {
  const [quale, setQuale] = useState<TipoRiga>("richiesta");
  const [aperto, setAperto] = useState<string | null>(null);
  const [errore, setErrore] = useState<string | null>(null);
  const reg = catalogo.find((r) => r.key === REGISTRI.find((x) => x.tipo === quale)!.chiave)!;
  const g = dati.registri;

  async function nuova() {
    setErrore(null);
    const e = await cmd.crea(quale);
    if (!e.ok) return setErrore(e.errore);
    if (e.dati) setAperto(String(e.dati));
  }

  const conteggi: Record<string, number> = {
    richiesta: dati.richieste.length,
    violazione: dati.violazioni.length,
    formazione: dati.formazione.length,
    verifica: dati.verifiche.length,
    verificaAds: dati.verificheAds.length,
    riesame: dati.riesami.length,
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-1 border-b" role="tablist" aria-label="Registri">
        {REGISTRI.map((r) => {
          const c = catalogo.find((x) => x.key === r.chiave)!;
          return (
            <button
              key={r.tipo}
              role="tab"
              aria-selected={quale === r.tipo}
              onClick={() => setQuale(r.tipo)}
              data-registro={r.tipo}
              className={cn(
                "-mb-px border-b-2 px-3 py-2 text-sm",
                quale === r.tipo ? "border-primary font-medium" : "border-transparent text-muted-foreground hover:text-foreground",
              )}
            >
              {c.nome}{" "}
              <span className="ml-1.5 text-[11px] tabular-nums text-muted-foreground">{conteggi[r.tipo]}</span>
            </button>
          );
        })}
      </div>

      <div>
        <p className="text-sm">
          <span className="font-medium">{reg.nome}</span> <span className="text-[12px] text-muted-foreground">{reg.riferimento}</span>
        </p>
        <p className="mt-1 max-w-3xl text-sm text-muted-foreground">{reg.aiuto}</p>
        {quale === "richiesta" && (
          <p className="mt-2 text-sm" data-riepilogo-richieste>
            Senza riscontro: {g.aperte} ancora nei termini,{" "}<b>{g.scadute}</b> oltre il termine.
          </p>
        )}
        {quale === "violazione" && (
          <p className="mt-2 text-sm" data-riepilogo-violazioni>
            {g.violazioniAperte} non chiuse · {g.rischioDaValutare} col rischio da valutare · {g.notificheInCorso} con la notifica nelle 72 ore · <b>{g.notificheScadute}</b> con la notifica oltre il termine.
          </p>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Button onClick={nuova} data-tour="gdpr-nuova-registrazione">
          <Plus className="size-4" /> Nuova registrazione
        </Button>
        {errore && (
          <p role="alert" className="text-sm text-destructive">
            {errore}
          </p>
        )}
      </div>

      <div className="space-y-2">
        {quale === "richiesta" &&
          dati.richieste.map((r, i) => {
            const t = r.termine ? TERMINE[r.termine] : null;
            const salva = (c: string) => cmd.riga("richiesta", r.id, c);
            const id = (c: string) => `gdpr-dir-${r.id}-${c}`;
            return (
              <Riga
                key={r.id}
                id={r.id}
                aperto={aperto === r.id}
                titolo={`${r.diritto}${r.riferimento ? ` · ${r.riferimento}` : ""}`}
                sotto={`ricevuta ${r.ricevutaIl ? fmtDataBreve(r.ricevutaIl) : "—"} · scade ${r.scadenza ? fmtDataBreve(r.scadenza) : "—"}`}
                stato={t}
                elimina={() => cmd.elimina("richiesta", r.id)}
                nome={`la richiesta ${i + 1}`}
              >
                <CampoData id={id("ricevutaIl")} etichetta="Ricevuta il" valore={r.ricevutaIl} salva={salva("ricevutaIl")} />
                <CampoScelta id={id("diritto")} etichetta="Diritto esercitato" valore={r.diritto} opzioni={OPZIONI_REGISTRI.diritto} salva={salva("diritto")} />
                <CampoTesto id={id("riferimento")} etichetta="Riferimento interno" valore={r.riferimento} aiuto={AVVISO_NOMI} salva={salva("riferimento")} />
                <CampoScelta id={id("canale")} etichetta="Canale" valore={r.canale} opzioni={OPZIONI_REGISTRI.canale} salva={salva("canale")} />
                <CampoTesto id={id("trattamento")} etichetta="Trattamento interessato" valore={r.trattamento} salva={salva("trattamento")} />
                <CampoCasella id={id("proroga")} etichetta="Proroga motivata (termine a tre mesi)" valore={r.proroga} salva={salva("proroga")} />
                <CampoData id={id("riscontroIl")} etichetta="Riscontrata il" valore={r.riscontroIl} salva={salva("riscontroIl")} />
                <CampoScelta id={id("esito")} etichetta="Esito" valore={r.esito} opzioni={OPZIONI_REGISTRI.esitoRichiesta} salva={salva("esito")} />
                <div className="sm:col-span-2">
                  <CampoTesto id={id("note")} etichetta="Note" valore={r.note} multiriga aiuto={AVVISO_NOMI} salva={salva("note")} />
                </div>
              </Riga>
            );
          })}

        {quale === "violazione" &&
          dati.violazioni.map((v, i) => {
            const t = v.termine ? TERMINE[v.termine] : v.rischioDaValutare ? { n: "rischio da valutare", v: "secondary" as const } : null;
            const salva = (c: string) => cmd.riga("violazione", v.id, c);
            const id = (c: string) => `gdpr-breach-${v.id}-${c}`;
            return (
              <Riga
                key={v.id}
                id={v.id}
                aperto={aperto === v.id}
                titolo={`${v.natura}${v.rischio ? ` · ${v.rischio}` : ""}`}
                sotto={`conosciuta ${v.conoscenzaIl ? v.conoscenzaIl.replace("T", " ") : "—"} · notifica entro ${v.limite ?? "—"}`}
                stato={t}
                elimina={() => cmd.elimina("violazione", v.id)}
                nome={`la violazione ${i + 1}`}
              >
                <CampoIstante
                  id={id("conoscenzaIl")}
                  etichetta="Venuti a conoscenza il (ora italiana)"
                  valore={v.conoscenzaIl}
                  aiuto="Da qui decorrono le 72 ore della notifica (art. 33)."
                  salva={salva("conoscenzaIl")}
                />
                <CampoScelta id={id("natura")} etichetta="Natura" valore={v.natura} opzioni={OPZIONI_REGISTRI.natura} salva={salva("natura")} />
                <CampoScelta
                  id={id("rischio")}
                  etichetta="Rischio per gli interessati"
                  valore={v.rischio}
                  opzioni={OPZIONI_REGISTRI.rischio}
                  aiuto="«Improbabile» non richiede la notifica, ma la violazione resta registrata."
                  salva={salva("rischio")}
                />
                <CampoTesto id={id("interessati")} etichetta="Interessati coinvolti" valore={v.interessati === null ? null : String(v.interessati)} salva={salva("interessati")} />
                <CampoTesto id={id("categorie")} etichetta="Categorie di dati" valore={v.categorie} salva={salva("categorie")} />
                <CampoIstante id={id("notificataIl")} etichetta="Notificata al Garante il (ora italiana)" valore={v.notificataIl} salva={salva("notificataIl")} />
                <CampoData id={id("comunicataIl")} etichetta="Comunicata agli interessati il" valore={v.comunicataIl} salva={salva("comunicataIl")} />
                <CampoData id={id("chiusaIl")} etichetta="Chiusa il" valore={v.chiusaIl} salva={salva("chiusaIl")} />
                <div className="sm:col-span-2">
                  <CampoTesto id={id("descrizione")} etichetta="Descrizione" valore={v.descrizione} multiriga aiuto={AVVISO_NOMI} salva={salva("descrizione")} />
                </div>
                <div className="sm:col-span-2">
                  <CampoTesto id={id("valutazione")} etichetta="Valutazione del rischio" valore={v.valutazione} multiriga salva={salva("valutazione")} />
                </div>
              </Riga>
            );
          })}

        {quale === "formazione" &&
          dati.formazione.map((f, i) => {
            const salva = (c: string) => cmd.riga("formazione", f.id, c);
            const id = (c: string) => `gdpr-form-${f.id}-${c}`;
            return (
              <Riga key={f.id} id={f.id} aperto={aperto === f.id} titolo={f.tema || `Intervento ${i + 1}`} sotto={f.data ? fmtDataBreve(f.data) : "—"} elimina={() => cmd.elimina("formazione", f.id)} nome={`l'intervento ${i + 1}`}>
                <CampoData id={id("data")} etichetta="Data" valore={f.data} salva={salva("data")} />
                <CampoTesto id={id("tema")} etichetta="Tema" valore={f.tema} salva={salva("tema")} />
                <CampoTesto id={id("destinatari")} etichetta="Destinatari" valore={f.destinatari} salva={salva("destinatari")} />
                <CampoTesto id={id("docente")} etichetta="Docente" valore={f.docente} salva={salva("docente")} />
                <CampoTesto id={id("partecipanti")} etichetta="Partecipanti" valore={f.partecipanti === null ? null : String(f.partecipanti)} salva={salva("partecipanti")} />
                <CampoTesto id={id("ore")} etichetta="Ore del corso" valore={f.ore === null ? null : String(f.ore).replace(".", ",")} salva={salva("ore")} />
                <CampoTesto id={id("apprendimento")} etichetta="Verifica dell'apprendimento" valore={f.apprendimento} salva={salva("apprendimento")} />
              </Riga>
            );
          })}

        {quale === "verifica" &&
          dati.verifiche.map((x, i) => {
            const salva = (c: string) => cmd.riga("verifica", x.id, c);
            const id = (c: string) => `gdpr-audit-${x.id}-${c}`;
            return (
              <Riga key={x.id} id={x.id} aperto={aperto === x.id} titolo={`${x.tipo}${x.ambito ? ` · ${x.ambito}` : ""}`} sotto={`${x.data ? fmtDataBreve(x.data) : "—"} · ${x.stato}`} elimina={() => cmd.elimina("verifica", x.id)} nome={`la verifica ${i + 1}`}>
                <CampoData id={id("data")} etichetta="Data" valore={x.data} salva={salva("data")} />
                <CampoScelta id={id("tipo")} etichetta="Tipo" valore={x.tipo} opzioni={OPZIONI_REGISTRI.tipoVerifica} salva={salva("tipo")} />
                <CampoTesto id={id("ambito")} etichetta="Ambito" valore={x.ambito} salva={salva("ambito")} />
                <CampoTesto id={id("svoltaDa")} etichetta="Svolta da" valore={x.svoltaDa} salva={salva("svoltaDa")} />
                <CampoScelta id={id("stato")} etichetta="Stato" valore={x.stato} opzioni={OPZIONI_REGISTRI.statoVerifica} salva={salva("stato")} />
                <CampoTesto id={id("rilievi")} etichetta="Rilievi" valore={x.rilievi === null ? null : String(x.rilievi)} salva={salva("rilievi")} />
                <div className="sm:col-span-2">
                  <CampoTesto id={id("sintesi")} etichetta="Sintesi" valore={x.sintesi} multiriga salva={salva("sintesi")} />
                </div>
              </Riga>
            );
          })}

        {quale === "verificaAds" &&
          dati.verificheAds.map((x, i) => {
            const salva = (c: string) => cmd.riga("verificaAds", x.id, c);
            const id = (c: string) => `gdpr-ads-${x.id}-${c}`;
            return (
              <Riga key={x.id} id={x.id} aperto={aperto === x.id} titolo={x.amministratore || `Verifica ${i + 1}`} sotto={x.data ? fmtDataBreve(x.data) : "—"} elimina={() => cmd.elimina("verificaAds", x.id)} nome={`la verifica ${i + 1}`}>
                <CampoData id={id("data")} etichetta="Data" valore={x.data} salva={salva("data")} />
                <CampoTesto id={id("amministratore")} etichetta="Amministratore (ruolo o fornitore)" valore={x.amministratore} salva={salva("amministratore")} />
                <CampoTesto id={id("ambito")} etichetta="Sistemi verificati" valore={x.ambito} salva={salva("ambito")} />
                <CampoScelta id={id("registrazioniConservate")} etichetta="Registrazioni degli accessi conservate?" valore={x.registrazioniConservate} opzioni={SI_NO} salva={salva("registrazioniConservate")} />
                <div className="sm:col-span-2">
                  <CampoTesto id={id("esito")} etichetta="Esito" valore={x.esito} multiriga salva={salva("esito")} />
                </div>
              </Riga>
            );
          })}

        {quale === "riesame" &&
          dati.riesami.map((x, i) => {
            const salva = (c: string) => cmd.riga("riesame", x.id, c);
            const id = (c: string) => `gdpr-ries-${x.id}-${c}`;
            return (
              <Riga key={x.id} id={x.id} aperto={aperto === x.id} titolo={`Riesame ${x.data ? fmtDataBreve(x.data) : i + 1}`} sotto={x.partecipanti ?? ""} elimina={() => cmd.elimina("riesame", x.id)} nome={`il riesame ${i + 1}`}>
                <CampoData id={id("data")} etichetta="Data" valore={x.data} salva={salva("data")} />
                <CampoTesto id={id("partecipanti")} etichetta="Partecipanti" valore={x.partecipanti} salva={salva("partecipanti")} />
                {(["relazione", "adeguatezza", "miglioramento", "azioni"] as const).map((c) => (
                  <div key={c} className="sm:col-span-2">
                    <CampoTesto
                      id={id(c)}
                      etichetta={{ relazione: "Sintesi", adeguatezza: "Adeguatezza del sistema", miglioramento: "Opportunità di miglioramento", azioni: "Azioni decise" }[c]}
                      valore={x[c]}
                      multiriga
                      salva={salva(c)}
                    />
                  </div>
                ))}
              </Riga>
            );
          })}

        {conteggi[quale] === 0 && <p className="text-sm text-muted-foreground">Nessuna registrazione.</p>}
      </div>
    </div>
  );
}

function Riga({
  id,
  aperto,
  titolo,
  sotto,
  stato,
  elimina,
  nome,
  children,
}: {
  id: string;
  aperto: boolean;
  titolo: string;
  sotto: string;
  stato?: { n: string; v: "destructive" | "secondary" | "outline" } | null;
  elimina: () => Promise<unknown>;
  nome: string;
  children: React.ReactNode;
}) {
  return (
    <details className="rounded-lg border bg-card" open={aperto || undefined} data-riga={id}>
      <summary className="flex cursor-pointer list-none flex-wrap items-center gap-x-3 gap-y-1 px-4 py-3">
        <span className="min-w-0 flex-1 truncate font-medium">{titolo}</span>
        <span className="text-[12px] text-muted-foreground">{sotto}</span>
        {stato && (
          <Badge variant={stato.v} data-termine={stato.n}>
            {stato.n}
          </Badge>
        )}
      </summary>
      <Card className="rounded-t-none border-0 border-t shadow-none">
        <CardContent className="grid gap-4 pt-4 sm:grid-cols-2">
          {children}
          <div className="flex justify-end sm:col-span-2">
            <BottoneElimina
              etichetta={`Elimina ${nome}`}
              titolo={`Eliminare ${nome}?`}
              descrizione="La registrazione esce dal registro. I documenti già pubblicati non cambiano."
              onConferma={elimina}
            />
          </div>
        </CardContent>
      </Card>
    </details>
  );
}
