// Genera la migrazione 0063_gdpr_rls.sql dai domini ESTRATTI dal prototipo.
//
//   node scripts/genera-0063-gdpr.mjs
//
// ⚠️ PERCHE' UN GENERATORE. I CHECK dei domini chiusi ripetono le etichette del prototipo
// (basi giuridiche, condizioni dell'art. 9, qualifiche, garanzie, opzioni dei registri):
// riscritte a mano, un apostrofo o una lettera accentata sbagliata produrrebbe un vincolo
// che rifiuta un valore che l'interfaccia propone — e lo si scoprirebbe al primo salvataggio
// di un cliente. Qui le liste vengono da `gdpr-domini.json` e `gdpr-registri.json`, gli
// stessi file da cui il codice prende le opzioni; il test `gdpr-domini-pure` lo verifica.
//
// La migrazione generata si committa e da li' in poi e' un file come gli altri: questo
// script non gira nel rilascio.

import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const dati = (f) => JSON.parse(readFileSync(join(root, "src", "lib", "db", "seeds", "data", f), "utf8"));
const domini = dati("gdpr-domini.json");
const registri = Object.fromEntries(dati("gdpr-registri.json").map((r) => [r.key, Object.fromEntries(r.colonne.map((c) => [c.chiave, c]))]));
const criteri = dati("gdpr-criteri.json").map((c) => c.key);
const contenuti = dati("gdpr-politica.json").contenuti.map((c) => c.key);

const lit = (s) => `'${String(s).replaceAll("'", "''")}'`;
const elenco = (L) => `ARRAY[${L.filter((x) => x !== "").map(lit).join(", ")}]::text[]`;
const opzioni = (reg, col) => {
  const o = registri[reg]?.[col]?.opzioni;
  if (!o) throw new Error(`Opzioni mancanti: ${reg}.${col}`);
  return o.filter((x) => x !== "");
};

/** Un valore ammesso, oppure NULL. */
const inElenco = (col, L) => `(${col} IS NULL OR ${col} = ANY (${elenco(L)}))`;
/** Un valore ammesso, mai NULL. */
const sempre = (col, L) => `(${col} = ANY (${elenco(L)}))`;

const SI_NO = ["Sì", "No"];
const RUOLI_SISTEMA = ["Titolare del trattamento", "Titolare e responsabile per conto di clienti", "Contitolare con altri soggetti"];
const RUOLI_TRATTAMENTO = ["Titolare", "Contitolare", "Responsabile"];
const STATI_DPIA = ["Da avviare", "In corso", "Conclusa"];
const ESITI_DPIA = ["Rischio residuo accettabile", "Consultazione preventiva del Garante"];
const CONTRATTI = ["Sì", "No", "Non dovuto"];
const ESITI_FORNITORE = ["Adeguato", "Azioni richieste", "Critico"];
const STATI_ATTIVITA = ["Da fare", "In corso", "Fatto"];

const TENANT = [
  "gdpr_system", "gdpr_trattamento", "gdpr_requisito_stato", "gdpr_fornitore", "gdpr_documento", "gdpr_attivita",
  "gdpr_misura", "gdpr_richiesta", "gdpr_violazione", "gdpr_formazione", "gdpr_verifica", "gdpr_verifica_ads", "gdpr_riesame",
];
const CATALOGHI = [
  "gdpr_gruppo", "gdpr_requisito", "gdpr_criterio", "gdpr_trattamento_tipo", "gdpr_scala", "gdpr_sezione",
  "gdpr_indicatore", "gdpr_documento_tipo", "gdpr_attivita_tipo", "gdpr_contenuto_politica", "gdpr_testo",
];

const check = (tabella, nome, espressione) =>
  `ALTER TABLE ${tabella} ADD CONSTRAINT ${tabella}_${nome}_ck CHECK (${espressione});`;

