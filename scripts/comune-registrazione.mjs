
import { attraversaProtezione } from "./comune-collaudo.mjs";// Registrazione per i collaudi, dopo l'accensione della verifica dell'indirizzo.
//
// Da quando la conferma dell'email è obbligatoria, iscriversi NON crea più la sessione:
// la crea il clic sul collegamento che arriva per posta. Un collaudo non può aprire una
// casella, quindi fa la stessa cosa che farebbe quel clic — marca l'indirizzo come
// verificato — e poi accede.
//
// Sta in un file solo perché la sequenza è identica in una decina di collaudi: scritta a
// mano in ognuno, al prossimo cambiamento del flusso se ne aggiornerebbero otto su dieci.

/**
 * Registra uno studio nuovo e lo porta dentro.
 *
 * @param page   pagina Playwright
 * @param sql    connessione postgres del collaudo
 * @param opts   {base, nome, email, pwd}
 * @returns      {userId, orgId}
 *
 * ⚠️ IL VALORE DI RITORNO SERVE, e quasi nessuno lo usa: ventitre' script chiamano
 * `await registraEEntra(...)` scartandolo, e dodici di questi rifanno subito dopo la
 * stessa query — `select m.organization_id from member m join "user" u ...` — per
 * risalire a un dato che avevano gia' in mano.
 *
 * Non e' stato accorpato perche' la forma non e' uniforme (alcuni leggono anche
 * `user_id`, con nomi diversi, e lo usano piu' avanti): sarebbero dodici modifiche non
 * meccaniche da verificare una per una. Ma per uno script NUOVO la strada e' una sola:
 *
 *     const { userId, orgId } = await registraEEntra(page, sql, { ... });
 */
// Il progetto Supabase di PRODUZIONE. La stessa costante regge `guardia-database.mjs`:
// e' il riferimento noto, e serve a distinguere «un ambiente nostro» da «quello vero».
const RIFERIMENTO_PRODUZIONE = "hahtljrexrngtfsplbsz";

export async function registraEEntra(page, sql, { base, nome, email, pwd }) {
  // Le anteprime di Vercel sono protette: senza segreto la registrazione
  // atterrerebbe sulla pagina di accesso di Vercel invece che sul prodotto.
  await attraversaProtezione(page);
  // ⚠️ Il freno sulle iscrizioni si azzera PRIMA di ogni registrazione di collaudo, e
  // solo in locale.
  //
  // È tarato su dieci all'ora per indirizzo, che è giusto contro Internet e sbagliato
  // contro noi stessi: una batteria di undici collaudi di modulo registra undici utenti
  // dallo stesso indirizzo in mezz'ora, e dall'undicesimo in poi fallisce tutto — non
  // per un difetto del prodotto ma perché il freno funziona. Ci ho perso una tornata
  // intera prima di riconoscerlo, e il referto diceva «TimeoutError» su un elemento a
  // caso invece che «sei frenato».
  //
  // NON si azzera contro un ambiente vero: là il freno è la difesa, e un collaudo che la
  // spegne per comodità la sta collaudando spenta. E `verifica-limiti` fa la propria
  // pulizia per conto suo, quindi questa non gli toglie niente.
  //
  // ⚠️ «AMBIENTE VERO» NON SIGNIFICA «NON LOCALHOST». Un deploy di ANTEPRIMA è nostro
  // quanto localhost: gira sul database di sviluppo, e il freno lì frena noi. Legandolo
  // all'indirizzo, una batteria di collaudi contro un'anteprima si è fermata al decimo —
  // e i due referti dicevano «TimeoutError» aspettando «Controlla la tua posta», che è
  // l'elemento a caso previsto dal commento qui sopra.
  //
  // Il criterio giusto non è dove PUNTA il browser ma QUALE DATABASE si sta toccando: la
  // riga del freno vive lì. Se non è quello di produzione, azzerarla non tocca nessuna
  // difesa vera. È lo stesso riferimento su cui si regge `guardia-database.mjs`.
  const suProduzione = (process.env.DATABASE_URL ?? "").includes(RIFERIMENTO_PRODUZIONE);
  if (!suProduzione) {
    await sql`delete from rate_limit where key like '%/sign-up/email' or key like '%/sign-in/email'`;
  }

  await page.goto(`${base}/registrati`, { waitUntil: "networkidle" });
  await page.fill("#nome", nome);
  await page.fill("#email", email);
  await page.fill("#password", pwd);
  await page.click('button[type="submit"]');

  // La schermata «controlla la posta» conferma che la registrazione è riuscita: senza
  // questa attesa si correrebbe a marcare verificato un utente non ancora creato.
  // ⚠️ Se non arriva, si guarda il FRENO prima di riferire un guasto: un collaudo che
  // scade su «Controlla la tua posta» sembra accusare la registrazione, mentre il piu'
  // delle volte sta solo dicendo che siamo stati frenati. Il messaggio giusto fa
  // risparmiare la tornata che il commento qui sopra racconta di aver perso.
  // ⚠️ NOVANTA SECONDI, e il numero e' misurato, non scelto per far passare il collaudo.
  // Una registrazione crea l'utente, lo studio, l'azienda dimostrativa e i DODICI percorsi
  // che le stanno dentro: dalla macchina di sviluppo, dove un viaggio al database costa
  // 85-140 ms contro i ~7 ms della produzione, sono 27 secondi misurati con una POST
  // diretta a `/api/auth/sign-up/email`, e sotto carico di piu'. Con 40 secondi il
  // collaudo perdeva la scommessa a intermittenza e riferiva un guasto della
  // registrazione, che e' l'accusa sbagliata: il tempo se ne va nella LATENZA
  // dell'ambiente di sviluppo, non nel prodotto.
  await page.getByText(/Controlla la tua posta/i).waitFor({ timeout: 90_000 }).catch(async (e) => {
    const frenate = await sql`select key, count from rate_limit
      where key like '%/sign-up/email' order by last_request desc limit 1`.catch(() => []);
    if (frenate.length && Number(frenate[0].count) >= 10) {
      throw new Error(
        `SEI FRENATO, non e' un difetto del prodotto: ${frenate[0].count} iscrizioni ` +
          `dallo stesso indirizzo (${frenate[0].key}). Il freno e' dieci all'ora. ` +
          "Aspetta, oppure svuota `rate_limit` se il database non e' quello di produzione.",
      );
    }
    throw e;
  });

  const [u] = await sql`select id from "user" where email = ${email}`;
  if (!u) throw new Error("la registrazione non ha creato l'utente");
  await sql`update "user" set email_verified = true where id = ${u.id}`;

  await page.goto(`${base}/login`, { waitUntil: "networkidle" });
  await page.fill("#email", email);
  await page.fill("#password", pwd);
  await page.click('button[type="submit"]');
  await page.waitForURL("**/dashboard", { timeout: 90_000 });

  // Il banner del consenso sta in basso e in primo piano: finché c'è, intercetta i clic
  // sui comandi in fondo alla pagina. Una persona lo chiude, e così fa il collaudo.
  const rifiuta = page.getByRole("button", { name: "Rifiuta", exact: true });
  if (await rifiuta.count()) {
    await rifiuta.click();
    await page.waitForTimeout(400);
  }

  const [m] = await sql`select organization_id from member where user_id = ${u.id}`;
  return { userId: u.id, orgId: m?.organization_id ?? null };
}
