import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

// UN MODULO CON `onSubmit` DEVE DICHIARARE `method="post"`.
//
// ⚠️ Nasce da un difetto trovato sul deploy di ANTEPRIMA, il 26 agosto 2026, e da nessuna
// altra parte: in locale l'idratazione e' istantanea e il caso non si presenta mai.
//
// Un `<form onSubmit={…}>` senza `method` e' un modulo **GET** verso l'indirizzo corrente:
// e' il predefinito di HTML. Finche' React e' attivo non succede niente, perche'
// `onSubmit` chiama `preventDefault`. Ma **prima dell'idratazione** — o se il bundle non
// arriva — l'invio e' quello nativo, e i campi finiscono nella QUERY STRING.
//
// Sul modulo di accesso questo significa la password:
//
//   /login?email=…%40example.com&password=Collaudo-…%21
//
// che e' esattamente quello che e' comparso nella barra degli indirizzi. Da li' la
// password entra nella cronologia del browser, nei log del server e di ogni proxy, e
// nell'intestazione `Referer` delle richieste successive.
//
// La correzione costa un attributo: con `method="post"` un invio pre-idratazione manda i
// campi nel CORPO, dove nessuno li registra. Il comportamento dopo l'idratazione non
// cambia di una virgola, perche' `preventDefault` continua a fermare tutto.
//
// ⚠️ I moduli con `action={…}` non sono in questo elenco: sono server action di React, che
// inviano in POST per costruzione.

const RADICI = [join(process.cwd(), "src", "app"), join(process.cwd(), "src", "components")];

function tsx(dir: string): string[] {
  const out: string[] = [];
  for (const voce of readdirSync(dir)) {
    const p = join(dir, voce);
    if (statSync(p).isDirectory()) out.push(...tsx(p));
    else if (p.endsWith(".tsx")) out.push(p);
  }
  return out;
}

const FILE = RADICI.flatMap(tsx);

/**
 * I tag di modulo di un file, con i loro attributi.
 *
 * ⚠️ I COMMENTI SI TOLGONO PRIMA. Un commento che SPIEGA il difetto contiene la stringa
 * che lo descrive, e questo controllo lo contava come un modulo scoperto: è successo il
 * 27 agosto 2026 su una nota messa lì proprio per non rifare l'errore.
 *
 * Stessa famiglia dello scanner che cercava «azione:» senza confine di parola e trovava
 * «consultazione:»: un controllo misura il CODICE, non la prosa che lo commenta. E il
 * rimedio comodo — riscrivere il commento perché il controllo non scatti — sarebbe il
 * verso sbagliato: si piegherebbe la documentazione a uno strumento difettoso.
 */
function moduli(testo: string): string[] {
  const codice = testo
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .split("\n")
    .map((r) => r.replace(/^\s*\/\/.*$/, ""))
    .join("\n");
  return [...codice.matchAll(/<form\b([^>]*)>/g)].map((m) => m[1] ?? "");
}

describe("i moduli non mettono i campi nell'indirizzo", () => {
  it("ogni <form onSubmit> dichiara method=\"post\"", () => {
    const scoperti: string[] = [];
    let controllati = 0;
    for (const f of FILE) {
      const testo = readFileSync(f, "utf8");
      for (const attributi of moduli(testo)) {
        if (!/\bonSubmit\b/.test(attributi)) continue;
        controllati++;
        if (!/\bmethod=["']post["']/i.test(attributi)) scoperti.push(relative(process.cwd(), f));
      }
    }
    // ⚠️ Un controllo che scandisce cartelle deve morire se non trova niente: senza questa
    // riga, un giorno in cui il percorso cambiasse passerebbe guardando zero moduli.
    expect(controllati).toBeGreaterThan(10);
    expect(scoperti).toEqual([]);
  });
});
