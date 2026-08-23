import { fmtData } from "@/lib/format";
import { marchioDelloSnapshot } from "@/features/documents/marchio";
import { DOC } from "./charts";

// Relazione periodica sulla gestione delle segnalazioni (D.Lgs. 24/2023).
//
// Il destinatario è l'organo di controllo — o l'organismo di vigilanza, dove esiste — e
// la relazione risponde a tre domande: il canale c'è ed è quello che la legge pretende;
// i termini perentori sono stati rispettati; il sistema è conforme e dove non lo è.
//
// ⚠️ QUESTO DOCUMENTO PUÒ ESSERE CONSEGNATO AL CLIENTE ATTRAVERSO IL PORTALE, e la
// scelta dei campi ne discende: nessun oggetto, nessun fatto segnalato, nessun codice
// del segnalante, nessuna qualità caso per caso. In un'azienda di trenta persone «la
// numero 4 è di un ex dipendente» è un nome, e l'art. 12 vieta di farlo.
//
// Tutto quello che si legge qui è congelato nello snapshot, compreso il giorno rispetto
// al quale i termini sono stati giudicati: una relazione consegnata non deve cambiare
// verdetto col passare delle settimane.

type StatoTermine = "fatto" | "termini" | "scadenza" | "scaduto" | "tardivo" | "na";

type Riga = {
  numero: number;
  dataRicezione: string | null;
  canale: string | null;
  anonima: boolean;
  stato: string;
  esito: string | null;
  avvisoEntro: string | null;
  avvisoReso: string | null;
  statoAvviso: StatoTermine;
  riscontroEntro: string | null;
  riscontroReso: string | null;
  statoRiscontro: StatoTermine;
};

type Conto = {
  dovuti: number;
  neiTermini: number;
  tardivi: number;
  scaduti: number;
  percentuale: number | null;
};

type Snapshot = {
  generatoIl: string;
  riferitaAl: string;
  azienda: { id: string; nome: string; settore: string | null; sede: string | null };
  assetto: Record<string, string | null>;
  canale: {
    forme: {
      forma: string;
      attiva: boolean;
      descrizione: string | null;
      fornitore: string | null;
      riservatezza: string | null;
      attivatoIl: string | null;
    }[];
    stato: { coperte: string[]; mancanti: string[]; dichiarateNonAttive: string[]; conforme: boolean };
    consultazione: "ok" | "tardiva" | "assente" | "nonVerificabile";
    condivisioneAmmessa: boolean | null;
  };
  statistiche: {
    totali: number;
    aperte: number;
    concluse: number;
    zeroDaInterpretare: boolean;
    avvisi: Conto;
    riscontri: Conto;
    perEsito: Record<string, number>;
    perCanale: Record<string, number>;
    senzaCanale: number;
    anonime: number;
    daEsterni: number;
    monitoraggiAperti: number;
    monitoraggiDovutiNonAperti: number;
    daCancellare: number;
  };
  capitoli: { key: string; nome: string; descrizione: string; requisiti: number; valutati: number; conformita: number }[];
  conformita: number | null;
  requisitiValutati: number;
  requisitiTotali: number;
  prospetto: Riga[];
};

/** Sotto questa soglia il dato aggregato può rendere riconoscibili le persone. */
const SOGLIA_RISERVATEZZA = 5;

const NOME_TERMINE: Record<StatoTermine, string> = {
  fatto: "nei termini",
  termini: "in corso",
  scadenza: "in scadenza",
  scaduto: "scaduto",
  tardivo: "fuori termine",
  na: "non applicabile",
};

/** Il riquadro delle avvertenze: la stessa forma dell'attestato, che e' la convenzione
 *  gia' in uso per cio' che deve essere letto e non saltato. */
const RIQUADRO = {
  border: `1.5px solid ${DOC.ink}`,
  background: DOC.accentBg,
  padding: "14px 18px",
  margin: "22px 0",
} as const;

