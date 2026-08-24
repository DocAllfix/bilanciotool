import { fmtData } from "@/lib/format";
import { DOC } from "./charts";
import {
  ANNI_CONSERVAZIONE,
  GG_AVVISO,
  MESI_RISCONTRO,
  avvisoEntro,
  piuAnni,
  riscontroEntro,
} from "@/lib/calc/segnalazioni/termini";
import { ammissibilita, contattabile, livelloRitorsione } from "@/lib/calc/segnalazioni/valutazione";
import { fattoriRitorsione, statoTermine } from "@/lib/calc/segnalazioni/relazione";
import type { wbReport } from "@/lib/db/schema";

// Il fascicolo di una segnalazione, stampato.
//
// ⚠️ NON è un documento pubblicabile, ed è una decisione presa e motivata. Quattro
// ragioni, e l'ultima da sola basterebbe:
//
// 1. L'unicità di uno snapshot è `(azienda, tipo, anno, versione)` e manca l'asse «quale
//    fascicolo». Piegare `anno` a portare il numero del fascicolo farebbe mentire una
//    colonna, ed è la mossa che questo progetto ha già rifiutato una volta.
// 2. Aggiungere un quarto asse toccherebbe il trigger di immutabilità, l'indice unico, la
//    chiave d'archivio dei PDF e i due switch esaustivi: si cambierebbe l'impianto di
//    quindici tipi di documento per servirne uno.
// 3. Un fascicolo ha UN lettore e vive finché il caso è aperto. Congelarne le versioni
//    produrrebbe un archivio di mezze verità, mentre la legge vuole lo stato attuale.
// 4. **Il collegamento del portale cliente è per AZIENDA, non per documento**, e la
//    pagina pubblica non chiede sessione. Un tipo nuovo comparirebbe dentro i
//    collegamenti già consegnati, senza che nessuno prema niente.
//
// ⚠️ E questo documento NON contiene l'identità del segnalante, perché il modulo non la
// registra da nessuna parte: il legame fra codice e persona lo custodisce il gestore
// fuori dall'applicazione. Chi aggiungesse un campo «nominativo» cambierebbe la natura
// giuridica del prodotto.

type Fascicolo = typeof wbReport.$inferSelect;

const RIQUADRO = {
  border: `1.5px solid ${DOC.ink}`,
  background: DOC.accentBg,
  padding: "14px 18px",
  margin: "22px 0",
} as const;

const val = (v: unknown) => {
  const t = String(v ?? "").trim();
  return t.length ? t : null;
};

function Riga({ k, v }: { k: string; v: unknown }) {
  const t = val(v);
  return (
    <tr>
      <td style={{ width: "38%" }}>{k}</td>
      <td>{t ?? <span className="doc-manca">non indicato</span>}</td>
    </tr>
  );
}

