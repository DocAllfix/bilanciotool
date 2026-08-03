import type { Metadata } from "next";
import Link from "next/link";
import { PaginaLegale, Sezione, TabellaLegale } from "@/components/landing/pagina-legale";
import { TITOLARE, SEDE_COMPLETA, FORNITORI } from "@/lib/legale";

export const metadata: Metadata = {
  title: "Informativa sulla privacy",
  description:
    "Come EvalisDeck tratta i dati: titolare, ruoli, finalità e basi giuridiche, conservazione, fornitori, diritti dell'interessato.",
};

export default function PrivacyPage() {
  return (
    <PaginaLegale
      titolo="Informativa sulla privacy"
      sottotitolo="Resa ai sensi degli articoli 13 e 14 del Regolamento (UE) 2016/679 (GDPR) a chi utilizza il sito e la piattaforma EvalisDeck."
    >
      <Sezione n={1} titolo="Titolare del trattamento">
        <p>
          Il titolare del trattamento è <strong>{TITOLARE.ragioneSociale}</strong>, con sede legale in {SEDE_COMPLETA},
          partita IVA {TITOLARE.partitaIva}.
        </p>
        <p>
          Per qualunque richiesta relativa ai dati personali, compreso l&apos;esercizio dei diritti descritti alla
          sezione 9, si scrive a <a href={`mailto:${TITOLARE.email}`}>{TITOLARE.email}</a>.
        </p>
      </Sezione>

      <Sezione n={2} titolo="Due ruoli distinti: i dati tuoi e i dati dei tuoi clienti">
        <p>
          È la parte più importante di questa informativa, perché EvalisDeck è uno strumento professionale: chi lo usa
          vi inserisce dati che riguardano <strong>altre organizzazioni</strong>, le aziende clienti che rendiconta.
        </p>
        <ul>
          <li>
            <strong>Dati del tuo account e del tuo studio</strong>{" "}(nome, indirizzo email, credenziali, dati di
            fatturazione, registro delle operazioni): qui {TITOLARE.ragioneSociale} agisce come{" "}
            <strong>titolare del trattamento</strong>.
          </li>
          <li>
            <strong>Dati che carichi sulle aziende clienti</strong>{" "}(anagrafiche, consumi, dati di attività, indicatori,
            testi e immagini dei documenti): il titolare del trattamento sei <strong>tu</strong>, o l&apos;azienda per
            conto della quale operi. {TITOLARE.ragioneSociale} agisce come <strong>responsabile del trattamento</strong>{" "}
            ai sensi dell&apos;articolo 28 del GDPR, e tratta quei dati soltanto per erogare il servizio e secondo le
            tue istruzioni.
          </li>
        </ul>
        <p>
          La disciplina di questo secondo rapporto è contenuta nell&apos;accordo sul trattamento dei dati (DPA), che
          costituisce parte integrante dei <Link href="/termini">termini e condizioni</Link> e può essere richiesto in
          copia firmata scrivendo a <a href={`mailto:${TITOLARE.email}`}>{TITOLARE.email}</a>.
        </p>
        <p>
          Una conseguenza pratica: se una persona di una tua azienda cliente chiede di accedere ai propri dati o di
          cancellarli, la richiesta va rivolta a chi è titolare, cioè a te. Ti assistiamo nel darvi seguito, ma non
          possiamo rispondere al posto tuo.
        </p>
      </Sezione>

      <Sezione n={3} titolo="Categorie di dati trattati">
        <ul>
          <li>
            <strong>Dati di registrazione e di account</strong>: nome e cognome, indirizzo email, password (conservata
            esclusivamente sotto forma di impronta crittografica, mai in chiaro), nome dello studio, ruolo assegnato.
          </li>
          <li>
            <strong>Dati di utilizzo del servizio</strong>: registro delle operazioni compiute sui dati (chi ha fatto
            cosa e quando), stato di avanzamento dei percorsi, versioni dei documenti pubblicati.
          </li>
          <li>
            <strong>Contenuti caricati</strong>: dati delle aziende rendicontate, valori inseriti nei percorsi, testi
            redatti, immagini e loghi caricati. Sono i dati per i quali vale la sezione 2.
          </li>
          <li>
            <strong>Dati tecnici</strong>: indirizzo IP, tipo di browser, data e ora delle richieste, registrati dai
            fornitori di infrastruttura per finalità di sicurezza e diagnostica.
          </li>
          <li>
            <strong>Dati di pagamento</strong>: gestiti direttamente dal fornitore di pagamento indicato alla sezione 6.
            Non trattiamo né conserviamo i numeri completi delle carte.
          </li>
        </ul>
        <p>
          Non chiediamo e non trattiamo consapevolmente <strong>categorie particolari di dati</strong>{" "}(articolo 9 del
          GDPR). Il servizio non è rivolto ai minori.
        </p>
      </Sezione>

      <Sezione n={4} titolo="Finalità e basi giuridiche">
        <TabellaLegale
          intestazioni={["Finalità", "Base giuridica"]}
          righe={[
            [
              "Creazione dell'account, erogazione della piattaforma, generazione e conservazione dei documenti",
              "Esecuzione del contratto (art. 6.1.b)",
            ],
            [
              "Comunicazioni di servizio: verifica dell'indirizzo, reimpostazione della password, inviti, avvisi sullo stato dell'abbonamento",
              "Esecuzione del contratto (art. 6.1.b)",
            ],
            ["Incasso dei pagamenti, fatturazione e adempimenti fiscali e contabili", "Obbligo legale (art. 6.1.c)"],
            [
              "Sicurezza della piattaforma, prevenzione degli abusi, registro delle operazioni",
              "Legittimo interesse a proteggere il servizio e i dati che ospita (art. 6.1.f)",
            ],
            [
              "Assistenza e risposta alle richieste inviate ai nostri contatti",
              "Esecuzione del contratto o legittimo interesse a rispondere (art. 6.1.b / 6.1.f)",
            ],
          ]}
        />
        <p>
          <strong>Non svolgiamo attività di profilazione</strong>{" "}né processi decisionali automatizzati che producano
          effetti giuridici. Non inviamo comunicazioni commerciali non richieste e non cediamo né vendiamo dati a terzi.
          I contenuti che carichi <strong>non vengono usati per addestrare sistemi di intelligenza artificiale</strong>:
          la piattaforma non ne impiega.
        </p>
      </Sezione>

      <Sezione n={5} titolo="Periodo di conservazione">
        <ul>
          <li>
            <strong>Dati dell&apos;account</strong>: per tutta la durata del rapporto. Alla cessazione, l&apos;account
            passa in sola lettura e i dati restano consultabili ed esportabili; vengono cancellati o resi anonimi entro
            dodici mesi dalla richiesta di chiusura, salvo obblighi di legge.
          </li>
          <li>
            <strong>Documenti pubblicati</strong>: per tutta la durata del rapporto. Sono versioni immutabili per
            costruzione: sono la prova di ciò che è stato consegnato, e non possono essere modificate nemmeno da noi.
          </li>
          <li>
            <strong>Registro delle operazioni</strong>: ventiquattro mesi, per finalità di sicurezza e ricostruzione
            degli eventi.
          </li>
          <li>
            <strong>Documenti fiscali e contabili</strong>: dieci anni, come previsto dall&apos;articolo 2220 del codice
            civile.
          </li>
        </ul>
      </Sezione>

      <Sezione n={6} titolo="Destinatari e responsabili esterni">
        <p>
          I dati sono accessibili al personale autorizzato del titolare e ai fornitori qui elencati, nominati
          responsabili del trattamento ai sensi dell&apos;articolo 28 del GDPR. Nessun altro soggetto vi accede.
        </p>
        <TabellaLegale
          intestazioni={["Fornitore", "Attività svolta", "Dove"]}
          righe={FORNITORI.map((f) => [
            <span key="nome">
              {f.nome}
              {!f.attivo && (
                <span className="block text-[12px] text-muted-foreground">attivo dall&apos;apertura commerciale</span>
              )}
            </span>,
            f.ruolo,
            f.dove,
          ])}
        />
        <p>
          L&apos;elenco è aggiornato quando un fornitore viene aggiunto o sostituito. I dati possono inoltre essere
          comunicati ad autorità pubbliche quando la legge lo imponga.
        </p>
      </Sezione>

      <Sezione n={7} titolo="Dove stanno i dati e trasferimenti fuori dall'Unione Europea">
        <p>
          La banca dati, i file caricati e l&apos;applicazione sono ospitati su infrastrutture situate{" "}
          <strong>nell&apos;Unione Europea, nella regione di Francoforte</strong>. Non è previsto il trasferimento
          ordinario dei dati verso paesi terzi.
        </p>
        <p>
          Qualora un fornitore debba accedere a dati da un paese terzo per finalità di assistenza tecnica, il
          trasferimento avviene sulla base delle clausole contrattuali tipo approvate dalla Commissione europea, con le
          misure supplementari applicabili.
        </p>
      </Sezione>

      <Sezione n={8} titolo="Misure di sicurezza">
        <p>Le principali misure adottate, che sono anche caratteristiche di progetto della piattaforma:</p>
        <ul>
          <li>
            <strong>Isolamento fra studi a livello di banca dati</strong>: ogni riga è vincolata al proprio studio da
            politiche applicate dal motore della banca dati, non dal codice dell&apos;applicazione. L&apos;isolamento è
            verificato da test automatici a ogni rilascio.
          </li>
          <li>Trasmissione cifrata (HTTPS) e dati cifrati a riposo presso i fornitori di infrastruttura.</li>
          <li>Password conservate esclusivamente come impronta crittografica non reversibile.</li>
          <li>
            Registro delle operazioni in sola aggiunta: le voci non possono essere modificate né cancellate, nemmeno da
            un amministratore.
          </li>
          <li>Accesso ai file caricati mediante collegamenti temporanei firmati, mai tramite indirizzi pubblici.</li>
          <li>Copie di sicurezza gestite dal fornitore della banca dati, con possibilità di ripristino puntuale.</li>
        </ul>
        <p>
          In caso di violazione dei dati personali che comporti un rischio per i diritti e le libertà degli interessati,
          il titolare procede alla notifica al Garante entro settantadue ore e informa senza ingiustificato ritardo i
          clienti coinvolti, secondo gli articoli 33 e 34 del GDPR.
        </p>
      </Sezione>

      <Sezione n={9} titolo="Diritti dell'interessato">
        <p>
          In qualunque momento si può chiedere: <strong>accesso</strong>{" "}ai propri dati, <strong>rettifica</strong>,{" "}
          <strong>cancellazione</strong>, <strong>limitazione</strong>{" "}del trattamento, <strong>portabilità</strong>{" "}in
          formato leggibile da un elaboratore, e <strong>opposizione</strong>{" "}ai trattamenti fondati sul legittimo
          interesse. Dove il trattamento si fonda sul consenso, questo può essere revocato senza pregiudizio per la
          liceità del trattamento già svolto.
        </p>
        <p>
          Le richieste si inviano a <a href={`mailto:${TITOLARE.email}`}>{TITOLARE.email}</a>{" "}e ricevono riscontro entro
          un mese, prorogabile di due mesi nei casi complessi previsti dall&apos;articolo 12 del GDPR.
        </p>
        <p>
          Resta impregiudicato il diritto di proporre reclamo al{" "}
          <strong>Garante per la protezione dei dati personali</strong>{" "}(
          <a href="https://www.garanteprivacy.it" target="_blank" rel="noopener noreferrer">
            garanteprivacy.it
          </a>
          ) o all&apos;autorità di controllo dello Stato membro di residenza.
        </p>
      </Sezione>

      <Sezione n={10} titolo="Cookie">
        <p>
          Il sito e la piattaforma utilizzano soltanto cookie tecnici necessari al funzionamento. Il dettaglio, con
          nomi, durate e finalità, è nella <Link href="/cookie">cookie policy</Link>.
        </p>
      </Sezione>

      <Sezione n={11} titolo="Modifiche a questa informativa">
        <p>
          L&apos;informativa può essere aggiornata per adeguarla a modifiche del servizio o della normativa. La versione
          in vigore è sempre quella pubblicata su questa pagina, con la data di ultimo aggiornamento indicata in alto.
          Le modifiche sostanziali sono comunicate ai clienti attivi per posta elettronica prima che abbiano effetto.
        </p>
      </Sezione>
    </PaginaLegale>
  );
}
