"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createDeclarationAction } from "@/features/soa/actions";
import { ETICHETTA_RUOLO_CLOUD, ETICHETTA_RUOLO_PRIVACY, RUOLI_CLOUD, RUOLI_PRIVACY } from "@/features/soa/validation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus } from "lucide-react";

export function CreaDichiarazione({ companyId }: { companyId: string }) {
  const router = useRouter();
  const [errore, setErrore] = useState<string | null>(null);
  const [inCorso, setInCorso] = useState(false);
  const [privacy, setPrivacy] = useState<string>("titolare");
  const [cloud, setCloud] = useState<string>("cliente");

  async function crea(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrore(null);
    setInCorso(true);
    const soglia = Number(new FormData(e.currentTarget).get("soglia"));
    const esito = await createDeclarationAction({
      companyId,
      sogliaObiettivo: soglia,
      ruoloPrivacy: privacy as "titolare",
      ruoloCloud: cloud as "cliente",
    });
    setInCorso(false);
    if (!esito.ok) return setErrore(esito.errore);
    router.push(`/aziende/${companyId}/soa`);
    router.refresh();
  }

  return (
    <div className="mt-6">
      <Card>
        <CardHeader>
          <h2 className="text-[15px] font-semibold tracking-tight">Nuovo Statement of Applicability</h2>
          <p className="text-sm text-muted-foreground">
            I 93 controlli dell&apos;Allegato A della ISO/IEC 27001 sono sempre in ambito. I moduli estesi
            (27017 cloud, 27018 dati personali in cloud, 27701 privacy) si attivano dopo, in base al profilo
            dell&apos;organizzazione.
          </p>
        </CardHeader>
        <CardContent>
          <form method="post" onSubmit={crea} className="grid gap-4">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div>
                <Label htmlFor="soa-crea-privacy">Ruolo nel trattamento dei dati personali</Label>
                <Select value={privacy} onValueChange={setPrivacy}>
                  <SelectTrigger id="soa-crea-privacy" className="mt-1.5 w-full" aria-label="Ruolo nel trattamento dei dati personali">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {RUOLI_PRIVACY.map((r) => <SelectItem key={r} value={r}>{ETICHETTA_RUOLO_PRIVACY[r]}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="soa-crea-cloud">Posizione rispetto ai servizi cloud</Label>
                <Select value={cloud} onValueChange={setCloud}>
                  <SelectTrigger id="soa-crea-cloud" className="mt-1.5 w-full" aria-label="Posizione rispetto ai servizi cloud">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {RUOLI_CLOUD.map((r) => <SelectItem key={r} value={r}>{ETICHETTA_RUOLO_CLOUD[r]}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="soa-crea-soglia">Obiettivo di maturità</Label>
                <Input
                  id="soa-crea-soglia"
                  name="soglia"
                  type="number"
                  defaultValue={80}
                  min={0}
                  max={100}
                  className="mt-1.5 w-28"
                  data-slot="kpi"
                />
              </div>
            </div>
            <div>
              <Button type="submit" disabled={inCorso}>
                <Plus className="size-4" /> Avvia la Dichiarazione
              </Button>
            </div>
          </form>
          {errore && <p role="alert" className="mt-3 text-sm text-destructive">{errore}</p>}
        </CardContent>
      </Card>
    </div>
  );
}
