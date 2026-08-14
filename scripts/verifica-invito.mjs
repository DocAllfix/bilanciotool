// L'invito a un collega, dall'inizio alla fine.
//
// Fino a oggi era provato solo che l'invito PARTE. La metà che conta — che il collega
// riesca a entrare — non l'aveva mai percorsa nessuno, e infatti non funzionava: l'email
// dice «Accetta l'invito» e porta a `/accept-invitation/<id>`, che rispondeva **404**.
// Il retro era pronto (chi è invitato non riceve uno studio proprio, la sessione punta
// subito allo studio giusto): mancava la pagina.
//
// Qui si percorre tutto: lo studio invita, il collega arriva sul collegamento vero preso
// dal database, si iscrive con l'indirizzo invitato, conferma, accetta, e **occupa un
// posto**. Più i modi in cui può andare storto, che sono la ragione per cui esiste una
// pagina invece di un redirect.

import { chromium } from "@playwright/test";
import postgres from "postgres";
import "dotenv/config";
import { registraEEntra } from "./comune-registrazione.mjs";
import { PWD_COLLAUDO } from "./comune-credenziali.mjs";
import { strumenta } from "./comune-collaudo.mjs";

const BASE = process.env.BASE ?? "http://localhost:3000";
const RUN = Date.now();
const sql = postgres(process.env.DATABASE_URL, { max: 2, prepare: false });

const TITOLARE = `invito-titolare-${RUN}@example.com`;
const COLLEGA = `invito-collega-${RUN}@example.com`;
const ESTRANEO = `invito-estraneo-${RUN}@example.com`;

let ok = 0;
const falliti = [];
async function prova(nome, fn) {
  try {
    await fn();
    ok++;
    console.log("  ok  ", nome);
  } catch (e) {
    falliti.push({ nome, motivo: e.message });
    console.log("  KO  ", nome, "->", e.message);
  }
}

const browser = await chromium.launch({ headless: true });

/** Un contesto pulito per ciascuno: sessioni diverse non devono mescolarsi. */
async function nuovaScheda() {
  const ctx = await browser.newContext({ viewport: { width: 1400, height: 950 } });
  await ctx.addInitScript(() => {
    try {
      localStorage.setItem("evalisdeck-benvenuto", "1");
      for (const k of ["portfolio", "ghg", "bilancio", "energetico", "fornitore", "soa"]) {
        localStorage.setItem(`evalisdeck-tour:${k}`, "1");
      }
    } catch {}
  });
  const page = await ctx.newPage();
  strumenta(page);
  return { ctx, page };
}

// ─── lo studio che invita ────────────────────────────────────────────────────
console.log("\n— lo studio invita —");
const studio = await nuovaScheda();
const { orgId } = await registraEEntra(studio.page, sql, {
  base: BASE,
  nome: "Titolare Studio",
  email: TITOLARE,
  pwd: PWD_COLLAUDO,
});
// Un piano vero: gli inviti sono una capacità che si compra.
await sql`update org_entitlement set status='active', piano='studio', activated_at=now()
          where organization_id=${orgId}`;

let idInvito = null;

await prova("lo studio manda l'invito", async () => {
  await studio.page.goto(`${BASE}/impostazioni/membri`, { waitUntil: "networkidle" });
  await studio.page.locator("#invita-email").fill(COLLEGA);
  await studio.page.getByRole("button", { name: /Invia invito/i }).click();
  for (let t = 0; t < 20 && !idInvito; t++) {
    await studio.page.waitForTimeout(500);
    const [r] = await sql`select id from invitation where email=${COLLEGA} and organization_id=${orgId}`;
    if (r) idInvito = r.id;
  }
  if (!idInvito) throw new Error("nessun invito nel database");
});

// ─── il collegamento della posta ─────────────────────────────────────────────
console.log("\n— il collegamento che arriva per posta —");

await prova("l'indirizzo dell'invito NON risponde 404", async () => {
  // È il difetto che questo collaudo esiste per prendere.
  const r = await studio.page.request.get(`${BASE}/accept-invitation/${idInvito}`);
  if (r.status() === 404) throw new Error("la pagina di accettazione non esiste (404)");
  if (!r.ok()) throw new Error(`risposta ${r.status()}`);
});

await prova("un invito inventato non dice che cosa c'è dietro", async () => {
  const { ctx, page } = await nuovaScheda();
  await page.goto(`${BASE}/accept-invitation/inesistente-1234567890`, { waitUntil: "domcontentloaded" });
  const t = await page.locator("main, body").first().innerText();
  if (!/non trovato/i.test(t)) throw new Error("non lo dice: " + t.slice(0, 80));
  await ctx.close();
});

