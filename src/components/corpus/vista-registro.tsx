"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { aggiornaRigaAction, aggiungiRigaAction, eliminaRigaAction } from "@/features/corpus/actions";
import type { ColonnaRegistro, RigaRegistro, VoceRegistro } from "@/features/corpus/letture";

// Un registro del corpus: la tabella e la scheda della singola registrazione.
//
// ⚠️ DUE SUPERFICI, non una. La tabella mostra le sole colonne marcate `inTabella` — un
// registro ne ha fino a diciotto, e diciotto colonne in una riga non si leggono; la
// scheda mostra tutto. È la stessa scelta del prototipo, e non è estetica: la tabella
// serve a trovare la riga, la scheda a compilarla.
//
// ⚠️ Ogni campo salva DA SOLO, e l'azione RIFIUTA un aggiornamento con più di un campo.
// Qui il rischio è al massimo: diciotto campi sulla stessa schermata, e rimandare la riga
// intera da props stantie azzererebbe quelli toccati un attimo prima. È il difetto che
// questo progetto ha gia' pagato tre volte.

export function VistaRegistro({
  companyId,
  contentSetId,
  rotta,
  registro,
  colonne,
  righe,
  tornaA,
  /** Colonna calcolata: la mostra il modulo, che sa come si calcola. */
  calcolata,
  superato,
}: {
  companyId: string;
  contentSetId: string;
  /** La rotta da rivalidare e su cui restare. La conosce il modulo, non il corpus. */
  rotta: string;
  registro: VoceRegistro;
  colonne: readonly ColonnaRegistro[];
  righe: readonly RigaRegistro[];
  tornaA: string;
  calcolata?: { etichetta: string; valore: (dati: Record<string, unknown>) => string | null };
  /**
   * Il registro è superato da un modulo più specifico: sola lettura, col rimando.
   *
   * ⚠️ Il comando «Nuova registrazione» SPARISCE, non si limita a spegnersi. Un pulsante
   * disabilitato dice «forse più tardi»; qui la risposta è «mai più, e si fa di là».
   * Vedi `features/corpus/registri-superati.ts`.
   */
  superato?: { rotta: string; motivo: string };
}) {
  const router = useRouter();
  const [apertaId, setApertaId] = useState<string | null>(null);
  const [errore, setErrore] = useState<string | null>(null);
  const [inCorso, setInCorso] = useState(false);

  const inTabella = colonne.filter((c) => c.inTabella);
  const aperta = righe.find((r) => r.id === apertaId) ?? null;

  async function aggiungi() {
    setErrore(null);
    setInCorso(true);
    const esito = await aggiungiRigaAction(rotta, { companyId, contentSetId, registerId: registro.registerId, dati: {} });
    setInCorso(false);
    if (!esito.ok) { setErrore(esito.errore); return; }
    setApertaId(esito.dati!.id);
    // Dopo aver creato qualcosa si va verso quel qualcosa: qui la scheda si apre da sola,
    // e il refresh serve solo a far comparire la riga nella tabella sotto.
    setTimeout(() => router.refresh(), 0);
  }

  async function elimina(rowId: string) {
    setErrore(null);
    const esito = await eliminaRigaAction(rotta, companyId, rowId);
    if (!esito.ok) { setErrore(esito.errore); return; }
    if (apertaId === rowId) setApertaId(null);
    setTimeout(() => router.refresh(), 0);
  }

  return (
    <div className="space-y-5" data-tour="corpus-registro">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href={tornaA}
          className="inline-flex items-center gap-1.5 text-[13px] text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" /> Tutti i registri
        </Link>
        {superato ? (
          <Link
            href={superato.rotta}
            className="inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-[13px] font-medium"
            data-slot="vai-al-modulo"
          >
            Apri il modulo Gestione delle segnalazioni
          </Link>
        ) : (
          <Button size="sm" onClick={aggiungi} disabled={inCorso} data-tour="corpus-nuova-riga">
            <Plus className="size-4" /> {inCorso ? "Creazione…" : "Nuova registrazione"}
          </Button>
        )}
      </div>

      <div>
        <h2 className="font-display text-xl font-semibold">{registro.nome}</h2>
        <p className="mt-0.5 text-[12px] text-muted-foreground">
          {[registro.descrizione, registro.modCode, registro.proCode].filter(Boolean).join(" · ")}
        </p>
      </div>

      {superato && (
        <div
          className="rounded-xl border p-4"
          style={{ borderColor: "var(--warning)" }}
          data-slot="registro-superato"
        >
          <p className="text-[13px] font-medium" style={{ color: "var(--warning)" }}>
            Questo registro è di sola lettura
          </p>
          <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">{superato.motivo}</p>
        </div>
      )}

      {errore && (
        <p className="text-[13px] text-destructive" role="alert">
          {errore}
        </p>
      )}

      {righe.length === 0 ? (
        <p className="rounded-xl border px-4 py-8 text-center text-[13px] text-muted-foreground">
          Nessuna registrazione. Il registro è previsto dalla procedura {registro.proCode ?? "di riferimento"}:
          finché resta vuoto, l&apos;evidenza che quella procedura è applicata non esiste.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-xl border">
          <table className="w-full text-[13px]">
            <thead className="border-b bg-muted/40">
              <tr>
                <th className="px-3 py-2 text-left font-medium" style={{ width: "56px" }}>
                  N.
                </th>
                {inTabella.map((c) => (
                  <th
                    key={c.chiave}
                    className="px-3 py-2 text-left font-medium"
                    style={c.larghezza ? { width: c.larghezza } : undefined}
                  >
                    {c.etichetta}
                  </th>
                ))}
                {calcolata && <th className="px-3 py-2 text-left font-medium">{calcolata.etichetta}</th>}
                <th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody>
              {righe.map((r) => (
                <tr key={r.id} className="border-b last:border-0" data-slot="riga-registro">
                  <td className="px-3 py-2 font-mono tabular-nums">{r.riferimento ?? r.numero}</td>
                  {inTabella.map((c) => (
                    <td key={c.chiave} className="px-3 py-2 align-top">
                      <span className="line-clamp-2">{String(r.dati[c.chiave] ?? "")}</span>
                    </td>
                  ))}
                  {calcolata && (
                    <td className="px-3 py-2">
                      {calcolata.valore(r.dati) ?? <span className="text-muted-foreground">—</span>}
                    </td>
                  )}
                  <td className="px-3 py-2 text-right">
                    <button
                      className="text-[12px] underline underline-offset-2"
                      onClick={() => setApertaId(apertaId === r.id ? null : r.id)}
                      aria-expanded={apertaId === r.id}
                    >
                      {apertaId === r.id ? "Chiudi" : "Apri"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {aperta && (
        <SchedaRiga
          key={aperta.id}
          companyId={companyId}
          rotta={rotta}
          colonne={colonne}
          riga={aperta}
          onElimina={() => elimina(aperta.id)}
        />
      )}
    </div>
  );
}

function SchedaRiga({
  companyId,
  rotta,
  colonne,
  riga,
  onElimina,
}: {
  companyId: string;
  rotta: string;
  colonne: readonly ColonnaRegistro[];
  riga: RigaRegistro;
  onElimina: () => void;
}) {
  const [conferma, setConferma] = useState(false);

  return (
    <div className="rounded-xl border p-4" data-slot="scheda-riga">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <p className="font-mono text-[13px] font-semibold">{riga.riferimento ?? `N. ${riga.numero}`}</p>
        {conferma ? (
          <span className="flex flex-wrap items-center gap-2">
            <span className="text-[12px] text-muted-foreground">Eliminare questa registrazione?</span>
            <Button variant="destructive" size="sm" onClick={onElimina}>
              Elimina
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setConferma(false)}>
              Annulla
            </Button>
          </span>
        ) : (
          <Button variant="ghost" size="sm" onClick={() => setConferma(true)}>
            Elimina
          </Button>
        )}
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {colonne.map((c) => (
          <CampoRiga
            key={c.chiave}
            companyId={companyId}
            rotta={rotta}
            rowId={riga.id}
            colonna={c}
            valore={riga.dati[c.chiave] == null ? "" : String(riga.dati[c.chiave])}
          />
        ))}
      </div>
    </div>
  );
}

/**
 * Un campo di una registrazione.
 *
 * ⚠️ Manda SOLO la propria chiave. Gli altri campi non passano dal browser, quindi non
 * possono tornare indietro stantii — e l'azione rifiuta comunque una mappa con più di una
 * chiave, così la regola è meccanica invece che affidata all'attenzione.
 *
 * ⚠️ Il campo di testo è NON controllato (salva sfocandosi) e la tendina è controllata
 * con stato locale: sono le stesse due scelte di `components/comune/campo.tsx`, per la
 * stessa ragione — una tendina che aspetta il viaggio di rete si legge come rotta.
 */
function CampoRiga({
  companyId,
  rotta,
  rowId,
  colonna,
  valore,
}: {
  companyId: string;
  rotta: string;
  rowId: string;
  colonna: ColonnaRegistro;
  valore: string;
}) {
  const [scelto, setScelto] = useState(valore);
  const [errore, setErrore] = useState<string | null>(null);
  const id = `reg-${rowId}-${colonna.chiave}`;

  async function salva(v: string) {
    setErrore(null);
    const esito = await aggiornaRigaAction(rotta, { companyId, rowId, dati: { [colonna.chiave]: v } });
    if (!esito.ok) setErrore(esito.errore);
    return esito.ok;
  }

  async function scegli(v: string) {
    const nuovo = v === "__vuoto" ? "" : v;
    const precedente = scelto;
    setScelto(nuovo);
    if (!(await salva(nuovo))) setScelto(precedente);
  }

  const larga = colonna.tipo === "ta";

  return (
    <div className={`space-y-1.5${larga ? " sm:col-span-2" : ""}`}>
      <Label htmlFor={id}>{colonna.etichetta}</Label>

      {colonna.tipo === "sel" ? (
        <Select value={scelto || "__vuoto"} onValueChange={scegli}>
          <SelectTrigger id={id} className="w-full" aria-invalid={errore ? true : undefined}>
            <SelectValue placeholder="—" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__vuoto">—</SelectItem>
            {(colonna.opzioni ?? []).map((o) => (
              <SelectItem key={o} value={o}>
                {o}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : colonna.tipo === "ta" ? (
        <Textarea id={id} defaultValue={valore} onBlur={(e) => salva(e.target.value)} rows={3} />
      ) : (
        <Input
          id={id}
          type={colonna.tipo === "date" ? "date" : colonna.tipo === "num" ? "number" : "text"}
          defaultValue={valore}
          onBlur={(e) => salva(e.target.value)}
          aria-invalid={errore ? true : undefined}
        />
      )}

      {colonna.hint && !errore && <p className="text-[12px] text-muted-foreground">{colonna.hint}</p>}
      {errore && (
        <p className="text-[12px] text-destructive" role="alert">
          {errore}
        </p>
      )}
    </div>
  );
}
