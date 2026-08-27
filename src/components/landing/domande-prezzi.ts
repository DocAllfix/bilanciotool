import { ESTENSIONI, PIANI, euro, prezzoDiVendita } from "@/lib/prezzi";

// Le domande sui prezzi, con le risposte vere.
//
// ⚠️ Stanno in un modulo SENZA "use client", come `domande.ts`: le legge anche la pagina,
// che è un componente server. Importare dati da un file client non restituisce l'elenco
// ma un riferimento al componente, e il build si ferma con «map is not a function».
//
// ⚠️ E gli importi si DERIVANO dal listino invece di essere scritti a mano. Una risposta
// che ripete un prezzo è una seconda verità sullo stesso numero, e quella che diverge è
// sempre quella che nessuno rilegge — mentre è proprio quella che finisce nei risultati
// di ricerca, perché queste risposte alimentano anche i dati strutturati.

const anno1 = (k: keyof typeof PIANI) => euro(prezzoDiVendita(PIANI[k], "anno1")!.importo);
const rinnovo = (k: keyof typeof PIANI) => euro(prezzoDiVendita(PIANI[k], "rinnovo")!.importo);

export const DOMANDE_PREZZI: [string, string][] = [
  [
    "Quanto costa, e da cosa dipende?",
    `L'abbonamento è annuale e si sottoscrive per studio, non per documento e non per utente. ` +
      `Si parte da ${anno1("professional")} l'anno per seguire fino a ${PIANI.professional.aziende} aziende, ` +
      `${anno1("studio")} fino a ${PIANI.studio.aziende} e ${anno1("studio_plus")} fino a ${PIANI.studio_plus.aziende}. ` +
      `IVA esclusa. L'unica cosa che scegli è la capienza del portafoglio: il contenuto è identico in ogni fascia.`,
  ],
  [
    "Che cosa è compreso in ogni fascia?",
    "Tutti i percorsi, quelli di oggi e quelli che rilasceremo durante il tuo abbonamento. I documenti che " +
      "pubblichi, senza limite di numero. Gli accessi per le persone del tuo studio. Il portale da cui ogni tuo " +
      "cliente consulta e scarica i propri documenti. I documenti col marchio del tuo studio. Gli aggiornamenti " +
      "delle librerie dei fattori di emissione. Non ci sono moduli a pagamento separato né funzioni riservate " +
      "alle fasce superiori.",
  ],
  [
    "Il secondo anno costa uguale?",
    `No, costa il 20% in meno: ${rinnovo("professional")}, ${rinnovo("studio")} e ${rinnovo("studio_plus")} ` +
      `secondo la fascia. Il rinnovo è automatico e si disdice fino al giorno prima della scadenza.`,
  ],
  [
    "Cosa succede se supero le aziende della mia fascia?",
    `La piattaforma te lo segnala prima che accada. Puoi aggiungere blocchi da ` +
      `${ESTENSIONI.bloccoAziende.aziende} aziende a ${euro(ESTENSIONI.bloccoAziende.prezzo)} l'anno ciascuno, ` +
      `oppure scriverci per passare alla fascia superiore. Nessun lavoro si blocca e nulla va rifatto.`,
  ],
  [
    "Posso vedere il prodotto prima di pagare?",
    "Sì, e non serve la carta. La registrazione è gratuita e trovi un'azienda d'esempio già compilata: puoi " +
      "percorrere tutti i moduli, modificare i dati e vedere i calcoli cambiare. L'abbonamento si attiva da " +
      "dentro, quando hai deciso, senza rifare niente.",
  ],
  [
    "Come si paga? E la fattura?",
    "Con carta, Satispay, Klarna o Amazon Pay. Al pagamento raccogliamo partita IVA e codice destinatario, " +
      "così la fattura elettronica parte senza doverti rincorrere dopo. Se ti serve un ordine d'acquisto o il " +
      "bonifico, scrivici indicando la fascia e ti mandiamo il preventivo.",
  ],
  [
    "E se cambio idea?",
    "Finché non hai pubblicato il primo documento e non sono passati quattordici giorni dall'attivazione, il " +
      "rimborso è integrale. Se non rinnovi, l'account passa in sola lettura: i dati restano tuoi, consultabili " +
      "ed esportabili. Non cancelliamo il lavoro di nessuno.",
  ],
  [
    "Seguo più di 30 aziende. C'è una fascia per me?",
    `Sì, ma si concorda: reti di studi, mandati di filiera e capofila con molti fornitori hanno esigenze ` +
      `diverse fra loro, e un listino unico servirebbe male tutti. Scrivici e prepariamo un preventivo.`,
  ],
];
