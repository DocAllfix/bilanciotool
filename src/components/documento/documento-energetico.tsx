import { fmtNum, fmtData } from "@/lib/format";
import { marchioDelloSnapshot } from "@/features/documents/marchio";
import { DOC, COLORE_AREA_DOC } from "./charts";
import { BarreDivergenti, BarreMensili, Pareto, Sankey } from "./charts-energia";
import { TiptapRender, tiptapVuoto } from "./tiptap-render";

// Diagnosi energetica impaginata (UNI CEI EN 16247-1/3, ISO 50001,
// art. 8 D.Lgs. 102/2014). Renderizza ESCLUSIVAMENTE dallo snapshot: le
// modifiche successive ai dati vivi non toccano un documento già pubblicato.

type Media = {
  tipo: "img" | "chart";
  storageKey: string | null;
  chartKey: string | null;
  didascalia: string | null;
  credito: string | null;
  larghezza: "piena" | "meta";
  posizione: number;
};

type Snapshot = {
  generatoIl: string;
  azienda: { nome: string; settore: string | null; sede: string | null };
  bilancio: { anno: number; annoBase: number; profilo: Record<string, string> };
  catalogo: {
    vettori: { key: string; nome: string; um: string; categoria: "E" | "T" | "M"; rinnovabile: boolean; sub: boolean; colore: string | null; kwhUnita: string; tepUnita: string; feUnita: string; fonte: string | null; origine: string }[];
    aree: { key: string; nome: string; descrizione: string; colore: string }[];
    usi: { key: string; nome: string; areaKey: string; attivo: boolean; metodo: string | null; nota: string | null }[];
    driver: { key: string; nome: string; um: string; hint: string | null }[];
    indicatori: { key: string; nome: string; um: string; decimali: number; hint: string | null }[];
    capitoli: { key: string; nome: string; hint: string }[];
    metodi: { v: string; n: string; d: string }[];
  };
  stato: {
    inputs: { vettoreKey: string; quantita: string | null; costo: string | null; mensili: string[] }[];
    celle: { usoKey: string; vettoreKey: string; quantita: string }[];
    driver: { corrente: Record<string, string>; base: Record<string, string> };
    misure: { id: string; descrizione: string; vettoreKey: string; quantita: string | null; investimento: string | null; incentivo: string | null; usoKey: string | null; stato: string; annoPrevisto: number | null; note: string | null }[];
  };
  capitoli: { templateKey: string; contenuto: unknown; media: Media[] }[];
  risultati: {
    totali: { kwh: string; tep: string; co2: string; costo: string; kwhE: string; kwhT: string; kwhM: string; gj: string; rinnovabile: string; pctRinnovabile: string; euroPerKwh: string };
    perVettore: { key: string; quantita: string; kwh: string; tep: string; co2: string; costo: string; euroPerKwh: string }[];
    emissioni: { scope1: string; scope2Location: string; scope2Market: string; totLocation: string; goCoperte: string };
    ripartizione: {
      perUso: { key: string; kwh: string; tep: string; co2: string; costo: string; pct: string }[];
      perArea: Record<string, string>;
      kwhRipartito: string;
      coperturaPct: string;
    };
    quadratura: {
      perVettore: { key: string; ingresso: string; ripartito: string; residuo: string; scostamentoPct: string; ok: boolean; attivo: boolean }[];
      ok: number; valutati: number; pct: string;
    };
    flussi: { vettoreKey: string; areaKey: string; kwh: string }[];
    mensile: {
      perCategoria: { E: string[]; T: string[]; M: string[] };
      perMese: string[];
      totale: string;
      controlli: { key: string; sommaMesi: string; annuo: string; scostamentoPct: string | null; ok: boolean }[];
      consumoDiBase: string | null;
    };
    indicatori: { key: string; valore: string | null }[];
    confronto: { key: string; valore: string; valoreBase: string; variazionePct: string; migliorato: boolean }[];
    misure: {
      righe: { kwh: string; tep: string; co2: string; risparmioEuro: string; investimento: string; incentivo: string; netto: string; pbtAnni: string | null; pctSulTotale: string }[];
      totali: { kwh: string; tep: string; co2: string; risparmioEuro: string; investimento: string; netto: string; pbtAnni: string | null; pctSulTotale: string; quantificate: number };
    };
  };
};

