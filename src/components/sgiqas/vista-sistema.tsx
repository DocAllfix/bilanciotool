"use client";

import { useState } from "react";
import { aggiornaProfiloAction, setNormeAction } from "@/features/sgiqas/actions";
import { CampoData, CampoTesto } from "@/components/comune/campo";
import { NOME_NORMA, type DatiSgiQas } from "./types";

// L'anagrafica del sistema e — la cosa che decide tutto il resto — il PERIMETRO.

export function VistaSistema({ companyId, dati }: { companyId: string; dati: DatiSgiQas }) {
  const s = dati.sistema;
  const salva = (campo: string) => (valore: string | null) =>
    aggiornaProfiloAction(companyId, s.id, { [campo]: valore ?? "" });

  return (
    <div className="space-y-8" data-tour="qas-sistema">
      <Perimetro companyId={companyId} dati={dati} />

      <Gruppo titolo="Identificazione">
        <CampoTesto id="qas-ragione" etichetta="Ragione sociale" valore={s.ragione} salva={salva("ragione")}
          aiuto="Sostituisce [Nome Organizzazione] nel corpus documentale" />
        <CampoTesto id="qas-forma" etichetta="Forma giuridica" valore={s.forma} salva={salva("forma")} />
        <CampoTesto id="qas-piva" etichetta="Partita IVA / C.F." valore={s.piva} salva={salva("piva")} />
        <CampoTesto id="qas-sede" etichetta="Sede legale" valore={s.sede} salva={salva("sede")} />
        <CampoTesto id="qas-settore" etichetta="Settore di attività" valore={s.settore} salva={salva("settore")} />
        <CampoTesto id="qas-addetti" etichetta="Numero di addetti" valore={s.addetti} salva={salva("addetti")} />
      </Gruppo>

      <Gruppo titolo="Ruoli del sistema">
        <CampoTesto id="qas-direzione" etichetta="Alta direzione" valore={s.direzione} salva={salva("direzione")}
          aiuto="Sostituisce [Alta Direzione] nel corpus" />
        <CampoTesto id="qas-resp" etichetta="Responsabile del sistema integrato"
          valore={s.responsabileSistema} salva={salva("responsabileSistema")} />
        <CampoTesto id="qas-rspp" etichetta="RSPP" valore={s.rspp} salva={salva("rspp")}
          aiuto="Richiesto dalla ISO 45001 e dal D.Lgs. 81/2008: se la Sicurezza è nel perimetro, qui non può restare vuoto" />
        <CampoTesto id="qas-rls" etichetta="Rappresentante dei lavoratori" valore={s.rls} salva={salva("rls")} />
        <CampoTesto id="qas-medico" etichetta="Medico competente" valore={s.medico} salva={salva("medico")} />
      </Gruppo>

      <Gruppo titolo="Campo di applicazione">
        <CampoTesto id="qas-scopo" etichetta="Campo di applicazione" valore={s.scopo} multiriga salva={salva("scopo")}
          aiuto="Attività, prodotti e servizi coperti dal sistema" />
        <CampoTesto id="qas-siti" etichetta="Siti inclusi" valore={s.siti} multiriga salva={salva("siti")} />
        <CampoTesto id="qas-esclusioni" etichetta="Esclusioni e motivazione" valore={s.esclusioni} multiriga
          salva={salva("esclusioni")}
          aiuto="Un'esclusione non motivata è un rilievo: la norma chiede la ragione, non il solo elenco" />
      </Gruppo>

      <Gruppo titolo="Adozione">
        <CampoData id="qas-adozione" etichetta="Data di adozione" valore={s.dataAdozione} salva={salva("dataAdozione")} />
        <CampoTesto id="qas-revisione" etichetta="Revisione corrente" valore={s.revisione} salva={salva("revisione")} />
        <CampoTesto id="qas-note" etichetta="Note" valore={s.note} multiriga salva={salva("note")} />
      </Gruppo>
    </div>
  );
}

/**
 * Il perimetro delle norme.
 *
 * ⚠️ È il comando che cambia più cose di tutto il modulo: decide quanti requisiti si
 * vedono e su quali si calcola l'indice. Per questo dice ad alta voce quanti requisiti
 * comporta ogni scelta, invece di lasciarlo scoprire dopo.
 *
 * ⚠️ Comando ottimistico, e con un rifiuto proprio: l'ultima norma non si può togliere.
 * Il server lo impedisce comunque, ma un interruttore che si spegne e poi torna indietro
 * senza spiegazione si legge come un difetto.
 */
function Perimetro({ companyId, dati }: { companyId: string; dati: DatiSgiQas }) {
  const [norme, setNorme] = useState<string[]>(dati.sistema.norme);
  const [errore, setErrore] = useState<string | null>(null);

  const conta = (k: string) => dati.requisiti.filter((r) => r.norme.includes(k)).length;

  async function cambia(k: string) {
    const dentro = norme.includes(k);
    if (dentro && norme.length === 1) {
      setErrore("Almeno una norma deve restare nel perimetro: un sistema senza norme non è un sistema.");
      return;
    }
    const nuovo = dentro ? norme.filter((n) => n !== k) : [...norme, k];
    const precedente = norme;
    setNorme(nuovo);
    setErrore(null);
    const esito = await setNormeAction(companyId, dati.sistema.id, nuovo as ("Q" | "A" | "S")[]);
    if (!esito.ok) {
      setNorme(precedente);
      setErrore(esito.errore);
    }
  }

  const inPerimetro = dati.requisiti.filter((r) => r.norme.some((n) => norme.includes(n))).length;

  return (
    <section aria-label="Perimetro delle norme">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        Perimetro del sistema
      </h2>
      <div className="mt-3 rounded-xl border p-4" data-tour="qas-perimetro">
        <div className="flex flex-wrap gap-2">
          {dati.norme.map((n) => {
            const dentro = norme.includes(n.key);
            return (
              <button
                key={n.key}
                type="button"
                role="switch"
                aria-checked={dentro}
                aria-label={`${n.norma} nel perimetro`}
                onClick={() => cambia(n.key)}
                data-slot="norma"
                className="rounded-lg border px-3 py-2 text-left text-[13px]"
                style={
                  dentro
                    ? { background: "var(--area-sistemi)", color: "white", borderColor: "var(--area-sistemi)" }
                    : undefined
                }
              >
                <span className="block font-medium">{n.norma}</span>
                <span className="block text-[11px] opacity-80">
                  {NOME_NORMA[n.key] ?? n.nome} · {conta(n.key)} requisiti
                </span>
              </button>
            );
          })}
        </div>
        <p className="mt-3 text-[12px] text-muted-foreground" data-slot="perimetro-conto">
          <strong>{inPerimetro}</strong> requisiti nel perimetro su {dati.requisiti.length}. I requisiti che
          valgono per più norme si valutano una volta sola: trentatré dei 107 valgono per tutte e tre.
        </p>
        {errore && (
          <p className="mt-2 text-[12px] text-destructive" role="alert">
            {errore}
          </p>
        )}
        <p className="mt-2 text-[12px] text-muted-foreground">
          Togliere una norma non cancella le valutazioni dei suoi requisiti: una certificazione si sospende
          anche per un anno, e rimetterla deve ritrovare il lavoro fatto.
        </p>
      </div>
    </section>
  );
}

function Gruppo({ titolo, children }: { titolo: string; children: React.ReactNode }) {
  return (
    <section aria-label={titolo}>
      <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">{titolo}</h2>
      <div className="mt-3 grid gap-4 rounded-xl border p-4 sm:grid-cols-2">{children}</div>
    </section>
  );
}
