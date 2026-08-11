// Registrazione per i collaudi, dopo l'accensione della verifica dell'indirizzo.
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
 */
export async function registraEEntra(page, sql, { base, nome, email, pwd }) {
  await page.goto(`${base}/registrati`, { waitUntil: "networkidle" });
  await page.fill("#nome", nome);
  await page.fill("#email", email);
  await page.fill("#password", pwd);
  await page.click('button[type="submit"]');

  // La schermata «controlla la posta» conferma che la registrazione è riuscita: senza
  // questa attesa si correrebbe a marcare verificato un utente non ancora creato.
  await page.getByText(/Controlla la tua posta/i).waitFor({ timeout: 40_000 });

  const [u] = await sql`select id from "user" where email = ${email}`;
  if (!u) throw new Error("la registrazione non ha creato l'utente");
  await sql`update "user" set email_verified = true where id = ${u.id}`;

  await page.goto(`${base}/login`, { waitUntil: "networkidle" });
  await page.fill("#email", email);
  await page.fill("#password", pwd);
  await page.click('button[type="submit"]');
  await page.waitForURL("**/dashboard", { timeout: 40_000 });

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
