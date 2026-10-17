import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { randomUUID } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { assegnazionePercorso, member, orgEntitlement, user } from "@/lib/db/schema";
import { creaStudio, pulisciStudio, type Studio } from "./comune";
import { documentoVisibile, percorsiVisibili, usoInterno } from "@/features/auth/percorsi";

// FASCIA «AZIENDA»: un collaboratore vede SOLO i percorsi che gli sono stati assegnati.
//
// ⚠️ Negli studi non cambia niente, ed è la metà che conta di più: una regola nuova sui
// permessi che toccasse per sbaglio gli studi già paganti toglierebbe a un consulente il
// suo portafoglio, il giorno del rilascio. La prima prova è quella.
//
// La guardia sulle azioni (`requirePercorso`) si appoggia a `percorsiVisibili`, che è ciò
// che si prova qui sul database vero; che ogni file di azioni la chiami lo pretende
// `percorso-guardia-pure`.

const RUN = Date.now();
const DB = !!process.env.DATABASE_URL;

let studio: Studio;
let interna: Studio;
const collega = `user-percorsi-collega-${RUN}`;
const collegaStudio = `user-percorsi-collega-studio-${RUN}`;

async function aggiungiMembro(orgId: string, userId: string) {
  await db.insert(user).values({ id: userId, name: "Collega", email: `${userId}@example.com` });
  await db.insert(member).values({ id: randomUUID(), organizationId: orgId, userId, role: "member" });
}

describe.skipIf(!DB)("percorsi assegnati (fascia «Azienda»)", () => {
  beforeAll(async () => {
    studio = await creaStudio({ prefisso: "percorsi-studio", run: RUN, nomeAzienda: "Cliente S.r.l." });
    interna = await creaStudio({ prefisso: "percorsi-interna", run: RUN, nomeAzienda: "Corvane Meccanica S.r.l." });
    // Il piano è la premessa del test: si scrive qui, non in un aiutante.
    await db.insert(orgEntitlement).values({ organizationId: studio.orgId, status: "active", piano: "professional", activatedAt: new Date() });
    await db.insert(orgEntitlement).values({ organizationId: interna.orgId, status: "active", piano: "azienda", activatedAt: new Date() });
    await aggiungiMembro(studio.orgId, collegaStudio);
    await aggiungiMembro(interna.orgId, collega);
  });

  afterAll(async () => {
    for (const s of [studio, interna]) await db.delete(assegnazionePercorso).where(eq(assegnazionePercorso.organizationId, s.orgId));
    for (const [s, u] of [[studio, collegaStudio], [interna, collega]] as const) {
      await db.delete(member).where(eq(member.userId, u));
      await db.delete(user).where(eq(user.id, u));
      await pulisciStudio(s.orgId, s.userId);
    }
  });

  it("negli STUDI ognuno vede tutto, come prima", async () => {
    expect(await usoInterno(collegaStudio, studio.orgId)).toBe(false);
    expect(await percorsiVisibili({ userId: collegaStudio, orgId: studio.orgId, role: "member" })).toBeNull();
  });

  it("nella fascia «Azienda» l'amministratore vede tutto", async () => {
    expect(await usoInterno(interna.userId, interna.orgId)).toBe(true);
    expect(await percorsiVisibili({ userId: interna.userId, orgId: interna.orgId, role: "owner" })).toBeNull();
  });

  it("un collaboratore senza assegnazioni non vede NESSUN percorso", async () => {
    const v = await percorsiVisibili({ userId: collega, orgId: interna.orgId, role: "member" });
    expect(v).not.toBeNull();
    expect([...v!]).toEqual([]);
  });

  it("assegnato il GHG, vede il GHG e i suoi documenti, e non il resto", async () => {
    await db.insert(assegnazionePercorso).values({ id: randomUUID(), organizationId: interna.orgId, userId: collega, modulo: "ghg", createdBy: interna.userId });
    const v = await percorsiVisibili({ userId: collega, orgId: interna.orgId, role: "member" });
    expect([...v!]).toEqual(["ghg"]);
    expect(documentoVisibile(v, "ghg")).toBe(true);
    expect(documentoVisibile(v, "bilancio")).toBe(false);
    expect(documentoVisibile(v, "relazione_wb")).toBe(false);
  });

  it("la stessa assegnazione due volte è respinta dal database", async () => {
    await expect(
      db.insert(assegnazionePercorso).values({ id: randomUUID(), organizationId: interna.orgId, userId: collega, modulo: "ghg" }),
    ).rejects.toThrow();
  });

  it("un percorso che non esiste è respinto dal database", async () => {
    await expect(
      db.insert(assegnazionePercorso).values({ id: randomUUID(), organizationId: interna.orgId, userId: collega, modulo: "inventato" as never }),
    ).rejects.toThrow();
  });

  it("⚠️ uscire dallo studio CANCELLA le assegnazioni", async () => {
    // Chi venisse reinvitato non deve ritrovarsi i permessi di allora senza che nessuno
    // li dia di nuovo: la prova è la riga che non c'è più.
    await db.delete(member).where(and(eq(member.organizationId, interna.orgId), eq(member.userId, collega)));
    const rimaste = await db
      .select()
      .from(assegnazionePercorso)
      .where(and(eq(assegnazionePercorso.organizationId, interna.orgId), eq(assegnazionePercorso.userId, collega)));
    expect(rimaste).toEqual([]);
  });
});
