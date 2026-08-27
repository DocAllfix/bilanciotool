"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { creaProgrammaAction } from "@/features/sgesg/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus } from "lucide-react";

const STANDARD = [
  { v: "ESRS", n: "ESRS (VSME)", d: "Lo standard europeo, nella versione per le imprese non quotate." },
  { v: "GRI", n: "GRI", d: "Lo standard internazionale, il piu' diffuso fuori dall'Unione." },
  { v: "ENTRAMBI", n: "Entrambi", d: "Il documento portera' due indici dei contenuti." },
] as const;

export function CreaProgrammaEsg({ companyId }: { companyId: string }) {
  const router = useRouter();
  const annoScorso = new Date().getFullYear() - 1;
  const [standard, setStandard] = useState<"GRI" | "ESRS" | "ENTRAMBI">("ESRS");
  const [errore, setErrore] = useState<string | null>(null);
  const [inCorso, setInCorso] = useState(false);

  async function crea(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrore(null);
    setInCorso(true);
    const anno = Number(new FormData(e.currentTarget).get("anno"));
    const esito = await creaProgrammaAction(companyId, anno, standard);
    setInCorso(false);
    if (!esito.ok) return setErrore(esito.errore);
    // ⚠️ Dopo aver creato qualcosa si NAVIGA verso quel qualcosa: sul portafoglio il
    // refresh da solo non basta mai, ed e' anche la cosa giusta — chi crea un programma
    // vuole aprirlo.
    router.push(`/aziende/${companyId}/sgesg/${anno}`);
    router.refresh();
  }

  return (
    <div className="mt-6">
      <Card>
        <CardHeader>
          <h2 className="text-[15px] font-semibold tracking-tight">Nuovo programma ESG</h2>
          <p className="text-sm text-muted-foreground">
            Le otto fasi del metodo, dall&apos;acquisizione dell&apos;incarico al follow-up a tre mesi. Ogni fase
            si apre, si lascia a metà e si riprende: l&apos;avanzamento è contato sulle fasi concluse.
          </p>
        </CardHeader>
        <CardContent>
          <form method="post" onSubmit={crea} className="space-y-5">
            <div className="max-w-40 space-y-1.5">
              <Label htmlFor="cp-anno">Esercizio</Label>
              <Input
                id="cp-anno"
                name="anno"
                type="number"
                min={2000}
                max={2100}
                defaultValue={annoScorso}
                required
              />
              <p className="text-[12px] text-muted-foreground">
                L&apos;anno rendicontato, non quello in cui si lavora.
              </p>
            </div>

            <fieldset className="space-y-2">
              <legend className="text-sm font-medium">Standard di rendicontazione</legend>
              {/* ⚠️ Si sceglie ORA e non dopo: decide quale indice dei contenuti il
                  documento finale dovrà portare e quali schede della fase di redazione
                  hanno senso. Resta modificabile finché il lavoro è aperto. */}
              <div className="grid gap-2 sm:grid-cols-3">
                {STANDARD.map((s) => (
                  <button
                    key={s.v}
                    type="button"
                    data-standard={s.v}
                    aria-pressed={standard === s.v}
                    onClick={() => setStandard(s.v)}
                    className={
                      "rounded-lg border p-3 text-left transition-colors " +
                      (standard === s.v
                        ? "border-area-ecosostenibilita bg-area-ecosostenibilita/10"
                        : "hover:bg-accent")
                    }
                  >
                    <span className="block text-[14px] font-semibold tracking-tight">{s.n}</span>
                    <span className="mt-0.5 block text-[12px] leading-relaxed text-muted-foreground">{s.d}</span>
                  </button>
                ))}
              </div>
            </fieldset>

            <div className="flex items-center gap-3">
              <Button type="submit" disabled={inCorso}>
                <Plus className="size-4" aria-hidden />
                {inCorso ? "Creazione…" : "Crea programma"}
              </Button>
              {errore && (
                <p className="text-[13px] text-destructive" role="alert">
                  {errore}
                </p>
              )}
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
