"use client";

import { useState } from "react";
import { setCampoCanaleAction } from "@/features/segnalazioni/actions";
import { CampoData, CampoTesto } from "@/components/comune/campo";
import { FORME_CANALE } from "@/lib/calc/segnalazioni/canale";
import type { Canale, DatiSegnalazioni } from "./types";

// Il canale, come censimento delle tre modalità che l'art. 4 comma 1 pretende.
//
// ⚠️ Le tre forme sono cumulative: scritta, orale, e incontro diretto su richiesta della
// persona segnalante. Nel prototipo erano tre caselle di testo e nessuno verificava che
// fossero riempite — un ente con la sola casella di posta risultava a posto. Qui la
// verifica è totale perché ogni forma è una riga: si contano quelle attive.

const SPIEGAZIONE: Record<string, string> = {
  Scritta:
    "Piattaforma informatica, casella dedicata, indirizzo postale. È la forma che quasi tutti hanno, e da sola non basta.",
  Orale:
    "Linea telefonica o sistema di messaggistica vocale. Su richiesta del segnalante la segnalazione orale va verbalizzata, e il verbale gli va fatto confermare.",
  "Incontro diretto":
    "Non serve un presidio permanente: serve una procedura per fissarlo entro un termine ragionevole quando il segnalante lo chiede.",
};

export function VistaCanale({ companyId, dati }: { companyId: string; dati: DatiSegnalazioni }) {
  const stato = dati.canale.stato;

  return (
    <div className="space-y-8" data-tour="wb-canale">
      <section aria-label="Conformità del canale">
        <div
          className="rounded-xl border px-4 py-4"
          style={{ borderColor: stato.conforme ? "var(--success)" : "var(--destructive)" }}
          data-slot="canale-esito"
        >
          <p className="text-[13px] font-medium">
            {stato.conforme
              ? "Il canale soddisfa l'art. 4 comma 1: tutte e tre le forme sono attive."
              : "Il canale non soddisfa l'art. 4 comma 1."}
          </p>
          {!stato.conforme && (
            <ul className="mt-2 space-y-1 text-[13px] text-muted-foreground">
              {stato.mancanti.map((f) => (
                <li key={f}>
                  <strong>{f}</strong> — nessuna modalità istituita.
                </li>
              ))}
              {stato.dichiarateNonAttive.map((f) => (
                <li key={f}>
                  <strong>{f}</strong> — prevista ma non attiva. Il rimedio è accenderla, non istituirla.
                </li>
              ))}
            </ul>
          )}
        </div>
        <p className="mt-2 text-[12px] text-muted-foreground">
          Le tre forme sono cumulative: la mancanza di una sola rende il canale non conforme, a prescindere da
          quanto siano curate le altre due.
        </p>
      </section>

      <section aria-label="Consultazione sindacale">
        <div className="rounded-xl border px-4 py-3 text-[13px]" data-slot="consultazione">
          {dati.canale.consultazione === "ok" && (
            <p>La consultazione sindacale risulta effettuata prima dell&apos;attivazione del canale.</p>
          )}
          {dati.canale.consultazione === "tardiva" && (
            <p className="text-destructive">
              La consultazione sindacale risulta <strong>successiva</strong> all&apos;attivazione del canale. La
              procedura si adotta sentite le rappresentanze: l&apos;omissione è contestabile.
            </p>
          )}
          {dati.canale.consultazione === "assente" && (
            <p className="text-destructive">
              Il canale è attivo e non risulta registrata alcuna consultazione sindacale. La data si indica
              nell&apos;assetto.
            </p>
          )}
          {dati.canale.consultazione === "nonVerificabile" && (
            <p className="text-muted-foreground">
              Nessuna modalità risulta ancora attiva: la precedenza della consultazione sindacale non è
              verificabile.
            </p>
          )}
        </div>
      </section>

      {FORME_CANALE.map((forma) => {
        const righe = dati.canali.filter((c) => c.forma === forma);
        return (
          <section key={forma} aria-label={`Forma ${forma}`}>
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">{forma}</h2>
            <p className="mt-1 text-[12px] text-muted-foreground">{SPIEGAZIONE[forma]}</p>
            <div className="mt-3 space-y-4">
              {righe.map((c) => (
                <SchedaCanale key={c.id} companyId={companyId} canale={c} />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}

function SchedaCanale({ companyId, canale }: { companyId: string; canale: Canale }) {
  const salva = (campo: "descrizione" | "fornitore" | "riservatezza" | "attivatoIl") => (valore: string | null) =>
    setCampoCanaleAction(companyId, canale.id, { campo, valore });

  return (
    <div className="rounded-xl border p-4">
      <Interruttore companyId={companyId} canale={canale} />
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <CampoTesto id={`wb-desc-${canale.id}`} etichetta="Come è realizzata" valore={canale.descrizione}
          salva={salva("descrizione")}
          aiuto="L'indirizzo della piattaforma, il numero, la procedura per fissare l'incontro" />
        <CampoTesto id={`wb-forn-${canale.id}`} etichetta="Fornitore o piattaforma" valore={canale.fornitore}
          salva={salva("fornitore")} />
        <CampoData id={`wb-att-${canale.id}`} etichetta="Attiva dal" valore={canale.attivatoIl}
          salva={salva("attivatoIl")}
          aiuto="Serve a verificare che la consultazione sindacale l'abbia preceduta" />
        <CampoTesto id={`wb-ris-${canale.id}`} etichetta="Misure tecniche di riservatezza"
          valore={canale.riservatezza} multiriga salva={salva("riservatezza")}
          aiuto="Art. 4 c. 2: la riservatezza va assicurata con strumenti, anche di crittografia, non con una regola organizzativa" />
      </div>
    </div>
  );
}

/**
 * L'interruttore di attivazione.
 *
 * ⚠️ Comando ottimistico: cambia subito e torna indietro se il server rifiuta. Un
 * interruttore che aspetta il viaggio di rete si legge come rotto, ed è una delle tre
 * regole che questo progetto ha pagato con un difetto vero.
 */
function Interruttore({ companyId, canale }: { companyId: string; canale: Canale }) {
  const [attiva, setAttiva] = useState(canale.attiva);
  const [errore, setErrore] = useState<string | null>(null);

  async function cambia() {
    const precedente = attiva;
    setAttiva(!precedente);
    setErrore(null);
    const esito = await setCampoCanaleAction(companyId, canale.id, { campo: "attiva", valore: !precedente });
    if (!esito.ok) {
      setAttiva(precedente);
      setErrore(esito.errore);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <button
        type="button"
        role="switch"
        aria-checked={attiva}
        aria-label={`Modalità ${canale.forma}: ${attiva ? "attiva" : "non attiva"}`}
        onClick={cambia}
        data-slot="interruttore-canale"
        className="inline-flex h-6 w-11 shrink-0 items-center rounded-full border transition-colors"
        style={{ background: attiva ? "var(--success)" : "var(--muted)" }}
      >
        <span
          className="size-4 rounded-full bg-white transition-transform"
          style={{ transform: attiva ? "translateX(24px)" : "translateX(4px)" }}
        />
      </button>
      <span className="text-[13px] font-medium">{attiva ? "Attiva" : "Non attiva"}</span>
      {errore && (
        <span className="text-[12px] text-destructive" role="alert">
          {errore}
        </span>
      )}
    </div>
  );
}
