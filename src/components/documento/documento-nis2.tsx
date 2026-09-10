import { fmtData } from "@/lib/format";
import { marchioDelloSnapshot } from "@/features/documents/marchio";

// I TRE DOCUMENTI NIS2 — D.Lgs. 138/2024, di recepimento della Direttiva (UE) 2022/2555.
//
// ⚠️ La classificazione d'ambito qui e' CONGELATA, e nel dato vivo non esiste: si calcola
// da settore, dimensione e criteri. Nel documento deve restare quella del giorno in cui e'
// stato firmato — se domani il consulente corregge la dimensione, una relazione gia'
// consegnata non deve cambiare conclusione sotto le mani di chi l'ha ricevuta.
//
// ⚠️ E lo stesso vale per lo STATO EFFETTIVO dei controlli: «attuato» con la verifica
// scaduta e' «da verificare», e il giorno dopo la pubblicazione un altro controllo puo'
// scadere. Questa relazione dice cio' che era vero quando e' stata firmata.

const CLASSE_NOME: Record<string, string> = {
  essenziale: "Soggetto essenziale",
  importante: "Soggetto importante",
  fuori_ambito: "Fuori dall'ambito di applicazione",
};

const VIA_NOME: Record<string, string> = {
  criterio_specifico: "criterio specifico, indipendente dalla dimensione",
  grande_allegato_1: "grande impresa in settore ad alta criticità (Allegato I)",
  grande_allegato_2: "grande impresa in altro settore critico (Allegato II)",
  media_allegato_1: "media impresa in settore ad alta criticità (Allegato I)",
  media_allegato_2: "media impresa in altro settore critico (Allegato II)",
  sotto_soglia: "al di sotto delle soglie dimensionali e in assenza di criteri specifici",
  settore_non_elencato: "settore non compreso negli Allegati I e II",
  dimensione_non_dichiarata: "dimensione non dichiarata",
};

const DIMENSIONE_NOME: Record<string, string> = {
  micro: "Microimpresa o piccola impresa",
  media: "Media impresa",
  grande: "Grande impresa",
};

const LIVELLO_NOME = ["Assente", "Pianificata", "Attuata parzialmente", "Attuata", "Attuata e verificata"];

const STATO_CONTROLLO: Record<string, string> = {
  attuato: "Attuato",
  in_attuazione: "In attuazione",
  non_attuato: "Non attuato",
  non_applicabile: "Non applicabile",
  da_verificare: "Da verificare",
  vuoto: "—",
};

const PRIORITA_NOME: Record<string, string> = {
  immediata: "1 · immediata",
  alta: "2 · alta",
  media: "3 · media",
  programmata: "4 · programmata",
};

type Ambito = {
  classe: string | null;
  via: string;
  criterio: string | null;
  allegato: number | null;
  sanzione: { massimo: number; percentuale: number } | null;
} | null;

type Conformita = {
  obiettivo: number;
  percentuale: number;
  livelloMedio: number | null;
  applicabili: number;
  valutati: number;
  perCapitolo: { capitolo: string; percentuale: number; attivi: number; valutati: number }[];
  scostamenti: { key: string; critico: boolean; livello: number | null; priorita: string | null }[];
} | null;

const euro = (n: number) =>
  n >= 1_000_000 ? `${n / 1_000_000} milioni di euro` : new Intl.NumberFormat("it-IT").format(n);

/** Il riquadro che dice che cosa il documento NON contiene. In apertura, non in fondo. */
function Perimetro({ righe }: { righe: string[] }) {
  return (
    <div className="doc-avviso">
      <p>
        <b>Natura e perimetro del documento.</b>{" "}
        Questo documento riporta esclusivamente quanto registrato nella piattaforma alla data di
        emissione. Non costituisce una certificazione né un attestato rilasciato da un organismo
        terzo, e non sostituisce la valutazione dell&apos;Autorità competente.
      </p>
      <ul>
        {righe.map((r, i) => (
          <li key={i}>{r}</li>
        ))}
      </ul>
    </div>
  );
}

