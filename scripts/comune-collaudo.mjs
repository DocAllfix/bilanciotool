// Banco di prova condiviso: strumenta la pagina e misura ogni gesto.
//
// Tre rilevatori, perche' un difetto si manifesta in tre modi diversi e nessuno dei
// tre li vede tutti:
//   1. errori di console e eccezioni non catturate  -> il codice e' esploso;
//   2. risposte HTTP >= 400                          -> il server ha rifiutato;
//   3. avvisi rossi (sonner)                         -> l'azione e' stata respinta
//      con garbo, ed e' il caso che gli altri due non vedono MAI: una server action
//      che torna {ok:false} risponde 200 e non scrive niente in console.
//
// Il terzo e' il piu' importante: e' esattamente come il prodotto comunica un
// fallimento all'utente, e un collaudo che non lo guarda dichiara verde una pagina
// in cui non funziona niente.

/**
 * Indirizzi di terze parti che possono fallire senza che sia colpa nostra.
 *
 * ⚠️ `/monitoraggio` e' Sentry travestito da noi. E' il `tunnelRoute` — le segnalazioni
 * passano dal nostro dominio per non farsi bloccare dai filtri pubblicitari — quindi
 * l'indirizzo e' nostro ma il destinatario no. In locale, senza chiave, risponde 500: un
 * 500 che non dice niente sul prodotto, e che faceva diventare rosso un collaudo per un
 * servizio esterno non configurato. `sentry.io` era gia' in questo elenco: il tunnel e'
 * la stessa cosa con un altro nome.
 */
import { readFileSync } from "node:fs";

// ⚠️ `vercel.live` e' lo script del riquadro di commento che Vercel inietta da sola
// nelle ANTEPRIME. La nostra CSP lo blocca — giustamente, non lo abbiamo messo noi —
// e il browser stampa una violazione a ogni pagina. Non e' un difetto del prodotto e
// in produzione non esiste: qui farebbe solo diventare rossi i collaudi sull'anteprima.
const ESTRANEI = /(stripe\.com|google-analytics|googletagmanager|sentry\.io|supabase\.co|vercel\.live|\/monitoraggio)/;

/**
 * Il server in ascolto sta servendo QUESTO build?
 *
 * ⚠️ `CLAUDE.md` dice da tempo che «un next start non rilegge il sorgente», e non basta.
 * Il modo in cui ci si ricasca e' piu' sottile: si lancia `npm run start`, quello
 * fallisce con `EADDRINUSE` perche' un server di ore prima e' ancora acceso, e la porta
 * risponde 200 lo stesso. Guardare l'ora in cui si e' LANCIATO un server non prova
 * niente — conta l'ora del processo che risponde, e non si vede da qui.
 *
 * Il build id invece si puo' chiedere. Sta in `.next/BUILD_ID` e cambia a ogni build; il
 * manifesto sotto quel nome esiste solo nel server che quel build lo ha caricato. Un
 * server vecchio risponde 404 e il collaudo si ferma subito, invece di produrre un
 * referto su codice di ieri.
 *
 * ⚠️ Solo in locale: in produzione il build id di questa macchina non c'entra niente.
 */
export async function pretendiServerAggiornato(base) {
  if (!/^https?:\/\/(localhost|127\.0\.0\.1)/.test(base)) return;
  const { readFileSync } = await import("node:fs");
  let buildId;
  try {
    buildId = readFileSync(".next/BUILD_ID", "utf8").trim();
  } catch {
    throw new Error("Manca .next/BUILD_ID: esegui `npm run build` prima del collaudo.");
  }
  const r = await fetch(`${base}/_next/static/${buildId}/_buildManifest.js`);
  if (!r.ok) {
    throw new Error(
      `Il server su ${base} NON sta servendo il build corrente (${buildId}): ha risposto ${r.status}.\n` +
        "Quasi sempre significa che un `next start` di prima e' ancora acceso e il tuo e' morto con EADDRINUSE.\n" +
        "Fermalo davvero — la porta va vista libera — poi riavvia e rilancia.",
    );
  }
}

