import { fmtData } from "@/lib/format";
import { marchioDelloSnapshot } from "@/features/documents/marchio";
import { DOC } from "./charts";

// I due documenti FIRMATI del sistema integrato: Analisi ambientale e Valutazione dei
// rischi per la salute e la sicurezza.
//
// ⚠️ Un template solo per due documenti, e non è pigrizia: hanno la stessa forma — un
// registro con un verdetto calcolato per riga, un riepilogo del verdetto, e le firme di
// chi se ne assume la responsabilità — e differiscono per il contenuto, non per la
// struttura. Due copie divergerebbero alla prima correzione, e la seconda finirebbe su un
// documento firmato.
//
// ⚠️ Il verdetto arriva CALCOLATO dallo snapshot, non si ricalcola qui. È lo stesso
// motore che il registro mostra a schermo, congelato al momento della pubblicazione: chi
// firma sottoscrive quello che ha visto.
//
// ⚠️ Le righe NON VALUTATE si contano e si dichiarano, non si nascondono. In un documento
// firmato dal datore di lavoro, tacere che quindici pericoli non sono ancora stati
// valutati è la dichiarazione sbagliata — e `livelloRischio` restituisce `null` proprio
// per non lasciar credere che un rischio non misurato sia un rischio basso.

type Riga = {
  riferimento: string | null;
  dati: Record<string, unknown>;
  verdetto: string | null;
};

type Snapshot = {
  generatoIl: string;
  azienda: { id: string; nome: string; settore: string | null; sede: string | null };
  sistema: Record<string, string | null>;
  colonne: { chiave: string; etichetta: string }[];
  righe: Riga[];
};

const RIQUADRO = {
  border: `1.5px solid ${DOC.ink}`,
  background: DOC.accentBg,
  padding: "14px 18px",
  margin: "22px 0",
} as const;

const testo = (v: unknown) => {
  const t = String(v ?? "").trim();
  return t.length ? t : null;
};

