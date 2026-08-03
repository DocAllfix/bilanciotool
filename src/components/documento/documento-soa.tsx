import { fmtData } from "@/lib/format";
import { DOC } from "./charts";

// Dichiarazione di Applicabilità (ISO/IEC 27001:2022 §6.1.3 d).
//
// È il documento più formale dei cinque: un organismo di certificazione lo
// legge riga per riga cercando quattro cose per ogni controllo — se è
// applicabile, perché, a che punto è, e quale documento lo sostiene. La
// struttura tabellare per sezione è quella che si aspetta di trovare.

type Snapshot = {
  generatoIl: string;
  azienda: { id: string; nome: string; settore: string | null; sede: string | null };
  dichiarazione: {
    sogliaObiettivo: number;
    ruoloPrivacy: string;
    ruoloCloud: string;
    profilo: Record<string, string>;
  };
  catalogo: {
    quadri: { key: string; nome: string; abbreviazione: string; descrizione: string; sempreInAmbito: boolean; totale: number }[];
    sezioni: { key: string; frameworkKey: string; nome: string }[];
    controlli: { frameworkKey: string; sectionKey: string; controlloId: string; titolo: string; evidenzaAttesa: string; cardine: boolean; rimandi: string | null }[];
    stati: Record<string, { n: string; v: number }>;
    motivazioni: Record<string, { n: string; ab: string }>;
    fasce: { min: number; l: string }[];
  };
  stato: {
    moduliAttivi: Record<string, boolean>;
    decisioni: {
      frameworkKey: string; controlloId: string; applicabile: boolean;
      giustificazione: string | null; motivazioni: string[]; stato: string | null;
      riferimentoDoc: string | null; responsabile: string | null; note: string | null;
    }[];
    piano: { frameworkKey: string; controlloId: string; priorita: string; cardine: boolean; responsabile: string | null; scadenza: string | null }[];
    rilievi: { key: string; titolo: string; controlli: string[] }[];
  };
  esito: {
    indice: number;
    fascia: { key: string; nome: string; min: number };
    totale: number;
    applicabili: number;
    esclusi: number;
    conStato: number;
    attuati: number;
    pctCompletamento: number;
    perFramework: Record<string, { totale: number; applicabili: number; esclusi: number; punteggio: number }>;
    perSezione: Record<string, { totale: number; applicabili: number; esclusi: number; punteggio: number }>;
    scartoDallObiettivo: number;
  };
};

const RUOLO_PRIVACY: Record<string, string> = {
  titolare: "Titolare del trattamento",
  responsabile: "Responsabile del trattamento",
  entrambi: "Titolare e responsabile del trattamento",
  nessuno: "Nessun trattamento di dati personali",
};

const RUOLO_CLOUD: Record<string, string> = {
  cliente: "Cliente di servizi cloud",
  fornitore: "Fornitore di servizi cloud",
  entrambi: "Cliente e fornitore di servizi cloud",
  nessuno: "Nessun servizio cloud",
};

const chiave = (fw: string, id: string) => `${fw}|${id}`;

