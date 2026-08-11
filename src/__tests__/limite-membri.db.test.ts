import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { randomUUID } from "node:crypto";
import { db } from "@/lib/db";
import { organization, member, orgEntitlement, invitation, platformConfig, user } from "@/lib/db/schema";
import { eq, inArray } from "drizzle-orm";

// Il limite di accessi passa dalla porta vera: le API di Better Auth.
//
// Testarlo chiamando `assertSeatAvailable` direttamente non proverebbe niente di utile —
// quella funzione funzionava già, e infatti il difetto era che **non la chiamava nessuno**.
// Gli inviti li gestisce il plugin organization con le sue rotte, che noi non avvolgiamo:
// se il controllo non è agganciato lì, il limite non esiste.
//
// Il limite dinamico si mette a 2, più basso del `membershipLimit: 5` statico del plugin:
// così un invito che passa dimostra che a decidere è il numero fisso, non la configurazione.

const url = process.env.DATABASE_URL;
const RUN = Date.now();
const LIMITE = { maxActiveCompanies: 10, warnAtCompanies: 8, maxMembers: 2 };

let orgId = "";
const utenti: string[] = [];
const CONFIG_PRECEDENTE: { value: unknown }[] = [];

describe.skipIf(!url)("limite accessi: applicato dove si invita davvero", () => {
  beforeAll(async () => {
    const prev = await db.select({ value: platformConfig.value }).from(platformConfig).where(eq(platformConfig.key, "limits"));
    CONFIG_PRECEDENTE.push(...prev);
    await db
      .insert(platformConfig)
      .values({ key: "limits", value: LIMITE })
      .onConflictDoUpdate({ target: platformConfig.key, set: { value: LIMITE } });
  });

  afterAll(async () => {
    if (orgId) {
      await db.delete(invitation).where(eq(invitation.organizationId, orgId));
      await db.delete(member).where(eq(member.organizationId, orgId));
      await db.delete(orgEntitlement).where(eq(orgEntitlement.organizationId, orgId));
      await db.delete(organization).where(eq(organization.id, orgId));
    }
    if (utenti.length) await db.delete(user).where(inArray(user.id, utenti));
    if (CONFIG_PRECEDENTE.length) {
      await db.update(platformConfig).set({ value: CONFIG_PRECEDENTE[0].value }).where(eq(platformConfig.key, "limits"));
    } else {
      await db.delete(platformConfig).where(eq(platformConfig.key, "limits"));
    }
  });

  it("il posto oltre il limite del piano viene negato dalle API di invito", async () => {
    const { auth } = await import("@/lib/auth");

    // 1. uno studio vero, nato dalla registrazione reale
    const email = `titolare-${RUN}@example.com`;
    const password = `Pw-molto-sicura-${RUN}!`;
    await auth.api.signUpEmail({ body: { email, password, name: "Titolare Studio" }, asResponse: true });

    // Da quando la verifica dell'indirizzo è accesa, la registrazione NON crea la
    // sessione: la crea la conferma. Qui si marca l'indirizzo come verificato — che è
    // ciò che fa il clic sul collegamento nell'email — e poi si accede.
    await db.update(user).set({ emailVerified: true }).where(eq(user.email, email));
    const accesso = await auth.api.signInEmail({ body: { email, password }, asResponse: true });
    const cookie = accesso.headers.get("set-cookie") ?? "";
    expect(cookie, "dopo la verifica l'accesso deve restituire una sessione").not.toBe("");

    const [nato] = await db.select().from(user).where(eq(user.email, email));
    utenti.push(nato.id);
    const membership = await db.select().from(member).where(eq(member.userId, nato.id));
    orgId = membership[0].organizationId;

    // 2. SOTTO il limite l'invito deve funzionare.
    //    Senza questa metà, un aggancio che respinge TUTTO passerebbe il test: si
    //    dimostrerebbe di aver messo un limite, non di aver messo quello giusto.
    const primo = await auth.api.createInvitation({
      body: { email: `secondo-${RUN}@example.com`, role: "member", organizationId: orgId },
      headers: new Headers({ cookie }),
    });
    expect(primo, "col posto libero l'invito deve partire").toBeTruthy();

    // 3. si riempie fino al limite: il titolare più un collega = 2
    const idCollega = randomUUID();
    await db.insert(user).values({ id: idCollega, name: "Collega", email: `collega-${RUN}@example.com` });
    utenti.push(idCollega);
    await db.insert(member).values({ id: randomUUID(), organizationId: orgId, userId: idCollega, role: "member" });

    // 4. ora il posto non c'è più: il terzo invito va respinto, e per il MOTIVO giusto.
    //    Senza l'aggancio passava, perché il plugin guardava il proprio numero fisso.
    await expect(
      auth.api.createInvitation({
        body: { email: `terzo-${RUN}@example.com`, role: "member", organizationId: orgId },
        headers: new Headers({ cookie }),
      }),
    ).rejects.toThrow(/limite di 2 membri/i);

    // 5. e un invito respinto non deve lasciare righe: resta solo quello legittimo di prima
    const inviti = await db.select().from(invitation).where(eq(invitation.organizationId, orgId));
    expect(inviti, "il respinto non deve essere stato scritto").toHaveLength(1);
  });

  // Il controllo all'invito da solo non basta, ed è l'errore che si fa. Fra lo spedire e
  // l'accettare passano giorni: l'invito qui sotto è stato creato quando il posto c'era, ma
  // nel frattempo lo studio si è riempito. Senza presidiare anche l'accettazione, la
  // membership nascerebbe comunque e il limite verrebbe scavalcato in silenzio.
  it("un invito legittimo non si può accettare se nel frattempo il posto è finito", async () => {
    const { auth } = await import("@/lib/auth");

    const [invito] = await db.select().from(invitation).where(eq(invitation.organizationId, orgId));
    expect(invito, "serve l'invito creato dalla prova precedente").toBeTruthy();

    // l'invitato si registra: non riceve uno studio proprio, perché ha un invito pendente
    const risposta = await auth.api.signUpEmail({
      body: { email: invito.email, password: `Pw-molto-sicura-${RUN}!`, name: "Invitato" },
      asResponse: true,
    });
    const cookie = risposta.headers.get("set-cookie") ?? "";
    const [invitato] = await db.select().from(user).where(eq(user.email, invito.email));
    utenti.push(invitato.id);

    const primaDi = await db.select().from(member).where(eq(member.organizationId, orgId));

    await expect(
      auth.api.acceptInvitation({
        body: { invitationId: invito.id },
        headers: new Headers({ cookie }),
      }),
    ).rejects.toThrow(/limite di 2 membri/i);

    const dopo = await db.select().from(member).where(eq(member.organizationId, orgId));
    expect(dopo.length, "nessuna membership deve essere nata").toBe(primaDi.length);
  });
});