export function DocumentoRegistroFirmato({
  dati,
  titolo,
  kicker,
  norma,
  /** Le colonne da stampare in tabella: il registro ne ha troppe per una pagina A4. */
  colonne,
  etichettaVerdetto,
  /** I verdetti che chiedono un'azione, nell'ordine in cui vanno guardati. */
  gravi,
  premessa,
  firme,
}: {
  dati: Snapshot;
  titolo: string;
  kicker: string;
  norma: string;
  colonne: string[];
  etichettaVerdetto: string;
  gravi: string[];
  premessa: React.ReactNode;
  firme: string[];
}) {
  const { azienda, sistema: s, righe } = dati;
  const marchio = marchioDelloSnapshot(dati);

  const etichette = new Map(dati.colonne.map((c) => [c.chiave, c.etichetta]));
  const valutate = righe.filter((r) => r.verdetto !== null);
  const nonValutate = righe.filter((r) => r.verdetto === null);
  const daPresidiare = righe.filter((r) => r.verdetto && gravi.includes(r.verdetto));

  const perVerdetto = new Map<string, number>();
  for (const r of valutate) perVerdetto.set(r.verdetto!, (perVerdetto.get(r.verdetto!) ?? 0) + 1);

  return (
    <>
      <div className="doc-cover">
        <div className="testo">
          <p className="kicker">{kicker}</p>
          <h1>{s.ragione || azienda.nome}</h1>
          <p className="sotto">{[s.sede || azienda.sede, s.settore || azienda.settore].filter(Boolean).join(" · ")}</p>
          <p className="sotto" style={{ marginTop: 8, opacity: 0.7 }}>
            {norma}
            {s.revisione ? ` · revisione ${s.revisione}` : ""}
          </p>
        </div>
        <div className="filo" />
      </div>

      <div className="doc-corpo">
        <h2>1. Oggetto</h2>
        {premessa}

        <div style={RIQUADRO}>
          <p>
            <strong>Che cosa dichiara questo documento.</strong>{" "}
            Riporta {righe.length} voci del registro, con il giudizio calcolato per ciascuna secondo il
            metodo dichiarato al punto 3. Il giudizio è congelato alla data di emissione: modifiche
            successive al registro non alterano questa revisione.
          </p>
          {nonValutate.length > 0 && (
            <p>
              <strong>Voci non ancora valutate: {nonValutate.length}.</strong>{" "}
              Sono elencate al punto 5 e <strong>non</strong> sono classificate come prive di rilievo. Una
              voce non misurata non è una voce sicura, ed è la ragione per cui compaiono in un documento
              firmato invece di essere taciute.
            </p>
          )}
        </div>

        <h2>2. Identificazione</h2>
        <table>
          <tbody>
            <tr><td style={{ width: "38%" }}>Organizzazione</td><td><strong>{s.ragione || azienda.nome}</strong></td></tr>
            {s.piva && <tr><td>Partita IVA / C.F.</td><td className="doc-mono">{s.piva}</td></tr>}
            {(s.sede || azienda.sede) && <tr><td>Sede legale</td><td>{s.sede || azienda.sede}</td></tr>}
            {s.siti && <tr><td>Siti nel campo di applicazione</td><td>{s.siti}</td></tr>}
            {s.direzione && <tr><td>Alta direzione</td><td>{s.direzione}</td></tr>}
            {s.rspp && <tr><td>RSPP</td><td>{s.rspp}</td></tr>}
            {s.rls && <tr><td>RLS</td><td>{s.rls}</td></tr>}
            {s.medico && <tr><td>Medico competente</td><td>{s.medico}</td></tr>}
            {s.responsabileSistema && <tr><td>Responsabile del sistema</td><td>{s.responsabileSistema}</td></tr>}
          </tbody>
        </table>

        <h2>3. Esito della valutazione</h2>
        <table>
          <thead>
            <tr>
              <th>{etichettaVerdetto}</th>
              <th style={{ width: "22%" }}>Voci</th>
            </tr>
          </thead>
          <tbody>
            {[...perVerdetto.entries()].map(([v, n]) => (
              <tr key={v}>
                <td><strong>{v}</strong></td>
                <td>{n}</td>
              </tr>
            ))}
            {nonValutate.length > 0 && (
              <tr>
                <td><span className="doc-manca">Non ancora valutate</span></td>
                <td>{nonValutate.length}</td>
              </tr>
            )}
          </tbody>
        </table>

        {daPresidiare.length > 0 && (
          <>
            <h2>4. Voci che richiedono azione</h2>
            <p>
              Sono le voci il cui giudizio impone un presidio o un intervento. L&apos;ordine è quello del
              registro; il rimedio e il responsabile sono nelle rispettive colonne.
            </p>
            <table>
              <thead>
                <tr>
                  <th style={{ width: "10%" }}>Rif.</th>
                  {colonne.map((c) => (
                    <th key={c}>{etichette.get(c) ?? c}</th>
                  ))}
                  <th style={{ width: "16%" }}>{etichettaVerdetto}</th>
                </tr>
              </thead>
              <tbody>
                {daPresidiare.map((r, i) => (
                  <tr key={r.riferimento ?? i}>
                    <td className="doc-mono">{r.riferimento ?? "—"}</td>
                    {colonne.map((c) => (
                      <td key={c}>{testo(r.dati[c]) ?? <span className="doc-manca">—</span>}</td>
                    ))}
                    <td><strong>{r.verdetto}</strong></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}

        {nonValutate.length > 0 && (
          <>
            <h2>5. Voci non ancora valutate</h2>
            <p>
              Compaiono nel registro senza un giudizio: mancano i dati necessari a formularlo. Restano qui
              perché il documento dichiari ciò che non sa, invece di lasciar credere che non ci sia nulla da
              dire.
            </p>
            <table>
              <thead>
                <tr>
                  <th style={{ width: "10%" }}>Rif.</th>
                  {colonne.map((c) => (
                    <th key={c}>{etichette.get(c) ?? c}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {nonValutate.map((r, i) => (
                  <tr key={r.riferimento ?? i}>
                    <td className="doc-mono">{r.riferimento ?? "—"}</td>
                    {colonne.map((c) => (
                      <td key={c}>{testo(r.dati[c]) ?? <span className="doc-manca">—</span>}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}

        <h2>{nonValutate.length > 0 ? 6 : daPresidiare.length > 0 ? 5 : 4}. Registro completo</h2>
        <table>
          <thead>
            <tr>
              <th style={{ width: "10%" }}>Rif.</th>
              {colonne.map((c) => (
                <th key={c}>{etichette.get(c) ?? c}</th>
              ))}
              <th style={{ width: "16%" }}>{etichettaVerdetto}</th>
            </tr>
          </thead>
          <tbody>
            {righe.map((r, i) => (
              <tr key={r.riferimento ?? i}>
                <td className="doc-mono">{r.riferimento ?? "—"}</td>
                {colonne.map((c) => (
                  <td key={c}>{testo(r.dati[c]) ?? <span className="doc-manca">—</span>}</td>
                ))}
                <td>{r.verdetto ?? <span className="doc-manca">da valutare</span>}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <h2>Firme</h2>
        <p>
          Con la sottoscrizione i firmatari attestano di aver preso visione del contenuto e di assumersene
          la responsabilità per quanto di competenza.
        </p>
        <table>
          <tbody>
            {firme.map((f) => (
              <tr key={f}>
                <td style={{ width: "42%" }}>{f}</td>
                <td style={{ height: "48px" }} />
              </tr>
            ))}
          </tbody>
        </table>

        <p className="doc-meta">
          {titolo} emessa da {marchio.nome} per {s.ragione || azienda.nome} · generata il{" "}
          {fmtData(dati.generatoIl.slice(0, 10))}.
        </p>
      </div>
    </>
  );
}
