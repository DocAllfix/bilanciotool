import { describe, it, expect, beforeAll, afterAll, vi, beforeEach } from "vitest";
import { eq, inArray } from "drizzle-orm";
import postgres from "postgres";

// Le email si intercettano: il test prova CHI le riceverebbe, non Resend.
const posta = vi.hoisted(() => ({ staff: [] as unknown[], utente: [] as unknown[] }));
vi.mock("@/lib/email", () => ({
  avvisaStaffAssistenza: vi.fn(async (d: unknown) => {
    posta.staff.push(d);
    return { sent: true };
  }),
  avvisaUtenteAssistenza: vi.fn(async (to: string, d: unknown) => {
    posta.utente.push({ to, ...(d as object) });
    return { sent: true };
  }),
}));

import { db } from "@/lib/db";
import { assistenzaMessaggio, assistenzaTicket, member } from "@/lib/db/schema";
import { randomUUID } from "node:crypto";
import { user } from "@/lib/db/schema";
import { creaStudio, pulisciStudio } from "./comune";
import {
  apriTicket,
  cambiaStatoTicket,
  codaStaff,
  mieiTicket,
  mioTicket,
  rispondiComeStaff,
  rispondiComeUtente,
  ticketPerStaff,
} from "@/features/assistenza";
import * as email from "@/lib/email";

// L'ASSISTENZA, SUL DATABASE.
//
// ⚠️ Tre fatti che questo file difende, in ordine di gravità:
//  1. un ticket lo vede chi l'ha aperto e lo staff — NON un collega dello stesso studio, e
//     NON qualcuno di un altro studio. Provato anche sulla POLICY, assumendo `app_rls` a
//     mano: la suite in modalità normale gira privilegiata e le policy non si vedono;
//  2. le notifiche vanno alla persona giusta, e nessuno riceve ciò che ha scritto lui;
//  3. un'email che non parte non fa fallire il ticket.

const RUN = Date.now();
let A: Awaited<ReturnType<typeof creaStudio>>; // chi scrive
let X: Awaited<ReturnType<typeof creaStudio>>; // un altro studio
let collega = "";
let staff = "";
let ticketA = "";

beforeAll(async () => {
  A = await creaStudio({ prefisso: "ass-a", run: RUN, nomeStudio: "Studio Rossi" });
  X = await creaStudio({ prefisso: "ass-x", run: RUN });
  collega = `user-ass-c-${RUN}`;
  staff = `user-ass-staff-${RUN}`;
  await db.insert(user).values([
    { id: collega, name: "Collega", email: `ass-c-${RUN}@example.com` },
    { id: staff, name: "Staff", email: `ass-staff-${RUN}@example.com`, platformRole: "admin" },
  ]);
  await db.insert(member).values({ id: randomUUID(), organizationId: A.orgId, userId: collega, role: "member" });
});

afterAll(async () => {
  await db.delete(assistenzaTicket).where(inArray(assistenzaTicket.organizationId, [A.orgId, X.orgId]));
  await db.delete(member).where(eq(member.userId, collega));
  await pulisciStudio(A.orgId, A.userId);
  await pulisciStudio(X.orgId, X.userId);
  await db.delete(user).where(inArray(user.id, [collega, staff]));
});

beforeEach(() => {
  posta.staff.length = 0;
  posta.utente.length = 0;
});

describe("aprire e leggere", () => {
  it("chi scrive apre un ticket col primo messaggio, e lo staff è avvisato", async () => {
    ticketA = (await apriTicket(A.userId, A.orgId, { oggetto: "  Non vedo il PDF  ", testo: "Riga 1\nRiga 2" })).id;
    const t = await mioTicket(A.userId, A.orgId, ticketA);
    expect(t?.oggetto).toBe("Non vedo il PDF");
    expect(t?.stato).toBe("aperto");
    expect(t?.messaggi.map((m) => [m.testo, m.staff])).toEqual([["Riga 1\nRiga 2", false]]);
    expect(posta.staff).toHaveLength(1);
    expect(posta.staff[0]).toMatchObject({ nuovo: true, studio: "Studio Rossi", oggetto: "Non vedo il PDF" });
    expect((posta.staff[0] as { url: string }).url).toMatch(new RegExp(`/staff/assistenza/${ticketA}$`));
  });

  it("un oggetto vuoto viene rifiutato, e la riga non compare", async () => {
    const prima = (await mieiTicket(A.userId, A.orgId)).length;
    await expect(apriTicket(A.userId, A.orgId, { oggetto: "   ", testo: "x" })).rejects.toThrow(/Oggetto/);
    expect((await mieiTicket(A.userId, A.orgId)).length).toBe(prima);
  });

  it("⚠️ il collega dello STESSO studio non lo vede", async () => {
    expect(await mioTicket(collega, A.orgId, ticketA)).toBeNull();
    expect(await mieiTicket(collega, A.orgId)).toEqual([]);
    await expect(rispondiComeUtente(collega, A.orgId, ticketA, "intruso")).rejects.toThrow(/inesistente/);
  });

  it("chi sta in un altro studio non lo vede e non ci scrive", async () => {
    expect(await mioTicket(X.userId, X.orgId, ticketA)).toBeNull();
    await expect(rispondiComeUtente(X.userId, X.orgId, ticketA, "intruso")).rejects.toThrow();
    const msg = await db.select().from(assistenzaMessaggio).where(eq(assistenzaMessaggio.ticketId, ticketA));
    expect(msg.map((m) => m.testo)).not.toContain("intruso");
  });

  it("lo staff lo vede in coda, con nome e studio", async () => {
    const coda = await codaStaff(staff);
    const riga = coda.find((t) => t.id === ticketA);
    expect(riga).toMatchObject({ nome: "Studio Rossi", studio: "Studio Rossi" });
    expect((await ticketPerStaff(staff, ticketA))?.messaggi).toHaveLength(1);
  });
});

