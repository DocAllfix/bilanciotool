"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { listSnapshotsAction, publishDocumentAction, type SnapshotRiga } from "@/features/documents/actions";
import { DOCUMENTI, etichettaDocumento, type TipoDocumento } from "@/features/documents/tipi";
import { fmtData } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { BookOpenCheck, ExternalLink } from "lucide-react";

// Passo finale di entrambi i percorsi: pubblicazione con snapshot immutabile.
// Ogni pubblicazione è una NUOVA versione; le precedenti restano consultabili.

export function PannelloPubblicazione({
  companyId, tipo, anno, readyPct,
}: {
  companyId: string;
  tipo: TipoDocumento;
  anno: number;
  readyPct: number;
}) {
  const [versioni, setVersioni] = useState<SnapshotRiga[] | null>(null);
  const [errore, setErrore] = useState<string | null>(null);
  const [inCorso, setInCorso] = useState(false);

  const carica = async () => {
    const esito = await listSnapshotsAction(companyId);
    if (esito.ok) setVersioni(esito.dati!.filter((v) => v.tipo === tipo && v.anno === anno));
    else setErrore(esito.errore);
  };
  useEffect(() => {
    carica();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyId, tipo, anno]);

  async function pubblica() {
    setErrore(null);
    setInCorso(true);
    const esito = await publishDocumentAction(companyId, tipo, anno);
    setInCorso(false);
    if (!esito.ok) return setErrore(esito.errore);
    await carica();
    window.open(`/documento/${esito.dati!.snapshotId}`, "_blank");
  }

  const nome = DOCUMENTI[tipo].nome;

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <h2 className="text-[15px] font-semibold tracking-tight">Pubblica il documento</h2>
          <p className="text-sm text-muted-foreground">
            La pubblicazione <b>congela</b> tutti i dati e i calcoli in una versione immutabile: le modifiche successive al percorso
            non toccano ciò che è stato pubblicato. Ripubblicare crea la versione successiva.
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          {readyPct < 60 && (
            <div className="rounded-lg border border-warning/40 bg-warning-subtle px-4 py-3 text-sm">
              Completamento al {readyPct}%: puoi comunque pubblicare una bozza, ma il documento mostrerà le sezioni mancanti.
            </div>
          )}
          {errore && <p role="alert" className="text-sm text-destructive">{errore}</p>}
          <Button onClick={pubblica} disabled={inCorso} data-tour="pubblica-documento">
            <BookOpenCheck className="size-4" /> {inCorso ? "Pubblicazione…" : `Pubblica ${etichettaDocumento(tipo, anno)}`}
          </Button>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <h2 className="text-[15px] font-semibold tracking-tight">Versioni pubblicate</h2>
        </CardHeader>
        <CardContent>
          {versioni === null ? (
            <p className="text-sm text-muted-foreground">Caricamento…</p>
          ) : versioni.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nessuna versione ancora pubblicata per il {anno}.</p>
          ) : (
            <ul className="divide-y">
              {versioni.map((v) => (
                <li key={v.id} className="flex items-center gap-3 py-2.5">
                  <Badge variant="outline" data-slot="kpi">v{v.versione}</Badge>
                  <span className="text-sm">{fmtData(v.publishedAt)}</span>
                  {v.haPdf && <Badge variant="secondary">PDF generato</Badge>}
                  <Button variant="outline" size="sm" className="ml-auto" asChild>
                    <Link href={`/documento/${v.id}`} target="_blank">
                      <ExternalLink className="size-3.5" /> Apri
                    </Link>
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
