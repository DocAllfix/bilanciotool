"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CampoData, CampoScelta, CampoTesto } from "@/components/comune/campo";
import { ArrowLeft, Download } from "lucide-react";
import { eliminaFascicoloAction, setCampoFascicoloAction } from "@/features/segnalazioni/actions";
import {
  AMBITI,
  CANALI_RICEZIONE,
  ESITI,
  QUALITA_SEGNALANTE,
  SI_NO,
  STATI_FASCICOLO,
} from "@/features/segnalazioni/validation";
import {
  ELEMENTI_AMMISSIBILITA,
  FATTORI_RITORSIONE,
  ammissibilita,
  contattabile,
  livelloRitorsione,
  punteggioRitorsione,
} from "@/lib/calc/segnalazioni/valutazione";
import { avvisoEntro, cancellazioneEntro, riscontroEntro } from "@/lib/calc/segnalazioni/termini";
import { fmtData } from "@/lib/format";
import type { CampoFascicolo } from "@/features/segnalazioni/validation";
import type { ChiaveAmmissibilita, ChiaveRitorsione } from "@/lib/calc/segnalazioni/valutazione";
import { COLORE_AMMISSIBILITA, COLORE_RITORSIONE } from "./types";

// Il fascicolo di una segnalazione: cinque schede, e tre pannelli che ricalcolano.
//
// ⚠️ NESSUN NOMINATIVO, mai. Il legame fra il codice di collegamento e la persona è
// custodito dal gestore fuori da questo strumento, ed è il motivo per cui gli avvisi sui
// campi liberi ci sono e non vanno tolti: il registro è consultabile da più soggetti
// autorizzati, e una formulazione incauta vale quanto un nome.
//
// ⚠️ Ogni campo salva DA SOLO, uno per volta, e il server rifiuta un aggiornamento che
// ne porti due. Questa è la forma esatta in cui il progetto ha già preso lo stesso
// difetto tre volte: una maschera grande con un pannello che ricalcola a ogni tocco, e
// una riga rimandata da props stantie che azzera il campo salvato un attimo prima.
//
// ⚠️ I pannelli usano le STESSE funzioni pure del server e del documento: non possono
// dire un numero diverso da quello che verrà stampato.

type Fascicolo = Record<string, unknown> & { id: string; numero: number };

