// L'assistente guidato: un percorso di domande, NON un modello.
//
// ⚠️ Scelta del committente (strada A). Un modello linguistico su queste risposte
// costerebbe a consumo e potrebbe inventare: qui le risposte sono scritte, e ogni ramo che
// non risolve finisce nello stesso posto — «apri una richiesta», con l'oggetto già
// compilato da dove si è arrivati. Un assistente che non sa dire «non lo so» è peggio di
// nessun assistente, perché chi lo ascolta poi non scrive.
//
// ⚠️ Le risposte NON ripetono la Guida: quella spiega i percorsi e i documenti, e si
// aggiorna da sola dal registro dei moduli. Qui stanno le domande che una persona fa
// quando qualcosa non va — l'accesso, il pagamento, un file che non arriva.
//
// Un `rimando` porta dove la risposta si vede davvero: mandare qualcuno a leggere una
// spiegazione senza il collegamento alla pagina è farlo cercare due volte.

export type VoceFaq = {
  /** Stabile: finisce nell'oggetto del ticket, e negli ancoraggi del collaudo. */
  id: string;
  domanda: string;
  risposta: string;
  rimando?: { etichetta: string; href: string };
};

export type CategoriaFaq = {
  id: string;
  titolo: string;
  /** Che problema ha in mano chi sceglie questa voce. */
  quando: string;
  voci: VoceFaq[];
};

