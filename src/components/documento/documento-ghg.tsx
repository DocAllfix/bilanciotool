import { fmtNum, fmtPct, fmtData } from "@/lib/format";
import { Donut, HBars, DOC } from "./charts";
import GWP from "@/lib/db/seeds/data/ghg-gwp-sets.json";

// Rapporto d'inventario GHG conforme ai contenuti minimi del §9.3.1
// (ISO 14064-1:2018). Renderizza ESCLUSIVAMENTE dallo snapshot.

type Snapshot = {
  generatoIl: string;
  azienda: { nome: string; settore: string | null; sede: string | null };
  inventario: {
    anno: number; annoBase: number; gwpSetKey: string;
    boundaries: Record<string, string>;
    ricavi: string | null; fte: string | null; produzione: string | null; umProduzione: string | null;
  };
  catalogo: {
    categorie: { key: string; nome: string; scope: number; descrizione: string }[];
    sorgenti: { key: string; categoryKey: string; nome: string }[];
    requisiti: { key: string; clausola: string; nome: string }[];
  };
  sorgenti: { sourceTypeKey: string; stato: "in" | "out" | "na"; motivazione: string | null }[];
  checklist: { requirementKey: string; stato: string; nota: string | null }[];
  righe: {
    id: string; sourceTypeKey: string; categoryKey: string; sede: string | null; descrizione: string | null;
    um: string; quantita: string; fe: string;
  }[];
  obiettivi: { id: string; nome: string; ambito: string; riduzionePct: string; annoTarget: number; note: string | null }[];
  fattoriUsati: { key: string; nome: string; um: string; fe: string; fonte: string | null }[];
  risultati: {
    n: number; s1: string; s2l: string; s2m: string; s3: string; totL: string; totM: string; bio: string;
    incPct: string; incMPct: string; dqMedia: string;
    perCategoria: Record<string, { n: number; t: string; tM: string; incPct: string; dqMedia: string }>;
    intensita: { perFatturato: string | null; perAddetto: string | null; perUnita: string | null };
    variazioneAnnoBasePct: string | null;
    obiettivi: { id: string; nome: string; ambito: string; riduzionePct: string; annoTarget: number }[];
  };
};

const AMBITI: Record<string, string> = { "1": "Categoria 1", "2": "Categoria 2", "12": "Categorie 1 e 2", "3": "Categorie 3-6", tot: "Totale" };