/**
 * Fa passare i collaudi attraverso la protezione delle ANTEPRIME di Vercel.
 *
 * ⚠️ Le anteprime di questo progetto sono protette (`ssoProtection:
 * all_except_custom_domains`): senza il segreto una navigazione riceve un 302 verso la
 * pagina di accesso di Vercel, e il collaudo misura QUELLA — riferendo difetti che non
 * esistono su un prodotto che non ha nemmeno aperto. La firma e' inconfondibile: «il
 * marchio non si comprime», «il banner non offre entrambe le scelte», «nessun comando
 * visibile». Tutto assente, perche' e' un'altra pagina.
 *
 * ⚠️ SI APPLICA AL BROWSER, NON AL CONTESTO. Applicandolo al solo contesto della pagina
 * ricevuta, i contesti che il collaudo crea DOPO — quelli delle prove da telefono, che
 * aprono `browser.newContext()` per ogni larghezza — restavano scoperti: il grosso dei
 * controlli passava e tre cadevano, e a occhio sembravano difetti del prodotto.
 * Avvolgendo `newContext` il segreto vale anche per i contesti che non esistono ancora.
 */
export async function attraversaProtezione(page) {
  const segreto = process.env.VERCEL_AUTOMATION_BYPASS_SECRET;
  if (!segreto) return;
  const intestazione = { "x-vercel-protection-bypass": segreto };

  const contesto = page.context();
  const browser = contesto.browser?.();

  // ⚠️ E SI BLOCCA IL RIQUADRO DI COMMENTO CHE VERCEL INIETTA DA SOLA.
  //
  // `vercel.live/_next-live/feedback/feedback.js` non lo abbiamo messo noi e in produzione
  // non esiste: lo aggiunge l'host alle anteprime. La nostra CSP lo blocca — giustamente —
  // e il browser stampa una violazione a ogni pagina. I collaudi che tengono un elenco
  // proprio degli errori di console lo raccoglievano e uscivano rossi con tutti i controlli
  // verdi: «SGI QAS: 32 ok, 0 ko» seguito da un errore di console che non e' del prodotto.
  //
  // Bloccarlo non e' nascondere un difetto: e' far comportare l'anteprima come la
  // produzione, dove quello script non c'e'.
  await contesto
    .route(/vercel\.live/, (rotta) => rotta.abort())
    .catch(() => {});
  // L'avvolgimento e' SINCRONO di proposito: chi chiama `strumenta` non puo' attendere,
  // e cio' che conta e' che i contesti successivi nascano gia' con l'intestazione.
  if (browser && !browser.__bypassAnteprima) {
    const originale = browser.newContext.bind(browser);
    browser.newContext = (opzioni = {}) =>
      originale({ ...opzioni, extraHTTPHeaders: { ...(opzioni.extraHTTPHeaders ?? {}), ...intestazione } });
    browser.__bypassAnteprima = true;
  }
  await contesto.setExtraHTTPHeaders(intestazione).catch(() => {});
}

/**
 * Il messaggio viene dalla PIATTAFORMA e non dal prodotto?
 *
 * ⚠️ Vercel inietta nelle anteprime il suo riquadro di commento
 * (`vercel.live/_next-live/feedback/feedback.js`). La nostra CSP lo blocca — giustamente,
 * non lo abbiamo messo noi — e il browser stampa una violazione a ogni pagina. In
 * produzione quello script non esiste.
 *
 * Non si puo' fermare intercettando la richiesta: la CSP protesta quando il TAG viene
 * analizzato, prima che la richiesta parta. E i trentasette collaudi che tengono un
 * elenco proprio degli errori di console lo raccoglievano, uscendo rossi con tutti i
 * controlli verdi — «SGI QAS: 32 ok, 0 ko» seguito da un errore che non e' del prodotto.
 *
 * Sta QUI e non ricopiato in trentasette file: un elenco di rumore che vive in
 * trentasette copie diverge alla prima aggiunta.
 */
