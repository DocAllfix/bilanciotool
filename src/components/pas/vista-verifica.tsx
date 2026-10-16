"use client";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import type { DatiPas } from "./comune";

// Verifica: ciò che manca, sezione per sezione, con il collegamento al punto in cui si
// rimedia. È l'elenco da scorrere prima di pubblicare e prima della visita dell'ente.

export function VistaVerifica({ dati, vai }: { dati: DatiPas; vai: (v: string) => void }) {
  const v = dati.verifica;
  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-lg font-semibold tracking-tight">Verifica prima della pubblicazione</h2>
        <p className="mt-1 max-w-3xl text-sm text-muted-foreground" data-verifica-esito>
          {v.aperte === 0
            ? "Niente da completare: il sistema è documentato in ogni sua parte."
            : `${v.aperte} ${v.aperte === 1 ? "elemento da completare" : "elementi da completare"}, di cui ${v.criticita} ${v.criticita === 1 ? "critico" : "critici"}.`}{" "}
          {v.presentabile
            ? "Il sistema è presentabile all'audit di certificazione."
            : "Finché restano criticità, requisiti da valutare o non conformi, il sistema non è pronto per l'audit di certificazione."}
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {v.sezioni.map((s) => (
          <Card key={s.titolo} data-sezione-verifica={s.vista}>
            <CardHeader>
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-[15px] font-semibold tracking-tight">{s.titolo}</h3>
                <span className="text-[12px] tabular-nums text-muted-foreground">{s.voci.length ? `${s.voci.length} da completare` : "completa"}</span>
              </div>
            </CardHeader>
            <CardContent>
              {s.voci.length === 0 ? (
                <p className="text-sm text-muted-foreground">Niente da completare.</p>
              ) : (
                <>
                  <ul className="list-disc space-y-1 pl-5 text-sm">
                    {s.voci.map((x, i) => (
                      <li key={i}>{x}</li>
                    ))}
                  </ul>
                  <button className="mt-3 text-[12px] text-primary underline-offset-4 hover:underline" onClick={() => vai(s.vista)}>
                    Vai a completare
                  </button>
                </>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
