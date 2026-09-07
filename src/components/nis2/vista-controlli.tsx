"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { setCampoControlloAction } from "@/features/sgnis2/actions";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { fmtData } from "@/lib/format";
import { COLORE_STATO, ETICHETTA_STATO, STATI_CONTROLLO, type Controllo, type DatiSgNis2 } from "./types";

// Vista — I 68 controlli.
//
// ⚠️ QUI SI VEDE LA COSA CHE NESSUN ALTRO MODULO DICE: un controllo dichiarato «attuato»
// la cui verifica periodica e' scaduta compare come «Da verificare», con un colore suo.
// Se avesse il colore dell'attuato sarebbe invisibile, ed e' esattamente il difetto che il
// meccanismo esiste per prevenire — un sistema verde sulla carta che ha smesso di esistere.
//
// Lo stato dichiarato resta leggibile accanto: nascondere che qualcuno l'aveva dichiarato
// attuato renderebbe incomprensibile perche' quel controllo chieda attenzione.

export function VistaControlli({ companyId, dati }: { companyId: string; dati: DatiSgNis2 }) {
  const [capo, setCapo] = useState("tutti");
  const [soloAttenzione, setSoloAttenzione] = useState(false);

  const capi = [...new Set(dati.controlli.map((c) => c.capitolo))];
  const visibili = dati.controlli.filter((c) => {
    if (capo !== "tutti" && c.capitolo !== capo) return false;
    if (soloAttenzione && (c.effettivo === "attuato" || c.effettivo === "non_applicabile")) return false;
    return true;
  });

  const daVerificare = dati.controlli.filter((c) => c.effettivo === "da_verificare");

  return (
    <div className="mt-6 space-y-4">
      {daVerificare.length > 0 && (
        <div className="rounded-md border border-dashed p-3" data-slot="avviso-verifiche">
          <p className="text-sm">
            <b>
              {daVerificare.length}{" "}
              {daVerificare.length === 1 ? "controllo dichiarato attuato" : "controlli dichiarati attuati"}
            </b>{" "}
            {daVerificare.length === 1 ? "ha" : "hanno"} la verifica periodica scaduta, o nessuna
            verifica registrata. Nel documento compaiono come «da verificare»: è ciò che
            un&apos;ispezione trova chiedendo l&apos;ultima evidenza.
          </p>
        </div>
      )}

      <Card>
        <CardContent className="flex flex-wrap items-end gap-3 pt-6">
          <div className="grid gap-1.5">
            <Label htmlFor="sgnis2-filtro-capo">Capo</Label>
            <Select value={capo} onValueChange={setCapo}>
              <SelectTrigger id="sgnis2-filtro-capo" className="w-[170px]" aria-label="Filtra i controlli per capo">
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
          <label className="flex items-center gap-2 pb-2 text-sm">
            <input
              type="checkbox"
              checked={soloAttenzione}
              onChange={() => setSoloAttenzione(!soloAttenzione)}
              aria-label="Mostra solo i controlli che richiedono attenzione"
            />
            Solo quelli da fare o da verificare
          </label>
          <p className="ml-auto pb-2 text-sm text-muted-foreground">
            attuazione <span data-slot="kpi">{dati.attuazione}%</span>
          </p>
        </CardContent>
      </Card>

      <p className="text-sm text-muted-foreground" data-slot="conteggio-risultati">
        {visibili.length} {visibili.length === 1 ? "controllo" : "controlli"}
      </p>

      <div className="space-y-3" data-risultati="">
        {visibili.map((c) => (
          <RigaControllo key={c.id} companyId={companyId} c={c} />
        ))}
      </div>
    </div>
  );
}