/**
 * Il PDF e' DAVVERO il documento, non una pagina qualunque stampata bene.
 *
 * ⚠️ Nasce da un difetto che i controlli non hanno visto per un giro intero. Il
 * generatore apre il PROPRIO indirizzo con Chromium; su un'anteprima protetta riceveva
 * la pagina di accesso di Vercel e stampava quella. Il risultato: un PDF valido, byte
 * magici giusti, 141 KB — e passava «il PDF si genera e non e' vuoto» a occhi chiusi.
 *
 * Due documenti DIVERSI uscivano di 141.714 byte identici, ed e' li' che si e' visto.
 *
 * La domanda giusta non e' «quanto pesa» ma «quante pagine ha»: i documenti di questo
 * prodotto sono tutti di piu' pagine, una pagina di accesso e' una sola. Il conteggio si
 * legge dal PDF senza librerie, dal `/Count` dell'albero delle pagine.
 */
export function pagineDelPdf(buf) {
  const t = buf.toString("latin1");
  const conteggi = [...t.matchAll(/\/Count\s+(\d+)/g)].map((m) => Number(m[1]));
  return conteggi.length ? Math.max(...conteggi) : 0;
}

/** Solleva se il PDF non e' un documento vero. */
export function pretendiPdfVero(buf, { pagineMinime = 2, byteMinimi = 40_000 } = {}) {
  if (buf.subarray(0, 4).toString() !== "%PDF") throw new Error("non e' un PDF");
  if (buf.length < byteMinimi) throw new Error(`solo ${buf.length} byte`);
  const pagine = pagineDelPdf(buf);
  if (pagine < pagineMinime) {
    throw new Error(
      `${pagine} pagina/e: troppo poche per un documento. ` +
        "Su un'anteprima protetta questo e' il sintomo di Chromium che ha stampato la " +
        "pagina di accesso di Vercel invece del documento.",
    );
  }
  return { byte: buf.length, pagine };
}

export function rumoreDiPiattaforma(testo) {
  return /vercel\.live|_next-live\/feedback/.test(String(testo));
}

export function strumenta(page, { ignora = [] } = {}) {
  // Il bypass si mette qui perche' `strumenta` e' la prima cosa che un collaudo
  // fa con la pagina: un posto solo, e vale per tutti.
  void attraversaProtezione(page);
  const problemi = [];
  const nuovi = () => problemi.splice(0, problemi.length);

  page.on("console", (m) => {
    if (m.type() !== "error") return;
    const t = m.text();
    if (ESTRANEI.test(t) || ignora.some((r) => r.test(t))) return;
    problemi.push(`console: ${t.slice(0, 200)}`);
  });
  page.on("pageerror", (e) => problemi.push(`eccezione: ${String(e.message).slice(0, 200)}`));
  page.on("response", (r) => {
    if (r.status() < 400) return;
    const u = r.url();
    if (ESTRANEI.test(u) || ignora.some((x) => x.test(u))) return;
    problemi.push(`HTTP ${r.status()} ${u.replace(/^https?:\/\/[^/]+/, "").slice(0, 120)}`);
  });

  return { problemi, nuovi };
}

/** Testo degli avvisi rossi presenti adesso. */
export async function avvisiRossi(page) {
  return page
    .locator('[data-sonner-toast][data-type="error"]:not([data-gia-visto])')
    .allInnerTexts()
    .catch(() => []);
}

/**
 * Tutti i modi in cui il prodotto dice «no»: l'avviso che scompare da solo E il
 * messaggio che resta accanto al comando. Il paywall usa il secondo, e un collaudo
 * che guarda solo il primo dichiara «nessun rifiuto» dove il rifiuto c'e' stato.
 */
