"use client";

import { statistiche, statoTermine, urgenza } from "@/lib/calc/segnalazioni/relazione";
import { NOME_TERMINE, COLORE_TERMINE, type DatiSegnalazioni } from "./types";

// Il quadro: il canale è a norma, i termini sono rispettati, cosa resta da fare.
//
// ⚠️ Le cifre le calcolano le STESSE funzioni pure che il documento userà al momento
// della pubblicazione. Non possono divergere da ciò che finirà stampato, ed è il motivo
// per cui nessun conteggio è riscritto qui.
//
// ⚠️ `oggi` arriva dal server e non da `new Date()`. In un componente client sarebbe
// l'orologio del browser: il server renderebbe una data e il client un'altra, e i
// termini «in scadenza» lampeggerebbero all'idratazione.

export function VistaQuadro({
  dati,
  oggi,
  vai,
}: {
  dati: DatiSegnalazioni;
  oggi: string;
  vai: (v: string) => void;
}) {
  const k = statistiche(dati.fascicoli, oggi);
  const canale = dati.canale;

  const avvisi = [
    {
      n: canale.stato.mancanti.length + canale.stato.dichiarateNonAttive.length,
      testo:
        canale.stato.mancanti.length > 0
          ? `modalità del canale non istituite o non attive (${[...canale.stato.mancanti, ...canale.stato.dichiarateNonAttive].join(", ")})`
          : `modalità del canale previste ma non attive (${canale.stato.dichiarateNonAttive.join(", ")})`,
      vista: "canale",
      grave: true,
    },
    {
      n: canale.consultazione === "assente" || canale.consultazione === "tardiva" ? 1 : 0,
      testo:
        canale.consultazione === "tardiva"
          ? "la consultazione sindacale risulta successiva all'attivazione del canale"
          : "il canale è attivo e non risulta alcuna consultazione sindacale",
      vista: "canale",
      grave: true,
    },
    { n: k.avvisi.scaduti, testo: "avvisi di ricevimento oltre i sette giorni", vista: "registro", grave: true },
    { n: k.riscontri.scaduti, testo: "riscontri oltre i tre mesi", vista: "registro", grave: true },
    {
      n: k.monitoraggiDovutiNonAperti,
      testo: "monitoraggi delle ritorsioni dovuti e non aperti",
      vista: "registro",
      grave: true,
    },
    { n: k.daCancellare, testo: "fascicoli oltre i cinque anni non cancellati", vista: "registro", grave: true },
    {
      n: dati.conformita.totale - dati.conformita.valutati,
      testo: "requisiti del decreto non ancora valutati",
      vista: "conformita",
      grave: false,
    },
  ].filter((a) => a.n > 0);

  const daLavorare = dati.fascicoli
    .filter((f) => f.stato !== "Chiusa" && f.stato !== "Archiviata")
    .sort((a, b) => urgenza(a, oggi) - urgenza(b, oggi) || a.numero - b.numero)
    .slice(0, 8);

  return (
    <div className="space-y-8">
      <section aria-label="Stato del canale">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Riquadro
            etichetta="Canale a norma"
            valore={canale.stato.conforme ? "sì" : "no"}
            nota={
              canale.stato.conforme
                ? "le tre forme dell'art. 4 sono attive"
                : `coperte ${canale.stato.coperte.length} forme su 3`
            }
          />
          <Riquadro
            etichetta="Avvisi nei sette giorni"
            valore={k.avvisi.percentuale === null ? "—" : `${k.avvisi.percentuale}%`}
            nota={`${k.avvisi.scaduti} scaduti · ${k.avvisi.tardivi} fuori termine`}
          />
          <Riquadro
            etichetta="Riscontri nei tre mesi"
            valore={k.riscontri.percentuale === null ? "—" : `${k.riscontri.percentuale}%`}
            nota={`${k.riscontri.scaduti} scaduti · ${k.riscontri.tardivi} fuori termine`}
          />
          <Riquadro
            etichetta="Conformità valutata"
            valore={dati.conformita.indice === null ? "—" : `${dati.conformita.indice}%`}
            nota={`${dati.conformita.valutati} requisiti su ${dati.conformita.totale}`}
          />
        </div>
        <p className="mt-2 text-[12px] text-muted-foreground">
          Il rispetto dei termini è calcolato sui soli adempimenti <strong>dovuti</strong>: le segnalazioni
          anonime prive di recapito e di codice non consentono avviso né riscontro, ed escono dal conto.
          Gli adempimenti resi in ritardo sono contati a parte e non alzano la percentuale.
        </p>
      </section>

      <section aria-label="Segnalazioni">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Segnalazioni</h2>
        {k.zeroDaInterpretare ? (
          <div className="mt-3 rounded-xl border px-4 py-5 text-[13px]" data-slot="zero-segnalazioni">
            <p className="font-medium">Nessuna segnalazione registrata.</p>
            <p className="mt-2 text-muted-foreground">
              Un numero pari a zero non è di per sé un buon risultato: è più spesso l&apos;indice di un canale
              non conosciuto, non ritenuto affidabile o non accessibile. Prima di concludere che non vi siano
              violazioni, conviene verificare come l&apos;informazione è stata diffusa.
            </p>
          </div>
        ) : (
          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Riquadro etichetta="In trattazione" valore={String(k.aperte)} nota={`${k.totali} complessive`} />
            <Riquadro etichetta="Concluse" valore={String(k.concluse)} nota={`${k.perEsito.Fondata} fondate`} />
            <Riquadro etichetta="Anonime" valore={String(k.anonime)} nota="identità non conoscibile" />
            <Riquadro
              etichetta="Da soggetti esterni"
              valore={String(k.daEsterni)}
              nota="fornitori, candidati, ex dipendenti"
            />
          </div>
        )}
      </section>

      {daLavorare.length > 0 && (
        <section aria-label="Scadenzario">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Scadenzario</h2>
            <button className="text-[12px] underline underline-offset-2" onClick={() => vai("registro")}>
              Tutte le segnalazioni
            </button>
          </div>
          <ul className="mt-3 divide-y rounded-xl border" data-tour="wb-scadenzario">
            {daLavorare.map((f) => {
              const a = statoTermine(f, "avviso", oggi);
              const r = statoTermine(f, "riscontro", oggi);
              return (
                <li key={f.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                  <span className="font-mono text-sm tabular-nums">{f.numero}</span>
                  {f.anonima && (
                    <span className="rounded bg-muted px-1.5 py-0.5 text-[11px] text-muted-foreground">anonima</span>
                  )}
                  <span className="min-w-0 flex-1 truncate text-[13px]">{f.ambito || "ambito non indicato"}</span>
                  <Pastiglia stato={a} etichetta="avviso" />
                  <Pastiglia stato={r} etichetta="riscontro" />
                  <span className="text-[12px] text-muted-foreground">{f.stato}</span>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <section aria-label="Posizioni da presidiare">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Posizioni da presidiare
        </h2>
        {avvisi.length === 0 ? (
          <p className="mt-3 rounded-xl border px-4 py-6 text-center text-[13px] text-muted-foreground">
            Nessuna posizione aperta.
          </p>
        ) : (
          <ul className="mt-3 divide-y rounded-xl border" data-tour="wb-avvisi">
            {avvisi.map((a) => (
              <li key={a.testo} className="flex items-center gap-3 px-4 py-3">
                <span
                  className="size-2.5 shrink-0 rounded-full"
                  style={{ background: a.grave ? "var(--destructive)" : "var(--warning)" }}
                />
                <span className="font-mono text-sm tabular-nums" data-slot="kpi">
                  {a.n}
                </span>
                <button
                  className="min-w-0 flex-1 truncate text-left text-[13px] underline underline-offset-2"
                  onClick={() => vai(a.vista)}
                >
                  {a.testo}
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function Riquadro({ etichetta, valore, nota }: { etichetta: string; valore: string; nota: string }) {
  return (
    <div className="rounded-xl border px-4 py-3">
      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{etichetta}</p>
      <p className="mt-1 font-mono text-2xl tabular-nums" data-slot="kpi">
        {valore}
      </p>
      <p className="mt-0.5 text-[12px] text-muted-foreground">{nota}</p>
    </div>
  );
}

function Pastiglia({ stato, etichetta }: { stato: keyof typeof NOME_TERMINE; etichetta: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-[12px]" title={`${etichetta}: ${NOME_TERMINE[stato]}`}>
      <span className="size-2 rounded-full" style={{ background: COLORE_TERMINE[stato] }} />
      <span className="text-muted-foreground">{NOME_TERMINE[stato]}</span>
    </span>
  );
}
