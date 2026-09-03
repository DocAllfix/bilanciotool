// Collaudo esaustivo del conto ATTIVO, contro la produzione.
//
//   BASE=https://evalisdeck.it CONTO=<email> node scripts/verifica-tutto-attivo.mjs
//
// Qui si prova quello che il cliente paga: creare le proprie aziende, pubblicare i
// cinque documenti, scaricarne il PDF, consegnarlo al cliente con un collegamento a
// scadenza, revocarlo. Ogni scarico si controlla nei BYTE: un PDF che risponde 200 e
// contiene una pagina d'errore e' indistinguibile da uno buono, finche' non si guarda.

import { chromium } from "@playwright/test";
import postgres from "postgres";
import "dotenv/config";
import { registraEEntra } from "./comune-registrazione.mjs";
import { strumenta, contatore, attendi, spegniTour, fattoreAttesa, attraversaProtezione } from "./comune-collaudo.mjs";
import { PWD_COLLAUDO } from "./comune-credenziali.mjs";
import { PIANI, CHIAVI_PIANO, ESTENSIONI, euro, prezzoDiVendita, limitiEffettivi } from "../src/lib/prezzi.ts";

const BASE = (process.env.BASE ?? "https://evalisdeck.it").replace(/\/+$/, "");
const PWD = PWD_COLLAUDO;
const EMAIL = process.env.CONTO ?? `tutto-attivo-${Date.now()}@example.com`;
const sql = postgres(process.env.DATABASE_URL, { prepare: false, max: 2 });

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 1500, height: 1000 } });
await ctx.addInitScript(() => {
  try {
    localStorage.setItem("evalisdeck-benvenuto", "1");
    for (const p of ["portfolio", "ghg", "bilancio", "energetico", "fornitore", "soa"]) {
      localStorage.setItem(`evalisdeck-tour:${p}`, "1");
    }
  } catch {}
});
const page = await ctx.newPage();
await attraversaProtezione(page);
// I dialoghi nativi del browser Playwright li scarta da solo: senza questo, una
// conferma `confirm()` risponde sempre «no» e l'azione non parte mai — e il collaudo
// legge «non ha funzionato» dove invece non e' stato nemmeno chiesto.
page.on("dialog", (d) => d.accept().catch(() => {}));
const sonda = strumenta(page);
const { agisci, respinto, riepilogo } = contatore(page, sonda);

let orgId;
if (process.env.CONTO) {
  await page.goto(`${BASE}/login`, { waitUntil: "networkidle" });
  await page.fill("#email", EMAIL);
  await page.fill("#password", PWD);
  await page.click('button[type="submit"]');
  await page.waitForURL("**/dashboard", { timeout: 40_000 });
  const r = page.getByRole("button", { name: "Rifiuta", exact: true });
  if (await r.count()) { await r.click(); await page.waitForTimeout(400); }
  const [u] = await sql`select id from "user" where email = ${EMAIL}`;
  const [m] = await sql`select organization_id from member where user_id = ${u.id}`;
  orgId = m.organization_id;
} else {
  ({ orgId } = await registraEEntra(page, sql, { base: BASE, nome: "Studio Attivo", email: EMAIL, pwd: PWD }));
}
// Piano Studio, con il marchio dello studio acceso: cosi' si prova anche il white-label.
// ⚠️ Il piano del conto di collaudo sta in UNA costante: il nome compare nella query
// che lo attiva e nelle asserzioni sulla capienza, e due copie divergono al primo
// cambio di listino — che e' esattamente quello che e' successo il 27 agosto 2026.
const PIANO_DEL_CONTO = "studio";

await sql`update org_entitlement set status='active', piano=${PIANO_DEL_CONTO}, activated_at=now(), white_label=true
  where organization_id=${orgId}`;
await spegniTour(page);
const [demo] = await sql`select id from company where organization_id=${orgId} and is_demo=true`;
const A = `/aziende/${demo.id}`;
const vai = (r) => page.goto(`${BASE}${r}`, { waitUntil: "networkidle" });
const NOME_AZIENDA = `Collaudo Reale ${Date.now().toString().slice(-6)} S.r.l.`;