const vincoli = [
  // ── Radice ──
  check("gdpr_system", "amministratori", inElenco("amministratori", SI_NO)),
  check("gdpr_system", "dpo", ["dpo_a", "dpo_b", "dpo_c"].map((c) => inElenco(c, SI_NO)).join(" AND ")),
  check("gdpr_system", "ruolo", inElenco("ruolo", RUOLI_SISTEMA)),
  // Le soglie devono restare ordinate e dentro la matrice 5 × 5, e almeno un criterio deve
  // far scattare la DPIA: con zero, ogni trattamento la richiederebbe.
  check("gdpr_system", "parametri", "param_medio >= 1 AND param_alto > param_medio AND param_alto <= 25 AND param_soglia_dpia BETWEEN 1 AND 9"),
  check("gdpr_system", "politica_contenuti", `politica_contenuti <@ ${elenco(contenuti)}`),

  // ── Trattamenti ──
  check("gdpr_trattamento", "ruolo", sempre("ruolo", RUOLI_TRATTAMENTO)),
  check("gdpr_trattamento", "base", inElenco("base", domini.basi)),
  check("gdpr_trattamento", "bilanciamento", inElenco("bilanciamento", SI_NO)),
  check("gdpr_trattamento", "condizione9", inElenco("condizione9", domini.condizioni9)),
  check("gdpr_trattamento", "criteri", `criteri <@ ${elenco(criteri)}`),
  check("gdpr_trattamento", "punteggi", "(probabilita IS NULL OR probabilita BETWEEN 1 AND 5) AND (gravita IS NULL OR gravita BETWEEN 1 AND 5)"),
  check("gdpr_trattamento", "dpia_stato", sempre("dpia_stato", STATI_DPIA)),
  check("gdpr_trattamento", "dpia_esito", inElenco("dpia_esito", ESITI_DPIA)),

  // ── Requisiti ──
  check("gdpr_requisito_stato", "stato", inElenco("stato", domini.stati.map((s) => s.key))),

  // ── Fornitori ──
  check("gdpr_fornitore", "qualifica", sempre("qualifica", domini.qualifiche)),
  check("gdpr_fornitore", "contratto", inElenco("contratto", CONTRATTI)),
  check("gdpr_fornitore", "garanzia", inElenco("garanzia", domini.garanzie)),
  check("gdpr_fornitore", "esito", inElenco("esito", ESITI_FORNITORE)),
  // «Non dovuto» descrive solo il titolare autonomo: con un responsabile il contratto e'
  // sempre dovuto (difetto 5 del prototipo, chiuso anche qui).
  check("gdpr_fornitore", "non_dovuto", `contratto IS DISTINCT FROM 'Non dovuto' OR qualifica = ${lit("Titolare autonomo")}`),

  // ── Inventario, piano, misure ──
  check("gdpr_documento", "tipo", sempre("tipo", domini.tipiDocumento)),
  check("gdpr_documento", "stato", sempre("stato", domini.statiDocumento)),
  check("gdpr_attivita", "mese", "mese BETWEEN 1 AND 12"),
  check("gdpr_attivita", "stato", sempre("stato", STATI_ATTIVITA)),
  check("gdpr_misura", "valore", "valore >= 0"),

  // ── Registri ──
  check("gdpr_richiesta", "diritto", sempre("diritto", opzioni("dir", "diritto"))),
  check("gdpr_richiesta", "canale", inElenco("canale", opzioni("dir", "canale"))),
  check("gdpr_richiesta", "esito", sempre("esito", opzioni("dir", "esito"))),
  check("gdpr_violazione", "natura", sempre("natura", opzioni("breach", "natura"))),
  check("gdpr_violazione", "rischio", inElenco("rischio", opzioni("breach", "rischio"))),
  check("gdpr_violazione", "interessati", "interessati IS NULL OR interessati >= 0"),
  check("gdpr_formazione", "numeri", "(partecipanti IS NULL OR partecipanti >= 0) AND (ore IS NULL OR ore >= 0)"),
  check("gdpr_verifica", "tipo", sempre("tipo", opzioni("audit", "tipo"))),
  check("gdpr_verifica", "stato", sempre("stato", opzioni("audit", "stato"))),
  check("gdpr_verifica", "rilievi", "rilievi IS NULL OR rilievi >= 0"),
  check("gdpr_verifica_ads", "registrazioni", inElenco("registrazioni_conservate", opzioni("ads", "log"))),

  // ── Cataloghi ──
  check("gdpr_scala", "asse", sempre("asse", ["probabilita", "gravita"]) + " AND valore BETWEEN 1 AND 5"),
  check("gdpr_attivita_tipo", "mese", "mese BETWEEN 1 AND 12"),
];

