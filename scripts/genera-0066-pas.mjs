// Genera la migrazione 0066_pas_rls.sql dai domini ESTRATTI dal prototipo.
//
//   node scripts/genera-0066-pas.mjs
//
// ⚠️ PERCHE' UN GENERATORE, come per la 0063 del GDPR. I CHECK dei domini chiusi ripetono le
// etichette del prototipo (categorie dei fornitori, canali dei reclami, tipi di emergenza…):
// riscritte a mano, un apostrofo o una lettera accentata sbagliata produrrebbe un vincolo che
// rifiuta un valore che l'interfaccia propone — «Opportunità» con l'accento sbagliato, e il
// primo fattore positivo di un cliente non si salva. Qui le liste vengono da `pas-domini.json`
// e dai cataloghi estratti, gli stessi file da cui il codice prende le opzioni; il test
// `pas-domini-pure` verifica che la migrazione le contenga tutte.
//
// La migrazione generata si committa e da li' in poi e' un file come gli altri: questo
// script non gira nel rilascio.

import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const dati = (f) => JSON.parse(readFileSync(join(root, "src", "lib", "db", "seeds", "data", f), "utf8"));
const domini = dati("pas-domini.json");
const reg = domini.registri;
const contenuti = dati("pas-politica.json").contenuti.map((c) => c.key);
const allegato = dati("pas-gruppi.json").filter((g) => g.natura === "allegato").map((g) => g.key);
// Rischi e obiettivi si collocano in un'area dell'Allegato A oppure in C5, «Sistema di
// gestione»: e' l'elenco che il prototipo propone in entrambe le tendine.
const AREE_LAVORO = [...allegato, "C5"];

const lit = (s) => `'${String(s).replaceAll("'", "''")}'`;
const elenco = (L) => `ARRAY[${L.filter((x) => x !== "").map(lit).join(", ")}]::text[]`;
const pretendi = (L, nome) => {
  if (!Array.isArray(L) || L.length === 0) throw new Error(`Dominio mancante o vuoto: ${nome}`);
  return L;
};

/** Un valore ammesso, oppure NULL. */
const inElenco = (col, L, nome = col) => `(${col} IS NULL OR ${col} = ANY (${elenco(pretendi(L, nome))}))`;
/** Un valore ammesso, mai NULL. */
const sempre = (col, L, nome = col) => `(${col} = ANY (${elenco(pretendi(L, nome))}))`;
const nonNegativo = (...col) => col.map((c) => `(${c} IS NULL OR ${c} >= 0)`).join(" AND ");

const TENANT = [
  "pas_system", "pas_fattore", "pas_parte", "pas_requisito_stato", "pas_rischio", "pas_fornitore", "pas_obiettivo",
  "pas_attivita", "pas_misura", "pas_reclamo", "pas_non_conformita", "pas_formazione", "pas_emergenza",
  "pas_comunicazione", "pas_consultazione", "pas_audit", "pas_riesame",
];
const CATALOGHI = [
  "pas_gruppo", "pas_requisito", "pas_parte_tipo", "pas_rischio_tipo", "pas_scala", "pas_sezione", "pas_indicatore",
  "pas_attivita_tipo", "pas_contenuto_politica", "pas_testo",
];

const check = (tabella, nome, espressione) =>
  `ALTER TABLE ${tabella} ADD CONSTRAINT ${tabella}_${nome}_ck CHECK (${espressione});`;

