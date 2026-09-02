// TEMPORANEO — esporta i corsi della formazione in JSON, con i NUMERI gia' risolti.
import { writeFileSync } from "node:fs";
import { tuttiICorsi, TRASVERSALI } from "./src/features/formazione/index";

const out = {
  percorsi: tuttiICorsi().map((c) => ({
    chiave: c.modulo, nome: c.nome, norma: c.norma,
    completo: c.completo, minuti: c.minuti, sezioni: c.sezioni,
  })),
  trasversali: Object.entries(TRASVERSALI).map(([chiave, t]) => ({
    chiave, nome: t.nome, sottotitolo: t.sottotitolo, sezioni: t.sezioni,
  })),
};
writeFileSync(process.argv[2], JSON.stringify(out, null, 1), "utf8");
console.log(`percorsi: ${out.percorsi.length} | trasversali: ${out.trasversali.length}`);