export function DocumentoFascicoloWb({
  f,
  azienda,
  emittente,
  oggi,
}: {
  f: Fascicolo;
  azienda: string;
  emittente: string;
  oggi: string;
}) {
  const perTermini = {
    numero: f.numero,
    anonima: f.anonima,
    recapito: f.recapito,
    codice: f.codice,
    dataRicezione: f.dataRicezione,
    avvisoReso: f.avvisoReso,
    riscontroReso: f.riscontroReso,
    stato: f.stato,
    esito: f.esito,
    canale: f.canale,
    qualita: f.qualita,
    dataChiusura: f.dataChiusura,
    cancellata: f.cancellata,
    monitoraggioAperto: f.monitoraggioAperto,
    ritIdentitaConoscibile: f.ritIdentitaConoscibile,
    ritSovraordinato: f.ritSovraordinato,
    ritContestoRistretto: f.ritContestoRistretto,
    ritPrecedenti: f.ritPrecedenti,
    ritRapportoPrecario: f.ritRapportoPrecario,
    ritGiaEsposto: f.ritGiaEsposto,
  } as Parameters<typeof statoTermine>[0];

  const scadenzaAvviso = avvisoEntro(f.dataRicezione);
  const scadenzaRiscontro = riscontroEntro(f.dataRicezione, f.avvisoReso);
  const conservazioneFino = piuAnni(f.dataChiusura ?? f.dataRicezione, ANNI_CONSERVAZIONE);
  const raggiungibile = contattabile({ anonima: f.anonima, recapito: f.recapito, codice: f.codice });
  const esitoAmm = ammissibilita({
    oggetto: f.ammOggetto,
    legittimato: f.ammLegittimato,
    contesto: f.ammContesto,
    elementi: f.ammElementi,
    nonPersonale: f.ammNonPersonale,
  });
  const ritorsione = livelloRitorsione(fattoriRitorsione(perTermini), f.anonima);

  return (
    <>
      <div className="doc-cover">
        <div className="testo">
          <p className="kicker">Fascicolo della segnalazione</p>
          <h1>N. {f.numero}</h1>
          <p className="sotto">{azienda}</p>
          <p className="sotto" style={{ marginTop: 8, opacity: 0.7 }}>
            D.Lgs. 24/2023 · documento riservato
          </p>
        </div>
        <div className="filo" />
      </div>

      <div className="doc-corpo">
        {/* ⚠️ L'avvertenza sta in CHIARO nel corpo e non in un piede: chi riceve questo
            foglio deve sapere, prima di leggerlo, che cosa ha in mano e che cosa
            rischia a farlo circolare. */}
        <div style={RIQUADRO}>
          <p>
            <strong>Natura del documento.</strong>{" "}
            È il fascicolo interno di una segnalazione ricevuta ai sensi del D.Lgs. 24/2023. È destinato
            esclusivamente ai soggetti espressamente autorizzati alla gestione delle segnalazioni. La
            rivelazione dell&apos;identità del segnalante e di ogni elemento da cui possa desumersi, senza il
            suo consenso espresso, è vietata dall&apos;articolo 12 e comporta le conseguenze ivi previste.
          </p>
          <p>
            <strong>Che cosa non contiene.</strong>{" "}
            Il sistema non registra l&apos;identità del segnalante in nessun campo: il legame fra il codice di
            collegamento e la persona è custodito dal gestore al di fuori dell&apos;applicazione. Questo
            documento non può quindi rivelarla, e non va integrato a mano con dati che lo farebbero.
          </p>
        </div>

        <h2>1. Ricezione</h2>
        <table>
          <tbody>
            <Riga k="Numero di fascicolo" v={f.numero} />
            <Riga k="Data di ricezione" v={f.dataRicezione ? fmtData(f.dataRicezione) : null} />
            <Riga k="Canale" v={f.canale} />
            <tr>
              <td>Forma</td>
              <td>{f.anonima ? "Anonima" : "Non anonima"}</td>
            </tr>
            <Riga k="Codice di collegamento" v={f.codice} />
            <tr>
              <td>Contattabilità</td>
              <td>
                {raggiungibile ? (
                  "Il segnalante è raggiungibile"
                ) : (
                  <span className="doc-manca">
                    Non raggiungibile: i termini non decorrono nei suoi confronti
                  </span>
                )}
              </td>
            </tr>
            <Riga k="Ambito" v={f.ambito} />
            <Riga k="Qualità del segnalante" v={f.qualita} />
          </tbody>
        </table>

        <h2>2. Termini di legge</h2>
        <p>
          L&apos;avviso di ricevimento è dovuto entro <strong>{GG_AVVISO} giorni</strong> (art. 5 c. 1 lett.
          a). Il riscontro entro <strong>{MESI_RISCONTRO} mesi</strong>, e decorre dall&apos;avviso
          effettivamente reso: solo in sua mancanza dalla scadenza dei sette giorni (lett. d).
        </p>
        <table>
          <thead>
            <tr>
              <th>Adempimento</th>
              <th style={{ width: "22%" }}>Entro il</th>
              <th style={{ width: "22%" }}>Reso il</th>
              <th style={{ width: "20%" }}>Stato</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Avviso di ricevimento</td>
              <td>{scadenzaAvviso ? fmtData(scadenzaAvviso) : "—"}</td>
              <td>{f.avvisoReso ? fmtData(f.avvisoReso) : <span className="doc-manca">non reso</span>}</td>
              <td>{statoTermine(perTermini, "avviso", oggi) ?? "—"}</td>
            </tr>
            <tr>
              <td>Riscontro</td>
              <td>{scadenzaRiscontro ? fmtData(scadenzaRiscontro) : "—"}</td>
              <td>
                {f.riscontroReso ? fmtData(f.riscontroReso) : <span className="doc-manca">non reso</span>}
              </td>
              <td>{statoTermine(perTermini, "riscontro", oggi) ?? "—"}</td>
            </tr>
          </tbody>
        </table>
        <p className="doc-meta">
          Conservazione fino al{" "}
          {conservazioneFino ? fmtData(conservazioneFino) : "—"} ({ANNI_CONSERVAZIONE} anni, art. 14 c. 1).
        </p>

        <h2>3. Oggetto</h2>
        <p>{val(f.oggetto) ?? <span className="doc-manca">Oggetto non ancora riassunto.</span>}</p>
        {val(f.fatti) && (
          <>
            <h3>Fatti riferiti</h3>
            <p>{f.fatti}</p>
          </>
        )}
        {(val(f.quando) || val(f.dove)) && (
          <table>
            <tbody>
              <Riga k="Quando" v={f.quando} />
              <Riga k="Dove" v={f.dove} />
              <Riga k="Elementi a supporto" v={f.elementi} />
              <Riga k="Segnalato anche altrove" v={f.altrove} />
            </tbody>
          </table>
        )}

        <h2>4. Ammissibilità</h2>
        <table>
          <tbody>
            <Riga k="Rientra nell'ambito oggettivo" v={f.ammOggetto} />
            <Riga k="Segnalante legittimato" v={f.ammLegittimato} />
            <Riga k="Contesto lavorativo" v={f.ammContesto} />
            <Riga k="Fatti precisi e concordanti" v={f.ammElementi} />
            <Riga k="Non è una lamentela personale" v={f.ammNonPersonale} />
            <tr>
              <td>
                <strong>Esito</strong>
              </td>
              <td>
                <strong>{esitoAmm ?? <span className="doc-manca">non ancora determinabile</span>}</strong>
              </td>
            </tr>
            <Riga k="Motivazione" v={f.ammMotivazione} />
          </tbody>
        </table>

        <h2>5. Rischio di ritorsione</h2>
        <table>
          <tbody>
            <Riga k="Identità conoscibile" v={f.ritIdentitaConoscibile} />
            <Riga k="Segnalato sovraordinato" v={f.ritSovraordinato} />
            <Riga k="Contesto ristretto" v={f.ritContestoRistretto} />
            <Riga k="Precedenti di ritorsione" v={f.ritPrecedenti} />
            <Riga k="Rapporto precario" v={f.ritRapportoPrecario} />
            <Riga k="Già esposto in passato" v={f.ritGiaEsposto} />
            <tr>
              <td>
                <strong>Livello</strong>
              </td>
              <td>
                {/* ⚠️ `null` non è «Basso»: un rischio non valutato non è un rischio
                    assente, e in un fascicolo che qualcuno consulta è la differenza fra
                    attivare un monitoraggio e non attivarlo. */}
                <strong>
                  {ritorsione ?? <span className="doc-manca">non ancora valutato</span>}
                </strong>
              </td>
            </tr>
            <Riga k="Monitoraggio aperto il" v={f.monitoraggioAperto ? fmtData(f.monitoraggioAperto) : null} />
            <Riga k="Fino al" v={f.monitoraggioFino ? fmtData(f.monitoraggioFino) : null} />
          </tbody>
        </table>

        <h2>6. Istruttoria</h2>
        <table>
          <tbody>
            <Riga k="Stato" v={f.stato} />
            <Riga k="Avvio" v={f.avvio ? fmtData(f.avvio) : null} />
            <Riga k="Conclusione" v={f.conclusione ? fmtData(f.conclusione) : null} />
            <Riga k="Conflitto di interessi" v={f.conflitto} />
            <Riga k="Subentrante" v={f.subentrante} />
          </tbody>
        </table>
        {val(f.attivita) && (
          <>
            <h3>Attività svolte</h3>
            <p>{f.attivita}</p>
          </>
        )}
        {val(f.evidenze) && (
          <>
            <h3>Evidenze acquisite</h3>
            <p>{f.evidenze}</p>
          </>
        )}

        <h2>7. Esito</h2>
        <table>
          <tbody>
            <Riga k="Esito" v={f.esito} />
            <Riga k="Rilevanza penale" v={f.rilevanzaPenale} />
            <Riga k="Data di chiusura" v={f.dataChiusura ? fmtData(f.dataChiusura) : null} />
          </tbody>
        </table>
        {val(f.motivazione) && (
          <>
            <h3>Motivazione</h3>
            <p>{f.motivazione}</p>
          </>
        )}
        {val(f.proposteCorrettive) && (
          <>
            <h3>Proposte correttive</h3>
            <p>{f.proposteCorrettive}</p>
          </>
        )}

        <p className="doc-meta">
          Fascicolo n. {f.numero} · stampato da {emittente} per {azienda} il {fmtData(oggi)}. È una
          fotografia dello stato corrente: il fascicolo prosegue nel sistema, e questa copia non lo
          sostituisce. Ogni consultazione, questa compresa, è registrata nel registro degli accessi.
        </p>
      </div>
    </>
  );
}
