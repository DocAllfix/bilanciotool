import { BadgeCheck, BookOpen, ClipboardCheck, Factory, Gavel, HeartHandshake, Megaphone, Network, Scale, ShieldCheck, Zap, type LucideIcon } from "lucide-react";
import type { TipoDocumento } from "@/features/documents/tipi";

// Registro dei moduli di lavoro di un'azienda: SOLI DATI, importabile anche dai
// componenti client. Sta accanto a `documents/tipi.ts` e non dentro, perché sono
// due cose diverse che oggi coincidono: il MODULO è il posto dove si lavora, il
// DOCUMENTO è ciò che se ne pubblica. Un modulo potrebbe un domani produrne due,
// o nessuno.
//
// Esiste perché i cinque moduli erano ricopiati a mano in ogni punto che li
// elencava: aggiungendone uno restavano indietro in silenzio, e nella card del
// portafoglio gli ultimi due finivano fuori dal bordo, irraggiungibili.

export const MODULI = ["ghg", "bilancio", "energetico", "fornitore", "soa", "anticorruzione", "mog231", "segnalazioni", "sgiqas", "sa8000", "filiera"] as const;
export type ModuloAzienda = (typeof MODULI)[number];


// ─── Aree ────────────────────────────────────────────────────────────────────
//
// Il prodotto passa da cinque moduli a undici, e a undici l'elenco piatto smette
// di funzionare: e' gia' successo una volta, quando i moduli passarono da due a
// cinque e gli ultimi due finirono fuori dal bordo della card.
//
// ⚠️ EMENDAMENTO DELIBERATO a `DESIGN.md`, che diceva «un modulo, un colore».
// Undici tinte distinguibili su due temi, tutte sopra AA, non esistono: il cerchio
// e' gia' occupato a 190·155·68·300·250. Quindi **un'area un colore, un modulo
// un'icona** — la tinta dice la materia, l'icona dice il percorso.
//
// La partizione e' quella confermata dal committente (per materia), con la
// rifinitura a cinque aree adottata come impostazione di lavoro: si rivede quando
// gli undici moduli si vedono a schermo, e costa una riga per modulo.
export const AREE_MODULI = [
  "ambiente",
  "sostenibilita",
  "filiera",
  "sistemi",
  "responsabilita",
] as const;
export type AreaModuli = (typeof AREE_MODULI)[number];

export type ColoreArea = {
  /** Fondo pieno + icona in negativo: il percorso ha prodotto un documento. */
  pieno: string;
  /** Contorno e fondo tenue: il percorso e' avviato ma non consegnato. */
  tenue: string;
  /** Solo il colore del tratto, per barre e segni. */
  tratto: string;
};

// ⚠️ LE CLASSI SI SCRIVONO PER ESTESO, mai costruite con un template literal.
//
// Tailwind genera le utility scandendo il TESTO dei sorgenti: `bg-area-${a}` non e'
// una classe che esiste da nessuna parte, quindi non ne genera nessuna e i riquadri
// restano senza fondo. Provato: con la versione derivata, delle cinque aree solo
// «ambiente» aveva il colore — e ce l'aveva **per caso**, perche' `bg-area-ambiente`
// compare scritto per esteso in un esempio dentro `DESIGN.md`, che il scanner legge.
//
// Un difetto che il compilatore non puo' vedere (le stringhe sono valide) e che i
// collaudi funzionali non vedono (la pagina si apre, i comandi rispondono): si vede
// solo guardando. Le classi letterali qui erano una decisione, non ripetizione.
export const AREE = {
  ambiente: {
    nome: "Ambiente ed energia",
    colore: {
      pieno: "bg-area-ambiente text-white",
      tenue: "border-area-ambiente/35 bg-area-ambiente/10 text-area-ambiente",
      tratto: "bg-area-ambiente",
    },
  },
  sostenibilita: {
    nome: "Sostenibilità e rendicontazione",
    colore: {
      pieno: "bg-area-sostenibilita text-white",
      tenue: "border-area-sostenibilita/35 bg-area-sostenibilita/10 text-area-sostenibilita",
      tratto: "bg-area-sostenibilita",
    },
  },
  filiera: {
    nome: "Filiera",
    colore: {
      pieno: "bg-area-filiera text-white",
      tenue: "border-area-filiera/35 bg-area-filiera/10 text-area-filiera",
      tratto: "bg-area-filiera",
    },
  },
  sistemi: {
    nome: "Sistemi di gestione",
    colore: {
      pieno: "bg-area-sistemi text-white",
      tenue: "border-area-sistemi/35 bg-area-sistemi/10 text-area-sistemi",
      tratto: "bg-area-sistemi",
    },
  },
  responsabilita: {
    nome: "Responsabilità dell'ente",
    colore: {
      pieno: "bg-area-responsabilita text-white",
      tenue: "border-area-responsabilita/35 bg-area-responsabilita/10 text-area-responsabilita",
      tratto: "bg-area-responsabilita",
    },
  },
} as const satisfies Record<AreaModuli, { nome: string; colore: ColoreArea }>;

