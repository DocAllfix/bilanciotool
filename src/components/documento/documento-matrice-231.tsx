import { fmtData } from "@/lib/format";
import { marchioDelloSnapshot } from "@/features/documents/marchio";

// Matrice reati-processi (D.Lgs. 231/2001, art. 6 c. 2 lett. a).
//
// È il documento che un giudice guarda per primo, e la domanda a cui deve rispondere è
// una sola: l'ente aveva individuato le attività nel cui ambito i reati possono essere
// commessi? La matrice lo dice processo per processo, con il rischio prima e dopo i
// presidi.
//
// ⚠️ Riporta anche i reati dichiarati applicabili e NON associati a nessun processo. Non
// è un difetto dell'elenco: è la lacuna più grave che un Modello possa avere — «questo
// reato mi riguarda, ma non ho detto dove può accadere» — e tacerla renderebbe il
// documento un'autoassoluzione.

type Scenario = {
  reato: string;
  titolo: string;
  famiglia: string | null;
  probabilita: number | null;
  impatto: number | null;
  adeguatezza: string | null;
  inerente: string | null;
  residuo: string | null;
  accettabile: boolean;
  modalita: string | null;
  note: string | null;
};

type Snapshot = {
  generatoIl: string;
  azienda: { id: string; nome: string; settore: string | null; sede: string | null };
  modello: Record<string, string | null>;
  famiglie: { key: string; nome: string }[];
  processi: {
    nome: string;
    area: string | null;
    responsabile: string | null;
    descrizione: string | null;
    presidi: string | null;
    livello: string | null;
    scenari: Scenario[];
  }[];
  reati: {
    key: string;
    titolo: string;
    famiglia: string;
    applicabile: string | null;
    motivazione: string | null;
    processi: number;
  }[];
  indicatori: {
    processi: number; scenari: number; nonAccettabili: number; nonValutati: number;
    reatiApplicabili: number; reatiDaDeterminare: number; applicabiliSenzaScenario: number;
  };
};

const SCALA_P = ["", "remota", "possibile", "probabile", "attesa"];
const SCALA_I = ["", "lieve", "moderato", "grave", "molto grave"];

