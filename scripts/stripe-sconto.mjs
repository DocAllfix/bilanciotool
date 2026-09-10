// I CODICI SCONTO, creati su Stripe in modo ripetibile.
//
//   node scripts/stripe-sconto.mjs                 elenca cosa farebbe (non tocca niente)
//   node scripts/stripe-sconto.mjs --applica       crea quello che manca
//   node scripts/stripe-sconto.mjs --applica --sono-sicuro-che-e-produzione
//
// ⚠️ IL PRODOTTO NON HA BISOGNO DI UNA RIGA DI CODICE PER GLI SCONTI. Il checkout porta
// già `allow_promotion_codes: true`: un codice creato qui compare nel campo «Codice
// promozionale» sulla pagina di pagamento e si applica da solo. Questo script esiste per
// due ragioni che con il prodotto non c'entrano:
//   · perché il codice sia RIPETIBILE — riconosciuto per metadata e non per nome, come i
//     prezzi, così rilanciarlo non ne crea un secondo;
//   · perché la DURATA sia una decisione scritta, non un menù a tendina premuto in fretta.
//
// ⚠️ LA DURATA È LA COSA CHE CONTA, ED È QUI CHE SI SBAGLIA.
//
// `once`   → sconta la PRIMA fattura. Per noi: la prima annualità.
// `forever`→ sconta anche tutti i rinnovi, per sempre.
//
// Su questo prodotto la differenza non è solo commerciale: ogni abbonamento porta uno
// **Schedule a due fasi** (anno 1 a prezzo pieno, anni successivi a prezzo ridotto), e il
// webhook lo RICOSTRUISCE subito dopo il checkout dichiarando `items`, `start_date`,
// `end_date` e `duration` — e nessuno sconto. Riscrivere le fasi senza dichiarare gli
// sconti è la stessa forma del difetto che fece sparire le estensioni al primo rinnovo,
// con un'aggravante: quello scattava fra dodici mesi, questo scatterebbe **subito**.
//
// Con `once` la cosa non morde, e la ragione è precisa: **il pagamento avviene al
// checkout, PRIMA che il webhook tocchi lo Schedule**. La prima fattura è già stata
// emessa e scontata quando la ricostruzione avviene.
//
// Con `forever` o `repeating` NON si può usare questo script così com'è: prima va corretta
// la ricostruzione dello Schedule in `src/features/billing/webhook.ts`, e va provata
// rileggendo le fasi da Stripe — come fa già `verifica-estensioni` per le estensioni.
// Il codice qui sotto si RIFIUTA di creare una durata diversa da `once` finché quella
// correzione non c'è, invece di lasciar creare un codice che sparirebbe al primo rinnovo.

import "dotenv/config";
import Stripe from "stripe";

const APPLICA = process.argv.includes("--applica");

const chiave = process.env.STRIPE_SECRET_KEY;
if (!chiave) {
  console.error("STRIPE_SECRET_KEY assente in .env");
  process.exit(1);
}
// ⚠️ QUALSIASI chiave di produzione, non solo `sk_live`: quelle con restrizioni cominciano
// con `rk_`, e un controllo scritto sul solo prefisso `sk_` le lascerebbe passare in
// silenzio — proprio nel caso in cui una conferma serve di più.
if (/_live_/.test(chiave) && !process.argv.includes("--sono-sicuro-che-e-produzione")) {
  console.error("Chiave di PRODUZIONE. Se è voluto, aggiungi --sono-sicuro-che-e-produzione.");
  process.exit(1);
}
const viva = /_live_/.test(chiave);
const stripe = new Stripe(chiave);

/**
 * I codici, dichiarati.
 *
 * ⚠️ `codice` è quello che il cliente DIGITA, e Stripe lo tratta senza distinguere
 * maiuscole e minuscole. Si scrive in maiuscolo perché è così che finirà su una lettera
 * commerciale, e senza spazi né trattini: un codice che si può sbagliare a trascrivere
 * genera assistenza, non vendite.
 */
const SCONTI = [
  {
    chiaveInterna: "pmi-international-25",
    codice: "PMIINTERNATIONAL25",
    nome: "PMI International — 25%",
    percentuale: 25,
    // ⚠️ Decisione del committente, 10 settembre 2026: vale sulla PRIMA ANNUALITÀ.
    // Cambiarla in `forever` senza prima correggere la ricostruzione dello Schedule
    // produrrebbe uno sconto che sparisce da solo: vedi la nota in testa a questo file.
    durata: "once",
  },
];

let creati = 0, gia = 0, problemi = 0;

