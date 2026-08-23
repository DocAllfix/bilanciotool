import { fmtData } from "@/lib/format";
import { marchioDelloSnapshot } from "@/features/documents/marchio";

// Relazione dell'Organismo di Vigilanza all'organo amministrativo (D.Lgs. 231/2001,
// art. 6 c. 1 lett. b e d).
//
// Ha un destinatario esterno alla funzione che la redige, ed è il motivo per cui merita
// versioni congelate: l'organo amministrativo delibera su ciò che legge qui, e ciò che
// ha letto non deve cambiare dopo.
//
// ⚠️ Gli scenari NON VALUTATI compaiono fra quelli da deliberare, non fra i risolti. Un
// rischio non misurato non è un rischio assente, e una relazione che li omettesse
// direbbe all'organo amministrativo che il Modello copre più di quanto copra.

type Snapshot = {
  generatoIl: string;
  azienda: { id: string; nome: string; settore: string | null; sede: string | null };
  modello: Record<string, string | null>;
  pilastri: { key: string; nome: string; descrizione: string; requisiti: number; valutati: number; idoneita: number }[];
  idoneita: number | null;
  daDeliberare: { processo: string; reato: string; titolo: string; residuo: string | null; valutato: boolean }[];
  indicatori: {
    processi: number; scenari: number; nonAccettabili: number; nonValutati: number;
    reatiApplicabili: number; applicabiliSenzaScenario: number;
    requisitiValutati: number; requisitiTotali: number;
  };
};

