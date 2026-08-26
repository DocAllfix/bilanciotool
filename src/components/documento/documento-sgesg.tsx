import { fmtData } from "@/lib/format";
import { marchioDelloSnapshot } from "@/features/documents/marchio";
import { DOC } from "./charts";

// I QUATTRO DOCUMENTI DEL METODO ESG, resi da UN template solo.
//
// ⚠️ Offerta, verbale di avvio, rapporto di diagnosi e dossier di chiusura non hanno
// ciascuno una struttura propria: sono il compilato di alcune schede, stampato in ordine.
// Quattro template sarebbero quattro file da tenere allineati, e il quarto resterebbe
// indietro — è la stessa decisione delle 63 schede e del corpus.
//
// ⚠️ E il documento DICHIARA che cosa non contiene, riquadrato e in apertura. Alcune fasi
// hanno registri a righe che il prodotto non compila ancora; uno snapshot è immutabile,
// quindi ciò che si scrive oggi resta scritto per sempre — e allora si scrive il vero.

const RIQUADRO: React.CSSProperties = {
  border: `1.5px solid ${DOC.ink}`,
  background: DOC.accentBg,
  padding: "10px 14px",
  margin: "14px 0",
};

type Campo = { k: string; l: string; t: string; w?: number };
type Sezione = { t: string; c: Campo[] };

type SchedaStampata = {
  key: string;
  codice: string | null;
  titolo: string;
  sottotitolo: string | null;
  sezioni: Sezione[];
  dati: Record<string, unknown>;
  stato: string;
};

type Snapshot = {
  generatoIl: string;
  anno: number;
  titolo: string;
  kicker: string;
  scopo: string;
  avvertenza: string | null;
  azienda: { id: string; nome: string; settore: string | null; sede: string | null; piva: string | null };
  programma: {
    standard: string;
    responsabile: string | null;
    dataInizio: string | null;
    dataFine: string | null;
  };
  schede: SchedaStampata[];
};

/** Il valore di un campo come si legge su carta, o `null` se non è stato compilato. */
function valore(v: unknown): string | null {
  if (v === undefined || v === null) return null;
  if (Array.isArray(v)) return v.length ? v.join(" · ") : null;
  const s = String(v).trim();
  return s === "" ? null : s;
}

