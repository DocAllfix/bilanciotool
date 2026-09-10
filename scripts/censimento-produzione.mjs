// CHI C'È DAVVERO NEL DATABASE DI PRODUZIONE — e che cosa toglierebbe una pulizia.
//
//   node scripts/censimento-produzione.mjs            elenca e classifica
//   node scripts/censimento-produzione.mjs --dettaglio mostra riga per riga
//
// ⚠️ NON SCRIVE NIENTE. Nessun DELETE, nessun UPDATE: solo SELECT. È il primo dei due
// passi di una pulizia — si guarda che cosa si toglierebbe, e solo dopo si decide.
//
// ⚠️ ESISTE PERCHÉ IL DATABASE CHE INCASSA È DIVENTATO ILLEGGIBILE. Misurato il 10
// settembre 2026: 305 utenti, di cui 296 `@example.com`; 298 organizzazioni; 8 abbonamenti
// Stripe **tutti riconducibili ai nostri collaudi**. Con 195 entitlement «attivi» senza un
// abbonamento che li paghi, nessuna domanda commerciale ha più una risposta leggibile:
// quanti clienti abbiamo, quanti documenti pubblicano, quante aziende seguono.
//
// Non è un problema di privacy — `example.com` è riservato dalla RFC 2606 e non può essere
// l'indirizzo di nessuno — è un problema di **leggibilità**: un numero che nessuno sa
// interpretare si smette di guardare, e il giorno in cui dice qualcosa di vero nessuno se
// ne accorge.

import { readFileSync } from "node:fs";
import postgres from "postgres";

const DETTAGLIO = process.argv.includes("--dettaglio");

function ambienteProduzione() {
  const testo = readFileSync(".env.produzione", "utf8");
  const url = testo.match(/^DIRECT_URL=(.*)$/m)?.[1]?.trim();
  if (!url) throw new Error("DIRECT_URL non trovata in .env.produzione");
  return url;
}

const sql = postgres(ambienteProduzione(), { prepare: false, max: 2, connect_timeout: 30 });

/**
 * I tre criteri, in ordine di forza.
 *
 * ⚠️ Il primo è strutturale e non si può falsificare: `example.com` è riservato dalla RFC
 * 2606 alla documentazione, quindi **nessuna persona reale può avere quell'indirizzo**. È
 * la sola classificazione che non richiede di conoscere il progetto.
 *
 * Il secondo — «ha un abbonamento Stripe» — sarebbe il segnale più forte per il verso
 * opposto, e oggi non lo è: tutti e otto gli abbonamenti appartengono a conti
 * `@example.com` creati dai nostri collaudi fra il 10 e il 13 agosto 2026, prima che la
 * guardia impedisse ai collaudi di comprare fuori da localhost. Per questo il censimento
 * li mostra ma NON li usa per dedurre che un conto sia vero.
 */
const DA_COLLAUDO = "%@example.com";

