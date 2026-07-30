import type { Metadata } from "next";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Plus } from "lucide-react";

export const metadata: Metadata = { title: "Portafoglio" };

// FASE 3: dati finti per definire il registro visivo del portafoglio.
// Il wiring ai dati reali arriva in Fase 5 (frontend GHG).
const MOCK = [
  { nome: "Meccanica Adriatica S.r.l.", settore: "Componenti meccanici", sede: "Bari", anno: 2025, completamento: 78, tco2e: "412,6", temi: 7, stato: "In lavorazione" },
  { nome: "Cartiera del Sele S.p.A.", settore: "Carta e cartone", sede: "Salerno", anno: 2025, completamento: 100, tco2e: "1.208,3", temi: 9, stato: "Pubblicato" },
  { nome: "Ortofrutta Ionica Soc. Agr.", settore: "Agroalimentare", sede: "Taranto", anno: 2025, completamento: 24, tco2e: "—", temi: 3, stato: "Avviato" },
];

export default function DashboardPage() {
  return (
    <div className="mx-auto w-full max-w-6xl">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Portafoglio</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {MOCK.length} aziende in gestione · esercizio 2025
          </p>
        </div>
        <Button data-tour="nuova-azienda">
          <Plus className="size-4" /> Nuova azienda
        </Button>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {MOCK.map((a) => (
          <Card key={a.nome} className="group transition-shadow hover:shadow-md">
            <CardHeader>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="truncate text-[15px] font-semibold tracking-tight">{a.nome}</h2>
                  <p className="mt-0.5 truncate text-xs text-muted-foreground">
                    {a.settore} · {a.sede}
                  </p>
                </div>
                <Badge variant={a.completamento === 100 ? "default" : "secondary"} className="shrink-0">
                  {a.stato}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="mb-1.5 flex items-baseline justify-between text-xs">
                  <span className="text-muted-foreground">Completamento</span>
                  <span className="font-medium" data-slot="kpi">{a.completamento}%</span>
                </div>
                <Progress value={a.completamento} aria-label={`Completamento ${a.completamento}%`} />
              </div>
              <dl className="grid grid-cols-2 gap-3 border-t pt-3">
                <div>
                  <dt className="text-[11px] uppercase tracking-wide text-muted-foreground">tCO₂e</dt>
                  <dd className="mt-0.5 text-lg font-semibold tracking-tight" data-slot="kpi">{a.tco2e}</dd>
                </div>
                <div>
                  <dt className="text-[11px] uppercase tracking-wide text-muted-foreground">Temi materiali</dt>
                  <dd className="mt-0.5 text-lg font-semibold tracking-tight" data-slot="kpi">{a.temi}</dd>
                </div>
              </dl>
            </CardContent>
            <CardFooter className="gap-2">
              <Button variant="outline" size="sm">Inventario GHG</Button>
              <Button variant="outline" size="sm">Bilancio</Button>
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  );
}
