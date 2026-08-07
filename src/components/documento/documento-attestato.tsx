import { fmtNum, fmtData } from "@/lib/format";
import { marchioDelloSnapshot } from "@/features/documents/marchio";
import { DOC } from "./charts";
import { codiceVerifica, validoFino } from "@/lib/calc/supplier/attestation";

// Attestato di autovalutazione ESG del fornitore.
//
// È il documento più delicato dei quattro, non per la tecnica ma per ciò che
// dichiara: chi lo riceve potrebbe scambiarlo per una certificazione. Per
// questo la natura del documento è scritta in chiaro, nel corpo e non in una
// nota a piè di pagina, con le parole concordate col committente.

type Snapshot = {
  generatoIl: string;
  azienda: { id: string; nome: string; settore: string | null; sede: string | null };
  valutazione: { sogliaRichiesta: number; profilo: Record<string, string> };
  catalogo: {
    aree: { key: string; nome: string; peso: number; colore: string }[];
    domande: { key: string; areaKey: string; peso: number; testo: string; riferimento: string; evidenzaAttesa: string; giorniStimati: number }[];
    fasce: { min: number; l: string }[];
  };
  risposte: { questionKey: string; risposta: string | null; nota: string | null; statoDocumento: string | null }[];
  piano: { key: string; areaKey: string; azione: string; punti: number; giorni: number; responsabile: string | null; scadenza: string | null; statoAzione: string | null }[];
  esito: {
    indice: number;
    fascia: { key: string; nome: string; min: number };
    valutate: number;
    risposteDiMerito: number;
    pctCompletamento: number;
    perArea: Record<string, { punteggio: number | null; valutate: number; risposte: number; totale: number }>;
    scartoDallaSoglia: number;
    puntiRecuperabili: number;
    giornateStimate: number;
  };
};

const ETICHETTA: Record<string, string> = {
  si: "Sì",
  parziale: "In parte",
  no: "No",
  na: "Non applicabile",
};

const STATO_AZIONE: Record<string, string> = {
  da_avviare: "Da avviare",
  in_corso: "In corso",
  completata: "Completata",
};

const COLORE_AREA = [DOC.scope1, DOC.e, DOC.s, DOC.scope3, DOC.scope2];

