"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { addMediaAction, removeMediaAction, saveChapterAction, updateMediaAction } from "@/features/energy/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ImagePlus, Trash2 } from "lucide-react";
import { TiptapEditor } from "@/components/report/tiptap-editor";
import type { PropsPasso } from "./types";

// Passo 6 — Lettura dei dati. I numeri dei passi precedenti non spiegano da soli
// perché il sito consuma così: questi capitoli sono la parte consulenziale del
// documento. L'editor è lo stesso del bilancio, ristretto alla whitelist che il
// server applica comunque a ciò che riceve.

const NOMI_GRAFICI: Record<string, string> = {
  ingresso: "Composizione dell'energia in ingresso",
  usi: "Ripartizione sugli usi finali",
  pareto: "Pareto degli usi finali",
  flussi: "Diagramma dei flussi energetici",
  mensile: "Andamento mensile dei consumi",
  indicatori: "Confronto degli indicatori con l'anno di riferimento",
  interventi: "Interventi: risparmio e tempo di ritorno",
};

async function fileADataUrl(file: File, maxLato = 1600, qualita = 0.85): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const scala = Math.min(1, maxLato / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scala);
  canvas.height = Math.round(bitmap.height * scala);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL(file.type === "image/png" ? "image/png" : "image/jpeg", qualita);
}

export function PassoRaccontoEnergia({ companyId, bilancio, catalogo, stato }: PropsPasso) {
  const router = useRouter();
  const [errore, setErrore] = useState<string | null>(null);
  const [salvataggio, setSalvataggio] = useState<string | null>(null);

  const capitoloPer = new Map(stato.capitoli.map((c) => [c.templateKey, c]));
  // Il salvataggio del capitolo non rivalida la pagina (si scrive, non si naviga):
  // il conteggio delle parole va quindi tenuto anche in locale, altrimenti resta
  // fermo a zero mentre il testo cresce.
  const [paroleLocali, setParoleLocali] = useState<Record<string, number>>({});

  function contaParole(doc: unknown): number {
    const testo: string[] = [];
    const cammina = (n: unknown) => {
      if (!n || typeof n !== "object") return;
      const nodo = n as { text?: string; content?: unknown[] };
      if (typeof nodo.text === "string") testo.push(nodo.text);
      for (const f of nodo.content ?? []) cammina(f);
    };
    cammina(doc);
    return testo.join(" ").split(/\s+/).filter(Boolean).length;
  }

  async function salvaCapitolo(templateKey: string, doc: unknown) {
    setParoleLocali((s2) => ({ ...s2, [templateKey]: contaParole(doc) }));
    setSalvataggio(templateKey);
    const esito = await saveChapterAction(bilancio.id, templateKey, doc);
    setSalvataggio(null);
    if (!esito.ok) setErrore(esito.errore);
  }

  async function aggiungiGrafico(templateKey: string, chartKey: string) {
    setErrore(null);
    const esito = await addMediaAction(companyId, bilancio.anno, bilancio.id, templateKey, { tipo: "chart", chartKey });
    if (!esito.ok) return setErrore(esito.errore);
    router.refresh();
  }

  async function aggiungiFoto(templateKey: string, file: File) {
    setErrore(null);
    try {
      const dataUrl = await fileADataUrl(file);
      const esito = await addMediaAction(companyId, bilancio.anno, bilancio.id, templateKey, { tipo: "img", dataUrl });
      if (!esito.ok) return setErrore(esito.errore);
      router.refresh();
    } catch {
      setErrore("Immagine non leggibile: usa un file JPEG o PNG.");
    }
  }

  async function rimuovi(mediaId: string) {
    setErrore(null);
    const esito = await removeMediaAction(companyId, bilancio.anno, mediaId);
    if (!esito.ok) return setErrore(esito.errore);
    router.refresh();
  }

  return (
    <div className="grid gap-4">
      {errore && <p role="alert" className="text-sm text-destructive">{errore}</p>}
      <p className="max-w-3xl text-sm text-muted-foreground">
        Qui si spiega quello che i numeri mostrano: dove va l&apos;energia, che cosa è anomalo, che cosa conviene fare
        e in che ordine. È la parte che distingue una diagnosi da una tabella.
      </p>

      {catalogo.capitoli.map((cap) => {
        const c = capitoloPer.get(cap.key);
        const media = stato.media.filter((m) => m.sectionKey === cap.key);
        return (
          <Card key={cap.key}>
            <CardHeader className="flex-row items-start justify-between gap-4">
              <div>
                <h2 className="text-[15px] font-semibold tracking-tight">{cap.nome}</h2>
                <p className="text-sm text-muted-foreground">{cap.hint}</p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                {salvataggio === cap.key && <span className="text-[11px] text-muted-foreground">salvataggio…</span>}
                <Badge variant="outline">{paroleLocali[cap.key] ?? c?.parole ?? 0} parole</Badge>
              </div>
            </CardHeader>
            <CardContent className="grid gap-4">
              <TiptapEditor
                contenuto={c?.contenuto ?? null}
                onSave={(doc) => salvaCapitolo(cap.key, doc)}
                placeholder="Scrivi qui la lettura del capitolo…"
              />

              <div className="flex flex-wrap items-center gap-2 border-t pt-3">
                <Select onValueChange={(v) => aggiungiGrafico(cap.key, v)}>
                  <SelectTrigger className="w-72" aria-label={`Aggiungi un grafico a ${cap.nome}`}>
                    <SelectValue placeholder="Aggiungi un grafico dai dati" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(NOMI_GRAFICI).map(([k, nome]) => (
                      <SelectItem key={k} value={k}>{nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground">
                  <ImagePlus className="size-4" /> Fotografia
                  <input
                    type="file"
                    accept="image/jpeg,image/png"
                    className="sr-only"
                    onChange={(e) => { const f = e.target.files?.[0]; if (f) aggiungiFoto(cap.key, f); e.target.value = ""; }}
                  />
                </label>
              </div>

              {media.length > 0 && (
                <ul className="grid gap-2">
                  {media.map((m) => (
                    <li key={m.id} className="flex items-center gap-3 rounded-md border p-2.5">
                      {m.tipo === "img" && m.url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={m.url} alt="" className="size-12 shrink-0 rounded object-cover" />
                      ) : (
                        <span className="flex size-12 shrink-0 items-center justify-center rounded bg-accent text-[10px] font-semibold uppercase text-accent-foreground">
                          grafico
                        </span>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">
                          {m.tipo === "chart" ? (NOMI_GRAFICI[m.chartKey ?? ""] ?? m.chartKey) : "Fotografia"}
                        </p>
                        <Input
                          className="mt-1 h-8 text-xs"
                          defaultValue={m.didascalia ?? ""}
                          placeholder="Didascalia"
                          aria-label="Didascalia dell'elemento visivo"
                          onBlur={(e) => { if (e.target.value !== (m.didascalia ?? "")) updateMediaAction(companyId, bilancio.anno, m.id, { didascalia: e.target.value }); }}
                        />
                      </div>
                      <Button variant="ghost" size="sm" onClick={() => rimuovi(m.id)} aria-label="Rimuovi l'elemento visivo">
                        <Trash2 className="size-3.5" />
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
