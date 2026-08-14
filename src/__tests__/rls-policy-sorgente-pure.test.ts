import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

// Una tabella tenant creata DOPO la 0001 deve portarsi dietro la sua policy.
//
// Perche' proprio questo, e non «ogni tabella ha una policy»: la migrazione 0001 non
// nomina le tabelle, le scorre. Crea le policy in un ciclo,
// `format('CREATE POLICY %I ON %I FOR ALL TO app_rls ...')`, su tutto quello che
// esisteva allora. Cercare `CREATE POLICY ... ON org_entitlement` nel testo non trova
// niente, e un controllo scritto su quella premessa direbbe «scoperta» una tabella
// protetta: l'ho scritto e l'ho visto sbagliare prima di correggerlo.
//
// Il ciclo pero' e' girato UNA volta sola. Ogni tabella nata dopo resta scoperta finche'
// qualcuno non le scrive la policy, ed e' esattamente il caso che `CLAUDE.md` mette per
// iscritto: «aggiungendo una tabella tenant va aggiunta la policy».
//
// Questo controllo gira SENZA database, quindi anche in CI, dove `rls-matrix.db.test.ts`
// si salta da solo perche' il committente ha deciso di non esporre il database a ogni
// workflow. I due non si sostituiscono: quello sul database dice «com'e' adesso», questo
// dice «com'e' scritto», e prende il difetto sulla modifica invece che dopo il rilascio.

const MIGRAZIONI = "src/lib/db/migrations";

/** La migrazione dopo la quale le policy vanno scritte a mano. */
const CICLO_AUTOMATICO = "0001";

/** Tabelle con `organization_id` che di proposito NON hanno una policy di tenant. */
const PASSTHROUGH_VOLUTI = new Set(["member", "invitation"]);

const file = readdirSync(MIGRAZIONI)
  .filter((f) => f.endsWith(".sql"))
  .sort();

const leggi = (f: string) => readFileSync(join(MIGRAZIONI, f), "utf8");

/** Toglie le definizioni di tabella: cosi' un nome deve comparire per un ALTRO motivo. */
function senzaDefinizioni(sql: string): string {
  return sql
    .replace(/CREATE TABLE[\s\S]*?\n\);/gi, "")
    .replace(/ALTER TABLE[^;]*ADD CONSTRAINT[^;]*;/gi, "");
}

const sqlDopo = file.filter((f) => f.slice(0, 4) > CICLO_AUTOMATICO).map(leggi).join("\n");
const sqlTutto = file.map(leggi).join("\n");

/** I nomi delle tabelle con `organization_id` dichiarate nel testo dato. */
function conOrganizzazione(sql: string): Set<string> {
  const nomi = new Set<string>();
  const rx = /CREATE TABLE(?: IF NOT EXISTS)?\s+"?([a-z0-9_]+)"?\s*\(([\s\S]*?)\n\);/gi;
  for (const m of sql.matchAll(rx)) {
    if (/"?organization_id"?\s/.test(m[2])) nomi.add(m[1]);
  }
  return nomi;
}

/** Tutte le tabelle tenant, in qualunque migrazione siano nate. */
const TUTTE_TENANT = conOrganizzazione(sqlTutto);

/** Le tabelle tenant create dopo la 0001, cioe' quelle che il ciclo non ha visto. */
function tabelleNuoveTenant(): string[] {
  return [...conOrganizzazione(sqlDopo)].filter((t) => !PASSTHROUGH_VOLUTI.has(t)).sort();
}

/** Il testo delle migrazioni che fanno una certa cosa, senza le definizioni di tabella. */
function doveSiFa(cosa: string): string {
  return file
    .filter((f) => leggi(f).includes(cosa))
    .map((f) => senzaDefinizioni(leggi(f)))
    .join("\n");
}

const nominata = (tabella: string, testo: string) => new RegExp(`\\b${tabella}\\b`).test(testo);

describe("le policy delle tabelle aggiunte dopo il ciclo automatico", () => {
  const nuove = tabelleNuoveTenant();

  it("dalla 0001 in poi sono state aggiunte tabelle tenant", () => {
    // Se questo va a zero e' la lettura a essersi rotta, non il prodotto a essersi
    // fermato: senza, il controllo diventerebbe verde per il motivo peggiore.
    expect(nuove.length).toBeGreaterThan(5);
  });

  it("ognuna e' nominata dove si creano le policy", () => {
    // La regola verificabile e' «nominata», non «esiste CREATE POLICY ... ON <tabella>».
    // Anche la 0005 usa un ciclo — `FOREACH t IN ARRAY ['energy_balance', ...]` seguito
    // da `format('CREATE POLICY %I ON %I ...')` — quindi il nome c'e', ma dentro
    // l'array. Interpretare il PL/pgSQL per saperlo sarebbe un parser dentro un test.
    //
    // Il difetto vero da prendere e' «tabella aggiunta e mai piu' nominata»: chi scrive
    // la policy la nomina per forza, in un modo o nell'altro.
    const testo = doveSiFa("CREATE POLICY");
    const scoperte = nuove.filter((t) => !nominata(t, testo));
    expect(
      scoperte,
      `tabelle con organization_id create dopo la ${CICLO_AUTOMATICO} e mai nominate ` +
        `in una migrazione che crea policy:\n${scoperte.join("\n")}`,
    ).toEqual([]);
  });

  it("ognuna e' nominata dove si accende FORCE ROW LEVEL SECURITY", () => {
    // Senza FORCE, il proprietario della tabella salta le proprie policy: la protezione
    // sarebbe scritta e non varrebbe per chi conta.
    const testo = doveSiFa("FORCE ROW LEVEL SECURITY");
    const senza = nuove.filter((t) => !nominata(t, testo));
    expect(senza, `senza FORCE RLS:\n${senza.join("\n")}`).toEqual([]);
  });

  it("nessuna tabella tenant accetta qualunque riga in scrittura", () => {
    // `WITH CHECK (true)` significa «scrivi pure, anche a nome di un altro studio».
    // C'era su `audit_log`, e l'ha tolta la migrazione 0015.
    //
    // Restano i passthrough: le tabelle di Better Auth, che opera fuori da `withTenant`
    // e quindi senza contesto. Sono dichiarati sopra, uno per uno, con il loro nome —
    // un'eccezione che si deve scrivere e' un'eccezione che qualcuno deve difendere.
    const larghe = [
      ...sqlTutto.matchAll(
        /CREATE POLICY\s+"?(\w+)"?\s+ON\s+"?(\w+)"?[\s\S]{0,300}?WITH CHECK\s*\(\s*true\s*\)/gi,
      ),
    ].map((m) => ({ policy: m[1], tabella: m[2] }));

    const vive = larghe
      .filter((x) => !new RegExp(`DROP POLICY[^;]*${x.policy}`, "i").test(sqlTutto))
      // Solo le tabelle TENANT: `rate_limit` ha un passthrough identico, ma la sua
      // chiave e' un indirizzo di rete e una colonna `organization_id` non ce l'ha —
      // non c'e' nessun confine fra studi da difendere. Meglio la condizione giusta che
      // un elenco di eccezioni che si allunga a ogni tabella nuova.
      .filter((x) => TUTTE_TENANT.has(x.tabella) && !PASSTHROUGH_VOLUTI.has(x.tabella))
      .map((x) => `${x.tabella}.${x.policy}`);

    expect(vive, `policy che accettano qualunque riga:\n${vive.join("\n")}`).toEqual([]);
  });
});