export async function messaggiDiRifiuto(page) {
  return page.evaluate(() =>
    [
      ...document.querySelectorAll(
        '[data-sonner-toast]:not([data-gia-visto]), [role="alert"], .text-destructive',
      ),
    ]
      .map((e) => (e.innerText || "").trim().replace(/\s+/g, " "))
      .filter(Boolean),
  ).catch(() => []);
}

/**
 * Archivia gli avvisi rimasti, per non attribuirli al gesto successivo.
 *
 * Si MARCANO, non si rimuovono. Prima qui c'era `t.remove()`, ed era innocuo per il
 * motivo peggiore: il contenitore dei messaggi non era montato da nessuna parte, quindi
 * non c'era mai niente da rimuovere. Montandolo, quel `remove()` ha cominciato a strappare
 * dal DOM nodi che React sta gestendo, e il gesto dopo moriva con «removeChild: the node
 * to be removed is not a child of this node».
 *
 * Un attributo in piu' React lo ignora; un figlio in meno no.
 */
export async function pulisciAvvisi(page) {
  await page
    .evaluate(() => {
      document
        .querySelectorAll("[data-sonner-toast]")
        .forEach((t) => t.setAttribute("data-gia-visto", "1"));
    })
    .catch(() => {});
}

/**
 * Crea il contatore dei controlli. `agisci` esegue un gesto e lo dichiara riuscito
 * solo se non ha prodotto nessuno dei tre segnali.
 */
export function contatore(page, sonda) {
  const esiti = [];
  let ok = 0, ko = 0;

  async function agisci(nome, fn, { attesa = 900 } = {}) {
    await pulisciAvvisi(page);
    sonda.nuovi();
    try {
      const esito = await fn();
      await page.waitForTimeout(attesa);
      const rossi = await avvisiRossi(page);
      const guasti = sonda.nuovi();
      if (rossi.length) throw new Error(`avviso rosso: ${rossi.join(" / ").slice(0, 160)}`);
      if (guasti.length) throw new Error(guasti.join(" | ").slice(0, 240));
      ok++;
      esiti.push(["ok", nome]);
      console.log("  ok   " + nome);
      return esito;
    } catch (e) {
      ko++;
      esiti.push(["KO", nome, String(e.message).split("\n")[0]]);
      console.log("  KO   " + nome + " -> " + String(e.message).split("\n")[0].slice(0, 200));
      return null;
    }
  }

  /**
   * Come `agisci`, ma il gesto DEVE fallire: e' cosi' che si prova un divieto.
   *
   * `prova` e' la parola definitiva e va nel DATABASE: un messaggio di rifiuto e' un
   * indizio, la riga che non e' stata scritta e' la certezza. Senza, un'azione che
   * riesce in silenzio si legge come un'azione bloccata in silenzio, e sono l'opposto.
   */
  async function respinto(nome, fn, { attesa = 1800, motivo = /./, prova } = {}) {
    await pulisciAvvisi(page);
    sonda.nuovi();
    try { await fn(); } catch { /* anche un comando assente e' un divieto rispettato */ }
    await page.waitForTimeout(attesa);
    const rifiuti = await messaggiDiRifiuto(page);
    const guasti = sonda.nuovi();

    if (prova) {
      const intatto = await prova();
      if (!intatto) {
        ko++;
        const p = `RIUSCITO davvero: il divieto non e' stato applicato`;
        console.log("  KO   " + nome + " -> " + p);
        esiti.push(["KO", nome, p]);
        return false;
      }
      ok++; console.log("  ok   " + nome); esiti.push(["ok", nome]); return true;
    }

    const bloccato = rifiuti.some((t) => motivo.test(t)) || guasti.some((g) => /HTTP 40[13]/.test(g));
    if (bloccato) { ok++; console.log("  ok   " + nome); esiti.push(["ok", nome]); return true; }
    ko++;
    const perche = rifiuti.length ? `messaggio «${rifiuti[0].slice(0, 80)}»` : "nessun rifiuto";
    console.log("  KO   " + nome + " -> " + perche);
    esiti.push(["KO", nome, perche]);
    return false;
  }

  function riepilogo(titolo) {
    console.log(`\n${titolo}: ${ok} ok, ${ko} falliti`);
    const falliti = esiti.filter((e) => e[0] === "KO");
    if (falliti.length) {
      console.log("\nDA GUARDARE:");
      for (const [, nome, perche] of falliti) console.log(`  · ${nome}\n      ${perche}`);
    }
    return ko;
  }

  return { agisci, respinto, riepilogo, get ko() { return ko; } };
}

