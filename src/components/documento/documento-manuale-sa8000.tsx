import { fmtData } from "@/lib/format";
import { marchioDelloSnapshot } from "@/features/documents/marchio";
import { DOC } from "./charts";

// Manuale del sistema di gestione SA8000/2026.
//
// È il documento che si esibisce in audit di certificazione. Descrive il sistema e
// dichiara, criterio per criterio, che cosa è attuato e che cosa no.
//
// ⚠️ Riporta anche i criteri NON attuati. Un manuale che elencasse solo ciò che funziona
// sarebbe inutile all'auditor — che entra proprio per cercare il resto — e dannoso
// all'azienda, perché un rilievo trovato dall'ente vale più di uno dichiarato.
//
// ⚠️ E «parziale» non è mezzo attuato: nel punteggio pesa ZERO. Un criterio sociale
// applicato a metà non protegge a metà un lavoratore, e il manuale non deve suggerire il
// contrario con una percentuale addolcita.

type Criterio = {
  key: string;
  sezione: string;
  gruppo: string;
  testo: string;
  procedure: string[];
  stato: "ok" | "parziale" | "no" | "na" | null;
  evidenza: string | null;
};

type Snapshot = {
  generatoIl: string;
  azienda: { id: string; nome: string; settore: string | null; sede: string | null };
  sistema: Record<string, string | null>;
  sezioni: { key: string; nome: string; criteri: number; valutati: number; percentuale: number }[];
  gruppi: { key: string; sezione: string; nome: string; criteri: number; valutati: number; percentuale: number }[];
  criteri: Criterio[];
  completamento: {
    anagrafica: number;
    procedure: number;
    moduli: number;
    criteri: number;
    registri: number;
    totale: number;
  };
  dettaglio: {
    procedure: { totale: number; applicabili: number; approvati: number };
    moduli: { totale: number; applicabili: number; approvati: number };
    registri: { totale: number; pieni: number };
    anagraficaCompilati: number;
    anagraficaTotale: number;
    criteriValutati: number;
    criteriTotali: number;
    criteriAttuati: number;
    criteriNonAttuati: number;
  };
};

const RIQUADRO = {
  border: `1.5px solid ${DOC.ink}`,
  background: DOC.accentBg,
  padding: "14px 18px",
  margin: "22px 0",
} as const;

const ETICHETTA: Record<NonNullable<Criterio["stato"]>, string> = {
  ok: "Attuato",
  parziale: "Parziale",
  no: "Non attuato",
  na: "Non applicabile",
};

