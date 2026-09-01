import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join } from "node:path";

import { NUMERI } from "@/features/formazione/numeri";
import { MODULI_AZIENDA } from "@/features/companies/moduli";
import { sezioniComuni } from "@/features/formazione/comuni";
import { corsoDelModulo } from "@/features/formazione";

// LA FORMAZIONE NON PUÒ CONTENERE UN NUMERO SCRITTO A MANO.
//
// ⚠️ Nasce da un danno reale. `llms.txt` dichiarava «30 derivati automatici» quando
// `deriveKpi` ne calcola **25**: scritto una volta, mai più riletto, su una pagina fatta
// apposta per essere citata. Quel «30» è poi ricomparso in un documento commerciale
// redatto da un consulente esterno che si era fidato di noi.
//
// Un corso è quel tipo di pagina, moltiplicato: chi lo legge non ha modo di verificare, e
// ciò che impara se lo porta davanti a un cliente.
//
// ⚠️ E i due corsi da cui questo materiale proviene descrivevano i PROTOTIPI. Dicevano che
// i dati vivono nel browser, che il backup è un JSON da esportare, che cambiare computer
// significa perdere il lavoro. In EvalisDeck nessuna è vera, e la terza insegnerebbe un
// rito inutile a chi ha i dati al sicuro su un database.

const RADICE = join(process.cwd(), "src", "features", "formazione");

/**
 * I mesi, per riconoscere una data in mezzo alla prosa.
 *
 * ⚠️ «il 25 marzo» è un giorno del calendario, non un conteggio del seme. Senza questa
 * distinzione la guardia segnalerebbe ogni esempio che nomina una data, e una guardia che
 * segnala il falso si smette di leggere — che è il modo più sicuro di perdere anche le
 * segnalazioni vere.
 */
const MESI =
  "(gennaio|febbraio|marzo|aprile|maggio|giugno|luglio|agosto|settembre|ottobre|novembre|dicembre)";

/** I file di CONTENUTO: le sezioni comuni e quelle dei singoli percorsi. */
function fileDiContenuto(): string[] {
  const file = [join(RADICE, "comuni.ts")];
  const corsi = join(RADICE, "corsi");
  if (existsSync(corsi)) {
    for (const f of readdirSync(corsi)) if (f.endsWith(".ts")) file.push(join(corsi, f));
  }
  return file.filter((f) => existsSync(f));
}

/**
 * Il testo senza i commenti.
 *
 * ⚠️ Si tolgono PRIMA, e la ragione è già costata un giro: `moduli-post-pure` cercava
 * `<form onSubmit>` e lo trovava dentro il commento messo lì per spiegare il pericolo.
 * Un controllo misura il codice, non la prosa che lo commenta.
 */
function senzaCommenti(testo: string): string {
  return testo
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .split("\n")
    .map((r) => r.replace(/^\s*\/\/.*$/, ""))
    .join("\n");
}

/**
 * Le eccezioni, una per una, con la ragione scritta.
 *
 * ⚠️ La chiave è la FRASE INTERA e non il numero: così l'eccezione vale per quella frase e
 * per nessun'altra, e SCADE DA SOLA appena qualcuno la riscrive — a quel punto la guardia
 * torna a parlare, invece di restare zitta per sempre su un numero che nel frattempo è
 * diventato un conteggio vero.
 *
 * Un'eccezione per numero («l'8 va bene in energetico.ts») coprirebbe anche il prossimo 8
 * scritto a mano, che è precisamente il caso che questo controllo esiste per cogliere.
 */
const ECCEZIONI: [string, string][] = [
  ["Passi 7 e 8 · Verifica e documento", "ordinali dei passi del percorso, non un conteggio del seme"],
  ["Passi 7 e 8 · Verifica e Rapporto", "ordinali dei passi del percorso"],
  [
    "Che cosa succede al passo 8 lo spiega la sezione «Pubblicare» di questo corso: qui basta ricordare che il documento si costruisce sull'esercizio su cui stai lavorando, e che una volta pubblicato quella versione non cambia più.",
    "ordinale del passo",
  ],
  [
    "Meno 15% di kWh per ora lavorata entro il 2027 rispetto al 2024",
    "esempio di obiettivo misurabile: la percentuale è parte del testo citato, non la soglia delle parole",
  ],
];