// ─── il collega ──────────────────────────────────────────────────────────────
console.log("\n— il collega entra —");
const collega = await nuovaScheda();

await prova("la pagina mostra lo studio e l'indirizzo invitato", async () => {
  await collega.page.goto(`${BASE}/accept-invitation/${idInvito}`, { waitUntil: "networkidle" });
  const t = await collega.page.locator("body").innerText();
  if (!t.includes("Titolare Studio") && !/entra in/i.test(t)) {
    throw new Error("non nomina lo studio: " + t.slice(0, 120));
  }
  if (!t.includes(COLLEGA)) throw new Error("non dice per quale indirizzo è l'invito");
});

await prova("l'indirizzo è già scritto e non si può cambiare", async () => {
  // Iscriversi con un'altra email porterebbe a un rifiuto incomprensibile piu' tardi.
  const campo = collega.page.locator("#email");
  if ((await campo.inputValue()) !== COLLEGA) throw new Error("l'email non è precompilata");
  // `getAttribute` restituisce la stringa VUOTA per un attributo booleano presente, e la
  // stringa vuota e' falsa: la domanda giusta la si fa alla proprieta' dell'elemento.
  if (!(await campo.evaluate((el) => el.readOnly))) throw new Error("l'email si può cambiare");
});

await prova("il collega si iscrive e conferma l'indirizzo", async () => {
  await collega.page.locator("#nome").fill("Collega Invitato");
  await collega.page.locator("#password").fill(PWD_COLLAUDO);
  await collega.page.getByRole("button", { name: /crea l'account/i }).click();
  await collega.page.getByText(/Controlla la tua posta/i).waitFor({ timeout: 40000 });
  // Un collaudo non apre una casella: fa la stessa cosa che farebbe il clic sul
  // collegamento, cioè marca l'indirizzo come verificato.
  const [u] = await sql`select id from "user" where email=${COLLEGA}`;
  if (!u) throw new Error("l'utente non è stato creato");
  await sql`update "user" set email_verified=true where id=${u.id}`;
});

await prova("chi è invitato NON riceve uno studio proprio", async () => {
  // È il punto in cui un'iscrizione normale creerebbe un tenant nuovo, con la sua azienda
  // dimostrativa: l'invitato deve entrare in quello che lo invita, non aprirne un secondo.
  const righe = await sql`select o.id from organization o
    join member m on m.organization_id=o.id
    join "user" u on u.id=m.user_id where u.email=${COLLEGA}`;
  if (righe.length) throw new Error(`ha già ${righe.length} studi prima di accettare`);
});

await prova("accede e accetta l'invito", async () => {
  await collega.page.goto(`${BASE}/accept-invitation/${idInvito}`, { waitUntil: "networkidle" });
  // Il modulo d'accesso su questa pagina porta gli `id` prefissati: due moduli con gli
  // stessi identificativi darebbero HTML duplicato, e l'etichetta dell'uno punterebbe al
  // campo dell'altro.
  await collega.page.locator("#accesso-email").fill(COLLEGA);
  await collega.page.locator("#accesso-password").fill(PWD_COLLAUDO);
  await collega.page.getByRole("button", { name: /^Accedi$/ }).click();
  await collega.page.getByRole("button", { name: /^Entra in/ }).waitFor({ timeout: 30000 });
  await collega.page.getByRole("button", { name: /^Entra in/ }).click();
  await collega.page.waitForURL("**/dashboard", { timeout: 30000 });
});

await prova("è dentro lo studio giusto, e ci lavora", async () => {
  // La prova sta nel database, non nel messaggio: la riga di appartenenza.
  const [m] = await sql`select m.role from member m
    join "user" u on u.id=m.user_id
    where u.email=${COLLEGA} and m.organization_id=${orgId}`;
  if (!m) throw new Error("nessuna appartenenza allo studio che ha invitato");
  // Il portafoglio, ricaricando finche' non compare. In produzione compare subito; con
  // `next start` in locale l'elenco resta indietro di un aggiornamento (verificato: il
  // server rende il dato giusto, e' il router del client a servire il vecchio).
  let testo = "";
  for (let t = 0; t < 8; t++) {
    testo = await collega.page.locator("main").innerText();
    if (/Meccanica Adriatica/i.test(testo)) break;
    await collega.page.waitForTimeout(1200);
    await collega.page.reload({ waitUntil: "networkidle" });
  }
  if (!/Meccanica Adriatica/i.test(testo)) {
    // La verita' del SERVER, con gli stessi cookie ma senza il router del client: se
    // anche questa e' vuota, il difetto e' del prodotto e non del server di prova.
    const html = await collega.page.request.get(`${BASE}/dashboard`);
    const dalServer = await html.text();
    if (!/Meccanica Adriatica/i.test(dalServer)) {
      throw new Error("nemmeno il server rende le aziende dello studio");
    }
    throw new Error("il browser non le mostra, il server si (ritardo del router locale)");
  }
});

await prova("l'invito risulta accettato, non più pendente", async () => {
  const [i] = await sql`select status from invitation where id=${idInvito}`;
  if (i.status !== "accepted") throw new Error(`stato ${i.status}`);
});

await prova("occupa un posto del piano", async () => {
  const [c] = await sql`select count(*)::int n from member where organization_id=${orgId}`;
  if (c.n !== 2) throw new Error(`membri: ${c.n}, attesi 2`);
  await studio.page.goto(`${BASE}/impostazioni/membri`, { waitUntil: "networkidle" });
  const t = await studio.page.locator("main").innerText();
  if (!t.includes("Collega Invitato") && !t.includes(COLLEGA)) {
    throw new Error("il collega non compare fra i membri");
  }
});

await prova("riaprendo il collegamento non si accetta due volte", async () => {
  await collega.page.goto(`${BASE}/accept-invitation/${idInvito}`, { waitUntil: "networkidle" });
  const t = await collega.page.locator("body").innerText();
  if (!/già/i.test(t)) throw new Error("non dice che è già stato usato: " + t.slice(0, 100));
  const [c] = await sql`select count(*)::int n from member where organization_id=${orgId}`;
  if (c.n !== 2) throw new Error(`l'appartenenza è stata duplicata: ${c.n} membri`);
});

// ─── chi non è stato invitato ────────────────────────────────────────────────
console.log("\n— chi non è stato invitato —");

await prova("un estraneo con la sessione aperta non entra", async () => {
  // Il caso vero: chi lavora su piu' studi ha spesso gia' una sessione aperta, e non deve
  // trovarsi dentro un'organizzazione altrui senza aver capito quando.
  const altro = await nuovaScheda();
  await registraEEntra(altro.page, sql, {
    base: BASE,
    nome: "Estraneo",
    email: ESTRANEO,
    pwd: PWD_COLLAUDO,
  });
  const [nuovo] = await sql`insert into invitation (id, organization_id, email, role, status, expires_at, inviter_id, created_at)
    select ${`inv-est-${RUN}`}, ${orgId}, ${COLLEGA}, 'member', 'pending', now() + interval '7 days', m.user_id, now()
    from member m where m.organization_id=${orgId} and m.role='owner' limit 1
    returning id`;

  await altro.page.goto(`${BASE}/accept-invitation/${nuovo.id}`, { waitUntil: "networkidle" });
  const t = await altro.page.locator("body").innerText();
  if (!/altro indirizzo/i.test(t)) throw new Error("non avvisa: " + t.slice(0, 120));

  // E la prova che conta: nessuna riga scritta.
  const [c] = await sql`select count(*)::int n from member m join "user" u on u.id=m.user_id
                        where m.organization_id=${orgId} and u.email=${ESTRANEO}`;
  if (c.n) throw new Error("l'estraneo è entrato nello studio");
  await altro.ctx.close();
  await sql`delete from invitation where id=${nuovo.id}`;
});

await prova("un invito scaduto lo dice, e non fa entrare", async () => {
  const id = `inv-scad-${RUN}`;
  await sql`insert into invitation (id, organization_id, email, role, status, expires_at, inviter_id, created_at)
    select ${id}, ${orgId}, ${COLLEGA}, 'member', 'pending', now() - interval '1 day', m.user_id, now()
    from member m where m.organization_id=${orgId} and m.role='owner' limit 1`;
  await collega.page.goto(`${BASE}/accept-invitation/${id}`, { waitUntil: "networkidle" });
  const t = await collega.page.locator("body").innerText();
  if (!/scadut/i.test(t)) throw new Error("non dice che è scaduto: " + t.slice(0, 100));
  await sql`delete from invitation where id=${id}`;
});

console.log(`\nInvito: ${ok} ok, ${falliti.length} falliti`);
if (falliti.length) {
  console.log("\nDA GUARDARE:");
  for (const f of falliti) console.log(`  · ${f.nome}\n      ${f.motivo}`);
}

await browser.close();
await sql.end();
process.exit(falliti.length ? 1 : 0);
