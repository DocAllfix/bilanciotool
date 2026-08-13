// Collaudo esaustivo del conto IN PROVA, contro la produzione.
//
//   BASE=https://evalisdeck.it node scripts/verifica-tutto-demo.mjs
//
// Chi entra in prova puo' guardare tutto e lavorare sull'azienda dimostrativa, ma NON
// puo' creare aziende proprie, esportare o pubblicare. Il divieto vale sul server: la
// pagina puo' solo nascondere i comandi, e nascondere non e' impedire.
//
// Ogni gesto passa dal banco di prova: console, richieste fallite, avvisi rossi.

import { chromium } from "@playwright/test";
import postgres from "postgres";
import "dotenv/config";
import { registraEEntra } from "./comune-registrazione.mjs";
import { strumenta, contatore } from "./comune-collaudo.mjs";

/** Riusa un conto gia' esistente quando il freno sulle registrazioni ha gia' colpito. */
async function entra(page, sql, base, email) {
  await page.goto(`${base}/login`, { waitUntil: "networkidle" });
  await page.fill("#email", email);
  await page.fill("#password", PWD);
  await page.click('button[type="submit"]');
  await page.waitForURL("**/dashboard", { timeout: 40_000 });
  const r = page.getByRole("button", { name: "Rifiuta", exact: true });
  if (await r.count()) { await r.click(); await page.waitForTimeout(400); }
  const [u] = await sql`select id from "user" where email = ${email}`;
  const [m] = await sql`select organization_id from member where user_id = ${u.id}`;
  return { orgId: m.organization_id };
}

const BASE = (process.env.BASE ?? "https://evalisdeck.it").replace(/\/+$/, "");
const EMAIL = `tutto-demo-${Date.now()}@example.com`;
const PWD = process.env.PWD_CONTO ?? "PasswordSicura123!";
const sql = postgres(process.env.DATABASE_URL, { prepare: false, max: 2 });

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 1500, height: 1000 } });
// La sequenza di benvenuto ha il suo collaudo: qui coprirebbe le pagine con un velo.
await ctx.addInitScript(() => {
  try {
    localStorage.setItem("evalisdeck-benvenuto", "1");
    for (const p of ["portfolio", "ghg", "bilancio", "energetico", "fornitore", "soa"]) {
      localStorage.setItem(`evalisdeck-tour:${p}`, "1");
    }
  } catch {}
});
const page = await ctx.newPage();
const sonda = strumenta(page);
const { agisci, respinto, riepilogo } = contatore(page, sonda);

const { orgId } = process.env.CONTO
  ? await entra(page, sql, BASE, process.env.CONTO)
  : await registraEEntra(page, sql, { base: BASE, nome: "In Prova", email: EMAIL, pwd: PWD });
const [az] = await sql`select id from company where organization_id=${orgId} and is_demo=true`;
const A = `/aziende/${az.id}`;
const vai = (r) => page.goto(`${BASE}${r}`, { waitUntil: "networkidle" });

console.log("\n— la corazza dell'applicazione —");
for (const [nome, sel, atteso] of [
  ["barra: Portafoglio", 'a[href="/dashboard"]', "/dashboard"],
  ["barra: Documenti", 'a[href="/documenti"]', "/documenti"],
  ["barra: Impostazioni", 'a[href="/impostazioni"]', "/impostazioni"],
  ["barra: Guida", 'a[href="/guida"]', "/guida"],
]) {
  await agisci(nome, async () => {
    await page.locator(sel).first().click();
    await page.waitForURL(`**${atteso}`, { timeout: 20_000 });
  });
}

await agisci("interruttore del tema", async () => {
  await vai("/dashboard");
  const prima = await page.evaluate(() => document.documentElement.className);
  await page.getByRole("button", { name: /Passa al tema/i }).click();
  await page.waitForTimeout(500);
  const dopo = await page.evaluate(() => document.documentElement.className);
  if (prima === dopo) throw new Error("il tema non e' cambiato");
  await page.getByRole("button", { name: /Passa al tema/i }).click();
});

await agisci("la barra si comprime e resta compressa", async () => {
  await page.getByRole("button", { name: /Comprimi|Espandi/i }).first().click();
  await page.waitForTimeout(600);
  await vai("/dashboard");
  const stato = await page.evaluate(() => localStorage.getItem("evalisdeck-sidebar"));
  if (!stato) throw new Error("la scelta non e' stata ricordata");
  await page.getByRole("button", { name: /Comprimi|Espandi/i }).first().click();
});

