import { fmtData } from "@/lib/format";
import { marchioDelloSnapshot } from "@/features/documents/marchio";

// Matrice di conformità UNI ISO 37001.
//
// È il documento che un auditor sfoglia riga per riga. A differenza della Relazione
// riporta il TESTO di ogni requisito accanto alla risposta: chi lo riceve deve poter
// leggere la domanda senza avere la norma aperta sul tavolo.
//
// Comprende anche i requisiti NON valutati, e non è una svista: un elenco che mostra
// solo ciò che è stato compilato racconta un sistema completo che non esiste. Il vuoto
// è un'informazione, e in un documento di conformità è l'informazione più importante.

type Requisito = {
  key: string;
  riferimento: string;
  procedura: string | null;
  testo: string;
  stato: string | null;
  note: string | null;
  evidenza: string | null;
};

type Snapshot = {
  generatoIl: string;
  azienda: { id: string; nome: string; settore: string | null; sede: string | null };
  sistema: { ragione: string | null; scopo: string | null; revisione: string | null; dataAdozione: string | null };
  capitoli: {
    key: string;
    nome: string;
    descrizione: string;
    conformita: number;
    valutati: number;
    requisiti: Requisito[];
  }[];
  conformita: number | null;
  requisitiTotali: number;
  requisitiValutati: number;
};

export function DocumentoMatricePc({ dati }: { dati: Snapshot }) {
  const { azienda, sistema: s, capitoli } = dati;

  return (
    <>
      <div className="doc-cover">
        <div className="testo">
          <p className="kicker">Matrice di conformità</p>
          <h1>{s.ragione || azienda.nome}</h1>
          <p className="sotto">{[azienda.sede, azienda.settore].filter(Boolean).join(" · ")}</p>
          <p className="sotto" style={{ marginTop: 8, opacity: 0.7 }}>
            UNI ISO 37001 · {dati.requisitiTotali} requisiti
            {s.revisione ? ` · revisione ${s.revisione}` : ""}
          </p>
        </div>
        <div className="filo" />
      </div>

      <div className="doc-corpo">
        <h2>Come si legge</h2>
        <p>
          Ogni riga è un requisito della norma, con il punto di riferimento, la procedura del sistema che lo
          attua, lo stato dichiarato e il documento che lo sostiene. Sono elencati <strong>tutti</strong> i{" "}
          {dati.requisitiTotali} requisiti: quelli non ancora valutati compaiono senza stato, perché un elenco
          che mostrasse solo le risposte date racconterebbe un sistema completo che non esiste.
        </p>
        <table>
          <tbody>
            <tr><td style={{ width: "38%" }}>Requisiti valutati</td><td><strong>{dati.requisitiValutati}</strong> su {dati.requisitiTotali}</td></tr>
            {dati.conformita !== null && (
              <tr><td>Grado di conformità</td><td><strong>{dati.conformita}%</strong></td></tr>
            )}
            {s.dataAdozione && <tr><td>Data di adozione del sistema</td><td>{fmtData(s.dataAdozione)}</td></tr>}
          </tbody>
        </table>
        {s.scopo && (
          <>
            <h3>Campo di applicazione</h3>
            <p>{s.scopo}</p>
          </>
        )}

        {capitoli.map((c) => (
          <div key={c.key}>
            <h2>
              {c.key}. {c.nome} — {c.conformita}%
            </h2>
            <p style={{ opacity: 0.75 }}>
              {c.descrizione} Valutati {c.valutati} requisiti su {c.requisiti.length}.
            </p>
            <table>
              <thead>
                <tr>
                  <th style={{ width: "8%" }}>Punto</th>
                  <th>Requisito</th>
                  <th style={{ width: "16%" }}>Stato</th>
                  <th style={{ width: "22%" }}>Evidenza</th>
                </tr>
              </thead>
              <tbody>
                {c.requisiti.map((r) => (
                  <tr key={r.key}>
                    <td className="doc-mono">
                      {r.riferimento}
                      {r.procedura && (
                        <>
                          <br />
                          <span style={{ opacity: 0.7 }}>{r.procedura}</span>
                        </>
                      )}
                    </td>
                    <td>
                      {r.testo}
                      {r.note && (
                        <>
                          <br />
                          <span style={{ opacity: 0.75 }}>{r.note}</span>
                        </>
                      )}
                    </td>
                    <td>{r.stato ?? <span className="doc-manca">non valutato</span>}</td>
                    <td>{r.evidenza || <span className="doc-manca">—</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}

        <h2>Riferimenti normativi</h2>
        <ul>
          <li>UNI ISO 37001:2016 — Sistemi di gestione per la prevenzione della corruzione. Requisiti e guida all&apos;utilizzo.</li>
          <li>ISO 37001, appendice A — Guida all&apos;utilizzo della norma.</li>
        </ul>

        <p className="doc-meta">
          Documento generato il {fmtData(dati.generatoIl)} da {marchioDelloSnapshot(dati).nome}. I valori riportati
          sono congelati alla data di emissione: modifiche successive al sistema non alterano questa revisione,
          che resta la versione consegnata.
        </p>
      </div>
    </>
  );
}
