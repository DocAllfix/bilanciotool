// Estrazione dei REGISTRI dai prototipi: 70 registri e 779 colonne, tutti con lo stesso
// schema. Sono la terza gamba del motore comune, dopo il corpus e i segnaposto.
//
// ── Perché serve una risoluzione iterativa delle dipendenze ──────────────────
//
// `REGDEF` non è un literal autosufficiente: le sue colonne rimandano ad altre costanti
// del prototipo (`SCALA4(...)`, `AMB`, `STATI`…), e ciascun prototipo ha le sue. Ritagliare
// il solo literal e valutarlo fallisce al primo nome sconosciuto.
//
// Invece di elencare a mano le dipendenze di sei file — un elenco che si scopre incompleto
// al primo prototipo aggiornato — si valuta, si legge il nome mancante dall'errore, si va
// a prendere la sua dichiarazione nello stesso file e si riprova. Il ciclo si chiude da
// solo, e se non si chiude lo dice invece di indovinare.

import vm from "node:vm";

/** Ritaglia un literal `const NOME = …` bilanciando parentesi, stringhe escluse. */
export function ritagliaConst(sorgente, nome) {
  const decl = new RegExp(`const\\s+${nome}\\s*=`).exec(sorgente);
  if (!decl) return null;
  let i = decl.index + decl[0].length;
  while (i < sorgente.length && /\s/.test(sorgente[i])) i++;
  const apre = sorgente[i];
  if (apre !== "[" && apre !== "{" && apre !== "(") {
    // Valore semplice: fino al punto e virgola o all'a capo.
    const fine = sorgente.slice(i).search(/[;\n]/);
    return sorgente.slice(i, fine < 0 ? undefined : i + fine);
  }
  let profondita = 0;
  let stringa = null;
  for (let j = i; j < sorgente.length; j++) {
    const c = sorgente[j];
    if (stringa) {
      if (c === "\\") j++;
      else if (c === stringa) stringa = null;
      continue;
    }
    if (c === '"' || c === "'" || c === "`") stringa = c;
    else if (c === "[" || c === "{" || c === "(") profondita++;
    else if (c === "]" || c === "}" || c === ")") {
      profondita--;
      if (profondita === 0) return sorgente.slice(i, j + 1);
    }
  }
  return null;
}

/** Le funzioni ausiliarie che i prototipi usano dentro le definizioni dei registri. */
export function ritagliaFunzione(sorgente, nome) {
  // Sia `const NOME = (a) => …` sia `function NOME(a) { … }`.
  const freccia = new RegExp(`const\\s+${nome}\\s*=\\s*[^;\\n]+`).exec(sorgente);
  if (freccia) return freccia[0];
  const classica = new RegExp(`function\\s+${nome}\\s*\\(`).exec(sorgente);
  if (!classica) return null;
  const corpo = ritagliaConst(sorgente.slice(classica.index), "__mai__");
  void corpo;
  // Il corpo di una funzione: si bilanciano le graffe dalla prima dopo la firma.
  let i = sorgente.indexOf("{", classica.index);
  let profondita = 0;
  for (let j = i; j < sorgente.length; j++) {
    if (sorgente[j] === "{") profondita++;
    else if (sorgente[j] === "}") {
      profondita--;
      if (profondita === 0) return sorgente.slice(classica.index, j + 1);
    }
  }
  return null;
}

/**
 * Valuta `nome` risolvendo da sé le dipendenze che incontra.
 *
 * Il limite di giri non è pigrizia: è la garanzia che un rimando circolare o un nome che
 * non sta nel file si fermino con un messaggio, invece di girare per sempre.
 */
export function valutaConDipendenze(sorgente, nome, giriMax = 40) {
  const contesto = vm.createContext({ Number, String, Math, Object, Array, JSON, Boolean, Date });
  const risolti = new Set();
  const literal = ritagliaConst(sorgente, nome);
  if (!literal) throw new Error(`Costante «${nome}» non trovata`);

  for (let giro = 0; giro < giriMax; giro++) {
    try {
      return vm.runInContext(`(${literal})`, contesto);
    } catch (e) {
      const m = /^(\w+) is not defined$/.exec(String(e.message));
      if (!m) throw e;
      const mancante = m[1];
      if (risolti.has(mancante)) {
        throw new Error(`«${mancante}» risolto ma ancora mancante: dipendenza circolare?`);
      }
      const dip = ritagliaConst(sorgente, mancante) ?? ritagliaFunzione(sorgente, mancante);
      if (!dip) throw new Error(`Dipendenza «${mancante}» di «${nome}» non trovata nel prototipo`);
      // Le funzioni si dichiarano intere, i valori si assegnano.
      const codice = dip.startsWith("function") || dip.startsWith("const")
        ? dip
        : `const ${mancante} = ${dip};`;
      vm.runInContext(codice, contesto);
      risolti.add(mancante);
    }
  }
  throw new Error(`«${nome}»: troppe dipendenze da risolvere (oltre ${giriMax})`);
}

/** I registri di un prototipo, nella forma della tabella `corpus_register`. */
export function registri(sorgente) {
  const grezzi = valutaConDipendenze(sorgente, "REGDEF");
  return grezzi.map((r, i) => ({
    registerId: r.id,
    modCode: r.mod ?? null,
    proCode: r.pro ?? null,
    nome: r.nome ?? r.id,
    descrizione: r.desc ?? null,
    capitolo: r.cap ?? null,
    ordine: i + 1,
    colonne: (r.cols ?? []).map((c, j) => ({
      chiave: c.k,
      etichetta: c.l ?? c.k,
      tipo: c.t ?? "text",
      inTabella: c.tab === 1 || c.tab === true,
      larghezza: c.w ?? null,
      opzioni: Array.isArray(c.o) ? c.o : null,
      prefissoAuto: c.auto ?? null,
      hint: c.hint ?? null,
      ordine: j + 1,
    })),
  }));
}
