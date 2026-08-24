"use client";

import { VistaProcedure } from "./vista-procedure";
import { VistaDocumento } from "./vista-documento";
import { VistaRegistri } from "./vista-registri";
import { VistaRegistro } from "./vista-registro";
import type { ColonnaRegistro, DocumentoCorpus, RigaRegistro, VoceCorpus, VoceRegistro } from "@/features/corpus/letture";

// L'innesto del corpus dentro un modulo: UN punto solo, non tre viste per modulo.
//
// ⚠️ I sei moduli di conformità hanno tutti le stesse tre viste — Procedure, Modulistica,
// Registri — e nei prototipi sono codice ricopiato sei volte. Qui si scrivono una volta:
// il modulo passa i dati che ha letto e la propria rotta, e riceve la vista giusta.
//
// La navigazione sta nei parametri d'indirizzo (`?vista=procedure&doc=PAC-01`) e non in
// rotte nuove: la vista si manda a un collega, sopravvive al tasto indietro, e un modulo
// nuovo non deve creare tre cartelle per averla.

export type VistaCorpus = "procedure" | "moduli" | "registri";

export type DatiCorpus = {
  procedure: VoceCorpus[];
  moduli: VoceCorpus[];
  registri: VoceRegistro[];
  /** Presente solo quando l'indirizzo chiede un documento. */
  documento?: DocumentoCorpus | null;
  /** Presente solo quando l'indirizzo chiede un registro. */
  registro?: { registro: VoceRegistro; colonne: ColonnaRegistro[]; righe: RigaRegistro[] } | null;
  /**
   * I registri superati da un modulo piu' specifico, per `mod_code`.
   *
   * ⚠️ Oggi ce n'e' uno solo per modulo, ed e' il registro delle segnalazioni del 231 e
   * della ISO 37001: quando il modulo Gestione delle segnalazioni e' attivo, quei due
   * diventano di sola lettura col rimando al fascicolo. Vedi `registri-superati.ts`.
   */
  superati?: Record<string, { rotta: string; motivo: string }>;
};

export function SezioneCorpus({
  companyId,
  contentSetId,
  vista,
  rotta,
  dati,
  calcolata,
}: {
  companyId: string;
  contentSetId: string;
  vista: VistaCorpus;
  /** L'indirizzo della pagina del modulo, senza parametri. */
  rotta: string;
  dati: DatiCorpus;
  /** La colonna calcolata di un registro, quando il modulo ne ha una. */
  calcolata?: Record<string, { etichetta: string; valore: (dati: Record<string, unknown>) => string | null }>;
}) {
  const indirizzo = (p: Record<string, string>) =>
    `${rotta}?${new URLSearchParams({ vista, ...p }).toString()}`;
  const elenco = `${rotta}?vista=${vista}`;

  if (vista === "registri") {
    if (dati.registro) {
      return (
        <VistaRegistro
          companyId={companyId}
          contentSetId={contentSetId}
          rotta={`${elenco}&reg=${dati.registro.registro.registerId}`}
          registro={dati.registro.registro}
          colonne={dati.registro.colonne}
          righe={dati.registro.righe}
          tornaA={elenco}
          calcolata={calcolata?.[dati.registro.registro.registerId]}
          superato={dati.registro.registro.modCode ? dati.superati?.[dati.registro.registro.modCode] : undefined}
        />
      );
    }
    return <VistaRegistri registri={dati.registri} href={(id) => indirizzo({ reg: id })} superati={dati.superati ?? {}} />;
  }

  if (dati.documento) {
    return (
      <VistaDocumento
        companyId={companyId}
        rotta={`${elenco}&doc=${dati.documento.documento.code}`}
        dati={dati.documento}
        tornaA={elenco}
      />
    );
  }

  return (
    <VistaProcedure
      voci={vista === "procedure" ? dati.procedure : dati.moduli}
      tipo={vista === "procedure" ? "procedura" : "modulo"}
      href={(code) => indirizzo({ doc: code })}
    />
  );
}

/**
 * Le tre voci di navigazione, coi loro contatori.
 *
 * Stanno qui e non in ogni shell perché sono le stesse in tutti i moduli: scriverle sei
 * volte significherebbe, alla prima correzione, correggerne cinque.
 */
export function vociCorpus(dati: DatiCorpus) {
  const approvate = dati.procedure.filter((p) => p.stato === "approvato").length;
  const registrazioni = dati.registri.reduce((a, r) => a + r.righe, 0);
  return [
    { k: "procedure" as const, n: "Procedure", contatore: `${approvate}/${dati.procedure.length}` },
    { k: "moduli" as const, n: "Modulistica", contatore: String(dati.moduli.length) },
    { k: "registri" as const, n: "Registri", contatore: String(registrazioni) },
  ];
}