describe("la conversazione e le notifiche", () => {
  it("lo staff risponde: il ticket passa in attesa e l'email va a chi l'ha aperto", async () => {
    await rispondiComeStaff(staff, ticketA, "Ecco come fare");
    const t = await mioTicket(A.userId, A.orgId, ticketA);
    expect(t?.stato).toBe("in_attesa");
    expect(t?.messaggi.at(-1)).toMatchObject({ testo: "Ecco come fare", staff: true, autoreId: staff });
    expect(posta.utente).toEqual([
      expect.objectContaining({ to: `ass-a-${RUN}@example.com`, oggetto: "Non vedo il PDF", testo: "Ecco come fare" }),
    ]);
    expect(posta.staff).toHaveLength(0);
  });

  it("chi l'ha aperto risponde: il ticket torna aperto e l'email va allo staff, non a lui", async () => {
    await cambiaStatoTicket(staff, ticketA, "chiuso");
    await rispondiComeUtente(A.userId, A.orgId, ticketA, "Non funziona ancora");
    expect((await mioTicket(A.userId, A.orgId, ticketA))?.stato).toBe("aperto");
    expect(posta.staff).toEqual([expect.objectContaining({ nuovo: false, testo: "Non funziona ancora" })]);
    expect(posta.utente).toHaveLength(0);
  });

  it("⚠️ lo staff che risponde a un ticket SUO non riceve la propria risposta", async () => {
    // Un membro dello staff ha anche uno studio: apre una richiesta per sé e ci risponde.
    await db.insert(member).values({ id: randomUUID(), organizationId: X.orgId, userId: staff, role: "member" });
    try {
      const { id } = await apriTicket(staff, X.orgId, { oggetto: "Mio", testo: "per me" });
      posta.staff.length = 0;
      await rispondiComeStaff(staff, id, "risposta a me stesso");
      expect(posta.utente).toHaveLength(0);
    } finally {
      await db.delete(member).where(eq(member.userId, staff));
    }
  });

  it("⚠️ un'email che fallisce NON fa fallire il ticket", async () => {
    vi.mocked(email.avvisaStaffAssistenza).mockRejectedValueOnce(new Error("Resend giù"));
    const spia = vi.spyOn(console, "error").mockImplementation(() => {});
    const { id } = await apriTicket(A.userId, A.orgId, { oggetto: "Con la posta giù", testo: "ciao" });
    expect(await mioTicket(A.userId, A.orgId, id)).not.toBeNull();
    expect(spia.mock.calls.some((c) => String(c[0]).includes("[assistenza]"))).toBe(true);
    spia.mockRestore();
  });
});

// ⚠️ LA POLICY, provata assumendo il ruolo a mano. È la verifica che conta per la
// produzione: lì la connessione È `app_rls`, e se la policy fosse sbagliata il filtro
// applicativo qui sopra la coprirebbe in sviluppo e non in produzione.
describe.skipIf(!process.env.DIRECT_URL)("la policy della migrazione 0058", () => {
  const conta = async (ctx: { userId: string; admin?: boolean }) => {
    const sql = postgres(process.env.DIRECT_URL!, { max: 1, prepare: false });
    try {
      return await sql.begin(async (tx) => {
        await tx`set local role app_rls`;
        await tx`select set_config('app.user_id', ${ctx.userId}, true), set_config('app.platform_admin', ${ctx.admin ? "on" : ""}, true)`;
        const [t] = await tx`select count(*)::int n from assistenza_ticket where id = ${ticketA}`;
        const [m] = await tx`select count(*)::int n from assistenza_messaggio where ticket_id = ${ticketA}`;
        return [t.n, m.n];
      });
    } finally {
      await sql.end();
    }
  };

  it("il proprietario vede ticket e messaggi", async () => {
    const [t, m] = await conta({ userId: A.userId });
    expect(t).toBe(1);
    expect(m).toBeGreaterThan(0);
  });

  it("⚠️ il collega dello stesso studio vede ZERO, anche senza filtro nella query", async () => {
    expect(await conta({ userId: collega })).toEqual([0, 0]);
  });

  it("lo staff vede tutto", async () => {
    const [t] = await conta({ userId: staff, admin: true });
    expect(t).toBe(1);
  });

  it("il collega non può scrivere un messaggio nel ticket altrui", async () => {
    const sql = postgres(process.env.DIRECT_URL!, { max: 1, prepare: false });
    try {
      await expect(
        sql.begin(async (tx) => {
          await tx`set local role app_rls`;
          await tx`select set_config('app.user_id', ${collega}, true)`;
          await tx`insert into assistenza_messaggio (id, ticket_id, autore_id, testo) values (${randomUUID()}, ${ticketA}, ${collega}, 'intruso')`;
        }),
      ).rejects.toThrow(/row-level security/);
    } finally {
      await sql.end();
    }
  });
});
