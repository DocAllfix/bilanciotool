import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { rottaDaPresidiare } from "@/features/auth/limite-accessi";

// L'ordine con cui si risolve l'organizzazione, e perche' non va "sistemato".
//
// L'audit aveva segnalato `orgDellaRichiesta` perche' preferisce
// `body.organizationId` alla sessione: sembra fiducia in un dato che arriva dal client.
// Verificato nel plugin `organization` di Better Auth, la sua riga e':
//
//     const activeOrganizationId = ctx.body.organizationId || ctx.context.session.session.activeOrganizationId;
//
// Identica alla nostra. Il limite di accessi si controlla quindi ESATTAMENTE
// sull'organizzazione su cui il plugin aggiungera' la persona: non c'e' scarto da
// sfruttare, ed e' un falso positivo.
//
// Il rischio vero e' l'opposto, ed e' il motivo per cui questo file esiste: se qualcuno
// "correggesse" il nostro ordine mettendo prima la sessione, controlleremmo i posti di
// uno studio mentre il plugin ne riempie un altro. Il limite del piano si potrebbe
// scavalcare passando un `organizationId` nel corpo, cioe' proprio il difetto che il
// rilievo temeva, introdotto rimediando a un difetto che non c'era.

describe("il limite di accessi guarda la stessa organizzazione del plugin", () => {
  it("l'ordine e' quello di Better Auth: prima il corpo, poi la sessione", () => {
    const nostro = readFileSync("src/features/auth/limite-accessi.ts", "utf8");
    // Le due righe, e nell'ordine. Non si confrontano le posizioni di due parole:
    // `activeOrganizationId` compare gia' nella dichiarazione del tipo, molto prima,
    // e il confronto diceva il falso.
    const corpo = nostro.indexOf("const dalCorpo = ctx.body?.organizationId;");
    const ripiego = nostro.indexOf("return ctx.context?.session?.session?.activeOrganizationId ?? null;");
    expect(corpo, "la lettura dal corpo non c'e' piu'").toBeGreaterThan(-1);
    expect(ripiego, "il ripiego sulla sessione non c'e' piu'").toBeGreaterThan(-1);
    expect(ripiego).toBeGreaterThan(corpo);
  });

  it("il plugin risolve nello stesso ordine (se cambia, questo test lo dice)", () => {
    // Si legge il pacchetto installato: il giorno in cui un aggiornamento invertisse
    // l'ordine, il nostro controllo guarderebbe l'organizzazione sbagliata in silenzio.
    const plugin = readFileSync("node_modules/better-auth/dist/plugins/organization/organization.mjs", "utf8");
    expect(plugin).toContain("ctx.body.organizationId || ctx.context.session.session.activeOrganizationId");
  });

  it("si presidiano gli inviti e le accettazioni, e nient'altro", () => {
    // I punti sono due, e il secondo si dimentica: un invito spedito quando c'era posto
    // puo' essere accettato settimane dopo, quando il posto non c'e' piu'.
    expect(rottaDaPresidiare("/organization/invite-member")).toBe(true);
    expect(rottaDaPresidiare("/organization/accept-invitation")).toBe(true);
    expect(rottaDaPresidiare("/organization/create")).toBe(false);
    expect(rottaDaPresidiare("/sign-in/email")).toBe(false);
  });
});
