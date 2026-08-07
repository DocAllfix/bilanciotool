import { fmtNum, fmtData } from "@/lib/format";
import { FirmaDocumento } from "./firma";
import { DOC, Donut, GroupBars, HBars, MatriceMaterialita } from "./charts";
import { TiptapRender, tiptapVuoto } from "./tiptap-render";
import { DEFAULT_CONVERSION_FACTORS } from "@/lib/calc/report/derived-kpi";

// Bilancio di sostenibilità impaginato (registro editoriale, copertina, indice
// GRI/ESRS). Renderizza ESCLUSIVAMENTE dallo snapshot.

type Media = {
  tipo: "img" | "chart";
  storageKey: string | null;
  chartKey: string | null;
  didascalia: string | null;
  credito: string | null;
  larghezza: "full" | "half";
  posizione: number;
};

type Snapshot = {
  generatoIl: string;
  azienda: { nome: string; settore: string | null; sede: string | null; logoKey: string | null; coverKey: string | null };
  progetto: { anno: number; standard: string; perimetro: string | null; profilo: Record<string, string>; soglia: number };
  catalogo: {
    temi: { key: string; pillar: "E" | "S" | "G"; nome: string; riferimenti: string }[];
    sezioni: { key: string; nome: string; riferimenti: string; pillar: string }[];
    kpi: { key: string; sectionKey: string; nome: string; um: string }[];
    capitoli: { key: string; nome: string }[];
  };
  materialita: {
    soglia: number;
    perTopic: Record<string, { imp: number | null; fin: number | null; materiale: boolean; valutato: boolean }>;
    materialKeys: string[];
  };
  kpi: {
    corrente: Record<string, string>;
    precedente: Record<string, string>;
    derivati: Record<string, string>;
    derivatiPrecedente: Record<string, string>;
  };
  gestione: {
    topicKey: string; politica: string | null; azioni: string | null;
    target: string | null; annoBase: string | null; annoTarget: string | null; responsabile: string | null;
  }[];
  capitoli: { templateKey: string; contenuto: unknown; media: Media[] }[];
};

const PIL: Record<string, string> = { E: "Ambiente", S: "Sociale", G: "Governance" };

