"use client";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import type { DatiGdpr } from "./comune";

// Vista 8 — Verifica: ciò che manca, sezione per sezione, con il collegamento al punto in
// cui si rimedia. È l'elenco da scorrere prima di pubblicare.

export function VistaVerifica({ dati, vai }: { dati: DatiGdpr; vai: (v: string) => void }) {
  const v = dati.verifica;
  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-lg font-semibold tracking-tight">Verifica prima della pubblicazione</h2>
        <p className="mt-1 max-w-3xl text-sm text-muted-foreground" data-verifica-esito>
          {v.aperte === 0
            ? "Niente da completare: il sistema è documentato in ogni sua parte."
            : `${v.aperte} elementi da completare, di cui ${v.criticita} critici.`}{" "}
          {v.dimostrabile
            ? "La conformità è dimostrabile."
            : "Finché restano criticità, la conformità non è dimostrabile davanti all'Autorità di controllo."}
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
