import type { Blocco, Sezione } from "./tipi";
import { momentiDistillati, sostituisciNumeri, type VoceSlide } from "./slide-distillate";

/**
 * La modalità presentazione: le stesse sezioni del corso, una schermata per volta.
 *
 * ⚠️ LA SLIDE NON MOSTRA LA PROSA, ed è la decisione che regge tutto il resto. Il copione
 * parlato dice qualcosa di DIVERSO dal testo della pagina — la voce spiega, non legge —
 * quindi su una schermata che mostrasse anche la prosa gli occhi leggerebbero una cosa
 * mentre le orecchie ne ascoltano un'altra. Due canali che si contendono la stessa
 * attenzione perdono tutti e due.
 *
 * La slide porta quindi soltanto ciò che la voce NON può portare: una tabella, un riquadro
 * d'avviso, una formula, una riproduzione dell'interfaccia. La prosa la fa la voce.
 *
 * ⚠️ E la pagina che scorre resta, non viene sostituita. Sono due momenti diversi: la prima
 * volta vuoi essere condotto, le volte dopo vuoi trovare UNA cosa — «come si compila il
 * passo 2» — e per quello una presentazione è pessima, perché non si cerca, non si scorre
 * con l'occhio e non si copia un pezzo.
 */

/** I blocchi che stanno su una slide: tutti tranne la prosa. */
function eVisivo(b: Blocco): boolean {
  return b.tipo !== "prosa";
}

/**
 * Quanto spazio occupa un blocco, in unita' arbitrarie.
 *
 * ⚠️ Serve a RIEMPIRE la slide, e nasce da un difetto guardato: con un blocco per slide, una
 * sezione con un solo avviso lasciava settecento pixel di vuoto sopra e sotto. In una vista
 * a schermo pieno il vuoto non e' respiro, e' una schermata che sembra non aver finito di
 * caricarsi. La regola, presa da chi produce deck da anni: o una slide riempie la sua tela,
 * o quel contenuto non e' una slide e va unito al successivo.
 */
function peso(b: Blocco): number {
  if (b.tipo === "tabella") return 3 + b.righe.length;
  if (b.tipo === "elenco") return 2 + b.voci.length;
  if (b.tipo === "interfaccia") return 8; // e' il momento firmato: sta da solo
  if (b.tipo === "formula") return 3;
  return 3 + Math.ceil(b.testo.length / 180); // avviso
}

/** Oltre questo peso una slide e' piena: sotto, si aggiunge il blocco successivo. */
const TELA = 8;

export type Slide = {
  /** La sezione da cui viene: dà titolo, sommario e la traccia audio. */
  sezione: Sezione;
  /**
   * I blocchi da mostrare, raggruppati fino a riempire la tela. Puo' essere VUOTO quando
   * la sezione e' tutta prosa.
   *
   * ⚠️ Il vuoto non e' un caso limite: cinque sezioni su ventuno sono quasi tutte prosa, e
   * su quelle la slide mostra il titolo e il sommario mentre la voce parla. Saltarle
   * romperebbe la sincronia — si vedrebbe la slide dopo mentre si sente quella prima.
   */
  blocchi: Blocco[];
  /**
   * L'indice del blocco DENTRO la sezione, non fra le slide.
   *
   * È la chiave con cui le marche temporali dell'audio faranno avanzare la schermata: le
   * marche sono per paragrafo del copione, e il copione è per sezione.
   */
  indiceBlocco: number;
  /** Progressivo da 1, per la barra di avanzamento. */
  numero: number;
  totale: number;
  /**
   * È la prima slide della sua sezione?
   *
   * ⚠️ Una sezione è UNA traccia audio. La traccia parte solo qui; sulle slide successive
   * la schermata avanza dentro l'audio che sta già suonando, e farlo ripartire lo
   * manderebbe da capo proprio mentre chi ascolta ha capito.
   */
  apreSezione: boolean;
  /**
   * La voce distillata, quando la sezione ne ha: il contenuto a schermo scritto per
   * paragrafo del copione, già coi numeri sostituiti. Quando c'è, `blocchi` è vuoto — la
   * sezione parla con le voci distillate, non più coi suoi blocchi.
   */
  distillata?: VoceSlide;
};

