"use client";

import { AREE, USI_CATALOGO, VETTORI_CATALOGO, type RisultatiVetrina } from "@/features/vetrina/energia";
import { numero, percentuale } from "@/features/vetrina/formato";
import { euro } from "@/lib/prezzi";
import { Sankey, Pareto } from "@/components/documento/charts-energia";

// I risultati della prova: gli stessi numeri e gli STESSI GRAFICI del documento.
//
// ⚠️ `Sankey` e `Pareto` arrivano da `components/documento/charts-energia.tsx`, che disegna la
// diagnosi impaginata: sono SVG puri — importano solo la palette di stampa — quindi si
// riusano nel browser senza copiarli. Chi prova la vetrina vede la figura che troverà nel
// PDF, non un'imitazione fatta per l'occasione.

const GRIGIO = "#94a3b8";

export function RisultatiEnergia({ risultati: r }: { risultati: RisultatiVetrina }) {
  const flussi = r.flussi.map((f) => ({ da: f.vettoreKey, a: f.areaKey, valore: f.kwh.toNumber() }));

  const sorgenti = VETTORI_CATALOGO.filter((v) => !v.sub).map((v) => ({
    key: v.key,
    nome: v.nome,
    colore: v.colore ?? GRIGIO,
  }));
  const destinazioni = AREE.map((a) => ({ key: a.key, nome: a.nome, colore: a.colore }));

  const voci = [...r.ripartizione.perUso.entries()]
    .map(([key, u]) => ({
      nome: USI_CATALOGO.find((x) => x.key === key)?.nome ?? key,
      valore: u.kwh.toNumber(),
      colore: AREE.find((a) => a.key === USI_CATALOGO.find((x) => x.key === key)?.areaKey)?.colore ?? GRIGIO,
    }))
    .filter((v) => v.valore > 0);

  const tessere: [string, string, string][] = [
    ["Energia finale", numero(r.totali.kwh.toNumber()), "kWh"],
    ["Energia primaria", numero(r.totali.tep.toNumber(), 1), "tep"],
    ["Emissioni", numero(r.emissioni.totLocation.toNumber(), 1), "tCO₂e location-based"],
    ["Spesa energetica", euro(Math.round(r.totali.costo.toNumber() * 100)), "nell'anno"],
    ["Costo medio", euro(Math.round(r.totali.euroPerKwh.toNumber() * 100)), "al kWh"],
    ["Quota rinnovabile", percentuale(r.totali.pctRinnovabile.toNumber()), "sull'energia finale"],
  ];

  return (
    <div className="mt-6" data-vetrina="passo-risultati">
      <h3 className="font-display text-[19px] font-bold tracking-[-0.01em]">Il quadro del sito</h3>
      <p className="mt-1.5 max-w-2xl text-[13.5px] leading-relaxed text-muted-foreground">
        Sono i tuoi numeri, calcolati con le funzioni del prodotto. Nel percorso completo queste
        stesse figure finiscono dentro il documento, con le tabelle e il testo.
      </p>

      <dl className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3" data-vetrina="tessere">
        {tessere.map(([etichetta, valore, unita]) => (
          <div key={etichetta} className="rounded-xl border bg-card p-4">
            <dt className="text-[12px] uppercase tracking-[0.14em] text-muted-foreground">{etichetta}</dt>
            <dd className="font-display mt-1.5 text-[26px] font-bold tabular-nums" data-slot="kpi">
              {valore}
            </dd>
            <dd className="text-[12.5px] text-muted-foreground">{unita}</dd>
          </div>
        ))}
      </dl>

      {/* ⚠️ I DUE GRAFICI STANNO SU FONDO BIANCO ANCHE NEL TEMA SCURO, e non è una svista.
          Sono gli stessi SVG che finiscono nel documento stampato, quindi portano la palette
          della carta: testo scuro, righe sottili, nessun colore che dipenda dal tema. Sul
          fondo scuro della pagina le etichette del Sankey diventavano illeggibili — visto
          fotografando, non dedotto. Ridisegnarli per lo schermo significherebbe avere due
          figure diverse dalla stessa funzione, cioè una vetrina che mostra qualcosa di
          diverso da ciò che il cliente riceverà. Meglio dichiarare che è un foglio. */}
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <figure className="rounded-xl border bg-card p-4" data-vetrina="sankey">
          <figcaption className="text-[13px] font-medium">
            Dai vettori alle aree funzionali
            <span className="mt-1 block text-[12.5px] font-normal text-muted-foreground">
              Quanta energia entra da ciascuna forma, e in quale parte dello stabilimento finisce.
            </span>
          </figcaption>
          <div className="mt-3 overflow-x-auto rounded-lg bg-white p-2">
            <Sankey sorgenti={sorgenti} destinazioni={destinazioni} flussi={flussi} />
          </div>
        </figure>

        <figure className="rounded-xl border bg-card p-4" data-vetrina="pareto">
          <figcaption className="text-[13px] font-medium">
            Gli usi che pesano di più
            <span className="mt-1 block text-[12.5px] font-normal text-muted-foreground">
              Ordinati per consumo, con la cumulata: di solito due o tre utenze fanno la bolletta.
            </span>
          </figcaption>
          <div className="mt-3 overflow-x-auto rounded-lg bg-white p-2">
            <Pareto voci={voci} />
          </div>
        </figure>
      </div>

      {/* Ciò che manca si dice qui, dove la persona sta guardando il risultato e potrebbe
          credere di avere in mano la diagnosi: non in fondo alla pagina in corpo otto. */}
      <p className="mt-6 rounded-lg border border-dashed p-4 text-[13px] leading-relaxed text-muted-foreground">
        Questa è la fotografia. La <strong className="font-medium text-foreground">diagnosi</strong>{" "}
        aggiunge gli indicatori sui due anni, gli interventi con il tempo di ritorno, il racconto
        e il documento impaginato secondo la norma — e quelli vivono nell&apos;account.
      </p>
    </div>
  );
}