console.log("\n— le aziende dello studio —");
let mia = null;
await agisci("si crea un'azienda propria", async () => {
  await vai("/dashboard");
  await page.getByRole("button", { name: /^Nuova azienda$/ }).first().click();
  await page.waitForTimeout(700);
  await page.locator("#na-nome").fill(NOME_AZIENDA);
  await page.locator("#na-settore").fill("Collaudo");
  await page.locator("#na-sede").fill("Bari");
  await page.getByRole("button", { name: /^Crea azienda$/ }).click();
  // ⚠️ Si ATTENDE la riga, non si aspettano due secondi e mezzo. L'attesa fissa reggeva
  // quando la dashboard rispondeva in un secondo; con undici moduli ne impiega quattro-
  // otto, e la scadenza arrivava prima della scrittura. Il referto diceva «l'azienda non
  // risulta nel database» — cioe' accusava il prodotto di non aver creato niente — e i
  // nove controlli successivi cadevano a valanga sulla stessa causa.
  await attendi(async () => {
    const [r] = await sql`select id from company where organization_id=${orgId} and nome=${NOME_AZIENDA}`;
    return !!r;
  }, { entro: 40_000 * fattoreAttesa(), cosa: "l'azienda creata" });
  const [r] = await sql`select id from company where organization_id=${orgId} and nome=${NOME_AZIENDA}`;
  mia = r.id;
});

// I conteggi si leggono dal DATABASE, non si scrivono a mano: un conto riusato porta
// le aziende e i documenti delle esecuzioni precedenti, e un numero fisso fa fallire
// il collaudo alla seconda passata per un motivo che col prodotto non c'entra.
const aziendeAttive = async () => {
  const [r] = await sql`select count(*)::int n from company
    where organization_id=${orgId} and is_demo=false and stato='active'`;
  return r.n;
};
await agisci("il conteggio della capacita' si aggiorna", async () => {
  await vai("/dashboard");
  const t = await page.locator("body").innerText();
  // ⚠️ La capienza si DERIVA dal piano con cui il conto e' stato attivato. Il «10»
  // scritto a mano ha reso rosso questo controllo al cambio di fasce, e il messaggio
  // «il contatore non segna 1 di 10» manda a cercare un difetto nel contatore.
  const atteso = `${await aziendeAttive()} di ${PIANI[PIANO_DEL_CONTO].aziende}`;
  if (!t.includes(atteso)) throw new Error(`il contatore non segna «${atteso}»`);
});

await agisci("l'azienda nuova apre il proprio fascicolo", async () => {
  await vai(`/aziende/${mia}`);
  const t = await page.locator("main").innerText();
  if (!t.includes(NOME_AZIENDA)) throw new Error("il fascicolo non porta il nome");
  if (!/Da avviare/i.test(t)) throw new Error("un'azienda nuova dovrebbe avere i percorsi da avviare");
});

await agisci("si avvia un percorso GHG sull'azienda nuova", async () => {
  await vai(`/aziende/${mia}/ghg`);
  const crea = page.getByRole("button", { name: /^(Crea|Avvia|Nuovo)/ }).first();
  if (!(await crea.count())) throw new Error("nessun comando per avviare l'inventario");
  await crea.click();
  await page.waitForTimeout(2500);
  const [r] = await sql`select count(*)::int n from ghg_inventory where company_id=${mia}`;
  if (!r.n) throw new Error("nessun inventario creato");
});