export function DocumentoRelazioneWb({ dati }: { dati: Snapshot }) {
  const { azienda, assetto: a, canale, statistiche: k, capitoli, prospetto } = dati;
  const marchio = marchioDelloSnapshot(dati);
  const pochi = k.totali > 0 && k.totali < SOGLIA_RISERVATEZZA;

  return (
    <>
      <div className="doc-cover">
        <div className="testo">
          <p className="kicker">Relazione periodica sulle segnalazioni</p>
          <h1>{a.ragione || azienda.nome}</h1>
          <p className="sotto">{[a.sede || azienda.sede, a.settore || azienda.settore].filter(Boolean).join(" · ")}</p>
          <p className="sotto" style={{ marginTop: 8, opacity: 0.7 }}>
            Canale interno di segnalazione · D.Lgs. 10 marzo 2023, n. 24
            {a.revisione ? ` · revisione ${a.revisione}` : ""}
          </p>
          <p className="sotto" style={{ marginTop: 8, opacity: 0.7 }}>
            Situazione al {fmtData(dati.riferitaAl)}
          </p>
        </div>
        <div className="filo" />
      </div>

      <div className="doc-corpo">
        <h2>1. Destinatario e oggetto</h2>
        <p>
          La presente relazione è resa dal soggetto gestore del canale interno di segnalazione
          {a.organoControllo ? ` all'organo di controllo (${a.organoControllo})` : " all'organo di controllo"}
          {a.gestoreTipo === "Organismo di vigilanza" ? ", coincidente con l'organismo di vigilanza," : ""} e
          riferisce sull'assetto del canale, sul rispetto dei termini di legge e sullo stato di conformità del
          sistema.
        </p>
        <div style={RIQUADRO}>
          <p>
            <strong>Natura del documento.</strong>{" "}La relazione non contiene l&apos;identità delle persone
            segnalanti, né il contenuto delle segnalazioni, né elementi che consentano di risalirvi. I dati sono
            resi in forma aggregata o limitata agli estremi di processo, come impone l&apos;art. 12 del decreto.
          </p>
          {pochi && (
            <p>
              <strong>Avvertenza.</strong>{" "}Le segnalazioni pervenute nel periodo sono {k.totali}: al di sotto di
              cinque casi, anche il dato aggregato può rendere riconoscibili le persone coinvolte. La diffusione
              di questa relazione va valutata di conseguenza.
            </p>
          )}
        </div>

        <h2>2. Assetto e soggetto gestore</h2>
        <table>
          <tbody>
            <tr><td style={{ width: "38%" }}>Organizzazione</td><td><strong>{a.ragione || azienda.nome}</strong></td></tr>
            {a.piva && <tr><td>Partita IVA / C.F.</td><td className="doc-mono">{a.piva}</td></tr>}
            {(a.sede || azienda.sede) && <tr><td>Sede legale</td><td>{a.sede || azienda.sede}</td></tr>}
            <tr><td>Titolo dell&apos;obbligo</td><td>{a.obbligo || <span className="doc-manca">non dichiarato</span>}</td></tr>
            <tr><td>Media dei lavoratori subordinati</td><td>{a.addetti || <span className="doc-manca">non indicata</span>}</td></tr>
            <tr><td>Modello 231 adottato</td><td>{a.mogAdottato || <span className="doc-manca">non dichiarato</span>}</td></tr>
            <tr><td>Configurazione del gestore</td><td>{a.gestoreTipo || <span className="doc-manca">non dichiarata</span>}</td></tr>
            <tr><td>Soggetto gestore</td><td>{a.gestore || <span className="doc-manca">non indicato</span>}</td></tr>
            <tr><td>Sostituto per i casi di astensione</td><td>{a.sostituto || <span className="doc-manca">non indicato</span>}</td></tr>
            {a.nomina && <tr><td>Data di nomina</td><td>{fmtData(a.nomina)}</td></tr>}
            <tr><td>Responsabile della protezione dei dati</td><td>{a.dpo || <span className="doc-manca">non indicato</span>}</td></tr>
            <tr><td>Adozione della procedura</td><td>{a.dataAdozione ? fmtData(a.dataAdozione) : <span className="doc-manca">non indicata</span>}</td></tr>
          </tbody>
        </table>

        <h2>3. Il canale interno</h2>
        <p>
          L&apos;art. 4 comma 1 pretende che il canale consenta la segnalazione <strong>in forma scritta</strong>,
          <strong> in forma orale</strong> e, su richiesta della persona segnalante, <strong>mediante un incontro
          diretto</strong>. Le tre modalità sono cumulative: la mancanza di una sola rende il canale non conforme.
        </p>
        <table>
          <thead>
            <tr>
              <th style={{ width: "20%" }}>Forma</th>
              <th style={{ width: "14%" }}>Stato</th>
              <th>Modalità di realizzazione</th>
              <th style={{ width: "16%" }}>Attiva dal</th>
            </tr>
          </thead>
          <tbody>
            {canale.forme.map((f, i) => (
              <tr key={`${f.forma}-${i}`}>
                <td><strong>{f.forma}</strong></td>
                <td>{f.attiva ? "attiva" : "non attiva"}</td>
                <td>
                  {f.descrizione || <span className="doc-manca">non descritta</span>}
                  {f.fornitore && <div className="doc-mono">{f.fornitore}</div>}
                </td>
                <td>{f.attivatoIl ? fmtData(f.attivatoIl) : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {!canale.stato.conforme && (
          <div style={RIQUADRO}>
            <p>
              <strong>Rilievo.</strong>{" "}Il canale non soddisfa l&apos;art. 4 comma 1.
              {canale.stato.mancanti.length > 0 && (
                <> Non risulta istituita la forma <strong>{canale.stato.mancanti.join(", ")}</strong>.</>
              )}
              {canale.stato.dichiarateNonAttive.length > 0 && (
                <> Risulta prevista ma non attiva la forma{" "}
                  <strong>{canale.stato.dichiarateNonAttive.join(", ")}</strong>.</>
              )}
            </p>
          </div>
        )}

        <h3>Misure tecniche di riservatezza</h3>
        {canale.forme.some((f) => f.riservatezza) ? (
          <table>
            <tbody>
              {canale.forme
                .filter((f) => f.riservatezza)
                .map((f, i) => (
                  <tr key={`ris-${i}`}><td style={{ width: "20%" }}>{f.forma}</td><td>{f.riservatezza}</td></tr>
                ))}
            </tbody>
          </table>
        ) : (
          <p className="doc-manca">
            Nessuna misura tecnica di riservatezza dichiarata. L&apos;art. 4 comma 2 richiede che la riservatezza
            sia assicurata con strumenti, anche di crittografia, e non con una sola regola organizzativa.
          </p>
        )}

        <h3>Consultazione sindacale e condivisione</h3>
        <p>
          {canale.consultazione === "ok" && (
            <>La consultazione delle rappresentanze sindacali risulta effettuata il{" "}
              {a.consultazioneSindacale ? fmtData(a.consultazioneSindacale) : "—"}, prima dell&apos;attivazione del
              canale, come prevede l&apos;art. 4 comma 1.</>
          )}
          {canale.consultazione === "tardiva" && (
            <><strong>Rilievo.</strong>{" "}La consultazione sindacale risulta effettuata il{" "}
              {a.consultazioneSindacale ? fmtData(a.consultazioneSindacale) : "—"}, successivamente
              all&apos;attivazione del canale. La procedura va adottata sentite le rappresentanze: l&apos;omissione
              è contestabile.</>
          )}
          {canale.consultazione === "assente" && (
            <><strong>Rilievo.</strong>{" "}Il canale risulta attivo e non è registrata alcuna consultazione delle
              rappresentanze sindacali.</>
          )}
          {canale.consultazione === "nonVerificabile" && (
            <>Nessuna modalità del canale risulta ancora attivata: la precedenza della consultazione sindacale
              non è verificabile.</>
          )}
        </p>
        {a.canaleCondiviso === "Sì" && (
          <p>
            Il canale è condiviso con altri enti.{" "}
            {canale.condivisioneAmmessa === false ? (
              <><strong>Rilievo.</strong>{" "}La condivisione è riservata agli enti fino a 249 lavoratori, e la media
                dichiarata è superiore.</>
            ) : canale.condivisioneAmmessa === null ? (
              <>La media dei lavoratori non è dichiarata: l&apos;ammissibilità della condivisione non è
                verificabile.</>
            ) : (
              <>La condivisione è ammessa e va formalizzata fra gli enti.</>
            )}
          </p>
        )}

        <h2>4. Segnalazioni pervenute</h2>
        {k.zeroDaInterpretare ? (
          <div style={RIQUADRO}>
            <p>
              Nel periodo non sono pervenute segnalazioni.
            </p>
            <p>
              <strong>Come va letto questo dato.</strong>{" "}Un numero di segnalazioni pari a zero non è di per sé un
              buon risultato: è più spesso l&apos;indice di un canale non conosciuto, non ritenuto affidabile o non
              accessibile. Il riesame dovrebbe verificare la diffusione dell&apos;informazione e la percezione di
              sicurezza, prima di concludere che non vi siano violazioni da segnalare.
            </p>
          </div>
        ) : (
          <>
            <table>
              <tbody>
                <tr><td style={{ width: "48%" }}>Segnalazioni ricevute</td><td><strong>{k.totali}</strong></td></tr>
                <tr><td>In trattazione</td><td>{k.aperte}</td></tr>
                <tr><td>Concluse</td><td>{k.concluse}</td></tr>
                <tr><td>Anonime</td><td>{k.anonime}</td></tr>
                <tr><td>Da soggetti esterni al rapporto di lavoro in corso</td><td>{k.daEsterni}</td></tr>
              </tbody>
            </table>

            <h3>Canali di ricezione</h3>
            <table>
              <thead><tr><th>Canale</th><th style={{ width: "20%" }}>Segnalazioni</th></tr></thead>
              <tbody>
                {Object.entries(k.perCanale).map(([c, n]) => (
                  <tr key={c}><td>{c}</td><td>{n}</td></tr>
                ))}
                {k.senzaCanale > 0 && (
                  <tr><td className="doc-manca">canale non indicato</td><td>{k.senzaCanale}</td></tr>
                )}
              </tbody>
            </table>

            <h3>Esiti</h3>
            <table>
              <thead><tr><th>Esito</th><th style={{ width: "20%" }}>Segnalazioni</th></tr></thead>
              <tbody>
                {Object.entries(k.perEsito).map(([e, n]) => (
                  <tr key={e}><td>{e}</td><td>{n}</td></tr>
                ))}
              </tbody>
            </table>
          </>
        )}

        <h2>5. Termini di legge</h2>
        <p>
          L&apos;avviso di ricevimento è dovuto entro <strong>sette giorni</strong> (art. 5 comma 1 lettera a) e il
          riscontro entro <strong>tre mesi</strong> dall&apos;avviso, o dalla scadenza dei sette giorni quando
          l&apos;avviso non sia stato reso (lettera d). Le segnalazioni anonime prive di recapito e di codice di
          riscontro non consentono né l&apos;uno né l&apos;altro: sono escluse dal conteggio, e la circostanza è
          annotata nel fascicolo.
        </p>
        <table>
          <thead>
            <tr>
              <th>Adempimento</th>
              <th style={{ width: "12%" }}>Dovuti</th>
              <th style={{ width: "14%" }}>Nei termini</th>
              <th style={{ width: "14%" }}>Fuori termine</th>
              <th style={{ width: "12%" }}>Scaduti</th>
              <th style={{ width: "12%" }}>Rispetto</th>
            </tr>
          </thead>
          <tbody>
            {([["Avviso di ricevimento", k.avvisi], ["Riscontro", k.riscontri]] as const).map(([nome, c]) => (
              <tr key={nome}>
                <td><strong>{nome}</strong></td>
                <td>{c.dovuti}</td>
                <td>{c.neiTermini}</td>
                <td>{c.tardivi}</td>
                <td>{c.scaduti}</td>
                <td>{c.percentuale === null ? "—" : `${c.percentuale}%`}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p>
          Il rispetto è calcolato sui soli adempimenti dovuti. Gli adempimenti resi oltre la scadenza sono contati
          a parte e non concorrono alla percentuale: su un termine perentorio il ritardo è il fatto da riferire.
        </p>

        {prospetto.length > 0 && (
          <>
            <h3>Prospetto per fascicolo</h3>
            <table>
              <thead>
                <tr>
                  <th style={{ width: "8%" }}>N.</th>
                  <th style={{ width: "14%" }}>Ricezione</th>
                  <th style={{ width: "18%" }}>Avviso</th>
                  <th style={{ width: "18%" }}>Riscontro</th>
                  <th style={{ width: "18%" }}>Stato</th>
                  <th>Esito</th>
                </tr>
              </thead>
              <tbody>
                {prospetto.map((r) => (
                  <tr key={r.numero}>
                    <td className="doc-mono"><strong>{r.numero}</strong>{r.anonima ? " · an." : ""}</td>
                    <td>{r.dataRicezione ? fmtData(r.dataRicezione) : "—"}</td>
                    <td>
                      {r.avvisoReso ? fmtData(r.avvisoReso) : r.avvisoEntro ? `entro ${fmtData(r.avvisoEntro)}` : "—"}
                      <div className="doc-mono">{NOME_TERMINE[r.statoAvviso]}</div>
                    </td>
                    <td>
                      {r.riscontroReso
                        ? fmtData(r.riscontroReso)
                        : r.riscontroEntro
                          ? `entro ${fmtData(r.riscontroEntro)}`
                          : "—"}
                      <div className="doc-mono">{NOME_TERMINE[r.statoRiscontro]}</div>
                    </td>
                    <td>{r.stato}</td>
                    <td>{r.esito || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}

        <h2>6. Tutele e conservazione</h2>
        <table>
          <tbody>
            <tr><td style={{ width: "58%" }}>Monitoraggi delle ritorsioni aperti</td><td>{k.monitoraggiAperti}</td></tr>
            <tr>
              <td>Monitoraggi dovuti e non aperti</td>
              <td>{k.monitoraggiDovutiNonAperti}</td>
            </tr>
            <tr><td>Fascicoli oltre i cinque anni non cancellati</td><td>{k.daCancellare}</td></tr>
          </tbody>
        </table>
        <p>
          Il monitoraggio è dovuto quando il rischio di ritorsione risulta almeno di livello medio. I fascicoli in
          cui i sei fattori non sono stati tutti valutati non concorrono a questo conteggio: un rischio non ancora
          misurato non rende dovuto un adempimento, e segnalarlo come lacuna insegnerebbe a ignorare le lacune.
        </p>
        <p>
          La documentazione è conservata per il tempo necessario e comunque non oltre cinque anni dalla data della
          comunicazione dell&apos;esito finale (art. 14 comma 1).
        </p>

        <h2>7. Conformità del sistema</h2>
        <p>
          Sono valutati <strong>{dati.requisitiValutati}</strong> requisiti su {dati.requisitiTotali}, ripartiti
          nei capi che seguono. Un requisito applicabile e non ancora valutato pesa zero: mediare sui soli
          requisiti valutati farebbe salire l&apos;indice man mano che si saltano quelli difficili.
        </p>
        <table>
          <thead>
            <tr>
              <th style={{ width: "8%" }}>Capo</th>
              <th>Materia</th>
              <th style={{ width: "16%" }}>Valutati</th>
              <th style={{ width: "16%" }}>Conformità</th>
            </tr>
          </thead>
          <tbody>
            {capitoli.map((c) => (
              <tr key={c.key}>
                <td className="doc-mono"><strong>{c.key}</strong></td>
                <td>{c.nome}</td>
                <td>{c.valutati} / {c.requisiti}</td>
                <td><strong>{c.conformita}%</strong></td>
              </tr>
            ))}
            <tr>
              <td colSpan={3}><strong>Conformità complessiva</strong></td>
              <td><strong>{dati.conformita === null ? "—" : `${dati.conformita}%`}</strong></td>
            </tr>
          </tbody>
        </table>

        <h2>8. Riferimenti</h2>
        <ul>
          <li>D.Lgs. 10 marzo 2023, n. 24, in attuazione della direttiva (UE) 2019/1937</li>
          <li>Art. 4 — canali interni: forma scritta, forma orale, incontro diretto su richiesta</li>
          <li>Art. 5 — avviso entro sette giorni, riscontro entro tre mesi</li>
          <li>Art. 12 — obbligo di riservatezza sull&apos;identità della persona segnalante</li>
          <li>Art. 14 — conservazione per cinque anni dalla comunicazione dell&apos;esito finale</li>
          <li>Art. 17 — protezione dalle ritorsioni e inversione dell&apos;onere della prova</li>
          <li>Linee guida ANAC, soggette ad aggiornamento</li>
        </ul>

        <p className="doc-meta">
          Relazione emessa da {marchio.nome} per {a.ragione || azienda.nome} · situazione al{" "}
          {fmtData(dati.riferitaAl)} · generata il {fmtData(dati.generatoIl.slice(0, 10))}
        </p>
      </div>
    </>
  );
}
