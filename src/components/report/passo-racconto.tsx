"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { addMediaAction, removeMediaAction, saveChapterAction, updateMediaAction } from "@/features/report/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ImagePlus, Sparkles, Trash2 } from "lucide-react";
import { TiptapEditor } from "./tiptap-editor";
import type { CatalogoReport, ProgettoReport, StatoReport } from "./types";

// Passo 5 — Racconto: capitoli con editor, bozze template-based (rule-based,
// niente AI) e apparato visivo (fotografie + diagrammi generati dai dati).

const NOMI_GRAFICI: Record<string, string> = {
  emissioni: "Emissioni — confronto biennale",
  energia: "Composizione dei consumi energetici",
  persone: "Composizione dell'organico",
  sicurezza: "Indici infortunistici",
  rifiuti: "Rifiuti prodotti e recuperati",
  fornitori: "Fornitori: provenienza e valutazione ESG",
  materialita: "Matrice di doppia rilevanza",
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

export function PassoRacconto({
  companyId, progetto, catalogo, stato,
}: {
  companyId: string;
  progetto: ProgettoReport;
  catalogo: CatalogoReport;
  stato: StatoReport;
}) {
  const router = useRouter();
  const [errore, setErrore] = useState<string | null>(null);
  const [salvataggio, setSalvataggio] = useState<string | null>(null);
  const capitoloPer = new Map(stato.capitoli.map((c) => [c.templateKey, c]));

  async function salvaCapitolo(templateKey: string, doc: unknown) {
    setSalvataggio(templateKey);
    const esito = await saveChapterAction(companyId, progetto.id, templateKey, doc);
    setSalvataggio(null);
    if (!esito.ok) return setErrore(esito.errore);
    router.refresh();
  }

  async function usaBozza(templateKey: string) {
    const bozza = stato.bozze[templateKey];
    if (!bozza) return;
    const doc = {
      type: "doc",
      content: bozza.split(/\n{2,}/).filter(Boolean).map((p) => ({ type: "paragraph", content: [{ type: "text", text: p.trim() }] })),
    };
    await salvaCapitolo(templateKey, doc);
  }

  async function aggiungiFoto(templateKey: string, file: File | undefined) {
    if (!file) return;
    setErrore(null);
    try {
      const dataUrl = await fileADataUrl(file);
      const esito = await addMediaAction(companyId, progetto.id, templateKey, { tipo: "img", dataUrl });
      if (!esito.ok) return setErrore(esito.errore);
      router.refresh();
    } catch {
      setErrore("Fotografia non leggibile.");
    }
  }

  async function aggiungiGrafico(templateKey: string, chartKey: string) {
    setErrore(null);
    const esito = await addMediaAction(companyId, progetto.id, templateKey, { tipo: "chart", chartKey });
    if (!esito.ok) return setErrore(esito.errore);
    router.refresh();
  }

  return (
    <div>
      <p className="mb-4 max-w-3xl text-sm text-muted-foreground">
        I capitoli discorsivi del bilancio. La <b>bozza dai dati</b> genera un punto di partenza compilato con i numeri reali (da riscrivere con la voce dell&apos;azienda); i diagrammi si costruiscono dai dati del passo 3 e si aggiornano da soli.
      </p>
      {errore && <p role="alert" className="mb-3 text-sm text-destructive">{errore}</p>}
      {catalogo.capitoli.map((cap) => {
        const c = capitoloPer.get(cap.key);
        const media = stato.media.filter((m) => m.sectionKey === cap.key);
        const vuoto = !c || c.parole === 0;
        return (
          <Card key={cap.key} className="mb-4">
            <CardHeader>
              <div className="flex items-baseline justify-between gap-3">
                <div>
                  <h2 className="text-[15px] font-semibold tracking-tight">{cap.nome}</h2>
                  <p className="text-sm text-muted-foreground">{cap.hint}</p>
                </div>
                <span className="shrink-0 text-xs text-muted-foreground" data-slot="kpi" aria-live="polite">
                  {salvataggio === cap.key ? "Salvataggio…" : `${c?.parole ?? 0} parole · ${media.length} elementi visivi`}
                </span>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {vuoto && stato.bozze[cap.key] && (
                <button
                  type="button"
                  onClick={() => usaBozza(cap.key)}
                  className="w-full rounded-lg border border-dashed border-primary/40 bg-accent/40 px-4 py-3 text-left text-sm transition-colors hover:bg-accent"
                  data-tour={`bozza-${cap.key}`}
                >
                  <span className="flex items-center gap-2 font-medium text-accent-foreground">
                    <Sparkles className="size-4" /> Parti dalla bozza compilata con i tuoi dati
                  </span>
                  <span className="mt-1 line-clamp-2 block text-xs text-muted-foreground">{stato.bozze[cap.key]}</span>
                </button>
              )}
              <TiptapEditor
                key={`${cap.key}-${c?.parole ?? 0}`}
                contenuto={c?.contenuto}
                placeholder={cap.nome}
                onSave={(doc) => salvaCapitolo(cap.key, doc)}
              />
              <div className="flex flex-wrap items-center gap-2">
                <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium transition-colors hover:bg-accent hover:text-accent-foreground">
                  <ImagePlus className="size-3.5" /> Fotografia
                  <input type="file" accept="image/*" className="sr-only" onChange={(e) => aggiungiFoto(cap.key, e.target.files?.[0])} />
                </label>
                <Select value="" onValueChange={(v) => aggiungiGrafico(cap.key, v)}>
                  <SelectTrigger className="h-8 w-64 text-xs" aria-label={`Aggiungi diagramma a ${cap.nome}`}>
                    <SelectValue placeholder="＋ Diagramma dai dati…" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(NOMI_GRAFICI).map(([k, n]) => <SelectItem key={k} value={k}>{n}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              {media.map((m) => (
                <div key={m.id} className="flex gap-3 rounded-lg border p-3">
                  <div className="flex h-20 w-28 shrink-0 items-center justify-center overflow-hidden rounded-md bg-muted/50">
                    {m.tipo === "img" && m.url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={m.url} alt={m.didascalia ?? ""} className="h-full w-full object-cover" />
                    ) : (
                      <span className="px-2 text-center text-[10px] text-muted-foreground">{NOMI_GRAFICI[m.chartKey ?? ""] ?? "diagramma"}</span>
                    )}
                  </div>
                  <div className="min-w-0 flex-1 space-y-2">
                    <div className="flex items-center gap-2">
                      <Badge variant={m.tipo === "img" ? "secondary" : "outline"}>{m.tipo === "img" ? "fotografia" : "diagramma"}</Badge>
                      <Select value={m.larghezza} onValueChange={async (v) => { await updateMediaAction(companyId, m.id, { larghezza: v as "full" | "half" }); router.refresh(); }}>
                        <SelectTrigger className="h-7 w-36 text-xs" aria-label="Larghezza"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="full">Larghezza piena</SelectItem>
                          <SelectItem value="half">Metà colonna</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button variant="ghost" size="icon" className="ml-auto" aria-label="Elimina elemento"
                        onClick={async () => { if (confirm("Eliminare l'elemento?")) { await removeMediaAction(companyId, m.id); router.refresh(); } }}>
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                    <Input
                      placeholder="Didascalia — cosa mostra e perché è rilevante"
                      defaultValue={m.didascalia ?? ""}
                      onBlur={(e) => { if (e.target.value !== (m.didascalia ?? "")) updateMediaAction(companyId, m.id, { didascalia: e.target.value }).then(() => router.refresh()); }}
                    />
                    <Input
                      placeholder="Fonte o credito fotografico"
                      defaultValue={m.credito ?? ""}
                      onBlur={(e) => { if (e.target.value !== (m.credito ?? "")) updateMediaAction(companyId, m.id, { credito: e.target.value }).then(() => router.refresh()); }}
                    />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
