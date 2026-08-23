import { fmtData } from "@/lib/format";
import { marchioDelloSnapshot } from "@/features/documents/marchio";
import { DOC } from "./charts";

// Riesame di direzione del sistema di gestione integrato (ISO 9001 · 14001 · 45001, §9.3).
//
// È il documento che un auditor chiede per primo, e il suo destinatario è l'alta
// direzione. Risponde a tre domande: quanto del sistema è attuato, come vanno gli
// indicatori, che cosa resta aperto.
//
// ⚠️ Riporta anche le LACUNE — requisiti non conformi e indicatori fuori target. Un
// riesame che elencasse solo ciò che funziona sarebbe un'autoassoluzione, e la norma
// chiede l'opposto: gli elementi in uscita del riesame sono decisioni su ciò che non va.
//
// Tutto è congelato nello snapshot, **perimetro delle norme compreso**: un riesame
// consegnato dice «conformità 72%», e se domani si aggiunge la 45001 quel numero cambia.
// Chi ha ricevuto il documento ha in mano il giudizio su un altro sistema.

type Indicatore = {
  codice: string | null;
  nome: string;
  ambito: string | null;
  um: string | null;
  target: string | null;
  soglia: string | null;
  versoPositivo: boolean;
  stato: "ok" | "mid" | "no" | "nd";
  tendenza: number;
  ultimo: { periodo: string; valore: string | null } | null;
  rilevazioni: number;
};

type Snapshot = {
  generatoIl: string;
  azienda: { id: string; nome: string; settore: string | null; sede: string | null };
  sistema: Record<string, string | null>;
  perimetro: string[];
  norme: { key: string; nome: string; norma: string }[];
  capitoli: { key: string; nome: string; requisiti: number; valutati: number; conformita: number }[];
  perNorma: { key: string; nome: string; norma: string; requisiti: number; valutati: number; conformita: number }[];
  conformita: number | null;
  requisitiValutati: number;
  requisitiTotali: number;
  indicatori: Indicatore[];
  nonConformi: { key: string; riferimento: string; testo: string; norme: string[] }[];
};

const RIQUADRO = {
  border: `1.5px solid ${DOC.ink}`,
  background: DOC.accentBg,
  padding: "14px 18px",
  margin: "22px 0",
} as const;

const STATO: Record<Indicatore["stato"], string> = {
  ok: "a target",
  mid: "sotto il target",
  no: "fuori soglia",
  nd: "non rilevato",
};

