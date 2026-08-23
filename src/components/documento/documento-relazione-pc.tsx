import { fmtData } from "@/lib/format";
import { marchioDelloSnapshot } from "@/features/documents/marchio";

// Relazione annuale sulla prevenzione della corruzione (UNI ISO 37001 §9.3, §5.3.2).
//
// Ha un destinatario preciso: l'organo di governo, o l'alta direzione quando un organo
// distinto non esiste. Non è un documento di lavoro — è il rendiconto con cui la
// funzione anticorruzione dice tre cose: a quali rapporti siamo esposti, quali obblighi
// ne discendono e quanti ne restano aperti, a che punto è il sistema.
//
// Tutto ciò che si legge qui è congelato nello snapshot: il livello di rischio di un
// socio cambia il giorno in cui si aggiorna una dimensione, e una relazione consegnata
// non deve cambiare sotto gli occhi di chi l'ha ricevuta.

type Socio = {
  nome: string;
  categoria: string | null;
  paese: string | null;
  stato: string;
  livello: string | null;
  sopraSoglia: boolean;
  livelloDD: number;
  frequenzaDD: number;
  dueDiligenceIl: string | null;
  ddScaduta: boolean;
  obblighi: number;
  aperti: number;
};

type Snapshot = {
  generatoIl: string;
  azienda: { id: string; nome: string; settore: string | null; sede: string | null };
  sistema: Record<string, string | null>;
  soci: Socio[];
  capitoli: { key: string; nome: string; descrizione: string; requisiti: number; valutati: number; conformita: number }[];
  conformita: number | null;
  indicatori: {
    sociTotali: number; sociAttivi: number; sopraSoglia: number; senzaLivello: number;
    conObblighiAperti: number; ddScadute: number; obblighiApplicabili: number;
    obblighiAssolti: number; requisitiValutati: number; requisitiTotali: number;
  };
};

const LIVELLI = ["Critico", "Alto", "Medio", "Basso"] as const;

