// SOLA LETTURA: chi si è iscritto alla PRODUZIONE negli ultimi N giorni (predefinito 7).
//
//   node scripts/iscrizioni-recenti.mjs          ultimi 7 giorni
//   node scripts/iscrizioni-recenti.mjs 30       ultimi 30
//
// ⚠️ NON SCRIVE NIENTE: gira in una transazione READ ONLY, quindi un errore nel testo di
// una query non può modificare il database che incassa. Legge DIRECT_URL da
// `.env.produzione` (fuori da git) senza stamparla.
//
// I conti di collaudo (`@example.com`) si contano a parte: in produzione non dovrebbero
// esserci, e se ci sono è un collaudo che ha scritto dove non doveva.

import { readFileSync } from "node:fs";
import postgres from "postgres";

const giorni = Number(process.argv[2] ?? 7);
if (!Number.isInteger(giorni) || giorni < 1 || giorni > 365) {
  console.error("Giorni: un intero fra 1 e 365.");
  process.exit(1);
}

const url = readFileSync(".env.produzione", "utf8").match(/^DIRECT_URL=(.*)$/m)?.[1]?.trim().replace(/^["']|["']$/g, "");
if (!url) {
  console.error("DIRECT_URL non trovata in .env.produzione");
  process.exit(1);
}

const sql = postgres(url, { prepare: false, max: 1, connect_timeout: 30 });
const giorno = (d) => (d ? new Date(d).toISOString().slice(0, 16).replace("T", " ") : "—");

try {
  await sql.begin("read only", async (tx) => {
    const utenti = await tx`
      select u.created_at, u.name, u.email, u.email_verified,
             o.name as studio, e.status, e.piano, e.activated_at
      from "user" u
      left join member m on m.user_id = u.id
      left join organization o on o.id = m.organization_id
      left join org_entitlement e on e.organization_id = o.id
      where u.created_at > now() - make_interval(days => ${giorni})
      order by u.created_at desc`;
    const veri = utenti.filter((u) => !u.email.endsWith("@example.com"));
    const collaudo = utenti.length - veri.length;

    console.log(`\nProduzione — iscrizioni degli ultimi ${giorni} giorni\n`);
    if (!veri.length) console.log("  Nessuna iscrizione vera.");
    for (const u of veri) {
      console.log(
        `  ${giorno(u.created_at)}  ${u.name} <${u.email}>  ${u.email_verified ? "verificato" : "NON verificato"}` +
          `  · studio: ${u.studio ?? "—"} · stato: ${u.status ?? "—"}${u.piano ? ` · piano ${u.piano}` : ""}`,
      );
    }
    if (collaudo) console.log(`\n  ⚠️ ${collaudo} conti di collaudo (@example.com) nel periodo.`);

    const [attivazioni] = await tx`
      select count(*)::int as n from org_entitlement
      where activated_at > now() - make_interval(days => ${giorni})`;
    const [totali] = await tx`
      select (select count(*)::int from "user" where email not like '%@example.com') as utenti,
             (select count(*)::int from org_entitlement where status = 'active') as attivi,
             (select count(*)::int from company where stato = 'active' and not is_demo) as aziende`;
    console.log(`\n  Attivazioni a pagamento nel periodo: ${attivazioni.n}`);
    console.log(`  Totali: ${totali.utenti} utenti veri, ${totali.attivi} studi attivi, ${totali.aziende} aziende attive non dimostrative\n`);
  });
} finally {
  await sql.end();
}