await agisci("menu mobile", async () => {
  await page.setViewportSize({ width: 420, height: 900 });
  await vai("/dashboard");
  await page.getByRole("button", { name: /Apri menu/i }).click();
  await page.waitForTimeout(500);
  const voci = await page.locator('a[href="/documenti"]').count();
  if (!voci) throw new Error("il menu mobile non elenca le pagine");
  await page.keyboard.press("Escape");
  await page.setViewportSize({ width: 1500, height: 1000 });
});

for (const [nome, href] of [["Privacy", "/privacy"], ["Cookie", "/cookie"], ["Termini", "/termini"]]) {
  await agisci(`piede: ${nome}`, async () => {
    await vai("/dashboard");
    await page.locator(`footer a[href="${href}"]`).first().click();
    await page.waitForURL(`**${href}`, { timeout: 20_000 });
  });
}

console.log("\n— portafoglio e fascicolo —");
await agisci("il portafoglio elenca l'azienda dimostrativa", async () => {
  await vai("/dashboard");
  if (!(await page.getByText(/Meccanica Adriatica/).count())) throw new Error("azienda assente");
});

await respinto("in prova non si crea un'azienda propria", async () => {
  await page.getByRole("button", { name: /^Nuova azienda$/ }).first().click();
  await page.waitForTimeout(700);
  await page.locator("#na-nome").fill("Azienda Vietata S.r.l.");
  await page.getByRole("button", { name: /^Crea azienda$/ }).click();
}, {
  prova: async () => {
    const [r] = await sql`select count(*)::int n from company where organization_id=${orgId} and is_demo=false`;
    return r.n === 0;
  },
});

await agisci("«Altre azioni» si apre", async () => {
  await vai("/dashboard");
  await page.getByRole("button", { name: /Altre azioni/i }).first().click();
  await page.waitForTimeout(400);
  if (!(await page.locator('[role="menu"], [role="menuitem"]').count())) throw new Error("nessun menu");
  await page.keyboard.press("Escape");
});

await agisci("la card porta al fascicolo", async () => {
  await vai("/dashboard");
  await page.locator(`a[href="${A}"]`).first().click();
  await page.waitForURL(`**${A}`, { timeout: 20_000 });
});

await agisci("il fascicolo elenca i cinque percorsi", async () => {
  const t = await page.locator("main").innerText();
  for (const n of ["Inventario GHG", "Bilancio di sostenibilità", "Diagnosi energetica", "Autovalutazione ESG", "Dichiarazione di Applicabilità"]) {
    if (!t.includes(n)) throw new Error(`manca ${n}`);
  }
});

// Il collegamento consegna al cliente i documenti pubblicati: e' un ESPORTO, ed e'
// esattamente la capacita' che la prova non ha. La prova sta nel database, perche' qui
// il prodotto non mostrava nessun rifiuto e riusciva.
// Il conteggio dev'essere DIFFERENZIALE: un conto riusato porta i collegamenti creati
// dalle esecuzioni precedenti, e un totale assoluto li attribuirebbe a questo gesto.
const collegamenti = async () => {
  const [r] = await sql`select count(*)::int n from company_share_link where company_id=${az.id}`;
  return r.n;
};
const primaDelTentativo = await collegamenti();
await respinto("in prova non si genera il collegamento per il cliente", async () => {
  await page.locator("#cond-nota").fill("Prova vietata");
  await page.getByRole("button", { name: /Genera collegamento/i }).click();
}, { prova: async () => (await collegamenti()) === primaDelTentativo });

console.log("\n— i cinque percorsi, passo per passo —");
const PERCORSI = [
  ["GHG", `${A}/ghg/2025`, 8],
  ["Bilancio", `${A}/bilancio/2025`, 7],
  ["Energetico", `${A}/energetico/2025`, 8],
];
for (const [nome, rotta, passi] of PERCORSI) {
  for (let p = 1; p <= passi; p++) {
    await agisci(`${nome}: passo ${p} si apre senza errori`, async () => {
      await vai(`${rotta}?passo=${p}`);
      const t = await page.locator("main").innerText();
      if (/NaN|Infinity|\[object Object\]/.test(t)) throw new Error("valore non calcolato in pagina");
      if (/Ã¨|Ã |Ã²|Ã¹|Ã©/.test(t)) throw new Error("codifica dei caratteri rotta");
    }, { attesa: 400 });
  }
}
for (const [nome, rotta, viste] of [
  ["Fornitore", `${A}/fornitore`, ["quadro", "questionario", "piano", "documenti", "anagrafica", "attestato"]],
  ["SoA", `${A}/soa`, ["quadro", "contesto", "controlli", "verifiche", "piano", "documento"]],
]) {
  await vai(rotta);
  for (const v of viste) {
    await agisci(`${nome}: vista «${v}»`, async () => {
      const b = page.locator(`[data-tour="${nome === "Fornitore" ? "sup" : "soa"}-vista-${v}"]`).first();
      if (await b.count()) await b.click();
      else await page.getByRole("button", { name: new RegExp(v, "i") }).first().click();
      await page.waitForTimeout(500);
      const t = await page.locator("main").innerText();
      if (/NaN|Infinity|\[object Object\]/.test(t)) throw new Error("valore non calcolato in pagina");
    }, { attesa: 300 });
  }
}