export type VoceModulo = {
  /** Segmento di rotta sotto `/aziende/[companyId]/`. */
  href: ModuloAzienda;
  /** Etichetta corta, per le caselle strette del portafoglio. */
  etichetta: string;
  /** Etichetta estesa, per titoli e menu. */
  nome: string;
  /** Norma di riferimento, mostrata dove c'è spazio. */
  norma: string;
  icona: LucideIcon;
  /** Area di appartenenza: da qui viene il COLORE. */
  area: AreaModuli;
  /** Classi Tailwind del colore, nei tre stati in cui compare. Non si scrivono
   *  qui: si derivano dall'area (vedi `AREE`), perche' due moduli della stessa
   *  materia devono avere la stessa tinta ovunque. */
  colore: ColoreArea;
  /** Documenti pubblicabili del modulo, **il principale per primo**.
   *
   *  Era un valore singolo, e reggeva finche' un modulo produceva un documento
   *  solo. I sei moduli in arrivo ne producono da due a sei ciascuno, e il primo
   *  dell'elenco e' quello che rappresenta il modulo dove serve un documento solo:
   *  scadenzario, fascicolo, stato del percorso. L'ordine non e' decorativo. */
  documenti: readonly [TipoDocumento, ...TipoDocumento[]];
  /** true se il lavoro è per esercizio (rotta `/[anno]`), false se è una
   *  fotografia corrente con revisioni. */
  perEsercizio: boolean;
};

