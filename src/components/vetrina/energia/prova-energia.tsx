"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, Compass, Lock, RotateCcw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  AREE, USI_ATTIVI, USI_CATALOGO, VETTORI_CATALOGO,
  calcola, scenarioIniziale, type RigaVettore,
} from "@/features/vetrina/energia";
import { numero, percentuale } from "@/features/vetrina/formato";
import { euro } from "@/lib/prezzi";
import type { Cella } from "@/lib/calc/energy/allocation";
import { avviaTour } from "@/lib/tour/avvia";
import { findTourForPath } from "@/lib/tour/registry";
import { RisultatiEnergia } from "./risultati-energia";

// La prova pubblica del Bilancio energetico: tre passi vivi, cinque in anteprima.
//
// ⚠️ NON SCRIVE NIENTE. Nessuna server action, nessuna `fetch` verso di noi: i numeri stanno
// nello stato del componente e, per comodità, in `localStorage`. È ciò che rende la pagina
// aperta a chiunque senza account, senza difese antispam e senza pulizie periodiche — un
// pericolo si evita, non si filtra.
//
// ⚠️ E I NUMERI LI CALCOLA IL MOTORE DEL PRODOTTO (`src/lib/calc/energy`), coi fattori del
// catalogo seminato. Riscrivere l'aritmetica qui dentro darebbe una vetrina che, il giorno in
// cui un fattore cambia, mostra un risultato diverso dal percorso vero — e a notarlo sarebbe
// il consulente che si è appena registrato.

const CHIAVE = "evalisdeck-vetrina-energia";
const CHIAVE_TOUR = "evalisdeck-tour:vetrina-energia";

const PASSI = [
  { n: 1, nome: "Sito e perimetro", vivo: false, cosa: "Chi sei, quale stabilimento, che cosa resta fuori dalla diagnosi." },
  { n: 2, nome: "Vettori", vivo: true, cosa: "I consumi dell'anno per ciascuna forma di energia che entra." },
  { n: 3, nome: "Usi finali", vivo: true, cosa: "Dove va l'energia: la ripartizione che deve quadrare." },
  { n: 4, nome: "Risultati", vivo: true, cosa: "kWh, tep, emissioni e il peso di ogni uso." },
  { n: 5, nome: "Indicatori", vivo: false, cosa: "Consumo specifico e confronto con l'anno base." },
  { n: 6, nome: "Interventi", vivo: false, cosa: "Risparmio stimato, investimento e tempo di ritorno." },
  { n: 7, nome: "Racconto", vivo: false, cosa: "Le pagine di testo, con le bozze generate dai tuoi dati." },
  { n: 8, nome: "Bilancio", vivo: false, cosa: "Il documento impaginato e il PDF da consegnare." },
] as const;

type Stato = { vettori: RigaVettore[]; celle: Cella[] };

function leggiSalvato(): Stato | null {
  try {
    const grezzo = localStorage.getItem(CHIAVE);
    if (!grezzo) return null;
    const s = JSON.parse(grezzo) as Stato;
    if (!Array.isArray(s?.vettori) || !Array.isArray(s?.celle)) return null;
    return s;
  } catch {
    // Navigazione privata, dati del sito bloccati, JSON rotto: la vetrina deve aprirsi lo
    // stesso. Un `localStorage` che non risponde non è un guasto, è un browser.
    return null;
  }
}

