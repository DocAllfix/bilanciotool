"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { aggiornaAmbitoAction, aggiornaAssettoAction } from "@/features/nis2/actions";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CLASSE_NOME, DIMENSIONI, VIA_NOME, type DatiNis2 } from "./types";

// Vista 1 — Ambito e assetto.
//
// ⚠️ E' la prima cosa che si fa, e la piu' importante: da qui discendono gli obblighi che
// si applicano e il tetto delle sanzioni. Per questo la CLASSIFICAZIONE sta in cima, in
// evidenza, e porta scritto DA DOVE VIENE: un consulente che vede «Essenziale» senza
// sapere se e' per il settore o per un criterio specifico non puo' difenderlo davanti a
// nessuno.

const euro = (n: number) => (n >= 1_000_000 ? `${n / 1_000_000} milioni` : new Intl.NumberFormat("it-IT").format(n));

export function VistaAmbito({ companyId, dati }: { companyId: string; dati: DatiNis2 }) {
  const router = useRouter();
  const [, avvia] = useTransition();
  const p = dati.profilo;

  // ⚠️ Comandi OTTIMISTICI: tendine e caselle che il server non rivaluta devono rispondere
  // subito, altrimenti si leggono come rotti. Se il server rifiuta, si ripristina.
  const [settore, setSettore] = useState(p?.settore ?? "");
  const [dimensione, setDimensione] = useState(p?.dimensione ?? "");
  const [criteri, setCriteri] = useState<string[]>((p?.criteri as string[]) ?? []);

  const salva = (patch: Parameters<typeof aggiornaAmbitoAction>[1], ripristina: () => void) =>
    avvia(async () => {
      const esito = await aggiornaAmbitoAction(companyId, patch);
      if (!esito.ok) {
        ripristina();
        toast.error(esito.errore);
        return;
      }
      router.refresh();
    });

  const settori = [
    ...dati.allegati.primo.map((s) => ({ s, allegato: 1 })),
    ...dati.allegati.secondo.map((s) => ({ s, allegato: 2 })),
  ];

  const a = dati.ambito;

  return (
    <div className="mt-6 space-y-6">
      {/* ── L'esito, in cima ─────────────────────────────────────────────── */}
      <Card data-tour="nis2-classificazione">
        <CardHeader>
          <h2 className="text-[15px] font-semibold tracking-tight">Classificazione</h2>
          <p className="text-sm text-muted-foreground">
            Art. 3 del decreto: settore, dimensione e otto criteri che prescindono da entrambi.
          </p>
        </CardHeader>
        <CardContent>
          {a?.classe ? (
            <div className="flex flex-wrap items-center gap-3">
              <Badge
                variant={a.classe === "essenziale" ? "destructive" : a.classe === "importante" ? "default" : "secondary"}
                className="text-[13px]"
                data-slot="classe"
              >
                {CLASSE_NOME[a.classe]}
              </Badge>
              <span className="text-sm text-muted-foreground">{VIA_NOME[a.via] ?? a.via}</span>
            </div>
          ) : (
            // ⚠️ «Non determinata» NON e' «Fuori ambito»: la prima dice che da qui non si
            // conclude niente, la seconda e' una determinazione che si scrive in un
            // documento firmato. Confonderle farebbe dichiarare a un'azienda di essere
            // fuori dal decreto sulla base di una domanda a cui nessuno ha risposto.
            <div className="rounded-md border border-dashed p-3">
              <p className="text-sm font-medium">Classificazione non determinata</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {VIA_NOME[a?.via ?? ""] ?? "Compila settore e dimensione, oppure spunta un criterio specifico."}
                {" "}Non significa «fuori ambito»: significa che da questi elementi non discende ancora
                nessuna conclusione.
              </p>
            </div>
          )}

          {a?.sanzione && (
            <p className="mt-3 text-sm text-muted-foreground">
              Massimo edittale (art. 38): fino a <b>{euro(a.sanzione.massimo)} di euro</b> o al{" "}
              <b>{String(a.sanzione.percentuale).replace(".", ",")}%</b> del fatturato mondiale annuo, se
              superiore.
            </p>
          )}
        </CardContent>
      </Card>

      {/* ── Gli ingredienti ──────────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <h2 className="text-[15px] font-semibold tracking-tight">Settore e dimensione</h2>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="grid gap-1.5">
            <Label htmlFor="nis2-settore">Settore di attività</Label>
            <Select
              value={settore || undefined}
              onValueChange={(v) => {
                const prima = settore;
                setSettore(v);
                salva({ settore: v }, () => setSettore(prima));
              }}
            >
              <SelectTrigger id="nis2-settore" aria-label="Settore di attività">
                <SelectValue placeholder="Scegli il settore" />
              </SelectTrigger>
              <SelectContent>
                {settori.map(({ s, allegato }) => (
                  <SelectItem key={s} value={s}>
                    {s} · Allegato {allegato}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="nis2-dimensione">Parametro dimensionale</Label>
            <Select
              value={dimensione || undefined}
              onValueChange={(v) => {
                const prima = dimensione;
                setDimensione(v as typeof dimensione);
                salva({ dimensione: v as "micro" }, () => setDimensione(prima));
              }}
            >
              <SelectTrigger id="nis2-dimensione" aria-label="Parametro dimensionale">
                <SelectValue placeholder="Scegli la dimensione" />
              </SelectTrigger>
              <SelectContent>
                {DIMENSIONI.map((d) => (
                  <SelectItem key={d.v} value={d.v}>
                    {d.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Media impresa da 50 addetti o 10 milioni; grande da 250 addetti o 50 milioni di
              fatturato.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card data-tour="nis2-criteri">
        <CardHeader>
          <h2 className="text-[15px] font-semibold tracking-tight">
            Criteri indipendenti dalla dimensione
          </h2>
          <p className="text-sm text-muted-foreground">
            Se ne ricorre anche uno solo, l&apos;organizzazione rientra a prescindere dalle soglie.
            Fra due criteri prevale il più grave.
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          {dati.criteri.map((c) => {
            const scelto = criteri.includes(c.key);
            return (
              <label key={c.key} className="flex cursor-pointer items-start gap-3 text-sm">
                {/* ⚠️ Casella NATIVA, come negli altri moduli: il prodotto non ha un
                    primitivo `checkbox`, e introdurne uno per otto caselle vorrebbe dire
                    un nono componente da tenere allineato al tema. */}
                <input
                  type="checkbox"
                  className="mt-0.5"
                  checked={scelto}
                  aria-label={`${c.key.toUpperCase()}: ${c.testo}`}
                  onChange={() => {
                    const prima = criteri;
                    const dopo = scelto ? criteri.filter((k) => k !== c.key) : [...criteri, c.key];
                    setCriteri(dopo);
                    salva({ criteri: dopo as ("c1")[] }, () => setCriteri(prima));
                  }}
                />
                <span>
                  <span className="font-mono text-xs text-muted-foreground">{c.key.toUpperCase()}</span>{" "}
                  {c.testo}
                  <span className="ml-1.5 text-xs text-muted-foreground">
                    → {c.classe === "essenziale" ? "essenziale" : "importante"}
                  </span>
                </span>
              </label>
            );
          })}
        </CardContent>
      </Card>

      <Assetto companyId={companyId} dati={dati} />
    </div>
  );
}