export function DocumentoMatrice231({ dati }: { dati: Snapshot }) {
  const { azienda, modello: m, processi, reati, indicatori: k } = dati;
  const scoperti = reati.filter((r) => r.applicabile === "Sì" && r.processi === 0);
  const nomeFamiglia = new Map(dati.famiglie.map((f) => [f.key, f.nome]));

  return (
    <>
      <div className="doc-cover">
        <div className="testo">
          <p className="kicker">Matrice reati-processi</p>
          <h1>{m.ragione || azienda.nome}</h1>
          <p className="sotto">{[m.sede || azienda.sede, m.settore || azienda.settore].filter(Boolean).join(" · ")}</p>
          <p className="sotto" style={{ marginTop: 8, opacity: 0.7 }}>
            Modello di organizzazione, gestione e controllo · D.Lgs. 231/2001
            {m.revisione ? ` · revisione ${m.revisione}` : ""}
          </p>
        </div>
        <div className="filo" />
      </div>

      <div className="doc-corpo">
        <h2>1. Oggetto</h2>
        <p>
          La presente matrice individua le attività nel cui ambito possono essere commessi i reati previsti dal
          D.Lgs. 231/2001, ai sensi dell&apos;art. 6 comma 2 lettera a). Per ciascuna coppia processo-reato
          riporta il rischio <strong>inerente</strong> — quanto peserebbe lo scenario in assenza di presidi — e
          il rischio <strong>residuo</strong>, cioè quanto pesa considerati i presidi dichiarati.
        </p>
        <table>
          <tbody>
            <tr><td style={{ width: "58%" }}>Processi sensibili individuati</td><td><strong>{k.processi}</strong></td></tr>
            <tr><td>Scenari valutati</td><td>{k.scenari - k.nonValutati} su {k.scenari}</td></tr>
            <tr><td>Scenari con rischio residuo non accettabile</td><td><strong>{k.nonAccettabili}</strong></td></tr>
            <tr><td>Reati dichiarati applicabili</td><td>{k.reatiApplicabili}</td></tr>
            {m.dataAdozione && <tr><td>Data di adozione del Modello</td><td>{fmtData(m.dataAdozione)}</td></tr>}
            {m.dataDelibera && <tr><td>Delibera dell&apos;organo amministrativo</td><td>{fmtData(m.dataDelibera)}</td></tr>}
          </tbody>
        </table>

        <h2>2. Come si legge il rischio</h2>
        <p>
          Il rischio inerente nasce dal prodotto di probabilità e impatto. Il rischio residuo si ottiene
          incrociandolo con l&apos;adeguatezza dei presidi. <strong>Presidi non dichiarati valgono «Assenti»</strong>:
          in materia 231 l&apos;onere è dell&apos;ente, e presidi che nessuno ha dichiarato non risultano. Uno
          scenario non valutato non è considerato accettabile.
        </p>

        {processi.map((p) => (
          <div key={p.nome}>
            <h2>
              {p.nome}
              {p.livello ? ` — rischio ${p.livello}` : ""}
            </h2>
            {(p.area || p.responsabile) && (
              <p style={{ opacity: 0.75 }}>
                {[p.area, p.responsabile].filter(Boolean).join(" · ")}
              </p>
            )}
            {p.descrizione && <p>{p.descrizione}</p>}
            {p.presidi && (
              <p>
                <strong>Presidi in essere.</strong> {p.presidi}
              </p>
            )}
            {p.scenari.length === 0 ? (
              <p className="doc-manca">Nessun reato associato a questo processo.</p>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th style={{ width: "9%" }}>Art.</th>
                    <th>Reato presupposto</th>
                    <th style={{ width: "17%" }}>Probabilità · impatto</th>
                    <th style={{ width: "13%" }}>Presidi</th>
                    <th style={{ width: "11%" }}>Inerente</th>
                    <th style={{ width: "11%" }}>Residuo</th>
                  </tr>
                </thead>
                <tbody>
                  {p.scenari.map((s) => (
                    <tr key={s.reato}>
                      <td className="doc-mono">{s.reato}</td>
                      <td>
                        {s.titolo}
                        {s.modalita && (
                          <>
                            <br />
                            <span style={{ opacity: 0.75 }}>{s.modalita}</span>
                          </>
                        )}
                      </td>
                      <td>
                        {s.probabilita && s.impatto ? (
                          `${s.probabilita} ${SCALA_P[s.probabilita]} · ${s.impatto} ${SCALA_I[s.impatto]}`
                        ) : (
                          <span className="doc-manca">non valutato</span>
                        )}
                      </td>
                      <td>{s.adeguatezza ?? <span className="doc-manca">non dichiarati</span>}</td>
                      <td>{s.inerente ?? "—"}</td>
                      <td>
                        <strong>{s.residuo ?? "—"}</strong>
                        {s.residuo && !s.accettabile ? <br /> : null}
                        {s.residuo && !s.accettabile ? <span>non accettabile</span> : null}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        ))}

        <h2>Applicabilità dei reati presupposto</h2>
        <p>
          L&apos;esclusione di un reato è una decisione motivata dell&apos;ente, non un silenzio: i reati per cui
          l&apos;applicabilità non è stata determinata compaiono come tali.
        </p>
        <table>
          <thead>
            <tr>
              <th style={{ width: "9%" }}>Art.</th>
              <th>Reato presupposto</th>
              <th style={{ width: "14%" }}>Applicabile</th>
              <th style={{ width: "30%" }}>Motivazione · processi</th>
            </tr>
          </thead>
          <tbody>
            {reati.map((r) => (
              <tr key={r.key}>
                <td className="doc-mono">{r.key}</td>
                <td>
                  {r.titolo}
                  <br />
                  <span style={{ opacity: 0.7 }}>{nomeFamiglia.get(r.famiglia) ?? r.famiglia}</span>
                </td>
                <td>{r.applicabile ?? <span className="doc-manca">da determinare</span>}</td>
                <td>
                  {r.motivazione || (r.processi > 0 ? `${r.processi} processi` : <span className="doc-manca">—</span>)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {scoperti.length > 0 && (
          <>
            <h2>Reati applicabili non ricondotti ad alcun processo</h2>
            <p>
              I reati che seguono sono stati dichiarati applicabili all&apos;ente, ma il Modello non individua in
              quale attività possano essere commessi. È la lacuna che l&apos;art. 6 comma 2 lettera a) chiede di
              colmare, ed è riportata qui perché tacerla renderebbe questo documento inutilizzabile.
            </p>
            <table>
              <thead>
                <tr><th style={{ width: "9%" }}>Art.</th><th>Reato presupposto</th></tr>
              </thead>
              <tbody>
                {scoperti.map((r) => (
                  <tr key={r.key}>
                    <td className="doc-mono">{r.key}</td>
                    <td>{r.titolo}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}

        <h2>Riferimenti normativi</h2>
        <ul>
          <li>D.Lgs. 8 giugno 2001 n. 231 — Disciplina della responsabilità amministrativa degli enti.</li>
          <li>Art. 6 comma 2 lettera a) — individuazione delle attività nel cui ambito possono essere commessi reati.</li>
          <li>Linee guida di Confindustria per la costruzione dei modelli di organizzazione, gestione e controllo.</li>
        </ul>

        <p className="doc-meta">
          Documento generato il {fmtData(dati.generatoIl)} da {marchioDelloSnapshot(dati).nome}. I valori
          riportati sono congelati alla data di emissione: modifiche successive al Modello non alterano questa
          revisione, che resta la versione consegnata.
        </p>
      </div>
    </>
  );
}