const tenant = `DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    ${TENANT.map(lit).join(", ")}
  ] LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', t);
    EXECUTE format(
      'CREATE POLICY %I ON %I FOR ALL TO app_rls
         USING (organization_id = current_setting(''app.org_id'', true)
                OR current_setting(''app.platform_admin'', true) = ''on'')
         WITH CHECK (organization_id = current_setting(''app.org_id'', true)
                OR current_setting(''app.platform_admin'', true) = ''on'')',
      t || '_tenant_rls', t);
  END LOOP;
END $$;`;

const cataloghi = `DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    ${CATALOGHI.map(lit).join(", ")}
  ] LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', t);
    EXECUTE format('CREATE POLICY %I ON %I FOR SELECT TO app_rls USING (true)', t || '_read', t);
    EXECUTE format(
      'CREATE POLICY %I ON %I FOR ALL TO app_rls
         USING (current_setting(''app.platform_admin'', true) = ''on'')
         WITH CHECK (current_setting(''app.platform_admin'', true) = ''on'')',
      t || '_staff', t);
  END LOOP;
END $$;`;

const testo = `-- Isolamento multi-tenant, domini chiusi e trigger del percorso Protezione dei dati (GDPR).
--
-- ⚠️ GENERATA da scripts/genera-0063-gdpr.mjs, che legge le etichette dai domini estratti
-- dal prototipo: le liste dei CHECK sono le stesse da cui l'interfaccia prende le opzioni.
-- Va nello stesso rilascio della 0062: RLS forzata senza policy e' un deny-all, e in
-- sviluppo la connessione privilegiata non lo mostra.

-- Il dominio di un content set e' un elenco chiuso: si riscrive INTERO, perche' un ALTER
-- che elencasse solo il valore nuovo cancellerebbe gli altri.
ALTER TABLE "content_set" DROP CONSTRAINT IF EXISTS "content_set_dominio_ck";
--> statement-breakpoint
ALTER TABLE "content_set" ADD CONSTRAINT "content_set_dominio_ck"
  CHECK ("dominio" = ANY (ARRAY['ghg','report','energy','supplier','soa','mog231',
                               'iso37001','sgiqas','sa8000','filiera','wb','sgesg','nis2','gdpr']));
--> statement-breakpoint

-- ======================= TABELLE TENANT (match su org) ======================
${tenant}
--> statement-breakpoint

-- ==================== CATALOGHI (non-tenant, sola lettura) ==================
${cataloghi}
--> statement-breakpoint

-- ⚠️ IL TRIGGER \`azienda_scrivibile\` NON SI AGGIUNGE DA SOLO. La 0061 l'ha creato con un
-- ciclo sulle tabelle che esistevano allora: una tabella con \`company_id\` creata dopo ne
-- resta senza, e nessun test lo notava. Qui lo si mette sulla radice — l'unica tabella del
-- percorso che porta \`company_id\` — e \`azienda-scrivibile-copertura.db\` lo pretende da ora
-- in poi su ogni tabella con una chiave verso \`company\`.
CREATE TRIGGER azienda_scrivibile BEFORE INSERT OR UPDATE OF company_id, organization_id ON gdpr_system
  FOR EACH ROW EXECUTE FUNCTION azienda_scrivibile('lavoro');
--> statement-breakpoint

-- ======================== DOMINI CHIUSI (CHECK a mano) ======================
--
-- Drizzle non genera i CHECK per \`text({ enum })\`: senza, il database accetterebbe
-- qualunque stringa.
${vincoli.join("\n--> statement-breakpoint\n")}
`;

writeFileSync(join(root, "src", "lib", "db", "migrations", "0063_gdpr_rls.sql"), testo);
console.log(`0063_gdpr_rls.sql: ${TENANT.length} tabelle tenant, ${CATALOGHI.length} cataloghi, ${vincoli.length} vincoli`);