// ⚠️ L'ORDINE E' PER AREA, e non e' estetico: da questo elenco discendono la card
// del portafoglio, il fascicolo, la barra laterale, la guida e l'itinerario del giro
// guidato. Raggruppati qui, sono raggruppati ovunque; sparsi qui, ogni superficie si
// riscriverebbe il proprio ordine — che e' esattamente com'erano i cinque moduli prima
// che questo registro esistesse.
export const MODULI_AZIENDA = [
  {
    href: "ghg",
    etichetta: "GHG",
    nome: "Inventario GHG",
    norma: "ISO 14064-1",
    icona: Factory,
    area: "ambiente",
    colore: AREE.ambiente.colore,
    documenti: ["ghg"],
    perEsercizio: true,
  },
  {
    href: "energetico",
    etichetta: "Energia",
    nome: "Bilancio energetico",
    norma: "UNI CEI EN 16247",
    icona: Zap,
    area: "ambiente",
    colore: AREE.ambiente.colore,
    documenti: ["energetico"],
    perEsercizio: true,
  },
  {
    href: "bilancio",
    etichetta: "Bilancio",
    nome: "Bilancio di sostenibilità e conformità ESG",
    norma: "GRI · ESRS VSME",
    icona: BookOpen,
    area: "sostenibilita",
    colore: AREE.sostenibilita.colore,
    documenti: ["bilancio"],
    perEsercizio: true,
  },
  {
    href: "sa8000",
    etichetta: "SA8000/2026",
    nome: "Sistema di gestione SA8000/2026",
    // ⚠️ L'anno fa parte del nome, ed e' una richiesta esplicita del committente: le
    // norme si datano perche' si superano, e un sistema costruito sull'edizione
    // precedente non e' lo stesso sistema.
    norma: "SA8000:2026",
    icona: HeartHandshake,
    // Stessa area del Bilancio: e' rendicontazione sociale, non un sistema certificabile
    // di processo. E' la partizione confermata dal committente.
    area: "sostenibilita",
    colore: AREE.sostenibilita.colore,
    documenti: ["manuale_sa8000"],
    perEsercizio: false,
  },
  {
    href: "fornitore",
    etichetta: "Fornitore",
    nome: "Autovalutazione ESG",
    norma: "ESRS · ISO 20400",
    icona: BadgeCheck,
    area: "filiera",
    colore: AREE.filiera.colore,
    documenti: ["attestato"],
    perEsercizio: false,
  },
  {
    href: "filiera",
    etichetta: "Filiera",
    nome: "Due diligence di filiera",
    norma: "Linee guida OCSE · CSDDD",
    icona: Network,
    // ⚠️ Stessa area dell'Autovalutazione fornitore, e guarda dalla parte OPPOSTA: la'
    // il cliente valuta se' stesso per rispondere a un committente, qui valuta i propri
    // fornitori. Sono le due estremita' dello stesso rapporto, e stanno insieme.
    area: "filiera",
    colore: AREE.filiera.colore,
    documenti: ["dichiarazione_filiera"],
    perEsercizio: false,
  },
  {
    href: "soa",
    etichetta: "SoA",
    nome: "Statement of Applicability (SoA)",
    norma: "ISO/IEC 27001",
    icona: ShieldCheck,
    area: "sistemi",
    colore: AREE.sistemi.colore,
    documenti: ["soa"],
    perEsercizio: false,
  },
  {
    href: "sgiqas",
    etichetta: "SGI QAS",
    nome: "Sistema di gestione integrato QAS",
    norma: "ISO 9001 · 14001 · 45001",
    icona: ClipboardCheck,
    // Stessa area della SoA: sono i due sistemi di gestione CERTIFICABILI del prodotto.
    // ⚠️ E la voce sta QUI, prima di «anticorruzione», perche' l'ordine del registro
    // raggruppa per area: un modulo lontano dai suoi farebbe comparire la stessa
    // intestazione due volte nella barra laterale. Lo verifica `navigazione.db.test.ts`.
    area: "sistemi",
    colore: AREE.sistemi.colore,
    documenti: ["riesame_qas", "analisi_ambientale", "valutazione_ssl"],
    perEsercizio: false,
  },
  {
    href: "anticorruzione",
    etichetta: "ISO 37001",
    nome: "Prevenzione della corruzione",
    norma: "UNI ISO 37001",
    icona: Scale,
    area: "responsabilita",
    colore: AREE.responsabilita.colore,
    // Due uscite, il principale per primo: la Relazione e' cio' che si porta all'organo
    // di governo, la Matrice e' cio' che l'auditor sfoglia. La prima rappresenta il
    // modulo dove ne serve una sola (scadenzario, fascicolo, stato del percorso).
    documenti: ["relazione_pc", "matrice_pc"],
    perEsercizio: false,
  },
  {
    href: "mog231",
    etichetta: "231",
    nome: "Modello 231",
    norma: "D.Lgs. 231/2001",
    icona: Gavel,
    area: "responsabilita",
    colore: AREE.responsabilita.colore,
    // La Matrice reati-processi e' cio' che un giudice guarda per primo, quindi e' il
    // documento principale; la Relazione dell'OdV e' periodica e ha un destinatario
    // interno all'ente.
    documenti: ["matrice_231", "relazione_odv"],
    perEsercizio: false,
  },
  {
    href: "segnalazioni",
    etichetta: "Segnalazioni",
    nome: "Gestione delle segnalazioni",
    norma: "D.Lgs. 24/2023",
    icona: Megaphone,
    // Terzo modulo della responsabilita' dell'ente, e i tre sono legati per legge: il
    // Modello 231 contiene gia' una procedura sul canale di segnalazione (art. 6 c.
    // 2-quater), e ISO 37001 ha i propri registri di segnalazione e indagine. Chi apre
    // uno dei tre, prima o poi apre gli altri.
    area: "responsabilita",
    colore: AREE.responsabilita.colore,
    // ⚠️ Un documento solo, ed e' una decisione. La Relazione periodica e' aggregata e
    // puo' essere consegnata; il FASCICOLO della singola segnalazione no — non per la
    // riservatezza soltanto, ma perche' la chiave di un documento pubblicato e'
    // (azienda, tipo, anno, versione) e per il fascicolo manca l'asse «quale
    // fascicolo». Vedi la migrazione 0028.
    documenti: ["relazione_wb"],
    perEsercizio: false,
  },
] as const satisfies readonly VoceModulo[];