export function DocumentoRiesameQas({ dati }: { dati: Snapshot }) {
  const { azienda, sistema: s, indicatori, nonConformi } = dati;
  const marchio = marchioDelloSnapshot(dati);

  const fuori = indicatori.filter((i) => i.stato === "no");
  const senzaRilevazioni = indicatori.filter((i) => i.rilevazioni === 0);
  const senzaTarget = indicatori.filter((i) => i.target === null);

  return (
    <>
      <div className="doc-cover">
        <div className="testo">
          <p className="kicker">Riesame di direzione</p>
          <h1>{s.ragione || azienda.nome}</h1>
          <p className="sotto">{[s.sede || azienda.sede, s.settore || azienda.settore].filter(Boolean).join(" · ")}</p>
          <p className="sotto" style={{ marginTop: 8, opacity: 0.7 }}>
            Sistema di gestione integrato · {dati.norme.map((n) => n.norma).join(" · ")}
            {s.revisione ? ` · revisione ${s.revisione}` : ""}
          </p>
        </div>
        <div className="filo" />
      </div>

      <div className="doc-corpo">
        <h2>1. Oggetto e perimetro</h2>
        <p>
          Il presente riesame è reso dall&apos;alta direzione ai sensi del punto 9.3 delle norme applicate, e
          riferisce sull&apos;adeguatezza, l&apos;attuazione e l&apos;efficacia del sistema di gestione integrato.
        </p>
        <div style={RIQUADRO}>
          <p>
            <strong>Perimetro.</strong>{" "}
            Il sistema comprende {dati.norme.length === 1 ? "la norma" : "le norme"}{" "}
            <strong>{dati.norme.map((n) => n.norma).join(", ")}</strong>. I{" "}
            {dati.requisitiTotali} requisiti valutati in questo documento sono quelli applicabili a{" "}
            {dati.norme.length === 1 ? "questa norma" : "queste norme"}: una norma fuori perimetro non concorre
            agli indici, e i suoi requisiti non compaiono.
          </p>
        </div>

        <h2>2. Identificazione</h2>
        <table>
          <tbody>
            <tr><td style={{ width: "38%" }}>Organizzazione</td><td><strong>{s.ragione || azienda.nome}</strong></td></tr>
            {s.piva && <tr><td>Partita IVA / C.F.</td><td className="doc-mono">{s.piva}</td></tr>}
            {(s.sede || azienda.sede) && <tr><td>Sede legale</td><td>{s.sede || azienda.sede}</td></tr>}
            {s.siti && <tr><td>Siti nel campo di applicazione</td><td>{s.siti}</td></tr>}
            <tr><td>Alta direzione</td><td>{s.direzione || <span className="doc-manca">non indicata</span>}</td></tr>
            <tr><td>Responsabile del sistema</td><td>{s.responsabileSistema || <span className="doc-manca">non indicato</span>}</td></tr>
            <tr><td>RSPP</td><td>{s.rspp || <span className="doc-manca">non indicato</span>}</td></tr>
            <tr><td>Rappresentante dei lavoratori</td><td>{s.rls || <span className="doc-manca">non indicato</span>}</td></tr>
            <tr><td>Medico competente</td><td>{s.medico || <span className="doc-manca">non indicato</span>}</td></tr>
            <tr><td>Data di adozione</td><td>{s.dataAdozione ? fmtData(s.dataAdozione) : <span className="doc-manca">non indicata</span>}</td></tr>
          </tbody>
        </table>

        <h2>3. Campo di applicazione</h2>
        <p>{s.scopo || <span className="doc-manca">Campo di applicazione non ancora dichiarato.</span>}</p>
        {s.esclusioni && (
          <p>
            <strong>Esclusioni.</strong>{" "}
            {s.esclusioni}
          </p>
        )}

        <h2>4. Conformità per norma</h2>
        <table>
          <thead>
            <tr>
              <th>Norma</th>
              <th style={{ width: "18%" }}>Requisiti</th>
              <th style={{ width: "18%" }}>Valutati</th>
              <th style={{ width: "18%" }}>Conformità</th>
            </tr>
          </thead>
          <tbody>
            {dati.perNorma.map((n) => (
              <tr key={n.key}>
                <td><strong>{n.norma}</strong> — {n.nome}</td>
                <td>{n.requisiti}</td>
                <td>{n.valutati}</td>
                <td><strong>{n.conformita}%</strong></td>
              </tr>
            ))}
          </tbody>
        </table>
        <p>
          Un requisito applicabile e non ancora valutato pesa <strong>zero</strong>: mediare sui soli requisiti
          valutati farebbe salire l&apos;indice man mano che si saltano quelli difficili, che è il contrario del
          vero. «Non applicabile» esce invece dal conteggio, perché è una valutazione e non un&apos;omissione.
        </p>

        <h2>5. Conformità per capitolo</h2>
        <table>
          <thead>
            <tr>
              <th style={{ width: "10%" }}>Punto</th>
              <th>Capitolo</th>
              <th style={{ width: "18%" }}>Valutati</th>
              <th style={{ width: "18%" }}>Conformità</th>
            </tr>
          </thead>
          <tbody>
            {dati.capitoli.map((c) => (
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

        <h2>6. Prestazioni: gli indicatori</h2>
        {indicatori.length === 0 ? (
          <p className="doc-manca">
            Nessun indicatore definito. Senza indicatori il riesame non può riferire sulle prestazioni, che è il
            primo degli elementi in ingresso richiesti dal punto 9.3.
          </p>
        ) : (
          <>
            <table>
              <thead>
                <tr>
                  <th style={{ width: "10%" }}>Codice</th>
                  <th>Indicatore</th>
                  <th style={{ width: "14%" }}>Ultimo</th>
                  <th style={{ width: "12%" }}>Target</th>
                  <th style={{ width: "18%" }}>Stato</th>
                </tr>
              </thead>
              <tbody>
                {indicatori.map((i, k) => (
                  <tr key={i.codice ?? `ind-${k}`}>
                    <td className="doc-mono">{i.codice ?? "—"}</td>
                    <td>
                      {i.nome}
                      {i.ambito && <div className="doc-mono">{i.ambito}</div>}
                    </td>
                    <td>
                      {i.ultimo?.valore ?? "—"}
                      {i.um ? ` ${i.um}` : ""}
                      {i.ultimo && <div className="doc-mono">{i.ultimo.periodo}</div>}
                    </td>
                    <td>{i.target ?? <span className="doc-manca">—</span>}</td>
                    <td>
                      {STATO[i.stato]}
                      {i.tendenza !== 0 && (
                        <div className="doc-mono">{i.tendenza > 0 ? "in miglioramento" : "in peggioramento"}</div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p>
              La tendenza è relativa al verso di miglioramento dichiarato per ciascun indicatore: per una non
              conformità un valore che scende è un miglioramento, e leggerlo come un peggioramento sarebbe una
              lettura al contrario.
            </p>
          </>
        )}

        <h2>7. Elementi che richiedono decisione</h2>
        {fuori.length === 0 && nonConformi.length === 0 && senzaRilevazioni.length === 0 && senzaTarget.length === 0 ? (
          <p>Nessun elemento aperto alla data del riesame.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Elemento</th>
                <th style={{ width: "16%" }}>Quantità</th>
              </tr>
            </thead>
            <tbody>
              {nonConformi.length > 0 && (
                <tr><td>Requisiti valutati non conformi</td><td><strong>{nonConformi.length}</strong></td></tr>
              )}
              {fuori.length > 0 && (
                <tr><td>Indicatori fuori soglia</td><td><strong>{fuori.length}</strong></td></tr>
              )}
              {senzaRilevazioni.length > 0 && (
                <tr><td>Indicatori senza alcuna rilevazione</td><td><strong>{senzaRilevazioni.length}</strong></td></tr>
              )}
              {senzaTarget.length > 0 && (
                <tr><td>Indicatori senza target definito</td><td><strong>{senzaTarget.length}</strong></td></tr>
              )}
              {dati.requisitiTotali - dati.requisitiValutati > 0 && (
                <tr>
                  <td>Requisiti applicabili non ancora valutati</td>
                  <td><strong>{dati.requisitiTotali - dati.requisitiValutati}</strong></td>
                </tr>
              )}
            </tbody>
          </table>
        )}

        {senzaTarget.length > 0 && (
          <div style={RIQUADRO}>
            <p>
              <strong>Nota sugli indicatori senza target.</strong>{" "}
              Un indicatore privo di target non è «a target»: è un indicatore di cui nessuno ha dichiarato che
              cosa si consideri un buon risultato. Finché il target manca, lo stato resta «non rilevato» e
              l&apos;indicatore non concorre al giudizio sulle prestazioni.
            </p>
          </div>
        )}

        {nonConformi.length > 0 && (
          <>
            <h3>Requisiti non conformi</h3>
            <table>
              <thead>
                <tr>
                  <th style={{ width: "12%" }}>Punto</th>
                  <th>Requisito</th>
                  <th style={{ width: "14%" }}>Norme</th>
                </tr>
              </thead>
              <tbody>
                {nonConformi.map((r) => (
                  <tr key={r.key}>
                    <td className="doc-mono">{r.riferimento}</td>
                    <td>{r.testo}</td>
                    <td className="doc-mono">{r.norme.join(" · ")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}

        <h2>8. Riferimenti</h2>
        <ul>
          {dati.norme.map((n) => (
            <li key={n.key}>
              {n.norma} — {n.nome}, punto 9.3 «Riesame di direzione»
            </li>
          ))}
          <li>Gli elementi in uscita del riesame sono decisioni: opportunità di miglioramento, necessità di
            modifiche al sistema, fabbisogni di risorse.</li>
        </ul>

        <p className="doc-meta">
          Riesame emesso da {marchio.nome} per {s.ragione || azienda.nome} · generato il{" "}
          {fmtData(dati.generatoIl.slice(0, 10))}. I valori sono congelati alla data di emissione, perimetro
          delle norme compreso: modifiche successive al sistema non alterano questa revisione.
        </p>
      </div>
    </>
  );
}
