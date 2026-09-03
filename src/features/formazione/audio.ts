import mappa from "../../../audio-formazione/audio-map.json";

/**
 * L'audio dei corsi: una traccia per sezione, con le marche temporali dei paragrafi.
 *
 * ⚠️ IL MANIFESTO E' L'UNICA FONTE. Lo produce la sintesi, porta la durata vera del file e
 * l'istante d'inizio di ogni paragrafo misurato dentro l'audio, non stimato. Ricalcolare
 * qui una durata dalle parole significherebbe avere due numeri per la stessa cosa, e il
 * giorno in cui divergono nessuno sa quale sia quello buono.
 *
 * ⚠️ E la chiave e' `<corso>/<sezione_id>`, mai un progressivo: un progressivo si sposta
 * inserendo una sezione in mezzo, e le tracce finirebbero tutte sulla slide sbagliata di
 * uno senza che niente protesti.
 */

export type Marca = { p: number; s: number };
export type Traccia = { durata_s: number; marche: Marca[]; chiave_archivio: string };

const TRACCE = mappa as unknown as Record<string, Traccia>;

/**
 * Dove sta la traccia di una sezione.
 *
 * Le sezioni comuni sono UNA traccia sola riusata da tutti i corsi: sette file per dodici
 * corsi. Duplicarle per corso vorrebbe dire dodici copie da rigenerare a ogni ritocco.
 */
export function chiaveTraccia(corso: string, sezioneId: string, eComune: boolean): string {
  return `${eComune ? "comuni" : corso}/${sezioneId}`;
}

export function traccia(chiave: string): Traccia | null {
  return TRACCE[chiave] ?? null;
}

/**
 * A che secondo mostrare ciascuna slide di una sezione.
 *
 * ⚠️ QUI C'E' UN'APPROSSIMAZIONE, E VA DETTA. Le marche sono per PARAGRAFO del copione, le
 * slide sono per BLOCCO VISIVO della sezione: sono due elenchi diversi, e solo chi ha
 * scritto il copione sa quale paragrafo parla di quale blocco. Una mappa esplicita
 * paragrafo-per-blocco sarebbe esatta e sarebbe un accoppiamento posizionale verso un
 * array senza identificatori: inserendo un avviso a meta' sezione, le slide comincerebbero
 * a cambiare sulla frase sbagliata **senza che niente protesti**.
 *
 * Qui le slide si distribuiscono sui paragrafi in proporzione. Il confine di SEZIONE resta
 * esatto — e' li' che cambia la traccia — mentre dentro una sezione lunga lo stacco puo'
 * cadere un paragrafo prima o dopo. Su 27 sezioni, 16 hanno una o due slide e per quelle
 * non c'e' margine d'errore; il resto ne ha al massimo sette su otto paragrafi.
 */
export function momentiDelleSlide(quanteSlide: number, marche: Marca[]): number[] | null {
  if (marche.length === 0 || quanteSlide <= 0) return null;

  const momenti: number[] = [];
  for (let i = 0; i < quanteSlide; i++) {
    const p = Math.min(Math.floor((i * marche.length) / quanteSlide), marche.length - 1);
    const s = marche[p].s;
    // Con piu' slide che paragrafi due slide cadrebbero sullo stesso istante, e una non si
    // vedrebbe mai: si degrada distanziandole, invece di farne sparire una.
    momenti.push(i > 0 && s <= momenti[i - 1] ? momenti[i - 1] + 0.5 : s);
  }
  return momenti;
}

export type PostoPista = {
  /** L'indirizzo della traccia, solo sulla slide che APRE la sezione. */
  src: string | null;
  /** Il secondo, dentro la traccia della sezione, in cui questa slide deve comparire. */
  momento: number;
  durata: number;
};

/**
 * La pista audio, una voce per slide, nello stesso ordine delle slide.
 *
 * ⚠️ `src` c'e' SOLO sulla slide che apre una sezione, perche' una sezione e' una traccia
 * sola: sulle slide successive la schermata avanza dentro l'audio che sta gia' suonando, e
 * ricaricarlo lo manderebbe da capo proprio mentre chi ascolta ha capito.
 */
export function pistaPerSlide(
  slide: { sezione: { id: string }; apreSezione: boolean }[],
  corso: string,
  idComuni: string[],
): PostoPista[] {
  const pista: PostoPista[] = new Array(slide.length);

  // Le slide si raggruppano per sezione: i momenti si calcolano su quante slide ha QUELLA
  // sezione, non su quante ne ha il corso.
  let i = 0;
  while (i < slide.length) {
    let j = i + 1;
    while (j < slide.length && !slide[j].apreSezione) j++;

    const id = slide[i].sezione.id;
    const t = traccia(chiaveTraccia(corso, id, idComuni.includes(id)));
    const momenti = t ? momentiDelleSlide(j - i, t.marche) : null;

    for (let k = i; k < j; k++) {
      pista[k] = {
        src: k === i && t ? `/api/formazione/audio/${chiaveTraccia(corso, id, idComuni.includes(id))}` : null,
        momento: momenti?.[k - i] ?? 0,
        durata: t?.durata_s ?? 0,
      };
    }
    i = j;
  }
  return pista;
}

/**
 * Quanti minuti di voce ha un corso, e quanti ne ha la sua parte PROPRIA.
 *
 * ⚠️ Le due cose sono diverse e la differenza interessa: le sette sezioni comuni sono una
 * traccia sola riusata da tutti e dodici i corsi, quindi ogni corso ha gia' la voce sui
 * primi undici minuti. Dire soltanto "38 minuti di voce" su un corso e "11" su un altro
 * farebbe sembrare il secondo mezzo vuoto, quando invece la sua parte comune e' identica.
 */
export function minutiDiVoce(
  corso: string,
  sezioni: { id: string }[],
  idComuni: string[],
): { totale: number; proprie: number; completa: boolean } {
  let totale = 0;
  let proprie = 0;
  let conVoce = 0;
  for (const s of sezioni) {
    const eComune = idComuni.includes(s.id);
    const t = traccia(chiaveTraccia(corso, s.id, eComune));
    if (!t) continue;
    conVoce++;
    totale += t.durata_s;
    if (!eComune) proprie += t.durata_s;
  }
  // ⚠️ `completa` esiste per non mentire su un caso reale: un corso con la parte comune e
  // UNA sola sezione propria doppiata mostrava «14 min di voce» come gli altri, e chi
  // apriva si trovava undici sezioni mute. Il numero era vero e l'impressione falsa.
  return {
    totale: Math.round(totale / 60),
    proprie: Math.round(proprie / 60),
    completa: conVoce === sezioni.length,
  };
}
