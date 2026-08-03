import { chiaveControllo, type Controllo, type Decisione, type EsitoSoa } from "./scoring";

// Verifiche di coerenza della Dichiarazione di Applicabilità.
//
// Sono i rilievi che un organismo di certificazione muove per primi. Ogni
// verifica restituisce l'elenco degli identificativi coinvolti, così
// l'interfaccia può portare l'utente esattamente dove serve.

export type RuoloPrivacy = "titolare" | "responsabile" | "entrambi" | "nessuno";
export type RuoloCloud = "cliente" | "fornitore" | "entrambi" | "nessuno";

export type Rilievo = {
  key: string;
  titolo: string;
  spiegazione: string;
  controlli: string[];
};

export function checkControlli(
  esito: EsitoSoa,
  decisioni: Record<string, Decisione | undefined>,
): Rilievo[] {
  const dec = (c: Controllo) => decisioni[chiaveControllo(c.frameworkKey, c.controlloId)];
  const applicabile = (c: Controllo) => dec(c)?.applicabile !== false;
  const id = (c: Controllo) => c.controlloId;
  const vuoto = (s: string | null | undefined) => !(s ?? "").trim();

  const rilievi: Rilievo[] = [
    {
      key: "esclusioni_senza_giustificazione",
      titolo: "Esclusioni prive di giustificazione",
      spiegazione:
        "La Dichiarazione deve motivare ogni controllo escluso. Senza motivazione l'organismo di certificazione rileva una non conformità.",
      controlli: esito.inAmbito.filter((c) => !applicabile(c) && vuoto(dec(c)?.giustificazione)).map(id),
    },
    {
      key: "inclusioni_senza_motivazione",
      titolo: "Controlli applicabili senza motivazione di inclusione",
      spiegazione:
        "Indica perché il controllo è stato selezionato: valutazione del rischio, obbligo legale, obbligo contrattuale, requisito di business o buona prassi.",
      controlli: esito.inAmbito.filter((c) => applicabile(c) && (dec(c)?.motivazioni?.length ?? 0) === 0).map(id),
    },
    {
      key: "attuati_senza_documento",
      titolo: "Controlli dichiarati attuati senza riferimento documentale",
      spiegazione:
        "Lo stato di attuazione va sostenuto da un documento o da una registrazione reperibile: è la prima cosa che viene chiesta in audit.",
      controlli: esito.inAmbito
        .filter((c) => applicabile(c) && ["at", "av"].includes(dec(c)?.stato ?? "") && vuoto(dec(c)?.riferimentoDoc))
        .map(id),
    },
    {
      key: "senza_stato",
      titolo: "Controlli applicabili senza stato di attuazione",
      spiegazione:
        "Assegna lo stato: finché resta vuoto il controllo pesa zero sull'indice, perché per un auditor un presidio non dichiarato è un presidio non attuato.",
      controlli: esito.inAmbito.filter((c) => applicabile(c) && !dec(c)?.stato).map(id),
    },
    {
      key: "senza_responsabile",
      titolo: "Controlli applicabili senza responsabile",
      spiegazione: "Ogni controllo selezionato ha bisogno di un presidio nominato.",
      controlli: esito.inAmbito.filter((c) => applicabile(c) && vuoto(dec(c)?.responsabile)).map(id),
    },
  ];

  return rilievi.filter((r) => r.controlli.length > 0);
}

export type AvvisoProfilo = { key: string; messaggio: string };

/** Coerenza fra il profilo dichiarato e i moduli attivati.
 *
 *  DIFETTO DEL PROTOTIPO CORRETTO QUI: gli avvisi si basavano su espressioni
 *  regolari applicate a testo libero, e `/cloud/i` corrispondeva anche a
 *  "Nessun servizio cloud". L'avviso "il profilo dichiara uso di servizi cloud"
 *  compariva quindi proprio a chi aveva dichiarato di non usarne, e non c'era
 *  modo di farlo sparire. Con i ruoli come enum chiusi il confronto è per
 *  valore, e l'esaustività la controlla il compilatore. */
export function checkProfilo(input: {
  ruoloPrivacy: RuoloPrivacy;
  ruoloCloud: RuoloCloud;
  moduliAttivi: Record<string, boolean>;
  scope: string | null | undefined;
  approvato: string | null | undefined;
}): AvvisoProfilo[] {
  const { ruoloPrivacy, ruoloCloud, moduliAttivi: m } = input;
  const avvisi: AvvisoProfilo[] = [];

  const usaCloud = ruoloCloud === "cliente" || ruoloCloud === "fornitore" || ruoloCloud === "entrambi";
  if (usaCloud && !m["27017"]) {
    avvisi.push({
      key: "cloud_senza_27017",
      messaggio: "Il profilo dichiara l'uso di servizi cloud ma il modulo ISO/IEC 27017 non è attivo.",
    });
  }

  const fornisceCloud = ruoloCloud === "fornitore" || ruoloCloud === "entrambi";
  if (fornisceCloud && !m["27018"]) {
    avvisi.push({
      key: "fornitore_senza_27018",
      messaggio:
        "Il profilo dichiara il ruolo di fornitore cloud: valuta ISO/IEC 27018 se tratti dati personali per conto dei clienti.",
    });
  }

  const titolare = ruoloPrivacy === "titolare" || ruoloPrivacy === "entrambi";
  if (titolare && !m["27701A"]) {
    avvisi.push({
      key: "titolare_senza_27701a",
      messaggio: "Il profilo indica il ruolo di titolare ma l'Allegato A della ISO/IEC 27701 non è attivo.",
    });
  }

  const responsabile = ruoloPrivacy === "responsabile" || ruoloPrivacy === "entrambi";
  if (responsabile && !m["27701B"]) {
    avvisi.push({
      key: "responsabile_senza_27701b",
      messaggio: "Il profilo indica il ruolo di responsabile ma l'Allegato B della ISO/IEC 27701 non è attivo.",
    });
  }

  // Il contrario vale altrettanto: un modulo acceso senza il ruolo che lo
  // giustifica gonfia la Dichiarazione di controlli che non servono.
  if (!titolare && !responsabile && (m["27701A"] || m["27701B"])) {
    avvisi.push({
      key: "pims_senza_ruolo",
      messaggio:
        "I moduli ISO/IEC 27701 sono attivi ma il profilo dichiara di non trattare dati personali: la Dichiarazione elenca controlli che nessun rischio giustifica.",
    });
  }

  if (!(input.scope ?? "").trim()) {
    avvisi.push({
      key: "scope_mancante",
      messaggio: "Il campo di applicazione del sistema di gestione non è compilato: è la prima cosa che l'auditor legge.",
    });
  }
  if (!(input.approvato ?? "").trim()) {
    avvisi.push({
      key: "approvazione_mancante",
      messaggio: "Manca il nominativo di chi approva la Dichiarazione di Applicabilità.",
    });
  }

  return avvisi;
}