function BloccoAmbito({ ambito, profilo }: { ambito: Ambito; profilo: Record<string, unknown> }) {
  const classe = ambito?.classe ? CLASSE_NOME[ambito.classe] : "Non determinata";
  return (
    <>
      <table>
        <tbody>
          <tr>
            <td style={{ width: "38%" }}>Settore di attività</td>
            <td>{(profilo.settore as string) || "—"}</td>
          </tr>
          <tr>
            <td>Parametro dimensionale</td>
            <td>{DIMENSIONE_NOME[profilo.dimensione as string] ?? "—"}</td>
          </tr>
          <tr>
            <td>Allegato di riferimento</td>
            <td>{ambito?.allegato ? `Allegato ${ambito.allegato}` : "—"}</td>
          </tr>
          <tr>
            <td>
              <b>Classificazione</b>
            </td>
            <td>
              <b>{classe}</b>
              {ambito?.via ? ` — ${VIA_NOME[ambito.via] ?? ambito.via}` : ""}
            </td>
          </tr>
          <tr>
            <td>Massimo edittale (art. 38)</td>
            <td>
              {ambito?.sanzione
                ? `fino a ${euro(ambito.sanzione.massimo)} o al ${String(ambito.sanzione.percentuale).replace(".", ",")}% del fatturato mondiale annuo, se superiore`
                : "—"}
            </td>
          </tr>
        </tbody>
      </table>
      {!ambito?.classe && (
        <p>
          <b>La classificazione non è determinata.</b> {VIA_NOME[ambito?.via ?? ""] ?? ""}. Da questi
          elementi non discende alcuna conclusione sull&apos;appartenenza all&apos;ambito di
          applicazione: la determinazione richiede il completamento della scheda di ambito.
        </p>
      )}
    </>
  );
}

// ───────────────────────────────────────────── 1 · Relazione sulla conformità

type SnapshotConformita = {
  generatoIl: string;
  azienda: { id: string; nome: string; settore: string | null; sede: string | null };
  profilo: Record<string, unknown>;
  ambito: Ambito;
  criteriCatalogo: { key: string; testo: string; classe: string }[];
  conformita: Conformita;
  requisiti: {
    key: string;
    capitolo: string;
    rif: string;
    critico: boolean;
    testo: string;
    livello: number | null;
    nonApplicabile: boolean;
    evidenza: string | null;
  }[];
};

