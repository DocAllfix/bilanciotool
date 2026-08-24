// Assegna il codice di verifica ai documenti pubblicati PRIMA che il codice esistesse.
//
// ⚠️ È il motivo per cui il codice sta in una tabella a parte invece che nello snapshot:
// lo snapshot è immutabile per costruzione, e un documento già pubblicato non avrebbe mai
// potuto averne uno. Così invece si recupera, e la scadenza dura del piano — «prima della
// prima pubblicazione in produzione» — si scioglie.
//
// ⚠️ Il PDF già consegnato NON cambia: quello stampa il colophon di quando è stato
// generato. Il codice serve ai documenti che verranno riscaricati, e alla pagina di
// verifica per chi telefona con un documento in mano.
//
//   node scripts/backfill-codici.mjs          elenca cosa farebbe
//   node scripts/backfill-codici.mjs --scrivi lo fa

import postgres from "postgres";
import { randomInt } from "node:crypto";
import "dotenv/config";

const ALFABETO = "34679ACDEFGHJKMNPQRTUVWXY";
const scrivi = process.argv.includes("--scrivi");
const sql = postgres(process.env.DIRECT_URL ?? process.env.DATABASE_URL, { prepare: false, max: 2 });

const genera = () => {
  let g = "";
  for (let i = 0; i < 8; i++) g += ALFABETO[randomInt(ALFABETO.length)];
  return `EV-${g.slice(0, 4)}-${g.slice(4)}`;
};

const scoperti = await sql`
  select s.id, s.organization_id, s.tipo, s.anno, s.versione, s.published_at,
         coalesce(s.dati->'marchio'->>'nome', o.name, 'EvalisDeck') as emittente,
         coalesce(c.nome, '—') as azienda
  from document_snapshot s
  left join company c on c.id = s.company_id
  left join organization o on o.id = s.organization_id
  left join document_codice k on k.snapshot_id = s.id
  where k.codice is null
  order by s.published_at`;

console.log(`\nDocumenti senza codice: ${scoperti.length}`);
if (!scoperti.length) {
  await sql.end();
  process.exit(0);
}

for (const d of scoperti.slice(0, 10)) {
  console.log(`  ${d.tipo} v${d.versione} · ${d.azienda} · ${String(d.published_at).slice(0, 10)}`);
}
if (scoperti.length > 10) console.log(`  … e altri ${scoperti.length - 10}`);

if (!scrivi) {
  console.log("\nNiente scritto. Rilancia con --scrivi.");
  await sql.end();
  process.exit(0);
}

let fatti = 0;
for (const d of scoperti) {
  // La collisione si gestisce riprovando, come alla pubblicazione: remota non è impossibile.
  for (let t = 0; t < 5; t++) {
    const r = await sql`
      insert into document_codice
        (codice, snapshot_id, organization_id, emittente, azienda, tipo, anno, versione, pubblicato_il)
      values (${genera()}, ${d.id}, ${d.organization_id}, ${d.emittente}, ${d.azienda},
              ${d.tipo}, ${d.anno}, ${d.versione}, ${d.published_at})
      on conflict (codice) do nothing
      returning codice`;
    if (r.length) { fatti++; break; }
  }
}
console.log(`\nCodici assegnati: ${fatti} su ${scoperti.length}`);
await sql.end();
process.exit(fatti === scoperti.length ? 0 : 1);