export function DocumentoRelazionePc({ dati }: { dati: Snapshot }) {
  const { azienda, sistema: s, soci, capitoli, indicatori: k } = dati;
  const attivi = soci.filter((x) => x.stato !== "Cessato");
  const perLivello = LIVELLI.map((l) => ({ livello: l, n: attivi.filter((x) => x.livello === l).length }));
  const pctObblighi = k.obblighiApplicabili ? Math.round((k.obblighiAssolti / k.obblighiApplicabili) * 100) : null;

  return (
    <>
      <div className="doc-cover">
        <div className="testo">
          <p className="kicker">Relazione sulla prevenzione della corruzione</p>
          <h1>{s.ragione || azienda.nome}</h1>
          <p className="sotto">{[s.sede || azienda.sede, s.settore || azienda.settore].filter(Boolean).join(" · ")}</p>
          <p className="sotto" style={{ marginTop: 8, opacity: 0.7 }}>
            Sistema di gestione per la prevenzione della corruzione · UNI ISO 37001
            {s.revisione ? ` · revisione ${s.revisione}` : ""}
          </p>
        </div>
        <div className="filo" />
      </div>

      <div className="doc-corpo">
        <h2>1. Destinatario e oggetto</h2>
        <p>
          La presente relazione è resa dalla funzione per la prevenzione della corruzione
          {s.organoGov === "Sì" ? " all'organo di governo" : " all'alta direzione"}, ai sensi dei punti 5.3.2 e
          9.3 della UNI ISO 37001. Riferisce sull'adeguatezza e sull'attuazione del sistema di gestione, sui
          rapporti con i soci in affari e sugli adempimenti che ne discendono.
        </p>
        {s.organoGov !== "Sì" && (
          <p>
            <strong>Nota.</strong>{" "}Un organo di governo distinto dall'alta direzione non è presente: le attività
            di sorveglianza sono svolte dall'alta direzione, e la circostanza è qui dichiarata come la norma
            richiede.
          </p>
        )}

        <h2>2. Identificazione</h2>
        <table>
          <tbody>
            <tr><td style={{ width: "38%" }}>Organizzazione</td><td><strong>{s.ragione || azienda.nome}</strong></td></tr>
            {s.piva && <tr><td>Partita IVA / C.F.</td><td className="doc-mono">{s.piva}</td></tr>}
            {(s.sede || azienda.sede) && <tr><td>Sede legale</td><td>{s.sede || azienda.sede}</td></tr>}
            {s.paesi && <tr><td>Paesi di operatività</td><td>{s.paesi}</td></tr>}
            {s.addetti && <tr><td>Addetti</td><td>{s.addetti}</td></tr>}
            <tr><td>Alta direzione</td><td>{s.direzione || <span className="doc-manca">non indicata</span>}</td></tr>
            <tr><td>Funzione per la prevenzione della corruzione</td><td>{s.funzionePc || <span className="doc-manca">non indicata</span>}{s.funzionePcImpegno ? ` — ${s.funzionePcImpegno}` : ""}</td></tr>
            {s.funzionePcImpegno === "Esternalizzata" && (
              <tr><td>Dirigente interno responsabile</td><td>{s.funzionePcDirigente || <span className="doc-manca">non indicato</span>}</td></tr>
            )}
            {s.odv && <tr><td>Organismo di vigilanza ex D.Lgs. 231/2001</td><td>{s.odv}</td></tr>}
            <tr><td>Data di adozione del sistema</td><td>{s.dataAdozione ? fmtData(s.dataAdozione) : <span className="doc-manca">non indicata</span>}</td></tr>
          </tbody>
        </table>

        <h2>3. Campo di applicazione</h2>
        <p>{s.scopo || <span className="doc-manca">Campo di applicazione non ancora dichiarato.</span>}</p>
        {s.esclusioni && <p><strong>Esclusioni.</strong> {s.esclusioni}</p>}
        {s.pubbliciUfficiali && (
          <>
            <h3>Interazioni con pubblici ufficiali</h3>
            <p>{s.pubbliciUfficiali}</p>
          </>
        )}

        <h2>4. Canale di segnalazione</h2>
        {s.canaleEmail || s.canaleUrl || s.canaleTelefono || s.canaleTerzo ? (
          <table>
            <tbody>
              {s.canaleEmail && <tr><td style={{ width: "38%" }}>Posta elettronica dedicata</td><td className="doc-mono">{s.canaleEmail}</td></tr>}
              {s.canaleUrl && <tr><td>Piattaforma online</td><td className="doc-mono">{s.canaleUrl}</td></tr>}
              {s.canaleTelefono && <tr><td>Recapito telefonico</td><td className="doc-mono">{s.canaleTelefono}</td></tr>}
              {s.canaleTerzo && <tr><td>Gestore terzo</td><td>{s.canaleTerzo}</td></tr>}
              {s.canaleLingue && <tr><td>Lingue disponibili</td><td>{s.canaleLingue}</td></tr>}
            </tbody>
          </table>
        ) : (
          <p className="doc-manca">Nessun canale di segnalazione dichiarato.</p>
        )}

        <h2>5. Esposizione: i soci in affari</h2>
        <p>
          Sono censiti <strong>{k.sociTotali}</strong> rapporti, di cui <strong>{k.sociAttivi}</strong> attivi o
          sospesi. Gli indicatori che seguono escludono i rapporti cessati: rinnovare la due diligence su un
          rapporto finito non è un adempimento aperto.
        </p>
        <table>
          <thead><tr><th>Livello di rischio</th><th style={{ width: "22%" }}>Rapporti</th><th>Conseguenza</th></tr></thead>
          <tbody>
            {perLivello.map((r) => (
              <tr key={r.livello}>
                <td><strong>{r.livello}</strong></td>
                <td>{r.n}</td>
                <td>
                  {r.livello === "Basso"
                    ? "Sotto la soglia: nessun obbligo aggiuntivo"
                    : "Sopra la soglia: due diligence, politica, impegni, clausole, verifica dei controlli"}
                </td>
              </tr>
            ))}
            {k.senzaLivello > 0 && (
              <tr>
                <td><span className="doc-manca">Non determinato</span></td>
                <td>{k.senzaLivello}</td>
                <td>Valutazione del rischio da completare</td>
              </tr>
            )}
          </tbody>
        </table>

        <h2>6. Adempimenti</h2>
        <table>
          <tbody>
            <tr><td style={{ width: "58%" }}>Rapporti sopra la soglia</td><td><strong>{k.sopraSoglia}</strong> su {k.sociAttivi}</td></tr>
            <tr><td>Obblighi applicabili</td><td>{k.obblighiApplicabili}</td></tr>
            <tr><td>Obblighi assolti</td><td>{k.obblighiAssolti}{pctObblighi !== null ? ` (${pctObblighi}%)` : ""}</td></tr>
            <tr><td>Rapporti sopra soglia con obblighi aperti</td><td>{k.conObblighiAperti}</td></tr>
            <tr><td>Due diligence scadute</td><td>{k.ddScadute}</td></tr>
          </tbody>
        </table>

        {attivi.some((x) => x.sopraSoglia) && (
          <>
            <h3>Rapporti sopra la soglia</h3>
            <table>
              <thead>
                <tr><th>Socio in affari</th><th>Categoria</th><th>Livello</th><th>Due diligence</th><th>Obblighi aperti</th></tr>
              </thead>
              <tbody>
                {attivi.filter((x) => x.sopraSoglia).map((x) => (
                  <tr key={x.nome}>
                    <td><strong>{x.nome}</strong>{x.paese ? <><br /><span style={{ opacity: 0.7 }}>{x.paese}</span></> : null}</td>
                    <td>{x.categoria || "—"}</td>
                    <td>{x.livello}</td>
                    <td>
                      {x.dueDiligenceIl ? fmtData(x.dueDiligenceIl) : <span className="doc-manca">mai svolta</span>}
                      {x.ddScaduta && <> — <strong>scaduta</strong></>}
                      <br />
                      <span style={{ opacity: 0.7 }}>livello {x.livelloDD}, rinnovo ogni {x.frequenzaDD} mesi</span>
                    </td>
                    <td>{x.aperti === 0 ? "nessuno" : `${x.aperti} su ${x.obblighi}`}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}

        <h2>7. Conformità ai requisiti della norma</h2>
        <p>
          Sono stati valutati <strong>{k.requisitiValutati}</strong> requisiti su {k.requisitiTotali}.
          {dati.conformita !== null && <> Il grado di conformità complessivo è <strong>{dati.conformita}%</strong>.</>}
        </p>
        <p style={{ fontSize: "0.9em", opacity: 0.75 }}>
          Un requisito applicabile e non ancora valutato pesa zero: la percentuale misura quanto del sistema è
          attuato, non quanto è stato guardato.
        </p>
        <table>
          <thead><tr><th style={{ width: "8%" }}>Punto</th><th>Capitolo</th><th style={{ width: "18%" }}>Valutati</th><th style={{ width: "16%" }}>Conformità</th></tr></thead>
          <tbody>
            {capitoli.map((c) => (
              <tr key={c.key}>
                <td className="doc-mono">{c.key}</td>
                <td><strong>{c.nome}</strong><br /><span style={{ opacity: 0.7 }}>{c.descrizione}</span></td>
                <td>{c.valutati} su {c.requisiti}</td>
                <td><strong>{c.conformita}%</strong></td>
              </tr>
            ))}
          </tbody>
        </table>

        <h2>8. Firme</h2>
        <table>
          <tbody>
            <tr><td style={{ width: "50%" }}>Funzione per la prevenzione della corruzione</td><td>{s.funzionePc || "________________________"}</td></tr>
            <tr><td>{s.organoGov === "Sì" ? "Organo di governo" : "Alta direzione"}</td><td>{s.direzione || "________________________"}</td></tr>
            <tr><td>Data</td><td>{fmtData(dati.generatoIl.slice(0, 10))}</td></tr>
          </tbody>
        </table>

        <h2>Riferimenti normativi</h2>
        <ul>
          <li>UNI ISO 37001:2016 — Sistemi di gestione per la prevenzione della corruzione. Requisiti e guida all'utilizzo.</li>
          <li>D.Lgs. 231/2001 e reati presupposto contro la pubblica amministrazione.</li>
          <li>Legge 190/2012, per i rapporti con le pubbliche amministrazioni.</li>
          <li>D.Lgs. 24/2023, per il canale di segnalazione e la tutela di chi segnala.</li>
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
