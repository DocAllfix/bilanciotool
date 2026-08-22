// Guardia sui comandi che SCRIVONO nel database.
//
// Il 22 agosto 2026 si e' scoperto che il `.env` locale puntava alla PRODUZIONE: 294
// organizzazioni, 402 aziende, 8 abbonamenti Stripe reali. Non esisteva alcun database di
// sviluppo, e `CLAUDE.md` diceva il contrario. Con quella configurazione `db:seed` e
// `db:migrate` lanciati per abitudine scrivevano sui dati veri.
//
// La forma e' quella gia' in uso per i collaudi che comprano su Stripe, e la ragione scritta
// allora vale identica: la guardia costa tre righe, scoprirlo a meta' costa la fiducia in
// tutto il resto.
//
// DUE segnali, perche' uno solo non basta:
//   1. il riferimento del progetto di produzione, esplicito: e' il caso noto;
//   2. la presenza di ABBONAMENTI STRIPE, che e' il segnale che si mantiene da solo. I test
//      ripuliscono quello che creano (verificato: dopo due passate complete il dev e' a zero
//      su tutto), e nessun pagamento vero puntera' mai a un database di prova. Un database
//      con abbonamenti attivi non e' un ambiente di prova, comunque si chiami.

import "dotenv/config";
import postgres from "postgres";

const PROD_REF = "hahtljrexrngtfsplbsz";

function ferma(motivo) {
  console.error("\n  FERMO: " + motivo);
  console.error("  Questo comando SCRIVE nel database.");
  console.error("  Se e' davvero quello che vuoi: SO_CHE_E_PRODUZIONE=1 <comando>\n");
  process.exit(1);
}

const url = process.env.DIRECT_URL;
if (!url) {
  console.error("DIRECT_URL mancante: configura .env");
  process.exit(1);
}

// L'override si dichiara, non si deduce: chi lo passa sta dicendo di sapere dove sta scrivendo.
if (process.env.SO_CHE_E_PRODUZIONE === "1") {
  console.log("  (SO_CHE_E_PRODUZIONE=1: guardia disattivata di proposito)");
  process.exit(0);
}

if (url.includes(PROD_REF)) ferma(`la stringa punta al progetto di PRODUZIONE (${PROD_REF}).`);

const sql = postgres(url, { prepare: false, max: 1, connect_timeout: 20 });
try {
  const [{ n }] = await sql`select count(*)::int n from stripe_subscription`;
  if (n > 0) ferma(`il database ha ${n} abbonamenti Stripe: non e' un ambiente di prova.`);
  const [{ ref }] = await sql`select current_database() ref`;
  console.log(`  bersaglio: ${url.replace(/:[^:@]*@/, ":***@").split("@")[1]} (${ref}) — nessun abbonamento, si puo' scrivere`);
} catch (e) {
  // Tabella assente = progetto vergine: e' esattamente il caso in cui si vuole poter migrare.
  if (!/relation .* does not exist/.test(String(e.message))) {
    console.error("  guardia: impossibile interrogare il database — " + String(e.message).split("\n")[0]);
    process.exit(1);
  }
  console.log("  bersaglio: progetto vergine (nessuna tabella) — si puo' migrare");
} finally {
  await sql.end();
}