export const FAQ: CategoriaFaq[] = [
  {
    id: "accesso",
    titolo: "Accesso e persone dello studio",
    quando: "Non riesci a entrare, o devi far entrare un collega",
    voci: [
      {
        id: "password",
        domanda: "Ho dimenticato la password",
        risposta:
          "Dalla pagina di accesso, il collegamento «Non la ricordi?» accanto al campo manda un'email con cui reimpostarla. Se l'email non arriva entro qualche minuto, controlla la posta indesiderata: il mittente è EvalisDeck.",
        rimando: { etichetta: "Reimposta la password", href: "/password-dimenticata" },
      },
      {
        id: "invito",
        domanda: "Come faccio entrare un collega nello studio",
        risposta:
          "Da Impostazioni → Membri si invita con l'indirizzo email. Il collega riceve un collegamento e, accettando, entra nel tuo studio invece di aprirne uno suo. Quante persone puoi invitare dipende dal piano, e il numero è scritto nella stessa pagina.",
        rimando: { etichetta: "Vai a Membri", href: "/impostazioni/membri" },
      },
      {
        id: "collega-non-vede",
        domanda: "Il mio collega non vede le aziende su cui lavoro",
        risposta:
          "Le aziende sono dello studio e si vedono fra colleghi: se non compaiono, quasi sempre il collega si è registrato per conto suo invece di accettare l'invito, e si ritrova in uno studio tutto suo. Si risolve invitandolo di nuovo e facendogli accettare l'invito con quell'indirizzo.",
        rimando: { etichetta: "Vai a Membri", href: "/impostazioni/membri" },
      },
    ],
  },
  {
    id: "abbonamento",
    titolo: "Abbonamento e fatture",
    quando: "Riguarda il pagamento, il rinnovo o la fattura",
    voci: [
      {
        id: "fattura",
        domanda: "Dove trovo la fattura o la ricevuta",
        risposta:
          "In Impostazioni → Abbonamento, il pulsante che apre il portale dei pagamenti porta a fatture, ricevute, metodo di pagamento e dati fiscali. La fattura elettronica viene emessa con la partita IVA e il codice destinatario che hai indicato all'acquisto.",
        rimando: { etichetta: "Vai all'abbonamento", href: "/impostazioni/abbonamento" },
      },
      {
        id: "sola-lettura",
        domanda: "Il mio account è in sola lettura",
        risposta:
          "Succede quando il rinnovo non è andato a buon fine o l'abbonamento è scaduto. I dati restano tutti e i documenti già pubblicati restano scaricabili: torna tutto scrivibile appena il pagamento va a buon fine. Se la carta è stata rifiutata, aggiornarla di solito basta.",
        rimando: { etichetta: "Vai all'abbonamento", href: "/impostazioni/abbonamento" },
      },
      {
        id: "capienza",
        domanda: "Ho finito le aziende del piano",
        risposta:
          "Le aziende archiviate e quella dimostrativa non contano. Se le aziende vere hanno riempito la capienza, si aggiunge un blocco da cinque: scrivici da qui e ti diciamo come, perché a metà anno l'acquisto tocca l'abbonamento in corso e lo facciamo noi.",
        rimando: { etichetta: "Vedi la capienza usata", href: "/impostazioni/abbonamento" },
      },
    ],
  },
  {
    id: "documenti",
    titolo: "Documenti e PDF",
    quando: "Un documento non si genera, o è sbagliato",
    voci: [
      {
        id: "pdf-non-arriva",
        domanda: "Il PDF non si scarica",
        risposta:
          "Il PDF si genera solo da un documento pubblicato, e la prima volta può richiedere qualche decina di secondi. Se resti in attesa a lungo o ricevi un errore, riprova una volta: se non arriva neanche al secondo tentativo, aprici una richiesta indicando azienda e documento, così lo guardiamo dai nostri registri.",
        rimando: { etichetta: "Vai ai documenti", href: "/documenti" },
      },
      {
        id: "documento-sbagliato",
        domanda: "Ho pubblicato un documento con un dato sbagliato",
        risposta:
          "Un documento pubblicato non si modifica: è congelato apposta, perché è la copia consegnata al cliente. Correggi il dato nel percorso e pubblica di nuovo: ottieni la versione successiva, e la precedente resta consultabile. Al cliente si consegna l'ultima.",
      },
      {
        id: "marchio",
        domanda: "I documenti portano il marchio sbagliato",
        risposta:
          "Il marchio si sceglie una volta sola, al momento della pubblicazione, e resta congelato in quel documento. Se l'estensione white-label è stata attivata dopo, i documenti pubblicati prima restano com'erano: ripubblicandoli prendono il marchio nuovo.",
      },
    ],
  },
  {
    id: "dati",
    titolo: "Dati, calcoli e percorsi",
    quando: "Un numero non torna, o non sai dove mettere un dato",
    voci: [
      {
        id: "numero-non-torna",
        domanda: "Un totale non corrisponde a quello che mi aspetto",
        risposta:
          "Ogni percorso mostra da dove viene il numero: nell'inventario il fattore applicato è scritto sulla riga, nel bilancio le emissioni arrivano dall'inventario e non si riscrivono. Se il totale resta diverso da quello che ti aspetti, scrivici indicando azienda, esercizio e la riga: guardiamo insieme il calcolo.",
      },
      {
        id: "dove-metto",
        domanda: "Non so in quale percorso mettere un dato",
        risposta:
          "La Guida elenca tutti i percorsi con la norma di riferimento e il documento che producono: quasi sempre la risposta è lì. I corsi della Formazione spiegano lo stesso in forma di lezione, con la voce.",
        rimando: { etichetta: "Apri la Guida", href: "/guida" },
      },
      {
        id: "importare",
        domanda: "Posso importare i dati di un prototipo o di un altro anno",
        risposta:
          "Sì: l'inventario e il bilancio importano il file JSON dei prototipi, e i dati di attività si copiano dall'esercizio precedente con le quantità azzerate, così la struttura non si rifà a mano ogni anno.",
      },
    ],
  },
];

/** Una voce dal suo identificativo, per precompilare l'oggetto della richiesta. */
export function vocePerId(id: string): { categoria: CategoriaFaq; voce: VoceFaq } | null {
  for (const c of FAQ) {
    const v = c.voci.find((x) => x.id === id);
    if (v) return { categoria: c, voce: v };
  }
  return null;
}
