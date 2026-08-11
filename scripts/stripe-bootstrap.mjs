// Crea su Stripe i prodotti e i prezzi del listino. Ripetibile senza danni.
//
//   node scripts/stripe-bootstrap.mjs            elenca cosa farebbe
//   node scripts/stripe-bootstrap.mjs --applica  lo fa
//
// DUE REGOLE, ed è per rispettarle che questo script esiste invece di una mezz'ora di
// clic nel cruscotto:
//
// 1. Il listino si legge da `src/lib/prezzi.ts`, la stessa fonte che usano l'entitlement,
//    il checkout e la pagina Abbonamento. Ricopiare gli importi qui significherebbe
//    scoprire la divergenza dall'estratto conto di un cliente.
//
// 2. I prezzi di Stripe sono IMMUTABILI. Un prezzo già creato non si modifica: se
//    l'importo del listino non coincide, lo script si ferma e lo dice, invece di
//    inventarsi un aggiornamento che Stripe rifiuterebbe a metà. Un cambio di listino si
//    fa creando `..._v2` — così i clienti che hanno comprato al prezzo vecchio ci
//    restano, che è esattamente quello che gli abbiamo promesso.

import Stripe from "stripe";
import "dotenv/config";
import { PIANI, ESTENSIONI, euro, FINE_LANCIO } from "../src/lib/prezzi.ts";

const APPLICA = process.argv.includes("--applica");
const chiave = process.env.STRIPE_SECRET_KEY;
if (!chiave) {
  console.error("STRIPE_SECRET_KEY assente in .env");
  process.exit(1);
}
// QUALSIASI chiave di produzione, non solo `sk_live`: le chiavi con restrizioni
// cominciano con `rk_`, e il controllo scritto sul solo prefisso `sk_` le avrebbe
// lasciate passare in silenzio — proprio nel caso in cui una conferma serve di piu'.
if (/_live_/.test(chiave) && !process.argv.includes("--sono-sicuro-che-e-produzione")) {
  console.error("Chiave di PRODUZIONE. Se è voluto, aggiungi --sono-sicuro-che-e-produzione.");
  process.exit(1);
}

const stripe = new Stripe(chiave);
let creati = 0, gia = 0, problemi = 0;

/** Il prodotto, riconosciuto per metadata invece che per nome: il nome è testo che
 *  qualcuno cambierà dal cruscotto, la chiave no. */
async function prodotto(chiaveInterna, nome, descrizione) {
  const trovati = await stripe.products.search({ query: `metadata['chiave']:'${chiaveInterna}'`, limit: 1 });
  if (trovati.data[0]) return trovati.data[0];
  if (!APPLICA) return { id: `(da creare: ${chiaveInterna})` };
  return stripe.products.create({ name: nome, description: descrizione, metadata: { chiave: chiaveInterna } });
}

async function prezzo(productId, lookupKey, importo, ricorrente) {
  const trovati = await stripe.prices.list({ lookup_keys: [lookupKey], limit: 1 });
  const esistente = trovati.data[0];

  if (esistente) {
    if (esistente.unit_amount !== importo) {
      // Il caso che questo script esiste per intercettare: il listino dice una cosa,
      // Stripe ne addebita un'altra, e nessuno se ne accorge fino alla contestazione.
      console.log(
        `  ⚠  ${lookupKey}: su Stripe ${euro(esistente.unit_amount)}, nel listino ${euro(importo)} — ` +
          `i prezzi sono immutabili: crea «${lookupKey.replace(/_v(\d+)$/, (_, n) => `_v${Number(n) + 1}`)}»`,
      );
      problemi++;
      return esistente;
    }
    console.log(`  =  ${lookupKey} già presente (${euro(importo)})`);
    gia++;
    return esistente;
  }

  if (!APPLICA) {
    console.log(`  +  ${lookupKey} da creare (${euro(importo)}${ricorrente ? ", annuale" : ", una tantum"})`);
    creati++;
    return null;
  }
  const p = await stripe.prices.create({
    product: productId,
    currency: "eur",
    unit_amount: importo,
    lookup_key: lookupKey,
    ...(ricorrente ? { recurring: { interval: "year" } } : {}),
  });
  console.log(`  +  ${lookupKey} creato (${euro(importo)})`);
  creati++;
  return p;
}

console.log(APPLICA ? "APPLICO le modifiche\n" : "PROVA A VUOTO — niente viene creato. Aggiungi --applica.\n");

console.log("Piani");
for (const piano of Object.values(PIANI)) {
  // Enterprise è a trattativa: non ha prezzi pubblici e non deve averne su Stripe,
  // altrimenti qualcuno prima o poi ci costruisce sopra un checkout.
  if (!piano.lookupAnno1) {
    console.log(`  ·  ${piano.nome}: a trattativa, nessun prezzo`);
    continue;
  }
  const prod = await prodotto(`piano_${piano.key}`, `EvalisDeck — ${piano.nome}`, piano.descrizione);
  // Il LISTINO resta creato anche durante la promozione: e' il prezzo che si mostra
  // barrato e quello che si pratichera' alla scadenza. Un barrato che non corrisponde a
  // nessun prezzo reale sarebbe un numero inventato per fare scena.
  await prezzo(prod.id, piano.lookupAnno1, piano.primoAnno, true);
  await prezzo(prod.id, piano.lookupRinnovo, piano.rinnovo, true);
  await prezzo(prod.id, piano.lookupAnno1Lancio, piano.primoAnnoLancio, true);
  await prezzo(prod.id, piano.lookupRinnovoLancio, piano.rinnovoLancio, true);
}

console.log("\nEstensioni");
for (const [nome, e] of Object.entries(ESTENSIONI)) {
  const importo = e.prezzo ?? e.min;
  const prod = await prodotto(`estensione_${nome}`, `EvalisDeck — ${etichetta(nome)}`, descrizione(nome));
  // L'avvio assistito è una tantum: tutto il resto è annuale come l'abbonamento.
  const ricorrente = nome !== "avvioAssistito";
  await prezzo(prod.id, e.lookup, importo, ricorrente);
  await prezzo(prod.id, e.lookupLancio, e.prezzoLancio ?? e.minLancio, ricorrente);
}

function etichetta(k) {
  return {
    bloccoAziende: "Blocco di 5 aziende",
    accesso: "Accesso aggiuntivo",
    whiteLabel: "Documenti col marchio dello studio",
    avvioAssistito: "Avvio assistito",
  }[k] ?? k;
}
function descrizione(k) {
  return {
    bloccoAziende: "Cinque aziende attive in più, oltre a quelle incluse nel piano.",
    accesso: "Un accesso in più per un collega dello studio.",
    whiteLabel: "I documenti pubblicati portano il nome dello studio invece del nostro.",
    avvioAssistito: "Configurazione iniziale e affiancamento, una tantum.",
  }[k] ?? "";
}

console.log(
  `\n${creati} da creare o creati · ${gia} già presenti · ${problemi} da sistemare a mano` +
    (APPLICA ? "" : "\n\nNiente è stato modificato."),
);
process.exitCode = problemi > 0 ? 1 : 0;
