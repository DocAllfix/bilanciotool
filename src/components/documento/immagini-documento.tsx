"use client";

/* eslint-disable @next/next/no-img-element */
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { ImageIcon, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { fileADataUrl, LATO_COPERTINA } from "@/lib/immagini-client";
import {
  getImmaginiAziendaAction, setCopertinaModoAction, setImmagineAziendaAction,
} from "@/features/companies/immagini-actions";
import type { ImmaginiAzienda, ModoCopertina } from "@/features/companies/immagini";

// Logo e copertina dell'azienda, dal pannello di pubblicazione di OGNI percorso.
//
// ⚠️ PERCHÉ UN RIEPILOGO E UN DIALOGO, E NON UN EDITOR NEL PANNELLO. Alcuni percorsi hanno
// più documenti nella stessa pagina — il sistema di gestione integrato ne mostra tre —
// e un editor dentro ogni pannello comparirebbe tre volte, per le stesse due immagini.
// Qui ogni pannello dice che cosa userà il SUO documento, e l'editor si apre sopra: uno,
// uguale ovunque, senza uscire dal percorso.
//
// ⚠️ LE IMMAGINI SONO DELL'AZIENDA, NON DEL DOCUMENTO. Si caricano una volta e valgono per
// tutti i percorsi, e il riquadro lo dice: chi cambia il logo dal 231 deve sapere che
// cambia anche per il bilancio. Valgono per i documenti pubblicati DA ORA — quelli già
// pubblicati si sono fatti una copia propria, e non cambiano.

/** Più riepiloghi nella stessa pagina: quando uno cambia le immagini, gli altri rileggono. */
const EVENTO = "evalisdeck:immagini-azienda";

export function ImmaginiDocumento({ companyId }: { companyId: string }) {
  const [imm, setImm] = useState<ImmaginiAzienda | null>(null);
  const [aperto, setAperto] = useState(false);

  useEffect(() => {
    let vivo = true;
    const leggi = async () => {
      const e = await getImmaginiAziendaAction(companyId);
      if (vivo && e.ok) setImm(e.dati!);
    };
    void leggi();
    const altrove = (ev: Event) => {
      if ((ev as CustomEvent<string>).detail === companyId) void leggi();
    };
    window.addEventListener(EVENTO, altrove);
    return () => {
      vivo = false;
      window.removeEventListener(EVENTO, altrove);
    };
  }, [companyId]);

  const aggiorna = (nuove: ImmaginiAzienda) => {
    setImm(nuove);
    window.dispatchEvent(new CustomEvent(EVENTO, { detail: companyId }));
  };

  const riepilogo =
    imm === null
      ? "…"
      : [
          imm.logoUrl ? "logo dell'azienda" : "senza logo",
          !imm.coverUrl
            ? "copertina senza immagine"
            : imm.modo === "pagina"
              ? "copertina a pagina intera"
              : "fotografia in copertina",
        ].join(" · ");

  return (
    <div
      className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-lg border bg-muted/30 px-3 py-2.5"
      data-immagini="riepilogo"
    >
      <div className="flex items-center gap-2">
        <Anteprima url={imm?.logoUrl ?? null} tipo="logo" />
        <Anteprima url={imm?.coverUrl ?? null} tipo="cover" pagina={imm?.modo === "pagina"} />
      </div>
      <p className="min-w-0 flex-1 text-[13px] leading-snug text-muted-foreground">
        Il documento userà: <span className="text-foreground">{riepilogo}</span>
      </p>
      <Dialog open={aperto} onOpenChange={setAperto}>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm" data-immagini="apri">
            <ImageIcon className="size-3.5" /> Logo e copertina
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-xl" data-modale="immagini">
          <DialogHeader>
            <DialogTitle>Logo e copertina</DialogTitle>
            <DialogDescription>
              Valgono per <b>tutti i documenti di questa azienda</b>, in ogni percorso, da qui in avanti. Quelli già
              pubblicati restano come sono stati consegnati.
            </DialogDescription>
          </DialogHeader>
          {imm && <Editor companyId={companyId} imm={imm} onCambio={aggiorna} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Anteprima({ url, tipo, pagina }: { url: string | null; tipo: "logo" | "cover"; pagina?: boolean }) {
  // La copertina si mostra nelle proporzioni in cui uscirà: A4 se è a pagina intera, una
  // fascia se è una fotografia. Un'anteprima che taglia diversamente dal documento
  // mentirebbe proprio sul difetto che questo riquadro esiste per correggere.
  const forma = tipo === "logo" ? "size-9" : pagina ? "h-9 w-[26px]" : "h-9 w-14";
  return (
    <div
      className={cn("grid shrink-0 place-items-center overflow-hidden rounded border bg-background", forma)}
      aria-hidden
    >
      {url ? (
        <img src={url} alt="" className={cn("h-full w-full", tipo === "logo" || pagina ? "object-contain" : "object-cover")} />
      ) : (
        <ImageIcon className="size-3.5 text-muted-foreground/60" />
      )}
    </div>
  );
}

function Editor({
  companyId,
  imm,
  onCambio,
}: {
  companyId: string;
  imm: ImmaginiAzienda;
  onCambio: (i: ImmaginiAzienda) => void;
}) {
  const [inCorso, setInCorso] = useState<"logo" | "cover" | null>(null);
  // Il modo risponde SUBITO (regola dei comandi ottimistici): un interruttore che aspetta il
  // server prima di muoversi si legge come rotto. Se il server rifiuta, torna indietro.
  const [modo, setModo] = useState<ModoCopertina>(imm.modo);
  useEffect(() => setModo(imm.modo), [imm.modo]);

  async function carica(tipo: "logo" | "cover", file: File | undefined) {
    if (!file) return;
    setInCorso(tipo);
    try {
      const dataUrl =
        tipo === "logo" ? await fileADataUrl(file, 600) : await fileADataUrl(file, LATO_COPERTINA, 0.88, true);
      const e = await setImmagineAziendaAction(companyId, tipo, dataUrl);
      if (!e.ok) return void toast.error(e.errore);
      onCambio(e.dati!);
      toast.success(tipo === "logo" ? "Logo aggiornato" : "Copertina aggiornata");
    } catch {
      toast.error("Non riesco a leggere questo file: serve un'immagine PNG, JPEG o WebP.");
    } finally {
      setInCorso(null);
    }
  }

  async function togli(tipo: "logo" | "cover") {
    setInCorso(tipo);
    const e = await setImmagineAziendaAction(companyId, tipo, null);
    setInCorso(null);
    if (!e.ok) return void toast.error(e.errore);
    onCambio(e.dati!);
  }

  async function cambiaModo(nuovo: ModoCopertina) {
    if (nuovo === modo) return;
    const prima = modo;
    setModo(nuovo);
    const e = await setCopertinaModoAction(companyId, nuovo);
    if (!e.ok) {
      setModo(prima);
      return void toast.error(e.errore);
    }
    onCambio(e.dati!);
  }

  return (
    <div className="space-y-5">
      <Casella
        titolo="Logo"
        spiega="In alto a destra nella copertina di ogni documento — non su quelle a pagina intera, che i loro loghi li hanno già. PNG con fondo trasparente, se ce l'hai."
        url={imm.logoUrl}
        tipo="logo"
        inCorso={inCorso === "logo"}
        onFile={(f) => carica("logo", f)}
        onTogli={() => togli("logo")}
      />
      <Casella
        titolo="Copertina"
        spiega="Un'immagine per la prima pagina di ogni documento."
        url={imm.coverUrl}
        tipo="cover"
        pagina={modo === "pagina"}
        inCorso={inCorso === "cover"}
        onFile={(f) => carica("cover", f)}
        onTogli={() => togli("cover")}
      />

      <fieldset className="space-y-2" disabled={!imm.coverUrl}>
        <legend className="text-sm font-medium">Come si usa la copertina</legend>
        {!imm.coverUrl && (
          <p className="text-[12.5px] text-muted-foreground">Carica prima una copertina per scegliere come usarla.</p>
        )}
        <div className="grid gap-2 sm:grid-cols-2" role="radiogroup" aria-label="Come si usa la copertina">
          <Scelta
            attiva={modo === "foto"}
            onClick={() => cambiaModo("foto")}
            titolo="Fotografia sopra il titolo"
            testo="L'immagine fa da fascia in alto, e sotto il documento scrive azienda, titolo e norma."
            dato="foto"
          />
          <Scelta
            attiva={modo === "pagina"}
            onClick={() => cambiaModo("pagina")}
            titolo="Pagina intera"
            testo="Per una copertina già impaginata, con titolo e loghi. Si mostra intera, senza tagli e senza scriverci sopra."
            dato="pagina"
          />
        </div>
      </fieldset>
    </div>
  );
}

function Casella({
  titolo, spiega, url, tipo, pagina, inCorso, onFile, onTogli,
}: {
  titolo: string;
  spiega: string;
  url: string | null;
  tipo: "logo" | "cover";
  pagina?: boolean;
  inCorso: boolean;
  onFile: (f: File | undefined) => void;
  onTogli: () => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  const forma = tipo === "logo" ? "h-20 w-28" : pagina ? "h-28 w-20" : "h-20 w-32";
  return (
    <div className="flex items-start gap-4" data-immagini={tipo}>
      <div className={cn("grid shrink-0 place-items-center overflow-hidden rounded-md border bg-muted/40", forma)}>
        {url ? (
          <img
            src={url}
            alt={titolo}
            className={cn("h-full w-full", tipo === "logo" || pagina ? "object-contain p-1" : "object-cover")}
          />
        ) : (
          <ImageIcon className="size-5 text-muted-foreground/50" aria-hidden />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">{titolo}</p>
        <p className="mt-0.5 text-[12.5px] leading-relaxed text-muted-foreground">{spiega}</p>
        <div className="mt-2 flex flex-wrap gap-2">
          <input
            ref={input}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="sr-only"
            aria-label={`Scegli il file: ${titolo.toLowerCase()}`}
            onChange={(e) => {
              onFile(e.target.files?.[0]);
              // Lo stesso file scelto due volte di fila deve ripartire.
              e.target.value = "";
            }}
          />
          <Button size="sm" variant="outline" disabled={inCorso} onClick={() => input.current?.click()}>
            <Upload className="size-3.5" /> {inCorso ? "Carico…" : url ? "Cambia" : "Carica"}
          </Button>
          {url && (
            <Button size="sm" variant="ghost" disabled={inCorso} onClick={onTogli} aria-label={`Togli ${titolo.toLowerCase()}`}>
              <X className="size-3.5" /> Togli
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

function Scelta({
  attiva, onClick, titolo, testo, dato,
}: {
  attiva: boolean;
  onClick: () => void;
  titolo: string;
  testo: string;
  dato: ModoCopertina;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={attiva}
      onClick={onClick}
      data-immagini={`modo-${dato}`}
      className={cn(
        "rounded-lg border p-3 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-50",
        attiva ? "border-primary/60 bg-primary/5" : "hover:bg-muted/50",
      )}
    >
      <span className="block text-sm font-medium">{titolo}</span>
      <span className="mt-1 block text-[12.5px] leading-relaxed text-muted-foreground">{testo}</span>
    </button>
  );
}
