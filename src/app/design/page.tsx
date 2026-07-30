import type { Metadata } from "next";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { ThemeToggle } from "@/components/theme-toggle";

export const metadata: Metadata = { title: "Design system" };

// Showcase interno dei token e dei componenti (pagina di lavoro, non di prodotto).
// Serve al gate visivo di ogni fase UI: se qualcosa qui stona, stona ovunque.

const SWATCHES = [
  ["primary", "bg-primary text-primary-foreground"],
  ["accent", "bg-accent text-accent-foreground"],
  ["secondary", "bg-secondary text-secondary-foreground"],
  ["muted", "bg-muted text-muted-foreground"],
  ["destructive", "bg-destructive text-white"],
  ["success", "bg-success text-white"],
  ["warning", "bg-warning text-white"],
  ["sidebar", "bg-sidebar text-sidebar-foreground"],
] as const;

const DATI = [
  ["scope-1", "bg-scope-1", "Scope 1 · dirette"],
  ["scope-2", "bg-scope-2", "Scope 2 · energia"],
  ["scope-3", "bg-scope-3", "Scope 3 · indirette"],
  ["esg-e", "bg-esg-e", "Ambiente"],
  ["esg-s", "bg-esg-s", "Sociale"],
  ["esg-g", "bg-esg-g", "Governance"],
] as const;

export default function DesignPage() {
  return (
    <div className="mx-auto w-full max-w-4xl px-6 py-10">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Design system</h1>
          <p className="mt-1 text-sm text-muted-foreground">Token e componenti — registro vincolante in DESIGN.md</p>
        </div>
        <ThemeToggle />
      </div>

      <Separator className="my-8" />

      <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Palette semantica</h2>
      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {SWATCHES.map(([nome, cls]) => (
          <div key={nome} className={`rounded-lg border px-3 py-4 text-xs font-medium ${cls}`}>{nome}</div>
        ))}
      </div>

      <h2 className="mt-8 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Palette dati (grafici)</h2>
      <div className="mt-3 flex flex-wrap gap-3">
        {DATI.map(([nome, cls, label]) => (
          <div key={nome} className="flex items-center gap-2 text-sm">
            <span className={`size-4 rounded ${cls}`} aria-hidden />
            {label}
          </div>
        ))}
      </div>

      <h2 className="mt-8 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Controlli</h2>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <Button>Azione primaria</Button>
        <Button variant="outline">Secondaria</Button>
        <Button variant="ghost">Ghost</Button>
        <Button variant="destructive">Elimina</Button>
        <Badge>Pubblicato</Badge>
        <Badge variant="secondary">In lavorazione</Badge>
        <Badge variant="outline">Bozza</Badge>
      </div>
      <div className="mt-4 grid max-w-sm gap-1.5">
        <Label htmlFor="demo-input">Campo di esempio</Label>
        <Input id="demo-input" placeholder="Gas naturale — caldaia produzione" />
      </div>
      <div className="mt-4 max-w-sm">
        <Progress value={62} aria-label="Avanzamento 62%" />
      </div>

      <h2 className="mt-8 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        Tabella densa (numeri tabellari)
      </h2>
      <Card className="mt-3 py-0">
        <CardContent className="px-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Voce</TableHead>
                <TableHead className="text-right">Quantità</TableHead>
                <TableHead className="text-right">FE</TableHead>
                <TableHead className="text-right">tCO₂e</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {[
                ["Gas naturale — caldaia", "12.500 Smc", "1,9755", "24,694"],
                ["Energia elettrica", "100.000 kWh", "0,2565", "25,650"],
                ["Refrigerante R410A", "12 kg", "2.088", "25,056"],
              ].map(([v, q, fe, t]) => (
                <TableRow key={v}>
                  <TableCell className="font-medium">{v}</TableCell>
                  <TableCell className="text-right">{q}</TableCell>
                  <TableCell className="text-right">{fe}</TableCell>
                  <TableCell className="text-right font-semibold">{t}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <h2 className="mt-8 text-sm font-semibold uppercase tracking-wide text-muted-foreground">KPI</h2>
      <div className="mt-3 grid gap-4 sm:grid-cols-3">
        {[
          ["Totale location-based", "75,6", "tCO₂e · ±10,1%"],
          ["Temi materiali", "7", "su 18 valutati"],
          ["Pronto a pubblicare", "78%", "3 lacune aperte"],
        ].map(([l, n, h]) => (
          <Card key={l} data-slot="kpi">
            <CardHeader className="pb-0">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{l}</p>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-semibold tracking-tight">{n}</p>
              <p className="mt-1 text-xs text-muted-foreground">{h}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