console.log("\n— si puo' lavorare sull'azienda dimostrativa —");
await agisci("GHG: cambiare un confine si salva", async () => {
  await vai(`${A}/ghg/2025?passo=1`);
  await page.locator("#b-responsabile").fill("Ing. Prova Collaudo");
  await page.locator("#b-periodo").click();
  await page.waitForTimeout(1600);
  await vai(`${A}/ghg/2025?passo=1`);
  const v = await page.locator("#b-responsabile").inputValue();
  if (v !== "Ing. Prova Collaudo") throw new Error(`salvato «${v}»`);
});

await agisci("Fornitore: cambiare una risposta si salva", async () => {
  await vai(`${A}/fornitore`);
  await page.getByRole("button", { name: /Questionario/i }).first().click();
  await page.waitForTimeout(1000);
  // Il nome accessibile porta la domanda davanti: «B1: In parte», non «In parte».
  await page.getByRole("button", { name: "B1: In parte", exact: true }).click();
  await page.waitForTimeout(1800);
  const [r] = await sql`select a.risposta from supplier_answer a
    join supplier_assessment s on s.id = a.assessment_id
    where s.company_id = ${az.id} and a.question_key = 'B1'`;
  if (r?.risposta !== "parziale") throw new Error(`nel database c'e' «${r?.risposta}»`);
  await page.getByRole("button", { name: "B1: Sì", exact: true }).click();
  await page.waitForTimeout(1200);
});

await agisci("SoA: cambiare lo stato di un controllo si salva", async () => {
  await vai(`${A}/soa`);
  await page.getByRole("button", { name: /^Controlli/ }).first().click();
  await page.waitForTimeout(1200);
  // Lo stato e' un combobox: il nome accessibile e' il campo («Stato di attuazione di
  // 5.3»), il valore sta dentro. Cercarlo per l'etichetta visibile non lo trova.
  const stato = page.locator('[aria-label^="Stato di attuazione di"]').first();
  await stato.scrollIntoViewIfNeeded();
  await stato.click();
  await page.waitForTimeout(600);
  await page.getByRole("option", { name: "Pianificato", exact: true }).click();
  await page.waitForTimeout(1800);
  const [r] = await sql`select count(*)::int n from soa_control_decision d
    join soa_declaration s on s.id = d.declaration_id
    where s.company_id = ${az.id} and d.stato = 'pl'`;
  if (!r.n) throw new Error("nessun controllo risulta pianificato");
});

console.log("\n— cio' che la prova non concede —");
const nessunoSnapshot = async () => {
  const [r] = await sql`select count(*)::int n from document_snapshot where organization_id=${orgId}`;
  return r.n === 0;
};
for (const [nome, rotta] of [
  ["il Rapporto GHG", `${A}/ghg/2025?passo=8`],
  ["il Bilancio", `${A}/bilancio/2025?passo=7`],
  ["la Diagnosi energetica", `${A}/energetico/2025?passo=8`],
]) {
  await respinto(`in prova non si pubblica ${nome}`, async () => {
    await vai(rotta);
    await page.getByRole("button", { name: /^Pubblica/ }).first().click();
  }, { attesa: 4000, prova: nessunoSnapshot });
}
await respinto("in prova non si pubblica l'Attestato ESG", async () => {
  await vai(`${A}/fornitore`);
  await page.getByRole("button", { name: /Attestato/ }).first().click();
  await page.waitForTimeout(900);
  await page.getByRole("button", { name: /^Pubblica/ }).first().click();
}, { attesa: 4000, prova: nessunoSnapshot });
await respinto("in prova non si pubblica la Dichiarazione SoA", async () => {
  await vai(`${A}/soa`);
  await page.getByRole("button", { name: /Dichiarazione/ }).first().click();
  await page.waitForTimeout(900);
  await page.getByRole("button", { name: /^Pubblica/ }).first().click();
}, { attesa: 4000, prova: nessunoSnapshot });

console.log("\n— archivio, guida, impostazioni —");
await agisci("archivio documenti: i filtri sono nell'indirizzo", async () => {
  await vai("/documenti");
  await page.locator('a[href="/documenti?tipo=ghg"]').first().click();
  await page.waitForURL("**/documenti?tipo=ghg", { timeout: 20_000 });
});

