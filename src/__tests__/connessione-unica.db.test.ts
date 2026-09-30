import { describe, it, expect, vi, beforeAll, afterEach } from "vitest";
import { randomUUID } from "node:crypto";

// ⚠️ Il blocco del gruppo di connessioni (29-30 settembre 2026).
//
// Ogni istanza ha un gruppo di TRE connessioni. Una lettura di catalogo fatta con `db`
// dentro una `withTenant` ne prendeva una SECONDA mentre la transazione teneva la prima:
// tre richieste insieme sulla stessa istanza tenevano le tre connessioni aspettando
// ciascuna la quarta, e restavano ferme per sempre. Rimedio: `dbCorrente()`, che dentro
// una transazione riusa quella.
//
// Il test accende lo strumento `DB_SPIA_CONN` — che segnala ogni query partita su
// un'altra connessione mentre la transazione è aperta — e chiama DENTRO una `withTenant`
// le letture che bloccavano: la dashboard (`platform_config`) e l'iscrizione (i content
// set). Nessun segnale atteso. La controprova fa la stessa lettura con `db`, cioè rimette
// il difetto, e il segnale deve comparire: senza, lo strumento potrebbe essere muto e il
// verde non direbbe niente.
//
// Lo strumento si accende PRIMA di importare il client, perché legge la variabile alla
// creazione del gruppo: per questo gli import sono dinamici.

const url = process.env.DATABASE_URL;

describe.skipIf(!url)("una transazione aperta non chiede una seconda connessione", () => {
  let mod: {
    db: typeof import("@/lib/db").db;
    withTenant: typeof import("@/lib/db/tenant").withTenant;
    latestSetId: typeof import("@/features/content-set").latestSetId;
    getLimits: typeof import("@/features/entitlement").getLimits;
    platformConfig: typeof import("@/lib/db/schema").platformConfig;
  };
  const ctx = { userId: randomUUID(), orgId: randomUUID() };
  let errori: ReturnType<typeof vi.spyOn>;

  beforeAll(async () => {
    process.env.DB_SPIA_CONN = "1";
    const [{ db }, { withTenant }, { latestSetId }, { getLimits }, { platformConfig }] = await Promise.all([
      import("@/lib/db"),
      import("@/lib/db/tenant"),
      import("@/features/content-set"),
      import("@/features/entitlement"),
      import("@/lib/db/schema"),
    ]);
    mod = { db, withTenant, latestSetId, getLimits, platformConfig };
  });

  const segnali = () =>
    errori.mock.calls.filter((c: unknown[]) => String(c[0]).startsWith("[seconda-connessione]"));

  afterEach(() => errori?.mockRestore());

  it("le letture della dashboard e dell'iscrizione restano sulla connessione della transazione", async () => {
    errori = vi.spyOn(console, "error").mockImplementation(() => {});
    await mod.withTenant(ctx, async (tx) => {
      // Una prima istruzione fa sapere allo strumento quale connessione tiene la transazione.
      await tx.execute(`select 1`);
      await mod.getLimits();
      await mod.latestSetId("ghg", "manca il catalogo ghg");
      await mod.latestSetId("energy", "manca il catalogo energy");
    });
    expect(segnali()).toEqual([]);
  });

  it("controprova: la stessa lettura fatta con `db` viene segnalata", async () => {
    errori = vi.spyOn(console, "error").mockImplementation(() => {});
    await mod.withTenant(ctx, async (tx) => {
      await tx.execute(`select 1`);
      await mod.db.select().from(mod.platformConfig).limit(1);
    });
    // Una connessione nuova carica anche i propri tipi (`pg_type`) prima della query: i
    // segnali possono essere più d'uno, e basta che quello della lettura ci sia.
    expect(segnali().some((c: unknown[]) => String(c[0]).includes("platform_config"))).toBe(true);
  });
});
