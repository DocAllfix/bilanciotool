"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BottoneElimina } from "@/components/comune/bottone-elimina";

// I pezzi d'interfaccia comuni ai percorsi costruiti sullo stampo del GDPR.
//
// ⚠️ Nati nel GDPR e serviti identici al sistema di gestione sociale (PAS 24000): la
// seconda volta che la stessa astrazione nasce le si dà una casa. Spostati SENZA cambiarli:
// identificativi, nomi accessibili e comportamento al rifiuto sono quelli che i collaudi del
// GDPR già verificano.

export type Esito = { ok: true } | { ok: false; errore: string };

/** Il blocco che spiega che cosa una vista chiede, sotto il titolo. */
export function Intro({ titolo, children }: { titolo: string; children: React.ReactNode }) {
  return (
    <div className="mb-4">
      <h2 className="font-display text-lg font-semibold tracking-tight">{titolo}</h2>
      <p className="mt-1 max-w-3xl text-sm text-muted-foreground">{children}</p>
    </div>
  );
}

export const pct = (v: number | null) => (v === null ? "—" : `${String(v).replace(".", ",")}%`);

/** «1 attenzione», «2 attenzioni»: il plurale italiano non si fa attaccando lettere in coda. */
export const pl = (n: number, uno: string, molti: string) => `${n} ${n === 1 ? uno : molti}`;

/** Una casella che salva al clic, ottimistica: mostra subito e ripristina se il server rifiuta. */
export function CampoCasella({
  id,
  etichetta,
  valore,
  salva,
}: {
  id: string;
  etichetta: string;
  valore: boolean;
  salva: (v: boolean) => Promise<Esito>;
}) {
  const [acceso, setAcceso] = useState(valore);
  const [errore, setErrore] = useState<string | null>(null);
  return (
    <div>
      <label htmlFor={id} className="flex cursor-pointer items-start gap-2 text-sm">
        <input
          id={id}
          type="checkbox"
          className="mt-0.5 size-4 accent-primary"
          checked={acceso}
          onChange={async (e) => {
            const nuovo = e.currentTarget.checked;
            setAcceso(nuovo);
            setErrore(null);
            const esito = await salva(nuovo);
            if (!esito.ok) {
              setAcceso(!nuovo);
              setErrore(esito.errore);
            }
          }}
        />
        <span>{etichetta}</span>
      </label>
      {errore && (
        <p className="text-[12px] text-destructive" role="alert">
          {errore}
        </p>
      )}
    </div>
  );
}

/** Una scala da 1 a 5 col nome di ogni gradino: «3 · Possibile», non «3». */
export function SceltaScala({
  id,
  etichetta,
  valore,
  voci,
  salva,
}: {
  id: string;
  etichetta: string;
  valore: number | null;
  voci: { valore: number; nome: string; descrizione: string }[];
  salva: (v: unknown) => Promise<Esito>;
}) {
  const [scelto, setScelto] = useState(valore === null ? "" : String(valore));
  const [errore, setErrore] = useState<string | null>(null);
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{etichetta}</Label>
      <select
        id={id}
        className="h-9 w-full rounded-md border bg-background px-2 text-sm"
        value={scelto}
        onChange={async (e) => {
          const v = e.currentTarget.value;
          const prima = scelto;
          setScelto(v);
          setErrore(null);
          const esito = await salva(v);
          if (!esito.ok) {
            setScelto(prima);
            setErrore(esito.errore);
          }
        }}
      >
        <option value="">—</option>
        {voci.map((x) => (
          <option key={x.valore} value={String(x.valore)} title={x.descrizione}>
            {x.valore} · {x.nome}
          </option>
        ))}
      </select>
      {errore && (
        <p className="text-[12px] text-destructive" role="alert">
          {errore}
        </p>
      )}
    </div>
  );
}