console.log("\n— pubblicazione dei cinque documenti —");
const PUBBLICAZIONI = [
  ["Rapporto GHG", `${A}/ghg/2025?passo=8`, "ghg"],
  ["Bilancio", `${A}/bilancio/2025?passo=7`, "bilancio"],
  ["Bilancio energetico", `${A}/energetico/2025?passo=8`, "energetico"],
];
for (const [nome, rotta, tipo] of PUBBLICAZIONI) {
  await agisci(`si pubblica il ${nome}`, async () => {
    await vai(rotta);
    await page.getByRole("button", { name: /^Pubblica/ }).first().click();
    // Si ASPETTA lo snapshot, non si contano i secondi: la pubblicazione del Rapporto
    // GHG ricalcola l'intero inventario prima di congelarlo, e sei secondi bastavano
    // «quasi» sempre.
    await attendi(
      async () => {
        const [r] = await sql`select count(*)::int n from document_snapshot
          where organization_id=${orgId} and company_id=${demo.id} and tipo=${tipo}`;
        return r.n > 0;
      },
      { cosa: `snapshot ${tipo}` },
    );
  }, { attesa: 500 });
}
for (const [nome, rotta, vista, tipo] of [
  ["l'Attestato ESG", `${A}/fornitore`, /Attestato/, "attestato"],
  ["la Dichiarazione SoA", `${A}/soa`, /Dichiarazione/, "soa"],
]) {
  await agisci(`si pubblica ${nome}`, async () => {
    await vai(rotta);
    await page.getByRole("button", { name: vista }).first().click();
    await page.waitForTimeout(1200);
    await page.getByRole("button", { name: /^Pubblica/ }).first().click();
    // Si ASPETTA lo snapshot, non si contano i secondi: la pubblicazione del Rapporto
    // GHG ricalcola l'intero inventario prima di congelarlo, e sei secondi bastavano
    // «quasi» sempre.
    await attendi(
      async () => {
        const [r] = await sql`select count(*)::int n from document_snapshot
          where organization_id=${orgId} and company_id=${demo.id} and tipo=${tipo}`;
        return r.n > 0;
      },
      { cosa: `snapshot ${tipo}` },
    );
  }, { attesa: 500 });
}

console.log("\n— i PDF, controllati nei byte —");
const snapshots = await sql`select id, tipo, versione from document_snapshot
  where organization_id=${orgId} and company_id=${demo.id} order by tipo`;
for (const s of snapshots) {
  await agisci(`PDF «${s.tipo}» v${s.versione}: e' un PDF vero`, async () => {
    const r = await page.request.get(`${BASE}/api/documenti/${s.id}/pdf`, { timeout: 180_000 });
    if (r.status() !== 200) throw new Error(`stato ${r.status()}`);
    const b = await r.body();
    if (b.subarray(0, 5).toString() !== "%PDF-") throw new Error("non comincia con %PDF-");
    if (b.length < 40_000) throw new Error(`solo ${b.length} byte: sospetto di essere vuoto`);
  }, { attesa: 200 });
}
await agisci("il PDF si riprende dall'archivio senza rigenerarlo", async () => {
  const s = snapshots[0];
  const t0 = Date.now();
  const r = await page.request.get(`${BASE}/api/documenti/${s.id}/pdf`, { timeout: 120_000 });
  const ms = Date.now() - t0;
  if (r.status() !== 200) throw new Error(`stato ${r.status()}`);
  // La prima generazione avvia Chromium e costa decine di secondi: la seconda no.
  if (ms > 20_000) throw new Error(`${Math.round(ms / 1000)} s: sembra rigenerato`);
});

await agisci("il documento porta il marchio dello studio (white-label)", async () => {
  const [s] = await sql`select id, dati->'marchio'->>'nome' nome, (dati ? 'marchio') presente
    from document_snapshot where organization_id=${orgId} order by published_at desc limit 1`;
  if (!s.presente) throw new Error("lo snapshot non congela nessun marchio");
  if (!s.nome || /EvalisDeck/i.test(s.nome)) throw new Error(`marchio «${s.nome}» invece di quello dello studio`);
});

console.log("\n— archivio e consegna al cliente —");
await agisci("l'archivio elenca tutte le versioni pubblicate", async () => {
  const [tot] = await sql`select count(*)::int n from document_snapshot where organization_id=${orgId}`;
  await vai("/documenti");
  const t = await page.locator("main").innerText();
  if (!t.includes(`Tutti (${tot.n})`)) throw new Error(`il conteggio non dice «Tutti (${tot.n})»`);
});
await agisci("il filtro per tipo restringe l'elenco", async () => {
  const [ghg] = await sql`select count(*)::int n from document_snapshot
    where organization_id=${orgId} and tipo='ghg'`;
  await vai("/documenti?tipo=ghg");
  const righe = await page.locator("main a[href^='/documento/']").count();
  if (righe !== ghg.n) throw new Error(`${righe} documenti invece di ${ghg.n}`);
});