export function DocumentoGhg({ dati }: { dati: Snapshot }) {
  const { azienda, inventario: inv, catalogo, risultati: r } = dati;
  const b = inv.boundaries;
  const gwp = (GWP as Record<string, { n: string; ch4: number; ch4b: number; n2o: number }>)[inv.gwpSetKey] ?? (GWP as never)["AR6"];
  const sorgentePer = new Map(catalogo.sorgenti.map((s) => [s.key, s]));
  const statoPer = new Map(dati.sorgenti.map((s) => [s.sourceTypeKey, s]));
  const escluse = dati.sorgenti.filter((s) => s.stato !== "in");
  const pct = (v: string) => (Number(r.totL) > 0 ? fmtNum((Number(v) / Number(r.totL)) * 100, 1) : "0,0");

  const TabellaCategoria = ({ cat }: { cat: string }) => {
    const vs = dati.righe.filter((x) => x.categoryKey === cat);
    if (!vs.length) return <p className="doc-meta">Nessuna emissione quantificata in questa categoria per il periodo.</p>;
    return (
      <table>
        <thead>
          <tr><th>Sorgente</th><th>Voce</th><th className="doc-num">Quantità</th><th className="doc-num">FE</th><th className="doc-num">tCO₂e</th></tr>
        </thead>
        <tbody>
          {vs.map((v) => (
            <tr key={v.id}>
              <td>{sorgentePer.get(v.sourceTypeKey)?.nome}</td>
              <td>{v.descrizione || "—"}{v.sede ? <div className="doc-meta">{v.sede}</div> : null}</td>
              <td className="doc-num">{fmtNum(v.quantita, 2)} {v.um}</td>
              <td className="doc-num">{fmtNum(v.fe, 4)}</td>
              <td className="doc-num">{fmtNum((Number(v.quantita) * Number(v.fe)) / 1000, 3)}</td>
            </tr>
          ))}
          <tr className="doc-tot">
            <td colSpan={4}>Totale categoria {cat}</td>
            <td className="doc-num">{fmtNum(r.perCategoria[cat]?.t ?? 0, 2)}</td>
          </tr>
        </tbody>
      </table>
    );
  };

  return (
    <div className="doc-corpo">
      <h2>Rapporto d&apos;inventario dei gas a effetto serra</h2>
      <p className="doc-meta">
        {azienda.nome} · periodo di rendicontazione {inv.anno} ({b.periodo || "1 gennaio – 31 dicembre"}) · redatto secondo UNI EN ISO 14064-1:2018
      </p>

      <h2>1. L&apos;organizzazione e le responsabilità</h2>
      <p>
        {b.forma || azienda.nome}{b.piva ? `, partita IVA ${b.piva}` : ""}{b.sede || azienda.sede ? `, con sede in ${b.sede || azienda.sede}` : ""}, opera nel settore {b.settore || azienda.settore || "non indicato"}{b.ateco ? ` (ATECO ${b.ateco})` : ""}.
      </p>
      <p>
        Responsabile dell&apos;inventario: {b.responsabile || <span className="doc-manca">da designare</span>}. Il presente rapporto è redatto dall&apos;organizzazione, che risponde della completezza e dell&apos;accuratezza dei dati riportati.
      </p>

      <h2>2. Confini organizzativi</h2>
      <p>Approccio di consolidamento adottato: <strong>{b.consolidamento || "Controllo operativo"}</strong>, applicato in modo uniforme a tutte le unità del perimetro.</p>
      <p>{b.perimetroOrg || <span className="doc-manca">Perimetro non ancora descritto.</span>}</p>
      {b.siti && <p><strong>Siti operativi.</strong> {b.siti}</p>}

      <h2>3. Confini di rendicontazione</h2>
      <p>{b.perimetroOp || <span className="doc-manca">Descrizione non ancora compilata.</span>}</p>
      <p><strong>Criteri di significatività.</strong> {b.significativita || <span className="doc-manca">Da definire.</span>}</p>
      <table>
        <thead><tr><th>Categoria</th><th>Sorgenti incluse</th><th className="doc-num">tCO₂e</th></tr></thead>
        <tbody>
          {catalogo.categorie.map((c) => {
            const incluse = catalogo.sorgenti
              .filter((s) => s.categoryKey === c.key && statoPer.get(s.key)?.stato === "in")
              .map((s) => s.nome);
            return (
              <tr key={c.key}>
                <td><strong>Categoria {c.key}</strong> — {c.nome}<div className="doc-meta">Scope {c.scope}</div></td>
                <td>{incluse.length ? incluse.join("; ") : <span className="doc-meta">nessuna sorgente inclusa</span>}</td>
                <td className="doc-num">{fmtNum(r.perCategoria[c.key]?.t ?? 0, 2)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {escluse.length > 0 && (
        <>
          <h3>Esclusioni e relative motivazioni</h3>
          <table>
            <thead><tr><th>Sorgente</th><th>Esito</th><th>Motivazione</th></tr></thead>
            <tbody>
              {escluse.map((s) => (
                <tr key={s.sourceTypeKey}>
                  <td>Cat. {sorgentePer.get(s.sourceTypeKey)?.categoryKey} — {sorgentePer.get(s.sourceTypeKey)?.nome}</td>
                  <td>{s.stato === "na" ? "Non applicabile" : "Esclusa"}</td>
                  <td>{s.motivazione || <span className="doc-manca">da motivare</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}

      <h2>4. Metodologia di quantificazione</h2>
      <p>{b.metodologia || "Le emissioni sono quantificate moltiplicando i dati di attività per i fattori di emissione pertinenti, secondo il metodo per dati di attività."}</p>
      <p>
        Potenziali di riscaldamento globale: <strong>{gwp.n}</strong> — CH₄ {gwp.ch4}, N₂O {gwp.n2o}, orizzonte 100 anni. I gas considerati sono CO₂, CH₄, N₂O, HFC, PFC, SF₆ e NF₃, espressi in tonnellate di CO₂ equivalente.
      </p>
      {dati.fattoriUsati.length > 0 && (
        <>
          <h3>Fattori di emissione utilizzati</h3>
          <table>
            <thead><tr><th>Fattore</th><th className="doc-num">Valore</th><th>Unità</th><th>Fonte</th></tr></thead>
            <tbody>
              {dati.fattoriUsati.map((f) => (
                <tr key={f.key}>
                  <td>{f.nome}</td>
                  <td className="doc-num">{fmtNum(f.fe, 4)}</td>
                  <td>kgCO₂e/{f.um}</td>
                  <td>{f.fonte || <span className="doc-manca">da documentare</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}

      <h2>5. Emissioni dirette — categoria 1 (Scope 1)</h2>
      <TabellaCategoria cat="1" />
      {Number(r.bio) > 0 && (
        <p>
          <strong>CO₂ biogenica.</strong> Nel periodo sono state emesse {fmtNum(r.bio, 2)} tonnellate di CO₂ da combustione di biomassa, riportate separatamente e non incluse nei totali, come previsto dalla norma.
        </p>
      )}

      <h2>6. Emissioni indirette da energia importata — categoria 2 (Scope 2)</h2>
      <TabellaCategoria cat="2" />
      <table>
        <thead><tr><th>Metodo</th><th className="doc-num">tCO₂e</th></tr></thead>
        <tbody>
          <tr><td>Location-based — mix medio di rete</td><td className="doc-num"><strong>{fmtNum(r.s2l, 2)}</strong></td></tr>
          <tr><td>Market-based — contratti, Garanzie d&apos;Origine, residual mix</td><td className="doc-num"><strong>{fmtNum(r.s2m, 2)}</strong></td></tr>
        </tbody>
      </table>

      <h2>7. Altre emissioni indirette — categorie 3, 4, 5 e 6 (Scope 3)</h2>
      {(["3", "4", "5", "6"] as const).map((cat) => (
        <div key={cat}>
          <h3>Categoria {cat} — {catalogo.categorie.find((c) => c.key === cat)?.nome}</h3>
          <TabellaCategoria cat={cat} />
        </div>
      ))}

      <h2>8. Riepilogo dell&apos;inventario</h2>
      <figure className="doc-fig meta-colonna">
        <Donut
          unita="tCO₂e"
          decimali={1}
          voci={[
            { nome: "Categoria 1 — dirette", valore: Number(r.s1), colore: DOC.scope1 },
            { nome: "Categoria 2 — energia importata", valore: Number(r.s2l), colore: DOC.scope2 },
            { nome: "Categorie 3-6 — altre indirette", valore: Number(r.s3), colore: DOC.scope3 },
          ]}
        />
        <figcaption>Composizione delle emissioni per scope, totale location-based.</figcaption>
      </figure>
      <table>
        <thead><tr><th>Voce</th><th className="doc-num">tCO₂e</th><th className="doc-num">Peso</th></tr></thead>
        <tbody>
          <tr><td>Categoria 1 — emissioni dirette</td><td className="doc-num">{fmtNum(r.s1, 2)}</td><td className="doc-num">{pct(r.s1)}%</td></tr>
          <tr><td>Categoria 2 — energia importata (location-based)</td><td className="doc-num">{fmtNum(r.s2l, 2)}</td><td className="doc-num">{pct(r.s2l)}%</td></tr>
          <tr><td>Categorie 3-6 — altre emissioni indirette</td><td className="doc-num">{fmtNum(r.s3, 2)}</td><td className="doc-num">{pct(r.s3)}%</td></tr>
          <tr className="doc-tot"><td>Totale location-based</td><td className="doc-num">{fmtNum(r.totL, 2)}</td><td className="doc-num">100,0%</td></tr>
          <tr><td><strong>Totale market-based</strong></td><td className="doc-num"><strong>{fmtNum(r.totM, 2)}</strong></td><td className="doc-num">—</td></tr>
          {Number(r.bio) > 0 && <tr><td>CO₂ biogenica (fuori totale)</td><td className="doc-num">{fmtNum(r.bio, 2)}</td><td className="doc-num">—</td></tr>}
        </tbody>
      </table>
      {(r.intensita.perFatturato || r.intensita.perAddetto || r.intensita.perUnita) && (
        <>
          <h3>Intensità di emissione</h3>
          <table>
            <tbody>
              {r.intensita.perFatturato && <tr><td>Per fatturato</td><td className="doc-num">{fmtNum(r.intensita.perFatturato, 2)} tCO₂e/M€</td></tr>}
              {r.intensita.perAddetto && <tr><td>Per addetto</td><td className="doc-num">{fmtNum(r.intensita.perAddetto, 0)} kgCO₂e/FTE</td></tr>}
              {r.intensita.perUnita && <tr><td>Per unità di prodotto</td><td className="doc-num">{fmtNum(r.intensita.perUnita, 2)} kgCO₂e/{inv.umProduzione || "unità"}</td></tr>}
            </tbody>
          </table>
        </>
      )}
      <div className="doc-clear" />

      <h2>9. Anno base e confronto</h2>
      <p>
        Anno base: <strong>{inv.annoBase}</strong>. {b.motivoBase || ""}
      </p>
      {r.variazioneAnnoBasePct !== null && (
        <p>
          Nel periodo {inv.anno} le emissioni totali sono {Number(r.variazioneAnnoBasePct) <= 0 ? "diminuite" : "aumentate"} del {fmtNum(Math.abs(Number(r.variazioneAnnoBasePct)), 1)}% rispetto all&apos;anno base.
        </p>
      )}
      <p><strong>Ricalcolo dell&apos;anno base.</strong> {b.regolaRicalcolo || <span className="doc-manca">Regola da definire.</span>}</p>
      {r.obiettivi.length > 0 && (
        <>
          <h3>Obiettivi di riduzione</h3>
          <table>
            <thead><tr><th>Obiettivo</th><th>Ambito</th><th className="doc-num">Riduzione</th><th className="doc-num">Anno</th></tr></thead>
            <tbody>
              {r.obiettivi.map((o) => (
                <tr key={o.id}>
                  <td>{o.nome}</td>
                  <td>{AMBITI[o.ambito] ?? o.ambito}</td>
                  <td className="doc-num">−{fmtNum(o.riduzionePct, 0)}%</td>
                  <td className="doc-num">{o.annoTarget}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}

      <h2>10. Incertezza e qualità dei dati</h2>
      <p>
        L&apos;incertezza complessiva dell&apos;inventario, stimata combinando in quadratura le incertezze attribuite a ciascuna voce, è pari a <strong>± {fmtPct(r.incPct)}</strong> sul totale location-based. L&apos;indice medio di qualità del dato, ponderato sulle emissioni, è <strong>{fmtNum(r.dqMedia, 1)} su 5</strong>.
      </p>
      <figure className="doc-fig">
        <HBars
          unita="tCO₂e per categoria"
          decimali={2}
          voci={catalogo.categorie.map((c) => ({
            nome: `Cat ${c.key} — ${c.nome}`,
            valore: Number(r.perCategoria[c.key]?.t ?? 0),
            colore: c.key === "1" ? DOC.scope1 : c.key === "2" ? DOC.scope2 : DOC.scope3,
          }))}
        />
      </figure>

      <h2>11. Dichiarazione di conformità e verifica</h2>
      <p>
        Il presente inventario è stato predisposto in conformità alla norma UNI EN ISO 14064-1:2018. Stato della verifica: <strong>{b.verifica || "Nessuna verifica di parte terza"}</strong>.
      </p>
      <p className="doc-meta">
        Documento generato il {fmtData(dati.generatoIl)} · i dati di dettaglio e le evidenze documentali sono conservati nel sistema di gestione delle informazioni GHG dell&apos;organizzazione.
      </p>
      <p className="doc-meta" style={{ display: "flex", alignItems: "center", gap: "6px" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/brand/derivati/monogramma.svg" alt="" style={{ height: "14px", width: "auto" }} />
        Redatto con EvalisDeck
      </p>
    </div>
  );
}
