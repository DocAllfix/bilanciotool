import type { Blocco, Sezione } from "./tipi";

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
};

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
