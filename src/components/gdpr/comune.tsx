"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCoda } from "@/lib/coda";
import {
  aggiungiTrattamentoTipoAction,
  caricaDocumentiTipoAction,
  caricaPianoTipoAction,
  creaRigaAction,
  eliminaRigaAction,
  inserisciModelloPoliticaAction,
  setCampoRequisitoAction,
  setCampoRigaAction,
  setCampoSistemaAction,
  setContenutoPoliticaAction,
  setCriterioAction,
  setMisuraAction,
  setParametroAction,
} from "@/features/gdpr/actions";
import type { TipoRiga } from "@/features/gdpr/validation";
import type { DatiVistaGdpr } from "@/features/gdpr/vista";
import type { Esito } from "@/components/comune/percorso";

// I pezzi comuni (casella, intestazione, plurali) stanno in `components/comune/percorso.tsx`,
// condivisi col sistema di gestione sociale: si riesportano perché le viste li prendono da qui.
export { CampoCasella, Intro, pct, pl, type Esito } from "@/components/comune/percorso";

export type DatiGdpr = DatiVistaGdpr;

// I comandi del percorso, tutti dalla stessa CODA.
//
// ⚠️ Accodati, perché chi valuta novantanove requisiti preme in fretta: senza coda il
// ricalcolo dell'indice chiederebbe il totale mentre le ultime scritture sono in volo, e
// la pagina mostrerebbe un numero che non esiste (regola della Fase 13).
//
// ⚠️ Dopo ogni scrittura riuscita si rinfresca la pagina: i numeri — scadenze, indice,
// segnali — li calcola il server, e il browser non li ricalcola mai da sé.
export function useGdpr(companyId: string, systemId: string) {
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
    criterio: (id: string, chiave: string, acceso: boolean) => esegui(() => setCriterioAction(companyId, id, chiave, acceso)),
    trattamentoTipo: (key: string) => esegui<string | null>(() => aggiungiTrattamentoTipoAction(companyId, systemId, key)),
    documentiTipo: () => esegui(() => caricaDocumentiTipoAction(companyId, systemId)),
    pianoTipo: () => esegui(() => caricaPianoTipoAction(companyId, systemId)),
  };
}

export type ComandiGdpr = ReturnType<typeof useGdpr>;

/**
 * Data e ora in ORA ITALIANA. Il valore va e torna nel formato del campo
 * (`AAAA-MM-GGThh:mm`): la conversione la fa il server, con le regole dell'ora legale.
 */
export function CampoIstante({
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
  salva: (v: string | null) => Promise<Esito>;
}) {
  const [errore, setErrore] = useState<string | null>(null);
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{etichetta}</Label>
      <Input
        id={id}
        type="datetime-local"
        defaultValue={valore ?? ""}
        aria-invalid={errore ? true : undefined}
        onBlur={async (e) => {
          const v = e.currentTarget.value;
          if ((valore ?? "") === v) return;
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
