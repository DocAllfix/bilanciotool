"use client";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { CampoTesto } from "@/components/comune/campo";
import { fmtNum } from "@/lib/format";
import { Intro, type ComandiGdpr, type DatiGdpr } from "./comune";

// Vista 6 — Indicatori, sull'esercizio scelto e sul precedente.
//
// ⚠️ I valori si mostrano con la VIRGOLA decimale, che è anche ciò che il server legge senza
// ambiguità: «1,5» torna 1,5. Mostrarli col punto inviterebbe a riscriverli così, e «1.500»
// per il server è millecinquecento.
//
// ⚠️ Un derivato senza denominatore è «—», non zero; e un «di cui» oltre il totale non dà
// un 140%: il derivato non si calcola e la vista lo dice.

const NOMI: Record<string, string> = {
  pctForm: "Autorizzati formati",
  oreForm: "Ore di formazione per autorizzato",
  pctNuovi: "Nuovi autorizzati formati",
  pctMfa: "Accessi con autenticazione a più fattori",
  pctCif: "Dispositivi cifrati",
  pctCons: "Consensi documentati",
  pctOpp: "Opposizioni sui contatti",
};

const inCampo = (v: number | undefined) => (v === undefined ? null : String(v).replace(".", ","));

export function VistaIndicatori({ dati, cmd }: { dati: DatiGdpr; cmd: ComandiGdpr }) {
  const a = dati.anno;
  const c = dati.derivati.corrente;
  const p = dati.derivati.precedente;
  return (
    <div className="space-y-6">
      <Intro titolo={`Indicatori ${a}`}>
        I numeri che dimostrano che il sistema funziona, con l&apos;anno precedente accanto. L&apos;esercizio si cambia in alto.
      </Intro>

      {dati.catalogo.sezioni.map((s) => (
        <Card key={s.key} data-sezione-indicatori={s.key}>
          <CardHeader>
            <h3 className="text-[15px] font-semibold tracking-tight">
              {s.nome} <span className="text-[12px] font-normal text-muted-foreground">{s.riferimento}</span>
            </h3>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="hidden grid-cols-[1fr_9rem_9rem] gap-3 text-[12px] text-muted-foreground sm:grid">
              <span />
              <span>{a}</span>
              <span>{a - 1}</span>
            </div>
            {dati.catalogo.indicatori
              .filter((k) => k.sezioneKey === s.key)
              .map((k) => (
                <div key={k.key} className="grid items-start gap-3 sm:grid-cols-[1fr_9rem_9rem]">
                  <p className="pt-2 text-sm">
                    {k.nome} <span className="text-[12px] text-muted-foreground">{k.unita}</span>
                  </p>
                  <CampoTesto
                    id={`gdpr-kpi-${a}-${k.key}`}
                    etichetta={`${k.nome}, ${a}`}
                    etichettaNascosta
                    valore={inCampo(dati.misure.corrente[k.key])}
                    salva={cmd.misura(a, k.key)}
                  />
                  <CampoTesto
                    id={`gdpr-kpi-${a - 1}-${k.key}`}
                    etichetta={`${k.nome}, ${a - 1}`}
                    etichettaNascosta
                    valore={inCampo(dati.misure.precedente[k.key])}
                    salva={cmd.misura(a - 1, k.key)}
                  />
                </div>
              ))}
          </CardContent>
        </Card>
      ))}

      <Card data-derivati>
        <CardHeader>
          <h3 className="text-[15px] font-semibold tracking-tight">Indicatori derivati</h3>
        </CardHeader>
        <CardContent>
          <table className="w-full text-sm">
            <thead className="text-[12px] text-muted-foreground">
              <tr>
                <th className="text-left font-normal">Indicatore</th>
                <th className="w-28 text-right font-normal">{a}</th>
                <th className="w-28 text-right font-normal">{a - 1}</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {Object.keys(NOMI).map((key) => {
                const unita = key === "oreForm" ? " ore" : "%";
                const v = (m: typeof c) => m[key as keyof typeof c] as number | null;
                return (
                  <tr key={key}>
                    <td className="py-1.5">{NOMI[key]}</td>
                    <td className="text-right tabular-nums" data-derivato={key}>
                      {v(c) === null ? "—" : `${fmtNum(v(c), 1)}${unita}`}
                    </td>
                    <td className="text-right tabular-nums">{v(p) === null ? "—" : `${fmtNum(v(p), 1)}${unita}`}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {c.incoerenze.length > 0 && (
            <p role="alert" className="mt-3 text-[12px] text-destructive">
              Non calcolati per il {a}, perché la parte supera il totale: {c.incoerenze.map((k) => NOMI[k] ?? k).join(", ")}.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
