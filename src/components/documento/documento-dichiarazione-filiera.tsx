import { fmtData, fmtNum } from "@/lib/format";
import { marchioDelloSnapshot } from "@/features/documents/marchio";
import { DOC } from "./charts";

// Dichiarazione annuale sulla due diligence di filiera (OCSE · CSDDD art. 16).
//
// ⚠️ È l'unico documento del prodotto con un obbligo di PUBBLICAZIONE dietro: la
// direttiva chiede che sia resa accessibile. Chi la legge non è un consulente ma un
// committente, una banca o un'autorità, e da un numero aggregato deve poter risalire
// alla riga che lo produce: per questo l'elenco dei partner con il loro rischio residuo
// sta nel documento e non solo a schermo.
//
// ⚠️ Due cose che questa dichiarazione dice e il prototipo taceva:
// 1. la copertura si misura sulla SPESA e non sul numero di partner — è la leva reale, e
//    dieci fornitori marginali valutati non compensano il grosso non guardato;
// 2. chi ha lasciato in bianco lavoro minorile, lavoro forzato o salute e sicurezza è
//    dichiarato, perché nel prototipo quel silenzio produceva il punteggio massimo.

type Partner = {
  nome: string;
  paese: string | null;
  livello: string | null;
  categoria: string | null;
  stato: string;
  spesa: string | null;
  qualifica: string | null;
  flag: string[];
  inerente: number;
  categoriaInerente: string | null;
  maturita: number;
  residuo: string | null;
  mesiVerifica: number | null;
  criticheMancanti: string[];
  vivo: boolean;
};

type Snapshot = {
  generatoIl: string;
  azienda: { id: string; nome: string; settore: string | null; sede: string | null };
  programma: Record<string, string | null>;
  fasi: { key: string; nome: string; descrizione: string }[];
  aree: { key: string; nome: string }[];
  flags: { key: string; nome: string }[];
  partner: Partner[];
  quadro: {
    partnerTotali: number;
    partnerVivi: number;
    cessati: number;
    valutati: number;
    perResiduo: Record<string, number>;
    spesaViva: number;
    spesaCoperta: number;
    coperturaSpesa: number;
    coperturaNumero: number;
    conCriticheMancanti: number;
    riesameFatto: boolean;
  };
};

const RIQUADRO = {
  border: `1.5px solid ${DOC.ink}`,
  background: DOC.accentBg,
  padding: "14px 18px",
  margin: "22px 0",
} as const;

const ORDINE_RESIDUO = ["Critico", "Alto", "Medio", "Basso"] as const;

const euro = (v: string | number | null) =>
  v === null || v === undefined || v === "" ? "—" : `${fmtNum(Number(v), 0)} €`;

