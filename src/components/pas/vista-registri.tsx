"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { CampoData, CampoScelta, CampoTesto } from "@/components/comune/campo";
import { RigaRegistro } from "@/components/comune/percorso";
import { fmtDataBreve } from "@/lib/format";
import catalogo from "@/lib/db/seeds/data/pas-registri.json";
import { OPZIONI_REGISTRI, type TipoRiga } from "@/features/pas/validation";
import { SceltaVoce, vociAree, type ComandiPas, type DatiPas } from "./comune";

// Gli otto registri del sistema di gestione sociale.
//
// ⚠️ NIENTE NOMINATIVI nel registro dei reclami: la riservatezza di chi segnala è un
// requisito (A.10), e nessuna colonna è fatta per un nome. I documenti pubblicati portano
// di questi registri soltanto conteggi.
//
// ⚠️ L'età di un reclamo e la scadenza di un'azione correttiva le calcola il SERVER, nel
// giorno italiano: qui si mostrano, non si ricalcolano.

const REGISTRI: { tipo: TipoRiga; chiave: string }[] = [
  { tipo: "reclamo", chiave: "recl" },
  { tipo: "nonConformita", chiave: "nc" },
  { tipo: "formazione", chiave: "form" },
  { tipo: "emergenza", chiave: "emer" },
  { tipo: "comunicazione", chiave: "com" },
  { tipo: "consultazione", chiave: "cons" },
  { tipo: "audit", chiave: "audit" },
  { tipo: "riesame", chiave: "ries" },
];

const AVVISO_NOMI = "Non scrivere nomi né dati che permettano di identificare chi segnala.";
const d = (x: string | null) => (x ? fmtDataBreve(x) : "—");
const num = (x: number | string | null) => (x === null ? null : String(x).replace(".", ","));

