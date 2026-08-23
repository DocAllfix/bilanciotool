"use client";

import { aggiornaProfiloAction } from "@/features/anticorruzione/actions";
import { IMPEGNO_FUNZIONE, SI_NO } from "@/features/anticorruzione/validation";
import { CampoData, CampoScelta, CampoTesto } from "@/components/comune/campo";
import type { DatiAnticorruzione } from "./types";

// L'anagrafica del sistema, in cinque gruppi.
//
// Alimenta i segnaposto delle 12 procedure e dei 47 moduli del corpus: ciò che resta
// vuoto qui resta evidenziato là. È il motivo per cui ogni campo dice a cosa serve
// invece di limitarsi a chiedere un valore.

export function VistaOrganizzazione({ companyId, dati }: { companyId: string; dati: DatiAnticorruzione }) {
  const s = dati.sistema;
  const salva =
    (campo: string) =>
    (valore: string | null) =>
      aggiornaProfiloAction(companyId, s.id, { [campo]: valore ?? "" });

  return (
    <div className="space-y-8" data-tour="pc-organizzazione">
      <p className="text-sm text-muted-foreground">
        Questi dati alimentano i segnaposto delle 12 procedure e dei 47 moduli del sistema. Ciò che resta vuoto
        qui resta evidenziato nei documenti: è un promemoria, non un errore.
      </p>

      <Gruppo titolo="Identificazione">
        <CampoTesto id="pc-ragione" etichetta="Ragione sociale" valore={s.ragione} salva={salva("ragione")}
          aiuto="Sostituisce [Nome Organizzazione] nel corpus documentale" />
        <CampoTesto id="pc-forma" etichetta="Forma giuridica" valore={s.forma} salva={salva("forma")} />
        <CampoTesto id="pc-piva" etichetta="Partita IVA / C.F." valore={s.piva} salva={salva("piva")} />
        <CampoTesto id="pc-sede" etichetta="Sede legale" valore={s.sede} salva={salva("sede")} />
        <CampoTesto id="pc-settore" etichetta="Settore di attività" valore={s.settore} salva={salva("settore")} />
        <CampoTesto id="pc-addetti" etichetta="Numero di addetti" valore={s.addetti} salva={salva("addetti")} />
        <CampoTesto id="pc-paesi" etichetta="Paesi di operatività" valore={s.paesi} salva={salva("paesi")}
          aiuto="Concorrono alla determinazione del rischio di contesto" />
      </Gruppo>

      <Gruppo titolo="Governance">
        <CampoTesto id="pc-direzione" etichetta="Alta direzione / legale rappresentante" valore={s.direzione}
          salva={salva("direzione")} aiuto="Sostituisce [Alta Direzione]" />
        <CampoScelta id="pc-organo" etichetta="Esiste un organo di governo distinto dall'alta direzione?"
          valore={s.organoGov} opzioni={SI_NO} salva={salva("organoGov")}
          aiuto="In caso negativo, la sorveglianza è svolta dall'alta direzione e la circostanza va dichiarata" />
        <CampoTesto id="pc-organo-comp" etichetta="Composizione dell'organo di governo" valore={s.organoComp}
          multiriga salva={salva("organoComp")} />
        <CampoTesto id="pc-funzione" etichetta="Funzione per la prevenzione della corruzione" valore={s.funzionePc}
          salva={salva("funzionePc")} aiuto="Sostituisce [Funzione PC]" />
        <CampoScelta id="pc-funzione-impegno" etichetta="Impegno della funzione" valore={s.funzionePcImpegno}
          opzioni={IMPEGNO_FUNZIONE} salva={salva("funzionePcImpegno")} />
        {s.funzionePcImpegno === "Esternalizzata" && (
          <CampoTesto id="pc-funzione-dirigente" etichetta="Dirigente interno responsabile"
            valore={s.funzionePcDirigente} salva={salva("funzionePcDirigente")}
            aiuto="La responsabilità generale e l'autorità sulla funzione restano interne" />
        )}
        <CampoTesto id="pc-odv" etichetta="Organismo di vigilanza ex D.Lgs. 231/2001" valore={s.odv}
          salva={salva("odv")} aiuto="Se presente, vanno definiti i flussi informativi reciproci con la funzione" />
      </Gruppo>

      <Gruppo titolo="Esposizione">
        <CampoTesto id="pc-pu" etichetta="Natura e frequenza delle interazioni con pubblici ufficiali"
          valore={s.pubbliciUfficiali} multiriga salva={salva("pubbliciUfficiali")} />
      </Gruppo>

      <Gruppo titolo="Canale di segnalazione">
        <CampoTesto id="pc-canale-email" etichetta="Indirizzo di posta elettronica dedicato" valore={s.canaleEmail}
          salva={salva("canaleEmail")} />
        <CampoTesto id="pc-canale-url" etichetta="Piattaforma o modulo online" valore={s.canaleUrl}
          salva={salva("canaleUrl")} />
        <CampoTesto id="pc-canale-tel" etichetta="Recapito telefonico" valore={s.canaleTelefono}
          salva={salva("canaleTelefono")} />
        <CampoTesto id="pc-canale-terzo" etichetta="Gestore terzo, se previsto" valore={s.canaleTerzo}
          salva={salva("canaleTerzo")} />
        <CampoTesto id="pc-canale-lingue" etichetta="Lingue in cui il canale è disponibile" valore={s.canaleLingue}
          salva={salva("canaleLingue")} />
      </Gruppo>

      <Gruppo titolo="Campo di applicazione e revisione">
        <CampoTesto id="pc-scopo" etichetta="Campo di applicazione dichiarato" valore={s.scopo} multiriga
          salva={salva("scopo")} aiuto="Sedi, attività, processi e società incluse" />
        <CampoTesto id="pc-esclusioni" etichetta="Esclusioni e motivazione" valore={s.esclusioni} multiriga
          salva={salva("esclusioni")} />
        <CampoData id="pc-adozione" etichetta="Data di adozione del sistema" valore={s.dataAdozione}
          salva={salva("dataAdozione")} />
        <CampoTesto id="pc-revisione" etichetta="Revisione corrente" valore={s.revisione} salva={salva("revisione")} />
      </Gruppo>
    </div>
  );
}

function Gruppo({ titolo, children }: { titolo: string; children: React.ReactNode }) {
  return (
    <section aria-label={titolo}>
      <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">{titolo}</h2>
      <div className="mt-3 grid gap-4 rounded-xl border p-4 sm:grid-cols-2">{children}</div>
    </section>
  );
}
