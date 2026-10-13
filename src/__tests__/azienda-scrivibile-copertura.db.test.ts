import { describe, it, expect } from "vitest";
import { sql } from "drizzle-orm";
import { db } from "@/lib/db";

// Il trigger `azienda_scrivibile` (migrazione 0061) su OGNI tabella con una chiave verso
// `company`, chiesto al catalogo del database e non a un elenco scritto qui.
//
// ⚠️ PERCHE' ESISTE. La 0061 ha creato il trigger con un ciclo sulle tabelle che esistevano
// in quel momento. Una tabella con `company_id` creata DOPO ne restava senza, e nessun test
// se ne accorgeva: `azienda-scrivibile.db` prova il trigger su sei tabelle scelte a mano.
// Trovato pianificando il percorso GDPR (12 ottobre 2026), prima che succedesse.
//
// Senza trigger una riga dello studio A puo' puntare all'azienda dello studio B (le
// policy guardano `organization_id`, la chiave esterna non passa dalle policy), e
// un'azienda archiviata riceve lavoro nuovo.

const url = process.env.DATABASE_URL;

/** Senza `organization_id` la prima regola del trigger non ha con che confrontare. */
const ECCEZIONI: Record<string, string> = {
  company_referent: "non porta organization_id: la 0061 la salta di proposito, e il referente segue l'azienda",
};

describe.skipIf(!url)("azienda_scrivibile su ogni tabella legata a un'azienda", () => {
  it("nessuna tabella con una chiave verso company ne resta senza", async () => {
    const tabelle = (await db.execute(sql`
      select distinct rel.relname as tabella
      from pg_constraint c
      join pg_class rel on rel.oid = c.conrelid
      join pg_namespace n on n.oid = rel.relnamespace
      join pg_attribute a on a.attrelid = c.conrelid and a.attnum = any (c.conkey)
      where c.contype = 'f' and c.confrelid = 'public.company'::regclass
        and n.nspname = 'public' and a.attname = 'company_id'
      order by 1`)) as unknown as { tabella: string }[];
    const conTrigger = new Set(
      ((await db.execute(sql`
        select c.relname as tabella from pg_trigger t join pg_class c on c.oid = t.tgrelid
        where t.tgname = 'azienda_scrivibile' and not t.tgisinternal`)) as unknown as { tabella: string }[]).map((r) => r.tabella),
    );
    // Se l'elenco fosse vuoto il controllo passerebbe guardando niente.
    expect(tabelle.length).toBeGreaterThan(20);
    const scoperte = tabelle.map((t) => t.tabella).filter((t) => !conTrigger.has(t) && !(t in ECCEZIONI));
    expect(scoperte, "tabelle con company_id senza trigger azienda_scrivibile").toEqual([]);
  });

  it("le eccezioni sono ancora eccezioni vere", async () => {
    // Un'eccezione che non serve piu' (la tabella ha guadagnato organization_id, o non esiste)
    // va tolta: un elenco di permessi che nessuno rilegge diventa un buco.
    for (const t of Object.keys(ECCEZIONI)) {
      const r = (await db.execute(sql`
        select count(*)::int as n from information_schema.columns
        where table_schema = 'public' and table_name = ${t} and column_name = 'organization_id'`)) as unknown as { n: number }[];
      expect(r[0].n, `${t} ha organization_id: togli l'eccezione e metti il trigger`).toBe(0);
    }
  });

  it("la radice del percorso GDPR porta il trigger col ruolo «lavoro»", async () => {
    const r = (await db.execute(sql`
      select pg_get_triggerdef(t.oid) as def from pg_trigger t join pg_class c on c.oid = t.tgrelid
      where c.relname = 'gdpr_system' and t.tgname = 'azienda_scrivibile'`)) as unknown as { def: string }[];
    expect(r).toHaveLength(1);
    expect(r[0].def).toContain("azienda_scrivibile('lavoro')");
  });
});
