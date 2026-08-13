// Crea (o riusa) il buono sconto per il collaudo dell'incasso vero.
//
//   node scripts/crea-buono-collaudo.mjs            → sull'ambiente della chiave in .env
//   STRIPE_SECRET_KEY=rk_live_... node scripts/crea-buono-collaudo.mjs --applica
//
// Serve a comprare DAVVERO spendendo poco: un codice al 99% fa pagare quindici euro
// invece di millecinquecento, passando dagli stessi prezzi, dallo stesso webhook e
// dallo stesso Schedule a due fasi. È il modo di provare la catena viva senza inventare
// un prodotto finto — che proverebbe un prezzo che non vendiamo.
//
// Il buono vale UNA volta sola e scade fra sette giorni: un codice al 99% dimenticato
// vivo è uno sconto che prima o poi qualcuno trova.

import Stripe from "stripe";
import "dotenv/config";

const CHIAVE = "evalisdeck-collaudo-99";
const CODICE = process.env.CODICE ?? "COLLAUDO99";
const SCONTO = 99;
const GIORNI = 7;

const chiave = process.env.STRIPE_SECRET_KEY;
if (!chiave) { console.error("STRIPE_SECRET_KEY assente"); process.exit(1); }
const vivo = /_live_/.test(chiave);
const applica = process.argv.includes("--applica");

console.log(`Ambiente: ${vivo ? "VIVO (denaro vero)" : "prova"}`);
if (vivo && !applica) {
  console.error("Chiave viva: aggiungi --applica per creare davvero il buono.");
  process.exit(1);
}

const stripe = new Stripe(chiave);

// Si riconosce dai metadata e non dal nome: il nome è testo modificabile dal cruscotto.
const esistenti = await stripe.coupons.list({ limit: 100 });
let coupon = esistenti.data.find((c) => c.metadata?.chiave === CHIAVE && c.valid);
if (coupon) {
  console.log(`Buono già presente: ${coupon.id} (−${coupon.percent_off}%)`);
} else {
  coupon = await stripe.coupons.create({
    name: "Collaudo incasso EvalisDeck",
    percent_off: SCONTO,
    // `once`: sconta solo la prima fattura. Il RINNOVO resta a prezzo pieno, che è
    // proprio quello che si vuole verificare — altrimenti si collauderebbe uno sconto
    // perpetuo che non esiste nel listino.
    duration: "once",
    max_redemptions: 1,
    redeem_by: Math.floor(Date.now() / 1000) + GIORNI * 86_400,
    metadata: { chiave: CHIAVE },
  });
  console.log(`Buono creato: ${coupon.id} (−${SCONTO}%, una volta sola, scade fra ${GIORNI} giorni)`);
}

const codici = await stripe.promotionCodes.list({ code: CODICE, limit: 1 });
let promo = codici.data[0];
if (promo) {
  console.log(`Codice già presente: ${promo.code} (attivo: ${promo.active})`);
} else {
  // Nelle versioni recenti dell'API il buono si passa dentro `promotion`, non come
  // `coupon` a livello alto: la forma vecchia risponde «unknown parameter» e basta.
  promo = await stripe.promotionCodes.create({
    promotion: { type: "coupon", coupon: coupon.id },
    code: CODICE,
    max_redemptions: 1,
    // Non oltre la scadenza del buono: se il buono esisteva già, la sua scadenza è
    // di qualche minuto fa rispetto a quella che calcoleremmo adesso, e Stripe rifiuta.
    expires_at: coupon.redeem_by ?? Math.floor(Date.now() / 1000) + GIORNI * 86_400,
  });
  console.log(`Codice creato: ${promo.code}`);
}

console.log(`\nAlla cassa, premi «Aggiungi codice promozionale» e scrivi:  ${promo.code}`);
console.log("Il totale scontato si vede PRIMA di pagare: se resta pieno, non andare avanti.");
console.log(`\nA collaudo finito: disattiva il codice e il buono (o lascia che scadano fra ${GIORNI} giorni).`);