let url = null;

// ⚠️ Il collegamento che il prodotto genera porta all'indirizzo CANONICO, non a quello su
// cui gira: e' voluto, perche' si consegna a un cliente e vive fino a novanta giorni — da
// un'anteprima porterebbe a un host che fra un'ora non esiste.
//
// Il collaudo pero' deve aprirlo SUL BERSAGLIO: seguendolo alla lettera finiva sul sito
// vero, che non conosce quel gettone, e riferiva «l'azienda non compare» accusando la
// condivisione. Stessa correzione gia' fatta in `visual-check-condivisione`: era stata
// applicata a una copia sola.
const sulBersaglio = (indirizzo) => {
  try {
    return BASE + new URL(indirizzo).pathname;
  } catch {
    return indirizzo;
  }
};
await agisci("si genera il collegamento per il cliente", async () => {
  await vai(A);
  await page.locator("#cond-nota").fill("Amministrazione");
  await page.selectOption("#cond-durata", { index: 1 });
  await page.getByRole("button", { name: /Genera collegamento/i }).click();
  await page.waitForTimeout(3000);
  // L'indirizzo sta in un CAMPO, per poterlo copiare: `innerText` non lo vede.
  const campo = page.locator("main input[value*='documenti-cliente']").first();
  if (!(await campo.count())) throw new Error("l'indirizzo non compare");
  url = await campo.inputValue();
  const t = await page.locator("main").innerText();
  if (!/non potrai rileggerlo/i.test(t)) throw new Error("non avverte che il collegamento si vede una volta sola");
});

await agisci("il comando «Copia» mette l'indirizzo negli appunti", async () => {
  await ctx.grantPermissions(["clipboard-read", "clipboard-write"], { origin: BASE });
  await page.getByRole("button", { name: /^Copia$/ }).first().click();
  await page.waitForTimeout(800);
  const appunti = await page.evaluate(() => navigator.clipboard.readText().catch(() => ""));
  if (!appunti.includes("documenti-cliente")) throw new Error(`negli appunti c'e' «${appunti.slice(0, 40)}»`);
});

await agisci("il cliente apre il collegamento SENZA account", async () => {
  const anonimo = await browser.newContext();
  const p2 = await anonimo.newPage();
  const r = await p2.goto(sulBersaglio(url), { waitUntil: "networkidle" });
  if (!r || r.status() !== 200) throw new Error(`stato ${r?.status()}`);
  const t = await p2.locator("body").innerText();
  if (!/Meccanica Adriatica/.test(t)) throw new Error("l'azienda non compare");
  const doc = await p2.locator("a[href*='/api/condivisione/']").count();
  if (doc < 5) throw new Error(`solo ${doc} documenti scaricabili`);
  // La pagina non deve finire nei motori di ricerca.
  const noindex = await p2.locator('meta[name="robots"]').getAttribute("content").catch(() => null);
  if (!noindex || !/noindex/.test(noindex)) throw new Error("la pagina non e' noindex");
  await anonimo.close();
});

await agisci("dal collegamento si scarica un PDF vero", async () => {
  const anonimo = await browser.newContext();
  const p2 = await anonimo.newPage();
  await p2.goto(sulBersaglio(url), { waitUntil: "networkidle" });
  const href = await p2.locator("a[href*='/api/condivisione/']").first().getAttribute("href");
  const r = await p2.request.get(href.startsWith("http") ? href : `${BASE}${href}`, { timeout: 180_000 });
  if (r.status() !== 200) throw new Error(`stato ${r.status()}`);
  const b = await r.body();
  if (b.subarray(0, 5).toString() !== "%PDF-") throw new Error("non e' un PDF");
  await anonimo.close();
});

await agisci("le aperture si contano", async () => {
  const [r] = await sql`select aperture from company_share_link where company_id=${demo.id} and revoked_at is null
    order by created_at desc limit 1`;
  if (!r || r.aperture < 1) throw new Error(`aperture: ${r?.aperture}`);
});

