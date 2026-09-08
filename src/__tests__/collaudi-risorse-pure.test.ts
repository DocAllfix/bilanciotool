import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

// UN COLLAUDO CHIUDE CIÒ CHE APRE.
//
// ⚠️ Un pool `postgres` aperto tiene vivo il giro degli eventi: il collaudo fa il suo
// lavoro, stampa il referto, e **il processo non esce mai**. Non fallisce: appende. E chi
// guarda vede un timeout e accusa il prodotto.
//
// Misurato l'8 settembre 2026 durante il giro sull'anteprima. `visual-check-shell` aveva
// scritto la sua ultima schermata dopo venti secondi ed è rimasto appeso **quarantadue
// minuti**; `visual-check-impostazioni`, con lo stesso difetto, ci ha messo **1706 secondi**
// al posto di una manciata. In un giro di cinquantaquattro collaudi due appesi sono un
// metodo che nessuno lancia più — ed è il metodo, non il prodotto, a fermarsi.
//
// ⚠️ La regola era già stata scritta il 2 settembre, dopo che lo stesso `shell` aveva
// bloccato un lotto intero: «un collaudo che non chiude le proprie risorse non fallisce:
// appende». Era rimasta una frase in un documento, e sei giorni dopo il difetto era ancora
// lì, sullo stesso file. Una regola che vive solo in un commento non protegge niente: da
// qui in poi la tiene questo test.

const SCRIPTS = join(process.cwd(), "scripts");

/** I collaudi che aprono una connessione al database. */
function collaudiConDatabase(): { nome: string; testo: string }[] {
  return readdirSync(SCRIPTS)
    .filter((f) => /^(verifica|visual-check)-.*\.mjs$/.test(f))
    .map((nome) => ({ nome, testo: readFileSync(join(SCRIPTS, nome), "utf8") }))
    .filter((f) => /\bpostgres\s*\(/.test(f.testo));
}

describe("le risorse dei collaudi", () => {
  const file = collaudiConDatabase();

  it("ce ne sono, altrimenti questa guardia non guarda niente", () => {
    // Un test che scandisce un elenco vuoto passa sempre: è già successo in questo
    // progetto con un controllo puntato a una cartella che non esiste.
    expect(file.length).toBeGreaterThanOrEqual(20);
  });

  it("⚠️ ogni collaudo che apre il database lo CHIUDE", () => {
    // `sql.end()` è la sola cosa che libera il giro degli eventi. Il `.catch()` che di
    // solito l'accompagna è un dettaglio: qui si chiede che la chiusura ci sia.
    const aperti = file.filter((f) => !/\bsql\.end\s*\(/.test(f.testo)).map((f) => f.nome);
    expect(aperti, "collaudi che appenderebbero il processo invece di uscire").toEqual([]);
  });

  it("il controllo sa diventare rosso", () => {
    // Su un testo finto: senza questa prova la guardia potrebbe non aver mai riconosciuto
    // né l'apertura né la chiusura, e restare verde per sempre.
    const conApertura = 'const sql = postgres(process.env.DATABASE_URL, { max: 2 });';
    expect(/\bpostgres\s*\(/.test(conApertura)).toBe(true);
    expect(/\bsql\.end\s*\(/.test(conApertura)).toBe(false);
    expect(/\bsql\.end\s*\(/.test(conApertura + "\nawait sql.end().catch(() => {});")).toBe(true);
  });
});