export function DocumentoSgesg({ dati }: { dati: Snapshot }) {
  const { azienda, programma, schede } = dati;
  const marchio = marchioDelloSnapshot(dati);

  // Quante caselle sono state compilate: si dice in apertura, perché un documento a
  // metà consegnato senza dirlo è peggio di un documento a metà dichiarato.
  const totali = schede.reduce((n, s) => n + s.sezioni.reduce((m, z) => m + z.c.length, 0), 0);
  const compilati = schede.reduce(
    (n, s) => n + s.sezioni.reduce((m, z) => m + z.c.filter((c) => valore(s.dati[c.k]) !== null).length, 0),
    0,
  );

  return (
    <>
      <div className="doc-cover">
        <div className="testo">
          <p className="kicker">{dati.kicker}</p>
          <h1>{azienda.nome}</h1>
          <p className="sotto">{[azienda.sede, azienda.settore].filter(Boolean).join(" · ")}</p>
          <p className="sotto" style={{ marginTop: 8, opacity: 0.7 }}>
            {dati.titolo} · esercizio {dati.anno}
          </p>
          <p className="sotto" style={{ marginTop: 8, opacity: 0.7 }}>
            Sistema di gestione ESG · rendicontazione {programma.standard}
          </p>
        </div>
        <div className="filo" />
      </div>

      <div className="doc-corpo">
        <h2>1. Oggetto</h2>
        <p>{dati.scopo}</p>
        <table>
          <tbody>
            <tr>
              <td style={{ width: "38%" }}>Organizzazione</td>
              <td>
                <strong>{azienda.nome}</strong>
              </td>
            </tr>
            {azienda.piva && (
              <tr>
                <td>Partita IVA / C.F.</td>
                <td className="doc-mono">{azienda.piva}</td>
              </tr>
            )}
            {azienda.sede && (
              <tr>
                <td>Sede</td>
                <td>{azienda.sede}</td>
              </tr>
            )}
            <tr>
              <td>Esercizio rendicontato</td>
              <td>{dati.anno}</td>
            </tr>
            <tr>
              <td>Standard di rendicontazione</td>
              <td>{programma.standard}</td>
            </tr>
            <tr>
              <td>Responsabile dell&apos;incarico</td>
              <td>{programma.responsabile || <span className="doc-manca">non indicato</span>}</td>
            </tr>
            {programma.dataInizio && (
              <tr>
                <td>Avvio dell&apos;incarico</td>
                <td>{fmtData(programma.dataInizio)}</td>
              </tr>
            )}
            {programma.dataFine && (
              <tr>
                <td>Termine previsto</td>
                <td>{fmtData(programma.dataFine)}</td>
              </tr>
            )}
          </tbody>
        </table>

        {/* ⚠️ L'avvertenza sta QUI, in apertura e riquadrata, non in fondo in corpo otto.
            Chi riceve il documento deve sapere subito che cosa non ci troverà. */}
        {(dati.avvertenza || compilati < totali) && (
          <div style={RIQUADRO}>
            {dati.avvertenza && (
              <p>
                <strong>Che cosa non è compreso.</strong>{" "}{dati.avvertenza}
              </p>
            )}
            {compilati < totali && (
              <p>
                <strong>Completezza.</strong>{" "}Delle {totali} informazioni previste dal metodo per questo
                documento ne risultano compilate {compilati}. Le voci non compilate sono riportate come tali:
                un&apos;informazione mancante resta visibile, non viene omessa.
              </p>
            )}
          </div>
        )}

        {schede.map((s, i) => (
          <section key={s.key}>
            <h2>
              {i + 2}. {s.titolo}
              {s.codice ? ` (${s.codice})` : ""}
            </h2>
            {s.sottotitolo && <p style={{ color: DOC.muted }}>{s.sottotitolo}</p>}

            {s.sezioni.length === 0 ? (
              <p className="doc-manca">Nessun contenuto previsto per questa scheda.</p>
            ) : (
              s.sezioni.map((z, j) => (
                <div key={j}>
                  <h3>{z.t}</h3>
                  {z.c.length === 0 ? (
                    <p className="doc-manca">Registro a righe: non riportato in questo documento.</p>
                  ) : (
                    <table>
                      <tbody>
                        {z.c.map((c) => {
                          const v = valore(s.dati[c.k]);
                          return (
                            <tr key={c.k}>
                              <td style={{ width: "38%" }}>{c.l}</td>
                              <td>
                                {v === null ? (
                                  <span className="doc-manca">non compilato</span>
                                ) : c.t === "testo_lungo" ? (
                                  // I testi lunghi conservano gli a capo: una descrizione
                                  // scritta in paragrafi non deve arrivare in un blocco solo.
                                  <span style={{ whiteSpace: "pre-wrap" }}>{v}</span>
                                ) : (
                                  v
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  )}
                </div>
              ))
            )}
          </section>
        ))}

        <h2>{schede.length + 2}. Firme</h2>
        <p>
          Il presente documento è emesso da {marchio.nome} nell&apos;ambito dell&apos;incarico di
          implementazione del sistema di gestione ESG di {azienda.nome}, ed è riferito all&apos;esercizio{" "}
          {dati.anno}.
        </p>
        <table>
          <tbody>
            <tr>
              <td style={{ width: "50%", height: 64, verticalAlign: "top" }}>
                Per {marchio.nome}
                <br />
                <span style={{ color: DOC.muted }}>{programma.responsabile || "Il responsabile dell'incarico"}</span>
              </td>
              <td style={{ height: 64, verticalAlign: "top" }}>
                Per {azienda.nome}
                <br />
                <span style={{ color: DOC.muted }}>Il legale rappresentante</span>
              </td>
            </tr>
          </tbody>
        </table>
        <p style={{ color: DOC.muted, fontSize: "0.9em" }}>
          Documento generato il {fmtData(dati.generatoIl)}.
        </p>
      </div>
    </>
  );
}
