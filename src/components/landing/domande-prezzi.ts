import { PIANI, euro, prezzoDiVendita, fasceConsulenti, costoAnnuoMensile, risparmioAnnuo } from "@/lib/prezzi";

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

type K = keyof typeof PIANI;
const anno = (k: K) => euro(prezzoDiVendita(PIANI[k], "anno")!.importo);
const mese = (k: K) => euro(prezzoDiVendita(PIANI[k], "mese")!.importo);

/** «a, b e c». */
function elenco(voci: string[]): string {
  return voci.length < 2 ? voci.join("") : `${voci.slice(0, -1).join(", ")} e ${voci.at(-1)}`;
}

const interna = PIANI.azienda;
const consulenti = fasceConsulenti();
const capienza = (k: K) => `fino a ${PIANI[k].aziende} aziende`;

export const DOMANDE_PREZZI: [string, string][] = [
  [
    "Quanto costa, e da cosa dipende?",
    `Per l'azienda che fa da sé c'è il piano «${interna.nome}»: ${anno("azienda")} l'anno oppure ${mese("azienda")} ` +
      `al mese, una sola azienda, la tua, e ${interna.accessi} accessi per i colleghi. Per i consulenti: ` +
      `${elenco(consulenti.map((k) => `${anno(k)} l'anno o ${mese(k)} al mese per ${capienza(k)}`))}. ` +
      `IVA esclusa. Si paga per azienda seguita, non per documento e non per utente: il contenuto è identico in ` +
      `ogni piano.`,
  ],
  [
    "Meglio l'annuale o il mensile?",
    `L'annuale costa meno: con «${interna.nome}» dodici mesi di mensile fanno ${euro(costoAnnuoMensile(interna)!)}, ` +
      `l'annuale ${anno("azienda")}, cioè ${euro(risparmioAnnuo(interna)!)} risparmiati. Il mensile serve a chi ` +
      `vuole partire senza impegnarsi per un anno: si disdice quando vuoi, e si passa all'annuale in ogni momento ` +
      `dalla pagina dell'abbonamento, scalando la parte di mese già pagata.`,
  ],
  [
    "Il secondo anno costa uguale?",
    `Sì: il prezzo è lo stesso a ogni rinnovo, ${elenco([interna.nome, ...consulenti.map((k) => PIANI[k].nome)].map(
      (n, i) => `${[anno("azienda"), ...consulenti.map(anno)][i]} l'anno per «${n}»`,
    ))}. Il rinnovo è automatico, e si disdice da solo dalla pagina dell'abbonamento fino al giorno prima.`,
  ],
  [
    "Che cosa è compreso in ogni piano?",
    "Tutti i percorsi, quelli di oggi e quelli che rilasceremo durante il tuo abbonamento. I documenti che " +
      "pubblichi, senza limite di numero. Gli accessi per i colleghi. Il portale da cui chi deve leggere i " +
      "documenti li scarica senza account. I documenti col tuo marchio. Gli aggiornamenti delle librerie dei " +
      "fattori di emissione. Non ci sono moduli a pagamento separato né funzioni riservate ai piani più cari.",
  ],
  [
    "Lavoro dentro un'azienda, non per clienti. Fa per me?",
    `Sì: è il piano «${interna.nome}». Gestisci una sola azienda, la tua, con ${interna.accessi} accessi per i ` +
      `colleghi. Chi amministra assegna a ciascuno i percorsi di cui si occupa, per esempio l'inventario GHG ` +
      `all'ufficio ambiente e la protezione dei dati al referente privacy: ognuno vede e modifica soltanto i ` +
      `suoi. Percorsi e documenti sono gli stessi degli altri piani.`,
  ],
  [
    "Cosa succede se supero le aziende del mio piano?",
    `La piattaforma te lo segnala prima che accada, e si passa al piano più capiente; oltre le 30 aziende c'è ` +
      `${PIANI.enterprise.nome}, con condizioni concordate. Nessun lavoro si blocca e nulla va rifatto.`,
  ],
  [
    "Posso vedere il prodotto prima di pagare?",
    "Sì, e non serve la carta. La registrazione è gratuita e trovi un'azienda d'esempio già compilata: puoi " +
      "percorrere tutti i moduli, modificare i dati e vedere i calcoli cambiare. L'abbonamento si attiva da " +
      "dentro, quando hai deciso, senza rifare niente.",
  ],
  [
    "Come si paga? E la fattura?",
    "Con carta, e con gli altri metodi che la pagina di pagamento ti propone. Al pagamento raccogliamo partita " +
      "IVA e codice destinatario, così la fattura si emette senza doverti rincorrere dopo. Se ti serve un ordine " +
      "d'acquisto o il bonifico, scrivici indicando il piano e ti mandiamo il preventivo.",
  ],
  [
    "E se cambio idea?",
    "Finché non hai pubblicato il primo documento e non sono passati quattordici giorni dal primo pagamento, il " +
      "rimborso è integrale, annuale o mensile che sia. Se disdici, l'account resta attivo fino alla fine del " +
      "periodo pagato e poi passa in sola lettura: i dati restano tuoi, consultabili ed esportabili.",
  ],
  [
    "Seguo più di 30 aziende. C'è un piano per me?",
    `Sì, ${PIANI.enterprise.nome}, e si concorda: gruppi societari, reti di studi e capofila con molti fornitori ` +
      `hanno esigenze diverse fra loro, e un listino unico servirebbe male tutti. Scrivici dal modulo in fondo ai ` +
      `piani e prepariamo un'offerta.`,
  ],
];