export function DocumentoManualeSa8000({ dati }: { dati: Snapshot }) {
  const { azienda, sistema: s, criteri, completamento: c, dettaglio: d } = dati;
  const marchio = marchioDelloSnapshot(dati);

  const nonAttuati = criteri.filter((k) => k.stato === "no");
  const parziali = criteri.filter((k) => k.stato === "parziale");
  const nonValutati = criteri.filter((k) => k.stato === null);

  return (
    <>
      <div className="doc-cover">
        <div className="testo">
          <p className="kicker">Manuale del sistema di gestione</p>
          <h1>{s.ragione || azienda.nome}</h1>
          <p className="sotto">{[s.sede || azienda.sede, s.settore || azienda.settore].filter(Boolean).join(" · ")}</p>
          <p className="sotto" style={{ marginTop: 8, opacity: 0.7 }}>
            SA8000:2026 · Responsabilità sociale
            {s.revisione ? ` · revisione ${s.revisione}` : ""}
          </p>
        </div>
        <div className="filo" />
      </div>

      <div className="doc-corpo">
        <h2>1. Oggetto</h2>
        <p>
          Il presente manuale descrive il sistema di gestione della responsabilità sociale adottato
          dall&apos;Organizzazione secondo lo Standard SA8000:2026, e dichiara lo stato di attuazione dei{" "}
          {d.criteriTotali} criteri.
        </p>
        <div style={RIQUADRO}>
          <p>
            <strong>Come va letto.</strong>{" "}
            Il manuale riporta i criteri <strong>non attuati</strong> insieme a quelli attuati. Un manuale che
            elencasse solo ciò che funziona sarebbe inutile a chi verifica, e dannoso all&apos;Organizzazione:
            un rilievo trovato dall&apos;ente di certificazione pesa più di uno dichiarato.
          </p>
          <p>
            <strong>Sul «parziale».</strong>{" "}
            Un criterio attuato parzialmente pesa <strong>zero</strong> nel punteggio, non metà. Un criterio
            sociale applicato a metà non protegge a metà un lavoratore, e una percentuale addolcita
            suggerirebbe il contrario.
          </p>
        </div>

        <h2>2. Identificazione</h2>
        <table>
          <tbody>
            <tr><td style={{ width: "38%" }}>Organizzazione</td><td><strong>{s.ragione || azienda.nome}</strong></td></tr>
            {s.piva && <tr><td>Partita IVA / C.F.</td><td className="doc-mono">{s.piva}</td></tr>}
            {(s.sede || azienda.sede) && <tr><td>Sede legale</td><td>{s.sede || azienda.sede}</td></tr>}
            {s.siti && <tr><td>Siti nel campo di applicazione</td><td>{s.siti}</td></tr>}
            <tr><td>Contratto collettivo applicato</td><td>{s.ccnl || <span className="doc-manca">non indicato</span>}</td></tr>
            <tr><td>Rappresentante della direzione</td><td>{s.direzione || <span className="doc-manca">non indicato</span>}</td></tr>
            <tr><td>Rappresentante SA8000 dei lavoratori</td><td>{s.respSa || <span className="doc-manca">non indicato</span>}</td></tr>
            <tr><td>Canale di reclamo</td><td className="doc-mono">{s.reclamiEmail || <span className="doc-manca">non indicato</span>}</td></tr>
            <tr><td>Data di adozione</td><td>{s.dataAdozione ? fmtData(s.dataAdozione) : <span className="doc-manca">non indicata</span>}</td></tr>
          </tbody>
        </table>

        <h2>3. Campo di applicazione</h2>
        <p>{s.scopo || <span className="doc-manca">Campo di applicazione non ancora dichiarato.</span>}</p>

        <h2>4. Stato del sistema</h2>
        <table>
          <thead>
            <tr>
              <th>Voce</th>
              <th style={{ width: "22%" }}>Dettaglio</th>
              <th style={{ width: "14%" }}>Peso</th>
              <th style={{ width: "14%" }}>Valore</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Anagrafica del sistema</td>
              <td>{d.anagraficaCompilati} campi su {d.anagraficaTotale}</td>
              <td>15%</td>
              <td>{c.anagrafica}%</td>
            </tr>
            <tr>
              <td>Procedure approvate</td>
              <td>{d.procedure.approvati} su {d.procedure.applicabili} applicabili</td>
              <td>30%</td>
              <td>{c.procedure}%</td>
            </tr>
            <tr>
              <td>Modulistica approvata</td>
              <td>{d.moduli.approvati} su {d.moduli.applicabili} applicabili</td>
              <td>15%</td>
              <td>{c.moduli}%</td>
            </tr>
            <tr>
              <td>Criteri attuati</td>
              <td>{d.criteriAttuati} su {d.criteriTotali}</td>
              <td>25%</td>
              <td>{c.criteri}%</td>
            </tr>
            <tr>
              <td>Registri avviati</td>
              <td>{d.registri.pieni} su {d.registri.totale}</td>
              <td>15%</td>
              <td>{c.registri}%</td>
            </tr>
            <tr className="doc-tot">
              <td colSpan={3}><strong>Completamento del sistema</strong></td>
              <td><strong>{c.totale}%</strong></td>
            </tr>
          </tbody>
        </table>
        <p>
          Le procedure pesano il doppio della modulistica: una procedura è il sistema, un modulo è il foglio
          che la applica. Ciò che è dichiarato <strong>non applicabile</strong> esce dal denominatore; ciò che
          non è ancora stato guardato conta come zero.
        </p>

        <h2>5. Attuazione per sezione</h2>
        <table>
          <thead>
            <tr>
              <th style={{ width: "10%" }}>Sez.</th>
              <th>Sezione</th>
              <th style={{ width: "18%" }}>Valutati</th>
              <th style={{ width: "16%" }}>Attuazione</th>
            </tr>
          </thead>
          <tbody>
            {dati.sezioni.map((sz) => (
              <tr key={sz.key}>
                <td className="doc-mono"><strong>{sz.key}</strong></td>
                <td>{sz.nome}</td>
                <td>{sz.valutati} / {sz.criteri}</td>
                <td><strong>{sz.percentuale}%</strong></td>
              </tr>
            ))}
          </tbody>
        </table>

        <h2>6. Attuazione per gruppo</h2>
        <table>
          <thead>
            <tr>
              <th style={{ width: "10%" }}>Gruppo</th>
              <th>Denominazione</th>
              <th style={{ width: "18%" }}>Valutati</th>
              <th style={{ width: "16%" }}>Attuazione</th>
            </tr>
          </thead>
          <tbody>
            {dati.gruppi.map((g) => (
              <tr key={g.key}>
                <td className="doc-mono"><strong>{g.key}</strong></td>
                <td>{g.nome}</td>
                <td>{g.valutati} / {g.criteri}</td>
                <td>{g.percentuale}%</td>
              </tr>
            ))}
          </tbody>
        </table>

        <h2>7. Criteri che richiedono intervento</h2>
        {nonAttuati.length === 0 && parziali.length === 0 && nonValutati.length === 0 ? (
          <p>Tutti i criteri risultano attuati o dichiarati non applicabili.</p>
        ) : (
          <>
            <table>
              <tbody>
                {nonAttuati.length > 0 && (
                  <tr><td style={{ width: "70%" }}>Criteri dichiarati non attuati</td><td><strong>{nonAttuati.length}</strong></td></tr>
                )}
                {parziali.length > 0 && (
                  <tr><td>Criteri attuati parzialmente</td><td><strong>{parziali.length}</strong></td></tr>
                )}
                {nonValutati.length > 0 && (
                  <tr><td>Criteri non ancora valutati</td><td><strong>{nonValutati.length}</strong></td></tr>
                )}
              </tbody>
            </table>

            {[...nonAttuati, ...parziali].length > 0 && (
              <table>
                <thead>
                  <tr>
                    <th style={{ width: "10%" }}>Criterio</th>
                    <th>Testo</th>
                    <th style={{ width: "14%" }}>Stato</th>
                    <th style={{ width: "14%" }}>Procedure</th>
                  </tr>
                </thead>
                <tbody>
                  {[...nonAttuati, ...parziali].map((k) => (
                    <tr key={k.key}>
                      <td className="doc-mono"><strong>{k.key}</strong></td>
                      <td>{k.testo}</td>
                      <td>{k.stato ? ETICHETTA[k.stato] : "—"}</td>
                      <td className="doc-mono">{k.procedure.join(" · ")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </>
        )}

        <h2>8. Riferimenti</h2>
        <ul>
          <li>SA8000:2026 — Social Accountability International</li>
          <li>Criteri fondazionali F1–F5 · Sistema di gestione e due diligence M1–M10 · Prestazione per il lavoro dignitoso D1–D7</li>
          <li>Ogni criterio rimanda alle procedure del sistema che lo attuano: dieci criteri su {d.criteriTotali} ne richiedono più di una.</li>
        </ul>

        <p className="doc-meta">
          Manuale emesso da {marchio.nome} per {s.ragione || azienda.nome} · generato il{" "}
          {fmtData(dati.generatoIl.slice(0, 10))}. I valori sono congelati alla data di emissione: modifiche
          successive al sistema non alterano questa revisione.
        </p>
      </div>
    </>
  );
}