export function DocumentoAttestato({ dati, snapshotId, versione }: { dati: Snapshot; snapshotId: string; versione: number }) {
  const { azienda, valutazione: v, catalogo, esito } = dati;
  const p = v.profilo;
  const codice = codiceVerifica(snapshotId, azienda.id, esito.indice, versione);
  const scadenza = validoFino(dati.generatoIl);
  const rispostaPer = new Map(dati.risposte.map((r) => [r.questionKey, r]));
  const nomeArea = new Map(catalogo.aree.map((a) => [a.key, a.nome]));
  const superata = esito.scartoDallaSoglia >= 0;

  return (
    <>
      <div className="doc-cover">
        <div className="testo">
          <p className="kicker">Attestato di autovalutazione ESG</p>
          <h1>{azienda.nome}</h1>
          <p className="sotto">
            {[p.sede || azienda.sede, p.settore || azienda.settore].filter(Boolean).join(" · ")}
          </p>
          {p.committente && (
            <p className="sotto" style={{ marginTop: 8, opacity: 0.7 }}>
              Su richiesta di {p.committente}
            </p>
          )}
        </div>
        <div className="filo" />
      </div>

      <div className="doc-corpo">
        <h2>Esito della valutazione</h2>

        {/* Il numero grande, la fascia e il codice: le tre cose che chi riceve
            l'attestato guarda per prime. */}
        <table>
          <tbody>
            <tr>
              <td style={{ width: "38%" }}>Indice di prontezza</td>
              <td>
                <strong style={{ fontSize: "1.6em" }}>{esito.indice}</strong>
                <span className="doc-meta"> su 100 — {esito.fascia.nome}</span>
              </td>
            </tr>
            <tr>
              <td>Soglia richiesta</td>
              <td>
                {v.sogliaRichiesta}{" "}
                <span className="doc-meta">
                  {superata
                    ? `— superata di ${esito.scartoDallaSoglia} punti`
                    : `— non raggiunta per ${Math.abs(esito.scartoDallaSoglia)} punti`}
                </span>
              </td>
            </tr>
            <tr><td>Domande valutate</td><td>{esito.valutate} di {catalogo.domande.length} ({esito.pctCompletamento}%)</td></tr>
            <tr><td>Codice di verifica</td><td><strong className="doc-mono">{codice}</strong></td></tr>
            <tr><td>Data di emissione</td><td>{fmtData(dati.generatoIl)}</td></tr>
            <tr><td>Da rinnovare entro</td><td>{fmtData(scadenza)}</td></tr>
          </tbody>
        </table>

        {/* ─────────────────────────── natura del documento ─────────────────
            In chiaro e nel corpo, non a piè di pagina: è la ragione per cui
            questo attestato può circolare senza essere frainteso. */}
        <div
          style={{
            border: `1.5px solid ${DOC.ink}`,
            background: DOC.accentBg,
            padding: "14px 18px",
            margin: "22px 0",
          }}
        >
          <p style={{ margin: 0 }}>
            <strong>Natura del documento.</strong>{" "}
            Questo attestato riporta l&apos;esito di un&apos;<strong>autovalutazione</strong>{" "}
            compilata dall&apos;azienda sulla base delle proprie evidenze documentali. Non costituisce certificazione, non deriva da verifica ispettiva di parte terza e non è
            rilasciato sotto accreditamento. Il committente può richiedere le evidenze a supporto e disporre
            verifiche indipendenti.
          </p>
        </div>

        <h2>Punteggio per area</h2>
        <table>
          <thead>
            <tr>
              <th>Area di valutazione</th>
              <th className="doc-num">Peso</th>
              <th className="doc-num">Punteggio</th>
              <th className="doc-num">Valutate</th>
            </tr>
          </thead>
          <tbody>
            {catalogo.aree.map((a, i) => {
              const s = esito.perArea[a.key];
              const punteggio = s?.punteggio;
              return (
                <tr key={a.key}>
                  <td>
                    <strong>{a.nome}</strong>
                    {/* Barra proporzionale: in stampa dice a colpo d'occhio
                        dove l'azienda è forte e dove no. */}
                    <div style={{ marginTop: 4, height: 6, background: DOC.line, borderRadius: 3 }}>
                      <div
                        style={{
                          width: `${punteggio ?? 0}%`,
                          height: "100%",
                          background: COLORE_AREA[i % COLORE_AREA.length],
                          borderRadius: 3,
                        }}
                      />
                    </div>
                  </td>
                  <td className="doc-num">{a.peso}%</td>
                  <td className="doc-num">
                    {punteggio === null || punteggio === undefined
                      ? <span className="doc-meta">non valutata</span>
                      : <strong>{punteggio}</strong>}
                  </td>
                  <td className="doc-num">{s?.valutate ?? 0} / {s?.totale ?? 0}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <p className="doc-meta">
          L&apos;indice complessivo è la media dei punteggi di area ponderata con i pesi indicati, calcolata
          sulle sole aree che hanno almeno una risposta di merito. Le domande dichiarate non applicabili
          contano come valutate ma non entrano nel punteggio.
        </p>

        <h2>Anagrafica dell&apos;azienda valutata</h2>
        <table>
          <tbody>
            <tr><td style={{ width: "38%" }}>Denominazione</td><td><strong>{azienda.nome}</strong></td></tr>
            {p.piva && <tr><td>Partita IVA</td><td className="doc-mono">{p.piva}</td></tr>}
            {(p.sede || azienda.sede) && <tr><td>Sede operativa</td><td>{p.sede || azienda.sede}</td></tr>}
            {(p.settore || azienda.settore) && (
              <tr><td>Settore</td><td>{p.settore || azienda.settore}{p.ateco ? ` (ATECO ${p.ateco})` : ""}</td></tr>
            )}
            {p.dipendenti && <tr><td>Dipendenti</td><td>{p.dipendenti}</td></tr>}
            {p.fatturato && <tr><td>Fatturato</td><td>{p.fatturato} milioni di €</td></tr>}
            <tr>
              <td>Referente per la compilazione</td>
              <td>{p.referente || <span className="doc-manca">non indicato</span>}</td>
            </tr>
            {p.committente && <tr><td>Committente richiedente</td><td>{p.committente}</td></tr>}
          </tbody>
        </table>

        <h2>Risposte al questionario</h2>
        <p>
          Di seguito le {dati.risposte.length}{" "}
          domande su cui l&apos;azienda si è espressa, con il riferimento
          normativo e l&apos;evidenza documentale che ciascuna presuppone. Le domande senza risposta non sono
          riportate: non sono una dichiarazione, sono questionario non compilato.
        </p>
        {catalogo.aree.map((a) => {
          const domande = catalogo.domande.filter((q) => q.areaKey === a.key && rispostaPer.has(q.key));
          if (!domande.length) return null;
          return (
            <div key={a.key}>
              <h3>{a.nome}</h3>
              <table>
                <thead>
                  <tr>
                    <th style={{ width: "44%" }}>Domanda</th>
                    <th>Riferimento</th>
                    <th>Evidenza attesa</th>
                    <th className="doc-num">Risposta</th>
                  </tr>
                </thead>
                <tbody>
                  {domande.map((q) => {
                    const r = rispostaPer.get(q.key)!;
                    return (
                      <tr key={q.key}>
                        <td>
                          <span className="doc-mono">{q.key}</span> {q.testo}
                          {r.nota && <div className="doc-meta">{r.nota}</div>}
                        </td>
                        <td className="doc-meta">{q.riferimento}</td>
                        <td className="doc-meta">{q.evidenzaAttesa}</td>
                        <td className="doc-num"><strong>{ETICHETTA[r.risposta ?? ""] ?? "—"}</strong></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          );
        })}

        {dati.piano.length > 0 && (
          <>
            <h2>Piano di adeguamento</h2>
            <p>
              Le lacune dichiarate, ordinate per punti di indice guadagnati per giornata di lavoro. Chiudendole
              tutte l&apos;indice salirebbe di circa <strong>{fmtNum(esito.puntiRecuperabili, 1)} punti</strong>,
              con un impegno stimato di {esito.giornateStimate} giornate.
            </p>
            <table>
              <thead>
                <tr>
                  <th style={{ width: "46%" }}>Azione</th>
                  <th>Area</th>
                  <th className="doc-num">Punti</th>
                  <th className="doc-num">Giorni</th>
                  <th>Responsabile</th>
                  <th>Stato</th>
                </tr>
              </thead>
              <tbody>
                {dati.piano.map((v2) => (
                  <tr key={v2.key}>
                    <td><span className="doc-mono">{v2.key}</span> {v2.azione}</td>
                    <td className="doc-meta">{nomeArea.get(v2.areaKey)}</td>
                    <td className="doc-num">+{fmtNum(v2.punti, 1)}</td>
                    <td className="doc-num">{v2.giorni}</td>
                    <td>
                      {v2.responsabile || <span className="doc-meta">da assegnare</span>}
                      {v2.scadenza && <div className="doc-meta">entro il {fmtData(v2.scadenza)}</div>}
                    </td>
                    <td>{v2.statoAzione ? STATO_AZIONE[v2.statoAzione] : <span className="doc-meta">—</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}

        <h2>Come leggere il punteggio</h2>
        <table>
          <thead><tr><th>Fascia</th><th className="doc-num">Da</th><th>Significato</th></tr></thead>
          <tbody>
            {[...catalogo.fasce].sort((x, y) => y.min - x.min).map((f) => (
              <tr key={f.l}>
                <td><strong>{f.l}</strong></td>
                <td className="doc-num">{f.min}</td>
                <td className="doc-meta">
                  {f.min >= 90 && "Presidio maturo su tutte le aree, con evidenze documentali complete."}
                  {f.min === 75 && "Requisiti di filiera soddisfatti; restano margini di consolidamento."}
                  {f.min === 60 && "Presidio sufficiente sui temi principali, con lacune circoscritte."}
                  {f.min === 40 && "Percorso avviato: mancano presidi su più aree."}
                  {f.min === 0 && "Presidio non ancora strutturato."}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <h2>Riferimenti metodologici</h2>
        <ul>
          <li>ESRS — European Sustainability Reporting Standards (Reg. UE 2023/2772).</li>
          <li>GRI Standards 2021 — Global Reporting Initiative.</li>
          <li>UNI ISO 20400:2017 — Acquisti sostenibili. Guida.</li>
          <li>D.Lgs. 231/2001 — Responsabilità amministrativa degli enti.</li>
          <li>D.Lgs. 24/2023 — Segnalazione di illeciti (whistleblowing).</li>
          <li>D.Lgs. 81/2008 — Tutela della salute e sicurezza nei luoghi di lavoro.</li>
        </ul>

        <p className="doc-meta">
          Documento generato il {fmtData(dati.generatoIl)} da {marchioDelloSnapshot(dati).nome} · revisione {versione} · codice di
          verifica {codice}. I valori riportati sono congelati alla data di emissione: modifiche successive
          all&apos;autovalutazione non alterano questo attestato, che resta la versione consegnata.
        </p>
      </div>
    </>
  );
}
