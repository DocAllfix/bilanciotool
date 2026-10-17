"use client";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { CampoTesto } from "@/components/comune/campo";
import { CampoParametro, Intro } from "@/components/comune/percorso";
import { PARAMETRI } from "@/features/pas/validation";
import type { ComandiPas, DatiPas } from "./comune";

// Organizzazione, campo di applicazione e ruoli, con le soglie con cui si leggono i dati.
//
// ⚠️ Il campo di applicazione (4.3) deve comprendere anche i lavoratori somministrati e gli
// appaltatori che operano nei siti: un sistema che li lascia fuori non copre l'Allegato A, e
// l'ente di certificazione lo chiede per primo.

const ANAGRAFICA = [
  ["forma", "Forma giuridica"],
  ["piva", "Partita IVA"],
  ["sede", "Sede legale"],
  ["settore", "Attività"],
  ["ateco", "Codice ATECO"],
  ["ccnl", "Contratto collettivo applicato"],
] as const;

const RUOLI = [
  ["direzione", "Alta direzione", "Chi risponde dell'efficacia del sistema e assegna le risorse."],
  ["responsabile", "Responsabile del sistema (5.3)", "Chi ne cura l'attuazione e riferisce alla direzione."],
  ["rappresentanti", "Rappresentanti dei lavoratori (5.4)", "Eletti o designati: partecipano alle decisioni sul sistema."],
  ["contatto", "Contatto per le parti interessate", "Dove scrivere per reclami e informazioni."],
] as const;

const SOGLIE: { campo: keyof typeof PARAMETRI; etichetta: string }[] = [
  { campo: "paramOreOrdinarie", etichetta: "Orario ordinario settimanale (ore)" },
  { campo: "paramOreTotali", etichetta: "Limite settimanale complessivo (ore)" },
  { campo: "paramSettimane", etichetta: "Settimane lavorate nell'anno" },
  { campo: "paramAlto", etichetta: "Rischio alto da (P × G)" },
  { campo: "paramMedio", etichetta: "Rischio medio da (P × G)" },
  { campo: "paramGiorniReclamo", etichetta: "Sollecitare un reclamo aperto dopo (giorni)" },
];

export function VistaOrganizzazione({ dati, cmd }: { dati: DatiPas; cmd: ComandiPas }) {
  const s = dati.sistema;
  const id = (c: string) => `pas-org-${c}`;
  return (
    <div className="space-y-6">
      <Intro titolo="Organizzazione e campo di applicazione">
        Chi è l&apos;organizzazione, fin dove arriva il sistema e chi ne risponde. Ogni campo si salva quando lo lasci.
      </Intro>

      <Card>
        <CardHeader>
          <h3 className="text-[15px] font-semibold tracking-tight">L&apos;organizzazione</h3>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          {ANAGRAFICA.map(([c, e]) => (
            <CampoTesto key={c} id={id(c)} etichetta={e} valore={s[c]} salva={cmd.sistema(c)} />
          ))}
          <div className="sm:col-span-2">
            <CampoTesto id={id("siti")} etichetta="Siti inclusi" valore={s.siti} multiriga salva={cmd.sistema("siti")} />
          </div>
          <div className="sm:col-span-2" data-tour="pas-campo">
            <CampoTesto
              id={id("campo")}
              etichetta="Campo di applicazione (4.3)"
              valore={s.campo}
              multiriga
              aiuto="Comprende anche i lavoratori somministrati e gli appaltatori che operano nei siti."
              salva={cmd.sistema("campo")}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <h3 className="text-[15px] font-semibold tracking-tight">Ruoli</h3>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          {RUOLI.map(([c, e, a]) => (
            <CampoTesto key={c} id={id(c)} etichetta={e} valore={s[c]} aiuto={a} salva={cmd.sistema(c)} />
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <h3 className="text-[15px] font-semibold tracking-tight">Soglie con cui si leggono i dati</h3>
          <p className="text-sm text-muted-foreground">
            Quelle della PAS 24000 come punto di partenza: si stringono se la legge o il contratto collettivo sono più
            restrittivi. Il limite complessivo non può stare sotto l&apos;orario ordinario, e il rischio alto deve superare il
            medio.
          </p>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-3">
          {SOGLIE.map(({ campo, etichetta }) => (
            <CampoParametro
              key={campo}
              id={id(campo)}
              etichetta={etichetta}
              valore={s[campo]}
              min={PARAMETRI[campo][0]}
              max={PARAMETRI[campo][1]}
              salva={(v) => cmd.parametro(campo, v)}
            />
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
