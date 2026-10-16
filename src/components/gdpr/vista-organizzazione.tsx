"use client";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { CampoParametro as Parametro } from "@/components/comune/percorso";
import { CampoData, CampoScelta, CampoTesto } from "@/components/comune/campo";
import { RUOLI_SISTEMA } from "@/features/gdpr/validation";
import { Intro, type ComandiGdpr, type DatiGdpr } from "./comune";

// Vista 1 — Organizzazione e ruoli. Il titolare, chi risponde per lui, e la domanda
// dell'art. 37: il responsabile della protezione dei dati è obbligatorio?
//
// ⚠️ Le tre domande dell'art. 37 sono ALTERNATIVE: basta un «Sì» perché la designazione
// sia obbligatoria. Con tutte e tre a «No» non è obbligatoria, ma resta possibile.

const SI_NO = ["Sì", "No"] as const;

const DOMANDE_DPO = [
  ["dpoA", "L'organizzazione è un'autorità pubblica o un organismo pubblico"],
  ["dpoB", "L'attività principale richiede il monitoraggio regolare e sistematico di persone su larga scala"],
  ["dpoC", "L'attività principale consiste nel trattare su larga scala categorie particolari di dati o dati giudiziari"],
] as const;

const ANAGRAFICA = [
  ["forma", "Forma giuridica"],
  ["piva", "Partita IVA"],
  ["sede", "Sede legale"],
  ["settore", "Settore di attività"],
  ["ateco", "Codice ATECO"],
  ["dipendenti", "Numero di dipendenti"],
] as const;

const RUOLI = [
  ["legale", "Legale rappresentante", "Chi firma per il titolare."],
  ["referente", "Referente interno per la privacy", "Chi coordina il lavoro: non è il responsabile della protezione dei dati."],
  ["contatto", "Recapito per gli interessati", "L'indirizzo a cui scrivere per esercitare i diritti."],
] as const;

export function VistaOrganizzazione({ dati, cmd }: { dati: DatiGdpr; cmd: ComandiGdpr }) {
  const s = dati.sistema;
  const id = (c: string) => `gdpr-org-${c}`;
  return (
    <div className="space-y-6">
      <Intro titolo="Organizzazione e ruoli">
        Chi è il titolare, chi risponde per lui e se ricorre l&apos;obbligo di designare un responsabile della protezione dei
        dati (art. 37). Ogni campo si salva quando lo lasci.
      </Intro>

      <Card>
        <CardHeader>
          <h3 className="text-[15px] font-semibold tracking-tight">Il titolare</h3>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          {ANAGRAFICA.map(([c, e]) => (
            <CampoTesto key={c} id={id(c)} etichetta={e} valore={s[c]} salva={cmd.sistema(c)} />
          ))}
          <div className="sm:col-span-2">
            <CampoTesto id={id("siti")} etichetta="Sedi e siti operativi" valore={s.siti} multiriga salva={cmd.sistema("siti")} />
          </div>
          <CampoScelta id={id("ruolo")} etichetta="Ruolo nel trattamento" valore={s.ruolo} opzioni={RUOLI_SISTEMA} salva={cmd.sistema("ruolo")} />
          <CampoScelta
            id={id("amministratori")}
            etichetta="Ci sono amministratori di sistema?"
            valore={s.amministratori}
            opzioni={SI_NO}
            aiuto="Se sì, il provvedimento del Garante del 2008 chiede designazione, elenco e verifica annuale."
            salva={cmd.sistema("amministratori")}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <h3 className="text-[15px] font-semibold tracking-tight">Ruoli interni</h3>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-3">
          {RUOLI.map(([c, e, a]) => (
            <CampoTesto key={c} id={id(c)} etichetta={e} valore={s[c]} aiuto={a} salva={cmd.sistema(c)} />
          ))}
        </CardContent>
      </Card>

      <Card data-tour="gdpr-dpo">
        <CardHeader>
          <h3 className="text-[15px] font-semibold tracking-tight">Responsabile della protezione dei dati (art. 37)</h3>
          <p className="text-sm text-muted-foreground" data-esito-dpo>
            {!dati.dpo.valutato
              ? "Rispondi alle tre domande: basta un «Sì» perché la designazione sia obbligatoria."
              : dati.dpo.obbligatorio
                ? dati.dpo.designato
                  ? "La designazione è obbligatoria, ed è stata fatta."
                  : "La designazione è obbligatoria e non risulta fatta."
                : "La designazione non è obbligatoria. Resta possibile su base volontaria."}
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {DOMANDE_DPO.map(([c, d]) => (
            <CampoScelta key={c} id={id(c)} etichetta={d} valore={s[c]} opzioni={SI_NO} salva={cmd.sistema(c)} />
          ))}
          <div className="grid gap-4 border-t pt-4 sm:grid-cols-3">
            <CampoTesto id={id("dpoNome")} etichetta="Responsabile designato" valore={s.dpoNome} salva={cmd.sistema("dpoNome")} />
            <CampoTesto id={id("dpoContatti")} etichetta="Dati di contatto" valore={s.dpoContatti} salva={cmd.sistema("dpoContatti")} />
            <CampoData
              id={id("dpoComunicatoIl")}
              etichetta="Comunicato al Garante il"
              valore={s.dpoComunicatoIl}
              salva={cmd.sistema("dpoComunicatoIl")}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <h3 className="text-[15px] font-semibold tracking-tight">Soglie di valutazione</h3>
          <p className="text-sm text-muted-foreground">
            Le soglie con cui il rischio (probabilità × gravità, da 1 a 25) diventa medio o alto, e il numero di criteri da cui
            la valutazione d&apos;impatto è necessaria. La soglia dei due criteri viene dalle Linee guida WP248; quelle del rischio sono un punto di partenza da adattare all&apos;organizzazione.
          </p>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-3">
          <Parametro id={id("paramAlto")} etichetta="Rischio alto da" valore={s.paramAlto} min={2} max={25} salva={(v) => cmd.parametro("paramAlto", v)} />
          <Parametro id={id("paramMedio")} etichetta="Rischio medio da" valore={s.paramMedio} min={1} max={24} salva={(v) => cmd.parametro("paramMedio", v)} />
          <Parametro
            id={id("paramSogliaDpia")}
            etichetta="Valutazione d'impatto da (criteri)"
            valore={s.paramSogliaDpia}
            min={1}
            max={9}
            salva={(v) => cmd.parametro("paramSogliaDpia", v)}
          />
        </CardContent>
      </Card>
    </div>
  );
}