export function ProvaEnergia({ onRisultati }: { onRisultati?: () => void }) {
  const [passo, setPasso] = useState<number>(2);
  const [stato, setStato] = useState<Stato>(() => {
    const s = scenarioIniziale();
    return { vettori: s.vettori, celle: s.celle };
  });
  const [ripreso, setRipreso] = useState(false);

  // Il salvataggio si legge DOPO il primo disegno: leggerlo durante il render darebbe al
  // browser un HTML diverso da quello del build, che è esattamente l'errore #418.
  useEffect(() => {
    const s = leggiSalvato();
    if (s) {
      setStato(s);
      setRipreso(true);
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(CHIAVE, JSON.stringify(stato));
    } catch {
      /* vedi `leggiSalvato`: se il browser non vuole, si continua senza memoria. */
    }
  }, [stato]);

  const r = useMemo(() => calcola(stato.vettori, stato.celle), [stato]);

  const giro = (forzato: boolean) => {
    const tour = findTourForPath(window.location.pathname);
    if (!tour) return;
    avviaTour(tour);
    if (!forzato) {
      try {
        localStorage.setItem(CHIAVE_TOUR, "1");
      } catch {
        /* senza memoria il giro ripartirà alla visita dopo: fastidioso, non rotto. */
      }
    }
  };

  // Il giro parte da solo alla prima visita — ma non sopra la scelta sui cookie.
  //
  // ⚠️ Un velo sopra la scelta sui cookie la renderebbe incliccabile, e quella scelta è
  // dovuta. Il cancello di `avviaTour` guarda `[data-modale]`, che il banner NON dichiara
  // (segnarlo così bloccava il giro del benvenuto): qui si guarda anche `[data-consenso]`.
  // Senza attesa il tour
  // chiederebbe di partire, troverebbe il banner e non partirebbe MAI: il cancello lo
  // protegge, e il giro andrebbe perso in silenzio. Quindi si riprova finché la scelta non
  // è stata fatta, e si smette dopo mezzo minuto: chi ignora il banner sta leggendo, e un
  // velo che gli si apre addosso dopo trenta secondi è un fastidio, non un aiuto.
  useEffect(() => {
    try {
      if (localStorage.getItem(CHIAVE_TOUR)) return;
    } catch {
      return;
    }
    let tentativi = 0;
    const t = setInterval(() => {
      tentativi++;
      if (tentativi > 40) return clearInterval(t);
      // ⚠️ Si RILEGGE «già visto» a ogni tentativo, non solo all'arrivo: fra la decisione e
      // la partenza passano secondi, e in quei secondi la persona può aver fatto il giro da
      // sé col pulsante, o averlo chiuso in un'altra scheda. È la stessa regola che il
      // pulsante della formazione ha imparato il 1° settembre — sostituire un ritardo fisso
      // con un'attesa vera apre una finestra in cui la condizione verificata smette di
      // valere.
      try {
        if (localStorage.getItem(CHIAVE_TOUR)) return clearInterval(t);
      } catch {
        /* senza memoria si prosegue: il giro partirà, ed è il male minore. */
      }
      if (document.querySelector("[data-modale], [data-consenso]")) return;
      clearInterval(t);
      giro(false);
    }, 750);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- una volta sola all'arrivo:
    // `giro` cambia a ogni render e rimetterebbe in piedi l'attesa daccapo.
  }, []);

  // Il richiamo all'acquisto arriva quando il valore è stato consegnato, cioè quando la
  // persona ha visto i PROPRI numeri: non prima, mentre sta ancora capendo che cos'è.
  useEffect(() => {
    if (passo === 4) onRisultati?.();
  }, [passo, onRisultati]);

  const vettoriInUso = VETTORI_CATALOGO.filter(
    (v) => !v.sub && stato.vettori.some((x) => x.vettoreKey === v.key && Number(x.quantita) > 0),
  );
  const usiAccesi = USI_CATALOGO.filter((u) => USI_ATTIVI.includes(u.key));

  const cambiaVettore = (key: string, campo: "quantita" | "costo", valore: string) =>
    setStato((s) => ({
      ...s,
      // ⚠️ Un campo per volta, e il resto della riga non si rimanda mai: è la regola che
      // questo progetto ha pagato quattro volte (quantità azzerata salvando il costo).
      vettori: s.vettori.map((v) => (v.vettoreKey === key ? { ...v, [campo]: valore } : v)),
    }));

  const cambiaCella = (usoKey: string, vettoreKey: string, valore: string) =>
    setStato((s) => {
      const altre = s.celle.filter((c) => !(c.usoKey === usoKey && c.vettoreKey === vettoreKey));
      return valore.trim() === ""
        ? { ...s, celle: altre }
        : { ...s, celle: [...altre, { usoKey, vettoreKey, quantita: valore }] };
    });

  const cella = (usoKey: string, vettoreKey: string) =>
    String(stato.celle.find((c) => c.usoKey === usoKey && c.vettoreKey === vettoreKey)?.quantita ?? "");

  const ricomincia = () => {
    const s = scenarioIniziale();
    setStato({ vettori: s.vettori, celle: s.celle });
    setRipreso(false);
  };

  return (
    <div data-vetrina="strumento">
      {/* ─────────────────────────────────────────────── i passi */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <ol className="flex flex-wrap gap-1.5" data-tour="vetrina-passi">
          {PASSI.map((p) => (
            <li key={p.n}>
              <button
                type="button"
                onClick={() => p.vivo && setPasso(p.n)}
                disabled={!p.vivo}
                aria-current={passo === p.n ? "step" : undefined}
                title={p.vivo ? p.cosa : `${p.cosa} — nell'account`}
                className={cn(
                  "flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-[12.5px] transition-colors",
                  passo === p.n && "border-primary/60 bg-primary/10 font-medium text-foreground",
                  p.vivo ? "hover:bg-muted" : "cursor-default text-muted-foreground/70",
                )}
              >
                <span className="font-mono text-[11px]">{p.n}</span>
                {p.nome}
                {!p.vivo && <Lock className="size-3" aria-hidden />}
              </button>
            </li>
          ))}
        </ol>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" onClick={() => giro(true)} data-vetrina="tour">
            <Compass className="size-3.5" /> Fai il giro guidato
          </Button>
          <Button variant="ghost" size="sm" onClick={ricomincia} data-vetrina="ricomincia">
            <RotateCcw className="size-3.5" /> Ricomincia dall&apos;esempio
          </Button>
        </div>
      </div>

      {ripreso && (
        <p className="mt-3 text-[12.5px] text-muted-foreground">
          Abbiamo ripreso i numeri che avevi messo la volta scorsa: restano nel tuo browser, da
          noi non arriva niente.
        </p>
      )}

      {/* ─────────────────────────────────────────────── passo 2: vettori */}
      {passo === 2 && (
        <div className="mt-6" data-vetrina="passo-vettori">
          <h3 className="font-display text-[19px] font-bold tracking-[-0.01em]">
            I consumi dell&apos;anno
          </h3>
          <p className="mt-1.5 max-w-2xl text-[13.5px] leading-relaxed text-muted-foreground">
            Ogni vettore ha la sua unità di misura. La conversione in kWh, tep e CO₂e la fanno i
            fattori della norma, gli stessi che usa il percorso completo.
          </p>

          <div className="mt-5 overflow-x-auto rounded-xl border bg-card">
            <table className="w-full min-w-[40rem] border-collapse text-[13.5px]">
              <caption className="sr-only">Consumi per vettore energetico</caption>
              <thead>
                <tr className="border-b bg-muted/40 text-left">
                  <th scope="col" className="px-4 py-3 font-semibold">Vettore</th>
                  <th scope="col" className="px-4 py-3 font-semibold">Quantità</th>
                  <th scope="col" className="px-4 py-3 font-semibold">Costo €</th>
                  <th scope="col" className="px-4 py-3 text-right font-semibold">kWh</th>
                  <th scope="col" className="px-4 py-3 text-right font-semibold">tCO₂e</th>
                </tr>
              </thead>
              <tbody>
                {stato.vettori.map((riga) => {
                  const def = VETTORI_CATALOGO.find((v) => v.key === riga.vettoreKey);
                  const res = r.perVettore.get(riga.vettoreKey);
                  if (!def) return null;
                  return (
                    <tr key={riga.vettoreKey} className="border-b last:border-0">
                      <th scope="row" className="px-4 py-2.5 text-left font-medium">
                        {def.nome}
                        {def.sub && (
                          <span className="ml-1.5 text-[11.5px] font-normal text-muted-foreground">
                            (dettaglio, non si somma)
                          </span>
                        )}
                      </th>
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-2">
                          <Input
                            id={`q-${riga.vettoreKey}`}
                            inputMode="decimal"
                            value={riga.quantita}
                            onChange={(e) => cambiaVettore(riga.vettoreKey, "quantita", e.target.value)}
                            className="h-8 w-28 tabular-nums"
                            aria-label={`Quantità di ${def.nome} in ${def.unita}`}
                          />
                          <span className="font-mono text-[11.5px] text-muted-foreground">{def.unita}</span>
                        </div>
                      </td>
                      <td className="px-4 py-2.5">
                        <Input
                          id={`c-${riga.vettoreKey}`}
                          inputMode="decimal"
                          value={riga.costo}
                          onChange={(e) => cambiaVettore(riga.vettoreKey, "costo", e.target.value)}
                          className="h-8 w-28 tabular-nums"
                          aria-label={`Costo annuo di ${def.nome} in euro`}
                        />
                      </td>
                      <td className="px-4 py-2.5 text-right tabular-nums" data-vetrina={`kwh-${riga.vettoreKey}`}>
                        {numero(res?.kwh.toNumber())}
                      </td>
                      <td className="px-4 py-2.5 text-right tabular-nums">
                        {numero(res?.co2.toNumber(), 1)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="border-t bg-muted/30 font-medium">
                  <th scope="row" className="px-4 py-3 text-left">Totale del sito</th>
                  <td className="px-4 py-3 text-[12.5px] text-muted-foreground" colSpan={2}>
                    {percentuale(r.totali.pctRinnovabile.toNumber())} da fonti rinnovabili ·{" "}
                    {euro(Math.round(r.totali.costo.toNumber() * 100))}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums" data-vetrina="kwh-totale">
                    {numero(r.totali.kwh.toNumber())}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums" data-vetrina="co2-totale">
                    {numero(r.totali.co2.toNumber(), 1)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────── passo 3: usi finali */}
      {passo === 3 && (
        <div className="mt-6" data-vetrina="passo-usi">
          <h3 className="font-display text-[19px] font-bold tracking-[-0.01em]">
            Dove va l&apos;energia
          </h3>
          <p className="mt-1.5 max-w-2xl text-[13.5px] leading-relaxed text-muted-foreground">
            Si ripartisce ogni vettore sugli usi finali, <strong>nell&apos;unità del vettore</strong>.
            La riga in fondo è la quadratura: finché un vettore non è ripartito per intero, la
            diagnosi non chiude.
          </p>

          <div className="mt-5 overflow-x-auto rounded-xl border bg-card">
            <table className="w-full min-w-[44rem] border-collapse text-[13px]">
              <caption className="sr-only">Ripartizione dei vettori sugli usi finali</caption>
              <thead>
                <tr className="border-b bg-muted/40 text-left">
                  <th scope="col" className="px-3 py-3 font-semibold">Uso finale</th>
                  {vettoriInUso.map((v) => (
                    <th key={v.key} scope="col" className="px-3 py-3 text-right font-semibold">
                      {v.nome.split(" ").slice(0, 2).join(" ")}
                      <span className="block font-mono text-[10.5px] font-normal text-muted-foreground">
                        {v.unita}
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {usiAccesi.map((u) => (
                  <tr key={u.key} className="border-b last:border-0">
                    <th scope="row" className="px-3 py-2 text-left font-normal">
                      <span className="font-medium">{u.nome}</span>
                      <span className="block text-[11.5px] text-muted-foreground">
                        {AREE.find((a) => a.key === u.areaKey)?.nome}
                      </span>
                    </th>
                    {vettoriInUso.map((v) => (
                      <td key={v.key} className="px-3 py-2 text-right">
                        <Input
                          inputMode="decimal"
                          value={cella(u.key, v.key)}
                          onChange={(e) => cambiaCella(u.key, v.key, e.target.value)}
                          className="h-8 w-24 text-right tabular-nums"
                          aria-label={`${u.nome}: quantità di ${v.nome} in ${v.unita}`}
                        />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t bg-muted/30">
                  <th scope="row" className="px-3 py-3 text-left font-medium">Quadratura</th>
                  {vettoriInUso.map((v) => {
                    const q = r.quadratura.perVettore.get(v.key);
                    const ok = q?.ok ?? false;
                    return (
                      <td
                        key={v.key}
                        className="px-3 py-3 text-right tabular-nums"
                        data-vetrina={`quadratura-${v.key}`}
                      >
                        <span className={cn("font-medium", ok ? "text-primary" : "text-warning-foreground")}>
                          {ok ? "quadra" : `${numero(q?.residuo.toNumber())} ${v.unita}`}
                        </span>
                        {!ok && (
                          <span className="block text-[11px] text-muted-foreground">da ripartire</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              </tfoot>
            </table>
          </div>

          <p className="mt-3 text-[12.5px] text-muted-foreground" data-vetrina="copertura">
            Copertura degli usi finali: {percentuale(r.ripartizione.coperturaPct.toNumber())}{" "}
            dell&apos;energia che entra nel sito.
          </p>
        </div>
      )}

      {/* ─────────────────────────────────────────────── passo 4: risultati */}
      {passo === 4 && <RisultatiEnergia risultati={r} />}

      {/* ───────────────────────────────── i passi che stanno nell'account */}
      <div className="mt-8 rounded-xl border border-dashed p-5">
        <h4 className="flex items-center gap-2 text-[14px] font-semibold">
          <Check className="size-4 text-primary" aria-hidden />
          Fin qui è la parte che provi senza registrarti
        </h4>
        <ul className="mt-3 grid gap-2 text-[13px] leading-relaxed text-muted-foreground sm:grid-cols-2">
          {PASSI.filter((p) => !p.vivo).map((p) => (
            <li key={p.n} className="flex gap-2">
              <Lock className="mt-0.5 size-3.5 shrink-0" aria-hidden />
              <span>
                <span className="font-medium text-foreground">{p.nome}</span> — {p.cosa}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

/** Esportata per il collaudo e per il banner: il passo dei risultati è il momento in cui il
 *  valore è stato consegnato. */
export const PASSO_RISULTATI = 4;