export function DocumentoBilancio({ dati, imageUrls }: { dati: Snapshot; imageUrls: Map<string, string> }) {
  const { azienda, progetto: p, kpi, catalogo } = dati;
  const anno = p.anno;
  const d = kpi.derivati;
  const dp = kpi.derivatiPrecedente;
  const capitoloPer = new Map(dati.capitoli.map((c) => [c.templateKey, c]));
  const gestionePer = new Map(dati.gestione.map((g) => [g.topicKey, g]));
  const temiMateriali = catalogo.temi.filter((t) => dati.materialita.materialKeys.includes(t.key));

  const n = (k: string, dec = 0) => (kpi.corrente[k] !== undefined ? fmtNum(kpi.corrente[k], dec) : "—");
  const np = (k: string, dec = 0) => (kpi.precedente[k] !== undefined ? fmtNum(kpi.precedente[k], dec) : "—");
  const dl = (k: string) => {
    const c = Number(kpi.corrente[k]);
    const pr = Number(kpi.precedente[k]);
    if (!Number.isFinite(c) || !Number.isFinite(pr) || pr === 0 || kpi.corrente[k] === undefined || kpi.precedente[k] === undefined) return "—";
    const v = ((c - pr) / Math.abs(pr)) * 100;
    return `${v > 0 ? "+" : ""}${fmtNum(v, 1)}%`;
  };
  const der = (k: string, dec = 2) => fmtNum(d[k], dec);
  const derP = (k: string, dec = 2) => fmtNum(dp[k], dec);

  const T = ({ righe }: { righe: [string, string, string, string, string][] }) => (
    <table>
      <thead>
        <tr><th>Indicatore</th><th className="doc-num">{anno}</th><th className="doc-num">{anno - 1}</th><th style={{ width: 60 }} className="doc-num">Var.</th></tr>
      </thead>
      <tbody>
        {righe.map(([nome, cur, prev, um, varz], i) => (
          <tr key={i}>
            <td>{nome} <span className="doc-meta">{um}</span></td>
            <td className="doc-num">{cur}</td>
            <td className="doc-num">{prev}</td>
            <td className="doc-num">{varz}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );

  const MediaFig = ({ m }: { m: Media }) => (
    <figure className={`doc-fig ${m.larghezza === "half" ? "meta-colonna" : ""}`}>
      {m.tipo === "img" && m.storageKey ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={imageUrls.get(m.storageKey) ?? ""} alt={m.didascalia ?? ""} />
      ) : (
        <ChartDaSnapshot chartKey={m.chartKey ?? ""} dati={dati} />
      )}
      {(m.didascalia || m.credito) && (
        <figcaption>{m.didascalia}{m.credito ? <i> — {m.credito}</i> : null}</figcaption>
      )}
    </figure>
  );

  const Capitolo = ({ chiave }: { chiave: string }) => {
    const c = capitoloPer.get(chiave);
    if (!c || tiptapVuoto(c.contenuto)) {
      return <p className="doc-manca">[Capitolo da completare al passo 5 del percorso.]</p>;
    }
    return (
      <>
        <TiptapRender doc={c.contenuto} />
        {c.media.sort((a, b) => a.posizione - b.posizione).map((m, i) => <MediaFig key={i} m={m} />)}
        <div className="doc-clear" />
      </>
    );
  };

  const Schede = ({ pillar }: { pillar: "E" | "S" | "G" }) => (
    <>
      {temiMateriali
        .filter((t) => t.pillar === pillar && (gestionePer.get(t.key)?.politica || gestionePer.get(t.key)?.azioni))
        .map((t) => {
          const g = gestionePer.get(t.key)!;
          return (
            <div key={t.key}>
              <h3>{t.nome}</h3>
              {g.politica && <p><strong>Il nostro impegno.</strong> {g.politica}</p>}
              {g.azioni && <p><strong>Cosa abbiamo fatto nell&apos;esercizio.</strong> {g.azioni}</p>}
            </div>
          );
        })}
    </>
  );

  const coverUrl = azienda.coverKey ? imageUrls.get(azienda.coverKey) : null;
  const logoUrl = azienda.logoKey ? imageUrls.get(azienda.logoKey) : null;

  return (
    <>
      <div className="doc-cover">
        {logoUrl && (
          <div className="logo">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={logoUrl} alt={`Logo ${azienda.nome}`} />
          </div>
        )}
        {coverUrl && (
          <div className="foto">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={coverUrl} alt="" />
          </div>
        )}
        <div className="testo">
          <p className="kicker">Bilancio di sostenibilità · esercizio {anno}</p>
          <h1>{azienda.nome}</h1>
          <p className="sotto">
            {[p.profilo.settore || azienda.settore, p.profilo.sede || azienda.sede].filter(Boolean).join(" · ")}
          </p>
          <p className="sotto" style={{ marginTop: 8, opacity: 0.7 }}>Redatto secondo {p.standard}</p>
        </div>
        <div className="filo" />
      </div>

      <div className="doc-corpo">
        <h2>Lettera agli stakeholder</h2>
        <Capitolo chiave="lettera" />

        <h2>Identità dell&apos;organizzazione</h2>
        <Capitolo chiave="identita" />
        <table>
          <tbody>
            <tr><td style={{ width: "38%" }}>Denominazione</td><td><strong>{azienda.nome}</strong></td></tr>
            {p.profilo.forma && <tr><td>Forma giuridica</td><td>{p.profilo.forma}</td></tr>}
            {p.profilo.piva && <tr><td>Partita IVA</td><td>{p.profilo.piva}</td></tr>}
            {p.profilo.sede && <tr><td>Sede legale</td><td>{p.profilo.sede}</td></tr>}
            {p.profilo.ateco && <tr><td>Attività (ATECO)</td><td>{p.profilo.ateco} — {p.profilo.settore}</td></tr>}
            {p.profilo.sitiop && <tr><td>Siti operativi</td><td>{p.profilo.sitiop}</td></tr>}
            {p.profilo.mercati && <tr><td>Mercati serviti</td><td>{p.profilo.mercati}</td></tr>}
            <tr><td>Dipendenti al 31/12/{anno}</td><td>{n("hr_tot")}</td></tr>
          </tbody>
        </table>
        <h3>Modello di business</h3>
        <Capitolo chiave="business" />
        <h3>Catena del valore</h3>
        <Capitolo chiave="catena" />

        <h2>Nota metodologica</h2>
        <Capitolo chiave="metodo" />
        <p><strong>Perimetro.</strong> {p.perimetro || <span className="doc-manca">da definire</span>}</p>
        <p><strong>Periodo.</strong> Esercizio {anno}, con dati comparativi {anno - 1} ove disponibili.</p>
        <p>
          <strong>Emissioni.</strong> Calcolate secondo il GHG Protocol; Scope 2 riportato con approccio location-based e market-based. Fattori applicati: gas naturale {fmtNum(DEFAULT_CONVERSION_FACTORS.gas, 4)} kgCO₂e/Smc; gasolio {fmtNum(DEFAULT_CONVERSION_FACTORS.gasolio, 3)} kgCO₂e/l; benzina {fmtNum(DEFAULT_CONVERSION_FACTORS.benzina, 3)} kgCO₂e/l; energia elettrica {fmtNum(DEFAULT_CONVERSION_FACTORS.eleLoc, 4)} kgCO₂/kWh (location) e {fmtNum(DEFAULT_CONVERSION_FACTORS.eleMkt, 3)} kgCO₂/kWh (residual mix).
        </p>
        <p className="doc-meta">Il presente documento non è stato sottoposto ad assurance esterna, salvo diversa indicazione.</p>

        <h2>Analisi di materialità</h2>
        <Capitolo chiave="stake" />
        <p>
          La valutazione ha considerato {catalogo.temi.length} temi secondo la doppia prospettiva di rilevanza — d&apos;impatto e finanziaria — su scala 1–5, con soglia fissata a {String(dati.materialita.soglia).replace(".", ",")}. Sono risultati materiali {temiMateriali.length} temi.
        </p>
        <figure className="doc-fig">
          <MatriceMaterialita
            soglia={dati.materialita.soglia}
            punti={catalogo.temi
              .map((t) => {
                const s = dati.materialita.perTopic[t.key];
                if (!s?.valutato) return null;
                return { key: t.key, imp: s.imp ?? 1, fin: s.fin ?? 1, pillar: t.pillar, materiale: s.materiale };
              })
              .filter((x): x is NonNullable<typeof x> => x !== null)}
          />
          <figcaption>Matrice di doppia rilevanza: l&apos;area evidenziata indica i temi sopra soglia.</figcaption>
        </figure>
        <table>
          <thead><tr><th>Tema materiale</th><th>Area</th><th className="doc-num">Impatto</th><th className="doc-num">Finanz.</th></tr></thead>
          <tbody>
            {temiMateriali.length ? (
              temiMateriali.map((t) => {
                const s = dati.materialita.perTopic[t.key];
                return (
                  <tr key={t.key}>
                    <td>{t.nome} <span className="doc-meta">{t.riferimenti}</span></td>
                    <td>{PIL[t.pillar]}</td>
                    <td className="doc-num">{s?.imp ?? "—"}</td>
                    <td className="doc-num">{s?.fin ?? "—"}</td>
                  </tr>
                );
              })
            ) : (
              <tr><td colSpan={4} className="doc-manca">Analisi da completare al passo 2.</td></tr>
            )}
          </tbody>
        </table>

        <h2>Responsabilità ambientale</h2>
        <h3>Energia</h3>
        <T righe={[
          ["Energia elettrica prelevata", n("en_ele"), np("en_ele"), "kWh", dl("en_ele")],
          ["di cui con garanzia d'origine", n("en_ele_go"), np("en_ele_go"), "kWh", dl("en_ele_go")],
          ["Energia autoprodotta e consumata", n("en_auto"), np("en_auto"), "kWh", dl("en_auto")],
          ["Gas naturale", n("en_gas"), np("en_gas"), "Smc", dl("en_gas")],
          ["Consumo energetico totale", der("energiaTotaleKwh", 0), derP("energiaTotaleKwh", 0), "kWh", "—"],
          ["Quota rinnovabile", der("pctRinnovabile", 1), derP("pctRinnovabile", 1), "%", "—"],
        ]} />
        <h3>Emissioni di gas serra</h3>
        <T righe={[
          ["Scope 1 — emissioni dirette", der("scope1"), derP("scope1"), "tCO₂e", "—"],
          ["Scope 2 — location-based", der("scope2Loc"), derP("scope2Loc"), "tCO₂e", "—"],
          ["Scope 2 — market-based", der("scope2Mkt"), derP("scope2Mkt"), "tCO₂e", "—"],
          ["Totale Scope 1+2 (location)", der("totScope12Loc"), derP("totScope12Loc"), "tCO₂e", "—"],
          ["Intensità carbonica", der("intensitaCo2"), derP("intensitaCo2"), "tCO₂e/M€", "—"],
        ]} />
        <h3>Acqua, rifiuti e materiali</h3>
        <T righe={[
          ["Prelievo idrico totale", n("ac_prel"), np("ac_prel"), "m³", dl("ac_prel")],
          ["Rifiuti non pericolosi", n("ri_np", 2), np("ri_np", 2), "t", dl("ri_np")],
          ["Rifiuti pericolosi", n("ri_p", 2), np("ri_p", 2), "t", dl("ri_p")],
          ["Quota avviata a recupero", der("pctRecupero", 1), derP("pctRecupero", 1), "%", "—"],
          ["Materiali riciclati sul totale", der("pctMaterialiRiciclati", 1), derP("pctMaterialiRiciclati", 1), "%", "—"],
        ]} />
        <Schede pillar="E" />

        <h2>Le persone</h2>
        <T righe={[
          ["Dipendenti al 31/12", n("hr_tot"), np("hr_tot"), "n.", dl("hr_tot")],
          ["di cui donne", n("hr_don"), np("hr_don"), "n.", dl("hr_don")],
          ["Presenza femminile", der("pctDonne", 1), derP("pctDonne", 1), "%", "—"],
          ["Tempo indeterminato", der("pctIndeterminato", 1), derP("pctIndeterminato", 1), "%", "—"],
          ["Assunzioni", n("hr_ass"), np("hr_ass"), "n.", dl("hr_ass")],
          ["Cessazioni", n("hr_ces"), np("hr_ces"), "n.", dl("hr_ces")],
          ["Lavoratori con disabilità", n("hr_dis"), np("hr_dis"), "n.", dl("hr_dis")],
        ]} />
        <h3>Salute e sicurezza</h3>
        <T righe={[
          ["Ore lavorate", n("si_ore"), np("si_ore"), "ore", dl("si_ore")],
          ["Infortuni registrabili", n("si_inf"), np("si_inf"), "n.", dl("si_inf")],
          ["Indice di frequenza", der("indiceFrequenza"), derP("indiceFrequenza"), "per 10⁶ ore", "—"],
          ["Indice di gravità", der("indiceGravita"), derP("indiceGravita"), "per 10³ ore", "—"],
        ]} />
        <h3>Formazione e retribuzioni</h3>
        <T righe={[
          ["Ore di formazione erogate", n("fo_ore"), np("fo_ore"), "ore", dl("fo_ore")],
          ["Ore per addetto", der("oreFormazionePerAddetto", 1), derP("oreFormazionePerAddetto", 1), "ore", "—"],
          ["Divario retributivo di genere", der("payGapPct", 1), derP("payGapPct", 1), "%", "—"],
        ]} />
        <Schede pillar="S" />

        <h2>Governance, etica e catena di fornitura</h2>
        <T righe={[
          ["Componenti dell'organo amministrativo", n("go_cda"), np("go_cda"), "n.", dl("go_cda")],
          ["Presenza femminile nell'organo", der("pctDonneCda", 1), derP("pctDonneCda", 1), "%", "—"],
          ["Segnalazioni ricevute", n("go_seg"), np("go_seg"), "n.", dl("go_seg")],
          ["Episodi di corruzione accertati", n("go_cor"), np("go_cor"), "n.", dl("go_cor")],
          ["Fornitori attivi", n("ec_for"), np("ec_for"), "n.", dl("ec_for")],
          ["Fornitori con sede in Italia", der("pctFornitoriLocali", 1), derP("pctFornitoriLocali", 1), "%", "—"],
          ["Fornitori valutati su criteri ESG", der("pctFornitoriEsg", 1), derP("pctFornitoriEsg", 1), "%", "—"],
        ]} />
        <Schede pillar="G" />

        <h2>Obiettivi di miglioramento</h2>
        <table>
          <thead><tr><th>Tema</th><th>Obiettivo</th><th>Base</th><th>Traguardo</th><th>Responsabile</th></tr></thead>
          <tbody>
            {temiMateriali.filter((t) => gestionePer.get(t.key)?.target).length ? (
              temiMateriali
                .filter((t) => gestionePer.get(t.key)?.target)
                .map((t) => {
                  const g = gestionePer.get(t.key)!;
                  return (
                    <tr key={t.key}>
                      <td>{t.nome}</td><td>{g.target}</td><td>{g.annoBase || "—"}</td><td>{g.annoTarget || "—"}</td><td>{g.responsabile || "—"}</td>
                    </tr>
                  );
                })
            ) : (
              <tr><td colSpan={5} className="doc-manca">Nessun obiettivo inserito al passo 4.</td></tr>
            )}
          </tbody>
        </table>
        <Capitolo chiave="impegni" />

        <h2>Indice dei contenuti</h2>
        <table>
          <thead><tr><th>Ambito rendicontato</th><th>Riferimento</th></tr></thead>
          <tbody>
            <tr><td>Informazioni generali sull&apos;organizzazione</td><td className="doc-meta">GRI 2-1/2-6 · ESRS 2 BP/GOV/SBM</td></tr>
            <tr><td>Analisi di materialità</td><td className="doc-meta">GRI 3-1/3-2 · ESRS 1 §3, IRO-1</td></tr>
            {catalogo.sezioni.map((s) => (
              <tr key={s.key}><td>{s.nome}</td><td className="doc-meta">{s.riferimenti}</td></tr>
            ))}
            <tr><td>Politiche, azioni e obiettivi sui temi materiali</td><td className="doc-meta">GRI 3-3 · ESRS MDR-P/A/T</td></tr>
          </tbody>
        </table>
        <p className="doc-meta" style={{ marginTop: 18 }}>
          Documento generato il {fmtData(dati.generatoIl)}{p.profilo.contatto ? ` · ${p.profilo.contatto}` : ""}
        </p>
        <FirmaDocumento dati={dati} />
      </div>
    </>
  );
}

// I 7 diagrammi inseribili nei capitoli, alimentati dallo snapshot.
function ChartDaSnapshot({ chartKey, dati }: { chartKey: string; dati: Snapshot }) {
  const { kpi } = dati;
  const anno = dati.progetto.anno;
  const d = kpi.derivati;
  const dp = kpi.derivatiPrecedente;
  const v = (k: string) => Number(kpi.corrente[k] ?? 0);
  const f = DEFAULT_CONVERSION_FACTORS;

  switch (chartKey) {
    case "emissioni":
      return (
        <GroupBars
          unita="tCO₂e"
          decimali={2}
          gruppi={[
            { nome: String(anno - 1), valori: [Number(dp.scope1), Number(dp.scope2Loc), Number(dp.scope2Mkt)] },
            { nome: String(anno), valori: [Number(d.scope1), Number(d.scope2Loc), Number(d.scope2Mkt)] },
          ]}
          serie={[
            { nome: "Scope 1", colore: DOC.scope1 },
            { nome: "Scope 2 location", colore: DOC.scope2 },
            { nome: "Scope 2 market", colore: DOC.scope3 },
          ]}
        />
      );
    case "energia":
      return (
        <Donut
          unita="kWh totali"
          voci={[
            { nome: "Elettricità di rete", valore: Math.max(0, v("en_ele") - v("en_ele_go")), colore: DOC.g },
            { nome: "Elettricità con garanzia d'origine", valore: v("en_ele_go"), colore: DOC.scope1 },
            { nome: "Autoproduzione rinnovabile", valore: v("en_auto"), colore: DOC.e },
            { nome: "Gas naturale", valore: v("en_gas") * Number(f.kwhSmc), colore: DOC.scope3 },
            {
              nome: "Carburanti flotta e generatori",
              valore: (v("en_gasolio") + v("en_flotta_d")) * Number(f.kwhLGasolio) + v("en_flotta_b") * Number(f.kwhLBenzina) + v("en_gpl") * Number(f.kwhKgGpl),
              colore: "#8a7b5c",
            },
          ]}
        />
      );
    case "persone": {
      const tot = v("hr_tot") || 1;
      return (
        <HBars
          unita="numero di dipendenti al 31/12"
          voci={[
            { nome: "Donne", valore: v("hr_don"), colore: DOC.s, suffisso: ` (${fmtNum((v("hr_don") / tot) * 100, 1)}%)` },
            { nome: "Uomini", valore: tot - v("hr_don"), colore: "#9a8fc4" },
            { nome: "Tempo indeterminato", valore: v("hr_ind"), colore: DOC.scope1 },
            { nome: "Under 30", valore: v("hr_u30"), colore: DOC.g },
            { nome: "Over 50", valore: v("hr_o50"), colore: "#7fa0bd" },
            { nome: "Con disabilità", valore: v("hr_dis"), colore: DOC.scope3 },
          ]}
        />
      );
    }
    case "sicurezza":
      return (
        <GroupBars
          unita="indici infortunistici"
          decimali={2}
          gruppi={[
            { nome: String(anno - 1), valori: [Number(dp.indiceFrequenza), Number(dp.indiceGravita)] },
            { nome: String(anno), valori: [Number(d.indiceFrequenza), Number(d.indiceGravita)] },
          ]}
          serie={[
            { nome: "Frequenza (per 10⁶ ore)", colore: DOC.s },
            { nome: "Gravità (per 10³ ore)", colore: DOC.scope3 },
          ]}
        />
      );
    case "rifiuti":
      return (
        <GroupBars
          unita="t"
          decimali={1}
          gruppi={[
            { nome: String(anno - 1), valori: [Number(kpi.precedente.ri_np ?? 0), Number(kpi.precedente.ri_p ?? 0), Number(kpi.precedente.ri_rec ?? 0)] },
            { nome: String(anno), valori: [v("ri_np"), v("ri_p"), v("ri_rec")] },
          ]}
          serie={[
            { nome: "Non pericolosi", colore: DOC.e },
            { nome: "Pericolosi", colore: "#a33d32" },
            { nome: "A recupero", colore: DOC.scope1 },
          ]}
        />
      );
    case "fornitori":
      return (
        <HBars
          unita="numero di fornitori"
          voci={[
            { nome: "Fornitori attivi", valore: v("ec_for"), colore: DOC.g },
            { nome: "Con sede in Italia", valore: v("ec_loc"), colore: DOC.scope1 },
            { nome: "Valutati su criteri ESG", valore: v("go_forq"), colore: DOC.e },
          ]}
        />
      );
    case "materialita":
      return (
        <MatriceMaterialita
          soglia={dati.materialita.soglia}
          punti={dati.catalogo.temi
            .map((t) => {
              const s = dati.materialita.perTopic[t.key];
              if (!s?.valutato) return null;
              return { key: t.key, imp: s.imp ?? 1, fin: s.fin ?? 1, pillar: t.pillar, materiale: s.materiale };
            })
            .filter((x): x is NonNullable<typeof x> => x !== null)}
        />
      );
    default:
      return null;
  }
}
