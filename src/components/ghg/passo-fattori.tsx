"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { deleteOrgFactorAction, upsertOrgFactorAction } from "@/features/ghg/actions";
import { fmtNum } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { RotateCcw } from "lucide-react";
import type { Catalogo, StatoWizard } from "./types";

// Passo 4 — Fattori e fonti. Modello a overlay: la libreria di piattaforma è la
// base; modificando un valore si crea un override dell'organizzazione. In
// verifica viene chiesto il documento da cui proviene ogni fattore: la colonna
// fonte va compilata con l'edizione esatta.

export function PassoFattori({ companyId, catalogo, stato }: { companyId: string; catalogo: Catalogo; stato: StatoWizard }) {
  const router = useRouter();
  const [errore, setErrore] = useState<string | null>(null);
  const usati = new Set(stato.righe.map((r) => r.factorKey).filter(Boolean));
  const gruppi = [...new Set(catalogo.fattori.map((f) => f.gruppo))];

  async function salvaOverride(key: string, patch: { fe?: string; feMarket?: string; fonte?: string }) {
    const f = catalogo.fattori.find((x) => x.key === key);
    if (!f) return;
    setErrore(null);
    const esito = await upsertOrgFactorAction(companyId, {
      key: f.key,
      baseFactorKey: f.origine === "custom" ? null : f.key,
      gruppo: f.gruppo,
      nome: f.nome,
      um: f.um,
      fe: patch.fe ?? f.fe,
      feMarket: patch.feMarket !== undefined ? patch.feMarket || null : f.feMarket,
      feBiogenic: f.feBiogenic,
      categoryKey: f.categoryKey as "1" | "2" | "3" | "4" | "5" | "6",
      sourceTypeKey: f.sourceTypeKey,
      fonte: patch.fonte ?? f.fonte ?? "",
    });
    if (!esito.ok) return setErrore(esito.errore);
    router.refresh();
  }

  async function ripristina(key: string) {
    setErrore(null);
    const esito = await deleteOrgFactorAction(companyId, key);
    if (!esito.ok) return setErrore(esito.errore);
    router.refresh();
  }

  return (
    <div>
      <div className="mb-4 rounded-lg border border-warning/40 bg-warning-subtle px-4 py-3 text-sm">
        I valori precaricati sono indicativi: prima di chiudere l&apos;inventario allineali all&apos;edizione corrente delle fonti
        (ISPRA per il mix elettrico, DEFRA per combustibili e trasporti) e scrivi nella fonte l&apos;edizione esatta, es. «ISPRA Rapporto 386/2023, tab. 2».
      </div>
      {errore && <p role="alert" className="mb-3 text-sm text-destructive">{errore}</p>}
      {gruppi.map((g) => (
        <Card key={g} className="mb-4 py-0">
          <CardHeader className="border-b py-4">
            <h2 className="text-[15px] font-semibold tracking-tight">{g}</h2>
          </CardHeader>
          <CardContent className="px-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fattore</TableHead>
                  <TableHead className="w-20">Unità</TableHead>
                  <TableHead className="w-32 text-right">kgCO₂e/unità</TableHead>
                  <TableHead className="w-32 text-right">Market-based</TableHead>
                  <TableHead className="w-56">Fonte e anno</TableHead>
                  <TableHead className="w-16" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {catalogo.fattori.filter((f) => f.gruppo === g).map((f) => (
                  <TableRow key={f.key}>
                    <TableCell>
                      <p className="font-medium">
                        {f.nome}{" "}
                        {usati.has(f.key) && <Badge variant="secondary" className="ml-1">in uso</Badge>}
                        {f.origine === "override" && <Badge variant="outline" className="ml-1">modificato</Badge>}
                        {f.origine === "custom" && <Badge variant="outline" className="ml-1">custom</Badge>}
                      </p>
                      <p className="font-mono text-xs text-muted-foreground">{f.key}</p>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">{f.um}</TableCell>
                    <TableCell>
                      <Input
                        className="text-right"
                        data-slot="kpi"
                        defaultValue={f.fe}
                        aria-label={`Fattore ${f.nome}`}
                        onBlur={(e) => { if (e.target.value !== f.fe) salvaOverride(f.key, { fe: e.target.value }); }}
                      />
                    </TableCell>
                    <TableCell>
                      {f.categoryKey === "2" ? (
                        <Input
                          className="text-right"
                          data-slot="kpi"
                          defaultValue={f.feMarket ?? ""}
                          aria-label={`Fattore market-based ${f.nome}`}
                          onBlur={(e) => { if (e.target.value !== (f.feMarket ?? "")) salvaOverride(f.key, { feMarket: e.target.value }); }}
                        />
                      ) : (
                        <p className="text-right text-xs text-muted-foreground">{f.feBiogenic ? `bio ${fmtNum(f.feBiogenic, 3)}` : "—"}</p>
                      )}
                    </TableCell>
                    <TableCell>
                      <Input
                        defaultValue={f.fonte ?? ""}
                        placeholder="Fonte, anno"
                        aria-label={`Fonte ${f.nome}`}
                        onBlur={(e) => { if (e.target.value !== (f.fonte ?? "")) salvaOverride(f.key, { fonte: e.target.value }); }}
                      />
                    </TableCell>
                    <TableCell>
                      {f.origine !== "piattaforma" && (
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label={f.origine === "custom" ? "Elimina fattore custom" : "Ripristina valore di piattaforma"}
                          title={f.origine === "custom" ? "Elimina fattore custom" : "Ripristina valore di piattaforma"}
                          onClick={() => ripristina(f.key)}
                        >
                          <RotateCcw className="size-3.5" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
