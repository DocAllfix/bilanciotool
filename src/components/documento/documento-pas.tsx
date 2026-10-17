import type { ReactNode } from "react";
import { fmtDataBreve, fmtDataEstesa, fmtNum } from "@/lib/format";
import { giornoItaliano } from "@/lib/calc/comune/tempo-italia";
import { DERIVATI } from "@/lib/calc/pas/indicatori";
import { NOMI_DERIVATI, type DatiDocumentoPas } from "@/features/pas/documento";
import { BarreConformita, MatriceRischi, PianoMesi } from "./charts-gdpr";
import { BarreOrario } from "./charts-pas";
import { Copertina, NotaCopertina, type ImmaginiCopertina } from "./copertina";
import { FirmaDocumento } from "./firma";

// I QUATTRO DOCUMENTI DEL SISTEMA DI GESTIONE SOCIALE — PAS 24000:2022.
//
// ⚠️ UN TEMPLATE SOLO, guidato dal tipo, come il GDPR: i quattro leggono parti diverse della
// STESSA fotografia, congelata alla pubblicazione (`features/pas/documento.ts`).
//
// ⚠️ DEI REGISTRI QUI ARRIVANO SOLO CONTEGGI. Lo snapshot non contiene l'oggetto di un
// reclamo né la descrizione di una non conformità, ed è voluto: il collegamento del portale
// cliente serve tutti i documenti pubblicati dell'azienda. Le decisioni del riesame sì: sono
// testo dell'alta direzione, ed è il contenuto del verbale.

export type TipoDocumentoPas = "manuale_pas" | "politica_pas" | "conformita_pas" | "riesame_pas";

const TITOLO: Record<TipoDocumentoPas, string> = {
  manuale_pas: "Manuale del sistema di gestione sociale",
  politica_pas: "Politica sociale",
  conformita_pas: "Rapporto di conformità e piano di adeguamento",
  riesame_pas: "Verbale di riesame della direzione",
};

const NORMA: Record<TipoDocumentoPas, string> = {
  manuale_pas: "PAS 24000:2022 · clausole da 4 a 10 e Allegato A",
  politica_pas: "PAS 24000:2022 · punto 5.2",
  conformita_pas: "PAS 24000:2022 · clausole da 4 a 10 e Allegato A",
  riesame_pas: "PAS 24000:2022 · punto 9.3",
};

const STATO_REQ: Record<string, string> = { c: "Conforme", p: "Parziale", n: "Non conforme", na: "Non pertinente" };
const MESI = ["gennaio", "febbraio", "marzo", "aprile", "maggio", "giugno", "luglio", "agosto", "settembre", "ottobre", "novembre", "dicembre"];

const v = (x: string | null | undefined) => (x && x.trim() ? x : "—");
const d = (x: string | null | undefined) => (x ? fmtDataBreve(x) : "—");
const n = (x: number | null | undefined, dec = 0) => (x === null || x === undefined ? "—" : fmtNum(x, dec));
/** Un decimale solo dove c'è: «48» persone, «2,5» ore. */
const decimali = (x: number | null | undefined) => (x === null || x === undefined || Number.isInteger(x) ? 0 : 1);
const pct = (x: number | null | undefined) => (x === null || x === undefined ? "—" : `${String(x).replace(".", ",")}%`);
/** «1 rischio», «2 rischi»: il plurale italiano non si fa attaccando lettere in coda. */
const pl = (x: number, uno: string, molti: string) => `${x} ${x === 1 ? uno : molti}`;
const decimaliDerivato = (k: string) => DERIVATI.find((x) => x.key === k)?.decimali ?? 1;

function Perimetro({ righe }: { righe: string[] }) {
  return (
    <div className="doc-avviso">
      <p>
        <b>Natura e perimetro del documento.</b>{" "}
        Questo documento riporta esclusivamente quanto registrato nella piattaforma alla data di
        emissione. È un&apos;autovalutazione: non costituisce una certificazione e non sostituisce
        l&apos;audit dell&apos;organismo di certificazione. I requisiti sono richiamati in sintesi;
        per il testo normativo vale la PAS 24000:2022 pubblicata da BSI.
      </p>
      <ul>
        {righe.map((r, i) => (
          <li key={i}>{r}</li>
        ))}
      </ul>
    </div>
  );
}