await agisci("il collegamento si disattiva", async () => {
  await vai(A);
  // Si disattivano TUTTI: l'elenco puo' contenerne piu' d'uno e cosi' la prova
  // successiva vale per l'indirizzo che ho in mano, non per uno a caso.
  let quanti = 0;
  for (;;) {
    const spegni = page.getByRole("button", { name: /^Disattiva$/ }).first();
    if (!(await spegni.count())) break;
    await spegni.click();
    await page.waitForTimeout(2200);
    if (++quanti > 8) break;
  }
  if (!quanti) throw new Error("nessun comando per disattivare");
  const [r] = await sql`select count(*)::int n from company_share_link
    where company_id=${demo.id} and revoked_at is not null`;
  if (!r.n) throw new Error("nel database nessun collegamento risulta disattivato");
});

await agisci("dopo la revoca il collegamento non apre piu'", async () => {
  const anonimo = await browser.newContext();
  const p2 = await anonimo.newPage();
  const r = await p2.goto(sulBersaglio(url), { waitUntil: "domcontentloaded" });
  const t = await p2.locator("body").innerText();
  await anonimo.close();
  if (r.status() === 200 && /Meccanica Adriatica/.test(t)) throw new Error("i documenti si vedono ancora");
});

console.log("\n— abbonamento, membri, archiviazione —");
await agisci("l'abbonamento mostra il piano e la capacita' usata", async () => {
  await vai("/impostazioni/abbonamento");
  const t = await page.locator("main").innerText();
  if (!t.includes(PIANI[PIANO_DEL_CONTO].nome)) throw new Error("il piano non compare");
  if (!/Attivo/.test(t)) throw new Error("lo stato non compare");
  // ⚠️ La capienza si DERIVA dal piano con cui il conto e' stato attivato. Il «10»
  // scritto a mano ha reso rosso questo controllo al cambio di fasce, e il messaggio
  // «il contatore non segna 1 di 10» manda a cercare un difetto nel contatore.
  const atteso = `${await aziendeAttive()} di ${PIANI[PIANO_DEL_CONTO].aziende}`;
  if (!t.includes(atteso)) throw new Error(`la capacita' usata non dice «${atteso}»`);
});

// Chi ha gia' un piano non vedeva NIENTE: la pagina si fermava alla capacita' usata.
// Non deve per forza esserci un pulsante — comprare un'estensione a meta' anno tocca
// l'abbonamento gia' in corso, e quel flusso non c'e' — ma deve esserci una STRADA:
// quali estensioni esistono, quanto costano, e a chi scrivere per averle.
await agisci("chi ha un piano vede le estensioni e come ottenerle", async () => {
  await vai("/impostazioni/abbonamento");
  const t = await page.locator("main").innerText();
  if (!/Aggiungere capacità/i.test(t)) throw new Error("nessuna sezione per aggiungere capacita'");
  // ⚠️ L'unica estensione ricorrente in vendita e' il blocco di aziende: accessi e
  // marchio dello studio sono INCLUSI in ogni fascia dal 27 agosto 2026. Questo
  // controllo pretendeva ancora «+1 accesso» e «Documenti col tuo marchio», cioe' due
  // cose che il prodotto ha smesso di vendere apposta.
  if (!t.includes(`+${ESTENSIONI.bloccoAziende.aziende} aziende`)) {
    throw new Error("manca l'estensione dei blocchi di aziende");
  }
  if (/\+1 accesso|marchio del tuo studio.*€/i.test(t)) {
    throw new Error("la pagina vende ancora accessi o marchio, che ora sono inclusi");
  }
  if (!/access[io].*(compres|inclus)/i.test(t)) {
    throw new Error("non dice che gli accessi sono compresi");
  }
  if (!/fattur/i.test(t)) throw new Error("non dice come avere le fatture");
  if (!/disdi/i.test(t)) throw new Error("non dice come disdire");
  if (!(await page.locator("main a[href^='mailto:']").count())) throw new Error("nessun recapito su cui agire");
});

