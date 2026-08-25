"use client";

import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

// I campi che salvano DA SOLI, uno per volta. Condivisi da tutti i moduli.
//
// Stanno qui e non dentro un modulo perche' la domanda e' la stessa dappertutto: un
// campo che salva sfocandosi, una tendina che risponde subito, una data che si rifiuta
// se non e' una data. Scriverli una seconda volta significherebbe correggere due volte
// il prossimo difetto — ed e' gia' successo con la validazione delle date.
//
// Tre regole pagate da questo progetto, tutte e tre qui dentro:
//
// 1. **Mai la riga intera.** Ogni campo manda il proprio nome e il proprio valore. Gli
//    altri campi non passano dal browser, quindi non possono tornare indietro stantii —
//    è il difetto che ha azzerato la quantità salvando il costo, e l'impatto impostando
//    la rilevanza finanziaria.
// 2. **Comando ottimistico.** Tendine e interruttori mostrano subito la scelta e la
//    ripristinano se il server rifiuta: un comando che aspetta il viaggio di rete si
//    legge come rotto.
// 3. **Campo controllato quando qualcun altro può scrivere nello stesso stato.** Qui il
//    testo è NON controllato di proposito (salva sfocandosi), perché nessun altro
//    comando ne cambia il valore mentre lo si digita.

type Salva = (valore: string | null) => Promise<{ ok: true } | { ok: false; errore: string }>;

export function CampoTesto({
  id,
  etichetta,
  etichettaNascosta,
  valore,
  aiuto,
  multiriga,
  salva,
}: {
  id: string;
  etichetta: string;
  /** L'etichetta resta per i lettori di schermo e sparisce dallo schermo.
   *  ⚠️ Non e' la stessa cosa di un'etichetta vuota: quella lascerebbe il campo senza
   *  nome accessibile, ed e' un difetto gia' incontrato in questo progetto. */
  etichettaNascosta?: boolean;
  valore: string | null;
  aiuto?: string;
  multiriga?: boolean;
  salva: Salva;
}) {
  const [errore, setErrore] = useState<string | null>(null);
  const [salvato, setSalvato] = useState(false);

  async function invia(v: string) {
    if ((valore ?? "") === v) return;
    setErrore(null);
    const esito = await salva(v === "" ? null : v);
    if (!esito.ok) {
      setErrore(esito.errore);
      return;
    }
    setSalvato(true);
  }

  useEffect(() => {
    if (!salvato) return;
    const t = setTimeout(() => setSalvato(false), 1600);
    return () => clearTimeout(t);
  }, [salvato]);

  const Campo = multiriga ? Textarea : Input;
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className={etichettaNascosta ? "sr-only" : "flex items-center gap-2"}>
        {etichetta}
        {salvato && !etichettaNascosta && (
          <span className="text-[11px] font-normal text-success">salvato</span>
        )}
      </Label>
      <Campo
        id={id}
        name={id}
        defaultValue={valore ?? ""}
        aria-invalid={errore ? true : undefined}
        onBlur={(e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => invia(e.currentTarget.value)}
      />
      {aiuto && !errore && <p className="text-[12px] text-muted-foreground">{aiuto}</p>}
      {errore && (
        <p className="text-[12px] text-destructive" role="alert">
          {errore}
        </p>
      )}
    </div>
  );
}

export function CampoScelta({
  id,
  etichetta,
  valore,
  opzioni,
  aiuto,
  salva,
  etichettaNascosta,
}: {
  id: string;
  etichetta: string;
  valore: string | null;
  opzioni: readonly string[];
  aiuto?: string;
  salva: Salva;
  /**
   * L'etichetta esiste ma non si vede.
   *
   * ⚠️ Serve dove la domanda è già scritta accanto alla tendina — una riga di tabella,
   * una griglia di valutazione — e ripeterla sopra il campo raddoppierebbe il testo.
   * La tentazione è passare `etichetta=""`: quella però lascia il campo SENZA NOME
   * ACCESSIBILE, cioè una tendina che uno screen reader annuncia come «combobox» e
   * basta, e che nessun collaudo riesce a selezionare per nome. `sr-only` tiene il nome
   * e toglie l'ingombro.
   */
  etichettaNascosta?: boolean;
}) {
  // Stato locale = comando ottimistico. Il valore mostrato cambia al clic; se il server
  // rifiuta si torna a quello di prima, che è l'unica cosa che si sa essere vera.
  const [scelto, setScelto] = useState<string | null>(valore);
  const [errore, setErrore] = useState<string | null>(null);

  async function invia(v: string) {
    const nuovo = v === "__vuoto" ? null : v;
    const precedente = scelto;
    setScelto(nuovo);
    setErrore(null);
    const esito = await salva(nuovo);
    if (!esito.ok) {
      setScelto(precedente);
      setErrore(esito.errore);
    }
  }

  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className={etichettaNascosta ? "sr-only" : undefined}>
        {etichetta}
      </Label>
      <Select value={scelto ?? "__vuoto"} onValueChange={invia}>
        {/* `w-full`: senza, la tendina si stringe sul contenuto e accanto a un campo di
            testo a piena larghezza sembra un difetto di allineamento. */}
      <SelectTrigger id={id} className="w-full" aria-invalid={errore ? true : undefined}>
          <SelectValue placeholder="—" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="__vuoto">—</SelectItem>
          {opzioni.map((o) => (
            <SelectItem key={o} value={o}>
              {o}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {aiuto && !errore && <p className="text-[12px] text-muted-foreground">{aiuto}</p>}
      {errore && (
        <p className="text-[12px] text-destructive" role="alert">
          {errore}
        </p>
      )}
    </div>
  );
}

export function CampoData({
  id,
  etichetta,
  valore,
  aiuto,
  salva,
}: {
  id: string;
  etichetta: string;
  valore: string | null;
  aiuto?: string;
  salva: Salva;
}) {
  const [errore, setErrore] = useState<string | null>(null);
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{etichetta}</Label>
      <Input
        id={id}
        type="date"
        defaultValue={valore ?? ""}
        aria-invalid={errore ? true : undefined}
        onChange={async (e) => {
          const v = e.currentTarget.value;
          setErrore(null);
          const esito = await salva(v === "" ? null : v);
          if (!esito.ok) setErrore(esito.errore);
        }}
      />
      {aiuto && !errore && <p className="text-[12px] text-muted-foreground">{aiuto}</p>}
      {errore && (
        <p className="text-[12px] text-destructive" role="alert">
          {errore}
        </p>
      )}
    </div>
  );
}
