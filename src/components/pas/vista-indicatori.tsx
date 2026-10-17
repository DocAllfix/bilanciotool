"use client";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { CampoTesto } from "@/components/comune/campo";
import { Intro } from "@/components/comune/percorso";
import { fmtNum } from "@/lib/format";
import { DERIVATI } from "@/lib/calc/pas/indicatori";
import { NOMI_DERIVATI } from "@/features/pas/documento";
import type { ComandiPas, DatiPas } from "./comune";

// Indicatori, sull'esercizio scelto e sul precedente.
//
// ⚠️ I valori si mostrano con la VIRGOLA decimale, che è anche ciò che il server legge senza
// ambiguità: «1,5» torna 1,5. Mostrarli col punto inviterebbe a riscriverli così, e «1.500»
// per il server è millecinquecento.
//
// ⚠️ Un derivato senza TUTTI i suoi ingressi è «—», non zero e non cento: il prototipo,
// senza la retribuzione delle donne, dava un divario retributivo del 100%.

const inCampo = (v: number | null | undefined) => (v === undefined || v === null ? null : String(v).replace(".", ","));
const decimali = (k: string) => DERIVATI.find((x) => x.key === k)?.decimali ?? 1;

export function VistaIndicatori({ dati, cmd }: { dati: DatiPas; cmd: ComandiPas }) {
  const a = dati.anno;
  const c = dati.derivati.corrente;
  const p = dati.derivati.precedente;
  const nome = (k: string) => dati.catalogo.indicatori.find((x) => x.key === k)?.nome ?? k;
  return (
    <div className="space-y-6">
      <Intro titolo={`Indicatori ${a}`}>
        I numeri della prestazione sociale, con l&apos;anno precedente accanto. L&apos;esercizio si cambia in alto. Un campo
        vuoto non vale zero: resta un dato che manca.
      </Intro>

      {dati.oltreTotale.length > 0 && (
        <p role="alert" className="text-sm text-destructive" data-oltre-totale>
          Una parte supera il suo totale: {dati.oltreTotale.map(nome).join(", ")}. Gli indicatori che ne dipendono non si
          calcolano finché i dati non tornano coerenti.
        </p>
      )}

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
                    {k.aiuto ? <span className="block text-[12px] text-muted-foreground">{k.aiuto}</span> : null}
                  </p>
                  <CampoTesto
                    id={`pas-kpi-${a}-${k.key}`}
                    etichetta={`${k.nome}, ${a}`}
                    etichettaNascosta
                    valore={inCampo(dati.misure.corrente[k.key])}
                    salva={cmd.misura(a, k.key)}
                  />
                  <CampoTesto
                    id={`pas-kpi-${a - 1}-${k.key}`}
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
          <h3 className="text-[15px] font-semibold tracking-tight">Indicatori calcolati</h3>
          <p className="text-sm text-muted-foreground">
            Si calcolano da soli, solo quando ci sono tutti i dati da cui si ricavano. Le settimane lavorate e il limite
            d&apos;orario vengono dalle soglie dell&apos;organizzazione.
          </p>
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
              {DERIVATI.map(({ key }) => {
                const valore = (m: typeof c) => m[key];
                // ⚠️ L'unità sta accanto al NOME, non al numero: «25,03 per 10⁶ ore» in una
                // colonna stretta toccava la colonna accanto, e si leggeva «ore25,00». È la forma
                // che usa anche il documento.
                const testo = (v: number | null) => (v === null ? "—" : fmtNum(v, decimali(key)));
                return (
                  <tr key={key}>
                    <td className="py-1.5">
                      {NOMI_DERIVATI[key].nome} <span className="text-[12px] text-muted-foreground">{NOMI_DERIVATI[key].unita}</span>
                    </td>
                    <td className="text-right tabular-nums" data-derivato={key}>
                      {testo(valore(c))}
                    </td>
                    <td className="text-right tabular-nums">{testo(valore(p))}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