const vincoli = [
  // ── Radice ──
  // Le soglie devono restare coerenti: l'orario complessivo non sotto quello ordinario e
  // dentro la settimana, le settimane dentro l'anno, i livelli di rischio ordinati e dentro
  // la matrice 5 × 5. Una soglia «alto» sotto «medio» renderebbe medio ogni rischio alto.
  check(
    "pas_system",
    "parametri",
    "param_ore_ordinarie BETWEEN 1 AND 168 AND param_ore_totali BETWEEN param_ore_ordinarie AND 168" +
      " AND param_settimane BETWEEN 1 AND 53" +
      " AND param_medio >= 1 AND param_alto > param_medio AND param_alto <= 25" +
      " AND param_giorni_reclamo >= 1",
  ),
  check("pas_system", "politica_contenuti", `politica_contenuti <@ ${elenco(pretendi(contenuti, "contenuti"))}`),

  // ── Contesto ──
  check("pas_fattore", "tipo", sempre("tipo", domini.tipiFattore, "tipiFattore")),
  check("pas_fattore", "effetto", sempre("effetto", domini.effettiFattore, "effettiFattore")),

  // ── Requisiti ──
  check("pas_requisito_stato", "stato", inElenco("stato", domini.stati.map((s) => s.key), "stati")),

  // ── Rischi e fornitori ──
  check("pas_rischio", "area", sempre("area", AREE_LAVORO, "aree")),
  check("pas_rischio", "ambito", sempre("ambito", domini.ambiti.map((a) => a.key), "ambiti")),
  check("pas_rischio", "punteggi", "(probabilita IS NULL OR probabilita BETWEEN 1 AND 5) AND (gravita IS NULL OR gravita BETWEEN 1 AND 5)"),
  check("pas_fornitore", "categoria", sempre("categoria", domini.categorieFornitore, "categorieFornitore")),
  check("pas_fornitore", "rischio", inElenco("rischio", domini.rischiFornitore, "rischiFornitore")),
  check("pas_fornitore", "esito", inElenco("esito", domini.esitiFornitore, "esitiFornitore")),

  // ── Obiettivi, piano, misure ──
  check("pas_obiettivo", "area", sempre("area", AREE_LAVORO, "aree")),
  check("pas_obiettivo", "stato", sempre("stato", domini.statiObiettivo, "statiObiettivo")),
  check("pas_attivita", "mese", "mese BETWEEN 1 AND 12"),
  check("pas_attivita", "stato", sempre("stato", domini.statiAttivita, "statiAttivita")),
  // Nessuno dei trentacinque indicatori e' con segno: persone, ore, euro, giorni, eventi.
  check("pas_misura", "valore", "valore >= 0"),

  // ── Registri ──
  check("pas_reclamo", "canale", inElenco("canale", reg.reclamoCanale, "reclamoCanale")),
  check("pas_reclamo", "provenienza", inElenco("provenienza", reg.reclamoProvenienza, "reclamoProvenienza")),
  check("pas_reclamo", "area", inElenco("area", allegato, "allegato")),
  check("pas_reclamo", "esito", sempre("esito", reg.reclamoEsito, "reclamoEsito")),
  check("pas_non_conformita", "origine", inElenco("origine", reg.ncOrigine, "ncOrigine")),
  check("pas_non_conformita", "efficacia", sempre("efficacia", reg.ncEfficacia, "ncEfficacia")),
  check("pas_formazione", "numeri", nonNegativo("partecipanti", "ore")),
  check("pas_emergenza", "tipo", sempre("tipo", reg.emergenzaTipo, "emergenzaTipo")),
  check("pas_comunicazione", "tipo", sempre("tipo", reg.comunicazioneTipo, "comunicazioneTipo")),
  check("pas_consultazione", "forma", sempre("forma", reg.consultazioneForma, "consultazioneForma")),
  check("pas_consultazione", "partecipanti", nonNegativo("partecipanti")),
  check("pas_audit", "stato", sempre("stato", reg.auditStato, "auditStato")),
  check("pas_audit", "rilievi", nonNegativo("rilievi")),

  // ── Cataloghi ──
  check("pas_gruppo", "natura", sempre("natura", ["sistema", "allegato"])),
  check("pas_rischio_tipo", "ambito", sempre("ambito", domini.ambiti.map((a) => a.key), "ambiti")),
  check("pas_scala", "asse", sempre("asse", ["probabilita", "gravita"]) + " AND valore BETWEEN 1 AND 5"),
  check("pas_attivita_tipo", "mese", "mese BETWEEN 1 AND 12"),
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

const testo = `-- Isolamento multi-tenant, domini chiusi e trigger del percorso Sistema di gestione sociale
-- (PAS 24000:2022).
--
-- ⚠️ GENERATA da scripts/genera-0066-pas.mjs, che legge le etichette dai domini estratti
-- dal prototipo: le liste dei CHECK sono le stesse da cui l'interfaccia prende le opzioni.
-- Va nello stesso rilascio della 0065: RLS forzata senza policy e' un deny-all, e in
-- sviluppo la connessione privilegiata non lo mostra.

-- Il dominio di un content set e' un elenco chiuso: si riscrive INTERO, perche' un ALTER
-- che elencasse solo il valore nuovo cancellerebbe gli altri.
ALTER TABLE "content_set" DROP CONSTRAINT IF EXISTS "content_set_dominio_ck";
--> statement-breakpoint
ALTER TABLE "content_set" ADD CONSTRAINT "content_set_dominio_ck"
  CHECK ("dominio" = ANY (ARRAY['ghg','report','energy','supplier','soa','mog231',
                               'iso37001','sgiqas','sa8000','filiera','wb','sgesg','nis2','gdpr','pas']));
--> statement-breakpoint

-- ======================= TABELLE TENANT (match su org) ======================
${tenant}
--> statement-breakpoint

-- ==================== CATALOGHI (non-tenant, sola lettura) ==================
${cataloghi}
--> statement-breakpoint

-- ⚠️ Il trigger \`azienda_scrivibile\` non si aggiunge da solo: la 0061 l'ha creato con un ciclo
-- sulle tabelle che esistevano allora. Va sulla radice — l'unica tabella del percorso che porta
-- \`company_id\` — e \`azienda-scrivibile-copertura.db\` lo pretende su ogni tabella con una
-- chiave verso \`company\`. Le figlie si fermano in \`pretendiSistema\`.
CREATE TRIGGER azienda_scrivibile BEFORE INSERT OR UPDATE OF company_id, organization_id ON pas_system
  FOR EACH ROW EXECUTE FUNCTION azienda_scrivibile('lavoro');
--> statement-breakpoint

-- ======================== DOMINI CHIUSI (CHECK a mano) ======================
--
-- Drizzle non genera i CHECK per \`text({ enum })\`: senza, il database accetterebbe
-- qualunque stringa.
${vincoli.join("\n--> statement-breakpoint\n")}
`;

writeFileSync(join(root, "src", "lib", "db", "migrations", "0066_pas_rls.sql"), testo);
console.log(`0066_pas_rls.sql: ${TENANT.length} tabelle tenant, ${CATALOGHI.length} cataloghi, ${vincoli.length} vincoli`);
