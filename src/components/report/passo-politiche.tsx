"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { setTopicManagementFieldAction } from "@/features/report/actions";
import type { CampoGestione } from "@/features/report/policies";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { CatalogoReport, ProgettoReport, StatoReport } from "./types";

// Passo 4 — Politiche e obiettivi: una scheda per ogni tema MATERIALE
// (schema GRI 3-3 / ESRS MDR: politica, azioni dell'esercizio, obiettivo).

export function PassoPolitiche({
  companyId, progetto, catalogo, stato,
}: {
  companyId: string;
  progetto: ProgettoReport;
  catalogo: CatalogoReport;
  stato: StatoReport;
}) {
  const router = useRouter();
  const [errore, setErrore] = useState<string | null>(null);
  const materiali = catalogo.temi.filter((t) => stato.materialita.materialKeys.includes(t.key));
  const gestionePer = new Map(stato.gestione.map((g) => [g.topicKey, g]));

  if (!materiali.length) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-sm text-muted-foreground">
          Le schede compaiono per i temi risultati materiali: completa prima la valutazione al passo 2.
        </CardContent>
      </Card>
    );
  }

  // ⚠️ UN CAMPO PER VOLTA. Qui prima si leggeva la riga da `gestionePer` — cioe' dalle
  // PROPS — le si fondeva sopra la modifica e la si rimandava tutta. Chi scriveva la
  // politica e passava subito alle azioni, prima che il rinfresco fosse atterrato, si
  // vedeva cancellare la politica appena salvata: le props portavano ancora il vuoto.
  //
  // E' la quarta volta che questo progetto incontra lo stesso difetto (quantita'
  // dell'energetico, impatto della materialita', contatto di riferimento). Il valore
  // precedente non lo deve conoscere il browser: il database non tocca le colonne che
  // nessuno ha nominato.
  async function salva(topicKey: string, campo: CampoGestione, valore: string) {
    setErrore(null);
    const esito = await setTopicManagementFieldAction(companyId, progetto.id, { topicKey, campo, valore });
    if (!esito.ok) return setErrore(esito.errore);
    router.refresh();
  }

  return (
    <div>
      <p className="mb-4 max-w-3xl text-sm text-muted-foreground">
        Per ciascun tema materiale servono tre cose: la politica adottata, le azioni concrete dell&apos;anno, l&apos;obiettivo che vi date.
      </p>
      {errore && <p role="alert" className="mb-3 text-sm text-destructive">{errore}</p>}
      {materiali.map((t) => {
        const g = gestionePer.get(t.key);
        return (
          <Card key={t.key} className="mb-4">
            <CardHeader className="flex-row items-baseline justify-between">
              <h2 className="text-[15px] font-semibold tracking-tight">{t.nome}</h2>
              <Badge variant="outline" className="font-mono">{t.key} · {t.riferimenti}</Badge>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 lg:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor={`pol-${t.key}`}>Politica o impegno formalizzato</Label>
                  <Textarea
                    id={`pol-${t.key}`}
                    className="min-h-20"
                    placeholder="Quale documento la contiene e cosa stabilisce"
                    defaultValue={g?.politica ?? ""}
                    onBlur={(e) => { if (e.target.value !== (g?.politica ?? "")) salva(t.key, "politica", e.target.value); }}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor={`azi-${t.key}`}>Azioni realizzate nell&apos;esercizio</Label>
                  <Textarea
                    id={`azi-${t.key}`}
                    className="min-h-20"
                    placeholder="Interventi, investimenti, iniziative concrete"
                    defaultValue={g?.azioni ?? ""}
                    onBlur={(e) => { if (e.target.value !== (g?.azioni ?? "")) salva(t.key, "azioni", e.target.value); }}
                  />
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-4">
                {(
                  [
                    ["target", "Obiettivo", "es. −20% consumi"],
                    ["annoBase", "Anno base", ""],
                    ["annoTarget", "Anno traguardo", ""],
                    ["responsabile", "Responsabile", ""],
                  ] as const
                ).map(([campo, label, placeholder]) => (
                  <div key={campo} className="space-y-1.5">
                    <Label htmlFor={`${campo}-${t.key}`}>{label}</Label>
                    <Input
                      id={`${campo}-${t.key}`}
                      placeholder={placeholder}
                      defaultValue={g?.[campo] ?? ""}
                      onBlur={(e) => { if (e.target.value !== (g?.[campo] ?? "")) salva(t.key, campo, e.target.value); }}
                    />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