/**
 * L'indirizzo della pagina di lavoro di un modulo.
 *
 * Sostituisce i cinque aiutanti `percorso(companyId)` che ogni `features/*\/actions.ts`
 * si era scritto: quattro differivano per un solo letterale, e il quinto — energetico —
 * era l'unico a includere l'esercizio.
 *
 * ⚠️ Quell'unicità era una divergenza, non una scelta. `CLAUDE.md` registra la regola
 * nata in Fase 12: «`revalidatePath` deve puntare alla pagina dell'esercizio, non al
 * percorso padre: `/aziende/X/energetico` non invalida `/aziende/X/energetico/2025`».
 * La correzione fu applicata a energetico e non tornò indietro su GHG e Bilancio, che
 * hanno la stessa sottopagina `[anno]`.
 *
 * Oggi non si vede, perché quelle pagine sono `force-dynamic` e non c'è cache da
 * invalidare. Si vedrebbe il giorno in cui si togliesse `force-dynamic` per guadagnare
 * in velocità: due moduli su tre mostrerebbero numeri fermi dopo un salvataggio, e il
 * terzo no. Derivando l'indirizzo da `perEsercizio` la differenza non può più nascere.
 */
export function percorsoModulo(companyId: string, modulo: ModuloAzienda, anno?: number): string {
  const base = `/aziende/${companyId}/${modulo}`;
  const voce = MODULI_AZIENDA.find((m) => m.href === modulo);
  return voce?.perEsercizio && anno !== undefined ? `${base}/${anno}` : base;
}

/**
 * I moduli raggruppati per area, nell'ordine delle aree.
 *
 * Si deriva da `MODULI_AZIENDA` e non si scrive a mano: un modulo aggiunto al registro
 * compare da solo nel proprio gruppo. Le aree senza moduli non compaiono — oggi ce n'e'
 * una (la responsabilita' dell'ente, che si popola col Modello 231), e un'intestazione
 * vuota sarebbe una promessa non mantenuta a schermo.
 */
export const MODULI_PER_AREA = AREE_MODULI.map((area) => ({
  area,
  nome: AREE[area].nome,
  colore: AREE[area].colore,
  moduli: MODULI_AZIENDA.filter((m) => m.area === area),
})).filter((g) => g.moduli.length > 0);

/**
 * L'area a cui appartiene un tipo di documento, o `null` se non lo produce un modulo.
 *
 * Si deriva dal registro e non si scrive a mano: e' il ponte fra il documento
 * archiviato e la materia di cui parla, e serve all'archivio per raggruppare. Il
 * `null` non e' un caso teorico: i documenti del corpus dei sistemi di gestione non
 * nascono da un percorso, e un raggruppamento che li desse per assenti li nasconderebbe.
 */
export function areaDelDocumento(tipo: TipoDocumento): AreaModuli | null {
  const m = MODULI_AZIENDA.find((x) => (x.documenti as readonly TipoDocumento[]).includes(tipo));
  return m ? m.area : null;
}

/** I tipi di documento prodotti dai moduli di un'area, nell'ordine del registro. */
export function tipiDellArea(area: AreaModuli): TipoDocumento[] {
  return MODULI_AZIENDA.filter((m) => m.area === area).flatMap((m) => [...m.documenti]);
}
