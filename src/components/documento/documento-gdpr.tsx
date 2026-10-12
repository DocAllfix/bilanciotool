import type { ReactNode } from "react";
import { fmtDataBreve, fmtDataEstesa, fmtNum } from "@/lib/format";
import type { DatiDocumentoGdpr } from "@/features/gdpr/documento";
import { BarreConformita, MatriceRischi, PianoMesi } from "./charts-gdpr";
import { Copertina, NotaCopertina, type ImmaginiCopertina } from "./copertina";
import { FirmaDocumento } from "./firma";

// I SEI DOCUMENTI DELLA PROTEZIONE DEI DATI — Reg. (UE) 2016/679 e D.Lgs. 196/2003.
//
// ⚠️ UN TEMPLATE SOLO, guidato dal tipo: i sei leggono parti diverse della STESSA
// fotografia, congelata alla pubblicazione (`features/gdpr/documento.ts`). Sei file
// sarebbero sei copertine, sei riquadri di perimetro e sei modi di stampare una data.
//
// ⚠️ DEI REGISTRI DELLE RICHIESTE E DELLE VIOLAZIONI QUI ARRIVANO SOLO CONTEGGI. Lo
// snapshot non contiene descrizioni né note libere, ed è voluto: il collegamento del
// portale cliente serve tutti i documenti pubblicati dell'azienda.

export type TipoDocumentoGdpr =
  | "registro_trattamenti"
  | "modello_privacy"
  | "politica_privacy"
  | "dpia"
  | "conformita_gdpr"
  | "relazione_privacy";

const TITOLO: Record<TipoDocumentoGdpr, string> = {
  registro_trattamenti: "Registro delle attività di trattamento",
  modello_privacy: "Modello organizzativo per la protezione dei dati",
  politica_privacy: "Politica per la protezione dei dati personali",
  dpia: "Valutazioni d'impatto sulla protezione dei dati",
  conformita_gdpr: "Rapporto di conformità al Regolamento (UE) 2016/679",
  relazione_privacy: "Relazione annuale sulla protezione dei dati",
};

const NORMA: Record<TipoDocumentoGdpr, string> = {
  registro_trattamenti: "Art. 30 del Regolamento (UE) 2016/679",
  modello_privacy: "Artt. 5, 24 e 32 del Regolamento (UE) 2016/679 · D.Lgs. 196/2003",
  politica_privacy: "Art. 24, par. 2, del Regolamento (UE) 2016/679",
  dpia: "Art. 35 del Regolamento (UE) 2016/679",
  conformita_gdpr: "Regolamento (UE) 2016/679 · D.Lgs. 196/2003",
  relazione_privacy: "Art. 24 del Regolamento (UE) 2016/679 · principio di responsabilizzazione",
};

const STATO_REQ: Record<string, string> = { c: "Conforme", p: "Parziale", n: "Non conforme", na: "Non pertinente" };

const NOME_DERIVATO: Record<string, string> = {
  pctForm: "Autorizzati formati",
  oreForm: "Ore di formazione per autorizzato",
  pctNuovi: "Nuovi autorizzati formati",
  pctMfa: "Accessi protetti da autenticazione a più fattori",
  pctCif: "Dispositivi cifrati",
  pctCons: "Consensi documentati",
  pctOpp: "Opposizioni sui contatti",
};

type T = DatiDocumentoGdpr["trattamenti"][number];

const v = (x: string | null | undefined) => (x && x.trim() ? x : "—");
const d = (x: string | null | undefined) => (x ? fmtDataBreve(x) : "—");
const n = (x: number | null | undefined, dec = 0) => (x === null || x === undefined ? "—" : fmtNum(x, dec));
const pct = (x: number | null) => (x === null ? "—" : `${x}%`);

