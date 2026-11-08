"use client";

import { useState } from "react";
import { PIANI, euro, fasceConsulenti, prezzoDiVendita, type PianoKey } from "@/lib/prezzi";

// IL CONTO SI FA CON I NUMERI DI CHI LEGGE, NON CON I NOSTRI.
//
// ⚠️ Una prima versione di questa pagina, arrivata da un consulente esterno, precompilava
// il calcolatore con «prezzi medi di mercato» dei documenti: MOG 231 nove mila euro,
// bilancio di sostenibilità sei mila. Sono affermazioni su tariffe di terzi che non
// possiamo documentare, su una pagina indicizzata, in un settore dove i concorrenti
// leggono. Un numero che non si può sostenere è pubblicità ingannevole anche quando è
// vero, perché la prova sta a chi lo pubblica.
//
// Qui la tariffa la mette chi legge. Il conto è più utile — è il SUO — e non dichiara
// niente che non sia suo. Se un giorno avremo una fonte citabile, il posto dove metterla è
// il valore iniziale, con la fonte scritta sotto.
//
// ⚠️ DUE CONTI, perché i lettori sono due (6 novembre 2026). L'AZIENDA confronta quello che
// spende per farsi redigere i documenti fuori con il piano Azienda; il CONSULENTE confronta
// quello che fattura con il piano che regge il suo portafoglio. I valori iniziali sono
// esempi tondi, e lo si dice accanto ai campi: nessuno è una media di mercato.

/** La fascia per consulenti più piccola che regge quel numero di aziende. */
function fasciaPer(aziende: number): PianoKey {
  return fasceConsulenti().find((k) => PIANI[k].aziende >= aziende) ?? "enterprise";
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
          // restituisce NaN, e NaN si propaga silenziosamente in tutti i conti a valle.
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

function Risultato({ etichetta, valore }: { etichetta: string; valore: string }) {
  return (
    <div>
      <dt className="text-[12px] uppercase tracking-[0.14em] text-muted-foreground">{etichetta}</dt>
      <dd className="font-display mt-1 text-[19px] font-semibold tabular-nums" data-slot="kpi">
        {valore}
      </dd>
    </div>
  );
}

const una = (n: number) => n.toFixed(1).replace(".", ",");

/** Il conto dell'azienda: quanto costa affidarlo all'esterno, contro il piano Azienda. */
function ContoAzienda() {
  const [documenti, setDocumenti] = useState(3);
  const [costoEsterno, setCostoEsterno] = useState(3000);
  const piano = PIANI.azienda;
  const anno = prezzoDiVendita(piano, "anno");
  // In centesimi, come tutto il listino: `euro()` li legge così.
  const esterno = documenti * costoEsterno * 100;
  const differenza = anno ? esterno - anno.importo : null;

  return (
    <div className="grid gap-8 md:grid-cols-[minmax(0,17rem)_1fr]">
      <div className="space-y-5">
        <Campo
          etichetta="Documenti che ti servono in un anno"
          valore={documenti}
          imposta={setDocumenti}
          min={0}
          max={50}
        />
        <Campo
          etichetta="Quanto ti costa ciascuno, affidato all'esterno"
          suffisso="€"
          valore={costoEsterno}
          imposta={setCostoEsterno}
          min={0}
          max={100000}
          passo={100}
        />
        <p className="text-[12px] leading-relaxed text-muted-foreground">
          I valori iniziali sono un esempio: metti il preventivo che hai in mano.
        </p>
      </div>
      <div className="flex flex-col justify-between gap-6">
        <dl className="grid gap-x-8 gap-y-4 sm:grid-cols-2">
          <Risultato etichetta="Affidati all'esterno" valore={euro(esterno)} />
          <Risultato etichetta={`Piano ${piano.nome}, un anno`} valore={anno ? euro(anno.importo) : "su preventivo"} />
        </dl>
        <p className="border-t pt-5 text-[14.5px] leading-relaxed" data-conto-esito>
          {differenza === null || documenti === 0 ? (
            <>Metti quanti documenti ti servono e quanto ti costano: il conto si fa da solo.</>
          ) : differenza > 0 ? (
            <>
              Con i tuoi numeri, fare da te costa{" "}
              <strong className="tabular-nums" data-slot="kpi">
                {euro(differenza)}{" "}in meno
              </strong>{" "}
              in un anno, e i documenti restano tuoi da aggiornare quando serve.
            </>
          ) : (
            <>Con questi numeri affidarli all'esterno costa meno del piano: il valore sta nel tenerli aggiornati da te.</>
          )}
        </p>
      </div>
    </div>
  );
}

/** Il conto del consulente: quante volte si ripaga con i documenti che vende. */
function ContoConsulente() {
  const [aziende, setAziende] = useState(8);
  const [documenti, setDocumenti] = useState(6);
  const [tariffa, setTariffa] = useState(4000);

  const piano = PIANI[fasciaPer(aziende)];
  const vendita = prezzoDiVendita(piano, "anno");

  const ricavo = documenti * tariffa;
  const costo = vendita ? vendita.importo / 100 : null;
  const volte = costo && costo > 0 ? ricavo / costo : null;
  const incidenza = costo && ricavo > 0 ? (costo / ricavo) * 100 : null;

  return (
    <div className="grid gap-8 md:grid-cols-[minmax(0,17rem)_1fr]">
      <div className="space-y-5">
        <Campo etichetta="Aziende che segui" valore={aziende} imposta={setAziende} min={1} max={200} />
        <Campo
          etichetta="Documenti che prevedi in un anno"
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
          <Risultato etichetta="Il tuo piano" valore={piano.nome} />
          <Risultato etichetta="Costo in un anno" valore={vendita ? euro(vendita.importo) : "su preventivo"} />
          <Risultato etichetta="Ricavo dai documenti" valore={euro(ricavo * 100)} />
          <Risultato
            etichetta="Incidenza sul fatturato generato"
            valore={incidenza === null ? "non calcolabile" : `${una(incidenza)} %`}
          />
        </dl>
        <p className="border-t pt-5 text-[14.5px] leading-relaxed" data-conto-esito>
          {volte === null ? (
            <>Oltre le 30 aziende il prezzo si concorda: scrivici e prepariamo un preventivo.</>
          ) : volte >= 1 ? (
            <>
              L&apos;abbonamento si ripaga{" "}
              <strong className="tabular-nums" data-slot="kpi">
                {una(volte)}{" "}volte
              </strong>{" "}
              con i documenti che prevedi di vendere in un anno.
            </>
          ) : (
            <>Con questi numeri l&apos;abbonamento non si ripaga in un anno.</>
          )}
        </p>
      </div>
    </div>
  );
}

export function CalcolatoreRitorno() {
  const [chi, setChi] = useState<"azienda" | "consulente">("azienda");
  const scelte = [
    ["azienda", "Per la mia azienda"],
    ["consulente", "Sono un consulente"],
  ] as const;
  return (
    <div className="rounded-xl border bg-card p-6 md:p-8" data-calcolatore>
      <div role="group" aria-label="Per chi è il conto" className="mb-6 inline-flex rounded-full border p-1">
        {scelte.map(([k, etichetta]) => (
          <button
            key={k}
            type="button"
            aria-pressed={chi === k}
            onClick={() => setChi(k)}
            className={
              "rounded-full px-4 py-1.5 text-[13px] font-medium transition-colors " +
              (chi === k ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground")
            }
          >
            {etichetta}
          </button>
        ))}
      </div>
      {chi === "azienda" ? <ContoAzienda /> : <ContoConsulente />}
    </div>
  );
}
