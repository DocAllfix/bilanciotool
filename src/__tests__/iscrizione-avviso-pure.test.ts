import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

// CHI SI ISCRIVE CON UN INDIRIZZO CHE HA GIÀ UN ACCOUNT DEVE RICEVERE UN'EMAIL.
//
// ⚠️ Nasce da un guasto vero, visto dal committente sul sito vivo il 10 settembre 2026.
// Better Auth risponde `200` a un'iscrizione con un indirizzo già registrato — di
// proposito, perché rispondere «esiste già» rivelerebbe a un estraneo quali indirizzi
// hanno un account qui — ma **non crea niente e non manda niente**. La nostra pagina
// prende quel `200` per buono e scrive «Controlla la tua posta», e la persona resta ad
// aspettare un'email che non partirà mai.
//
// Misurato allora: zero righe in `verification` per quell'indirizzo, e una sola riga in
// `user`, quella di un mese prima. Nessun doppione, nessuna email, e una frase falsa a
// schermo.
//
// ⚠️ IL RIMEDIO NON È DIRE LA VERITÀ A SCHERMO: riaprirebbe la falla che quel `200`
// chiude. È mandare un'email anche in quel caso, così la frase diventa vera per entrambi
// e chi guarda da fuori continua a non distinguere i due casi.
//
// ⚠️ E QUESTO CONTROLLO GUARDA IL CABLAGGIO, non il comportamento. Il comportamento lo si
// prova solo con un database e una casella di posta; ciò che invece si perde in silenzio
// è la RIGA che collega la funzione all'aggancio — si toglie in un refactoring, tutto
// continua a compilare, e il difetto torna identico senza che un solo test diventi rosso.
// È la stessa ragione per cui esiste `collaudi-risorse-pure`: una regola che vive solo in
// un commento non protegge niente.

const AUTH = readFileSync(join(process.cwd(), "src", "lib", "auth", "index.ts"), "utf8");
const EMAIL = readFileSync(join(process.cwd(), "src", "lib", "email", "index.ts"), "utf8");

describe("l'avviso a chi ha già un account", () => {
  it("la funzione esiste e riconosce la rotta di iscrizione", () => {
    expect(AUTH).toMatch(/function avvisaSeHaGiaUnAccount/);
    // Se cambiasse la rotta, l'aggancio resterebbe montato e non scatterebbe mai: è il
    // modo più silenzioso in cui questa difesa può morire.
    expect(AUTH).toContain('"/sign-up/email"');
  });

  it("⚠️ è CHIAMATA dall'aggancio, non solo definita", () => {
    // Una funzione definita e mai chiamata è esattamente il difetto che stiamo chiudendo,
    // scritto un livello più in su.
    const dentroHook = AUTH.slice(AUTH.indexOf("hooks: {"));
    expect(dentroHook).toMatch(/avvisaSeHaGiaUnAccount\s*\(/);
  });

  it("manda l'email, e non interrompe l'iscrizione", () => {
    expect(AUTH).toMatch(/sendAccountEsistenteEmail\s*\(/);
    // ⚠️ Il `catch` è parte del contratto: un avviso di cortesia non può far fallire
    // l'iscrizione che sta accompagnando. Se qualcuno lo togliesse, una casella di posta
    // giù basterebbe a impedire a chiunque di registrarsi.
    const fn = AUTH.slice(AUTH.indexOf("function avvisaSeHaGiaUnAccount"));
    expect(fn.slice(0, fn.indexOf("\n}\n"))).toMatch(/catch\s*\(/);
  });

  it("il confronto dell'indirizzo ignora le maiuscole", () => {
    // `Mario@Gmail.com` e `mario@gmail.com` sono la stessa casella per ogni fornitore
    // reale: con un confronto esatto il conto sfuggirebbe e la persona resterebbe nel
    // vicolo cieco che questa funzione esiste per chiudere.
    const fn = AUTH.slice(AUTH.indexOf("function avvisaSeHaGiaUnAccount"));
    expect(fn).toMatch(/toLowerCase\(\)/);
    expect(fn).toMatch(/lower\(/);
  });

  it("l'email dice come entrare e come recuperare la password", () => {
    const fn = EMAIL.slice(EMAIL.indexOf("export async function sendAccountEsistenteEmail"));
    const corpo = fn.slice(0, fn.indexOf("\n}\n"));
    expect(corpo).toMatch(/urlAccesso/);
    expect(corpo).toMatch(/urlPassword/);
    // ⚠️ Il tono non accusa: chi la riceve quasi sempre è il proprietario che si è
    // dimenticato di avere un account, non un intruso.
    expect(corpo).toMatch(/ignorare questa email/i);
  });

  it("⚠️ un invio rifiutato da Resend si ANNOTA", () => {
    // `send` restituiva `{ sent: res.ok }` e nessun chiamante guardava quel campo: un
    // rifiuto spariva senza traccia, e l'unico sintomo era una persona che aspettava
    // un'email mai arrivata — la stessa forma del difetto qui sopra, un piano più giù.
    const send = EMAIL.slice(EMAIL.indexOf("async function send("));
    expect(send.slice(0, send.indexOf("\n}\n"))).toMatch(/if \(!res\.ok\)[\s\S]*console\.error/);
  });

  it("il controllo sa diventare rosso", () => {
    // Su un testo finto: senza questa prova le espressioni qui sopra potrebbero non
    // riconoscere niente e restare verdi per sempre.
    const finto = "async function altro() { return 1; }";
    expect(/function avvisaSeHaGiaUnAccount/.test(finto)).toBe(false);
    expect(/function avvisaSeHaGiaUnAccount/.test("function avvisaSeHaGiaUnAccount(ctx)")).toBe(true);
  });
});