export function VistaRegistri({ dati, cmd }: { dati: DatiPas; cmd: ComandiPas }) {
  const [quale, setQuale] = useState<TipoRiga>("reclamo");
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

  const righe: Record<string, number> = {
    reclamo: dati.reclami.length,
    nonConformita: dati.nonConformita.length,
    formazione: dati.formazione.length,
    emergenza: dati.emergenze.length,
    comunicazione: dati.comunicazioni.length,
    consultazione: dati.consultazioni.length,
    audit: dati.audit.length,
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
              <span className="ml-1.5 text-[11px] tabular-nums text-muted-foreground">{righe[r.tipo]}</span>
            </button>
          );
        })}
      </div>

      <div>
        <p className="text-sm">
          <span className="font-medium">{reg.nome}</span> <span className="text-[12px] text-muted-foreground">{reg.riferimento}</span>
        </p>
        <p className="mt-1 max-w-3xl text-sm text-muted-foreground">{reg.aiuto}</p>
        {quale === "reclamo" && (
          <p className="mt-2 text-sm" data-riepilogo-reclami>
            Nell&apos;esercizio {dati.anno}: {g.reclami} ricevuti, {g.reclamiChiusi}{" "}chiusi
            {g.giorniMediChiusura !== null ? `, in media in ${g.giorniMediChiusura} ${g.giorniMediChiusura === 1 ? "giorno" : "giorni"}` : ""}.
            Aperti da più di {dati.parametri.giorniReclamo} giorni:{" "}<b>{g.reclamiDaSollecitare}</b>.
          </p>
        )}
        {quale === "nonConformita" && (
          <p className="mt-2 text-sm" data-riepilogo-nc>
            Aperte: {g.nonConformitaAperte}, di cui <b>{g.azioniScadute}</b>{" "}con l&apos;azione scaduta. Efficacia verificata
            nell&apos;esercizio: {g.efficaci}.
          </p>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Button onClick={nuova} data-tour="pas-nuova-registrazione">
          <Plus className="size-4" /> Nuova registrazione
        </Button>
        {errore && (
          <p role="alert" className="text-sm text-destructive">
            {errore}
          </p>
        )}
      </div>

      <div className="space-y-2">
        {quale === "reclamo" &&
          dati.reclami.map((r, i) => {
            const salva = (c: string) => cmd.riga("reclamo", r.id, c);
            const id = (c: string) => `pas-recl-${r.id}-${c}`;
            return (
              <RigaRegistro
                key={r.id}
                id={r.id}
                aperto={aperto === r.id}
                titolo={`Reclamo ${i + 1}${r.area ? ` · ${r.area}` : ""}`}
                sotto={`ricevuto ${d(r.data)} · ${r.esito}`}
                stato={r.chiusoIl ? { n: "chiuso", v: "outline" } : r.daSollecitare ? { n: "da sollecitare", v: "destructive" } : { n: "aperto", v: "secondary" }}
                elimina={() => cmd.elimina("reclamo", r.id)}
                nome={`il reclamo ${i + 1}`}
              >
                <CampoData id={id("data")} etichetta="Ricevuto il" valore={r.data} salva={salva("data")} />
                <CampoScelta id={id("canale")} etichetta="Canale" valore={r.canale} opzioni={OPZIONI_REGISTRI.canale} salva={salva("canale")} />
                <CampoScelta id={id("provenienza")} etichetta="Provenienza" valore={r.provenienza} opzioni={OPZIONI_REGISTRI.provenienza} salva={salva("provenienza")} />
                <SceltaVoce id={id("area")} etichetta="Area" valore={r.area} voci={vociAree(dati, false)} vuoto salva={salva("area")} />
                <div className="sm:col-span-2">
                  <CampoTesto id={id("oggetto")} etichetta="Oggetto" valore={r.oggetto} multiriga aiuto={AVVISO_NOMI} salva={salva("oggetto")} />
                </div>
                <div className="sm:col-span-2">
                  <CampoTesto id={id("istruttoria")} etichetta="Istruttoria e risposta" valore={r.istruttoria} multiriga aiuto={AVVISO_NOMI} salva={salva("istruttoria")} />
                </div>
                <CampoTesto id={id("responsabile")} etichetta="Responsabile" valore={r.responsabile} salva={salva("responsabile")} />
                <CampoData id={id("chiusoIl")} etichetta="Chiuso il" valore={r.chiusoIl} salva={salva("chiusoIl")} />
                <CampoScelta id={id("esito")} etichetta="Esito" valore={r.esito} opzioni={OPZIONI_REGISTRI.esitoReclamo} salva={salva("esito")} />
              </RigaRegistro>
            );
          })}

        {quale === "nonConformita" &&
          dati.nonConformita.map((x, i) => {
            const salva = (c: string) => cmd.riga("nonConformita", x.id, c);
            const id = (c: string) => `pas-nc-${x.id}-${c}`;
            return (
              <RigaRegistro
                key={x.id}
                id={x.id}
                aperto={aperto === x.id}
                titolo={`Non conformità ${i + 1}${x.requisito ? ` · ${x.requisito}` : ""}`}
                sotto={`rilevata ${d(x.data)} · scadenza ${d(x.scadenza)}`}
                stato={x.chiusaIl ? { n: x.efficacia === "Efficace" ? "chiusa ed efficace" : "chiusa", v: "outline" } : x.scaduta ? { n: "azione scaduta", v: "destructive" } : { n: "aperta", v: "secondary" }}
                elimina={() => cmd.elimina("nonConformita", x.id)}
                nome={`la non conformità ${i + 1}`}
              >
                <CampoData id={id("data")} etichetta="Rilevata il" valore={x.data} salva={salva("data")} />
                <CampoScelta id={id("origine")} etichetta="Origine" valore={x.origine} opzioni={OPZIONI_REGISTRI.origine} salva={salva("origine")} />
                <CampoTesto id={id("requisito")} etichetta="Requisito" valore={x.requisito} salva={salva("requisito")} />
                <CampoTesto id={id("responsabile")} etichetta="Responsabile" valore={x.responsabile} salva={salva("responsabile")} />
                <div className="sm:col-span-2">
                  <CampoTesto id={id("descrizione")} etichetta="Descrizione" valore={x.descrizione} multiriga salva={salva("descrizione")} />
                </div>
                <div className="sm:col-span-2">
                  <CampoTesto id={id("cause")} etichetta="Analisi delle cause" valore={x.cause} multiriga salva={salva("cause")} />
                </div>
                <div className="sm:col-span-2">
                  <CampoTesto id={id("azione")} etichetta="Azione correttiva" valore={x.azione} multiriga salva={salva("azione")} />
                </div>
                <CampoData id={id("scadenza")} etichetta="Scadenza" valore={x.scadenza} salva={salva("scadenza")} />
                <CampoData id={id("chiusaIl")} etichetta="Chiusa il" valore={x.chiusaIl} salva={salva("chiusaIl")} />
                <CampoScelta id={id("efficacia")} etichetta="Efficacia" valore={x.efficacia} opzioni={OPZIONI_REGISTRI.efficacia} salva={salva("efficacia")} />
              </RigaRegistro>
            );
          })}

        {quale === "formazione" &&
          dati.formazione.map((f, i) => {
            const salva = (c: string) => cmd.riga("formazione", f.id, c);
            const id = (c: string) => `pas-form-${f.id}-${c}`;
            return (
              <RigaRegistro key={f.id} id={f.id} aperto={aperto === f.id} titolo={f.tema || `Intervento ${i + 1}`} sotto={d(f.data)} elimina={() => cmd.elimina("formazione", f.id)} nome={`l'intervento ${i + 1}`}>
                <CampoData id={id("data")} etichetta="Data" valore={f.data} salva={salva("data")} />
                <CampoTesto id={id("tema")} etichetta="Tema" valore={f.tema} salva={salva("tema")} />
                <CampoTesto id={id("destinatari")} etichetta="Destinatari" valore={f.destinatari} salva={salva("destinatari")} />
                <CampoTesto id={id("docente")} etichetta="Docente" valore={f.docente} salva={salva("docente")} />
                <CampoTesto id={id("partecipanti")} etichetta="Partecipanti" valore={num(f.partecipanti)} salva={salva("partecipanti")} />
                <CampoTesto id={id("ore")} etichetta="Ore del corso" valore={num(f.ore)} salva={salva("ore")} />
                <div className="sm:col-span-2">
                  <CampoTesto id={id("efficacia")} etichetta="Verifica di efficacia" valore={f.efficacia} salva={salva("efficacia")} />
                </div>
              </RigaRegistro>
            );
          })}

        {quale === "emergenza" &&
          dati.emergenze.map((x, i) => {
            const salva = (c: string) => cmd.riga("emergenza", x.id, c);
            const id = (c: string) => `pas-emer-${x.id}-${c}`;
            return (
              <RigaRegistro key={x.id} id={x.id} aperto={aperto === x.id} titolo={x.tipo} sotto={`${d(x.data)}${x.sito ? ` · ${x.sito}` : ""}`} elimina={() => cmd.elimina("emergenza", x.id)} nome={`la registrazione ${i + 1}`}>
                <CampoData id={id("data")} etichetta="Data" valore={x.data} salva={salva("data")} />
                <CampoScelta id={id("tipo")} etichetta="Tipo" valore={x.tipo} opzioni={OPZIONI_REGISTRI.tipoEmergenza} salva={salva("tipo")} />
                <CampoTesto id={id("sito")} etichetta="Sito" valore={x.sito} salva={salva("sito")} />
                <CampoTesto id={id("responsabile")} etichetta="Responsabile" valore={x.responsabile} salva={salva("responsabile")} />
                <div className="sm:col-span-2">
                  <CampoTesto id={id("esito")} etichetta="Esito" valore={x.esito} multiriga salva={salva("esito")} />
                </div>
                <div className="sm:col-span-2">
                  <CampoTesto id={id("azioni")} etichetta="Azioni conseguenti" valore={x.azioni} multiriga salva={salva("azioni")} />
                </div>
              </RigaRegistro>
            );
          })}

        {quale === "comunicazione" &&
          dati.comunicazioni.map((x, i) => {
            const salva = (c: string) => cmd.riga("comunicazione", x.id, c);
            const id = (c: string) => `pas-com-${x.id}-${c}`;
            return (
              <RigaRegistro key={x.id} id={x.id} aperto={aperto === x.id} titolo={`Comunicazione ${x.tipo.toLowerCase()}`} sotto={`${d(x.data)}${x.destinatari ? ` · ${x.destinatari}` : ""}`} elimina={() => cmd.elimina("comunicazione", x.id)} nome={`la comunicazione ${i + 1}`}>
                <CampoData id={id("data")} etichetta="Data" valore={x.data} salva={salva("data")} />
                <CampoScelta id={id("tipo")} etichetta="Tipo" valore={x.tipo} opzioni={OPZIONI_REGISTRI.tipoComunicazione} salva={salva("tipo")} />
                <CampoTesto id={id("destinatari")} etichetta="Destinatari" valore={x.destinatari} salva={salva("destinatari")} />
                <CampoTesto id={id("canale")} etichetta="Canale" valore={x.canale} salva={salva("canale")} />
                <div className="sm:col-span-2">
                  <CampoTesto id={id("contenuto")} etichetta="Contenuto" valore={x.contenuto} multiriga salva={salva("contenuto")} />
                </div>
              </RigaRegistro>
            );
          })}

        {quale === "consultazione" &&
          dati.consultazioni.map((x, i) => {
            const salva = (c: string) => cmd.riga("consultazione", x.id, c);
            const id = (c: string) => `pas-cons-${x.id}-${c}`;
            return (
              <RigaRegistro key={x.id} id={x.id} aperto={aperto === x.id} titolo={x.forma} sotto={d(x.data)} elimina={() => cmd.elimina("consultazione", x.id)} nome={`la consultazione ${i + 1}`}>
                <CampoData id={id("data")} etichetta="Data" valore={x.data} salva={salva("data")} />
                <CampoScelta id={id("forma")} etichetta="Forma" valore={x.forma} opzioni={OPZIONI_REGISTRI.forma} salva={salva("forma")} />
                <CampoTesto id={id("partecipanti")} etichetta="Partecipanti" valore={num(x.partecipanti)} salva={salva("partecipanti")} />
                <CampoTesto id={id("condottaDa")} etichetta="Condotta da" valore={x.condottaDa} salva={salva("condottaDa")} />
                <div className="sm:col-span-2">
                  <CampoTesto id={id("argomenti")} etichetta="Argomenti" valore={x.argomenti} multiriga salva={salva("argomenti")} />
                </div>
                <div className="sm:col-span-2">
                  <CampoTesto id={id("esiti")} etichetta="Esiti e seguito dato" valore={x.esiti} multiriga salva={salva("esiti")} />
                </div>
              </RigaRegistro>
            );
          })}

        {quale === "audit" &&
          dati.audit.map((x, i) => {
            const salva = (c: string) => cmd.riga("audit", x.id, c);
            const id = (c: string) => `pas-audit-${x.id}-${c}`;
            return (
              <RigaRegistro key={x.id} id={x.id} aperto={aperto === x.id} titolo={x.ambito || `Audit ${i + 1}`} sotto={`${d(x.data)} · ${x.stato}`} elimina={() => cmd.elimina("audit", x.id)} nome={`l'audit ${i + 1}`}>
                <CampoData id={id("data")} etichetta="Data" valore={x.data} salva={salva("data")} />
                <CampoScelta id={id("stato")} etichetta="Stato" valore={x.stato} opzioni={OPZIONI_REGISTRI.statoAudit} salva={salva("stato")} />
                <CampoTesto id={id("ambito")} etichetta="Ambito" valore={x.ambito} aiuto="Deve coprire anche l'Allegato A." salva={salva("ambito")} />
                <CampoTesto id={id("auditor")} etichetta="Auditor" valore={x.auditor} salva={salva("auditor")} />
                <CampoTesto id={id("rilievi")} etichetta="Rilievi" valore={num(x.rilievi)} salva={salva("rilievi")} />
                <div className="sm:col-span-2">
                  <CampoTesto id={id("sintesi")} etichetta="Sintesi dei risultati" valore={x.sintesi} multiriga salva={salva("sintesi")} />
                </div>
              </RigaRegistro>
            );
          })}

        {quale === "riesame" &&
          dati.riesami.map((x, i) => {
            const salva = (c: string) => cmd.riga("riesame", x.id, c);
            const id = (c: string) => `pas-ries-${x.id}-${c}`;
            const decisioni = [
              ["risorse", "Adeguatezza delle risorse"],
              ["idoneita", "Idoneità, adeguatezza ed efficacia del sistema"],
              ["miglioramento", "Opportunità di miglioramento"],
              ["modifiche", "Modifiche al sistema e risorse necessarie"],
              ["azioni", "Azioni decise"],
            ] as const;
            return (
              <RigaRegistro key={x.id} id={x.id} aperto={aperto === x.id} titolo={`Riesame ${x.data ? fmtDataBreve(x.data) : i + 1}`} sotto={x.partecipanti ?? ""} elimina={() => cmd.elimina("riesame", x.id)} nome={`il riesame ${i + 1}`}>
                <CampoData id={id("data")} etichetta="Data" valore={x.data} salva={salva("data")} />
                <CampoTesto id={id("partecipanti")} etichetta="Partecipanti" valore={x.partecipanti} salva={salva("partecipanti")} />
                <CampoData id={id("comunicatoIl")} etichetta="Esiti comunicati ai lavoratori il" valore={x.comunicatoIl} salva={salva("comunicatoIl")} />
                <div />
                {decisioni.map(([c, e]) => (
                  <div key={c} className="sm:col-span-2">
                    <CampoTesto id={id(c)} etichetta={e} valore={x[c]} multiriga salva={salva(c)} />
                  </div>
                ))}
              </RigaRegistro>
            );
          })}

        {righe[quale] === 0 && <p className="text-sm text-muted-foreground">Nessuna registrazione.</p>}
      </div>
    </div>
  );
}
