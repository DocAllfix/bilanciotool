// Inserisce la riga vuota fra i paragrafi dentro `script`.
//
// ⚠️ Il marcatore e' `\n\n` e non un token tipo [[blocco]]: la normalizzazione di Azure lo
// collassa in spazio, quindi non tocca la sintesi, e resta leggibile per un umano che apre
// il file. Un token inventato andrebbe tolto prima di sintetizzare, e il giorno in cui
// qualcuno dimentica di toglierlo la voce lo legge ad alta voce.
//
// I punti di stacco sono DICHIARATI qui, non dedotti dalla punteggiatura: dedurli
// sbaglierebbe proprio dove il testo e' piu' denso, e sbaglierebbe in silenzio.

import { readFileSync, writeFileSync } from "node:fs";

const STACCHI = {
  "_comuni/dove-sei": [
    "La barra laterale segue questa struttura.",
    "Sopra il portafoglio c'e' la pagina di apertura",
    "Una cosa che vale la pena dire subito",
    "E il colore ha un significato preciso.",
  ],
  "energetico/passo-1-sito": [
    "La prima e' lo standard di riferimento.",
    "La seconda scelta e' il perimetro",
    "La terza e' l'unita' di produzione",
    "Il passo si considera completo quando",
    "Qui si caricano il marchio dello studio",
  ],
  "energetico/passo-2-vettori": [
    "Vale la pena sapere da dove arriva ogni numero",
    "Ci sono tre regole che valgono per tutte le righe.",
    "Chiudo con due errori che vedo spesso.",
  ],
  "fornitore/come-si-calcola": [
    "Faccio un esempio",
    "Secondo passaggio: l'indice complessivo",
    "Terzo passaggio: la fascia di prontezza",
    "Poi c'e' un quarto valore",
    "Il piano ordina le azioni con quel numero",
    "E ricorda una cosa che sembra ovvia",
  ],
};

for (const p of ["_comuni/script.json", "energetico/script.json", "fornitore/script.json"]) {
  const d = JSON.parse(readFileSync(p, "utf8"));
  for (const s of d.sezioni) {
    const chiave = `${d.corso}/${s.id}`;
    const stacchi = STACCHI[chiave];
    if (!stacchi) throw new Error(`Nessuno stacco dichiarato per ${chiave}`);
    let t = s.script.replace(/\n\n/g, " ");
    for (const frase of stacchi) {
      const prima = t;
      t = t.replace(frase, `\n\n${frase}`);
      // ⚠️ Una sostituzione che non trova niente non protesta: si contano, non si sperano.
      if (t === prima) throw new Error(`Stacco non trovato in ${chiave}: "${frase}"`);
    }
    s.script = t;
    s.paragrafi = t.split("\n\n").length;
    console.log(`${chiave.padEnd(32)} ${s.paragrafi} paragrafi, ${s.parole} parole`);
  }
  writeFileSync(p, JSON.stringify(d, null, 2) + "\n");
}