function Assetto({ companyId, dati }: { companyId: string; dati: DatiNis2 }) {
  const router = useRouter();
  const p = dati.profilo;
  const [errore, setErrore] = useState<string | null>(null);
  const [, avvia] = useTransition();

  const campi = [
    { k: "organo", l: "Organo di amministrazione", v: p?.organo },
    { k: "responsabile", l: "Responsabile della sicurezza informatica", v: p?.responsabile },
    { k: "sostituto", l: "Sostituto", v: p?.sostituto },
    { k: "puntoContatto", l: "Punto di contatto con l'Autorità", v: p?.puntoContatto },
    { k: "contattoRecapito", l: "Recapito del punto di contatto", v: p?.contattoRecapito },
  ] as const;

  const date = [
    { k: "comunicazioneIl", l: "Comunicazione di inserimento nell'elenco", v: p?.comunicazioneIl },
    { k: "registrazioneIl", l: "Registrazione presso l'Autorità", v: p?.registrazioneIl },
  ] as const;

  // ⚠️ UN CAMPO PER VOLTA: il client non manda mai la riga intera. E' la quinta occorrenza
  // della regola piu' costosa di questo progetto.
  const salva = (campo: string, valore: string) =>
    avvia(async () => {
      setErrore(null);
      const esito = await aggiornaAssettoAction(companyId, { [campo]: valore || null });
      if (!esito.ok) return setErrore(esito.errore);
      router.refresh();
    });

  return (
    <Card data-tour="nis2-assetto">
      <CardHeader>
        <h2 className="text-[15px] font-semibold tracking-tight">Assetto di governance</h2>
        <p className="text-sm text-muted-foreground">
          L&apos;art. 23 attribuisce all&apos;organo di amministrazione l&apos;approvazione delle
          misure e la responsabilità per la loro violazione.
        </p>
      </CardHeader>
      <CardContent className="grid gap-4 sm:grid-cols-2">
        {campi.map((c) => (
          <div key={c.k} className="grid gap-1.5">
            <Label htmlFor={`nis2-${c.k}`}>{c.l}</Label>
            <Input
              id={`nis2-${c.k}`}
              defaultValue={c.v ?? ""}
              onBlur={(e) => e.target.value !== (c.v ?? "") && salva(c.k, e.target.value)}
            />
          </div>
        ))}
        {date.map((c) => (
          <div key={c.k} className="grid gap-1.5">
            <Label htmlFor={`nis2-${c.k}`}>{c.l}</Label>
            <Input
              id={`nis2-${c.k}`}
              type="date"
              defaultValue={c.v ?? ""}
              onBlur={(e) => e.target.value !== (c.v ?? "") && salva(c.k, e.target.value)}
            />
            {c.k === "comunicazioneIl" && (
              <p className="text-xs text-muted-foreground">
                Da qui decorrono i nove mesi per gli obblighi di notifica e i diciotto per le misure.
              </p>
            )}
          </div>
        ))}
        {errore && (
          <p role="alert" className="text-sm text-destructive sm:col-span-2">
            {errore}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

