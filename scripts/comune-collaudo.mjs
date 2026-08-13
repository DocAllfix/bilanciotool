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
    .locator('[data-sonner-toast][data-type="error"]')
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
    [...document.querySelectorAll('[data-sonner-toast], [role="alert"], .text-destructive')]
      .map((e) => (e.innerText || "").trim().replace(/\s+/g, " "))
      .filter(Boolean),
  ).catch(() => []);
}

/** Chiude gli avvisi rimasti, per non attribuirli al gesto successivo. */
export async function pulisciAvvisi(page) {
  await page.evaluate(() => {
    document.querySelectorAll("[data-sonner-toast]").forEach((t) => t.remove());
  }).catch(() => {});
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
