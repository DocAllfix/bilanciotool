"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";

import { creaAutovalutazioneAction, creaSistemaNis2Action } from "@/features/nis2/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

// L'apertura di uno dei due percorsi NIS2.
//
// ⚠️ Dice a chiare lettere che il profilo e le risposte sono CONDIVISI. Chi apre il secondo
// percorso dopo aver compilato il primo si aspetterebbe di ricominciare da capo, e non
// dirglielo lo porterebbe a rispondere due volte alle stesse 124 domande — che e' il lavoro
// che questa architettura esiste per risparmiargli.

export function CreaPercorsoNis2({
  companyId,
  quale,
  aziendaNome,
}: {
  companyId: string;
  quale: "nis2" | "sgnis2";
  aziendaNome: string;
}) {
  const router = useRouter();
  const [errore, setErrore] = useState<string | null>(null);
  const [inCorso, setInCorso] = useState(false);

  const autovalutazione = quale === "nis2";

  async function apri() {
    setErrore(null);
    setInCorso(true);
    const esito = autovalutazione
      ? await creaAutovalutazioneAction(companyId)
      : await creaSistemaNis2Action(companyId);
    setInCorso(false);
    if (!esito.ok) return setErrore(esito.errore);
    router.refresh();
  }

  return (
    <div className="mx-auto w-full max-w-3xl">
      <h1 className="font-display text-2xl font-semibold tracking-tight">{aziendaNome}</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        {autovalutazione
          ? "Verifica del livello di conformità · D.Lgs. 138/2024 (NIS2)"
          : "Sistema di gestione per la sicurezza informatica · D.Lgs. 138/2024 (NIS2)"}
      </p>

      <Card className="mt-6">
        <CardHeader>
          <h2 className="text-[15px] font-semibold tracking-tight">
            {autovalutazione ? "Nuova autovalutazione NIS2" : "Nuovo sistema di gestione NIS2"}
          </h2>
          <p className="text-sm text-muted-foreground">
            {autovalutazione
              ? "Si comincia dall'ambito: settore, dimensione e otto criteri che prescindono da entrambi decidono se l'organizzazione rientra e a quale titolo. Poi 124 requisiti su 12 capi, valutati su una scala 0÷4."
              : "Oltre alla verifica di conformità, il sistema porta 68 controlli con la loro frequenza di riverifica, una roadmap in cinque fasi, lo scadenzario degli adempimenti e 19 indicatori."}
          </p>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">
            <b className="text-foreground">Le risposte sono condivise fra i due percorsi.</b>{" "}
            {autovalutazione
              ? "Se aprirai anche il Sistema di gestione NIS2, le valutazioni fatte qui saranno già là: i requisiti sono gli stessi e la risposta è una sola."
              : "Se hai già compilato l'Autovalutazione, le valutazioni sono già qui. Qui i requisiti sono 126: due riguardano solo il sistema di gestione."}
          </div>

          <Button onClick={apri} disabled={inCorso} className="mt-4">
            <Plus className="size-4" />
            {inCorso ? "Apertura…" : autovalutazione ? "Apri l'autovalutazione" : "Apri il sistema di gestione"}
          </Button>
          {errore && (
            <p role="alert" className="mt-3 text-sm text-destructive">
              {errore}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
