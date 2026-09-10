// TOGLIE DALLA PRODUZIONE I CONTI DI COLLAUDO.
//
//   node scripts/pulisci-produzione.mjs                              elenca (non tocca niente)
//   SO_CHE_E_PRODUZIONE=1 node scripts/pulisci-produzione.mjs --applica
//
// ⚠️ È IL SECONDO DEI DUE PASSI. Il primo è `censimento-produzione.mjs`, in sola lettura:
// si guarda che cosa si toglierebbe, e solo dopo si decide. Questo script rifiuta di
// partire senza `SO_CHE_E_PRODUZIONE=1`, che è la stessa dichiarazione che pretende
// `guardia-database.mjs` — e vale la stessa ragione: chi la passa sta dicendo di sapere
// dove sta scrivendo.
//
// ── CHE COSA CONSIDERA «DI COLLAUDO», E PERCHÉ SI PUÒ FIDARE ─────────────────
//
// Un'organizzazione è di collaudo quando **tutti** i suoi membri hanno un indirizzo
// `@example.com`. Non «almeno uno»: TUTTI. `example.com` è riservato dalla RFC 2606 alla
// documentazione, quindi nessuna persona reale può averlo — è l'unico criterio che non
// richiede di conoscere il progetto e che nessuno può falsificare per sbaglio.
//
// ⚠️ Un'organizzazione con anche UN SOLO membro vero non si tocca, nemmeno se gli altri
// nove sono di collaudo. Il rischio non è simmetrico: lasciare un residuo costa disordine,
// cancellare il lavoro di un cliente costa il cliente.
//
// ⚠️ E si saltano le organizzazioni con un ABBONAMENTO STRIPE, anche se di collaudo. Due
// ragioni, e la prima basta: l'abbonamento vive **su Stripe**, e togliere la riga locale lo
// lascerebbe attivo di là — cioè il contrario di una pulizia, con il nostro database che
// smette di sapere di un abbonamento che continua a esistere. La seconda: la presenza di
// abbonamenti è uno dei due segnali con cui `guardia-database.mjs` riconosce la produzione,
// e toglierli indebolirebbe una difesa mentre se ne fa manutenzione.
// Quelli si chiudono dal cruscotto Stripe, e poi si rilancia questo.
//
// ── COME CANCELLA ────────────────────────────────────────────────────────────
//
// ⚠️ NON elenca le tabelle. Cinquantasette portano una chiave esterna verso
// `organization` con `ON DELETE CASCADE` e sette verso `user`: **è il database a cancellare
// nell'ordine giusto**, e un elenco scritto a mano qui sarebbe sbagliato al primo modulo
// nuovo — cioè al prossimo. Si cancella la radice e si lascia fare alle chiavi.
//
// ⚠️ `entitlement_event` NON si tocca: un trigger le impedisce di essere cancellata, e non
// è un ostacolo da aggirare — è il registro append-only delle capacità, protetto apposta
// anche dalla connessione privilegiata. Le sue righe restano, e questo script lo dichiara
// invece di fingere di aver pulito tutto.

import { readFileSync } from "node:fs";
import postgres from "postgres";
import Stripe from "stripe";

const APPLICA = process.argv.includes("--applica");
/**
 * Include anche le organizzazioni con un abbonamento, DOPO aver chiesto a Stripe che
 * nessuno dei loro abbonamenti sia vivo.
 *
 * ⚠️ La verifica NON si fa sulla colonna `status` del nostro database: quella la aggiorna
 * il webhook, e un abbonamento annullato dal cruscotto o via API la lascia a `active`
 * finché l'evento non arriva. Fidarsene qui significherebbe cancellare l'organizzazione di
 * un abbonamento ancora vivo, che è precisamente il caso che il salto esiste per evitare.
 *
 * Si chiede a Stripe con la chiave VIVA: un abbonamento che in modalità viva non esiste
 * («No such subscription») è un artefatto di prova, e la ragione per saltarlo cade.
 * La chiave si legge da `.env.stripe-vivo`, che `.gitignore` copre.
 */
const ANCHE_ABBONAMENTI = process.argv.includes("--abbonamenti-verificati-non-vivi");

if (APPLICA && process.env.SO_CHE_E_PRODUZIONE !== "1") {
  console.error("\n  FERMO: questo comando CANCELLA nel database che incassa.");
  console.error("  Guarda prima `node scripts/censimento-produzione.mjs`.");
  console.error("  Se è davvero quello che vuoi: SO_CHE_E_PRODUZIONE=1 <comando>\n");
  process.exit(1);
}

const testo = readFileSync(".env.produzione", "utf8");
const url = testo.match(/^DIRECT_URL=(.*)$/m)?.[1]?.trim();
if (!url) {
  console.error("DIRECT_URL non trovata in .env.produzione");
  process.exit(1);
}
const sql = postgres(url, { prepare: false, max: 2, connect_timeout: 30 });

