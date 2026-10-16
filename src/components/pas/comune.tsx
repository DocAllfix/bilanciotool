"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Label } from "@/components/ui/label";
import { useCoda } from "@/lib/coda";
import {
  caricaPianoTipoAction,
  creaRigaAction,
  eliminaRigaAction,
  inserisciModelloPoliticaAction,
  setCampoRequisitoAction,
  setCampoRigaAction,
  setCampoSistemaAction,
  setContenutoPoliticaAction,
  setMisuraAction,
  setParametroAction,
} from "@/features/pas/actions";
import type { TipoRiga } from "@/features/pas/validation";
import type { DatiVistaPas } from "@/features/pas/vista";
import type { Esito } from "@/components/comune/percorso";

export type DatiPas = DatiVistaPas;

// I comandi del percorso, tutti dalla stessa CODA, come nel GDPR.
//
// ⚠️ Accodati, perché chi valuta novantotto requisiti preme in fretta: senza coda il
// ricalcolo dell'indice chiederebbe il totale mentre le ultime scritture sono in volo, e
// la pagina mostrerebbe un numero che non esiste (regola della Fase 13).
//
// ⚠️ Dopo ogni scrittura riuscita si rinfresca la pagina: i numeri — indice, derivati,
// segnali, età dei reclami — li calcola il server, e il browser non li ricalcola mai da sé.
export function usePas(companyId: string, systemId: string) {
  const router = useRouter();
  const { accoda } = useCoda();

  const esegui = async <T,>(f: () => Promise<{ ok: true; dati?: T } | { ok: false; errore: string }>): Promise<Esito & { dati?: T }> => {
    const e = await accoda(f);
    if (e.ok) router.refresh();
    return e;
  };

  return {
    sistema: (campo: string) => (v: unknown) => esegui(() => setCampoSistemaAction(companyId, systemId, campo, v ?? "")),
    parametro: (campo: string, v: number) => esegui(() => setParametroAction(companyId, systemId, campo, v)),
    contenuto: (chiave: string, acceso: boolean) => esegui(() => setContenutoPoliticaAction(companyId, systemId, chiave, acceso)),
    modelloPolitica: () => esegui(() => inserisciModelloPoliticaAction(companyId, systemId)),
    requisito: (key: string, campo: string) => (v: unknown) => esegui(() => setCampoRequisitoAction(companyId, systemId, key, campo, v ?? "")),
    misura: (anno: number, chiave: string) => (v: string | null) => esegui(() => setMisuraAction(companyId, systemId, anno, chiave, v ?? "")),
    crea: (tipo: TipoRiga) => esegui<string>(() => creaRigaAction(companyId, systemId, tipo)),
    riga: (tipo: TipoRiga, id: string, campo: string) => (v: unknown) => esegui(() => setCampoRigaAction(companyId, tipo, id, campo, v ?? "")),
    elimina: (tipo: TipoRiga, id: string) => esegui(() => eliminaRigaAction(companyId, tipo, id)),
    pianoTipo: () => esegui(() => caricaPianoTipoAction(companyId, systemId)),
  };
}

export type ComandiPas = ReturnType<typeof usePas>;

/**
 * Una voce di un elenco in cui ciò che si salva non è ciò che si legge: l'area «A6» si
 * mostra «A6 · Salute e sicurezza sul lavoro», l'ambito «F» come «Catena di fornitura».
 * `CampoScelta` salva l'etichetta così com'è, e qui non andrebbe bene.
 */
export function SceltaVoce({
  id,
  etichetta,
  valore,
  voci,
  vuoto = false,
  salva,
}: {
  id: string;
  etichetta: string;
  valore: string | null;
  voci: readonly { valore: string; nome: string }[];
  /** Ammette «nessuna scelta»: per i campi facoltativi. */
  vuoto?: boolean;
  salva: (v: unknown) => Promise<Esito>;
}) {
  const [scelto, setScelto] = useState(valore ?? "");
  const [errore, setErrore] = useState<string | null>(null);
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{etichetta}</Label>
      <select
        id={id}
        className="h-9 w-full rounded-md border bg-background px-2 text-sm"
        value={scelto}
        onChange={async (e) => {
          const v = e.currentTarget.value;
          const prima = scelto;
          setScelto(v);
          setErrore(null);
          const esito = await salva(v);
          if (!esito.ok) {
            setScelto(prima);
            setErrore(esito.errore);
          }
        }}
      >
        {vuoto && <option value="">—</option>}
        {voci.map((x) => (
          <option key={x.valore} value={x.valore}>
            {x.nome}
          </option>
        ))}
      </select>
      {errore && (
        <p className="text-[12px] text-destructive" role="alert">
          {errore}
        </p>
      )}
    </div>
  );
}

/** Le aree in cui stanno rischi e obiettivi: le undici dell'Allegato A più il sistema (C5). */
export function vociAree(dati: DatiPas, conSistema: boolean) {
  const g = dati.catalogo.gruppi;
  const allegato = g.filter((x) => x.natura === "allegato").map((x) => ({ valore: x.key, nome: `${x.key} · ${x.nome}` }));
  const c5 = g.find((x) => x.key === "C5");
  return conSistema && c5 ? [...allegato, { valore: "C5", nome: `C5 · ${c5.nome}` }] : allegato;
}

export const AMBITI_VOCI = [
  { valore: "O", nome: "Organizzazione" },
  { valore: "F", nome: "Catena di fornitura" },
] as const;
