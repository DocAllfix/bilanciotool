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

/** Indirizzi di terze parti che possono fallire senza che sia colpa nostra. */
const ESTRANEI = /(stripe\.com|google-analytics|googletagmanager|sentry\.io|supabase\.co)/;

export function strumenta(page, { ignora = [] } = {}) {
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
export async function attendi(condizione, { entro = 45000, ogni = 500, cosa = "condizione" } = {}) {
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
  if (!/\/dashboard(\?|$)/.test(new URL(page.url()).pathname + new URL(page.url()).search)) {
    await page.goto(new URL("/dashboard", page.url()).toString(), { waitUntil: "domcontentloaded" });
  }
  // Si filtra per NOME e non si prende la prima card del portafoglio: la prima e'
  // l'azienda dimostrativa, seminata alla registrazione. Un `.first()` secco agirebbe
  // sulla demo, e il collaudo misurerebbe il percorso sbagliato credendolo il proprio.
  const card = page.locator('[data-slot="card"]').filter({ hasText: nome }).first();
  for (let t = 0; t < tentativi && !(await card.count()); t++) {
    await page.waitForTimeout(attesa);
    await page.reload();
    await page.waitForLoadState("networkidle");
  }
  await card.waitFor({ timeout: 20000 });
  return card;
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
export async function spegniTour(
  page,
  // ⚠️ Questo elenco DEVE crescere insieme a `src/lib/tour/registry.ts`, e nulla lo
  // obbliga: aggiungendo il tour del Modello 231 il velo e' tornato a bloccare i clic,
  // e il collaudo del modulo e' morto al primo gesto. Da qui il ripiego qui sotto.
  chiavi = ["portfolio", "ghg", "bilancio", "energetico", "fornitore", "soa", "anticorruzione", "mog231", "segnalazioni"],
) {
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
}
