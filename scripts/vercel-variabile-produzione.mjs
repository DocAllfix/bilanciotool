// Crea una variabile d'ambiente su Vercel valida SOLO in produzione.
//
//   node scripts/vercel-variabile-produzione.mjs NOME valore            → dice cosa farebbe
//   node scripts/vercel-variabile-produzione.mjs NOME valore --applica  → la crea
//
// ⚠️ PERCHÉ SOLO PRODUZIONE. Nasce per `VENDITE_NOTIFICHE_A` (2 ottobre 2026): l'indirizzo
// del committente per la mail di vendita. Se valesse anche nelle anteprime, un collaudo che
// compra con le chiavi di prova arriverebbe al primo cancello con un destinatario vero.
// Il predefinito di Vercel è spuntare tutti e tre gli ambienti, ed è proprio la trappola
// del 26 agosto: qui il bersaglio è scritto nel codice e verificato prima di mandare.
//
// Non sovrascrive: se la variabile esiste già, si ferma e dice dove vale.
//
// ⚠️ Niente `process.exit` dopo una `fetch`: su Windows fa cadere Node con
// «UV_HANDLE_CLOSING». Si imposta `process.exitCode` e si lascia finire il giro.
import { readFileSync } from "node:fs";

async function principale() {
  const [nome, valore] = process.argv.slice(2).filter((a) => !a.startsWith("--"));
  const applica = process.argv.includes("--applica");
  if (!nome || !valore) {
    console.error("uso: node scripts/vercel-variabile-produzione.mjs NOME valore [--applica]");
    return 1;
  }

  const token = readFileSync(".env.vercel", "utf8").match(/^VERCEL_TOKEN=(.*)$/m)?.[1]?.trim();
  if (!token) {
    console.error("Manca VERCEL_TOKEN in .env.vercel");
    return 1;
  }
  const { projectId, orgId, projectName } = JSON.parse(readFileSync(".vercel/project.json", "utf8"));

  const api = async (percorso, init = {}) => {
    const r = await fetch(`https://api.vercel.com${percorso}?teamId=${orgId}`, {
      ...init,
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    });
    if (!r.ok) throw new Error(`${r.status} ${percorso} — ${(await r.text()).slice(0, 200)}`);
    return r.json();
  };

  const esistenti = (await api(`/v9/projects/${projectId}/env`)).envs.filter((v) => v.key === nome);
  if (esistenti.length) {
    for (const v of esistenti) {
      console.log(`${nome} esiste già: ${JSON.stringify(v.target)}${v.gitBranch ? " ramo " + v.gitBranch : ""}`);
    }
    console.log("Non la tocco: si cambia dal pannello, o la si cancella prima.");
    return 1;
  }

  const corpo = { key: nome, value: valore, type: "encrypted", target: ["production"] };
  // Il controllo che vale più della disciplina: il bersaglio si verifica PRIMA di mandare.
  if (JSON.stringify(corpo.target) !== '["production"]') throw new Error("bersaglio non di sola produzione");

  console.log(`Progetto ${projectName}: ${nome} = ${valore}  [solo production]`);
  if (!applica) {
    console.log("(elenco soltanto — rilancia con --applica)");
    return 0;
  }

  await api(`/v10/projects/${projectId}/env`, { method: "POST", body: JSON.stringify(corpo) });
  const dopo = (await api(`/v9/projects/${projectId}/env`)).envs.filter((v) => v.key === nome);
  for (const v of dopo) {
    console.log(`creata: ${nome} ${JSON.stringify(v.target)}${v.gitBranch ? " ramo " + v.gitBranch : ""}`);
  }
  if (dopo.length !== 1 || JSON.stringify(dopo[0].target) !== '["production"]') {
    console.error("⚠️ la variabile non risulta di sola produzione: controllare il pannello");
    return 1;
  }
  return 0;
}

process.exitCode = await principale();