const MESI = ["Gennaio", "Febbraio", "Marzo", "Aprile", "Maggio", "Giugno", "Luglio", "Agosto", "Settembre", "Ottobre", "Novembre", "Dicembre"];

export function SceltaMese({ id, etichetta, valore, salva }: { id: string; etichetta: string; valore: number; salva: (v: unknown) => Promise<Esito> }) {
  const [scelto, setScelto] = useState(String(valore));
  const [errore, setErrore] = useState<string | null>(null);
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="sr-only">
        {etichetta}
      </Label>
      <span aria-hidden className="block text-sm font-medium">
        Mese
      </span>
      <select
        id={id}
        className="h-9 w-full rounded-md border bg-background px-2 text-sm"
        value={scelto}
        onChange={async (e) => {
          const v = e.currentTarget.value;
          const prima = scelto;
          setScelto(v);
          setErrore(null);
          const esito = await salva(v);
          if (!esito.ok) {
            setScelto(prima);
            setErrore(esito.errore);
          }
        }}
      >
        {MESI.map((m, i) => (
          <option key={m} value={String(i + 1)}>
            {m}
          </option>
        ))}
      </select>
      {errore && (
        <p className="text-[12px] text-destructive" role="alert">
          {errore}
        </p>
      )}
    </div>
  );
}

/** Una soglia numerica intera: salva sfocandosi, e se il server rifiuta torna al valore salvato. */
export function CampoParametro({
  id,
  etichetta,
  valore,
  min,
  max,
  salva,
}: {
  id: string;
  etichetta: string;
  valore: number;
  min: number;
  max: number;
  salva: (v: number) => Promise<{ ok: boolean; errore?: string }>;
}) {
  const [errore, setErrore] = useState<string | null>(null);
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{etichetta}</Label>
      <Input
        id={id}
        type="number"
        min={min}
        max={max}
        defaultValue={valore}
        aria-invalid={errore ? true : undefined}
        onBlur={async (e) => {
          const campo = e.currentTarget;
          const v = Number(campo.value);
          if (v === valore) return;
          setErrore(null);
          const esito = await salva(v);
          if (!esito.ok) {
            setErrore(esito.errore ?? "Valore non accettato");
            campo.value = String(valore);
          }
        }}
      />
      {errore && (
        <p className="text-[12px] text-destructive" role="alert">
          {errore}
        </p>
      )}
    </div>
  );
}

/** Una registrazione di un registro: riga riassuntiva che si apre sui campi. */
export function RigaRegistro({
  id,
  aperto,
  titolo,
  sotto,
  stato,
  elimina,
  nome,
  children,
}: {
  id: string;
  aperto: boolean;
  titolo: string;
  sotto: string;
  stato?: { n: string; v: "destructive" | "secondary" | "outline" } | null;
  elimina: () => Promise<unknown>;
  nome: string;
  children: React.ReactNode;
}) {
  return (
    <details className="rounded-lg border bg-card" open={aperto || undefined} data-riga={id}>
      <summary className="flex cursor-pointer list-none flex-wrap items-center gap-x-3 gap-y-1 px-4 py-3">
        <span className="min-w-0 flex-1 truncate font-medium">{titolo}</span>
        <span className="text-[12px] text-muted-foreground">{sotto}</span>
        {stato && (
          <Badge variant={stato.v} data-termine={stato.n}>
            {stato.n}
          </Badge>
        )}
      </summary>
      <Card className="rounded-t-none border-0 border-t shadow-none">
        <CardContent className="grid gap-4 pt-4 sm:grid-cols-2">
          {children}
          <div className="flex justify-end sm:col-span-2">
            <BottoneElimina
              etichetta={`Elimina ${nome}`}
              titolo={`Eliminare ${nome}?`}
              descrizione="La registrazione esce dal registro. I documenti già pubblicati non cambiano."
              onConferma={elimina}
            />
          </div>
        </CardContent>
      </Card>
    </details>
  );
}
