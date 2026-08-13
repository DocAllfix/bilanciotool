// Carica il video di benvenuto nell'archivio, una volta sola.
//
//   node scripts/carica-video-benvenuto.mjs "C:/percorso/al/video.mp4"
//
// NON nel repository: tredici megabyte in `public/` raddoppierebbero il peso della
// repo, e ogni rimontaggio del video ne aggiungerebbe altrettanti PER SEMPRE — la
// storia di git non dimentica. Nell'archivio invece un file si sostituisce.
//
// Il bucket e' privato, e va bene: il video si mostra a chi ha gia' fatto l'accesso,
// quindi lo serve una rotta autenticata che firma l'indirizzo al momento.
import { readFileSync } from "node:fs";
import "dotenv/config";

const file = process.argv[2];
if (!file) { console.error("percorso del video mancante"); process.exit(1); }

const URL_BASE = `${process.env.SUPABASE_URL}/storage/v1`;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const BUCKET = "media";
// `_piattaforma` non puo' essere l'identificativo di un'organizzazione (li genera
// Better Auth): il prefisso e' riservato e non collide con nessuno studio.
const CHIAVE = "_piattaforma/onboarding/benvenuto-v1.mp4";

const body = readFileSync(file);
const res = await fetch(`${URL_BASE}/object/${BUCKET}/${CHIAVE}`, {
  method: "POST",
  headers: { Authorization: `Bearer ${KEY}`, apikey: KEY, "Content-Type": "video/mp4", "x-upsert": "true" },
  body,
});
console.log(res.ok ? `  caricato: ${CHIAVE} (${(body.length / 1048576).toFixed(1)} MB)` : `  ERRORE ${res.status}: ${await res.text()}`);
