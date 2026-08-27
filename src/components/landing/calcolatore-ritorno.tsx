"use client";

import { useState } from "react";
import { CHIAVI_PIANO, PIANI, euro, prezzoDiVendita, type PianoKey } from "@/lib/prezzi";

// IL CONTO SI FA CON I NUMERI DI CHI LEGGE, NON CON I NOSTRI.
//
// ⚠️ Una prima versione di questa pagina, arrivata da un consulente esterno, precompilava
// il calcolatore con «prezzi medi di mercato» dei documenti: MOG 231 nove mila euro,
// bilancio di sostenibilità sei mila. Sono affermazioni su tariffe di terzi che non
// possiamo documentare, su una pagina indicizzata, in un settore dove i concorrenti
// leggono. Un numero che non si può sostenere è pubblicità ingannevole anche quando è
// vero, perché la prova sta a chi lo pubblica.
//
// Qui la tariffa la mette il consulente. Il conto è più utile — è il SUO — e non
// dichiara niente che non sia suo. Se un giorno avremo una fonte citabile, il posto dove
// metterla è il valore iniziale di `tariffa`, con la fonte scritta sotto.

/** La fascia più piccola che regge quel numero di aziende. */
function fasciaPer(aziende: number): PianoKey {
  const vendibili = CHIAVI_PIANO.filter((k) => !PIANI[k].trattativa);
  return vendibili.find((k) => PIANI[k].aziende >= aziende) ?? "enterprise";
}

function Campo({
  etichetta,
  suffisso,
  valore,
  imposta,
  min,
  max,
  passo = 1,
}: {
  etichetta: string;
  suffisso?: string;
  valore: number;
  imposta: (n: number) => void;
  min: number;
  max: number;
  passo?: number;
}) {
  const id = `campo-${etichetta.replace(/\W+/g, "-").toLowerCase()}`;
  return (
    <div>
      <label htmlFor={id} className="block text-[13px] font-medium">
        {etichetta}
      </label>
      <div className="mt-1.5 flex items-baseline gap-2">
        <input
          id={id}
          type="number"
          inputMode="numeric"
          min={min}
          max={max}
          step={passo}
          value={valore}
          // ⚠️ Campo CONTROLLATO e valore ricondotto nell'intervallo: un `number` vuoto
          // restituisce NaN, e NaN si propaga silenziosamente in tutti i conti a valle
          // trasformando il riquadro dei risultati in tre trattini senza dire perché.
          onChange={(e) => {
            const n = Number(e.target.value);
            imposta(Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : min);
          }}
          className="w-28 rounded-md border bg-background px-3 py-2 text-[15px] tabular-nums outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
        {suffisso && <span className="text-[13px] text-muted-foreground">{suffisso}</span>}
      </div>
    </div>
  );
}

export function CalcolatoreRitorno() {
  const [aziende, setAziende] = useState(8);
  const [documenti, setDocumenti] = useState(6);
  const [tariffa, setTariffa] = useState(4000);

  const chiave = fasciaPer(aziende);
  const piano = PIANI[chiave];
  const vendita = prezzoDiVendita(piano, "anno1");

  const ricavo = documenti * tariffa;
  const costo = vendita ? vendita.importo / 100 : null;
  const volte = costo && costo > 0 ? ricavo / costo : null;
  const incidenza = costo && ricavo > 0 ? (costo / ricavo) * 100 : null;

  return (
    <div className="grid gap-8 rounded-xl border bg-card p-6 md:grid-cols-[minmax(0,17rem)_1fr] md:p-8">
      <div className="space-y-5">
        <Campo etichetta="Aziende che segui" valore={aziende} imposta={setAziende} min={1} max={200} />
        <Campo
          etichetta="Documenti che prevedi nel primo anno"
          valore={documenti}
          imposta={setDocumenti}
          min={0}
          max={500}
        />
        <Campo
          etichetta="Quanto fatturi in media per documento"
          suffisso="€"
          valore={tariffa}
          imposta={setTariffa}
          min={0}
          max={100000}
          passo={100}
        />
      </div>

      <div className="flex flex-col justify-between gap-6">
        <dl className="grid gap-x-8 gap-y-4 sm:grid-cols-2">
          <div>
            <dt className="text-[12px] uppercase tracking-[0.14em] text-muted-foreground">La tua fascia</dt>
            <dd className="font-display mt-1 text-[19px] font-semibold">{piano.nome}</dd>
          </div>
          <div>
            <dt className="text-[12px] uppercase tracking-[0.14em] text-muted-foreground">Costo il primo anno</dt>
            <dd className="font-display mt-1 text-[19px] font-semibold tabular-nums" data-slot="kpi">
              {vendita ? euro(vendita.importo) : "su preventivo"}
            </dd>
          </div>
          <div>
            <dt className="text-[12px] uppercase tracking-[0.14em] text-muted-foreground">Ricavo dai documenti</dt>
            <dd className="font-display mt-1 text-[19px] font-semibold tabular-nums" data-slot="kpi">
              {euro(ricavo * 100)}
            </dd>
          </div>
          <div>
            <dt className="text-[12px] uppercase tracking-[0.14em] text-muted-foreground">
              Incidenza sul fatturato generato
            </dt>
            <dd className="font-display mt-1 text-[19px] font-semibold tabular-nums" data-slot="kpi">
              {incidenza === null ? "—" : `${incidenza.toFixed(1).replace(".", ",")} %`}
            </dd>
          </div>
        </dl>

        <p className="border-t pt-5 text-[14.5px] leading-relaxed">
          {volte === null ? (
            <>Oltre le 30 aziende il prezzo si concorda: scrivici e prepariamo un preventivo.</>
          ) : volte >= 1 ? (
            <>
              L&apos;abbonamento si ripaga{" "}
              <strong className="tabular-nums" data-slot="kpi">
                {volte.toFixed(1).replace(".", ",")} volte
              </strong>{" "}
              con i documenti che prevedi di vendere il primo anno.
            </>
          ) : (
            <>Con questi numeri l&apos;abbonamento non si ripaga nel primo anno.</>
          )}
        </p>
      </div>
    </div>
  );
}