try {
  const [{ n: primaUtenti }] = await sql`select count(*)::int n from "user"`;
  const [{ n: primaOrg }] = await sql`select count(*)::int n from organization`;
  console.log(`\nPrima: ${primaUtenti} utenti · ${primaOrg} organizzazioni`);

  // ── chi se ne va ────────────────────────────────────────────────────────────
  //
  // `bool_and` è il cuore del criterio: vero solo se OGNI membro è di collaudo. Con
  // `bool_or` — «almeno uno» — basterebbe un collaudo entrato per sbaglio in uno studio
  // vero per cancellarlo.
  // ── quali organizzazioni con abbonamento si possono includere ───────────────
  //
  // Nessuna, a meno che Stripe non confermi che i loro abbonamenti non sono vivi.
  const conAbbonamento = new Set(
    (await sql`select distinct organization_id as id from stripe_subscription`).map((r) => r.id),
  );
  const assolte = new Set();
  if (ANCHE_ABBONAMENTI) {
    let chiave = null;
    try {
      chiave = readFileSync(".env.stripe-vivo", "utf8").match(/^STRIPE_SECRET_KEY=(.*)$/m)?.[1]?.trim();
    } catch {
      /* nessun file: si resta prudenti */
    }
    if (!chiave || !/_live_/.test(chiave)) {
      console.error("\n  --abbonamenti-verificati-non-vivi pretende una chiave VIVA in `.env.stripe-vivo`.");
      console.error("  Senza, «non è vivo» sarebbe una supposizione, non una misura.\n");
      process.exit(1);
    }
    const stripe = new Stripe(chiave);
    const righe = await sql`select organization_id as org, stripe_subscription_id as sid from stripe_subscription`;
    const vivi = new Set();
    for (const r of righe) {
      try {
        const x = await stripe.subscriptions.retrieve(r.sid);
        // Presente in modalità viva: si salta comunque, a meno che non sia già annullato.
        if (x.status !== "canceled") vivi.add(r.org);
        console.log(`   Stripe · ${r.sid}  ${x.status}  livemode=${x.livemode}`);
      } catch {
        // «No such subscription» con la chiave viva = non esiste in modalità viva.
        console.log(`   Stripe · ${r.sid}  non esiste in modalità viva`);
      }
    }
    for (const id of conAbbonamento) if (!vivi.has(id)) assolte.add(id);
    console.log(`\n   assolte dalla verifica su Stripe: ${assolte.size} su ${conAbbonamento.size}`);
  }

  const escluse = [...conAbbonamento].filter((id) => !assolte.has(id));

  const daTogliere = await sql`
    select o.id, o.name, count(m.id)::int as membri
    from organization o
    join member m on m.organization_id = o.id
    join "user" u on u.id = m.user_id
    where ${escluse.length ? sql`o.id <> all(${escluse})` : sql`true`}
    group by o.id, o.name
    having bool_and(u.email like '%@example.com')`;


  console.log(`\nOrganizzazioni di collaudo da togliere : ${daTogliere.length}`);
  // ⚠️ La riga dice il numero VERO delle saltate, che con la verifica su Stripe può essere
  // zero. Prima stampava «hanno un abbonamento: 8» mentre stava per toglierne otto: la
  // stessa etichetta che dice il falso contro cui è costruito metà di questo repository.
  console.log(
    `Saltate perché l'abbonamento è VIVO     : ${escluse.length}` +
      (escluse.length ? "   (si chiudono su Stripe)" : ANCHE_ABBONAMENTI ? "   (nessuno è vivo)" : ""),
  );

  if (!APPLICA) {
    console.log(`\n(nessuna modifica: aggiungi --applica)\n`);
    process.exit(0);
  }

  // ── si cancella ─────────────────────────────────────────────────────────────
  const ids = daTogliere.map((o) => o.id);
  let audit = 0;
  if (ids.length) {
    // `audit_log` porta `organization_id` ma NON una chiave esterna, quindi la cascata non
    // la raggiunge: resterebbe orfana. Si toglie a parte, prima della radice.
    const r = await sql`delete from audit_log where organization_id = any(${ids})`;
    audit = r.count;
    await sql`delete from organization where id = any(${ids})`;
  }

  // Gli utenti di collaudo rimasti senza organizzazione. Sette tabelle vanno in cascata:
  // account, session, user_onboarding, formazione_verifica, company_referent, member,
  // invitation.
  const via = await sql`
    delete from "user"
    where email like '%@example.com'
      and id not in (select user_id from member)`;

  // ── e si VERIFICA, invece di sperarlo ───────────────────────────────────────
  const [{ n: dopoUtenti }] = await sql`select count(*)::int n from "user"`;
  const [{ n: dopoOrg }] = await sql`select count(*)::int n from organization`;
  const [{ n: restaFinti }] = await sql`select count(*)::int n from "user" where email like '%@example.com'`;
  const [{ n: veri }] = await sql`select count(*)::int n from "user" where email not like '%@example.com'`;
  const [{ n: orfane }] = await sql`
    select count(*)::int n from entitlement_event
    where organization_id not in (select id from organization)`;

  console.log(`\nDopo:  ${dopoUtenti} utenti · ${dopoOrg} organizzazioni`);
  console.log(`   organizzazioni tolte        ${primaOrg - dopoOrg}`);
  console.log(`   utenti tolti                ${primaUtenti - dopoUtenti}   (${via.count} senza organizzazione)`);
  console.log(`   righe di audit tolte        ${audit}`);
  console.log(`   utenti VERI rimasti         ${veri}`);
  console.log(`   @example.com rimasti        ${restaFinti}   ${restaFinti ? "(sono quelli con un abbonamento)" : ""}`);
  console.log(`\n   ⚠️ ${orfane} righe di entitlement_event restano senza organizzazione:`);
  console.log(`      quella tabella è append-only per progetto, e un trigger ne impedisce la`);
  console.log(`      cancellazione anche alla connessione privilegiata. Non è un residuo`);
  console.log(`      dimenticato: è una difesa che non si aggira per fare le pulizie.\n`);

  if (veri < 9) {
    console.error(`   🛑 GLI UTENTI VERI SONO SCESI A ${veri}. Qualcosa ha cancellato più del dovuto.\n`);
    process.exitCode = 1;
  }
} finally {
  // Si chiude, sempre: un pool aperto tiene vivo il giro degli eventi.
  await sql.end();
}
