import type { Metadata } from "next";
import Link from "next/link";
import { PaginaLegale, Sezione } from "@/components/landing/pagina-legale";
import { TITOLARE, SEDE_COMPLETA, LIMITI_PIANO } from "@/lib/legale";

export const metadata: Metadata = {
  title: "Termini e condizioni",
  description:
    "Condizioni d'uso di EvalisDeck: abbonamento, prezzi, rinnovo, recesso e rimborsi, proprietà dei dati, natura dei documenti prodotti.",
};

export default function TerminiPage() {
  return (
    <PaginaLegale
      titolo="Termini e condizioni"
      sottotitolo="Condizioni che regolano l'uso della piattaforma EvalisDeck e la sottoscrizione dell'abbonamento."
    >
      <Sezione n={1} titolo="Oggetto e soggetti">
        <p>
          <strong>{TITOLARE.ragioneSociale}</strong>, con sede in {SEDE_COMPLETA}, partita IVA {TITOLARE.partitaIva} (di
          seguito «il fornitore»), mette a disposizione EvalisDeck: una piattaforma in abbonamento che guida la
          redazione di documenti di rendicontazione ambientale, energetica, sociale e di sicurezza delle informazioni, e
          ne produce versioni impaginate e conservate.
        </p>
        <p>
          Il servizio si rivolge in via principale a <strong>studi di consulenza, professionisti e imprese</strong>{" "}che
          operano nell&apos;esercizio della propria attività. Dove una disposizione riguardi soltanto chi agisce come{" "}
          <strong>consumatore</strong>{" "}ai sensi del Codice del consumo, è indicato espressamente.
        </p>
      </Sezione>

      <Sezione n={2} titolo="Registrazione e account">
        <p>
          L&apos;uso della piattaforma richiede la creazione di un account con dati veritieri e aggiornati. Le
          credenziali sono personali e non cedibili: il cliente è responsabile della loro custodia e delle attività
          compiute con esse, e deve segnalare senza ritardo qualunque accesso non autorizzato.
        </p>
        <p>
          A ogni registrazione corrisponde uno <strong>studio</strong>, cioè lo spazio di lavoro isolato che contiene le
          aziende rendicontate. L&apos;amministratore dello studio può invitare altri utenti entro i limiti indicati
          alla sezione 8 e ne risponde come propri incaricati.
        </p>
      </Sezione>

      <Sezione n={3} titolo="Modalità dimostrativa">
        <p>
          Alla registrazione l&apos;account si trova in <strong>modalità dimostrativa</strong>: dà accesso a
          un&apos;azienda di esempio già compilata per valutare il servizio, senza obbligo di acquisto e senza che sia
          richiesto un metodo di pagamento.
        </p>
        <p>
          In modalità dimostrativa non è possibile creare aziende proprie né pubblicare documenti. La limitazione è
          applicata dal server e non è aggirabile agendo sull&apos;interfaccia.
        </p>
      </Sezione>

      <Sezione n={4} titolo="Prezzi, pagamenti e fatturazione">
        <p>
          I prezzi in vigore sono quelli esposti al momento dell&apos;acquisto, espressi in euro e{" "}
          <strong>al netto dell&apos;IVA</strong>, che è calcolata ed evidenziata in modo trasparente al momento del
          pagamento secondo l&apos;aliquota di legge e i dati fiscali forniti.
        </p>
        <p>
          L&apos;abbonamento è per studio, comprensivo di tutte le funzioni: non ci sono componenti aggiuntivi a
          pagamento né costi per singolo documento prodotto. La{" "}
          <strong>prima annualità comprende l&apos;avviamento</strong>{" "}(configurazione dello studio, contenuti
          metodologici, assistenza all&apos;avvio); le annualità successive si rinnovano a un canone ridotto.
        </p>
        <p>
          I pagamenti sono gestiti da un fornitore specializzato: il fornitore del servizio non tratta né conserva i
          numeri completi delle carte. La fattura è emessa e resa disponibile in formato elettronico.
        </p>
      </Sezione>

      <Sezione n={5} titolo="Durata, rinnovo automatico e disdetta">
        <p>
          L&apos;abbonamento ha durata annuale e si <strong>rinnova automaticamente</strong>{" "}alla scadenza, al canone di
          rinnovo in vigore, salvo disdetta. Un avviso di rinnovo con l&apos;importo che sarà addebitato è inviato per
          posta elettronica <strong>prima</strong>{" "}della scadenza.
        </p>
        <p>
          La disdetta si esercita in ogni momento dall&apos;area di gestione dell&apos;abbonamento, senza penali e senza
          obbligo di motivazione, e ha effetto dalla scadenza in corso: il servizio resta pienamente utilizzabile fino a
          quel giorno.
        </p>
        <p>
          In caso di mancato pagamento, l&apos;account passa in <strong>sola lettura</strong>{" "}dopo i tentativi di
          incasso previsti. I dati non vengono cancellati e restano consultabili ed esportabili: la cessazione del
          rapporto non comporta in alcun caso la perdita del lavoro svolto.
        </p>
      </Sezione>

      <Sezione n={6} titolo="Diritto di recesso (consumatori)">
        <p>
          Chi acquista in qualità di <strong>consumatore</strong>{" "}ha diritto di recedere entro{" "}
          <strong>quattordici giorni</strong>{" "}dalla conclusione del contratto, senza doverne indicare il motivo,
          scrivendo a <a href={`mailto:${TITOLARE.email}`}>{TITOLARE.email}</a>{" "}o utilizzando il modulo tipo di cui
          all&apos;allegato I, parte B, del Codice del consumo.
        </p>
        <p>
          Chiedendo l&apos;attivazione immediata del servizio, il consumatore accetta che l&apos;esecuzione cominci
          prima della scadenza del termine. In caso di recesso successivo all&apos;attivazione è dovuto un importo{" "}
          <strong>proporzionale al servizio già fruito</strong>{" "}fino alla comunicazione del recesso, ai sensi
          dell&apos;articolo 57, comma 3, del Codice del consumo. La quota di avviamento, una volta eseguita la
          prestazione, resta dovuta.
        </p>
        <p>
          Il diritto di recesso non spetta a chi acquista nell&apos;esercizio della propria attività professionale o
          d&apos;impresa. Per costoro vale quanto previsto alla sezione seguente.
        </p>
      </Sezione>

      <Sezione n={7} titolo="Rimborsi">
        <p>
          Oltre a quanto previsto dalla legge, il fornitore riconosce a <strong>tutti i clienti</strong>, consumatori e
          professionisti, una garanzia commerciale di ripensamento:
        </p>
        <ul>
          <li>
            <strong>Rimborso integrale entro quattordici giorni</strong>{" "}dal primo pagamento, a condizione che{" "}
            <strong>non sia stato pubblicato alcun documento</strong>. La pubblicazione è il momento in cui il servizio
            consegna il proprio risultato, e resta registrata in modo verificabile: è quindi il criterio, oggettivo e
            controllabile da entrambe le parti, che segna il passaggio da prova a utilizzo.
          </li>
          <li>
            <strong>Dopo la pubblicazione del primo documento</strong>, o trascorsi i quattordici giorni, il canone
            dell&apos;annualità in corso non è rimborsabile, salvo i casi indicati di seguito. Resta ferma la facoltà di
            disdetta per l&apos;annualità successiva.
          </li>
          <li>
            <strong>Rimborso proporzionale</strong>{" "}ai giorni non fruiti quando il servizio risulti indisponibile per
            causa imputabile al fornitore per un periodo continuativo superiore a settantadue ore, o quando un difetto
            documentato impedisca l&apos;uso della piattaforma e non venga rimosso in un tempo ragionevole dalla
            segnalazione.
          </li>
          <li>
            <strong>Rimborso integrale</strong>{" "}del rinnovo addebitato per errore, o in mancanza del preavviso di
            rinnovo previsto alla sezione 5, se richiesto entro trenta giorni dall&apos;addebito.
          </li>
        </ul>
        <p>
          Le richieste si inviano a <a href={`mailto:${TITOLARE.email}`}>{TITOLARE.email}</a>. Il rimborso è disposto
          entro quattordici giorni dall&apos;accoglimento della richiesta e con lo stesso mezzo di pagamento usato per
          l&apos;acquisto, salvo diverso accordo. Il rimborso comporta la cessazione dell&apos;abbonamento e il
          passaggio dell&apos;account in sola lettura; i documenti eventualmente già pubblicati restano disponibili al
          cliente.
        </p>
      </Sezione>

      <Sezione n={8} titolo="Limiti d'uso del piano">
        <p>
          L&apos;abbonamento consente fino a <strong>{LIMITI_PIANO.aziendeAttive} aziende attive</strong>{" "}e{" "}
          <strong>{LIMITI_PIANO.membri} utenti</strong>{" "}per studio. Le aziende archiviate non concorrono al limite e
          restano consultabili in sola lettura; l&apos;azienda dimostrativa è esclusa dal conteggio.
        </p>
        <p>
          Sono limiti tecnici volti a preservare la qualità del servizio, non barriere commerciali: chi abbia necessità
          superiori può concordare condizioni diverse scrivendo ai contatti indicati.
        </p>
        {/* ⚠️ Che cosa NON e' limitato si dice, invece di lasciarlo scoprire. Un limite
            taciuto e' un limite che il cliente incontra il giorno in cui gli serve. */}
        <p>
          <strong>Non sono soggetti a limite</strong>{" "}i percorsi di lavoro attivabili su ciascuna azienda, i
          documenti pubblicati, le voci di agenda e i compensi registrati: si contano le aziende e gli utenti, non il
          lavoro che ci si fa sopra.
        </p>
      </Sezione>

      <Sezione n={9} titolo="Obblighi del cliente">
        <p>Il cliente si impegna a:</p>
        <ul>
          <li>
            inserire dati di cui abbia la disponibilità e il diritto di trattare, avendo assolto verso gli interessati
            gli obblighi informativi che gli competono in qualità di titolare (si veda la{" "}
            <Link href="/privacy">informativa sulla privacy</Link>, sezione 2);
          </li>
          <li>
            non utilizzare la piattaforma per finalità illecite, non tentare di aggirarne i controlli di accesso, non
            sottoporla a prove di carico o di sicurezza senza autorizzazione scritta;
          </li>
          <li>non rivendere né concedere in uso a terzi l&apos;accesso al proprio studio.</li>
        </ul>
        <p>
          La violazione grave di questi obblighi consente al fornitore di sospendere l&apos;account, previo avviso salvo
          i casi di urgenza, mantenendo comunque al cliente l&apos;accesso in lettura ai propri dati per consentirne
          l&apos;esportazione.
        </p>
      </Sezione>

      <Sezione n={10} titolo="Proprietà dei dati e dei documenti">
        <p>
          <strong>I dati inseriti e i documenti prodotti appartengono al cliente.</strong>{" "}Il fornitore non ne acquista
          alcun diritto, non li utilizza per finalità proprie, non li comunica a terzi e non li impiega per addestrare
          sistemi di intelligenza artificiale.
        </p>
        <p>
          I documenti pubblicati sono conservati in <strong>versioni immutabili</strong>: una volta pubblicata, una
          versione non è modificabile nemmeno dal fornitore, ed è questa la garanzia che il documento consegnato resti
          nel tempo identico a sé stesso. Una revisione produce sempre una versione nuova, numerata, che non sostituisce
          la precedente.
        </p>
        <p>
          Il cliente può esportare i propri dati e scaricare i documenti in qualunque momento, anche quando
          l&apos;account si trovi in sola lettura.
        </p>
      </Sezione>

      <Sezione n={11} titolo="Proprietà intellettuale del fornitore">
        <p>
          Il software, l&apos;interfaccia, i marchi e i contenuti metodologici incorporati nella piattaforma (guide,
          registri, cataloghi di indicatori, modelli di documento) restano di proprietà del fornitore o dei rispettivi
          titolari. L&apos;abbonamento concede una licenza d&apos;uso non esclusiva, non trasferibile e limitata alla
          durata del rapporto.
        </p>
        <p>
          I riferimenti a norme tecniche e a standard di rendicontazione appartengono ai rispettivi enti: la piattaforma
          ne applica i requisiti, ma non ne distribuisce il testo, che va acquisito dalle fonti ufficiali.
        </p>
        {/* ⚠️ Le due frasi qui sotto sono l'unica difesa che vale davanti a un giudice.
            Senza, il colophon sui documenti e la pagina pubblica di verifica sono
            deterrenza senza sanzione: dicono da dove viene un documento, ma non dicono
            che cosa il cliente ha comprato il diritto di farne. */}
        <p>
          <strong>Perimetro della licenza.</strong>{" "}Il corpus documentale — procedure, modulistica, registri e i
          documenti che la piattaforma produce — è licenziato per le <strong>aziende del portafoglio dell&apos;Utente</strong>,
          cioè quelle che l&apos;Utente rendiconta con il proprio abbonamento e nei limiti di capacità del piano
          sottoscritto. Non è licenziato per aziende seguite da altri studi, né per un numero di aziende superiore a
          quello previsto dal piano.
        </p>
        <p>
          <strong>Che cosa si può fare, e che cosa no.</strong>{" "}I documenti prodotti si consegnano ai propri clienti,
          nella forma in cui la piattaforma li emette, e restano dell&apos;Utente e del suo cliente anche dopo la
          cessazione del rapporto. <strong>Non si rivendono, non si cedono e non si distribuiscono come modelli,
          template o basi documentali</strong> a soggetti terzi, né a titolo oneroso né gratuito: sarebbe la
          distribuzione del contenuto metodologico, che non è oggetto della licenza.
        </p>
        <p>
          <strong>La cessazione non retroagisce.</strong>{" "}Alla fine del rapporto l&apos;Utente perde il diritto di
          produrre documenti nuovi e di accedere agli aggiornamenti del corpus, ma <strong>non perde i documenti già
          consegnati</strong>: quelli restano validi presso i destinatari, e la pagina pubblica di verifica continua a
          confermarne l&apos;emissione. È il principio che il prodotto applica già ai dati: si perde il diritto di
          scrivere, non il lavoro fatto.
        </p>
        <p>
          <strong>Il contenuto è datato.</strong>{" "}Il corpus e i contenuti metodologici sono versionati per edizione, e
          l&apos;edizione con cui un documento è stato prodotto è indicata nel documento stesso. Le norme si aggiornano:
          un documento redatto su un&apos;edizione superata resta autentico, ma non è per questo aggiornato, e la
          piattaforma non garantisce la conformità di contenuti prodotti su edizioni non più correnti.
        </p>
      </Sezione>

      <Sezione n={12} titolo="Natura dei documenti prodotti">
        <p>
          È una precisazione doverosa. EvalisDeck è uno <strong>strumento professionale di supporto</strong>: applica i
          requisiti delle norme di riferimento, esegue i calcoli e impagina il risultato, ma{" "}
          <strong>la correttezza dei documenti dipende dai dati inseriti</strong>{" "}e resta responsabilità del
          professionista o dell&apos;organizzazione che li sottoscrive.
        </p>
        <p>
          I documenti prodotti non costituiscono certificazione, non derivano da verifica ispettiva di parte terza e non
          sono rilasciati sotto accreditamento. Il fornitore non garantisce l&apos;esito di verifiche, audit o controlli
          condotti da soggetti terzi.
        </p>
      </Sezione>

      <Sezione n={13} titolo="Disponibilità del servizio e responsabilità">
        <p>
          Il fornitore si adopera per garantire la continuità del servizio, che può essere sospeso per manutenzioni
          programmate, comunicate quando possibile con ragionevole preavviso, o per cause non imputabili al fornitore
          stesso.
        </p>
        <p>
          Nei rapporti con clienti professionali, la responsabilità del fornitore per danni diretti è limitata
          all&apos;importo corrisposto per l&apos;annualità nel corso della quale il fatto si è verificato; sono esclusi
          i danni indiretti, la perdita di profitto e la perdita di opportunità commerciali. Nulla in questa clausola
          limita la responsabilità per dolo o colpa grave, né i diritti inderogabili riconosciuti ai consumatori.
        </p>
      </Sezione>

      <Sezione n={14} titolo="Trattamento dei dati personali">
        <p>
          Il trattamento è descritto nell&apos;<Link href="/privacy">informativa sulla privacy</Link>. Per i dati che il
          cliente carica sulle proprie aziende, il fornitore agisce quale <strong>responsabile del trattamento</strong>{" "}
          ai sensi dell&apos;articolo 28 del GDPR: il relativo accordo (DPA) è parte integrante di questi termini e può
          essere richiesto in copia firmata ai contatti indicati.
        </p>
      </Sezione>

      <Sezione n={15} titolo="Modifiche ai termini">
        <p>
          I termini possono essere aggiornati per esigenze di servizio o di legge. Le modifiche sostanziali sono
          comunicate ai clienti attivi con almeno <strong>trenta giorni</strong>{" "}di preavviso e si applicano dal rinnovo
          successivo; chi non intenda accettarle può disdire senza oneri entro tale termine.
        </p>
      </Sezione>

      <Sezione n={16} titolo="Legge applicabile e foro competente">
        <p>
          Il contratto è regolato dalla <strong>legge italiana</strong>. Per le controversie con clienti professionali è
          competente in via esclusiva il <strong>foro di Napoli Nord</strong>. Per le controversie con i consumatori è
          competente il giudice del luogo di residenza o domicilio elettivo del consumatore, se situato in Italia.
        </p>
        <p>
          Il consumatore può inoltre ricorrere alla piattaforma europea di risoluzione delle controversie online,
          raggiungibile dal sito della Commissione europea.
        </p>
      </Sezione>
    </PaginaLegale>
  );
}