function Perimetro({ righe }: { righe: string[] }) {
  return (
    <div className="doc-avviso">
      <p>
        <b>Natura e perimetro del documento.</b>{" "}
        Questo documento riporta esclusivamente quanto registrato nella piattaforma alla data di
        emissione. Non costituisce una certificazione né un parere legale, e non sostituisce la
        valutazione del titolare, del responsabile della protezione dei dati o dell&apos;Autorità
        di controllo.
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

function Titolare({ dati }: { dati: DatiDocumentoGdpr }) {
  const p = dati.profilo;
  return (
    <Righe
      voci={[
        ["Titolare del trattamento", <b key="n">{dati.azienda.nome}</b>],
        ["Forma giuridica e partita IVA", [p.forma, p.piva].filter(Boolean).join(" · ") || "—"],
        ["Sede", v(p.sede)],
        ["Settore e codice ATECO", [p.settore, p.ateco].filter(Boolean).join(" · ") || "—"],
        ["Legale rappresentante", v(p.legale)],
        ["Referente interno per la privacy", [p.referente, p.contatto].filter(Boolean).join(" · ") || "—"],
        [
          "Responsabile della protezione dei dati",
          p.dpoNome ? `${p.dpoNome}${p.dpoContatti ? ` · ${p.dpoContatti}` : ""}` : dati.dpo.obbligatorio ? "Designazione obbligatoria, non effettuata" : "Non designato",
        ],
      ]}
    />
  );
}

function SchedaTrattamento({ t, i }: { t: T; i: number }) {
  return (
    <>
      <h3>
        {i + 1}. {t.nome}
      </h3>
      <Righe
        voci={[
          ["Ruolo", v(t.ruolo)],
          ["Funzione o ufficio", v(t.funzione)],
          ["Finalità", v(t.finalita)],
          ["Base giuridica", v(t.base)],
          ...(t.bilanciamento ? ([["Bilanciamento degli interessi", t.bilanciamento]] as [string, ReactNode][]) : []),
          ["Categorie di interessati", v(t.interessati)],
          ["Categorie di dati", v(t.dati)],
          ["Dati particolari (art. 9)", t.particolari ? `Sì — ${v(t.condizione9)}` : "No"],
          ["Dati giudiziari (art. 10)", t.giudiziari ? "Sì" : "No"],
          ["Destinatari", v(t.destinatari)],
          ["Trasferimenti verso paesi terzi", t.trasferimento ? `Sì — ${v(t.trasferimentoDettaglio)}` : "No"],
          ["Termini di conservazione", v(t.conservazione)],
          ["Sistemi e strumenti", v(t.sistemi)],
          ["Misure di sicurezza (art. 32)", v(t.misure)],
        ]}
      />
    </>
  );
}

function Conformita({ dati, dettaglio }: { dati: DatiDocumentoGdpr; dettaglio: boolean }) {
  const k = dati.conformita;
  const aperti = dati.gruppi.flatMap((g) => g.requisiti.filter((r) => r.stato === "p" || r.stato === "n").map((r) => ({ ...r, gruppo: g.nome })));
  const np = dati.gruppi.flatMap((g) => g.requisiti.filter((r) => r.stato === "na"));
  return (
    <>
      <p>
        Indice di conformità: <b>{pct(k.indice)}</b> su {k.totale} requisiti — {k.conformi} conformi, {k.parziali} parziali,{" "}
        {k.nonConformi} non conformi, {k.nonPertinenti} non pertinenti, {k.daValutare}{" "}da valutare.
      </p>
      <p className="doc-meta">
        Un requisito conforme vale 100, uno parziale 50, uno non conforme 0. Un requisito non
        ancora valutato pesa zero e resta nel computo; i soli requisiti non pertinenti ne escono.
      </p>
      <figure className="doc-fig">
        <BarreConformita voci={dati.gruppi.map((g) => ({ nome: `${g.key} · ${g.nome}`, indice: g.conformita.indice }))} />
      </figure>
      <h3>Piano di adeguamento</h3>
      {aperti.length ? (
        <table>
          <thead>
            <tr>
              <th style={{ width: "10%" }}>Rif.</th>
              <th>Requisito</th>
              <th style={{ width: "13%" }}>Stato</th>
              <th style={{ width: "26%" }}>Azione</th>
              <th style={{ width: "15%" }}>Responsabile e scadenza</th>
            </tr>
          </thead>
          <tbody>
            {aperti.map((r) => (
              <tr key={r.key}>
                <td className="doc-mono">{r.key}</td>
                <td>{r.testo}</td>
                <td>{STATO_REQ[r.stato ?? ""]}</td>
                <td>{r.azione ? r.azione : <span className="doc-manca">non indicata</span>}</td>
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
        <p>Nessun requisito parziale o non conforme.</p>
      )}
      {np.length > 0 && (
        <>
          <h3>Requisiti dichiarati non pertinenti</h3>
          <ul>
            {np.map((r) => (
              <li key={r.key}>
                <span className="doc-mono">{r.key}</span> {r.testo}
                {r.evidenza ? ` — ${r.evidenza}` : ""}
              </li>
            ))}
          </ul>
        </>
      )}
      {dettaglio &&
        dati.gruppi.map((g) => (
          <div key={g.key}>
            <h3>
              {g.key} · {g.nome} <span className="doc-meta">{g.riferimento}</span>
            </h3>
            <table>
              <thead>
                <tr>
                  <th style={{ width: "10%" }}>Rif.</th>
                  <th>Requisito</th>
                  <th style={{ width: "14%" }}>Stato</th>
                  <th style={{ width: "30%" }}>Evidenza</th>
                </tr>
              </thead>
              <tbody>
                {g.requisiti.map((r) => (
                  <tr key={r.key}>
                    <td className="doc-mono">{r.key}</td>
                    <td>
                      {r.testo} <span className="doc-meta">{r.riferimento}</span>
                    </td>
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

function Rischi({ dati }: { dati: DatiDocumentoGdpr }) {
  const r = dati.rischi;
  const nomi = (asse: string) => dati.scale.filter((s) => s.asse === asse).sort((a, b) => a.valore - b.valore).map((s) => s.nome);
  return (
    <>
      <p>
        {r.valutati} trattamenti valutati su {r.trattamenti}: {r.alti} a rischio alto, {r.medi} medio, {r.bassi} basso.
        Soglie: alto da {dati.parametri.alto}, medio da {dati.parametri.medio}{" "}(probabilità × gravità).
      </p>
      <figure className="doc-fig">
        <MatriceRischi
          punti={dati.trattamenti.filter((t) => t.livello !== null).map((t) => ({ p: Number(t.probabilita), g: Number(t.gravita) }))}
          alto={dati.parametri.alto}
          medio={dati.parametri.medio}
          probabilita={nomi("probabilita")}
          gravita={nomi("gravita")}
        />
      </figure>
      <table>
        <thead>
          <tr>
            <th>Trattamento</th>
            <th style={{ width: "10%" }}>P × G</th>
            <th style={{ width: "11%" }}>Classe</th>
            <th style={{ width: "40%" }}>Misure di mitigazione</th>
          </tr>
        </thead>
        <tbody>
          {dati.trattamenti.map((t, i) => (
            <tr key={i}>
              <td>{t.nome}</td>
              <td>{t.livello === null ? <span className="doc-manca">da valutare</span> : `${t.probabilita} × ${t.gravita} = ${t.livello}`}</td>
              <td>{t.classe ?? "—"}</td>
              <td>{v(t.mitigazione)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {r.altiScoperti.length > 0 && (
        <p>
          <b>Rischi alti senza misure di mitigazione:</b> {r.altiScoperti.join(", ")}.
        </p>
      )}
    </>
  );
}

function Fornitori({ dati }: { dati: DatiDocumentoGdpr }) {
  const f = dati.statoFornitori;
  return (
    <>
      <p>
        {f.fornitori} soggetti esterni; {f.conContratto} tenuti al contratto ex art. 28, coperti al {pct(f.quotaContratti)};
        verificati {pct(f.quotaVerificati)}; {f.conTrasferimento}{" "}con trasferimento verso paesi terzi.
      </p>
      {dati.fornitori.length > 0 && (
        <table>
          <thead>
            <tr>
              <th>Soggetto e servizio</th>
              <th style={{ width: "17%" }}>Qualifica</th>
              <th style={{ width: "11%" }}>Contratto</th>
              <th style={{ width: "20%" }}>Paese e garanzia</th>
              <th style={{ width: "16%" }}>Verifica</th>
            </tr>
          </thead>
          <tbody>
            {dati.fornitori.map((x, i) => (
              <tr key={i}>
                <td>
                  {v(x.nome)}
                  <br />
                  <span className="doc-meta">{x.servizio}</span>
                </td>
                <td>{v(x.qualifica)}</td>
                <td>{v(x.contratto)}</td>
                <td>{[x.paese, x.garanzia].filter(Boolean).join(" · ") || "—"}</td>
                <td>
                  {d(x.verificatoIl)}
                  {x.esito ? ` · ${x.esito}` : ""}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </>
  );
}

function Registri({ dati, precedente }: { dati: DatiDocumentoGdpr; precedente: boolean }) {
  const a = dati.registri.corrente;
  const b = dati.registri.precedente;
  const riga = (nome: string, x: number | null, y: number | null): [string, number | null, number | null] => [nome, x, y];
  const voci = [
    riga("Richieste degli interessati", a.richieste, b.richieste),
    riga("— riscontrate nei termini", a.neiTermini, b.neiTermini),
    riga("— riscontrate fuori termine", a.fuoriTermine, b.fuoriTermine),
    riga("Giorni medi di riscontro", a.giorniMedi, b.giorniMedi),
    riga("Violazioni dei dati", a.violazioni, b.violazioni),
    riga("— con rischio per gli interessati", a.aRischio, b.aRischio),
    riga("— notificate entro 72 ore", a.notificateInTempo, b.notificateInTempo),
    riga("— notificate oltre 72 ore", a.notificateInRitardo, b.notificateInRitardo),
    riga("Interessati coinvolti", a.interessatiCoinvolti, b.interessatiCoinvolti),
    riga("Sessioni di formazione", a.formazioni, b.formazioni),
    riga("Ore-persona di formazione", a.orePersona, b.orePersona),
    riga("Audit e verifiche svolti", a.verifiche, b.verifiche),
    riga("Rilievi emersi", a.rilievi, b.rilievi),
    riga("Verifiche sui responsabili", a.verificheResponsabili, b.verificheResponsabili),
    riga("Prove di ripristino", a.proveRipristino, b.proveRipristino),
    riga("Verifiche sugli amministratori di sistema", a.verificheAds, b.verificheAds),
  ];
  return (
    <>
      <table>
        <thead>
          <tr>
            <th>Registro</th>
            <th style={{ width: "16%" }} className="doc-num">
              {dati.esercizio}
            </th>
            {precedente && (
              <th style={{ width: "16%" }} className="doc-num">
                {dati.esercizio - 1}
              </th>
            )}
          </tr>
        </thead>
        <tbody>
          {voci.map(([nome, x, y]) => (
            <tr key={nome}>
              <td>{nome}</td>
              <td className="doc-num">{n(x)}</td>
              {precedente && <td className="doc-num">{n(y)}</td>}
            </tr>
          ))}
        </tbody>
      </table>
      <p className="doc-meta">
        Alla data di emissione, richieste senza riscontro: {a.aperte} ancora nei termini e {a.scadute} oltre il termine;{" "}
        {a.violazioniAperte} violazioni non chiuse, {a.notificheScadute} con notifica oltre il termine delle 72 ore.
        I registri riportano soltanto conteggi: descrizioni e note restano presso il titolare.
      </p>
    </>
  );
}

function Indicatori({ dati }: { dati: DatiDocumentoGdpr }) {
  const c = dati.derivati.corrente;
  const p = dati.derivati.precedente;
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
                <th style={{ width: "12%" }}>Unità</th>
                <th style={{ width: "14%" }} className="doc-num">
                  {dati.esercizio}
                </th>
                <th style={{ width: "14%" }} className="doc-num">
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
                    <td className="doc-num">{n(k.valore, 1)}</td>
                    <td className="doc-num">{n(k.precedente, 1)}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      ))}
      <h3>Indicatori derivati</h3>
      <table>
        <tbody>
          {dati.derivati.definizioni.map((x) => {
            const val = (m: typeof c) => m[x.key as keyof typeof c] as number | null;
            return (
              <tr key={x.key}>
                <td>{NOME_DERIVATO[x.key] ?? x.key}</td>
                <td className="doc-num" style={{ width: "14%" }}>
                  {val(c) === null ? "—" : `${fmtNum(val(c), 1)} ${x.unita}`}
                </td>
                <td className="doc-num" style={{ width: "14%" }}>
                  {val(p) === null ? "—" : `${fmtNum(val(p), 1)} ${x.unita}`}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {c.incoerenze.length > 0 && (
        <p className="doc-meta">
          Non calcolati per l&apos;esercizio {dati.esercizio}, perché la parte dichiarata supera il totale:{" "}
          {c.incoerenze.map((k) => NOME_DERIVATO[k] ?? k).join(", ")}.
        </p>
      )}
    </>
  );
}

function Piano({ dati }: { dati: DatiDocumentoGdpr }) {
  return (
    <>
      <figure className="doc-fig">
        <PianoMesi attivita={dati.attivita.map((a) => ({ mese: a.mese, fatta: a.stato === "Fatto" }))} />
      </figure>
      {dati.attivita.length > 0 && (
        <table>
          <thead>
            <tr>
              <th style={{ width: "9%" }}>Mese</th>
              <th>Attività</th>
              <th style={{ width: "20%" }}>Responsabile</th>
              <th style={{ width: "12%" }}>Stato</th>
            </tr>
          </thead>
          <tbody>
            {[...dati.attivita]
              .sort((a, b) => a.mese - b.mese)
              .map((a, i) => (
                <tr key={i}>
                  <td className="doc-num">{a.mese}</td>
                  <td>
                    {a.attivita} {a.riferimento && <span className="doc-meta">{a.riferimento}</span>}
                  </td>
                  <td>{v(a.responsabile)}</td>
                  <td>{a.stato}</td>
                </tr>
              ))}
          </tbody>
        </table>
      )}
    </>
  );
}

function Documenti({ dati }: { dati: DatiDocumentoGdpr }) {
  if (!dati.documenti.length) return <p>Nessun documento in inventario.</p>;
  return (
    <table>
      <thead>
        <tr>
          <th>Documento</th>
          <th style={{ width: "10%" }}>Versione</th>
          <th style={{ width: "14%" }}>Adottato</th>
          <th style={{ width: "14%" }}>Revisione</th>
          <th style={{ width: "14%" }}>Stato</th>
        </tr>
      </thead>
      <tbody>
        {dati.documenti.map((x, i) => (
          <tr key={i}>
            <td>
              {v(x.tipo)}
              {x.oggetto ? <span className="doc-meta"> · {x.oggetto}</span> : null}
            </td>
            <td>{v(x.versione)}</td>
            <td>{d(x.adottatoIl)}</td>
            <td>{d(x.revisioneIl)}</td>
            <td>{x.stato}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function Politica({ dati }: { dati: DatiDocumentoGdpr }) {
  const testo = dati.politica.testo.trim();
  return testo ? (
    <>
      {testo.split(/\n{2,}/).map((par, i) => (
        <p key={i} style={{ whiteSpace: "pre-line" }}>
          {par}
        </p>
      ))}
    </>
  ) : (
    <p className="doc-manca">Il testo della politica non è stato redatto.</p>
  );
}

function Segnali({ dati }: { dati: DatiDocumentoGdpr }) {
  if (!dati.segnali.length) return <p>Nessuna criticità né attenzione rilevata alla data di emissione.</p>;
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

export function DocumentoGdpr({ dati, immagini, tipo }: { dati: DatiDocumentoGdpr; immagini: ImmaginiCopertina; tipo: TipoDocumentoGdpr }) {
  const emesso = fmtDataEstesa(dati.generatoIl);
  const sede = [dati.profilo.sede, dati.profilo.settore].filter(Boolean).join(" · ");

  return (
    <>
      <Copertina kicker={TITOLO[tipo]} titolo={dati.azienda.nome} sotto={sede} immagini={immagini}>
        <NotaCopertina>{NORMA[tipo]}</NotaCopertina>
        <NotaCopertina>
          {tipo === "relazione_privacy" ? `Esercizio ${dati.esercizio} · ` : ""}Emesso il {emesso}
        </NotaCopertina>
      </Copertina>

      <div className="doc-corpo">
        {tipo === "registro_trattamenti" && (
          <>
            <Perimetro
              righe={[
                "Il registro riporta i trattamenti dichiarati dal titolare; la completezza di ciascuna scheda è misurata sui sette elementi dell'art. 30, par. 1.",
                "Il registro va tenuto aggiornato e messo a disposizione dell'Autorità di controllo su richiesta (art. 30, par. 4).",
              ]}
            />
            <h2>1. Titolare del trattamento</h2>
            <Titolare dati={dati} />
            <h2>2. Attività di trattamento</h2>
            <p>
              {dati.registro.trattamenti} trattamenti registrati; completezza media{" "}
              {Math.round(dati.registro.completezza * 100)}%; {dati.registro.conParticolari} con dati particolari,{" "}
              {dati.registro.conTrasferimento}{" "}con trasferimenti verso paesi terzi.
            </p>
            {dati.trattamenti.length ? (
              dati.trattamenti.map((t, i) => <SchedaTrattamento key={i} t={t} i={i} />)
            ) : (
              <p className="doc-manca">Nessun trattamento registrato.</p>
            )}
            <FirmaDocumento dati={dati} />
          </>
        )}

        {tipo === "modello_privacy" && (
          <>
            <Perimetro
              righe={[
                "Il modello descrive l'organizzazione, le regole e le misure adottate dal titolare per dimostrare la conformità (art. 24 e art. 5, par. 2).",
                "Dai registri delle richieste e delle violazioni sono riportati soltanto conteggi.",
              ]}
            />
            <h2>1. Organizzazione e ruoli</h2>
            <Titolare dati={dati} />
            <p>
              Obbligo di designazione del responsabile della protezione dei dati (art. 37):{" "}
              {!dati.dpo.valutato ? "non valutato" : dati.dpo.obbligatorio ? "ricorre" : "non ricorre"}.
              {dati.profilo.amministratori ? ` Amministratori di sistema: ${dati.profilo.amministratori}.` : ""}
            </p>
            <h2>2. Politica</h2>
            <p>
              Approvata il {d(dati.politica.approvataIl)}
              {dati.politica.firma ? ` da ${dati.politica.firma}` : ""}; contenuti attesi presenti: {dati.politica.contenuti.length} su{" "}
              {dati.contenutiPolitica.length}.
            </p>
            <h2>3. Registro dei trattamenti</h2>
            <table>
              <thead>
                <tr>
                  <th>Trattamento</th>
                  <th style={{ width: "26%" }}>Base giuridica</th>
                  <th style={{ width: "14%" }}>Completezza</th>
                </tr>
              </thead>
              <tbody>
                {dati.trattamenti.map((t, i) => (
                  <tr key={i}>
                    <td>{t.nome}</td>
                    <td>{v(t.base)}</td>
                    <td className="doc-num">{Math.round(t.completezza * 100)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <h2>4. Rischi per gli interessati</h2>
            <Rischi dati={dati} />
            <h2>5. Responsabili e altri soggetti esterni</h2>
            <Fornitori dati={dati} />
            <h2>6. Documentazione</h2>
            <Documenti dati={dati} />
            <h2>7. Piano annuale</h2>
            <Piano dati={dati} />
            <h2>8. Registri</h2>
            <Registri dati={dati} precedente={false} />
            <h2>9. Indicatori</h2>
            <Indicatori dati={dati} />
            <h2>10. Conformità</h2>
            <Conformita dati={dati} dettaglio={false} />
            <Firme ruoli={["Il titolare del trattamento", "Il responsabile della protezione dei dati"]} />
            <FirmaDocumento dati={dati} />
          </>
        )}

        {tipo === "politica_privacy" && (
          <>
            <Politica dati={dati} />
            <p className="doc-meta">
              Approvata il {d(dati.politica.approvataIl)}
              {dati.politica.firma ? ` · ${dati.politica.firma}` : ""}
            </p>
            <Firme ruoli={["Il titolare del trattamento"]} />
            <FirmaDocumento dati={dati} />
          </>
        )}

        {tipo === "dpia" && (
          <>
            <Perimetro
              righe={[
                `La necessità della valutazione d'impatto è vagliata sui ${dati.criteri.length} criteri delle Linee guida WP248: ricorre da ${dati.parametri.sogliaDpia} criteri in su.`,
                "Le schede riportano lo stato della valutazione registrato nella piattaforma; l'esito resta una decisione del titolare.",
              ]}
            />
            <h2>1. Vaglio dei trattamenti</h2>
            <table>
              <thead>
                <tr>
                  <th>Trattamento</th>
                  <th style={{ width: "12%" }}>Criteri</th>
                  <th style={{ width: "16%" }}>Necessaria</th>
                  <th style={{ width: "18%" }}>Stato</th>
                </tr>
              </thead>
              <tbody>
                {dati.trattamenti.map((t, i) => (
                  <tr key={i}>
                    <td>{t.nome}</td>
                    <td className="doc-num">{t.numeroCriteri}</td>
                    <td>{t.dpiaNecessaria ? "Sì" : "No"}</td>
                    <td>{t.dpiaNecessaria ? v(t.dpiaStato) : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <h2>2. Schede di valutazione</h2>
            {dati.trattamenti.filter((t) => t.dpiaNecessaria).length === 0 && <p>Nessun trattamento richiede la valutazione d&apos;impatto.</p>}
            {dati.trattamenti
              .filter((t) => t.dpiaNecessaria)
              .map((t, i) => (
                <div key={i}>
                  <h3>
                    {i + 1}. {t.nome}
                  </h3>
                  <Righe
                    voci={[
                      ["Criteri ricorrenti", t.criteri.map((k) => dati.criteri.find((c) => c.key === k)?.testo ?? k).join("; ") || "—"],
                      ["Finalità e base giuridica", [t.finalita, t.base].filter(Boolean).join(" · ") || "—"],
                      ["Necessità e proporzionalità", v(t.dpiaNecessita)],
                      ["Rischio (P × G)", t.livello === null ? "da valutare" : `${t.livello} · ${t.classe}`],
                      ["Misure previste", v(t.mitigazione)],
                      ["Parere del responsabile della protezione dei dati", v(t.dpiaParere)],
                      ["Stato ed esito", [t.dpiaStato, t.dpiaEsito].filter(Boolean).join(" · ") || "—"],
                      ["Data", d(t.dpiaData)],
                    ]}
                  />
                </div>
              ))}
            {dati.registro.consultazionePreventiva.length > 0 && (
              <p>
                <b>Consultazione preventiva (art. 36) da valutare per:</b> {dati.registro.consultazionePreventiva.join(", ")}.
              </p>
            )}
            <Firme ruoli={["Il titolare del trattamento", "Il responsabile della protezione dei dati"]} />
            <FirmaDocumento dati={dati} />
          </>
        )}

        {tipo === "conformita_gdpr" && (
          <>
            <Perimetro
              righe={[
                "L'indice è calcolato su tutti i requisiti del catalogo: un requisito non valutato pesa zero e non viene escluso dal computo.",
                "Le evidenze riportate sono quelle dichiarate; i documenti a supporto restano presso il titolare.",
              ]}
            />
            <h2>1. Sintesi</h2>
            <Conformita dati={dati} dettaglio />
            <h2>2. Segnali alla data di emissione</h2>
            <Segnali dati={dati} />
            <FirmaDocumento dati={dati} />
          </>
        )}

        {tipo === "relazione_privacy" && (
          <>
            <Perimetro
              righe={[
                `La relazione riguarda l'esercizio ${dati.esercizio}, con il confronto sull'esercizio precedente dove i dati ci sono.`,
                "Dai registri delle richieste e delle violazioni sono riportati soltanto conteggi.",
              ]}
            />
            <h2>1. Stato del sistema</h2>
            <p>
              Avanzamento complessivo del percorso: <b>{dati.avanzamento.percentuale}%</b>. Indice di conformità:{" "}
              <b>{pct(dati.conformita.indice)}</b>. Trattamenti registrati: {dati.registro.trattamenti}.
            </p>
            <h2>2. Attività dell&apos;esercizio</h2>
            <Registri dati={dati} precedente />
            <h2>3. Indicatori</h2>
            <Indicatori dati={dati} />
            <h2>4. Piano annuale</h2>
            <Piano dati={dati} />
            <h2>5. Riesame</h2>
            {dati.riesame.corrente ? (
              <Righe
                voci={[
                  ["Data", d(dati.riesame.corrente.data)],
                  ["Partecipanti", v(dati.riesame.corrente.partecipanti)],
                  ["Sintesi", v(dati.riesame.corrente.relazione)],
                  ["Adeguatezza del sistema", v(dati.riesame.corrente.adeguatezza)],
                  ["Opportunità di miglioramento", v(dati.riesame.corrente.miglioramento)],
                  ["Azioni decise", v(dati.riesame.corrente.azioni)],
                ]}
              />
            ) : (
              <p className="doc-manca">Il riesame dell&apos;esercizio {dati.esercizio} non è stato registrato.</p>
            )}
            {dati.riesame.precedente && <p className="doc-meta">Riesame precedente: {d(dati.riesame.precedente.data)}.</p>}
            <h2>6. Segnali</h2>
            <Segnali dati={dati} />
            <Firme ruoli={["Il titolare del trattamento", "Il responsabile della protezione dei dati"]} />
            <FirmaDocumento dati={dati} />
          </>
        )}
      </div>
    </>
  );
}