function RigaControllo({ companyId, c }: { companyId: string; c: Controllo }) {
  const router = useRouter();
  const [, avvia] = useTransition();
  const [stato, setStato] = useState(c.dichiarato === "vuoto" ? "" : c.dichiarato);

  const salva = (input: Parameters<typeof setCampoControlloAction>[1], ripristina: () => void) =>
    avvia(async () => {
      const esito = await setCampoControlloAction(companyId, input);
      if (!esito.ok) {
        ripristina();
        toast.error(esito.errore);
        return;
      }
      router.refresh();
    });

  const scaduto = c.effettivo === "da_verificare";

  return (
    <Card data-controllo={c.id}>
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
              {c.id}
              {c.critico && (
                <Badge variant="outline" className="ml-2 text-[10px]">
                  criticità alta
                </Badge>
              )}
            </p>
            <p className="mt-1 text-[14px] font-medium leading-snug">{c.nome}</p>
            <p className="mt-0.5 text-[13px] text-muted-foreground">{c.descrizione}</p>
          </div>
          <span
            className="shrink-0 rounded-md px-2 py-1 text-[11px] font-medium"
            style={{
              background: COLORE_STATO[c.effettivo],
              color: c.effettivo === "vuoto" || c.effettivo === "non_applicabile" ? "inherit" : "#fff",
            }}
            data-slot="stato-effettivo"
          >
            {ETICHETTA_STATO[c.effettivo]}
          </span>
        </div>
      </CardHeader>
      <CardContent className="grid gap-3 sm:grid-cols-2">
        <div className="grid gap-1.5">
          <Label htmlFor={`st-${c.id}`}>Stato dichiarato</Label>
          <Select
            value={stato || undefined}
            onValueChange={(v) => {
              const prima = stato;
              setStato(v as typeof stato);
              salva({ controlKey: c.id, campo: "stato", valore: v as "attuato" }, () => setStato(prima));
            }}
          >
            {/* ⚠️ Il nome accessibile porta l'identificativo del controllo: 68 tendine con
                lo stesso nome sono 68 comandi indistinguibili per un lettore di schermo, e
                fermerebbero un collaudo con «resolved to 68 elements». */}
            <SelectTrigger id={`st-${c.id}`} aria-label={`Stato dichiarato di ${c.id}`}>
              <SelectValue placeholder="Non dichiarato" />
            </SelectTrigger>
            <SelectContent>
              {STATI_CONTROLLO.map((s) => (
                <SelectItem key={s.v} value={s.v}>
                  {s.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid gap-1.5">
          <Label htmlFor={`uv-${c.id}`}>Ultima verifica</Label>
          <Input
            id={`uv-${c.id}`}
            type="date"
            defaultValue={c.ultimaVerifica ?? ""}
            aria-label={`Ultima verifica di ${c.id}`}
            onBlur={(e) =>
              e.target.value !== (c.ultimaVerifica ?? "") &&
              salva({ controlKey: c.id, campo: "ultimaVerifica", valore: e.target.value }, () => {})
            }
          />
          <p className={cn("text-xs", scaduto ? "text-destructive" : "text-muted-foreground")}>
            da riverificare ogni {c.frequenza} giorni
            {c.prossima ? ` · prossima ${fmtData(c.prossima)}` : ""}
            {scaduto && c.dichiarato === "attuato" && !c.ultimaVerifica ? " · nessuna verifica registrata" : ""}
          </p>
        </div>

        <div className="grid gap-1.5">
          <Label htmlFor={`re-${c.id}`}>Responsabile</Label>
          <Input
            id={`re-${c.id}`}
            defaultValue={c.stato?.responsabile ?? ""}
            aria-label={`Responsabile di ${c.id}`}
            onBlur={(e) =>
              e.target.value !== (c.stato?.responsabile ?? "") &&
              salva({ controlKey: c.id, campo: "responsabile", valore: e.target.value || null }, () => {})
            }
          />
        </div>

        <div className="grid gap-1.5">
          <Label htmlFor={`ev-${c.id}`}>Evidenza</Label>
          <Input
            id={`ev-${c.id}`}
            defaultValue={c.stato?.evidenza ?? ""}
            aria-label={`Evidenza di ${c.id}`}
            onBlur={(e) =>
              e.target.value !== (c.stato?.evidenza ?? "") &&
              salva({ controlKey: c.id, campo: "evidenza", valore: e.target.value || null }, () => {})
            }
          />
        </div>
      </CardContent>
    </Card>
  );
}