/**
 * Attende che una condizione sul DATABASE diventi vera, invece di scommettere su
 * quanti secondi ci metta.
 *
 * Un `waitForTimeout` fisso dopo un comando è un controllo che fallisce quando la
 * macchina è lenta e passa quando è veloce: dice qualcosa sul carico, non sul prodotto.
 * La pubblicazione del Rapporto GHG ricalcola l'intero inventario prima di congelarlo,
 * e sei secondi bastavano quasi sempre — «quasi» è la parola che rende un collaudo
 * rumore da ignorare.
 */
/**
 * Quanto vale un'attesa, dato dove si sta guardando.
 *
 * ⚠️ Le attese di questi collaudi sono tarate su LOCALHOST, dove un viaggio al database
 * costa 7 ms e una pagina si rende in 40. Contro un deploy remoto lo stesso viaggio ne
 * costa 70÷144 — è il rapporto già misurato il 25 agosto 2026 — e le stesse attese
 * diventano marginali: nel giro definitivo tre collaudi su quarantasette hanno ceduto e
 * poi sono passati da soli, e a ogni ripetizione cedeva un collaudo diverso.
 *
 * Alzare i numeri uno per uno sarebbe stato indovinare. Il fattore sta QUI, in un posto
 * solo, e si applica quando il bersaglio è remoto: un'attesa che scade contro un deploy
 * lento dice qualcosa sulla rete, non sul prodotto.
 */
export const fattoreAttesa = () => FATTORE_ATTESA;

const FATTORE_ATTESA = /^https?:\/\/(localhost|127\.0\.0\.1)/.test(process.env.BASE ?? "") ? 1 : 3;

export async function attendi(condizione, { entro = 45000 * FATTORE_ATTESA, ogni = 500, cosa = "condizione" } = {}) {
  const scade = Date.now() + entro;
  for (;;) {
    if (await condizione()) return;
    if (Date.now() > scade) throw new Error(`${cosa}: non si è avverata entro ${entro / 1000}s`);
    await new Promise((r) => setTimeout(r, ogni));
  }
}