export function DocumentoRelazioneOdv({ dati }: { dati: Snapshot }) {
  const { azienda, modello: m, pilastri, indicatori: k } = dati;
  const nonValutati = dati.daDeliberare.filter((x) => !x.valutato);
  const valutatiNonAccettabili = dati.daDeliberare.filter((x) => x.valutato);

  return (
    <>
      <div className="doc-cover">
        <div className="testo">
          <p className="kicker">Relazione dell&apos;Organismo di Vigilanza</p>
          <h1>{m.ragione || azienda.nome}</h1>
          <p className="sotto">{[m.sede || azienda.sede, m.settore || azienda.settore].filter(Boolean).join(" · ")}</p>
          <p className="sotto" style={{ marginTop: 8, opacity: 0.7 }}>
            D.Lgs. 231/2001 · vigilanza sul funzionamento e l&apos;osservanza del Modello
            {m.revisione ? ` · revisione ${m.revisione}` : ""}
          </p>
        </div>
        <div className="filo" />
      </div>

      <div className="doc-corpo">
        <h2>1. Destinatario e oggetto</h2>
        <p>
          La presente relazione è resa dall&apos;Organismo di Vigilanza all&apos;organo amministrativo ai sensi
          dell&apos;art. 6 comma 1 lettera b) del D.Lgs. 231/2001. Riferisce sull&apos;idoneità del Modello e
          sugli scenari il cui rischio residuo non risulta accettabile.
        </p>
        <table>
          <tbody>
            <tr><td style={{ width: "38%" }}>Ente</td><td><strong>{m.ragione || azienda.nome}</strong></td></tr>
            {m.piva && <tr><td>Partita IVA / C.F.</td><td className="doc-mono">{m.piva}</td></tr>}
            <tr><td>Organo amministrativo</td><td>{m.organoAmministrativo || <span className="doc-manca">non indicato</span>}</td></tr>
            <tr><td>Composizione dell&apos;Organismo di Vigilanza</td><td>{m.odvComposizione || <span className="doc-manca">non indicata</span>}</td></tr>
            {m.odvNomina && <tr><td>Nomina dell&apos;Organismo</td><td>{fmtData(m.odvNomina)}</td></tr>}
            {m.dataAdozione && <tr><td>Adozione del Modello</td><td>{fmtData(m.dataAdozione)}</td></tr>}
            {m.canaleSegnalazione && <tr><td>Canale di segnalazione</td><td>{m.canaleSegnalazione}</td></tr>}
          </tbody>
        </table>

        <h2>2. Idoneità del Modello</h2>
        <p>
          Sono stati valutati <strong>{k.requisitiValutati}</strong> presidi su {k.requisitiTotali}, distribuiti
          sui dieci pilastri.
          {dati.idoneita !== null && <> L&apos;idoneità complessiva risulta <strong>{dati.idoneita}%</strong>.</>}
        </p>
        <p style={{ fontSize: "0.9em", opacity: 0.75 }}>
          Un presidio dovuto e non ancora valutato pesa zero: la percentuale misura quanto del Modello è
          attuato, non quanto è stato esaminato.
        </p>
        <table>
          <thead>
            <tr>
              <th style={{ width: "8%" }}>Pilastro</th>
              <th>Ambito</th>
              <th style={{ width: "18%" }}>Valutati</th>
              <th style={{ width: "14%" }}>Idoneità</th>
            </tr>
          </thead>
          <tbody>
            {pilastri.map((p) => (
              <tr key={p.key}>
                <td className="doc-mono">{p.key}</td>
                <td>
                  <strong>{p.nome}</strong>
                  <br />
                  <span style={{ opacity: 0.7 }}>{p.descrizione}</span>
                </td>
                <td>{p.valutati} su {p.requisiti}</td>
                <td><strong>{p.idoneita}%</strong></td>
              </tr>
            ))}
          </tbody>
        </table>

        <h2>3. Mappatura dei rischi</h2>
        <table>
          <tbody>
            <tr><td style={{ width: "58%" }}>Processi sensibili individuati</td><td>{k.processi}</td></tr>
            <tr><td>Scenari processo-reato mappati</td><td>{k.scenari}</td></tr>
            <tr><td>Scenari non ancora valutati</td><td><strong>{k.nonValutati}</strong></td></tr>
            <tr><td>Scenari con rischio residuo non accettabile</td><td><strong>{k.nonAccettabili}</strong></td></tr>
            <tr><td>Reati applicabili non ricondotti ad alcun processo</td><td><strong>{k.applicabiliSenzaScenario}</strong></td></tr>
          </tbody>
        </table>

        <h2>4. Su cosa l&apos;organo amministrativo è chiamato a deliberare</h2>
        {dati.daDeliberare.length === 0 ? (
          <p>Nessuno scenario presenta un rischio residuo non accettabile.</p>
        ) : (
          <>
            {valutatiNonAccettabili.length > 0 && (
              <>
                <h3>Scenari valutati con rischio residuo non accettabile</h3>
                <table>
                  <thead>
                    <tr><th>Processo</th><th style={{ width: "9%" }}>Art.</th><th>Reato presupposto</th><th style={{ width: "13%" }}>Residuo</th></tr>
                  </thead>
                  <tbody>
                    {valutatiNonAccettabili.map((x) => (
                      <tr key={`${x.processo}|${x.reato}`}>
                        <td>{x.processo}</td>
                        <td className="doc-mono">{x.reato}</td>
                        <td>{x.titolo}</td>
                        <td><strong>{x.residuo}</strong></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </>
            )}
            {nonValutati.length > 0 && (
              <>
                <h3>Scenari non ancora valutati</h3>
                <p>
                  Compaiono qui e non fra quelli risolti: <strong>un rischio non misurato non è un rischio
                  assente</strong>, e ometterli direbbe che il Modello copre più di quanto copra.
                </p>
                <table>
                  <thead>
                    <tr><th>Processo</th><th style={{ width: "9%" }}>Art.</th><th>Reato presupposto</th></tr>
                  </thead>
                  <tbody>
                    {nonValutati.map((x) => (
                      <tr key={`${x.processo}|${x.reato}`}>
                        <td>{x.processo}</td>
                        <td className="doc-mono">{x.reato}</td>
                        <td>{x.titolo}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </>
            )}
          </>
        )}

        <h2>5. Firme</h2>
        <table>
          <tbody>
            <tr><td style={{ width: "50%" }}>Organismo di Vigilanza</td><td>{m.odvComposizione ? "________________________" : "________________________"}</td></tr>
            <tr><td>Organo amministrativo, per ricevuta</td><td>________________________</td></tr>
            <tr><td>Data</td><td>{fmtData(dati.generatoIl.slice(0, 10))}</td></tr>
          </tbody>
        </table>

        <h2>Riferimenti normativi</h2>
        <ul>
          <li>D.Lgs. 8 giugno 2001 n. 231, art. 6 — modelli di organizzazione dell&apos;ente e Organismo di Vigilanza.</li>
          <li>Art. 6 comma 1 lettera b) — vigilanza sul funzionamento e l&apos;osservanza del Modello.</li>
          <li>Art. 6 comma 2-quater — canale di segnalazione, come modificato dal D.Lgs. 24/2023.</li>
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