export function DocumentoDichiarazioneFiliera({ dati }: { dati: Snapshot }) {
  const { azienda, programma: p, partner, quadro: q, flags } = dati;
  const marchio = marchioDelloSnapshot(dati);

  const vivi = partner.filter((x) => x.vivo);
  const daVerificare = [...vivi]
    .filter((x) => x.residuo === "Critico" || x.residuo === "Alto")
    .sort((a, b) => ORDINE_RESIDUO.indexOf(a.residuo as never) - ORDINE_RESIDUO.indexOf(b.residuo as never));
  const senzaCritiche = vivi.filter((x) => x.residuo !== null && x.criticheMancanti.length > 0);
  const nonValutati = vivi.filter((x) => x.residuo === null);
  const nomeFlag = new Map(flags.map((f) => [f.key, f.nome]));

  return (
    <>
      <div className="doc-cover">
        <div className="testo">
          <p className="kicker">Dichiarazione annuale</p>
          <h1>{p.ragione || azienda.nome}</h1>
          <p className="sotto">{[p.sede || azienda.sede, p.settore || azienda.settore].filter(Boolean).join(" · ")}</p>
          <p className="sotto" style={{ marginTop: 8, opacity: 0.7 }}>
            Due diligence di filiera · Linee guida OCSE · Direttiva (UE) 2024/1760
            {p.revisione ? ` · revisione ${p.revisione}` : ""}
          </p>
        </div>
        <div className="filo" />
      </div>

      <div className="doc-corpo">
        <h2>1. Oggetto</h2>
        <p>
          La presente dichiarazione riferisce sul processo di dovuta diligenza applicato dall&apos;Impresa
          alla propria catena di fornitura, sui rischi individuati e sulle misure adottate. È redatta secondo
          le Linee guida OCSE sulla condotta d&apos;impresa responsabile ed è resa accessibile ai sensi
          dell&apos;articolo 16 della direttiva (UE) 2024/1760.
        </p>

        <div style={RIQUADRO}>
          <p>
            <strong>Come va letta la copertura.</strong>{" "}
            La copertura è misurata sulla <strong>spesa</strong>, non sul numero di fornitori. Dieci fornitori
            marginali valutati non compensano il grosso della spesa non guardato, e la leva di cui l&apos;Impresa
            dispone verso un partner è proporzionale a quanto pesa il rapporto, non a quanti partner ci sono.
          </p>
          <p>
            <strong>Sui silenzi nelle aree critiche.</strong>{" "}
            Lavoro minorile, lavoro forzato e salute e sicurezza sono le tre aree in cui un danno è
            irrimediabile. Un partner che le lascia in bianco <strong>non è un partner maturo</strong>: la
            maturità dichiarata qui è limitata di conseguenza, e i casi sono elencati al punto 6.
          </p>
        </div>

        <h2>2. Governo del processo</h2>
        <table>
          <tbody>
            <tr><td style={{ width: "38%" }}>Impresa</td><td><strong>{p.ragione || azienda.nome}</strong></td></tr>
            {p.piva && <tr><td>Partita IVA / C.F.</td><td className="doc-mono">{p.piva}</td></tr>}
            {(p.sede || azienda.sede) && <tr><td>Sede legale</td><td>{p.sede || azienda.sede}</td></tr>}
            <tr><td>Alta direzione</td><td>{p.direzione || <span className="doc-manca">non indicata</span>}</td></tr>
            <tr><td>Responsabile della due diligence</td><td>{p.responsabile || <span className="doc-manca">non indicato</span>}</td></tr>
            <tr><td>Organo a cui riferisce</td><td>{p.organo || <span className="doc-manca">non indicato</span>}</td></tr>
            <tr><td>Canale di reclamo</td><td className="doc-mono">{p.reclamiCanale || <span className="doc-manca">non indicato</span>}</td></tr>
            <tr><td>Data di adozione</td><td>{p.dataAdozione ? fmtData(p.dataAdozione) : <span className="doc-manca">non indicata</span>}</td></tr>
            <tr>
              <td>Ultimo riesame</td>
              <td>
                {p.riesameData ? (
                  fmtData(p.riesameData)
                ) : (
                  <span className="doc-manca">non ancora effettuato</span>
                )}
              </td>
            </tr>
          </tbody>
        </table>

        <h2>3. Politica e perimetro</h2>
        <p>{p.politica || <span className="doc-manca">Politica di due diligence non ancora dichiarata.</span>}</p>
        {p.perimetro && (
          <>
            <h3>Perimetro</h3>
            <p>{p.perimetro}</p>
          </>
        )}
        {p.esclusioni && (
          <>
            <h3>Esclusioni motivate</h3>
            <p>{p.esclusioni}</p>
          </>
        )}

        <h2>4. Il processo in sei fasi</h2>
        <table>
          <thead>
            <tr>
              <th style={{ width: "6%" }}>#</th>
              <th style={{ width: "24%" }}>Fase</th>
              <th>Contenuto</th>
            </tr>
          </thead>
          <tbody>
            {dati.fasi.map((f) => (
              <tr key={f.key}>
                <td className="doc-mono">{f.key}</td>
                <td><strong>{f.nome}</strong></td>
                <td>{f.descrizione}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <h2>5. Copertura della filiera</h2>
        <table>
          <tbody>
            <tr>
              <td style={{ width: "58%" }}>Partner mappati (rapporti attivi, in uscita o sospesi)</td>
              <td><strong>{q.partnerVivi}</strong></td>
            </tr>
            {q.cessati > 0 && (
              <tr>
                <td>
                  Rapporti cessati, esclusi da ogni conteggio
                  <br />
                  <span style={{ opacity: 0.7 }}>
                    compresa la spesa: un cessato di rilievo schiaccerebbe ogni percentuale
                  </span>
                </td>
                <td>{q.cessati}</td>
              </tr>
            )}
            <tr><td>Partner con rischio residuo determinato</td><td><strong>{q.valutati}</strong></td></tr>
            <tr><td>Spesa annua sui rapporti in essere</td><td className="doc-mono">{euro(q.spesaViva)}</td></tr>
            <tr><td>di cui su partner valutati</td><td className="doc-mono">{euro(q.spesaCoperta)}</td></tr>
            <tr>
              <td><strong>Copertura sulla spesa</strong></td>
              <td><strong>{q.coperturaSpesa}%</strong></td>
            </tr>
            <tr><td>Copertura sul numero di partner</td><td>{q.coperturaNumero}%</td></tr>
          </tbody>
        </table>

        <h3>Distribuzione del rischio residuo</h3>
        <table>
          <thead>
            <tr>
              <th>Rischio residuo</th>
              <th style={{ width: "18%" }}>Partner</th>
              <th style={{ width: "34%" }}>Verifica minima</th>
            </tr>
          </thead>
          <tbody>
            {ORDINE_RESIDUO.map((r) => (
              <tr key={r}>
                <td><strong>{r}</strong></td>
                <td>{q.perResiduo[r] ?? 0}</td>
                <td>{{ Critico: "ogni 12 mesi", Alto: "ogni 24 mesi", Medio: "ogni 36 mesi", Basso: "ogni 48 mesi" }[r]}</td>
              </tr>
            ))}
            {nonValutati.length > 0 && (
              <tr>
                <td><span className="doc-manca">Non ancora determinato</span></td>
                <td>{nonValutati.length}</td>
                <td>—</td>
              </tr>
            )}
          </tbody>
        </table>

        <h2>6. Rischi individuati e priorità</h2>
        {daVerificare.length === 0 ? (
          <p>
            Nessun partner in essere presenta oggi un rischio residuo Critico o Alto.
            {nonValutati.length > 0 && (
              <>
                {" "}Restano tuttavia <strong>{nonValutati.length}</strong> partner senza valutazione: l&apos;assenza
                di rischio dichiarato non equivale a rischio assente.
              </>
            )}
          </p>
        ) : (
          <>
            <p>
              I partner che seguono richiedono azione prioritaria. L&apos;ordine è per gravità del rischio
              residuo, che incrocia il rischio inerente del contesto con la maturità accertata.
            </p>
            <table>
              <thead>
                <tr>
                  <th>Partner</th>
                  <th style={{ width: "12%" }}>Paese</th>
                  <th style={{ width: "12%" }}>Inerente</th>
                  <th style={{ width: "11%" }}>Maturità</th>
                  <th style={{ width: "12%" }}>Residuo</th>
                  <th style={{ width: "13%" }}>Verifica</th>
                </tr>
              </thead>
              <tbody>
                {daVerificare.map((x) => (
                  <tr key={x.nome}>
                    <td>
                      <strong>{x.nome}</strong>
                      {x.flag.length > 0 && (
                        <>
                          <br />
                          <span style={{ opacity: 0.75 }}>
                            {x.flag.map((f) => nomeFlag.get(f) ?? f).join(" · ")}
                          </span>
                        </>
                      )}
                    </td>
                    <td>{x.paese || "—"}</td>
                    <td>{x.categoriaInerente ?? "—"}</td>
                    <td className="doc-mono">{x.maturita ? x.maturita.toFixed(1) : "—"}</td>
                    <td><strong>{x.residuo}</strong></td>
                    <td>{x.mesiVerifica ? `${x.mesiVerifica} mesi` : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}

        {senzaCritiche.length > 0 && (
          <>
            <h3>Partner valutati con aree critiche in bianco</h3>
            <p>
              Per <strong>{senzaCritiche.length}</strong> partner una o più delle tre aree critiche non è stata
              valutata. La maturità dichiarata è limitata di conseguenza: il silenzio su lavoro minorile,
              lavoro forzato o salute e sicurezza non è una prova di conformità, ed è la lacuna che il
              prossimo ciclo deve chiudere per prima.
            </p>
            <table>
              <thead>
                <tr>
                  <th>Partner</th>
                  <th style={{ width: "52%" }}>Aree critiche non valutate</th>
                </tr>
              </thead>
              <tbody>
                {senzaCritiche.map((x) => (
                  <tr key={x.nome}>
                    <td>{x.nome}</td>
                    <td>{x.criticheMancanti.join(" · ")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}

        <h2>7. Registro dei partner</h2>
        <table>
          <thead>
            <tr>
              <th>Partner</th>
              <th style={{ width: "11%" }}>Livello</th>
              <th style={{ width: "12%" }}>Paese</th>
              <th style={{ width: "15%" }}>Spesa annua</th>
              <th style={{ width: "13%" }}>Qualifica</th>
              <th style={{ width: "12%" }}>Residuo</th>
            </tr>
          </thead>
          <tbody>
            {vivi.map((x) => (
              <tr key={x.nome}>
                <td>{x.nome}</td>
                <td>{x.livello || "—"}</td>
                <td>{x.paese || "—"}</td>
                <td className="doc-mono">{euro(x.spesa)}</td>
                <td>{x.qualifica || <span className="doc-manca">non qualificato</span>}</td>
                <td>{x.residuo ?? <span className="doc-manca">da valutare</span>}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <h2>8. Riesame</h2>
        {q.riesameFatto ? (
          <p>
            Il processo è stato riesaminato il <strong>{fmtData(String(p.riesameData))}</strong>.
            {p.riesameEsito ? <> {p.riesameEsito}</> : null}
          </p>
        ) : (
          <p className="doc-manca">
            Il riesame periodico dell&apos;efficacia del processo non è ancora stato effettuato. È la quarta
            fase del ciclo OCSE, e senza di essa il processo non si chiude.
          </p>
        )}

        <h2>9. Riferimenti</h2>
        <ul>
          <li>Linee guida OCSE sul dovere di diligenza per la condotta d&apos;impresa responsabile</li>
          <li>Direttiva (UE) 2024/1760 sul dovere di diligenza delle imprese ai fini della sostenibilità</li>
          <li>
            Rischio residuo = rischio inerente del contesto (paese, settore, prodotto, modello di
            approvvigionamento) incrociato con la maturità accertata del partner.
          </li>
        </ul>

        <p className="doc-meta">
          Dichiarazione emessa da {marchio.nome} per {p.ragione || azienda.nome} · generata il{" "}
          {fmtData(dati.generatoIl.slice(0, 10))}. I valori sono congelati alla data di emissione: modifiche
          successive alla filiera non alterano questa revisione.
        </p>
      </div>
    </>
  );
}