// La card di un'azienda appena creata, attesa ricaricando.
//
// ⚠️ Il difetto per cui questa funzione ricaricava e' CHIUSO dal 23 agosto 2026 (vedi
// PRE-LAUNCH, voce 0): il portafoglio si aggiorna da solo, e creare un'azienda porta
// direttamente al suo fascicolo. Le ricariche restano come rete — questi collaudi
// devono misurare il percorso del modulo, non la reattivita' del portafoglio — ma NON
// sono piu' un aggiramento.
//
// Chi verifica che il portafoglio si aggiorni da solo usa `qa -- portafoglio-aggiorna`,
// che non ricarica mai: e' li' che il difetto tornerebbe rosso.
export async function attendiCard(page, nome, { tentativi = 12, attesa = 1500 } = {}) {
  // ⚠️ Dal 23 agosto 2026 creare un'azienda PORTA AL SUO FASCICOLO (vedi PRE-LAUNCH,
  // voce 0): chi chiama questa funzione subito dopo la creazione non e' piu' sul
  // portafoglio, e cercherebbe una card in una pagina che non ne ha. Ci si riporta.
  //
  // ⚠️ E ci si riporta SEMPRE, senza chiedere prima dove si e'. La versione precedente
  // guardava l'indirizzo e navigava solo se non era gia' il portafoglio: e' una corsa
  // con la navigazione che il prodotto ha appena avviato. Chiamata subito dopo il
  // «Crea azienda», l'indirizzo e' ancora `/dashboard` — la `router.push` non e'
  // atterrata — quindi il salto si saltava; un istante dopo arrivava il fascicolo, e i
  // dodici tentativi ricaricavano QUELLO, dove card non ce ne sono. Il collaudo moriva
  // dicendo «la card non c'e'» mentre la riga era nel database e la pagina giusta non
  // era mai stata aperta.
  //
  // Una navigazione in piu' costa un caricamento; indovinare dove si e' costa una
  // diagnosi che parte dalla parte sbagliata del sistema.
  await page.goto(new URL("/dashboard", page.url()).toString(), { waitUntil: "domcontentloaded" });
  // Si filtra per NOME e non si prende la prima card del portafoglio: la prima e'
  // l'azienda dimostrativa, seminata alla registrazione. Un `.first()` secco agirebbe
  // sulla demo, e il collaudo misurerebbe il percorso sbagliato credendolo il proprio.
  const card = page.locator('[data-slot="card"]').filter({ hasText: nome }).first();
  // ⚠️ `domcontentloaded` e non `networkidle`, ed e' la regola che questo progetto ha
  // gia' pagato una volta: networkidle pretende mezzo secondo di silenzio di rete, e la
  // dashboard ne fa poco — ogni card prefetch-a i propri collegamenti, e le richieste
  // `_rsc` si accavallano e si annullano a vicenda. Il silenzio non arriva, ogni giro
  // consuma il proprio tempo massimo, e i dodici tentativi finiscono senza che nessuno
  // abbia mai guardato se la card c'era.
  //
  // La condizione che interessa non e' «la rete tace»: e' «la card c'e'», ed e' gia'
  // scritta nella condizione del ciclo.
  for (let t = 0; t < tentativi && !(await card.count()); t++) {
    await page.waitForTimeout(attesa);
    await page.reload({ waitUntil: "domcontentloaded" });
  }
  await card.waitFor({ timeout: 20000 });
  return card;
}

/**
 * Apre il percorso `modulo` dell'azienda `nome`, partendo dal portafoglio.
 *
 * ⚠️ Dal 25 agosto 2026 la card del portafoglio NON ha piu' un collegamento per
 * percorso: mostra tre caselle di gruppo col rapporto «avviati su totale», e i percorsi
 * si aprono uno per uno dal FASCICOLO. Cinque collaudi facevano
 * `card.locator('[data-modulo="ghg"]').click()` e si sarebbero fermati tutti sullo
 * stesso scoglio, ciascuno con una diagnosi diversa da rifare.
 *
 * Sta qui e non in ognuno di quelli perche' la navigazione e' UNA: quando cambiera'
 * ancora — e cambiera' — si aggiusta in un posto solo. E' la ragione per cui
 * `attendiCard` esiste, dopo che creare un'azienda comincio' a portare altrove.
 */
