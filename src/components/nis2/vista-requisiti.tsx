"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { setCampoRequisitoAction } from "@/features/nis2/actions";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { COLORE_LIVELLO, LIVELLI, type DatiNis2, type Requisito } from "./types";

// Vista 2 — La verifica: 124 o 126 requisiti su 12 capi, scala 0÷4.
//
// ⚠️ La scala e' a QUATTRO PULSANTI piu' «non applicabile», non una tendina: la differenza
// fra il 2 e il 3 e' l'evidenza documentale, e quella frase deve stare sotto gli occhi al
// momento di scegliere. In una tendina chiusa non la legge nessuno, e un consulente che
// non la legge mette 3 dappertutto.

export function VistaRequisiti({ companyId, dati }: { companyId: string; dati: DatiNis2 }) {
  const [capo, setCapo] = useState<string>("tutti");
  const [soloAperti, setSoloAperti] = useState(false);
  const [cerca, setCerca] = useState("");

  const capi = useMemo(() => [...new Set(dati.requisiti.map((r) => r.chapterKey))], [dati.requisiti]);

  const visibili = dati.requisiti.filter((r) => {
    if (capo !== "tutti" && r.chapterKey !== capo) return false;
    if (soloAperti && (r.stato?.livello != null || r.stato?.nonApplicabile)) return false;
    if (cerca && !`${r.key} ${r.testo}`.toLowerCase().includes(cerca.toLowerCase())) return false;
    return true;
  });

  const k = dati.conformita;

  return (
    <div className="mt-6 space-y-4">
      <Card>
        <CardContent className="flex flex-wrap items-end gap-3 pt-6">
          <div className="grid gap-1.5">
            <Label htmlFor="nis2-filtro-capo">Capo</Label>
            <Select value={capo} onValueChange={setCapo}>
              <SelectTrigger id="nis2-filtro-capo" className="w-[180px]" aria-label="Filtra per capo">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="tutti">Tutti i capi</SelectItem>
                {capi.map((c) => (
                  <SelectItem key={c} value={c}>
                    Capo {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="nis2-cerca">Cerca</Label>
            <Input
              id="nis2-cerca"
              value={cerca}
              onChange={(e) => setCerca(e.target.value)}
              placeholder="Riferimento o testo"
              className="w-[240px]"
            />
          </div>
          <label className="flex items-center gap-2 pb-2 text-sm">
            <input
              type="checkbox"
              checked={soloAperti}
              onChange={() => setSoloAperti(!soloAperti)}
              aria-label="Mostra solo i requisiti non ancora valutati"
            />
            Solo da valutare
          </label>
          {k && (
            <p className="ml-auto pb-2 text-sm text-muted-foreground">
              <span data-slot="kpi">{k.valutati}</span> valutati su{" "}
              <span data-slot="kpi">{k.applicabili}</span> applicabili · conformità{" "}
              <span data-slot="kpi">{k.percentuale}%</span>
            </p>
          )}
        </CardContent>
      </Card>

      <p className="text-sm text-muted-foreground" data-slot="conteggio-risultati">
        {visibili.length} {visibili.length === 1 ? "requisito" : "requisiti"}
      </p>

      <div className="space-y-3" data-risultati="">
        {visibili.map((r) => (
          <RigaRequisito key={r.key} companyId={companyId} r={r} />
        ))}
      </div>
    </div>
  );
}

function RigaRequisito({ companyId, r }: { companyId: string; r: Requisito }) {
  const router = useRouter();
  const [, avvia] = useTransition();
  const [livello, setLivello] = useState<number | null>(r.stato?.livello ?? null);
  const [na, setNa] = useState(r.stato?.nonApplicabile ?? false);

  const salva = (input: Parameters<typeof setCampoRequisitoAction>[1], ripristina: () => void) =>
    avvia(async () => {
      const esito = await setCampoRequisitoAction(companyId, input);
      if (!esito.ok) {
        ripristina();
        toast.error(esito.errore);
        return;
      }
      router.refresh();
    });

  const scegli = (v: number) => {
    const prima = livello;
    // Ripremere annulla: e' il modo di tornare a «non valutato» senza una voce apposita.
    const dopo = livello === v ? null : v;
    setLivello(dopo);
    salva({ requirementKey: r.key, campo: "livello", valore: dopo }, () => setLivello(prima));
  };

  return (
    <Card data-requisito={r.key}>
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
              {r.key} · {r.rif}
              {r.critico && (
                <Badge variant="outline" className="ml-2 text-[10px]">
                  criticità alta
                </Badge>
              )}
            </p>
            <p className="mt-1 text-[14px] leading-snug">{r.testo}</p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap gap-1.5">
          {LIVELLI.map((l) => (
            <button
              key={l.v}
              type="button"
              disabled={na}
              onClick={() => scegli(l.v)}
              aria-pressed={livello === l.v}
              // ⚠️ Il nome accessibile porta il RIFERIMENTO del requisito, non solo il
              // livello: sei requisiti citano lo stesso articolo, e senza l'identificativo
              // un lettore di schermo sentirebbe sei pulsanti identici — ed e' anche il
              // motivo per cui Playwright si fermerebbe con «resolved to N elements».
              aria-label={`${r.key}: livello ${l.v} · ${l.nome}`}
              title={l.d}
              className={cn(
                "rounded-md border px-2.5 py-1.5 text-left text-[12px] transition-colors disabled:opacity-40",
                livello === l.v ? "text-white" : "hover:bg-accent",
              )}
              style={livello === l.v ? { background: COLORE_LIVELLO[l.v], borderColor: COLORE_LIVELLO[l.v] } : undefined}
            >
              <span className="font-medium">{l.v}</span> · {l.nome}
            </button>
          ))}
        </div>

        {/* ⚠️ Le due frasi che distinguono il 2 dal 3 e il 3 dal 4 stanno SEMPRE a schermo,
            non in un suggerimento che compare al passaggio del mouse: su un telefono il
            passaggio del mouse non esiste, ed e' proprio dove si compila in cantiere. */}
        <p className="text-xs text-muted-foreground">
          Il livello <b>3</b> pretende l&apos;evidenza documentale sull&apos;intero perimetro; il{" "}
          <b>4</b> anche la verifica periodica di efficacia.
        </p>

        <div className="flex flex-wrap items-center gap-4">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={na}
              aria-label={`${r.key}: non applicabile`}
              onChange={() => {
                const prima = na;
                setNa(!na);
                if (!na) setLivello(null);
                salva({ requirementKey: r.key, campo: "nonApplicabile", valore: !prima }, () => {
                  setNa(prima);
                });
              }}
            />
            Non applicabile
          </label>
          <div className="flex min-w-[240px] flex-1 items-center gap-2">
            <Label htmlFor={`ev-${r.key}`} className="sr-only">
              Evidenza per {r.key}
            </Label>
            <Input
              id={`ev-${r.key}`}
              placeholder="Evidenza documentale"
              defaultValue={r.stato?.evidenza ?? ""}
              onBlur={(e) =>
                e.target.value !== (r.stato?.evidenza ?? "") &&
                salva(
                  { requirementKey: r.key, campo: "evidenza", valore: e.target.value || null },
                  () => {},
                )
              }
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

