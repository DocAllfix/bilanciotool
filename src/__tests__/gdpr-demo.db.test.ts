import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { db } from "@/lib/db";
import { orgEntitlement } from "@/lib/db/schema";
import { withTenant } from "@/lib/db/tenant";
import { creaStudio, pulisciStudio, type Studio } from "./comune";
import { seedDemoGdpr } from "@/features/demo/seed-demo-gdpr";
import { leggiPercorsoGdpr, type PercorsoGdprAvviato } from "@/features/gdpr/queries";
import { datiVistaGdpr } from "@/features/gdpr/vista";
import { oggiIso } from "@/lib/calc/comune/tempo-italia";

// La dimostrativa del percorso Protezione dei dati racconta una storia precisa, e questo
// file la verifica sui NUMERI CALCOLATI, non sulle righe: una richiesta scaduta che il
// quadro deve segnalare, una violazione notificata entro le 72 ore, una valutazione
// d'impatto in corso, e l'obbligo del responsabile della protezione dei dati che NON
// ricorre per un'azienda di 48 dipendenti.
//
// ⚠️ Le date sono relative a oggi: il test vale qualunque giorno lo si lanci.

const url = process.env.DATABASE_URL;
const RUN = Date.now();

describe.skipIf(!url)("la dimostrativa GDPR", () => {
  let S: Studio;
  let v: ReturnType<typeof datiVistaGdpr>;

  beforeAll(async () => {
    S = await creaStudio({ prefisso: "gdpr-demo", run: RUN, nomeAzienda: "Meccanica Adriatica S.r.l." });
    await db.insert(orgEntitlement).values({ organizationId: S.orgId, status: "active" });
    await withTenant({ userId: S.userId, orgId: S.orgId }, (tx) => seedDemoGdpr(tx, S.orgId, S.companyId));
    const p = await leggiPercorsoGdpr(S.userId, S.orgId, S.companyId);
    const adesso = new Date();
    const oggi = oggiIso(adesso);
    v = datiVistaGdpr(p as PercorsoGdprAvviato, Number(oggi.slice(0, 4)), { oggi, adesso });
  });

  afterAll(async () => {
    await pulisciStudio(S.orgId, S.userId);
  });

  it("l'obbligo del responsabile della protezione dei dati è valutato e NON ricorre", () => {
    expect(v.dpo).toMatchObject({ valutato: true, obbligatorio: false });
  });

  it("una richiesta è scaduta e una è nei termini, e il quadro lo segnala", () => {
    expect(v.richieste.map((r) => r.termine).sort()).toEqual(["ok", "over"]);
    expect(v.registri.scadute).toBe(1);
    expect(v.segnali.some((s) => s.livello === "C" && s.vista === "reg")).toBe(true);
  });

  it("la violazione è stata notificata entro le 72 ore", () => {
    expect(v.violazioni).toHaveLength(1);
    expect(v.violazioni[0].termine).toBe("ok");
    expect(v.violazioni[0].conoscenzaIl).toMatch(/T09:00$/);
  });

  it("la videosorveglianza chiede la valutazione d'impatto, ed è in corso", () => {
    const vs = v.trattamenti.find((t) => t.tipoKey === "videosorveglianza")!;
    expect(vs.dpiaNecessaria).toBe(true);
    expect(vs.dpiaStato).toBe("In corso");
  });

  it("l'indice non è né zero né cento, e il percorso è a metà del guado", () => {
    expect(v.conformita.indice).toBeGreaterThan(0);
    expect(v.conformita.indice).toBeLessThan(100);
    expect(v.conformita.daValutare).toBeGreaterThan(0);
    expect(v.avanzamento.percentuale).toBeGreaterThan(20);
    expect(v.avanzamento.percentuale).toBeLessThan(95);
  });
});