export async function apriModulo(page, nome, modulo) {
  const card = await attendiCard(page, nome);
  // ⚠️ Si clicca IL COLLEGAMENTO che copre la card, non il titolo. Il titolo e' coperto
  // da quel collegamento (`absolute inset-0 z-10`), e Playwright rifiuta di cliccare un
  // elemento che qualcosa intercetta: riprova per trenta secondi e poi riferisce un
  // difetto che non c'e'. Il collegamento e' proprio l'affordance da usare — e' cio' che
  // rende la card cliccabile per intero — e si trova per nome accessibile.
  await card.locator('a[aria-label^="Apri "]').first().click();
  await page.waitForURL(/\/aziende\/[^/]+(\?|#|$)/, { timeout: 20000 });
  const voce = page.locator(`[data-percorsi] [data-modulo="${modulo}"]`);
  await voce.waitFor({ timeout: 20000 });
  await voce.locator("a").first().click();
  return page;
}

// Spegne i giri guidati prima di toccare qualunque comando.
//
// Il velo di driver.js copre la pagina e taglia un buco solo sopra l'elemento in
// evidenza: tutto il resto e' incliccabile, e Playwright riprova per venti secondi su
// un pulsante raggiungibile a occhio ma non al puntatore. Peggio: quando il buco cade
// sul comando giusto il clic passa, il gesto successivo no, e il collaudo riferisce
// «l'azienda non risulta nel database» — cioe' accusa il prodotto di un difetto che e'
// del velo. E' successo a `verifica-tutto-attivo`, che era l'unico a non farlo.
//
// I giri hanno un collaudo proprio (`qa -- benvenuto`): qui vanno tolti di mezzo.
/**
 * Le chiavi dei tour, LETTE DAL REGISTRO invece che ricopiate.
 *
 * ⚠️ Qui c'era un elenco scritto a mano, con sopra un commento che diceva «questo elenco
 * DEVE crescere insieme a `src/lib/tour/registry.ts`, e nulla lo obbliga». Era gia'
 * successo: aggiungendo il tour del Modello 231 il velo e' tornato a bloccare i clic, e
 * il collaudo di quel modulo e' morto al primo gesto — accusando il prodotto di un
 * difetto che era del velo. Un elenco che va tenuto allineato a mano prima o poi non lo
 * e' piu', e il giorno in cui succede il referto indica il posto sbagliato.
 *
 * Il registro e' TypeScript e questo file e' `.mjs`: non lo si importa, lo si legge —
 * come fa `extract-seed.mjs` con le costanti dei prototipi. Se la lettura non trova
 * niente si SOLLEVA, invece di ripiegare su un elenco vuoto: un banco di prova che si
 * disarma da solo in silenzio e' peggio di uno che non parte.
 */
function chiaviDeiTour() {
  const testo = readFileSync("src/lib/tour/registry.ts", "utf8");
  const chiavi = [...testo.matchAll(/pageId:\s*"([a-z0-9-]+)"/g)].map((m) => m[1]);
  if (!chiavi.length) {
    throw new Error(
      "Nessun pageId in src/lib/tour/registry.ts: il formato e' cambiato e spegniTour " +
        "starebbe per lasciare aperti i veli dei giri guidati, che intercettano i clic.",
    );
  }
  return chiavi;
}

export async function spegniTour(page, chiavi = chiaviDeiTour()) {
  await page.evaluate((ks) => {
    for (const k of ks) {
      try { localStorage.setItem(`evalisdeck-tour:${k}`, "1"); } catch {}
    }
  }, chiavi);

  // Ripiego autoriparante: se un velo e' gia' aperto — perche' la pagina era caricata
  // prima, o perche' la chiave di quel tour manca dall'elenco — lo si chiude. Senza,
  // il collaudo riprova per trenta secondi su un pulsante visibile e incliccabile, e
  // riferisce un difetto del prodotto che e' del velo.
  if (await page.locator(".driver-overlay").count()) {
    await page.keyboard.press("Escape");
    await page.waitForTimeout(400);
  }

  // ⚠️ E il VELO DEL BENVENUTO, che e' un'altra cosa dal velo dei tour: e' il video che
  // si apre al primo accesso, sta a `z-70` sopra tutto e intercetta i clic. Un collaudo
  // che non lo chiude riprova per trenta secondi su un pulsante visibile e incliccabile,
  // e riferisce come rotto un comando che nessuno ha mai raggiunto. La chiave e' quella
  // che il prodotto stesso scrive quando il giro e' finito.
  await page.evaluate(() => {
    try { localStorage.setItem("evalisdeck-benvenuto", "1"); } catch {}
  });
  if (await page.locator(".fixed.inset-0.z-70").count()) {
    await page.keyboard.press("Escape");
    await page.waitForTimeout(400);
  }
}