for (const s of SCONTI) {
  if (s.durata !== "once") {
    console.error(
      `\n  ✗ ${s.chiaveInterna}: durata «${s.durata}».\n` +
        "    Oggi il webhook ricostruisce lo Schedule senza dichiarare gli sconti, quindi\n" +
        "    uno sconto ricorrente sparirebbe subito dopo il checkout. Va corretto prima\n" +
        "    `src/features/billing/webhook.ts`, e provato rileggendo le fasi da Stripe.\n",
    );
    problemi++;
    continue;
  }

  // Il coupon si riconosce dai METADATA e non dal nome: il nome è testo che qualcuno
  // cambierà, i metadata no. Stesso criterio dei prodotti in `stripe-bootstrap.mjs`.
  const esistenti = await stripe.coupons.list({ limit: 100 });
  let coupon = esistenti.data.find((c) => c.metadata?.chiave === s.chiaveInterna);

  if (coupon) {
    // ⚠️ Un coupon di Stripe è IMMUTABILE nella percentuale e nella durata, come i prezzi.
    // Se diverge da ciò che è dichiarato qui ci si FERMA invece di tentare una modifica
    // che Stripe rifiuterebbe: il rimedio è un coupon nuovo con una chiave nuova, e
    // sostituire quello vecchio è una decisione, non un effetto collaterale.
    const divergePerc = coupon.percent_off !== s.percentuale;
    const divergeDur = coupon.duration !== s.durata;
    if (divergePerc || divergeDur) {
      console.error(
        `  ✗ ${s.chiaveInterna}: su Stripe è ${coupon.percent_off}% ${coupon.duration}, ` +
          `qui è dichiarato ${s.percentuale}% ${s.durata}. Un coupon non si modifica.`,
      );
      problemi++;
      continue;
    }
    console.log(`  =  coupon ${s.chiaveInterna} già presente (${coupon.percent_off}% ${coupon.duration})`);
    gia++;
  } else if (APPLICA) {
    coupon = await stripe.coupons.create({
      name: s.nome,
      percent_off: s.percentuale,
      duration: s.durata,
      metadata: { chiave: s.chiaveInterna },
    });
    console.log(`  +  coupon ${s.chiaveInterna} creato (${s.percentuale}% ${s.durata})`);
    creati++;
  } else {
    console.log(`  →  creerei il coupon ${s.chiaveInterna} (${s.percentuale}% ${s.durata})`);
    continue;
  }

  // Il codice leggibile che il cliente digita. È un oggetto distinto dal coupon: lo stesso
  // sconto può avere più codici, ed è così che si distingue un canale dall'altro.
  const codici = await stripe.promotionCodes.list({ code: s.codice, limit: 1 });
  if (codici.data[0]) {
    const p = codici.data[0];
    // ⚠️ `p.promotion.coupon`, non `p.coupon`: con l'API `2026-07-29.dahlia` lo sconto di un
    // codice sta dentro `promotion`. Scritto alla vecchia maniera questo ramo esplodeva con
    // «Cannot read properties of undefined» al SECONDO lancio — cioè lo script funzionava
    // una volta e non era ripetibile, che è esattamente ciò per cui esiste.
    // E il campo può essere l'identificativo o l'oggetto espanso: si accettano entrambi.
    const rif = p.promotion?.coupon;
    const stessoCoupon = (typeof rif === "string" ? rif : rif?.id) === coupon.id;
    console.log(
      `  =  codice ${s.codice} già presente${stessoCoupon ? "" : "  ⚠️ punta a un ALTRO coupon"}` +
        `${p.active ? "" : "  ⚠️ è DISATTIVATO"}`,
    );
    if (!stessoCoupon) problemi++;
  } else if (APPLICA) {
    // ⚠️ NON `{ coupon: id }`. Con l'API `2026-07-29.dahlia` (SDK 22) lo sconto si passa
    // dentro un oggetto `promotion` con il proprio `type`: la forma vecchia risponde
    // «Received unknown parameter: coupon» e il coupon resta creato senza il suo codice —
    // cioè uno sconto che esiste e che nessuno può digitare. Letta dai tipi del pacchetto
    // installato, non dalla memoria.
    await stripe.promotionCodes.create({
      promotion: { type: "coupon", coupon: coupon.id },
      code: s.codice,
    });
    console.log(`  +  codice ${s.codice} creato`);
    creati++;
  } else {
    console.log(`  →  creerei il codice ${s.codice}`);
  }
}

console.log(
  `\n${viva ? "PRODUZIONE" : "prova"} · creati ${creati} · già presenti ${gia} · problemi ${problemi}` +
    (APPLICA ? "" : "\n(nessuna modifica: aggiungi --applica)"),
);
process.exit(problemi ? 1 : 0);