export function VistaFascicolo({
  companyId,
  fascicolo,
  oggi,
}: {
  companyId: string;
  fascicolo: Fascicolo;
  oggi: string;
}) {
  const router = useRouter();
  // Stato locale del fascicolo: ogni campo aggiorna SOLO la propria chiave, e i pannelli
  // ricalcolano su questo. È l'unico modo di far vedere l'esito senza rileggere la
  // pagina — e non viola la regola, perché al server continua ad andare un campo solo.
  const [f, setF] = useState<Fascicolo>(fascicolo);

  // ⚠️ `campo` e' tipizzato sulle CHIAVI del fascicolo, non su `string`. Un refuso nel
  // nome di una colonna compilerebbe, e fallirebbe solo a runtime con un errore di
  // validazione incomprensibile — che e' esattamente la forma del difetto costato oggi
  // un «monitoraggi dovuti: zero» in un documento legale. Qui lo vede il compilatore.
  const salva = (campo: CampoFascicolo) => async (valore: string | null) => {
    const esito = await setCampoFascicoloAction(companyId, f.id, { [campo]: valore } as Record<string, never>);
    if (esito.ok) setF((p) => ({ ...p, [campo]: valore }));
    return esito;
  };

  const s = f as Record<string, string | null>;
  const anonima = Boolean(f.anonima);

  const esitoAmm = ammissibilita({
    oggetto: s.ammOggetto,
    legittimato: s.ammLegittimato,
    contesto: s.ammContesto,
    elementi: s.ammElementi,
    nonPersonale: s.ammNonPersonale,
  });

  const fattori = {
    identitaConoscibile: s.ritIdentitaConoscibile,
    sovraordinato: s.ritSovraordinato,
    contestoRistretto: s.ritContestoRistretto,
    precedenti: s.ritPrecedenti,
    rapportoPrecario: s.ritRapportoPrecario,
    giaEsposto: s.ritGiaEsposto,
  };
  const livello = livelloRitorsione(fattori, anonima);
  const raggiungibile = contattabile({ anonima, recapito: s.recapito, codice: s.codice });

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href={`/aziende/${companyId}/segnalazioni?vista=registro`}
          className="inline-flex items-center gap-1.5 text-[13px] text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" /> Registro
        </Link>
        <div className="flex items-center gap-2">
          {/* ⚠️ Il fascicolo si STAMPA, non si pubblica. Non e' un tipo di documento e non
              deve diventarlo: il collegamento del portale cliente e' per azienda e non
              per documento, e un tipo nuovo comparirebbe dentro i collegamenti gia'
              consegnati senza che nessuno prema niente. La stampa e' dietro sessione,
              non si archivia, e registra l'accesso come ogni consultazione. */}
          <a
            href={`/api/fascicolo/${companyId}/${f.id}/pdf`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex h-8 items-center gap-1.5 rounded-md border px-3 text-[13px] font-medium transition-colors hover:bg-accent"
            data-tour="wb-stampa-fascicolo"
          >
            <Download className="size-4" /> Stampa il fascicolo
          </a>
          <Eliminazione companyId={companyId} fascicoloId={f.id} numero={f.numero} onFatto={() => router.push(`/aziende/${companyId}/segnalazioni?vista=registro`)} />
        </div>
      </div>

      <div>
        <p className="text-xs text-muted-foreground">Fascicolo</p>
        <h1 className="font-display text-2xl font-semibold">
          Segnalazione {f.numero}
          {anonima && <span className="ml-2 rounded bg-muted px-2 py-0.5 text-[12px] font-normal">anonima</span>}
        </h1>
      </div>

      <Tabs defaultValue="dati">
        <TabsList>
          <TabsTrigger value="dati">Ricezione</TabsTrigger>
          <TabsTrigger value="amm">Ammissibilità</TabsTrigger>
          <TabsTrigger value="istr">Istruttoria</TabsTrigger>
          <TabsTrigger value="tut">Tutele</TabsTrigger>
          <TabsTrigger value="cons">Conservazione</TabsTrigger>
        </TabsList>

        {/* ── Ricezione ────────────────────────────────────────────────── */}
        <TabsContent value="dati" className="space-y-6 pt-4">
          <Gruppo titolo="Ricezione">
            <CampoData id="wb-f-data" etichetta="Data di ricezione" valore={s.dataRicezione} salva={salva("dataRicezione")} />
            <CampoScelta id="wb-f-canale" etichetta="Canale" valore={s.canale} opzioni={CANALI_RICEZIONE} salva={salva("canale")} />
            <CampoScelta id="wb-f-qual" etichetta="Qualità del segnalante" valore={s.qualita} opzioni={QUALITA_SEGNALANTE} salva={salva("qualita")} />
            <CampoScelta id="wb-f-amb" etichetta="Ambito" valore={s.ambito} opzioni={AMBITI} salva={salva("ambito")} />
            <CampoTesto id="wb-f-ogg" etichetta="Oggetto sintetico" valore={s.oggetto} multiriga salva={salva("oggetto")}
              aiuto="Formulazione neutra: il registro è consultabile da più soggetti autorizzati" />
            <CampoTesto id="wb-f-fatti" etichetta="Fatti segnalati" valore={s.fatti} multiriga salva={salva("fatti")} />
            <CampoTesto id="wb-f-quando" etichetta="Quando sono avvenuti e se sono in corso" valore={s.quando} multiriga salva={salva("quando")} />
            <CampoTesto id="wb-f-dove" etichetta="Dove sono avvenuti" valore={s.dove} multiriga salva={salva("dove")} />
            <CampoTesto id="wb-f-coin" etichetta="Persone coinvolte" valore={s.coinvolti} multiriga salva={salva("coinvolti")}
              aiuto="Codici o indicazione della funzione: non registrare nominativi" />
            <CampoTesto id="wb-f-elem" etichetta="Elementi a supporto disponibili" valore={s.elementi} multiriga salva={salva("elementi")} />
            <CampoScelta id="wb-f-altrove" etichetta="Già segnalato ad altri soggetti" valore={s.altrove}
              opzioni={["No", "Sì, internamente", "Sì, ad ANAC", "Sì, ad altra autorità"]} salva={salva("altrove")} />
            <CampoScelta id="wb-f-inc" etichetta="Ha chiesto un incontro diretto" valore={s.incontroRichiesto}
              opzioni={["No", "Sì, fissato", "Sì, da fissare"]} salva={salva("incontroRichiesto")} />
          </Gruppo>

          <Gruppo titolo="Identificazione">
            <CampoTesto id="wb-f-cod" etichetta="Codice del segnalante" valore={s.codice} salva={salva("codice")}
              aiuto="Solo il codice di collegamento: il legame con l'identità è custodito dal gestore fuori da qui" />
            <CampoScelta id="wb-f-rec" etichetta="Recapito per il riscontro presente" valore={s.recapito} opzioni={SI_NO}
              salva={salva("recapito")} aiuto="Determina l'applicabilità dei termini di avviso e riscontro" />
            <CampoScelta id="wb-f-consreg" etichetta="Consenso alla registrazione della segnalazione orale"
              valore={s.consensoRegistrazione} opzioni={["Non applicabile", "Prestato", "Negato"]} salva={salva("consensoRegistrazione")} />
            <CampoScelta id="wb-f-verb" etichetta="Verbale confermato dal segnalante" valore={s.verbaleConfermato}
              opzioni={["Non applicabile", "Sì", "No"]} salva={salva("verbaleConfermato")} />
          </Gruppo>

          <Gruppo titolo="Termini di legge">
            <CampoData id="wb-f-avv" etichetta="Avviso di ricevimento reso il" valore={s.avvisoReso} salva={salva("avvisoReso")}
              aiuto={`Termine: ${avvisoEntro(s.dataRicezione) ? fmtData(avvisoEntro(s.dataRicezione)!) : "—"}`} />
            <CampoData id="wb-f-risc" etichetta="Riscontro reso il" valore={s.riscontroReso} salva={salva("riscontroReso")}
              aiuto={`Termine: ${riscontroEntro(s.dataRicezione, s.avvisoReso) ? fmtData(riscontroEntro(s.dataRicezione, s.avvisoReso)!) : "—"}`} />
            <CampoScelta id="wb-f-comst" etichetta="Comunicazione di stato per istruttoria non conclusa"
              valore={s.comunicazioneStato} opzioni={["Non necessaria", "Resa", "Dovuta e non resa"]} salva={salva("comunicazioneStato")} />
            <CampoScelta id="wb-f-stato" etichetta="Stato del fascicolo" valore={s.stato} opzioni={STATI_FASCICOLO} salva={salva("stato")} />
          </Gruppo>

          {!raggiungibile && (
            <Pannello>
              Segnalazione anonima priva di recapito e di codice: l&apos;avviso e il riscontro non sono
              materialmente possibili. La circostanza è annotata e la segnalazione è comunque presa in carico —
              esce dal conteggio dei termini, non dalla trattazione.
            </Pannello>
          )}
        </TabsContent>

        {/* ── Ammissibilità ────────────────────────────────────────────── */}
        <TabsContent value="amm" className="space-y-6 pt-4">
          <p className="text-sm text-muted-foreground">
            La distinzione fra segnalazione e rivendicazione personale è la valutazione più delicata del
            processo. Un conflitto interpersonale che porti alla luce anche una condotta illecita resta una
            segnalazione, per la parte che riguarda l&apos;illecito.
          </p>

          <div className="divide-y rounded-xl border">
            {ELEMENTI_AMMISSIBILITA.map((e) => (
              <div key={e.chiave} className="flex flex-wrap items-center gap-3 px-4 py-3">
                <span className="min-w-0 flex-1 text-[13px]">{e.testo}</span>
                <div className="w-40 shrink-0">
                  <CampoScelta id={`wb-f-${e.chiave}`} etichetta={e.testo} etichettaNascosta
                    valore={s[colonnaAmm(e.chiave)] ?? null}
                    opzioni={SI_NO} salva={salva(colonnaAmm(e.chiave))} />
                </div>
              </div>
            ))}
          </div>

          {esitoAmm ? (
            <Pannello colore={COLORE_AMMISSIBILITA[esitoAmm]}>
              <strong>{esitoAmm}.</strong>{" "}
              {esitoAmm === "Da integrare"
                ? "Manca il solo requisito degli elementi di fatto precisi e concordanti: la segnalazione si può completare chiedendo un'integrazione, e non si archivia. La richiesta non sospende i tre mesi."
                : esitoAmm === "Ammissibile"
                  ? "Tutti e cinque gli elementi sono soddisfatti: si procede con il piano istruttorio."
                  : "Uno degli elementi non è soddisfatto. L'archiviazione va motivata per iscritto."}
            </Pannello>
          ) : (
            <Pannello>
              Esito non ancora determinato: servono tutti e cinque gli elementi. Un elemento non valutato non
              equivale a un «no».
            </Pannello>
          )}

          <Gruppo titolo="Motivazione e integrazione">
            <CampoTesto id="wb-f-ammmot" etichetta="Motivazione" valore={s.ammMotivazione} multiriga salva={salva("ammMotivazione")}
              aiuto="Obbligatoria per l'inammissibilità e per l'archiviazione" />
            <CampoTesto id="wb-f-ammalt" etichetta="Canali alternativi indicati al segnalante" valore={s.ammAlternativi} multiriga salva={salva("ammAlternativi")} />
            <CampoData id="wb-f-intr" etichetta="Integrazione richiesta il" valore={s.integrazioneChiesta} salva={salva("integrazioneChiesta")} />
            <CampoData id="wb-f-intric" etichetta="Integrazione ricevuta il" valore={s.integrazioneRicevuta} salva={salva("integrazioneRicevuta")} />
          </Gruppo>

          <Gruppo titolo="Incompatibilità del gestore">
            <CampoScelta id="wb-f-confl" etichetta="Il gestore è in conflitto sul caso" valore={s.conflitto} opzioni={SI_NO} salva={salva("conflitto")} />
            <CampoTesto id="wb-f-sub" etichetta="Subentrante" valore={s.subentrante} salva={salva("subentrante")} />
            <CampoTesto id="wb-f-conflmot" etichetta="Motivo dell'astensione" valore={s.conflittoMotivo} multiriga salva={salva("conflittoMotivo")} />
          </Gruppo>
        </TabsContent>

        {/* ── Istruttoria ──────────────────────────────────────────────── */}
        <TabsContent value="istr" className="space-y-6 pt-4">
          <Gruppo titolo="Piano istruttorio">
            <CampoTesto id="wb-f-piano" etichetta="Fatti da accertare e fonti di prova" valore={s.piano} multiriga salva={salva("piano")} />
            <CampoTesto id="wb-f-risch" etichetta="Rischi di riconoscibilità e misure adottate" valore={s.rischiRiconoscibilita} multiriga salva={salva("rischiRiconoscibilita")}
              aiuto="La riservatezza si perde di norma per il modo in cui l'istruttoria è condotta, non per una rivelazione diretta" />
            <CampoData id="wb-f-avvio" etichetta="Avvio dell'istruttoria" valore={s.avvio} salva={salva("avvio")} />
            <CampoData id="wb-f-concl" etichetta="Conclusione dell'istruttoria" valore={s.conclusione} salva={salva("conclusione")} />
          </Gruppo>

          <Gruppo titolo="Attività e audizioni">
            <CampoTesto id="wb-f-att" etichetta="Attività svolte" valore={s.attivita} multiriga salva={salva("attivita")} />
            <CampoScelta id="wb-f-sent" etichetta="Persona coinvolta sentita" valore={s.personaSentita}
              opzioni={["No", "Sì", "Non applicabile"]} salva={salva("personaSentita")}
              aiuto="Ha diritto di essere sentita, anche in forma cartolare, prima delle conclusioni" />
            <CampoTesto id="wb-f-evid" etichetta="Evidenze acquisite e valutazione" valore={s.evidenze} multiriga salva={salva("evidenze")} />
          </Gruppo>

          <Gruppo titolo="Conclusioni">
            <CampoScelta id="wb-f-esito" etichetta="Esito" valore={s.esito} opzioni={ESITI} salva={salva("esito")} />
            <CampoScelta id="wb-f-pen" etichetta="Rilevanza penale" valore={s.rilevanzaPenale}
              opzioni={["No", "Sì, valutata la denuncia", "Sì, denuncia effettuata"]} salva={salva("rilevanzaPenale")} />
            <CampoTesto id="wb-f-mot" etichetta="Motivazione" valore={s.motivazione} multiriga salva={salva("motivazione")}
              aiuto="L'archiviazione per manifesta infondatezza non può fondarsi sulla sola percezione di scarsa credibilità del segnalante" />
            <CampoTesto id="wb-f-nonacc" etichetta="Fatti non accertati e ragioni" valore={s.fattiNonAccertati} multiriga salva={salva("fattiNonAccertati")} />
            <CampoTesto id="wb-f-propd" etichetta="Proposte di provvedimento disciplinare" valore={s.proposteDisciplinari} multiriga salva={salva("proposteDisciplinari")} />
            <CampoTesto id="wb-f-propc" etichetta="Proposte di azione correttiva" valore={s.proposteCorrettive} multiriga salva={salva("proposteCorrettive")} />
            <CampoScelta id="wb-f-dest" etichetta="Destinatari della relazione" valore={s.destinatariRelazione}
              opzioni={["Organo di indirizzo", "Organo di controllo", "Organismo di vigilanza", "Organo di controllo e OdV"]}
              salva={salva("destinatariRelazione")}
              aiuto="Se i fatti riguardano l'organo di indirizzo, la relazione va all'organo di controllo" />
            <CampoTesto id="wb-f-contr" etichetta="Contenuto del riscontro reso al segnalante" valore={s.contenutoRiscontro} multiriga salva={salva("contenutoRiscontro")}
              aiuto="Non può contenere identità delle persone sentite, dichiarazioni acquisite né esito nominativo dei provvedimenti" />
          </Gruppo>
        </TabsContent>

        {/* ── Tutele ───────────────────────────────────────────────────── */}
        <TabsContent value="tut" className="space-y-6 pt-4">
          <div className="divide-y rounded-xl border">
            {FATTORI_RITORSIONE.map((x) => (
              <div key={x.chiave} className="flex flex-wrap items-center gap-3 px-4 py-3">
                <span className="min-w-0 flex-1 text-[13px]">{x.testo}</span>
                <span className="w-8 shrink-0 text-right font-mono text-[12px] text-muted-foreground">+{x.peso}</span>
                <div className="w-40 shrink-0">
                  <CampoScelta id={`wb-f-rit-${x.chiave}`} etichetta={x.testo} etichettaNascosta
                    valore={s[colonnaRit(x.chiave)] ?? null}
                    opzioni={SI_NO} salva={salva(colonnaRit(x.chiave))} />
                </div>
              </div>
            ))}
          </div>

          {livello ? (
            <Pannello colore={COLORE_RITORSIONE[livello]}>
              <strong>Rischio {livello.toLowerCase()}</strong> — punteggio {punteggioRitorsione(fattori)} su 13.{" "}
              {livello === "Basso"
                ? "Il monitoraggio è facoltativo."
                : "Il monitoraggio è dovuto: va aperto e va registrato."}
              {anonima && s.ritIdentitaConoscibile !== "Sì" && (
                <>
                  {" "}
                  Trattandosi di segnalazione anonima con identità non conoscibile, il livello non può superare
                  «Medio»: se non si può risalire alla persona, la ritorsione ha un limite materiale.
                </>
              )}
            </Pannello>
          ) : (
            <Pannello>
              Livello non determinato: servono tutti e sei i fattori. Rispondere «no» a una sola domanda non
              basta a dichiarare basso un rischio che nessuno ha misurato.
            </Pannello>
          )}

          <Gruppo titolo="Monitoraggio">
            <CampoScelta id="wb-f-mona" etichetta="Monitoraggio aperto" valore={s.monitoraggioAperto} opzioni={SI_NO} salva={salva("monitoraggioAperto")} />
            <CampoData id="wb-f-monf" etichetta="Monitoraggio fino al" valore={s.monitoraggioFino} salva={salva("monitoraggioFino")} />
            <CampoScelta id="wb-f-monp" etichetta="Periodicità" valore={s.monitoraggioPeriodicita}
              opzioni={["Mensile", "Trimestrale", "Semestrale"]} salva={salva("monitoraggioPeriodicita")} />
            <CampoTesto id="wb-f-tut" etichetta="Soggetti tutelati" valore={s.soggettiTutelati} multiriga salva={salva("soggettiTutelati")}
              aiuto="Oltre al segnalante: facilitatori, colleghi con rapporto abituale, parenti entro il quarto grado, enti collegati" />
            <CampoTesto id="wb-f-misp" etichetta="Misure preventive adottate" valore={s.misurePreventive} multiriga salva={salva("misurePreventive")} />
            <CampoTesto id="wb-f-monr" etichetta="Rilevazioni del monitoraggio" valore={s.rilevazioniMonitoraggio} multiriga salva={salva("rilevazioniMonitoraggio")} />
          </Gruppo>

          <Gruppo titolo="Riservatezza dell'identità">
            <CampoScelta id="wb-f-riv" etichetta="Identità rivelata a soggetti diversi dai competenti" valore={s.identitaRivelata} opzioni={SI_NO} salva={salva("identitaRivelata")} />
            <CampoScelta id="wb-f-cons" etichetta="Consenso espresso acquisito" valore={s.consensoRivelazione}
              opzioni={["Non necessario", "Sì", "Negato"]} salva={salva("consensoRivelazione")} />
            <CampoTesto id="wb-f-rivmot" etichetta="Ragioni comunicate al segnalante" valore={s.rivelazioneRagioni} multiriga salva={salva("rivelazioneRagioni")}
              aiuto="La rivelazione è ammessa solo quando la contestazione disciplinare si fonda sulla segnalazione e l'identità è indispensabile alla difesa" />
            <CampoTesto id="wb-f-riveff" etichetta="Effetti del diniego" valore={s.rivelazioneEffetti} multiriga salva={salva("rivelazioneEffetti")}
              aiuto="Il diniego comporta l'inutilizzabilità della segnalazione ai fini disciplinari, non l'archiviazione degli accertamenti condotti per altra via" />
          </Gruppo>
        </TabsContent>

        {/* ── Conservazione ────────────────────────────────────────────── */}
        <TabsContent value="cons" className="space-y-6 pt-4">
          <p className="text-sm text-muted-foreground">
            La documentazione è conservata per il tempo necessario e comunque non oltre cinque anni dalla data
            della comunicazione dell&apos;esito finale (art. 14 comma 1).
          </p>
          <Gruppo titolo="Conservazione">
            <CampoData id="wb-f-chius" etichetta="Data dell'esito finale comunicato" valore={s.dataChiusura} salva={salva("dataChiusura")} />
            <CampoScelta id="wb-f-canc" etichetta="Cancellazione eseguita" valore={s.cancellata} opzioni={SI_NO} salva={salva("cancellata")} />
            <CampoData id="wb-f-datacanc" etichetta="Data di cancellazione" valore={s.dataCancellazione} salva={salva("dataCancellazione")} />
            <CampoTesto id="wb-f-prorog" etichetta="Motivo dell'eventuale proroga" valore={s.prorogaMotivo} multiriga salva={salva("prorogaMotivo")}
              aiuto="La conservazione oltre il termine è ammessa solo per obbligo o contenzioso in corso, con motivazione registrata" />
          </Gruppo>
          <Pannello>
            {cancellazioneEntro(s.dataChiusura) ? (
              <>
                Termine di conservazione: <strong>{fmtData(cancellazioneEntro(s.dataChiusura)!)}</strong>.
                {s.cancellata === "Sì" ? " La cancellazione risulta eseguita." : ""}
              </>
            ) : (
              <>Il termine decorre dalla data dell&apos;esito finale, che non è ancora registrata.</>
            )}
          </Pannello>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Dalle chiavi del MOTORE ai nomi delle COLONNE.
//
// ⚠️ I due vocabolari sono diversi di proposito: il fascicolo ha settanta campi e senza i
// prefissi `amm` e `rit` questi undici si perderebbero fra gli altri; il motore no,
// perche' il suo unico argomento sono loro. Il tipo restituito e' un template literal,
// quindi il compilatore verifica che la colonna esista davvero — ed e' la stessa
// mappatura che, scritta a mano e sbagliata, ha prodotto oggi un «monitoraggi dovuti:
// zero» in un documento destinato all'organo di controllo.
const maiuscola = <T extends string>(k: T) => (k.charAt(0).toUpperCase() + k.slice(1)) as Capitalize<T>;
const colonnaAmm = (k: ChiaveAmmissibilita) => `amm${maiuscola(k)}` as const satisfies CampoFascicolo;
const colonnaRit = (k: ChiaveRitorsione) => `rit${maiuscola(k)}` as const satisfies CampoFascicolo;

function Gruppo({ titolo, children }: { titolo: string; children: React.ReactNode }) {
  return (
    <section aria-label={titolo}>
      <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">{titolo}</h2>
      <div className="mt-3 grid gap-4 rounded-xl border p-4 sm:grid-cols-2">{children}</div>
    </section>
  );
}

function Pannello({ children, colore }: { children: React.ReactNode; colore?: string }) {
  return (
    <div
      className="rounded-xl border px-4 py-3 text-[13px]"
      style={colore ? { borderColor: colore } : undefined}
      data-slot="pannello-esito"
    >
      {children}
    </div>
  );
}

function Eliminazione({
  companyId,
  fascicoloId,
  numero,
  onFatto,
}: {
  companyId: string;
  fascicoloId: string;
  numero: number;
  onFatto: () => void;
}) {
  const [conferma, setConferma] = useState(false);
  const [errore, setErrore] = useState<string | null>(null);

  async function elimina() {
    setErrore(null);
    const esito = await eliminaFascicoloAction(companyId, fascicoloId);
    if (!esito.ok) {
      setErrore(esito.errore);
      return;
    }
    onFatto();
  }

  if (!conferma) {
    return (
      <Button variant="ghost" size="sm" onClick={() => setConferma(true)}>
        Elimina il fascicolo
      </Button>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-[12px] text-muted-foreground">
        Eliminare il fascicolo {numero}? Va distinta dalla <strong>cancellazione</strong> per decorso dei cinque
        anni, che si registra nella scheda Conservazione. Il numero {numero} non verrà riusato.
      </span>
      <Button variant="destructive" size="sm" onClick={elimina}>
        Elimina
      </Button>
      <Button variant="ghost" size="sm" onClick={() => setConferma(false)}>
        Annulla
      </Button>
      {errore && (
        <span className="text-[12px] text-destructive" role="alert">
          {errore}
        </span>
      )}
    </div>
  );
}