export function DocumentoConformitaNis2({ dati }: { dati: SnapshotConformita }) {
  const { azienda, profilo, ambito, conformita: k, requisiti } = dati;
  const criteriSpuntati = (profilo.criteri as string[] | undefined) ?? [];
  const capitoli = [...new Set(requisiti.map((r) => r.capitolo))];

  return (
    <>
      <div className="doc-cover">
        <div className="testo">
          <p className="kicker">Relazione sul livello di conformità</p>
          <h1>{azienda.nome}</h1>
          <p className="sotto">{[azienda.sede, azienda.settore].filter(Boolean).join(" · ")}</p>
          <p className="sotto" style={{ marginTop: 8, opacity: 0.7 }}>
            Misure di gestione dei rischi per la sicurezza informatica · D.Lgs. 4 settembre 2024, n.
            138
          </p>
        </div>
        <div className="filo" />
      </div>

      <div className="doc-corpo">
        <Perimetro
          righe={[
            "La classificazione dell'ambito soggettivo è una valutazione preliminare condotta sui dati dichiarati dall'organizzazione; la qualificazione definitiva compete all'Autorità.",
            "Il livello di conformità è calcolato sui requisiti applicabili: un requisito non valutato pesa zero e non viene escluso dal computo.",
            "Il documento non riporta le evidenze documentali, che restano presso l'organizzazione.",
          ]}
        />

        <h2>1. Ambito soggettivo</h2>
        <p>
          L&apos;appartenenza all&apos;ambito di applicazione dipende dal settore di attività, dal
          parametro dimensionale e dalla ricorrenza di criteri che prescindono dalla dimensione
          (art. 3 del decreto). Dalla classificazione discendono gli obblighi applicabili e il
          massimo edittale previsto dall&apos;art. 38.
        </p>
        <BloccoAmbito ambito={ambito} profilo={profilo} />

        <h3>1.1 Criteri specifici indipendenti dalla dimensione</h3>
        <table>
          <thead>
            <tr>
              <th style={{ width: "8%" }}>#</th>
              <th>Criterio</th>
              <th style={{ width: "14%" }}>Ricorre</th>
            </tr>
          </thead>
          <tbody>
            {dati.criteriCatalogo.map((c) => (
              <tr key={c.key}>
                <td>{c.key.toUpperCase()}</td>
                <td>{c.testo}</td>
                <td>{criteriSpuntati.includes(c.key) ? "Sì" : "No"}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <h2>2. Assetto di governance</h2>
        <table>
          <tbody>
            <tr>
              <td style={{ width: "38%" }}>Organo di amministrazione</td>
              <td>{(profilo.organo as string) || "________________________"}</td>
            </tr>
            <tr>
              <td>Responsabile della sicurezza informatica</td>
              <td>{(profilo.responsabile as string) || "________________________"}</td>
            </tr>
            <tr>
              <td>Sostituto</td>
              <td>{(profilo.sostituto as string) || "________________________"}</td>
            </tr>
            <tr>
              <td>Punto di contatto con l&apos;Autorità</td>
              <td>{(profilo.puntoContatto as string) || "________________________"}</td>
            </tr>
            <tr>
              <td>Comunicazione di inserimento nell&apos;elenco</td>
              <td>{profilo.comunicazioneIl ? fmtData(profilo.comunicazioneIl as string) : "—"}</td>
            </tr>
            <tr>
              <td>Registrazione presso l&apos;Autorità</td>
              <td>{profilo.registrazioneIl ? fmtData(profilo.registrazioneIl as string) : "—"}</td>
            </tr>
          </tbody>
        </table>

        <h2>3. Livello di conformità</h2>
        {k ? (
          <>
            <p>
              Livello obiettivo <b>{k.obiettivo} · {LIVELLO_NOME[k.obiettivo]}</b>. Conformità
              complessiva <b>{k.percentuale}%</b>, su {k.valutati} requisiti valutati di{" "}
              {k.applicabili} applicabili.
              {k.valutati < k.applicabili && (
                <>
                  {" "}
                  I {k.applicabili - k.valutati} requisiti non ancora valutati concorrono al calcolo
                  con valore nullo: la percentuale misura quanto è stato dimostrato, non la media di
                  ciò che è stato guardato.
                </>
              )}
            </p>
            <table>
              <thead>
                <tr>
                  <th style={{ width: "12%" }}>Capo</th>
                  <th style={{ width: "22%" }}>Applicabili</th>
                  <th style={{ width: "22%" }}>Valutati</th>
                  <th>Conformità</th>
                </tr>
              </thead>
              <tbody>
                {k.perCapitolo.map((c) => (
                  <tr key={c.capitolo}>
                    <td>{c.capitolo}</td>
                    <td>{c.attivi}</td>
                    <td>{c.valutati}</td>
                    <td>{c.percentuale}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        ) : (
          <p>Nessun requisito valutato.</p>
        )}

        <h2>4. Esito per requisito</h2>
        {capitoli.map((cap) => (
          <div key={cap}>
            <h3>Capo {cap}</h3>
            <table>
              <thead>
                <tr>
                  <th style={{ width: "10%" }}>Rif.</th>
                  <th>Domanda di controllo</th>
                  <th style={{ width: "12%" }}>Articolo</th>
                  <th style={{ width: "9%" }}>Crit.</th>
                  <th style={{ width: "20%" }}>Livello</th>
                </tr>
              </thead>
              <tbody>
                {requisiti
                  .filter((r) => r.capitolo === cap)
                  .map((r) => (
                    <tr key={r.key}>
                      <td>{r.key}</td>
                      <td>{r.testo}</td>
                      <td>{r.rif}</td>
                      <td>{r.critico ? "alta" : "media"}</td>
                      <td>
                        {r.nonApplicabile
                          ? "non applicabile"
                          : r.livello != null
                            ? `${r.livello} · ${LIVELLO_NOME[r.livello]}`
                            : "non valutato"}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        ))}

        <h2>5. Scostamenti rilevati</h2>
        {k && k.scostamenti.length ? (
          <table>
            <thead>
              <tr>
                <th style={{ width: "14%" }}>Rif.</th>
                <th style={{ width: "16%" }}>Criticità</th>
                <th style={{ width: "22%" }}>Livello attuale</th>
                <th>Priorità suggerita</th>
              </tr>
            </thead>
            <tbody>
              {k.scostamenti.map((s) => (
                <tr key={s.key}>
                  <td>{s.key}</td>
                  <td>{s.critico ? "alta" : "media"}</td>
                  <td>{s.livello != null ? `${s.livello} · ${LIVELLO_NOME[s.livello]}` : "—"}</td>
                  <td>{s.priorita ? PRIORITA_NOME[s.priorita] : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p>
            Nessun requisito valutato risulta al di sotto del livello obiettivo. I requisiti non
            ancora valutati non costituiscono scostamento: costituiscono istruttoria da completare.
          </p>
        )}

        <h2>6. Firme</h2>
        <table>
          <tbody>
            <tr>
              <td style={{ width: "50%" }}>Responsabile della sicurezza informatica</td>
              <td>{(profilo.responsabile as string) || "________________________"}</td>
            </tr>
            <tr>
              <td>Organo di amministrazione</td>
              <td>{(profilo.organo as string) || "________________________"}</td>
            </tr>
            <tr>
              <td>Data</td>
              <td>{fmtData(dati.generatoIl.slice(0, 10))}</td>
            </tr>
          </tbody>
        </table>

        <h2>Riferimenti normativi</h2>
        <ul>
          <li>
            D.Lgs. 4 settembre 2024, n. 138, di recepimento della Direttiva (UE) 2022/2555 (NIS2).
          </li>
          <li>Allegati I e II del decreto, per i settori ad alta criticità e gli altri settori critici.</li>
          <li>Art. 24, per le misure di gestione dei rischi; art. 23, per gli obblighi degli organi.</li>
          <li>Art. 25, per gli obblighi di notifica; art. 38, per le sanzioni.</li>
          <li>Determinazioni e specifiche di base adottate dall&apos;Agenzia per la Cybersicurezza Nazionale.</li>
        </ul>

        <p className="doc-meta">
          Documento generato il {fmtData(dati.generatoIl)} da {marchioDelloSnapshot(dati).nome}. I
          valori riportati sono congelati alla data di emissione: modifiche successive
          all&apos;istruttoria non alterano questa revisione, che resta la versione consegnata.
        </p>
      </div>
    </>
  );
}

// ────────────────────────────── 2 e 3 · Relazione sul sistema e Catalogo dei controlli

type SnapshotSistema = {
  generatoIl: string;
  azienda: { id: string; nome: string };
  ambito: Ambito;
  profilo: Record<string, unknown>;
  attuazione: number;
  conformita: Conformita;
  controlli: {
    key: string;
    capitolo: string;
    nome: string;
    descrizione: string;
    critico: boolean;
    frequenza: number;
    dichiarato: string;
    effettivo: string;
    responsabile: string | null;
    evidenza: string | null;
    ultimaVerifica: string | null;
    prossima: string | null;
  }[];
  roadmap: {
    termini: { comunicazione: string | null; notifica: string | null; misure: string | null; registrazione: string };
    giorni: { notifica: number | null; misure: number | null; registrazione: number | null };
    fasi: {
      key: string;
      nome: string;
      descrizione: string;
      capitoli: string[];
      avanzamento: { id: string; percentuale: number; applicabili: number };
      stato: { stato: string; responsabile: string | null; scadenza: string | null } | null;
    }[];
  };
  indicatori: {
    codice: string;
    nome: string;
    ambito: string | null;
    tipo: string | null;
    unita: string | null;
    target: string | null;
    soglia: string | null;
    verso: string;
    ultima: { periodo: string; valore: number | null } | null;
    stato: string;
    andamento: number;
    scostamento: number | null;
  }[];
};

const STATO_IND: Record<string, string> = {
  a_target: "a target",
  in_attenzione: "in attenzione",
  fuori_target: "fuori target",
  non_rilevato: "non rilevato",
};

export function DocumentoSistemaNis2({
  dati,
  tipo,
}: {
  dati: SnapshotSistema;
  tipo: "relazione_nis2" | "controlli_nis2";
}) {
  const { azienda, ambito, profilo, controlli, roadmap, indicatori } = dati;
  const capitoli = [...new Set(controlli.map((c) => c.capitolo))];
  const daVerificare = controlli.filter((c) => c.effettivo === "da_verificare");
  const soloControlli = tipo === "controlli_nis2";

  return (
    <>
      <div className="doc-cover">
        <div className="testo">
          <p className="kicker">
            {soloControlli ? "Catalogo dei controlli" : "Relazione sul sistema di gestione"}
          </p>
          <h1>{azienda.nome}</h1>
          <p className="sotto" style={{ marginTop: 8, opacity: 0.7 }}>
            Sicurezza informatica · D.Lgs. 4 settembre 2024, n. 138
          </p>
        </div>
        <div className="filo" />
      </div>

      <div className="doc-corpo">
        <Perimetro
          righe={[
            "Lo stato dei controlli è quello EFFETTIVO alla data di emissione: un controllo dichiarato attuato la cui verifica periodica risulta scaduta è riportato come «da verificare».",
            soloControlli
              ? "Il documento riporta il catalogo dei controlli e il loro stato; la relazione sul sistema, con roadmap e indicatori, è un documento distinto."
              : "Il documento non riporta le evidenze documentali, che restano presso l'organizzazione.",
          ]}
        />

        {!soloControlli && (
          <>
            <h2>1. Destinatario e oggetto</h2>
            <p>
              La presente relazione è resa all&apos;organo di amministrazione, cui l&apos;art. 23 del
              decreto attribuisce l&apos;approvazione delle modalità di attuazione delle misure di
              gestione dei rischi e la responsabilità per la loro violazione. Riferisce a che punto è
              il sistema, quali termini sono in corso e quali controlli richiedono attenzione.
            </p>
            <BloccoAmbito ambito={ambito} profilo={profilo} />

            <h2>2. Termini in corso</h2>
            <table>
              <thead>
                <tr>
                  <th>Adempimento</th>
                  <th style={{ width: "22%" }}>Termine</th>
                  <th style={{ width: "20%" }}>Residuo</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Obblighi di notifica (art. 25)</td>
                  <td>{roadmap.termini.notifica ? fmtData(roadmap.termini.notifica) : "—"}</td>
                  <td>
                    {roadmap.giorni.notifica == null
                      ? "—"
                      : roadmap.giorni.notifica < 0
                        ? `${Math.abs(roadmap.giorni.notifica)} giorni oltre`
                        : `${roadmap.giorni.notifica} giorni`}
                  </td>
                </tr>
                <tr>
                  <td>Misure di gestione del rischio (art. 24)</td>
                  <td>{roadmap.termini.misure ? fmtData(roadmap.termini.misure) : "—"}</td>
                  <td>
                    {roadmap.giorni.misure == null
                      ? "—"
                      : roadmap.giorni.misure < 0
                        ? `${Math.abs(roadmap.giorni.misure)} giorni oltre`
                        : `${roadmap.giorni.misure} giorni`}
                  </td>
                </tr>
                <tr>
                  <td>Registrazione annuale presso l&apos;Autorità (art. 7)</td>
                  <td>{fmtData(roadmap.termini.registrazione)}</td>
                  <td>
                    {roadmap.giorni.registrazione == null
                      ? "—"
                      : `${roadmap.giorni.registrazione} giorni`}
                  </td>
                </tr>
              </tbody>
            </table>
            {!roadmap.termini.comunicazione && (
              <p>
                La comunicazione con cui l&apos;Autorità conferma l&apos;inserimento nell&apos;elenco
                dei soggetti non risulta registrata: i termini dei nove e dei diciotto mesi non sono
                pertanto determinati. Non sono zero: non decorrono.
              </p>
            )}

            <h2>3. Roadmap di adeguamento</h2>
            <table>
              <thead>
                <tr>
                  <th style={{ width: "22%" }}>Fase</th>
                  <th>Contenuto</th>
                  <th style={{ width: "14%" }}>Controlli</th>
                  <th style={{ width: "14%" }}>Attuazione</th>
                  <th style={{ width: "16%" }}>Stato</th>
                </tr>
              </thead>
              <tbody>
                {roadmap.fasi.map((f) => (
                  <tr key={f.key}>
                    <td>{f.nome}</td>
                    <td>{f.descrizione}</td>
                    <td>{f.avanzamento.applicabili}</td>
                    <td>{f.avanzamento.percentuale}%</td>
                    <td>{f.stato?.stato?.replace("_", " ") ?? "non avviata"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}

        <h2>{soloControlli ? "1" : "4"}. Stato dei controlli</h2>
        <p>
          Attuazione complessiva <b>{dati.attuazione}%</b> su {controlli.filter((c) => c.dichiarato !== "non_applicabile").length}{" "}
          controlli applicabili.
          {daVerificare.length > 0 && (
            <>
              {" "}
              <b>{daVerificare.length}</b>{" "}
              {daVerificare.length === 1 ? "controllo risulta dichiarato" : "controlli risultano dichiarati"}{" "}
              attuati con la verifica periodica scaduta, o senza alcuna verifica registrata: sono
              riportati come «da verificare».
            </>
          )}
        </p>
        {capitoli.map((cap) => (
          <div key={cap}>
            <h3>Capo {cap}</h3>
            <table>
              <thead>
                <tr>
                  <th style={{ width: "9%" }}>Cod.</th>
                  <th>Controllo</th>
                  <th style={{ width: "8%" }}>Crit.</th>
                  <th style={{ width: "15%" }}>Stato</th>
                  <th style={{ width: "13%" }}>Ultima verifica</th>
                  <th style={{ width: "13%" }}>Prossima</th>
                </tr>
              </thead>
              <tbody>
                {controlli
                  .filter((c) => c.capitolo === cap)
                  .map((c) => (
                    <tr key={c.key}>
                      <td>{c.key}</td>
                      <td>
                        {c.nome}
                        <br />
                        <span style={{ opacity: 0.7 }}>{c.descrizione}</span>
                      </td>
                      <td>{c.critico ? "alta" : "media"}</td>
                      <td>{STATO_CONTROLLO[c.effettivo] ?? c.effettivo}</td>
                      <td>{c.ultimaVerifica ? fmtData(c.ultimaVerifica) : "—"}</td>
                      <td>{c.prossima ? fmtData(c.prossima) : "—"}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        ))}

        {!soloControlli && (
          <>
            <h2>5. Indicatori</h2>
            {indicatori.length ? (
              <table>
                <thead>
                  <tr>
                    <th style={{ width: "10%" }}>Cod.</th>
                    <th>Indicatore</th>
                    <th style={{ width: "13%" }}>Ultimo</th>
                    <th style={{ width: "11%" }}>Target</th>
                    <th style={{ width: "16%" }}>Stato</th>
                  </tr>
                </thead>
                <tbody>
                  {indicatori.map((i) => (
                    <tr key={i.codice}>
                      <td>{i.codice}</td>
                      <td>{i.nome}</td>
                      <td>
                        {i.ultima ? `${i.ultima.valore ?? "—"} ${i.unita ?? ""}`.trim() : "—"}
                      </td>
                      <td>{i.target ?? "—"}</td>
                      <td>{STATO_IND[i.stato] ?? i.stato}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p>Nessun indicatore definito.</p>
            )}

            <h2>6. Firme</h2>
            <table>
              <tbody>
                <tr>
                  <td style={{ width: "50%" }}>Responsabile della sicurezza informatica</td>
                  <td>{(profilo.responsabile as string) || "________________________"}</td>
                </tr>
                <tr>
                  <td>Organo di amministrazione</td>
                  <td>{(profilo.organo as string) || "________________________"}</td>
                </tr>
                <tr>
                  <td>Data</td>
                  <td>{fmtData(dati.generatoIl.slice(0, 10))}</td>
                </tr>
              </tbody>
            </table>
          </>
        )}

        <p className="doc-meta">
          Documento generato il {fmtData(dati.generatoIl)} da {marchioDelloSnapshot(dati).nome}. Lo
          stato riportato è congelato alla data di emissione: verifiche scadute successivamente non
          alterano questa revisione, che resta la versione consegnata.
        </p>
      </div>
    </>
  );
}