function Righe({ voci }: { voci: [string, ReactNode][] }) {
  return (
    <table>
      <tbody>
        {voci.map(([k, x]) => (
          <tr key={k}>
            <td style={{ width: "36%" }}>{k}</td>
            <td>{x}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function Paragrafi({ testo, manca }: { testo: string | null | undefined; manca: string }) {
  const t = (testo ?? "").trim();
  if (!t) return <p className="doc-manca">{manca}</p>;
  return (
    <>
      {t.split(/\n{2,}/).map((par, i) => (
        <p key={i} style={{ whiteSpace: "pre-line" }}>
          {par}
        </p>
      ))}
    </>
  );
}

const nomeGruppo = (dati: DatiDocumentoPas, key: string) => dati.gruppi.find((g) => g.key === key)?.nome ?? key;

function Organizzazione({ dati }: { dati: DatiDocumentoPas }) {
  const p = dati.profilo;
  const organico = dati.indicatori.find((k) => k.key === "lav_tot")?.valore ?? null;
  return (
    <Righe
      voci={[
        ["Denominazione", <b key="n">{dati.azienda.nome}</b>],
        ["Forma giuridica e partita IVA", [p.forma, p.piva].filter(Boolean).join(" · ") || "—"],
        ["Sede", v(p.sede)],
        ["Attività e codice ATECO", [p.settore, p.ateco].filter(Boolean).join(" · ") || "—"],
        ["Contratto collettivo applicato", v(p.ccnl)],
        ["Siti inclusi", v(p.siti)],
        [`Lavoratori in organico (${dati.esercizio})`, n(organico)],
      ]}
    />
  );
}

function Ruoli({ dati }: { dati: DatiDocumentoPas }) {
  const p = dati.profilo;
  const manca = <span className="doc-manca">da indicare</span>;
  return (
    <Righe
      voci={[
        ["Alta direzione", p.direzione || manca],
        ["Responsabile del sistema (5.3)", p.responsabile || manca],
        ["Rappresentanti dei lavoratori (5.4)", p.rappresentanti || manca],
        ["Contatto", v(p.contatto)],
      ]}
    />
  );
}

function Conformita({ dati, dettaglio }: { dati: DatiDocumentoPas; dettaglio: boolean }) {
  const k = dati.conformita;
  const aperti = dati.gruppi.flatMap((g) => g.requisiti.filter((r) => r.stato === "p" || r.stato === "n"));
  const np = dati.gruppi.flatMap((g) => g.requisiti.filter((r) => r.stato === "na"));
  return (
    <>
      <p>
        Indice di conformità: <b>{pct(k.indice)}</b> su {k.totale}{" "}requisiti —{" "}
        {pl(k.conformi, "conforme", "conformi")}, {pl(k.parziali, "parziale", "parziali")},{" "}
        {pl(k.nonConformi, "non conforme", "non conformi")}, {pl(k.nonPertinenti, "non pertinente", "non pertinenti")},{" "}
        {k.daValutare}{" "}da valutare.
      </p>
      <p className="doc-meta">
        Un requisito conforme vale 100, uno parziale 50, uno non conforme 0. Un requisito non
        ancora valutato pesa zero e resta nel computo; i soli requisiti non pertinenti ne escono.
      </p>
      <figure className="doc-fig">
        <BarreConformita voci={dati.gruppi.map((g) => ({ nome: `${g.key} · ${g.nome}`, indice: g.conformita.indice }))} />
      </figure>
      <table>
        <thead>
          <tr>
            <th>Gruppo</th>
            <th className="doc-num" style={{ width: "8%" }}>Req.</th>
            <th className="doc-num" style={{ width: "8%" }}>Conf.</th>
            <th className="doc-num" style={{ width: "8%" }}>Parz.</th>
            <th className="doc-num" style={{ width: "8%" }}>NC</th>
            <th className="doc-num" style={{ width: "8%" }}>N.P.</th>
            <th className="doc-num" style={{ width: "9%" }}>Da val.</th>
            <th className="doc-num" style={{ width: "10%" }}>Indice</th>
          </tr>
        </thead>
        <tbody>
          {dati.gruppi.map((g) => (
            <tr key={g.key}>
              <td>
                {g.nome} <span className="doc-meta">{g.riferimento}</span>
              </td>
              <td className="doc-num">{g.conformita.totale}</td>
              <td className="doc-num">{g.conformita.conformi}</td>
              <td className="doc-num">{g.conformita.parziali}</td>
              <td className="doc-num">{g.conformita.nonConformi}</td>
              <td className="doc-num">{g.conformita.nonPertinenti}</td>
              <td className="doc-num">{g.conformita.daValutare}</td>
              <td className="doc-num">
                <b>{pct(g.conformita.indice)}</b>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <h3>Piano di adeguamento</h3>
      {aperti.length ? (
        <table>
          <thead>
            <tr>
              <th style={{ width: "9%" }}>Rif.</th>
              <th>Requisito</th>
              <th style={{ width: "12%" }}>Stato</th>
              <th style={{ width: "26%" }}>Azione</th>
              <th style={{ width: "16%" }}>Responsabile e scadenza</th>
            </tr>
          </thead>
          <tbody>
            {aperti.map((r) => (
              <tr key={r.key}>
                <td className="doc-mono">{r.riferimento}</td>
                <td>
                  {r.testo}
                  {r.evidenza ? <div className="doc-meta">{r.evidenza}</div> : null}
                </td>
                <td>{STATO_REQ[r.stato ?? ""]}</td>
                <td>{r.azione ? r.azione : <span className="doc-manca">da definire</span>}</td>
                <td>
                  {v(r.responsabile)}
                  <br />
                  {d(r.scadenza)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p>Nessun requisito risulta parziale o non conforme.</p>
      )}
      {np.length > 0 && (
        <>
          <h3>Requisiti non pertinenti</h3>
          <table>
            <thead>
              <tr>
                <th style={{ width: "9%" }}>Rif.</th>
                <th>Requisito</th>
                <th style={{ width: "36%" }}>Motivazione</th>
              </tr>
            </thead>
            <tbody>
              {np.map((r) => (
                <tr key={r.key}>
                  <td className="doc-mono">{r.riferimento}</td>
                  <td>{r.testo}</td>
                  <td>{r.evidenza ? r.evidenza : <span className="doc-manca">da motivare</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="doc-meta">
            I requisiti dell&apos;Allegato A non sono esclusi dal sistema: sono indicati come non
            pertinenti quelli riferiti a situazioni che nell&apos;organizzazione non ricorrono.
          </p>
        </>
      )}
      {dettaglio &&
        dati.gruppi.map((g) => (
          <div key={g.key}>
            <h3>
              {g.nome} <span className="doc-meta">{g.riferimento}</span>
            </h3>
            <table>
              <thead>
                <tr>
                  <th style={{ width: "9%" }}>Rif.</th>
                  <th>Requisito</th>
                  <th style={{ width: "14%" }}>Stato</th>
                  <th style={{ width: "30%" }}>Evidenza</th>
                </tr>
              </thead>
              <tbody>
                {g.requisiti.map((r) => (
                  <tr key={r.key}>
                    <td className="doc-mono">{r.riferimento}</td>
                    <td>{r.testo}</td>
                    <td>{r.stato ? STATO_REQ[r.stato] : <span className="doc-manca">da valutare</span>}</td>
                    <td>{v(r.evidenza)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
    </>
  );
}

function Rischi({ dati }: { dati: DatiDocumentoPas }) {
  const r = dati.statoRischi;
  const nomi = (asse: string) => dati.scale.filter((s) => s.asse === asse).sort((a, b) => a.valore - b.valore).map((s) => s.nome);
  const rilevanti = dati.rischi.filter((x) => x.classe === "alto" || x.classe === "medio").sort((a, b) => (b.livello ?? 0) - (a.livello ?? 0));
  return (
    <>
      <p>
        L&apos;inventario comprende {pl(r.totale, "rischio", "rischi")}, di cui {r.valutati}{" "}valutati per probabilità e gravità
        su scala da 1 a 5: {r.alti}{" "}di livello alto, {r.medi}{" "}medio, {r.bassi}{" "}basso. Soglie: alto da{" "}
        {dati.parametri.alto}, medio da {dati.parametri.medio}. La valutazione adotta la prospettiva delle persone
        esposte e distingue le attività proprie dalla catena di fornitura.
      </p>
      <figure className="doc-fig">
        <MatriceRischi
          punti={dati.rischi.filter((x) => x.livello !== null).map((x) => ({ p: Number(x.probabilita), g: Number(x.gravita) }))}
          alto={dati.parametri.alto}
          medio={dati.parametri.medio}
          probabilita={nomi("probabilita")}
          gravita={nomi("gravita")}
          oggetto="rischi"
          perChi="per le persone"
        />
      </figure>
      {rilevanti.length ? (
        <table>
          <thead>
            <tr>
              <th>Rischio</th>
              <th style={{ width: "16%" }}>Ambito</th>
              <th className="doc-num" style={{ width: "9%" }}>Livello</th>
              <th style={{ width: "34%" }}>Misure</th>
            </tr>
          </thead>
          <tbody>
            {rilevanti.map((x, i) => (
              <tr key={i}>
                <td>
                  {x.testo} <span className="doc-meta">{nomeGruppo(dati, x.area)}</span>
                </td>
                <td>{x.ambito === "F" ? "Catena di fornitura" : "Organizzazione"}</td>
                <td className="doc-num">{x.livello}</td>
                <td>{x.misure ? x.misure : <span className="doc-manca">da definire</span>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p className="doc-manca">Nessun rischio di livello medio o alto risulta valutato.</p>
      )}
      {r.altiScoperti.length > 0 && (
        <p>
          <b>Rischi alti senza misure di prevenzione:</b> {r.altiScoperti.join("; ")}.
        </p>
      )}
    </>
  );
}

function Fornitori({ dati }: { dati: DatiDocumentoPas }) {
  const f = dati.statoFornitori;
  if (!f.fornitori) return <p className="doc-manca">Nessun fornitore censito.</p>;
  return (
    <>
      <p>
        Sono censiti {pl(f.fornitori, "fornitore rilevante", "fornitori rilevanti")}, {f.alti}{" "}a rischio alto. Hanno
        sottoscritto i requisiti sociali il {pct(f.quotaClausola)}, ha risposto al questionario il{" "}
        {pct(f.quotaQuestionario)}, è stato verificato almeno una volta il {pct(f.quotaVerificati)}.
      </p>
      <table>
        <thead>
          <tr>
            <th>Fornitore</th>
            <th style={{ width: "18%" }}>Categoria</th>
            <th style={{ width: "11%" }}>Paese</th>
            <th style={{ width: "9%" }}>Rischio</th>
            <th style={{ width: "9%" }}>Clausola</th>
            <th style={{ width: "11%" }}>Verifica</th>
            <th style={{ width: "13%" }}>Esito</th>
          </tr>
        </thead>
        <tbody>
          {dati.fornitori.map((x, i) => (
            <tr key={i}>
              <td>{v(x.nome)}</td>
              <td>{v(x.categoria)}</td>
              <td>{v(x.paese)}</td>
              <td>{v(x.rischio)}</td>
              <td>{x.clausola ? "Sì" : "No"}</td>
              <td>{d(x.verificatoIl)}</td>
              <td>{v(x.esito)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}

function Obiettivi({ dati }: { dati: DatiDocumentoPas }) {
  if (!dati.obiettivi.length) return <p className="doc-manca">Gli obiettivi non sono stati definiti.</p>;
  return (
    <table>
      <thead>
        <tr>
          <th>Obiettivo</th>
          <th style={{ width: "26%" }}>Indicatore e traguardo</th>
          <th style={{ width: "11%" }}>Scadenza</th>
          <th style={{ width: "15%" }}>Responsabile</th>
          <th style={{ width: "11%" }}>Stato</th>
        </tr>
      </thead>
      <tbody>
        {dati.obiettivi.map((o, i) => (
          <tr key={i}>
            <td>
              {o.obiettivo} <span className="doc-meta">{nomeGruppo(dati, o.area)}</span>
              {o.risorse ? <div className="doc-meta">{o.risorse}</div> : null}
            </td>
            <td>{[o.indicatore, o.traguardo].filter(Boolean).join(" · ") || "—"}</td>
            <td>{d(o.scadenza)}</td>
            <td>{v(o.responsabile)}</td>
            <td>{o.stato}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function Piano({ dati }: { dati: DatiDocumentoPas }) {
  if (!dati.attivita.length) return <p className="doc-manca">Il piano di lavoro annuale non è stato compilato.</p>;
  return (
    <>
      <figure className="doc-fig">
        <PianoMesi attivita={dati.attivita.map((a) => ({ mese: a.mese, fatta: a.stato === "Fatto" }))} />
      </figure>
      <table>
        <thead>
          <tr>
            <th style={{ width: "12%" }}>Mese</th>
            <th>Attività</th>
            <th style={{ width: "20%" }}>Responsabile</th>
            <th style={{ width: "11%" }}>Stato</th>
          </tr>
        </thead>
        <tbody>
          {[...dati.attivita]
            .sort((a, b) => a.mese - b.mese)
            .map((a, i) => (
              <tr key={i}>
                <td>{MESI[a.mese - 1] ?? "—"}</td>
                <td>
                  {a.attivita} {a.riferimento ? <span className="doc-meta">{a.riferimento}</span> : null}
                </td>
                <td>{v(a.responsabile)}</td>
                <td>{a.stato}</td>
              </tr>
            ))}
        </tbody>
      </table>
    </>
  );
}

/** I derivati da mostrare, nell'ordine in cui il manuale li cita. */
const DERIVATI_MANUALE = ["pctDonne", "pctInd", "turnover", "margCcnl", "gapLw", "payGap", "pctCop", "pctStr", "oreSett", "if_", "ig", "oreForm", "pctSgs", "pctNuovi"] as const;

function Indicatori({ dati }: { dati: DatiDocumentoPas }) {
  const c = dati.derivati.corrente;
  const p = dati.derivati.precedente;
  const media = (m: typeof c) => m.oreSett;
  const massima = (anno: "valore" | "precedente") => dati.indicatori.find((k) => k.key === "ore_max")?.[anno] ?? null;
  return (
    <>
      {dati.sezioni.map((s) => (
        <div key={s.key}>
          <h3>
            {s.nome} <span className="doc-meta">{s.riferimento}</span>
          </h3>
          <table>
            <thead>
              <tr>
                <th>Indicatore</th>
                <th style={{ width: "10%" }}>Unità</th>
                <th style={{ width: "13%" }} className="doc-num">
                  {dati.esercizio}
                </th>
                <th style={{ width: "13%" }} className="doc-num">
                  {dati.esercizio - 1}
                </th>
              </tr>
            </thead>
            <tbody>
              {dati.indicatori
                .filter((k) => k.sezione === s.key)
                .map((k) => (
                  <tr key={k.key}>
                    <td>{k.nome}</td>
                    <td>{k.unita}</td>
                    <td className="doc-num">{n(k.valore, decimali(k.valore))}</td>
                    <td className="doc-num">{n(k.precedente, decimali(k.precedente))}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      ))}
      <h3>Indicatori calcolati</h3>
      <table>
        <thead>
          <tr>
            <th>Indicatore</th>
            <th style={{ width: "16%" }} className="doc-num">
              {dati.esercizio}
            </th>
            <th style={{ width: "16%" }} className="doc-num">
              {dati.esercizio - 1}
            </th>
          </tr>
        </thead>
        <tbody>
          {DERIVATI_MANUALE.map((k) => (
            <tr key={k}>
              <td>
                {NOMI_DERIVATI[k].nome} <span className="doc-meta">{NOMI_DERIVATI[k].unita}</span>
              </td>
              <td className="doc-num">{n(c[k], decimaliDerivato(k))}</td>
              <td className="doc-num">{n(p[k], decimaliDerivato(k))}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="doc-meta">
        Un indicatore calcolato compare solo se ci sono tutti i dati da cui si ricava: un dato mancante non
        vale zero.
      </p>
      {c.incoerenze.length > 0 && (
        <p className="doc-meta">
          Non calcolati per l&apos;esercizio {dati.esercizio}, perché la parte dichiarata supera il totale:{" "}
          {c.incoerenze.map((k) => NOMI_DERIVATI[k].nome).join(", ")}.
        </p>
      )}
      <figure className="doc-fig">
        <BarreOrario
          limite={dati.parametri.oreTotali}
          anni={[
            { anno: dati.esercizio - 1, media: media(p), massima: massima("precedente") },
            { anno: dati.esercizio, media: media(c), massima: massima("valore") },
          ]}
        />
      </figure>
    </>
  );
}

function Segnali({ dati }: { dati: DatiDocumentoPas }) {
  if (!dati.segnali.length) return <p>Dai dati non emergono criticità né punti d&apos;attenzione.</p>;
  return (
    <ul>
      {dati.segnali.map((s, i) => (
        <li key={i}>
          <b>{s.livello === "C" ? "Criticità" : "Attenzione"}</b> — {s.testo} <span className="doc-meta">{s.riferimento}</span>
        </li>
      ))}
    </ul>
  );
}

function Firme({ ruoli }: { ruoli: string[] }) {
  return (
    <table style={{ marginTop: "28px" }}>
      <tbody>
        <tr>
          {ruoli.map((r) => (
            <td key={r} style={{ width: `${100 / ruoli.length}%`, paddingTop: "34px", verticalAlign: "bottom" }}>
              <div style={{ borderTop: "1px solid currentColor", paddingTop: "4px" }}>{r}</div>
            </td>
          ))}
        </tr>
      </tbody>
    </table>
  );
}

function Manuale({ dati }: { dati: DatiDocumentoPas }) {
  const g = dati.registri.corrente;
  const c = dati.derivati.corrente;
  const allegato = dati.gruppi.filter((x) => x.natura === "allegato");
  return (
    <>
      <Perimetro
        righe={[
          "Il manuale descrive il sistema come risulta dai dati registrati: dove un elemento manca, è dichiarato come mancante.",
          "Dai registri sono riportati soltanto conteggi: oggetto dei reclami e descrizioni delle non conformità restano presso l'organizzazione.",
        ]}
      />
      <h2>1. Presentazione e campo di applicazione</h2>
      <Organizzazione dati={dati} />
      <h3>Campo di applicazione (4.3)</h3>
      <Paragrafi testo={dati.profilo.campo} manca="Il campo di applicazione non è stato definito." />
      <p>
        Il sistema è impostato secondo la PAS 24000:2022, clausole da 4 a 10 e Allegato A. I requisiti
        dell&apos;Allegato A sono applicati senza esclusioni; dove una situazione non ricorre, la non pertinenza è
        motivata nel rapporto di conformità.
      </p>

      <h2>2. Contesto e parti interessate</h2>
      <h3>Fattori interni ed esterni (4.1)</h3>
      {dati.fattori.length ? (
        <table>
          <thead>
            <tr>
              <th style={{ width: "13%" }}>Tipo</th>
              <th>Fattore</th>
              <th style={{ width: "16%" }}>Effetto</th>
            </tr>
          </thead>
          <tbody>
            {dati.fattori.map((f, i) => (
              <tr key={i}>
                <td>{f.tipo}</td>
                <td>{f.descrizione}</td>
                <td>{f.effetto}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p className="doc-manca">L&apos;analisi del contesto non è stata compilata.</p>
      )}
      <h3>Parti interessate (4.2)</h3>
      {dati.parti.length ? (
        <table>
          <thead>
            <tr>
              <th style={{ width: "22%" }}>Parte</th>
              <th>Esigenze e aspettative</th>
              <th style={{ width: "9%" }}>Obbligo</th>
              <th style={{ width: "26%" }}>Coinvolgimento</th>
            </tr>
          </thead>
          <tbody>
            {dati.parti.map((x, i) => (
              <tr key={i}>
                <td>
                  <b>{x.nome}</b>
                  {x.gestita ? null : <div className="doc-meta">non gestita dal sistema</div>}
                </td>
                <td>{v(x.esigenze)}</td>
                <td>{x.obbligo ? "Sì" : "No"}</td>
                <td>{v(x.coinvolgimento)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p className="doc-manca">Le parti interessate non sono state individuate.</p>
      )}

      <h2>3. Leadership, ruoli e partecipazione</h2>
      <Ruoli dati={dati} />
      <p>
        L&apos;alta direzione risponde dell&apos;efficacia del sistema, assegna le risorse, tutela da ritorsioni chi
        segnala incidenti, pericoli e non conformità e assicura che i ruoli siano attribuiti senza discriminazioni. Il
        responsabile del sistema ne cura l&apos;attuazione e riferisce alla direzione sulle prestazioni.
      </p>
      <p>
        I lavoratori e i loro rappresentanti sono consultati su politica, obiettivi, valutazione dei rischi, audit e
        azioni correttive. Nell&apos;esercizio {dati.esercizio}{" "}
        {g.consultazioni === 1 ? "risulta 1 momento di consultazione registrato" : `risultano ${g.consultazioni} momenti di consultazione registrati`}.
      </p>

      <h2>4. Politica sociale</h2>
      <Paragrafi testo={dati.politica.testo} manca="Il testo della politica non è stato redatto." />
      {dati.politica.approvataIl ? (
        <p className="doc-meta">
          Approvata il {d(dati.politica.approvataIl)}
          {dati.politica.firma ? ` da ${dati.politica.firma}` : ""}.
        </p>
      ) : (
        <p className="doc-manca">La politica non risulta approvata.</p>
      )}

      <h2>5. Rischi e opportunità</h2>
      <Rischi dati={dati} />

      <h2>6. Obiettivi e piano di lavoro annuale</h2>
      <Obiettivi dati={dati} />
      <h3>Piano di lavoro (8.1.2)</h3>
      <Piano dati={dati} />

      <h2>7. Supporto</h2>
      <p>
        <b>Competenza e consapevolezza.</b>{" "}
        Nell&apos;esercizio sono stati registrati {pl(g.formazioni, "intervento formativo", "interventi formativi")} per{" "}
        {n(g.orePersona, decimali(g.orePersona))}{" "}ore-persona. I lavoratori formati su politica sociale, diritti e canale di
        reclamo sono il {pct(c.pctSgs)}{" "}dell&apos;organico; i neoassunti formati all&apos;ingresso il {pct(c.pctNuovi)}.
      </p>
      <p>
        <b>Comunicazione.</b>{" "}
        Registrate nell&apos;esercizio: {pl(g.comunicazioniInterne, "comunicazione interna", "comunicazioni interne")},{" "}
        {pl(g.comunicazioniEsterne, "esterna", "esterne")}.
      </p>
      <p>
        <b>Informazioni documentate.</b>{" "}
        Il sistema è descritto da questo manuale, dalla politica sociale, dal rapporto di conformità e dai registri:
        reclami, non conformità e azioni correttive, formazione, emergenze, comunicazioni, consultazione, audit
        interni, riesame.
      </p>

      <h2>8. Controllo operativo e prestazione sociale</h2>
      <p>Per ciascuna area dell&apos;Allegato A sono riportati lo stato di conformità rilevato e i presidi che lo dimostrano.</p>
      {allegato.map((a) => {
        const k = a.conformita;
        const presidi = a.requisiti.filter((r) => r.evidenza);
        return (
          <div key={a.key}>
            <h3>
              {a.nome} <span className="doc-meta">{a.riferimento}</span>
            </h3>
            {k.valutati ? (
              <p>
                Requisiti: {k.totale} · conformi {k.conformi}, parziali {k.parziali}, non conformi {k.nonConformi}, non
                pertinenti {k.nonPertinenti}
                {k.daValutare ? `, da valutare ${k.daValutare}` : ""}. Indice di conformità <b>{pct(k.indice)}</b>.
              </p>
            ) : (
              <p className="doc-manca">Area non ancora valutata.</p>
            )}
            {presidi.length > 0 && (
              <table>
                <thead>
                  <tr>
                    <th style={{ width: "10%" }}>Rif.</th>
                    <th>Presidio ed evidenza</th>
                    <th style={{ width: "15%" }}>Stato</th>
                  </tr>
                </thead>
                <tbody>
                  {presidi.map((r) => (
                    <tr key={r.key}>
                      <td className="doc-mono">{r.riferimento}</td>
                      <td>{r.evidenza}</td>
                      <td>{r.stato ? STATO_REQ[r.stato] : "da valutare"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        );
      })}
      <h3>Approvvigionamento sociale (8.1.3)</h3>
      <Fornitori dati={dati} />
      <h3>Emergenze (8.2)</h3>
      <p>
        Nell&apos;esercizio sono state registrate {pl(g.emergenze, "attività", "attività")}{" "}tra prove, verifiche ed emergenze reali,
        di cui {pl(g.prove, "prova o esercitazione", "prove o esercitazioni")}.
        {g.prove ? null : <span className="doc-manca"> La prova annuale non risulta svolta.</span>}
      </p>

      <h2>9. Valutazione delle prestazioni</h2>
      <Indicatori dati={dati} />
      <h3>Audit interni e riesame (9.2 · 9.3)</h3>
      <p>
        Audit interni svolti nell&apos;esercizio: {g.audit}, con {pl(g.rilievi, "rilievo", "rilievi")}{" "}complessivi. Riesami della
        direzione: {g.riesami}.
      </p>
      <Conformita dati={dati} dettaglio={false} />

      <h2>10. Miglioramento</h2>
      <p>
        Reclami e segnalazioni ricevuti nell&apos;esercizio: {g.reclami}, di cui {g.reclamiChiusi}{" "}chiusi
        {g.giorniMediChiusura !== null ? ` con un tempo medio di ${pl(g.giorniMediChiusura, "giorno", "giorni")}` : ""}. Non
        conformità rilevate: {g.nonConformita}, di cui {g.nonConformitaChiuse}{" "}chiuse e {g.efficaci}{" "}con efficacia verificata;
        alla data del documento {pl(g.nonConformitaAperte, "risulta aperta", "risultano aperte")}.
      </p>
      <h3>Punti di attenzione alla data del documento</h3>
      <Segnali dati={dati} />

      <h2>Correlazione con la PAS 24000:2022</h2>
      <table>
        <thead>
          <tr>
            <th style={{ width: "40%" }}>Requisito</th>
            <th>Sezione del manuale e registrazioni</th>
          </tr>
        </thead>
        <tbody>
          {[
            ["4 · Contesto dell'organizzazione", "Sezioni 1 e 2"],
            ["5 · Leadership e partecipazione", "Sezioni 3 e 4 · registro della consultazione"],
            ["6 · Pianificazione", "Sezioni 5 e 6"],
            ["7 · Supporto", "Sezione 7 · registri della formazione e delle comunicazioni"],
            ["8 · Attività operative", "Sezioni 6 e 8 · registro delle emergenze · elenco dei fornitori"],
            ["9 · Valutazione delle prestazioni", "Sezione 9 · registro degli audit · verbale di riesame"],
            ["10 · Miglioramento", "Sezione 10 · registri dei reclami e delle non conformità"],
            ["Allegato A · da A.1 a A.11", "Sezione 8 · rapporto di conformità"],
          ].map(([a, b]) => (
            <tr key={a}>
              <td>{a}</td>
              <td>{b}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <Firme ruoli={["L'alta direzione", "Il responsabile del sistema"]} />
    </>
  );
}

function Riesame({ dati }: { dati: DatiDocumentoPas }) {
  const r = dati.riesame.corrente;
  const prec = dati.riesame.precedente;
  const g = dati.registri.corrente;
  const c = dati.derivati.corrente;
  const p = dati.derivati.precedente;
  const k = dati.conformita;
  const rs = dati.statoRischi;
  const f = dati.statoFornitori;
  const conta = (s: string) => dati.obiettivi.filter((o) => o.stato === s).length;
  const oreMax = dati.indicatori.find((x) => x.key === "ore_max");
  const da = (testo: string | null | undefined) => <Paragrafi testo={testo} manca="Da registrare." />;
  return (
    <>
      <Perimetro
        righe={[
          `Il verbale riguarda l'esercizio ${dati.esercizio}. Gli elementi in ingresso sono calcolati dai dati registrati alla data di emissione.`,
          "Dai registri sono riportati soltanto conteggi; le decisioni sono quelle registrate dall'alta direzione.",
        ]}
      />
      <h2>Riesame della direzione · esercizio {dati.esercizio}</h2>
      {r ? (
        <Righe
          voci={[
            ["Data", d(r.data)],
            ["Partecipanti", v(r.partecipanti)],
          ]}
        />
      ) : (
        <p className="doc-manca">Nessun riesame registrato per l&apos;esercizio {dati.esercizio}.</p>
      )}

      <h2>Elementi in ingresso (9.3.2)</h2>
      <h3>a) Stato delle azioni dei riesami precedenti</h3>
      {prec?.azioni ? (
        <>
          <p>Azioni decise nel riesame del {d(prec.data)}:</p>
          <Paragrafi testo={prec.azioni} manca="" />
        </>
      ) : (
        <p>Non risultano riesami precedenti con azioni registrate.</p>
      )}
      <h3>b) Cambiamenti nel contesto, nelle parti interessate e nei rischi</h3>
      <p>
        Fattori di contesto censiti: {dati.fattori.length}. Parti interessate: {dati.parti.length}. Rischi in inventario:{" "}
        {rs.totale}, di cui {rs.alti}{" "}alti e {rs.medi}{" "}medi
        {rs.altiScoperti.length ? `; ${pl(rs.altiScoperti.length, "rischio alto è privo", "rischi alti sono privi")} di misure` : ""}.
      </p>
      <h3>c) Politica e obiettivi</h3>
      <p>
        Politica sociale {dati.politica.approvataIl ? `approvata il ${d(dati.politica.approvataIl)}` : "non ancora approvata"}.
        Obiettivi: {dati.obiettivi.length}, di cui {conta("Raggiunto")}{" "}raggiunti, {conta("In corso")}{" "}in corso,{" "}
        {conta("In ritardo")}{" "}in ritardo.
      </p>
      {dati.obiettivi.length > 0 && <Obiettivi dati={dati} />}
      <h3>d) Prestazione sociale</h3>
      <table>
        <thead>
          <tr>
            <th>Elemento</th>
            <th style={{ width: "16%" }} className="doc-num">
              {dati.esercizio}
            </th>
            <th style={{ width: "16%" }} className="doc-num">
              {dati.esercizio - 1}
            </th>
          </tr>
        </thead>
        <tbody>
          {(["if_", "ig", "pctStr", "turnover", "payGap", "pctSgs"] as const).map((x) => (
            <tr key={x}>
              <td>
                {NOMI_DERIVATI[x].nome} <span className="doc-meta">{NOMI_DERIVATI[x].unita}</span>
              </td>
              <td className="doc-num">{n(c[x], decimaliDerivato(x))}</td>
              <td className="doc-num">{n(p[x], decimaliDerivato(x))}</td>
            </tr>
          ))}
          <tr>
            <td>
              Settimana più lunga <span className="doc-meta">ore</span>
            </td>
            <td className="doc-num">{n(oreMax?.valore, decimali(oreMax?.valore))}</td>
            <td className="doc-num">{n(oreMax?.precedente, decimali(oreMax?.precedente))}</td>
          </tr>
        </tbody>
      </table>
      <p>
        <b>Non conformità e azioni correttive.</b>{" "}
        Non conformità dell&apos;esercizio: {g.nonConformita}, chiuse {g.nonConformitaChiuse}, con efficacia verificata{" "}
        {g.efficaci}. Ancora aperte {g.nonConformitaAperte}, di cui {g.azioniScadute}{" "}con l&apos;azione scaduta.
      </p>
      <p>
        <b>Conformità ai requisiti.</b>{" "}
        Indice complessivo {pct(k.indice)}{" "}su {k.totale}{" "}requisiti: {k.nonConformi}{" "}non conformi, {k.parziali}{" "}parziali,{" "}
        {k.daValutare}{" "}da valutare.
      </p>
      <p>
        <b>Audit.</b>{" "}Audit interni svolti: {g.audit}, rilievi {g.rilievi}.
      </p>
      <p>
        <b>Consultazione e partecipazione dei lavoratori.</b>{" "}
        Momenti di consultazione: {g.consultazioni}. Reclami e segnalazioni: {g.reclami}, chiusi {g.reclamiChiusi}
        {g.giorniMediChiusura !== null ? `, tempo medio ${pl(g.giorniMediChiusura, "giorno", "giorni")}` : ""}.
      </p>
      <p>
        <b>Fornitori.</b>{" "}
        {f.fornitori}{" "}censiti, {f.alti}{" "}a rischio alto, {pct(f.quotaClausola)}{" "}con clausola sociale, {pct(f.quotaVerificati)}{" "}verificati.
      </p>
      <Segnali dati={dati} />
      <h3>e) Adeguatezza delle risorse</h3>
      {da(r?.risorse)}
      <h3>f) Comunicazioni con le parti interessate</h3>
      <p>
        Comunicazioni interne: {g.comunicazioniInterne}. Comunicazioni esterne: {g.comunicazioniEsterne}.
      </p>

      <h2>Decisioni (9.3.3)</h2>
      <h3>Idoneità, adeguatezza ed efficacia del sistema</h3>
      {da(r?.idoneita)}
      <h3>Opportunità di miglioramento</h3>
      {da(r?.miglioramento)}
      <h3>Modifiche al sistema e risorse necessarie</h3>
      {da(r?.modifiche)}
      <h3>Azioni decise</h3>
      {da(r?.azioni)}
      <p>
        <b>Comunicazione ai lavoratori.</b>{" "}
        {r?.comunicatoIl ? (
          `Gli esiti sono stati comunicati ai lavoratori e ai loro rappresentanti il ${d(r.comunicatoIl)}.`
        ) : (
          <span className="doc-manca">Esiti non ancora comunicati ai lavoratori.</span>
        )}
      </p>
      <Firme
        ruoli={[
          `L'alta direzione${dati.profilo.direzione ? ` · ${dati.profilo.direzione}` : ""}`,
          `Il responsabile del sistema${dati.profilo.responsabile ? ` · ${dati.profilo.responsabile}` : ""}`,
        ]}
      />
    </>
  );
}

export function DocumentoPas({ dati, immagini, tipo }: { dati: DatiDocumentoPas; immagini: ImmaginiCopertina; tipo: TipoDocumentoPas }) {
  // Il giorno ITALIANO dell'emissione: su Vercel il processo è in UTC, e fra mezzanotte e le
  // due la copertina avrebbe detto il giorno prima.
  const emesso = fmtDataEstesa(giornoItaliano(new Date(dati.generatoIl)));
  const sotto = [dati.profilo.settore, dati.profilo.sede].filter(Boolean).join(" · ");

  return (
    <>
      <Copertina kicker={TITOLO[tipo]} titolo={dati.azienda.nome} sotto={sotto} immagini={immagini}>
        <NotaCopertina>{NORMA[tipo]}</NotaCopertina>
        <NotaCopertina>
          {tipo === "politica_pas" ? "" : `Esercizio ${dati.esercizio} · `}Emesso il {emesso}
        </NotaCopertina>
      </Copertina>

      <div className="doc-corpo">
        {tipo === "manuale_pas" && <Manuale dati={dati} />}

        {tipo === "politica_pas" && (
          <>
            <h2>Politica sociale</h2>
            <Paragrafi testo={dati.politica.testo} manca="Il testo della politica non è stato redatto." />
            <p className="doc-meta">
              {dati.politica.approvataIl ? `Approvata il ${d(dati.politica.approvataIl)}` : "Non ancora approvata"}
              {dati.politica.firma ? ` · ${dati.politica.firma}` : ""}
            </p>
            <Firme ruoli={[dati.politica.firma || "L'alta direzione"]} />
            <p className="doc-meta">
              Documento del sistema di gestione sociale, punto 5.2 della PAS 24000:2022. Disponibile ai lavoratori e alle
              parti interessate.
            </p>
          </>
        )}

        {tipo === "conformita_pas" && (
          <>
            <Perimetro
              righe={[
                "L'indice è calcolato su tutti i requisiti del catalogo: un requisito non valutato pesa zero e non viene escluso dal computo.",
                "Le evidenze riportate sono quelle dichiarate; i documenti a supporto restano presso l'organizzazione.",
              ]}
            />
            <h2>1. Sintesi</h2>
            <Conformita dati={dati} dettaglio />
            <h2>2. Segnali alla data di emissione</h2>
            <Segnali dati={dati} />
          </>
        )}

        {tipo === "riesame_pas" && <Riesame dati={dati} />}

        <FirmaDocumento dati={dati} />
      </div>
    </>
  );
}
