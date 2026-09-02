// Carica le tracce audio dei corsi sull'archivio, sotto il prefisso riservato
// `_piattaforma/formazione/<corso>/<sezione>.mp3`.
//
// ⚠️ Non stanno in `public/`: trenta megabyte nel repository lo triplicherebbero, e ogni
// rigenerazione ne aggiungerebbe altrettanti per sempre — la storia di git non dimentica.
// E' la stessa ragione per cui il video di benvenuto sta nell'archivio.
//
// ⚠️ `_piattaforma` e' il prefisso RISERVATO: non puo' essere l'identificativo di
// un'organizzazione, quindi non collide mai con le chiavi di un tenant, che iniziano tutte
// col proprio orgId.
//
//   node scripts/carica-audio-formazione.mjs [--forza]
//
// Senza `--forza` salta le tracce gia' presenti con lo stesso numero di byte: rilanciarlo
// dopo aver rigenerato una traccia sola costa un caricamento, non ventitre'.

import "dotenv/config";
import { readFileSync, existsSync, statSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const RADICE = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const MANIFESTO = resolve(RADICE, "audio-formazione/audio-map.json");
const BUCKET = "media";
const FORZA = process.argv.includes("--forza");

const URL_BASE = process.env.SUPABASE_URL;
const CHIAVE = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!URL_BASE || !CHIAVE) {
  console.error("SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY mancanti in .env");
  process.exit(1);
}

// Il bersaglio si DICHIARA sempre, non solo quando e' quello insolito: un referto che non
// dice contro cosa ha parlato puo' essere verde sull'ambiente sbagliato.
const progetto = new URL(URL_BASE).hostname.split(".")[0];
console.log(`archivio: ${progetto}\n`);

const intestazioni = (extra) => ({ Authorization: `Bearer ${CHIAVE}`, apikey: CHIAVE, ...extra });

const manifesto = JSON.parse(readFileSync(MANIFESTO, "utf8"));
const voci = Object.entries(manifesto);

// La chiave d'archivio la porta il manifesto: comporla qui significherebbe due punti in cui
// la stessa regola puo' divergere, e il giorno in cui divergono nessuno se ne accorge.
let caricate = 0, saltate = 0;
for (const [id, v] of voci) {
  const chiave = v.chiave_archivio;
  if (!chiave?.startsWith("_piattaforma/formazione/")) {
    throw new Error(`${id}: chiave d'archivio fuori dal prefisso riservato: ${chiave}`);
  }
  const file = resolve(RADICE, "audio-formazione", v.mp3);
  if (!existsSync(file)) throw new Error(`${id}: file mancante ${file}`);

  const byte = statSync(file).size;
  if (byte !== v.byte) {
    throw new Error(`${id}: il file pesa ${byte} byte, il manifesto ne dichiara ${v.byte}`);
  }

  if (!FORZA) {
    const gia = await fetch(`${URL_BASE}/storage/v1/object/info/${BUCKET}/${chiave}`, {
      headers: intestazioni(),
    });
    if (gia.ok) {
      const info = await gia.json();
      if (Number(info.size) === byte) {
        saltate++;
        continue;
      }
    }
  }

  const res = await fetch(`${URL_BASE}/storage/v1/object/${BUCKET}/${chiave}`, {
    method: "POST",
    headers: intestazioni({ "Content-Type": "audio/mpeg", "x-upsert": "true" }),
    body: readFileSync(file),
  });
  if (!res.ok) throw new Error(`${id}: caricamento fallito ${res.status} ${await res.text()}`);
  caricate++;
  console.log(`  caricata  ${id.padEnd(34)} ${(byte / 1024 / 1024).toFixed(2)} MB`);
}

console.log(`\n${caricate} caricate, ${saltate} gia' presenti e identiche.`);

// ⚠️ La prova non e' il 200 del caricamento: e' che il file si riesca a RILEGGERE firmato,
// che e' esattamente cio' che fara' il prodotto. Un caricamento riuscito su un bucket
// sbagliato risponde 200 identico.
const [idProva, vProva] = voci[0];
const firma = await fetch(`${URL_BASE}/storage/v1/object/sign/${BUCKET}/${vProva.chiave_archivio}`, {
  method: "POST",
  headers: intestazioni({ "Content-Type": "application/json" }),
  body: JSON.stringify({ expiresIn: 60 }),
});
if (!firma.ok) throw new Error(`firma fallita: ${firma.status} ${await firma.text()}`);
const { signedURL } = await firma.json();
const scarico = await fetch(`${URL_BASE}/storage/v1${signedURL}`);
const scaricati = (await scarico.arrayBuffer()).byteLength;
if (!scarico.ok || scaricati !== vProva.byte) {
  throw new Error(`rilettura fallita: ${scarico.status}, ${scaricati} byte invece di ${vProva.byte}`);
}
console.log(`prova di rilettura: ${idProva} riscaricata firmata, ${scaricati} byte, uguali al manifesto.`);
