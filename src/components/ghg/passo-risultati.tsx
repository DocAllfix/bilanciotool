"use client";

import { fmtNum, fmtPct } from "@/lib/format";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Bar, BarChart, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import type { Catalogo, StatoWizard } from "./types";

// Passo 5 — Risultati. SOLO presentazione: ogni numero arriva da results.ts
// (server). Palette dati dai token (--scope-*), coerente light/dark.

const SCOPE_COLORS = ["var(--scope-1)", "var(--scope-2)", "var(--scope-3)"];

export function PassoRisultati({ catalogo, stato }: { catalogo: Catalogo; stato: StatoWizard }) {
  const r = stato.risultati;
  const donut = [
    { name: "Scope 1 · dirette", value: Number(r.s1), fill: SCOPE_COLORS[0] },
    { name: "Scope 2 · energia", value: Number(r.s2l), fill: SCOPE_COLORS[1] },
    { name: "Scope 3 · indirette", value: Number(r.s3), fill: SCOPE_COLORS[2] },
  ].filter((d) => d.value > 0);

  const barCat = catalogo.categorie.map((c) => ({
    name: `Cat ${c.key}`,
    value: Number(r.perCategoria[c.key]?.t ?? 0),
    fill: c.key === "1" ? SCOPE_COLORS[0] : c.key === "2" ? SCOPE_COLORS[1] : SCOPE_COLORS[2],
  }));

  // L'id resta nel dato: due voci senza descrizione avrebbero la stessa etichetta
  // e React non potrebbe distinguerle (chiavi duplicate).
  const top = r.top.slice(0, 8).map((t) => ({
    id: t.id,
    name: t.descrizione || "(senza descrizione)",
    value: Number(t.t),
    fill: t.categoryKey === "1" ? SCOPE_COLORS[0] : t.categoryKey === "2" ? SCOPE_COLORS[1] : SCOPE_COLORS[2],
  }));

  const kpi = (label: string, valore: string, hint: string, colore?: string) => (
    <Card data-slot="kpi">
      <CardHeader className="pb-0">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
      </CardHeader>
      <CardContent>
        <p className="text-3xl font-semibold tracking-tight" style={colore ? { color: colore } : undefined}>{valore}</p>
        <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
      </CardContent>
    </Card>
  );

  if (r.n === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-sm text-muted-foreground">
          Nessuna voce inserita per il {r.anno}: i risultati compaiono appena aggiungi i dati di attività al passo 3.
        </CardContent>
      </Card>
    );
  }

  return (
    <div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {kpi("Totale location-based", fmtNum(r.totL, 1), `tCO₂e · ± ${fmtPct(r.incPct)}`)}
        {kpi("Totale market-based", fmtNum(r.totM, 1), `tCO₂e · ± ${fmtPct(r.incMPct)}`)}
        {kpi(
          "Variazione su anno base",
          r.variazioneAnnoBasePct === null ? "—" : `${Number(r.variazioneAnnoBasePct) >= 0 ? "+" : ""}${fmtNum(r.variazioneAnnoBasePct, 1)}%`,
          `anno base ${r.annoBase}`,
          r.variazioneAnnoBasePct === null ? undefined : Number(r.variazioneAnnoBasePct) <= 0 ? "var(--success)" : "var(--destructive)",
        )}
        {kpi("CO₂ biogenica", fmtNum(r.bio, 2), "t · riportata separatamente")}
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Composizione per scope</h2></CardHeader>
          <CardContent>
            <div className="h-56">
              <ResponsiveContainer>
                <PieChart>
                  {/* Cell esplicite: il fill nel dato non colora le fette.
                      Animazioni disattivate: registro "motion sobrio" e screenshot deterministici. */}
                  <Pie data={donut} dataKey="value" nameKey="name" innerRadius="55%" outerRadius="85%" strokeWidth={0} isAnimationActive={false}>
                    {donut.map((d) => <Cell key={d.name} fill={d.fill} />)}
                  </Pie>
                  <Tooltip formatter={(v) => [`${fmtNum(Number(v), 2)} tCO₂e`]} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <ul className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-xs">
              {donut.map((d) => (
                <li key={d.name} className="flex items-center gap-1.5">
                  <span className="size-2.5 rounded-sm" style={{ background: d.fill }} aria-hidden />
                  {d.name} · <b data-slot="kpi">{fmtNum(d.value, 1)}</b>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Emissioni per categoria (tCO₂e)</h2></CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer>
                <BarChart data={barCat} margin={{ top: 12, right: 8, left: 0, bottom: 0 }}>
                  <XAxis dataKey="name" tickLine={false} axisLine={false} fontSize={11} />
                  <YAxis tickLine={false} axisLine={false} fontSize={11} width={48} />
                  <Tooltip formatter={(v) => [`${fmtNum(Number(v), 2)} tCO₂e`]} cursor={{ fill: "var(--accent)" }} />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]} isAnimationActive={false}>
                    {barCat.map((d) => <Cell key={d.name} fill={d.fill} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card className="py-0">
          <CardHeader className="border-b py-4"><h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Riepilogo per categoria</h2></CardHeader>
          <CardContent className="px-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Categoria</TableHead>
                  <TableHead className="text-right">Voci</TableHead>
                  <TableHead className="text-right">tCO₂e</TableHead>
                  <TableHead className="text-right">Incertezza</TableHead>
                  <TableHead className="text-right">Qualità /5</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {catalogo.categorie.map((c) => {
                  const k = r.perCategoria[c.key];
                  return (
                    <TableRow key={c.key}>
                      <TableCell>
                        <Badge variant="outline" className="mr-1.5">Cat {c.key}</Badge>
                        <span className="text-xs">{c.nome}</span>
                      </TableCell>
                      <TableCell className="text-right">{k?.n ?? 0}</TableCell>
                      <TableCell className="text-right font-semibold">{fmtNum(k?.t ?? 0, 2)}</TableCell>
                      <TableCell className="text-right">± {fmtPct(k?.incPct ?? 0)}</TableCell>
                      <TableCell className="text-right">{k && k.n > 0 ? fmtNum(k.dqMedia, 1) : "—"}</TableCell>
                    </TableRow>
                  );
                })}
                <TableRow>
                  <TableCell className="font-semibold">Totale location-based</TableCell>
                  <TableCell className="text-right">{r.n}</TableCell>
                  <TableCell className="text-right font-semibold">{fmtNum(r.totL, 2)}</TableCell>
                  <TableCell className="text-right">± {fmtPct(r.incPct)}</TableCell>
                  <TableCell className="text-right">{fmtNum(r.dqMedia, 1)}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>
        <div className="space-y-4">
          <Card>
            <CardHeader><h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Doppia rendicontazione — categoria 2</h2></CardHeader>
            <CardContent>
              <Table>
                <TableBody>
                  <TableRow><TableCell>Location-based (mix di rete)</TableCell><TableCell className="text-right font-semibold">{fmtNum(r.s2l, 2)} tCO₂e</TableCell></TableRow>
                  <TableRow><TableCell>Market-based (contratti e GO)</TableCell><TableCell className="text-right font-semibold">{fmtNum(r.s2m, 2)} tCO₂e</TableCell></TableRow>
                  <TableRow><TableCell>Differenza attribuibile ai contratti</TableCell><TableCell className="text-right">{fmtNum(Number(r.s2l) - Number(r.s2m), 2)} tCO₂e</TableCell></TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Intensità di emissione</h2></CardHeader>
            <CardContent>
              <Table>
                <TableBody>
                  <TableRow><TableCell>Per fatturato</TableCell><TableCell className="text-right font-semibold">{r.intensita.perFatturato ? `${fmtNum(r.intensita.perFatturato, 2)} tCO₂e/M€` : "—"}</TableCell></TableRow>
                  <TableRow><TableCell>Per addetto</TableCell><TableCell className="text-right font-semibold">{r.intensita.perAddetto ? `${fmtNum(r.intensita.perAddetto, 0)} kgCO₂e/FTE` : "—"}</TableCell></TableRow>
                  <TableRow><TableCell>Per unità di prodotto</TableCell><TableCell className="text-right font-semibold">{r.intensita.perUnita ? `${fmtNum(r.intensita.perUnita, 2)} kg/unità` : "—"}</TableCell></TableRow>
                </TableBody>
              </Table>
              <p className="mt-2 text-xs text-muted-foreground">Compila ricavi, organico e produzione nei confini (passo 1) per ottenere le intensità.</p>
            </CardContent>
          </Card>
        </div>
      </div>

      {top.length > 0 && (
        <Card className="mt-4">
          <CardHeader>
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Voci più rilevanti</h2>
            <p className="text-sm text-muted-foreground">Le prime voci concentrano la maggior parte dell&apos;inventario: è lì che conviene migliorare la qualità del dato prima della verifica.</p>
          </CardHeader>
          <CardContent>
            <div style={{ height: top.length * 36 + 16 }}>
              <ResponsiveContainer>
                <BarChart data={top} layout="vertical" margin={{ top: 0, right: 48, left: 8, bottom: 0 }}>
                  <XAxis type="number" hide />
                  <YAxis type="category" dataKey="name" width={220} tickLine={false} axisLine={false} fontSize={11} />
                  <Tooltip formatter={(v) => [`${fmtNum(Number(v), 3)} tCO₂e`]} cursor={{ fill: "var(--accent)" }} />
                  <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={18} isAnimationActive={false} label={{ position: "right", fontSize: 11, formatter: (v) => fmtNum(Number(v), 1) }}>
                    {top.map((d) => <Cell key={d.id} fill={d.fill} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