describe("i numeri della formazione", () => {
  it("⚠️ sono tutti veri numeri: nessuno è finito a undefined", () => {
    // Il caso che questo controllo ha già colto durante la scrittura:
    // `energy-areas.json` è un OGGETTO, non un elenco, e `.length` dava `undefined`.
    // A schermo sarebbe uscito «undefined aree funzionali», senza nessun errore.
    for (const [nome, v] of Object.entries(NUMERI)) {
      expect(Number.isFinite(v), `NUMERI.${nome} vale ${v}`).toBe(true);
      expect(v, `NUMERI.${nome}`).toBeGreaterThan(0);
    }
  });

  it("coincidono con quello che il prodotto semina davvero", () => {
    expect(NUMERI.moduli).toBe(MODULI_AZIENDA.length);
    expect(NUMERI.vettori).toBe(12);
    expect(NUMERI.usiFinali).toBe(20);
    expect(NUMERI.areeEnergia).toBe(4);
    expect(NUMERI.temi).toBe(18);
    expect(NUMERI.indicatori).toBe(49);
    expect(NUMERI.sezioniKpi).toBe(8);
  });

  it("⚠️ nessun testo del corso scrive a mano un numero che si potrebbe derivare", () => {
    // Si guardano i numeri DISTINTIVI (≥ 8): sono quelli che cambiano quando cambia il
    // seme, e quelli che nessuno pensa a rileggere. Sotto l'otto le cifre compaiono
    // innocentemente ovunque («in 3 minuti», «due colonne») e un controllo che le
    // segnalasse diventerebbe rumore da ignorare — che è il modo più sicuro di perdere
    // anche le segnalazioni vere.
    // ⚠️ Piu' nomi possono valere lo stesso numero (moduli e vettori sono entrambi 12): il
    // messaggio li elenca TUTTI, perche' suggerirne uno a caso manda a scrivere il fratello
    // sbagliato — giusto oggi e falso al primo cambio del seme.
    const derivabili = new Map<number, string[]>();
    for (const [nome, v] of Object.entries(NUMERI)) {
      if (v >= 8) derivabili.set(v, [...(derivabili.get(v) ?? []), nome]);
    }

    const colpe: string[] = [];
    for (const f of fileDiContenuto()) {
      const codice = senzaCommenti(readFileSync(f, "utf8"));
      // Solo dentro le stringhe: `minuti: 3` è un dato della sezione, non testo per chi legge.
      for (const stringa of codice.match(/`[^`]*`|"[^"]*"/g) ?? []) {
        if (stringa.includes("NUMERI.")) continue;
        const nudo = stringa.slice(1, -1);
        if (ECCEZIONI.some(([frase]) => frase === nudo)) continue;
        for (const [valore, nomi] of derivabili) {
          // \\b nel sorgente TS: dentro un template literal un solo \b e' un BACKSPACE,
          // e la guardia non potrebbe mai scattare. Uno strumento che non sa segnare rosso
          // e' peggio di nessuno strumento, perche' sembra presente.
          // ⚠️ Tre forme si escludono per REGOLA, non per eccezione, perché non sono mai
          // conteggi: un numero attaccato a un trattino o a una barra fa parte di un
          // riferimento normativo («ESRS S1-14», «S1-13/16», «25-octies»); un numero
          // seguito dal segno di percento è una quota; un numero seguito da un mese è una
          // data. I conteggi del seme sono sempre numeri di cose, e queste tre distinzioni
          // tengono la guardia utile invece di riempirla di eccezioni scritte a mano.
          const comeConteggio = new RegExp(`(?<![\\d\\-/])${valore}(?![\\d\\-/%])(?! ${MESI})`, "u");
          if (comeConteggio.test(stringa)) {
            const scelte = nomi.map((n) => "${NUMERI." + n + "}").join(" oppure ");
            const file = f.split(/[\\\\\\/]/).pop();
            colpe.push(`${file}: «${valore}» scritto a mano — usa ${scelte}`);
          }
        }
      }
    }
    expect(colpe).toEqual([]);
  });

  it("⚠️ nessuna eccezione è rimasta appesa a una frase che non esiste più", () => {
    // Un'eccezione morta non fa danno oggi e ne fa domani: resta lì a coprire un caso che
    // nessuno ha più sotto gli occhi, e la prossima persona la legge come un permesso.
    // Un elenco tenuto allineato a mano prima o poi non lo è più: qui lo tiene allineato
    // il controllo.
    const tutto = fileDiContenuto()
      .map((f) => readFileSync(f, "utf8"))
      .join("\n");
    const morte = ECCEZIONI.filter(([frase]) => !tutto.includes(frase)).map(([f]) => f.slice(0, 60));
    expect(morte, "eccezioni da togliere").toEqual([]);
  });
});

describe("le sezioni comuni non nominano il prodotto sbagliato", () => {
  // Le formule dei prototipi: se ricompaiono, il corso sta insegnando un altro programma.
  const VIETATE: [RegExp, string][] = [
    [/esport\w*\s+(l'?)?archivio/i, "l'esportazione dell'archivio non esiste"],
    [/import\w*\s+(l'?)?archivio/i, "l'importazione dell'archivio non esiste"],
    [/salva come pdf/i, "il PDF lo genera il server, non la stampa del browser"],
    [/finestra di stampa del browser/i, "il PDF lo genera il server"],
    [/nessun server/i, "i dati stanno su un database, non sul dispositivo"],
    [/nessun account/i, "l'account è obbligatorio"],
    [/dati persi/i, "cambiare computer non perde niente"],
  ];

  it("⚠️ nessuna formula presa dai prototipi", () => {
    // ⚠️ Si guarda il CORSO INTERO, comuni e sezioni proprie insieme. Le sezioni proprie
    // vengono dai due corsi del committente, che descrivevano i prototipi: sono proprio
    // loro il posto dove quelle formule rischiano di sopravvivere, e un controllo che
    // guardasse solo la parte comune sarebbe verde esattamente dove serve.
    const colpe: string[] = [];
    for (const m of MODULI_AZIENDA) {
      const testo = JSON.stringify(corsoDelModulo(m.href).sezioni);
      for (const [re, perche] of VIETATE) {
        if (re.test(testo)) colpe.push(`${m.href}: ${re} — ${perche}`);
      }
    }
    expect(colpe).toEqual([]);
  });

  it("ogni percorso ha le sue sezioni comuni, e sono coerenti", () => {
    for (const m of MODULI_AZIENDA) {
      const s = sezioniComuni(m.href);
      expect(s.length, `${m.href}: nessuna sezione comune`).toBeGreaterThan(4);
      for (const sez of s) {
        expect(sez.minuti, `${m.href}/${sez.id}: minuti`).toBeGreaterThan(0);
        expect(sez.blocchi.length, `${m.href}/${sez.id}: nessun blocco`).toBeGreaterThan(0);
        expect(sez.sommario.length, `${m.href}/${sez.id}: sommario troppo corto`).toBeGreaterThan(30);
      }
      // Gli id sono àncore: due uguali romperebbero la navigazione dentro il corso.
      const id = s.map((x) => x.id);
      expect(new Set(id).size, `${m.href}: id ripetuti`).toBe(id.length);
    }
  });

  it("⚠️ i percorsi ANNUALI parlano di esercizio, le fotografie no", () => {
    // Due percorsi su dodici non sono annuali. Una sezione unica che parlasse di
    // «esercizio» sarebbe falsa proprio per loro, e chi legge sta guardando quella
    // schermata mentre legge: il dettaglio si nota subito.
    for (const m of MODULI_AZIENDA) {
      const id = sezioniComuni(m.href).map((s) => s.id);
      expect(id.includes("esercizio"), `${m.href} (perEsercizio=${m.perEsercizio})`).toBe(m.perEsercizio);
      expect(id.includes("revisione"), `${m.href} (perEsercizio=${m.perEsercizio})`).toBe(!m.perEsercizio);
    }
  });
});