try {
  const [{ n: utenti }] = await sql`select count(*)::int n from "user"`;
  const [{ n: org }] = await sql`select count(*)::int n from organization`;
  const [{ n: sub }] = await sql`select count(*)::int n from stripe_subscription`;
  console.log(`\nProduzione: ${utenti} utenti · ${org} organizzazioni · ${sub} abbonamenti Stripe`);

  // ── 1. gli indirizzi riservati alla documentazione ──────────────────────────
  const [{ n: finti }] = await sql`select count(*)::int n from "user" where email like ${DA_COLLAUDO}`;
  const orgFinte = await sql`
    select distinct m.organization_id as id
    from member m join "user" u on u.id = m.user_id
    where u.email like ${DA_COLLAUDO}`;
  console.log(`\n── DI COLLAUDO (email @example.com, RFC 2606) ──`);
  console.log(`   utenti                          ${finti}`);
  console.log(`   organizzazioni che li ospitano   ${orgFinte.length}`);

  // ⚠️ Prima di proporre di cancellarle si chiede se PORTANO QUALCOSA: un'organizzazione
  // di collaudo che avesse documenti pubblicati o un abbonamento non è più solo un
  // residuo, e la pulizia dovrebbe saperlo prima e non a metà.
  const ids = orgFinte.map((o) => o.id).filter(Boolean);
  if (ids.length) {
    const [{ n: docFinti }] = await sql`
      select count(*)::int n from document_snapshot where organization_id = any(${ids})`;
    const [{ n: azFinte }] = await sql`
      select count(*)::int n from company where organization_id = any(${ids}) and not is_demo`;
    const [{ n: subFinti }] = await sql`
      select count(*)::int n from stripe_subscription where organization_id = any(${ids})`;
    console.log(`   documenti pubblicati             ${docFinti}`);
    console.log(`   aziende non dimostrative         ${azFinte}`);
    console.log(`   abbonamenti Stripe               ${subFinti}   ${subFinti ? "⚠️  da chiudere sul cruscotto Stripe, non da qui" : ""}`);
  }

  // ── 2. tutti gli altri, uno per uno ─────────────────────────────────────────
  const veri = await sql`
    select u.email, u.created_at, o.id as org_id, o.name,
           coalesce(e.status, '—') as stato,
           (select count(*)::int from company c where c.organization_id = o.id and not c.is_demo) as aziende,
           (select count(*)::int from document_snapshot d where d.organization_id = o.id) as documenti,
           (select count(*)::int from stripe_subscription s where s.organization_id = o.id) as abbonamenti
    from "user" u
    left join member m on m.user_id = u.id
    left join organization o on o.id = m.organization_id
    left join org_entitlement e on e.organization_id = o.id
    where u.email not like ${DA_COLLAUDO}
    order by u.created_at`;
  console.log(`\n── INDIRIZZI VERI (${veri.length}) — NESSUNO DI QUESTI VA TOCCATO ──`);
  for (const v of veri) {
    console.log(
      `   ${String(v.email).slice(0, 36).padEnd(38)} ${String(v.stato).padEnd(9)}` +
        ` aziende:${v.aziende} doc:${v.documenti} abb:${v.abbonamenti}  ${new Date(v.created_at).toISOString().slice(0, 10)}`,
    );
  }

  // ── 3. che cosa toglierebbe la pulizia ──────────────────────────────────────
  console.log(`\n── COSA TOGLIEREBBE UNA PULIZIA ──`);
  console.log(`   ${finti} utenti e ${orgFinte.length} organizzazioni di collaudo, con tutte le loro righe.`);
  console.log(`   Resterebbero ${veri.length} utenti veri e le loro organizzazioni.`);
  console.log(`\n   ⚠️ Gli abbonamenti Stripe NON si cancellano da qui: vivono su Stripe, e`);
  console.log(`      togliere la riga locale lascerebbe l'abbonamento vivo di là — cioè il`);
  console.log(`      contrario di una pulizia. Si chiudono dal cruscotto, e poi si rilancia questo.`);

  if (DETTAGLIO) {
    const righe = await sql`
      select u.email, o.name, o.created_at
      from "user" u
      left join member m on m.user_id = u.id
      left join organization o on o.id = m.organization_id
      where u.email like ${DA_COLLAUDO}
      order by o.created_at`;
    console.log(`\n── DETTAGLIO DEI ${righe.length} DI COLLAUDO ──`);
    for (const r of righe) {
      console.log(`   ${String(r.email).slice(0, 40).padEnd(42)} ${String(r.name ?? "—").slice(0, 30)}`);
    }
  } else {
    console.log(`\n   (--dettaglio per vederli uno per uno)`);
  }
  console.log("");
} finally {
  // ⚠️ Si chiude, sempre: un pool aperto tiene vivo il giro degli eventi e il processo non
  // esce più. Costato quarantadue minuti su `visual-check-shell` l'8 settembre 2026.
  await sql.end();
}