await agisci("chi ha un piano non se lo vede riproposto in vendita", async () => {
  const t = await page.locator("main").innerText();
  if (/Prezzi di lancio, validi fino al/.test(t)) throw new Error("il listino compare a chi ha gia' comprato");
});

await agisci("archiviare chiede conferma, e «Annulla» non archivia", async () => {
  await vai("/dashboard");
  await page.getByRole("button", { name: /Altre azioni/i }).first().click();
  await page.waitForTimeout(500);
  const arch = page.getByRole("menuitem", { name: /Archivia/i }).first();
  if (!(await arch.count())) throw new Error("nessuna voce «Archivia»");
  await arch.click();
  await page.waitForTimeout(800);
  const dialogo = page.getByRole("dialog");
  if (!(await dialogo.count())) throw new Error("nessuna conferma prima di archiviare");
  if (!/Archiviare/i.test(await dialogo.innerText())) throw new Error("la conferma non dice cosa sta per fare");
  await page.getByRole("button", { name: /^Annulla$/ }).click();
  await page.waitForTimeout(1200);
  const [r] = await sql`select stato from company where id=${mia}`;
  if (r.stato !== "active") throw new Error("ha archiviato dopo «Annulla»");
});

await agisci("si archivia e si ripristina un'azienda", async () => {
  await page.getByRole("button", { name: /Altre azioni/i }).first().click();
  await page.waitForTimeout(500);
  await page.getByRole("menuitem", { name: /Archivia/i }).first().click();
  await page.waitForTimeout(800);
  await page.getByRole("dialog").getByRole("button", { name: /^Archivia$/ }).click();
  await page.waitForTimeout(3000);
  let [r] = await sql`select stato from company where id=${mia}`;
  if (r.stato !== "archived") throw new Error(`dopo l'archiviazione lo stato e' «${r.stato}»`);

  // E si ripristina dall'interfaccia, non a mano nel database. Il menu va cercato
  // sulla card di QUESTA azienda: le esecuzioni precedenti ne lasciano altre in
  // archivio, e «la prima che trovo» ne ripristinava una a caso — poi il collaudo
  // guardava la nostra, la trovava ancora archiviata, e accusava il prodotto.
  await vai("/dashboard");
  // Si cerca il contenitore PIÙ PICCOLO che porti insieme il nome e il menu: risalire
  // fino a trovare il nome pesca il primo antenato comune, che avvolge tutte le card e
  // fa scegliere quella sbagliata.
  const indice = await page.evaluate((nome) => {
    const bottoni = [...document.querySelectorAll('button[aria-label="Altre azioni"]')];
    let migliore = -1;
    let piuStretto = Infinity;
    for (const e of document.querySelectorAll("main *")) {
      const t = e.innerText || "";
      if (!t.includes(nome) || t.length >= piuStretto) continue;
      const b = e.querySelector('button[aria-label="Altre azioni"]');
      if (!b) continue;
      piuStretto = t.length;
      migliore = bottoni.indexOf(b);
    }
    return migliore;
  }, NOME_AZIENDA);
  if (indice < 0) throw new Error("la card dell'azienda archiviata non si trova");
  await page.getByRole("button", { name: /Altre azioni/i }).nth(indice).click();
  await page.waitForTimeout(700);
  const rip = page.getByRole("menuitem", { name: /Ripristina/i });
  if (!(await rip.count())) throw new Error("la card archiviata non offre «Ripristina»");
  await rip.first().click();
  await page.waitForTimeout(3500);
  [r] = await sql`select stato from company where id=${mia}`;
  if (r.stato !== "active") throw new Error(`dopo il ripristino lo stato e' «${r.stato}»`);
});

// Pulizia: l'azienda creata da questa esecuzione si archivia. Le archiviate non
// contano nei limiti, altrimenti dopo dieci esecuzioni il collaudo fallirebbe per
// capacita' esaurita — e sarebbe il collaudo a essersi rotto, non il prodotto.
if (mia) await sql`update company set stato='archived' where id=${mia}`;

const ko = riepilogo("Conto attivo");
await sql.end();
await browser.close();
if (ko > 0) process.exitCode = 1;