const MESI = ["Gen", "Feb", "Mar", "Apr", "Mag", "Giu", "Lug", "Ago", "Set", "Ott", "Nov", "Dic"];
const NOME_CATEGORIA: Record<"E" | "T" | "M", string> = { E: "Elettrico", T: "Termico", M: "Autotrazione" };
const COLORE_CATEGORIA: Record<"E" | "T" | "M", string> = { E: DOC.scope2, T: DOC.scope1, M: DOC.scope3 };
const STATI_MISURA: Record<string, string> = {
  proposto: "Proposto", valutato: "Valutato", approvato: "Approvato",
  in_corso: "In corso", realizzato: "Realizzato", scartato: "Scartato",
};

const n = (v: string | null | undefined, d = 0) => (v === null || v === undefined ? "—" : fmtNum(v, d));

/** Decimali solo dove servono: "1.284" e non "1.284,00", ma "0,75" resta "0,75". */
const nauto = (v: string | null | undefined, max = 2) => {
  if (v === null || v === undefined || v === "") return "—";
  const x = Number(v);
  if (!Number.isFinite(x)) return "—";
  return fmtNum(x, Number.isInteger(x) ? 0 : max);
};

export function DocumentoEnergetico({ dati, imageUrls }: { dati: Snapshot; imageUrls: Map<string, string> }) {
  const { azienda, bilancio: b, catalogo, stato, risultati: r } = dati;
  const p = b.profilo;
  const anno = b.anno;

  const vettorePer = new Map(catalogo.vettori.map((v) => [v.key, v]));
  const usoPer = new Map(catalogo.usi.map((u) => [u.key, u]));
  const areaPer = new Map(catalogo.aree.map((a) => [a.key, a]));
  const metodoPer = new Map(catalogo.metodi.map((m) => [m.v, m.n]));
  const capitoloPer = new Map(dati.capitoli.map((c) => [c.templateKey, c]));
  const indicatorePer = new Map(catalogo.indicatori.map((i) => [i.key, i]));
  const confrontoPer = new Map(r.confronto.map((c) => [c.key, c]));
  const usoRisultato = new Map(r.ripartizione.perUso.map((u) => [u.key, u]));

  const usiAttivi = catalogo.usi.filter((u) => u.attivo);
  const usiValorizzati = usiAttivi.filter((u) => Number(usoRisultato.get(u.key)?.kwh ?? 0) > 0);
  const vettoriUsati = catalogo.vettori.filter(
    (v) => !v.sub && r.perVettore.some((x) => x.key === v.key && Number(x.kwh) > 0),
  );
  const conMensili = stato.inputs.filter((i) => i.mensili.some((m) => m !== ""));

  const MediaFig = ({ m }: { m: Media }) => {
    if (m.tipo === "img" && m.storageKey) {
      return (
        <figure className={`doc-fig ${m.larghezza === "meta" ? "meta-colonna" : ""}`}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={imageUrls.get(m.storageKey) ?? ""} alt={m.didascalia ?? ""} />
          {(m.didascalia || m.credito) && (
            <figcaption>{m.didascalia}{m.credito ? <i> — {m.credito}</i> : null}</figcaption>
          )}
        </figure>
      );
    }
    const grafico = <Grafico chiave={m.chartKey ?? ""} />;
    if (!grafico) return null;
    return (
      <figure className={`doc-fig ${m.larghezza === "meta" ? "meta-colonna" : ""}`}>
        {grafico}
        {m.didascalia && <figcaption>{m.didascalia}</figcaption>}
      </figure>
    );
  };

  const Capitolo = ({ chiave }: { chiave: string }) => {
    const c = capitoloPer.get(chiave);
    if (!c || tiptapVuoto(c.contenuto)) {
      return <p className="doc-manca">[Capitolo da completare al passo 6 del percorso.]</p>;
    }
    return (
      <>
        <TiptapRender doc={c.contenuto} />
        {[...c.media].sort((a, b2) => a.posizione - b2.posizione).map((m, i) => <MediaFig key={i} m={m} />)}
        <div className="doc-clear" />
      </>
    );
  };

  // I diagrammi che il consulente può inserire nei capitoli: si disegnano dallo
  // snapshot, quindi restano identici a ogni ristampa dello stesso documento.
  function Grafico({ chiave }: { chiave: string }) {
    switch (chiave) {
      case "ingresso":
        return <GraficoIngresso />;
      case "usi":
      case "pareto":
        return <GraficoPareto />;
      case "flussi":
        return <GraficoFlussi />;
      case "mensile":
        return <GraficoMensile />;
      case "indicatori":
        return <GraficoIndicatori />;
      case "interventi":
        return <GraficoInterventi />;
      default:
        return null;
    }
  }

  const GraficoIngresso = () => (
    <Pareto
      voci={vettoriUsati.map((v) => ({
        nome: v.nome,
        valore: Number(r.perVettore.find((x) => x.key === v.key)?.kwh ?? 0),
        colore: v.colore ?? COLORE_CATEGORIA[v.categoria],
      }))}
    />
  );

  const GraficoPareto = () => (
    <Pareto
      voci={usiValorizzati.map((u) => ({
        nome: u.nome,
        valore: Number(usoRisultato.get(u.key)?.kwh ?? 0),
        colore: COLORE_AREA_DOC[u.areaKey] ?? DOC.muted,
      }))}
    />
  );

  const GraficoFlussi = () => (
    <Sankey
      sorgenti={vettoriUsati.map((v) => ({
        key: v.key, nome: v.nome, colore: v.colore ?? COLORE_CATEGORIA[v.categoria],
      }))}
      destinazioni={catalogo.aree.map((a) => ({ key: a.key, nome: a.nome, colore: COLORE_AREA_DOC[a.key] ?? DOC.muted }))}
      flussi={r.flussi.map((f) => ({ da: f.vettoreKey, a: f.areaKey, valore: Number(f.kwh) }))}
    />
  );

  const GraficoMensile = () =>
    conMensili.length === 0 ? null : (
      <BarreMensili
        mesi={MESI}
        serie={(["E", "T", "M"] as const)
          .filter((c) => r.mensile.perCategoria[c].some((v) => Number(v) > 0))
          .map((c) => ({
            nome: NOME_CATEGORIA[c],
            colore: COLORE_CATEGORIA[c],
            valori: r.mensile.perCategoria[c].map(Number),
          }))}
        consumoDiBase={r.mensile.consumoDiBase === null ? null : Number(r.mensile.consumoDiBase)}
      />
    );

  const GraficoIndicatori = () => (
    <BarreDivergenti
      voci={r.confronto.map((c) => ({
        nome: indicatorePer.get(c.key)?.nome ?? c.key,
        variazionePct: Number(c.variazionePct),
        migliorato: c.migliorato,
      }))}
    />
  );

  const GraficoInterventi = () => (
    <Pareto
      voci={stato.misure
        .map((m, i) => ({
          nome: m.descrizione || `Intervento ${i + 1}`,
          valore: Number(r.misure.righe[i]?.kwh ?? 0),
          colore: DOC.scope1,
        }))
        .filter((v) => v.valore > 0)}
    />
  );

  return (
    <>
      <div className="doc-cover">
        <div className="testo">
          <p className="kicker">Bilancio energetico · esercizio {anno}</p>
          <h1>{azienda.nome}</h1>
          <p className="sotto">
            {[p.sede || azienda.sede, p.settore || azienda.settore].filter(Boolean).join(" · ")}
          </p>
          <p className="sotto" style={{ marginTop: 8, opacity: 0.7 }}>
            Diagnosi energetica redatta secondo UNI CEI EN 16247-1 e 16247-3
          </p>
        </div>
        <div className="filo" />
      </div>

      <div className="doc-corpo">
        {/* 1 ─────────────────────────────────────────────── sintesi */}
        <h2>1. Sintesi per la direzione</h2>
        <p className="doc-meta">
          {azienda.nome} · esercizio {anno} · confronto con il {b.annoBase} · redatta secondo UNI CEI EN 16247-1/3
        </p>
        <table>
          <tbody>
            <tr>
              <td style={{ width: "38%" }}>Energia complessivamente consumata</td>
              <td><strong>{n(r.totali.kwh)} kWh</strong> ({n(r.totali.tep, 1)} tep · {n(r.totali.gj, 1)} GJ)</td>
            </tr>
            <tr><td>Spesa energetica</td><td><strong>{n(r.totali.costo)} €</strong> · costo medio {n(r.totali.euroPerKwh, 4)} €/kWh</td></tr>
            <tr><td>Emissioni associate</td><td>{n(r.emissioni.totLocation, 1)} tCO₂e (location-based)</td></tr>
            <tr><td>Quota da fonti rinnovabili</td><td>{n(r.totali.pctRinnovabile, 1)}%</td></tr>
            <tr><td>Energia attribuita agli usi finali</td><td>{n(r.ripartizione.kwhRipartito)} kWh · copertura {n(r.ripartizione.coperturaPct, 1)}%</td></tr>
            {r.misure.totali.quantificate > 0 && (
              <tr>
                <td>Risparmio individuato</td>
                <td>
                  <strong>{n(r.misure.totali.kwh)} kWh</strong> all&apos;anno ({n(r.misure.totali.pctSulTotale, 1)}% del consumo),
                  pari a {n(r.misure.totali.risparmioEuro)} €
                </td>
              </tr>
            )}
          </tbody>
        </table>
        <Capitolo chiave="sintesi" />

        {/* 2 ─────────────────────────────────────────────── sito */}
        <h2>2. Il sito e le attività</h2>
        <table>
          <tbody>
            <tr><td style={{ width: "38%" }}>Denominazione</td><td><strong>{p.forma || azienda.nome}</strong></td></tr>
            {p.piva && <tr><td>Partita IVA</td><td>{p.piva}</td></tr>}
            {(p.sede || azienda.sede) && <tr><td>Sede dello stabilimento</td><td>{p.sede || azienda.sede}</td></tr>}
            {(p.settore || azienda.settore) && (
              <tr><td>Settore di attività</td><td>{p.settore || azienda.settore}{p.ateco ? ` (ATECO ${p.ateco})` : ""}</td></tr>
            )}
            {p.sito && <tr><td>Caratteristiche del sito</td><td>{p.sito}</td></tr>}
            {p.turni && <tr><td>Regime di esercizio</td><td>{p.turni}</td></tr>}
            {p.unitaProd && <tr><td>Unità di misura della produzione</td><td>{p.unitaProd}</td></tr>}
            <tr><td>Referente per l&apos;energia</td><td>{p.referente || <span className="doc-manca">da designare</span>}</td></tr>
          </tbody>
        </table>
        <Capitolo chiave="contesto" />

        {/* 3 ─────────────────────────────────────────────── perimetro */}
        <h2>3. Perimetro della diagnosi</h2>
        <p>{p.perimetro || <span className="doc-manca">Perimetro non ancora descritto.</span>}</p>
        {p.attivita && <p><strong>Attività svolte.</strong> {p.attivita}</p>}
        <p className="doc-meta">
          La diagnosi vale per il perimetro qui dichiarato. Consumi, ripartizioni e indicatori riportati nel
          seguito si riferiscono esclusivamente a questo perimetro e all&apos;esercizio {anno}.
        </p>

        {/* 4 ─────────────────────────────────────────────── impianti */}
        <h2>4. Impianti e utenze energetiche</h2>
        <Capitolo chiave="impianti" />

        {/* 5 ─────────────────────────────────────────────── metodo */}
        <h2>5. Metodo di raccolta e fattori applicati</h2>
        <Capitolo chiave="metodo" />
        <p>
          I consumi provengono dalle fatture dei fornitori e dai contatori del sito. Le quantità sono espresse
          nell&apos;unità di misura propria di ciascun vettore e convertite in energia finale (kWh) ed energia
          primaria (tep) con i fattori riportati di seguito.
        </p>
        <table>
          <thead>
            <tr>
              <th>Vettore</th><th>Unità</th>
              <th className="doc-num">kWh/unità</th><th className="doc-num">tep/unità</th><th className="doc-num">kgCO₂e/unità</th>
              <th>Origine del fattore</th>
            </tr>
          </thead>
          <tbody>
            {catalogo.vettori.filter((v) => !v.sub).map((v) => (
              <tr key={v.key}>
                <td>{v.nome}</td>
                <td>{v.um}</td>
                <td className="doc-num">{fmtNum(v.kwhUnita, 4)}</td>
                <td className="doc-num">{fmtNum(v.tepUnita, 6)}</td>
                <td className="doc-num">{fmtNum(v.feUnita, 4)}</td>
                <td>
                  {v.origine === "personalizzato"
                    ? <>dato dell&apos;organizzazione{v.fonte ? ` — ${v.fonte}` : ""}</>
                    : <span className="doc-meta">libreria di piattaforma</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <p>
          <strong>Metodo di determinazione degli usi finali.</strong>{" "}Per ciascuna utenza è dichiarato se il dato
          è misurato, calcolato o stimato, secondo la scala riportata al capitolo 7. La dichiarazione del metodo
          è parte del risultato: un consumo stimato e uno misurato non hanno lo stesso valore probatorio.
        </p>

        {/* 6 ─────────────────────────────────────────────── ingresso */}
        <h2>6. Energia in ingresso</h2>
        <table>
          <thead>
            <tr>
              <th>Vettore</th><th className="doc-num">Quantità</th><th className="doc-num">kWh</th>
              <th className="doc-num">tep</th><th className="doc-num">Spesa €</th><th className="doc-num">€/kWh</th>
            </tr>
          </thead>
          <tbody>
            {r.perVettore
              .filter((v) => Number(v.kwh) > 0 || Number(v.costo) > 0)
              .map((v) => {
                const def = vettorePer.get(v.key);
                return (
                  <tr key={v.key} className={def?.sub ? "doc-meta" : undefined}>
                    <td>{def?.nome ?? v.key}{def?.sub ? " (di cui)" : ""}</td>
                    <td className="doc-num">{nauto(v.quantita)} {def?.um}</td>
                    <td className="doc-num">{n(v.kwh)}</td>
                    <td className="doc-num">{n(v.tep, 2)}</td>
                    <td className="doc-num">{n(v.costo)}</td>
                    <td className="doc-num">{n(v.euroPerKwh, 4)}</td>
                  </tr>
                );
              })}
            <tr className="doc-tot">
              <td>Totale del sito</td>
              <td className="doc-num">—</td>
              <td className="doc-num">{n(r.totali.kwh)}</td>
              <td className="doc-num">{n(r.totali.tep, 2)}</td>
              <td className="doc-num">{n(r.totali.costo)}</td>
              <td className="doc-num">{n(r.totali.euroPerKwh, 4)}</td>
            </tr>
          </tbody>
        </table>
        <p className="doc-meta">
          L&apos;energia elettrica coperta da garanzie d&apos;origine è un dettaglio del prelievo, non un vettore
          aggiuntivo: entra nel calcolo della quota rinnovabile e delle emissioni market-based, mai nei totali.
        </p>
        <figure className="doc-fig">
          <GraficoIngresso />
          <figcaption>Composizione dell&apos;energia in ingresso, in kWh</figcaption>
        </figure>

        {/* 7 ─────────────────────────────────────────────── usi finali */}
        <h2>7. Ripartizione sugli usi finali</h2>
        <p>
          L&apos;energia entrata nel sito è stata attribuita alle utenze che la consumano. La ripartizione copre
          il <strong>{n(r.ripartizione.coperturaPct, 1)}%</strong> dell&apos;energia complessiva.
        </p>
        <table>
          <thead>
            <tr>
              <th>Uso finale</th><th>Area</th><th>Determinazione</th>
              <th className="doc-num">kWh</th><th className="doc-num">%</th>
              <th className="doc-num">tCO₂e</th><th className="doc-num">Costo €</th>
            </tr>
          </thead>
          <tbody>
            {usiValorizzati.map((u) => {
              const x = usoRisultato.get(u.key)!;
              return (
                <tr key={u.key}>
                  <td>{u.nome}</td>
                  <td>{areaPer.get(u.areaKey)?.nome ?? u.areaKey}</td>
                  <td>{u.metodo ? metodoPer.get(u.metodo) : <span className="doc-manca">non dichiarata</span>}</td>
                  <td className="doc-num">{n(x.kwh)}</td>
                  <td className="doc-num">{n(x.pct, 1)}</td>
                  <td className="doc-num">{n(x.co2, 2)}</td>
                  <td className="doc-num">{n(x.costo)}</td>
                </tr>
              );
            })}
            <tr className="doc-tot">
              <td colSpan={3}>Totale attribuito</td>
              <td className="doc-num">{n(r.ripartizione.kwhRipartito)}</td>
              <td className="doc-num">100,0</td>
              <td className="doc-num">—</td>
              <td className="doc-num">—</td>
            </tr>
          </tbody>
        </table>

        <h3>Aree funzionali</h3>
        <table>
          <thead><tr><th>Area</th><th>Che cosa comprende</th><th className="doc-num">kWh</th><th className="doc-num">%</th></tr></thead>
          <tbody>
            {catalogo.aree.map((a) => {
              const kwh = Number(r.ripartizione.perArea[a.key] ?? 0);
              const tot = Number(r.ripartizione.kwhRipartito) || 1;
              return (
                <tr key={a.key}>
                  <td><strong>{a.nome}</strong></td>
                  <td className="doc-meta">{a.descrizione}</td>
                  <td className="doc-num">{fmtNum(kwh)}</td>
                  <td className="doc-num">{fmtNum((kwh / tot) * 100, 1)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>

        <figure className="doc-fig">
          <GraficoFlussi />
          <figcaption>Dai vettori energetici alle aree funzionali, in kWh</figcaption>
        </figure>
        <figure className="doc-fig">
          <GraficoPareto />
          <figcaption>Usi finali in ordine di consumo, con la curva cumulata</figcaption>
        </figure>

        <h3>Quadratura</h3>
        <p>
          Il controllo confronta, vettore per vettore, la quantità entrata nel sito e quella attribuita alle
          utenze. Il confronto è fatto sulle quantità e non sui kWh, quindi resta valido anche se un fattore di
          conversione viene corretto in seguito. Chiudono entro il 2% <strong>{r.quadratura.ok} vettori su {r.quadratura.valutati}</strong>.
        </p>
        <table>
          <thead>
            <tr>
              <th>Vettore</th><th className="doc-num">Entrato</th><th className="doc-num">Attribuito</th>
              <th className="doc-num">Residuo</th><th className="doc-num">Scostamento</th><th>Esito</th>
            </tr>
          </thead>
          <tbody>
            {r.quadratura.perVettore.filter((q) => q.attivo).map((q) => (
              <tr key={q.key}>
                <td>{vettorePer.get(q.key)?.nome ?? q.key}</td>
                <td className="doc-num">{nauto(q.ingresso)}</td>
                <td className="doc-num">{nauto(q.ripartito)}</td>
                <td className="doc-num">{nauto(q.residuo)}</td>
                <td className="doc-num">{n(q.scostamentoPct, 1)}%</td>
                <td>{q.ok ? "chiude" : <strong>da rivedere</strong>}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* 8 ─────────────────────────────────────────────── mensile */}
        {conMensili.length > 0 && (
          <>
            <h2>8. Andamento nel corso dell&apos;anno</h2>
            <p>
              La distribuzione mensile distingue il consumo che segue la produzione da quello che c&apos;è
              comunque.
              {r.mensile.consumoDiBase !== null && (
                <> Il consumo di base stimato è di <strong>{n(r.mensile.consumoDiBase)} kWh</strong> al mese,
                pari al {fmtNum((Number(r.mensile.consumoDiBase) * 12 / (Number(r.totali.kwh) || 1)) * 100, 1)}%{" "}
                del consumo annuo: è l&apos;energia che il sito assorbe anche senza produrre.</>
              )}
            </p>
            <figure className="doc-fig">
              <GraficoMensile />
              <figcaption>Consumi mensili per categoria di vettore, in kWh</figcaption>
            </figure>
            {r.mensile.controlli.some((c) => !c.ok && Number(c.sommaMesi) > 0) && (
              <p className="doc-meta">
                Scostamenti fra somma dei mesi e dato annuo oltre il 2%:{" "}
                {r.mensile.controlli
                  .filter((c) => !c.ok && Number(c.sommaMesi) > 0)
                  .map((c) => `${vettorePer.get(c.key)?.nome ?? c.key} (${n(c.scostamentoPct, 1)}%)`)
                  .join("; ")}.
              </p>
            )}
          </>
        )}

        {/* 9 ─────────────────────────────────────────────── indicatori */}
        <h2>{conMensili.length > 0 ? "9" : "8"}. Indicatori di prestazione energetica</h2>
        <p>
          Un consumo assoluto dice quanto il sito ha prodotto, non se lavora bene: sono i rapporti a dirlo.
          Gli indicatori privi del denominatore non sono riportati, perché un valore nullo si leggerebbe come
          un risultato eccellente mentre il dato semplicemente manca.
        </p>
        <table>
          <thead>
            <tr>
              <th>Indicatore</th><th>Unità</th>
              <th className="doc-num">{anno}</th><th className="doc-num">{b.annoBase}</th><th className="doc-num">Variazione</th>
            </tr>
          </thead>
          <tbody>
            {r.indicatori.filter((i) => i.valore !== null).map((i) => {
              const def = indicatorePer.get(i.key);
              const c = confrontoPer.get(i.key);
              return (
                <tr key={i.key}>
                  <td>{def?.nome ?? i.key}</td>
                  <td>{def?.um}</td>
                  <td className="doc-num">{n(i.valore, def?.decimali ?? 2)}</td>
                  <td className="doc-num">{c ? n(c.valoreBase, def?.decimali ?? 2) : "—"}</td>
                  <td className="doc-num">
                    {c ? `${Number(c.variazionePct) > 0 ? "+" : "−"}${fmtNum(Math.abs(Number(c.variazionePct)), 1)}%` : "—"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <h3>Variabili di riferimento</h3>
        <table>
          <thead><tr><th>Variabile</th><th>Unità</th><th className="doc-num">{anno}</th><th className="doc-num">{b.annoBase}</th></tr></thead>
          <tbody>
            {catalogo.driver
              .filter((d) => stato.driver.corrente[d.key] || stato.driver.base[d.key])
              .map((d) => (
                <tr key={d.key}>
                  <td>{d.nome}</td>
                  <td>{d.um}</td>
                  <td className="doc-num">{nauto(stato.driver.corrente[d.key])}</td>
                  <td className="doc-num">{nauto(stato.driver.base[d.key])}</td>
                </tr>
              ))}
          </tbody>
        </table>
        {r.confronto.length > 0 && (
          <figure className="doc-fig">
            <GraficoIndicatori />
            <figcaption>Variazione degli indicatori rispetto al {b.annoBase}</figcaption>
          </figure>
        )}

        {/* 10 ────────────────────────────────────────────── emissioni */}
        <h2>{conMensili.length > 0 ? "10" : "9"}. Emissioni associate ai consumi</h2>
        <table>
          <tbody>
            <tr><td style={{ width: "52%" }}>Emissioni dirette (categoria 1 — combustione in loco)</td><td className="doc-num">{n(r.emissioni.scope1, 2)} tCO₂e</td></tr>
            <tr><td>Emissioni da energia importata, location-based (categoria 2)</td><td className="doc-num">{n(r.emissioni.scope2Location, 2)} tCO₂e</td></tr>
            <tr><td>Emissioni da energia importata, market-based</td><td className="doc-num">{n(r.emissioni.scope2Market, 2)} tCO₂e</td></tr>
            <tr className="doc-tot"><td>Totale (location-based)</td><td className="doc-num">{n(r.emissioni.totLocation, 2)} tCO₂e</td></tr>
          </tbody>
        </table>
        {Number(r.emissioni.goCoperte) > 0 && (
          <p className="doc-meta">
            Energia elettrica coperta da garanzie d&apos;origine: {n(r.emissioni.goCoperte)} kWh, considerati a
            emissione nulla nel calcolo market-based.
          </p>
        )}
        <p className="doc-meta">
          I criteri di attribuzione coincidono con quelli dell&apos;inventario dei gas a effetto serra redatto
          secondo UNI EN ISO 14064-1: teleriscaldamento e vapore acquistati sono energia importata e rientrano
          nella categoria 2, non fra le emissioni dirette.
        </p>

        {/* 11 ────────────────────────────────────────────── lettura */}
        <h2>{conMensili.length > 0 ? "11" : "10"}. Lettura dei dati e criticità</h2>
        <Capitolo chiave="analisi" />

        {/* 12 ────────────────────────────────────────────── interventi */}
        <h2>{conMensili.length > 0 ? "12" : "11"}. Programma di miglioramento</h2>
        <Capitolo chiave="azioni" />
        {stato.misure.length === 0 ? (
          <p className="doc-manca">[Nessun intervento proposto: da compilare al passo 5 del percorso.]</p>
        ) : (
          <>
            <table>
              <thead>
                <tr>
                  <th>Intervento</th><th>Stato</th>
                  <th className="doc-num">kWh/anno</th><th className="doc-num">tCO₂e/anno</th>
                  <th className="doc-num">Risparmio €</th><th className="doc-num">Spesa netta €</th><th className="doc-num">Ritorno</th>
                </tr>
              </thead>
              <tbody>
                {stato.misure.map((m, i) => {
                  const c = r.misure.righe[i];
                  return (
                    <tr key={m.id}>
                      <td>
                        {m.descrizione || <span className="doc-manca">senza descrizione</span>}
                        {m.usoKey && <div className="doc-meta">{usoPer.get(m.usoKey)?.nome}</div>}
                      </td>
                      <td>{STATI_MISURA[m.stato] ?? m.stato}{m.annoPrevisto ? ` · ${m.annoPrevisto}` : ""}</td>
                      <td className="doc-num">{n(c?.kwh)}</td>
                      <td className="doc-num">{n(c?.co2, 2)}</td>
                      <td className="doc-num">{n(c?.risparmioEuro)}</td>
                      <td className="doc-num">{n(c?.netto)}</td>
                      <td className="doc-num">{c?.pbtAnni === null || c?.pbtAnni === undefined ? "—" : `${fmtNum(c.pbtAnni, 1)} anni`}</td>
                    </tr>
                  );
                })}
                <tr className="doc-tot">
                  <td colSpan={2}>Totale</td>
                  <td className="doc-num">{n(r.misure.totali.kwh)}</td>
                  <td className="doc-num">{n(r.misure.totali.co2, 2)}</td>
                  <td className="doc-num">{n(r.misure.totali.risparmioEuro)}</td>
                  <td className="doc-num">{n(r.misure.totali.netto)}</td>
                  <td className="doc-num">{r.misure.totali.pbtAnni === null ? "—" : `${fmtNum(r.misure.totali.pbtAnni, 1)} anni`}</td>
                </tr>
              </tbody>
            </table>
            <p>
              Il risparmio individuato vale il <strong>{n(r.misure.totali.pctSulTotale, 1)}%</strong>{" "}
              del consumo del sito. Il tempo di ritorno è calcolato sulla spesa al netto degli incentivi e sul costo
              dell&apos;energia rilevato in questa diagnosi ({n(r.totali.euroPerKwh, 4)} €/kWh); non compare per
              gli interventi il cui risparmio non è ancora quantificato.
            </p>
            {r.misure.totali.quantificate > 1 && (
              <figure className="doc-fig">
                <GraficoInterventi />
                <figcaption>Interventi in ordine di risparmio energetico, in kWh/anno</figcaption>
              </figure>
            )}
          </>
        )}

        {/* 13 ────────────────────────────────────────────── monitoraggio */}
        <h2>{conMensili.length > 0 ? "13" : "12"}. Piano di monitoraggio</h2>
        <Capitolo chiave="monitor" />

        <h2>Riferimenti metodologici</h2>
        <ul>
          <li>UNI CEI EN 16247-1:2012 — Diagnosi energetiche. Requisiti generali.</li>
          <li>UNI CEI EN 16247-3:2014 — Diagnosi energetiche. Processi.</li>
          <li>UNI CEI EN ISO 50001:2018 — Sistemi di gestione dell&apos;energia.</li>
          <li>D.Lgs. 102/2014, art. 8 — Diagnosi energetiche nelle grandi imprese e nelle imprese energivore.</li>
          <li>UNI EN ISO 14064-1:2018 — per l&apos;attribuzione delle emissioni ai consumi energetici.</li>
        </ul>
        <p className="doc-meta">
          Documento generato il {fmtData(dati.generatoIl)} da {marchioDelloSnapshot(dati).nome}. I valori riportati sono congelati alla
          data di pubblicazione: modifiche successive ai dati di origine non alterano questo documento, che
          resta la versione consegnata.
        </p>
      </div>
    </>
  );
}