/** Ricopia i testi di una voce sostituendo i segnaposto, a ogni profondità. */
function conNumeri<T>(v: T, numeri: Record<string, number>): T {
  if (typeof v === "string") return sostituisciNumeri(v, numeri) as T;
  if (Array.isArray(v)) return v.map((x) => conNumeri(x, numeri)) as T;
  if (v && typeof v === "object") {
    return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, k === "inizia" ? x : conNumeri(x, numeri)])) as T;
  }
  return v;
}

/**
 * Le slide di un corso intero, con le sezioni distillate dove ci sono.
 *
 * ⚠️ I file `slide.json` arrivano un corso alla volta, e dentro un corso possono coprire
 * solo alcune sezioni. Una sezione con voci distillate si mostra con quelle; una senza
 * resta com'era, coi suoi blocchi. Nessuna delle due strade può rompere l'altra.
 *
 * ⚠️ `momenti` è ESATTO per le sezioni distillate — il secondo in cui comincia il paragrafo
 * da cui la slide parte — e `null` per le altre, che mantengono il criterio proporzionale
 * di `pistaPerSlide`. Mescolare i due criteri in una funzione sola era possibile, ma
 * nasconderebbe quale dei due vale per quale slide.
 */
export function costruisciSlideCorso(
  sezioni: Sezione[],
  ctx: {
    corso: string;
    idComuni: string[];
    mappa: Record<string, VoceSlide[]>;
    numeri: Record<string, number>;
    /** Le marche della traccia di una sezione, per chiave `<corso>/<sezione>`. */
    marche: (chiave: string) => { p: number; s: number }[];
  },
): { slide: Slide[]; momenti: (number | null)[] } {
  const grezze: Omit<Slide, "numero" | "totale">[] = [];
  const momenti: (number | null)[] = [];

  for (const sezione of sezioni) {
    const chiave = `${ctx.idComuni.includes(sezione.id) ? "comuni" : ctx.corso}/${sezione.id}`;
    const voci = ctx.mappa[chiave];

    if (!voci?.length) {
      for (const s of costruisciSlide([sezione])) {
        grezze.push({ sezione: s.sezione, blocchi: s.blocchi, indiceBlocco: s.indiceBlocco, apreSezione: s.apreSezione });
        momenti.push(null);
      }
      continue;
    }

    const esatti = momentiDistillati(voci.map((v) => v.p), ctx.marche(chiave));
    voci.forEach((voce, k) => {
      grezze.push({ sezione, blocchi: [], indiceBlocco: 0, apreSezione: k === 0, distillata: conNumeri(voce, ctx.numeri) });
      momenti.push(esatti ? esatti[k] : null);
    });
  }

  return { slide: grezze.map((s, i) => ({ ...s, numero: i + 1, totale: grezze.length })), momenti };
}

export function costruisciSlide(sezioni: Sezione[]): Slide[] {
  const grezze: Omit<Slide, "numero" | "totale">[] = [];

  for (const sezione of sezioni) {
    const visivi = sezione.blocchi
      .map((blocco, indiceBlocco) => ({ blocco, indiceBlocco }))
      .filter(({ blocco }) => eVisivo(blocco));

    if (visivi.length === 0) {
      grezze.push({ sezione, blocchi: [], indiceBlocco: 0, apreSezione: true });
      continue;
    }

    // Si impilano i blocchi finche' la tela e' piena, poi si comincia una slide nuova.
    let gruppo: Blocco[] = [];
    let inizio = visivi[0].indiceBlocco;
    let carico = 0;
    let prima = true;

    const chiudi = () => {
      grezze.push({ sezione, blocchi: gruppo, indiceBlocco: inizio, apreSezione: prima });
      prima = false;
      gruppo = [];
      carico = 0;
    };

    for (const v of visivi) {
      if (gruppo.length > 0 && carico + peso(v.blocco) > TELA) chiudi();
      if (gruppo.length === 0) inizio = v.indiceBlocco;
      gruppo.push(v.blocco);
      carico += peso(v.blocco);
    }
    if (gruppo.length > 0) chiudi();
  }

  return grezze.map((s, i) => ({ ...s, numero: i + 1, totale: grezze.length }));
}
