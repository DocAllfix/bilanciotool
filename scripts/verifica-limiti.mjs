// Collaudo del limite di frequenza, misurato sulle risposte vere.
//
// Non si controlla la configurazione: si bussa finche' la porta non si chiude, e si
// guarda con che codice. Un limitatore configurato ma inerte ha lo stesso aspetto di
// uno funzionante, finche' non lo si prova.
//
//   node scripts/verifica-limiti.mjs
//
// ATTENZIONE: satura di proposito il contatore di questo indirizzo. Alla fine lo
// azzera, altrimenti gli altri collaudi troverebbero la porta chiusa per cinque minuti.

import postgres from "postgres";
import "dotenv/config";

const BASE = (process.env.BASE ?? "http://localhost:3000").replace(/\/+$/, "");
let ok = 0, ko = 0;
const check = async (nome, fn) => {
  try { await fn(); ok++; console.log("  ok   " + nome); }
  catch (e) { ko++; console.log("  KO   " + nome + " -> " + String(e.message).split("\n")[0]); }
};

const sql = postgres(process.env.DATABASE_URL, { prepare: false, max: 2 });
const azzera = () => sql`delete from rate_limit`;

const login = (email) =>
  fetch(`${BASE}/api/auth/sign-in/email`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email, password: "PasswordSbagliata123!" }),
  });

await azzera();

let codici = [];
await check("dopo dieci accessi sbagliati la porta si chiude con 429", async () => {
  codici = [];
  for (let i = 0; i < 13; i++) {
    const r = await login(`nessuno-${Date.now()}@example.com`);
    codici.push(r.status);
  }
  const primo429 = codici.indexOf(429);
  if (primo429 === -1) throw new Error("nessun 429 in tredici tentativi: " + codici.join(","));
  // Dieci concessi, l'undicesimo no. Il limite e' sull'indirizzo, non sull'account:
  // cambiare email a ogni tentativo non deve aiutare, ed e' cio' che fa questo giro.
  if (primo429 !== 10) throw new Error(`si e' chiusa al tentativo ${primo429 + 1}, non all'11: ${codici.join(",")}`);
});

await check("le richieste concesse rispondono 401, non 200", async () => {
  // Se un accesso con password sbagliata riuscisse, il 429 sarebbe l'ultimo dei problemi.
  const concessi = codici.slice(0, 10);
  if (concessi.some((c) => c === 200)) throw new Error("un accesso sbagliato e' riuscito: " + concessi.join(","));
});

await check("il 429 dice quanto aspettare", async () => {
  const r = await login("nessuno@example.com");
  if (r.status !== 429) throw new Error("mi aspettavo di essere ancora bloccato, ho avuto " + r.status);
  const retry = r.headers.get("x-retry-after") ?? r.headers.get("retry-after");
  if (!retry || !Number.isFinite(Number(retry))) throw new Error("nessuna indicazione di attesa: " + retry);
});

await check("il contatore vive sul database, non nella memoria dell'istanza", async () => {
  // E' la ragione per cui la tabella esiste: su Vercel la memoria non e' condivisa e un
  // contatore per istanza si azzera a ogni avvio a freddo.
  const righe = await sql`select key, count from rate_limit`;
  if (!righe.length) throw new Error("nessuna riga: il limitatore sta contando altrove");
  if (!righe.some((r) => r.count >= 10)) throw new Error("conteggio non registrato: " + JSON.stringify(righe));
});

await check("le pagine normali non sono limitate", async () => {
  // Il freno sta sulle rotte di autenticazione: se toccasse la navigazione, il rimedio
  // sarebbe peggiore del male.
  for (let i = 0; i < 15; i++) {
    const r = await fetch(`${BASE}/`);
    if (r.status !== 200) throw new Error(`la home ha risposto ${r.status} al giro ${i + 1}`);
  }
});

await azzera();
await check("il contatore si azzera per i collaudi successivi", async () => {
  const r = await login("nessuno@example.com");
  if (r.status === 429) throw new Error("ancora bloccato dopo l'azzeramento");
});
await azzera();

await sql.end();
console.log(`\nControlli: ${ok} ok, ${ko} falliti`);
if (ko > 0) process.exitCode = 1;