await agisci("guida: «Rivedi i tour dall'inizio» rimette i tour", async () => {
  await vai("/guida");
  await page.getByRole("button", { name: /Rivedi i tour/i }).click();
  await page.waitForTimeout(700);
  const resta = await page.evaluate(() => localStorage.getItem("evalisdeck-tour:portfolio"));
  if (resta) throw new Error("i tour risultano ancora visti");
  await page.evaluate(() => {
    for (const p of ["portfolio", "ghg", "bilancio", "energetico", "fornitore", "soa"]) {
      localStorage.setItem(`evalisdeck-tour:${p}`, "1");
    }
  });
});

// Il nome dev'essere DIVERSO a ogni esecuzione: «Salva» resta spento finche' non
// cambia niente — comportamento giusto, che con un nome fisso faceva fallire il
// collaudo alla seconda esecuzione sullo stesso conto.
const NUOVO_NOME = `Studio Collaudo ${new Date().toISOString().slice(11, 19)}`;
await agisci("impostazioni: «Salva» resta spento finche' non cambia niente", async () => {
  await vai("/impostazioni");
  if (!(await page.getByRole("button", { name: /^Salva/ }).isDisabled())) {
    throw new Error("si puo' salvare senza aver modificato nulla");
  }
});
await agisci("impostazioni: rinominare lo studio si salva", async () => {
  await page.locator("#nome-studio").fill(NUOVO_NOME);
  await page.getByRole("button", { name: /^Salva/ }).click();
  await page.waitForTimeout(1800);
  await vai("/impostazioni");
  const v = await page.locator("#nome-studio").inputValue();
  if (v !== NUOVO_NOME) throw new Error(`salvato «${v}»`);
});

await agisci("impostazioni: la scheda Membri mostra il limite", async () => {
  await vai("/impostazioni/membri");
  const t = await page.locator("main").innerText();
  if (!/\d+\s*(di|su)\s*\d+/.test(t)) throw new Error("nessun conteggio degli accessi");
});

await agisci("impostazioni: l'abbonamento propone i piani a chi non ne ha", async () => {
  await vai("/impostazioni/abbonamento");
  const t = await page.locator("main").innerText();
  for (const atteso of ["1.450 €", "2.900 €", "600 €"]) {
    if (!t.includes(atteso)) throw new Error(`manca ${atteso}`);
  }
});

await agisci("l'invito a un collega parte", async () => {
  await vai("/impostazioni/membri");
  await page.locator("#invita-email").fill(`collega-${Date.now()}@example.com`);
  await page.getByRole("button", { name: /Invia invito/i }).click();
  await page.waitForTimeout(2000);
});

// Qui il collaudo si FERMA prima di uscire verso Stripe, e non è pigrizia: in
// produzione le chiavi sono vive, e ogni clic su «Paga» creerebbe un cliente e una
// sessione veri nell'account che incassa. A ogni esecuzione. Che il pulsante porti
// davvero al pagamento lo prova `qa -- estensioni`, che gira contro le chiavi di prova.
await agisci("il dialogo d'acquisto è pronto a mandare al pagamento", async () => {
  await vai("/impostazioni/abbonamento");
  await page.getByRole("button", { name: /^(Attiva|Passa a questo)/ }).first().click();
  await page.waitForTimeout(900);
  const d = page.getByRole("dialog");
  if (!(await d.count())) throw new Error("il dialogo d'acquisto non si apre");
  const t = await d.innerText();
  if (!/Blocchi da \d+ aziende/.test(t)) throw new Error("non offre le estensioni");
  if (!/Primo anno/.test(t)) throw new Error("non mostra il totale del primo anno");
  const paga = d.getByRole("button", { name: /^Paga / });
  if (!(await paga.count())) throw new Error("nessun comando per pagare");
  if (await paga.isDisabled()) throw new Error("il comando per pagare è spento");
  await page.keyboard.press("Escape");
});

await agisci("il menu utente si apre e fa uscire", async () => {
  await vai("/dashboard");
  await page.getByRole("button", { name: "Menu utente" }).click();
  await page.waitForTimeout(600);
  const voci = await page.locator('[role="menuitem"]').allInnerTexts();
  if (!voci.length) throw new Error("menu utente vuoto");
  const esci = page.getByRole("menuitem", { name: /Esci|Disconnetti|Logout/i }).first();
  if (!(await esci.count())) throw new Error(`nessuna voce per uscire: ${voci.join(" / ")}`);
  await esci.click();
  await page.waitForURL(/\/(login)?$/, { timeout: 25_000 });
  // Uscito davvero: una pagina protetta deve rimandare all'accesso.
  await vai("/dashboard");
  if (!/\/login/.test(page.url())) throw new Error("la sessione e' rimasta viva dopo l'uscita");
});

const ko = riepilogo("Conto in prova");
await sql.end();
await browser.close();
if (ko > 0) process.exitCode = 1;
