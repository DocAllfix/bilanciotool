import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  briberySystem, gdprSystem, gdprTrattamento, orgEntitlement, pasSystem, saSystem, wbChannel, wbSystem,
} from "@/lib/db/schema";
import { creaStudio, pulisciStudio, type Studio } from "./comune";
import { avviaSistema as avviaPas } from "@/features/pas/sistema";
import { creaSistema as creaSa8000 } from "@/features/sa8000/sistema";
import { creaAssetto } from "@/features/segnalazioni/sistema";
import { creaSistema as creaAnticorruzione } from "@/features/anticorruzione/sistema";
import { avviaSistema as avviaGdpr } from "@/features/gdpr/sistema";
import { propostaPrivacyDaGdpr } from "@/features/soa/proposte";

// I fatti che due percorsi hanno in comune si scrivono una volta: chi parte secondo li
// riprende dal primo. Contratto, siti e direzione fra PAS 24000 e SA8000; il canale di
// segnalazione fra D.Lgs. 24/2023 e ISO 37001; il ruolo privacy fra GDPR e SoA (proposto).

const RUN = Date.now();
const DB = !!process.env.DATABASE_URL;
let S: Studio;

describe.skipIf(!DB)("ponti fra i sistemi di gestione", () => {
  beforeAll(async () => {
    S = await creaStudio({ prefisso: "ponti-sistemi", run: RUN, nomeAzienda: "Corvane Meccanica S.r.l." });
    await db.insert(orgEntitlement).values({ organizationId: S.orgId, status: "active", piano: "professional", activatedAt: new Date() });
  });

  afterAll(async () => {
    for (const t of [saSystem, pasSystem, briberySystem, wbSystem, gdprSystem]) {
      await db.delete(t).where(eq(t.organizationId, S.orgId));
    }
    await pulisciStudio(S.orgId, S.userId);
  });

  it("SA8000 riprende dal PAS 24000 contratto, siti e direzione", async () => {
    const pas = await avviaPas(S.userId, S.orgId, { companyId: S.companyId });
    await db.update(pasSystem).set({ ccnl: "CCNL Metalmeccanici industria", siti: "Aversa (CE)", direzione: "Anna Corvane" }).where(eq(pasSystem.id, pas));
    const id = await creaSa8000(S.userId, S.orgId, { companyId: S.companyId });
    const [s] = await db.select().from(saSystem).where(eq(saSystem.id, id));
    expect(s).toMatchObject({ ccnl: "CCNL Metalmeccanici industria", siti: "Aversa (CE)", direzione: "Anna Corvane" });
  });

  it("ISO 37001 riprende i canali ATTIVI delle segnalazioni, e solo quelli", async () => {
    const wb = await creaAssetto(S.userId, S.orgId, { companyId: S.companyId });
    await db.update(wbChannel).set({ attiva: true, descrizione: "segnalazioni@corvane.example", fornitore: "Piattaforma Esempio" })
      .where(and(eq(wbChannel.systemId, wb), eq(wbChannel.forma, "Scritta")));
    // Orale descritto ma spento: non è un canale, e non deve comparire.
    await db.update(wbChannel).set({ attiva: false, descrizione: "081 000 0000" })
      .where(and(eq(wbChannel.systemId, wb), eq(wbChannel.forma, "Orale")));
    const id = await creaAnticorruzione(S.userId, S.orgId, { companyId: S.companyId });
    const [b] = await db.select().from(briberySystem).where(eq(briberySystem.id, id));
    expect(b).toMatchObject({ canaleEmail: "segnalazioni@corvane.example", canaleUrl: null, canaleTelefono: null, canaleTerzo: "Piattaforma Esempio" });
  });

  it("SoA: il ruolo privacy si propone dal GDPR, e i trattamenti solo proposti non contano", async () => {
    expect(await propostaPrivacyDaGdpr(S.userId, S.orgId, S.companyId)).toBeNull();
    const g = await avviaGdpr(S.userId, S.orgId, { companyId: S.companyId });
    expect((await propostaPrivacyDaGdpr(S.userId, S.orgId, S.companyId))?.valore).toBe("titolare");
    // Un trattamento PROPOSTO da responsabile non cambia niente…
    const [t] = await db.select({ id: gdprTrattamento.id }).from(gdprTrattamento).where(eq(gdprTrattamento.systemId, g)).limit(1);
    await db.update(gdprTrattamento).set({ ruolo: "Responsabile" }).where(eq(gdprTrattamento.id, t.id));
    expect((await propostaPrivacyDaGdpr(S.userId, S.orgId, S.companyId))?.valore).toBe("titolare");
    // …censito sì.
    await db.update(gdprTrattamento).set({ propostaMotivo: null }).where(eq(gdprTrattamento.id, t.id));
    expect((await propostaPrivacyDaGdpr(S.userId, S.orgId, S.companyId))?.valore).toBe("entrambi");
  });
});