export function DocumentoSoa({ dati }: { dati: Snapshot }) {
  const { azienda, dichiarazione: d, catalogo, stato, esito } = dati;
  const p = d.profilo;
  const decisionePer = new Map(stato.decisioni.map((x) => [chiave(x.frameworkKey, x.controlloId), x]));
  const quadriInAmbito = catalogo.quadri.filter((q) => esito.perFramework[q.key]);

  const sigle = (m: string[]) =>
    m.map((k) => catalogo.motivazioni[k]?.ab ?? k.toUpperCase()).join(" · ");

  return (
    <>
      <div className="doc-cover">
        <div className="testo">
          <p className="kicker">Dichiarazione di Applicabilità</p>
          <h1>{azienda.nome}</h1>
          <p className="sotto">
            {[p.sede || azienda.sede, azienda.settore].filter(Boolean).join(" · ")}
          </p>
          <p className="sotto" style={{ marginTop: 8, opacity: 0.7 }}>
            ISO/IEC 27001:2022 · revisione {p.versione || "1.0"}
            {p.data ? ` del ${fmtData(p.data)}` : ""}
          </p>
        </div>
        <div className="filo" />
      </div>

      <div className="doc-corpo">
        {/* ── 1. identificazione ────────────────────────────────────────── */}
        <h2>1. Identificazione del documento</h2>
        <table>
          <tbody>
            <tr><td style={{ width: "38%" }}>Organizzazione</td><td><strong>{azienda.nome}</strong></td></tr>
            {p.piva && <tr><td>Partita IVA</td><td className="doc-mono">{p.piva}</td></tr>}
            {(p.sede || azienda.sede) && <tr><td>Sedi nel perimetro</td><td>{p.sede || azienda.sede}</td></tr>}
            <tr><td>Revisione</td><td>{p.versione || "1.0"}{p.data ? ` — ${fmtData(p.data)}` : ""}</td></tr>
            <tr><td>Redatto da</td><td>{p.redatto || <span className="doc-manca">non indicato</span>}</td></tr>
            <tr><td>Approvato da</td><td>{p.approvato || <span className="doc-manca">non indicato</span>}</td></tr>
            <tr><td>Ruolo nel trattamento dei dati personali</td><td>{RUOLO_PRIVACY[d.ruoloPrivacy] ?? d.ruoloPrivacy}</td></tr>
            <tr><td>Posizione rispetto ai servizi cloud</td><td>{RUOLO_CLOUD[d.ruoloCloud] ?? d.ruoloCloud}</td></tr>
          </tbody>
        </table>

        {/* ── 2. campo di applicazione ──────────────────────────────────── */}
        <h2>2. Campo di applicazione del sistema di gestione</h2>
        <p>{p.scope || <span className="doc-manca">Campo di applicazione non ancora definito.</span>}</p>
        {p.esclusioni && <p><strong>Esclusioni dal perimetro.</strong> {p.esclusioni}</p>}

        {/* ── 3. quadri di riferimento ──────────────────────────────────── */}
        <h2>3. Quadri di riferimento in ambito</h2>
        <table>
          <thead>
            <tr>
              <th>Quadro</th><th>Che cosa comprende</th>
              <th className="doc-num">Controlli</th><th className="doc-num">Applicabili</th><th className="doc-num">Maturità</th>
            </tr>
          </thead>
          <tbody>
            {quadriInAmbito.map((q) => {
              const a = esito.perFramework[q.key];
              return (
                <tr key={q.key}>
                  <td><strong>{q.nome}</strong></td>
                  <td className="doc-meta">{q.descrizione}</td>
                  <td className="doc-num">{a.totale}</td>
                  <td className="doc-num">{a.applicabili}{a.esclusi > 0 ? ` (−${a.esclusi})` : ""}</td>
                  <td className="doc-num"><strong>{a.punteggio}</strong></td>
                </tr>
              );
            })}
            <tr className="doc-tot">
              <td colSpan={2}>Totale in ambito</td>
              <td className="doc-num">{esito.totale}</td>
              <td className="doc-num">{esito.applicabili}</td>
              <td className="doc-num">{esito.indice}</td>
            </tr>
          </tbody>
        </table>

        {/* ── 4. sintesi ────────────────────────────────────────────────── */}
        <h2>4. Sintesi dello stato di attuazione</h2>
        <table>
          <tbody>
            <tr>
              <td style={{ width: "52%" }}>Indice di maturità</td>
              <td><strong style={{ fontSize: "1.4em" }}>{esito.indice}</strong> su 100 — {esito.fascia.nome}</td>
            </tr>
            <tr>
              <td>Obiettivo dichiarato</td>
              <td>
                {d.sogliaObiettivo}{" "}
                <span className="doc-meta">
                  {esito.scartoDallObiettivo >= 0
                    ? `— superato di ${esito.scartoDallObiettivo} punti`
                    : `— mancano ${Math.abs(esito.scartoDallObiettivo)} punti`}
                </span>
              </td>
            </tr>
            <tr><td>Controlli applicabili con stato dichiarato</td><td>{esito.conStato} su {esito.applicabili} ({esito.pctCompletamento}%)</td></tr>
            <tr><td>Controlli attuati o attuati e verificati</td><td>{esito.attuati} su {esito.applicabili}</td></tr>
            <tr><td>Controlli esclusi con giustificazione</td><td>{esito.esclusi}</td></tr>
          </tbody>
        </table>
        <p className="doc-meta">
          L&apos;indice è la media dei valori di maturità su tutti i controlli applicabili. Un controllo
          applicabile privo di stato dichiarato concorre con valore zero: un presidio non dichiarato non è un
          presidio dimostrabile.
        </p>

        {/* ── 5. la tabella, sezione per sezione ────────────────────────── */}
        <h2>5. Dichiarazione di Applicabilità dei controlli</h2>
        <p>
          Per ciascun controllo: se è applicabile, la motivazione dell&apos;inclusione o la giustificazione
          dell&apos;esclusione, lo stato di attuazione e il riferimento documentale che lo sostiene.
        </p>
        <p className="doc-meta">
          Sigle delle motivazioni di inclusione:{" "}
          {Object.entries(catalogo.motivazioni).map(([k, v]) => `${v.ab} = ${v.n}`).join(" · ")}.
        </p>

        {quadriInAmbito.map((q) => (
          <div key={q.key}>
            <h3>{q.nome}</h3>
            {catalogo.sezioni
              .filter((s) => s.frameworkKey === q.key)
              .map((s) => {
                const controlli = catalogo.controlli.filter((c) => c.sectionKey === s.key);
                if (!controlli.length) return null;
                const a = esito.perSezione[s.key];
                return (
                  <div key={s.key}>
                    <p style={{ margin: "10pt 0 4pt", fontWeight: 600 }}>
                      {s.nome}
                      {a && (
                        <span className="doc-meta">
                          {" "}— {a.applicabili} applicabili su {a.totale}, maturità {a.punteggio}
                        </span>
                      )}
                    </p>
                    <table>
                      <thead>
                        <tr>
                          <th style={{ width: "8%" }}>Rif.</th>
                          <th style={{ width: "30%" }}>Controllo</th>
                          <th style={{ width: "9%" }}>Applic.</th>
                          <th style={{ width: "12%" }}>Motivazioni</th>
                          <th style={{ width: "16%" }}>Stato</th>
                          <th>Riferimento documentale</th>
                        </tr>
                      </thead>
                      <tbody>
                        {controlli.map((c) => {
                          const dec = decisionePer.get(chiave(c.frameworkKey, c.controlloId));
                          const applicabile = dec?.applicabile !== false;
                          return (
                            <tr key={c.controlloId}>
                              <td className="doc-mono">{c.controlloId}</td>
                              <td>
                                {c.titolo}
                                {c.cardine && <span className="doc-meta"> · cardine</span>}
                                {!applicabile && (
                                  <div className="doc-meta">
                                    <strong>Giustificazione:</strong>{" "}
                                    {dec?.giustificazione || <span className="doc-manca">non fornita</span>}
                                  </div>
                                )}
                                {applicabile && dec?.note && <div className="doc-meta">{dec.note}</div>}
                              </td>
                              <td>{applicabile ? "Sì" : "No"}</td>
                              <td className="doc-mono">
                                {applicabile
                                  ? (dec?.motivazioni?.length ? sigle(dec.motivazioni) : <span className="doc-manca">—</span>)
                                  : "—"}
                              </td>
                              <td>
                                {!applicabile
                                  ? "—"
                                  : dec?.stato
                                    ? catalogo.stati[dec.stato]?.n ?? dec.stato
                                    : <span className="doc-manca">non dichiarato</span>}
                              </td>
                              <td>
                                {!applicabile
                                  ? "—"
                                  : dec?.riferimentoDoc || <span className="doc-manca">—</span>}
                                {applicabile && dec?.responsabile && (
                                  <div className="doc-meta">{dec.responsabile}</div>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                );
              })}
          </div>
        ))}

        {/* ── 6. legenda ───────────────────────────────────────────────── */}
        <h2>6. Legenda degli stati di attuazione</h2>
        <table>
          <thead><tr><th>Stato</th><th className="doc-num">Valore</th><th>Significato</th></tr></thead>
          <tbody>
            {Object.entries(catalogo.stati).map(([k, v]) => (
              <tr key={k}>
                <td><strong>{v.n}</strong></td>
                <td className="doc-num">{v.v}</td>
                <td className="doc-meta">
                  {k === "nd" && "Il presidio non è stato realizzato."}
                  {k === "pl" && "Il presidio è previsto e pianificato, non ancora realizzato."}
                  {k === "pa" && "Il presidio esiste in parte o non copre l'intero perimetro."}
                  {k === "at" && "Il presidio è realizzato e documentato."}
                  {k === "av" && "Il presidio è realizzato, documentato e la sua efficacia è stata verificata."}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* ── 7. piano ─────────────────────────────────────────────────── */}
        {stato.piano.length > 0 && (
          <>
            <h2>7. Piano di attuazione</h2>
            <p>
              I controlli applicabili non ancora attuati, in ordine di priorità. Sono in priorità alta i
              controlli cardine, quelli privi di stato dichiarato e quelli dichiarati non attuati.
            </p>
            <table>
              <thead>
                <tr>
                  <th style={{ width: "8%" }}>Rif.</th>
                  <th style={{ width: "38%" }}>Controllo</th>
                  <th style={{ width: "12%" }}>Priorità</th>
                  <th>Responsabile</th>
                  <th style={{ width: "14%" }}>Entro</th>
                </tr>
              </thead>
              <tbody>
                {stato.piano.slice(0, 40).map((v) => {
                  const c = catalogo.controlli.find(
                    (x) => x.frameworkKey === v.frameworkKey && x.controlloId === v.controlloId,
                  );
                  return (
                    <tr key={chiave(v.frameworkKey, v.controlloId)}>
                      <td className="doc-mono">{v.controlloId}</td>
                      <td>{c?.titolo}{v.cardine && <span className="doc-meta"> · cardine</span>}</td>
                      <td>{v.priorita === "alta" ? <strong>Alta</strong> : "Media"}</td>
                      <td>{v.responsabile || <span className="doc-manca">da assegnare</span>}</td>
                      <td>{v.scadenza ? fmtData(v.scadenza) : <span className="doc-manca">—</span>}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {stato.piano.length > 40 && (
              <p className="doc-meta">
                Sono riportati i primi 40 controlli del piano su {stato.piano.length} complessivi.
              </p>
            )}
          </>
        )}

        {/* ── 8. conformità ────────────────────────────────────────────── */}
        <h2>8. Nota di conformità</h2>
        <div
          style={{
            border: `1.5px solid ${DOC.ink}`,
            background: DOC.accentBg,
            padding: "14px 18px",
            margin: "10pt 0 14pt",
          }}
        >
          <p style={{ margin: 0 }}>
            Il presente documento costituisce la <strong>Dichiarazione di Applicabilità</strong> richiesta dal
            punto <strong>6.1.3 lettera d)</strong> della norma <strong>UNI CEI EN ISO/IEC 27001:2022</strong>.
            Contiene i controlli necessari, la giustificazione della loro inclusione, il loro stato di
            attuazione e la giustificazione dell&apos;esclusione dei controlli dell&apos;Allegato A non
            applicabili.
          </p>
        </div>
        <p>
          I controlli sono tratti dall&apos;Allegato A della ISO/IEC 27001:2022 e, per i quadri estesi attivati,
          dagli allegati delle norme ISO/IEC 27017, ISO/IEC 27018 e ISO/IEC 27701. La selezione discende dalla
          valutazione del rischio e dagli obblighi legali, contrattuali e di business dell&apos;organizzazione,
          come indicato nella colonna delle motivazioni.
        </p>

        <h3>Approvazione</h3>
        <table>
          <tbody>
            <tr>
              <td style={{ width: "50%" }}>
                <strong>Redatto da</strong>
                <div style={{ marginTop: 26, borderTop: `0.5pt solid ${DOC.line}`, paddingTop: 4 }} className="doc-meta">
                  {p.redatto || "—"}
                </div>
              </td>
              <td>
                <strong>Approvato da</strong>
                <div style={{ marginTop: 26, borderTop: `0.5pt solid ${DOC.line}`, paddingTop: 4 }} className="doc-meta">
                  {p.approvato || "—"}
                </div>
              </td>
            </tr>
          </tbody>
        </table>

        <h2>Riferimenti normativi</h2>
        <ul>
          <li>UNI CEI EN ISO/IEC 27001:2022 — Sistemi di gestione per la sicurezza delle informazioni. Requisiti.</li>
          <li>ISO/IEC 27002:2022 — Controlli di sicurezza delle informazioni.</li>
          <li>ISO/IEC 27017:2015 — Controlli per i servizi cloud.</li>
          <li>ISO/IEC 27018:2019 — Protezione dei dati personali nel cloud pubblico.</li>
          <li>ISO/IEC 27701:2019 — Estensione per la gestione delle informazioni sulla privacy.</li>
          <li>Regolamento (UE) 2016/679 (GDPR) e D.Lgs. 196/2003 come modificato dal D.Lgs. 101/2018.</li>
        </ul>

        <p className="doc-meta">
          Documento generato il {fmtData(dati.generatoIl)} da EvalisDeck. I valori riportati sono congelati alla
          data di emissione: modifiche successive alla Dichiarazione non alterano questa revisione, che resta la
          versione consegnata.
        </p>
      </div>
    </>
  );
}
