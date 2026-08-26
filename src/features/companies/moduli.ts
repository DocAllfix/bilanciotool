import { BadgeCheck, BookOpen, ClipboardCheck, Compass, Factory, Gavel, HeartHandshake, Megaphone, Network, Scale, ShieldCheck, Zap, type LucideIcon } from "lucide-react";
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

export const MODULI = ["ghg", "energetico", "bilancio", "sgesg", "fornitore", "mog231", "anticorruzione", "segnalazioni", "filiera", "sgiqas", "sa8000", "soa"] as const;
export type ModuloAzienda = (typeof MODULI)[number];


// ─── Gruppi ──────────────────────────────────────────────────────────────────
//
// ⚠️ EMENDAMENTO DELIBERATO a `DESIGN.md`, che diceva «un modulo, un colore».
// Undici tinte distinguibili su due temi, tutte sopra AA, non esistono. Quindi
// **un gruppo un colore, un modulo un'icona** — la tinta dice la materia,
// l'icona dice il percorso.
//
// ⚠️ LA PARTIZIONE E' DEL COMMITTENTE, dettata a voce il 25 agosto 2026, e i due
// nomi che ha usato sono i suoi:
//
//   «Gruppo ecosostenibilita' e ci metti bilancio di sostenibilita', bilancio
//    energetico, autovalutazione conformita' ESG e implementazione sistema di
//    gestione ESG.»
//   «Gruppo compliance e ci metti 231, 37001, whistleblowing e due diligence.»
//
// I quattro moduli che non ha nominato sono stati collocati cosi': l'Inventario
// GHG in ecosostenibilita' (alimenta il bilancio, e' la stessa catena), e SGI QAS,
// SA8000 e SoA in un terzo gruppo. Quei tre hanno in comune una cosa sola ma
// decisiva: **sono certificabili da un ente terzo**, con audit periodici e non
// conformita'. Metterli in «compliance» avrebbe fatto di quel gruppo un sacco —
// obblighi di legge e certificazioni volontarie insieme — e il gruppo del
// committente sarebbe smesso di essere quello che ha descritto.
//
// Si passa da cinque aree per materia a tre gruppi, e la riduzione e' il punto:
// con undici percorsi in fila la card del portafoglio faceva 5+5+1, con
// l'ultima casella orfana. Undici caselle non si riordinano meglio, si
// raggruppano.
export const AREE_MODULI = ["ecosostenibilita", "compliance", "sistemi"] as const;
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
// ⚠️ `breve` non e' un vezzo: sulla card del portafoglio ogni gruppo ha un terzo di
// larghezza, e «Sistemi di gestione» non ci sta — si troncherebbe a «Sistemi di ges…».
// L'etichetta corta sta QUI e non nel componente perche' il nome di un gruppo e' del
// registro: scritta a schermo, la seconda superficie che la mostra la sceglierebbe
// diversa, ed e' cosi' che due pagine cominciano a chiamare la stessa cosa in due modi.
export const AREE = {
  ecosostenibilita: {
    nome: "Ecosostenibilità",
    breve: "Ecosostenibilità",
    colore: {
      pieno: "bg-area-ecosostenibilita text-white",
      tenue: "border-area-ecosostenibilita/35 bg-area-ecosostenibilita/10 text-area-ecosostenibilita",
      tratto: "bg-area-ecosostenibilita",
    },
  },
  compliance: {
    nome: "Compliance",
    breve: "Compliance",
    colore: {
      pieno: "bg-area-compliance text-white",
      tenue: "border-area-compliance/35 bg-area-compliance/10 text-area-compliance",
      tratto: "bg-area-compliance",
    },
  },
  sistemi: {
    nome: "Sistemi di gestione",
    breve: "Sistemi",
    colore: {
      pieno: "bg-area-sistemi text-white",
      tenue: "border-area-sistemi/35 bg-area-sistemi/10 text-area-sistemi",
      tratto: "bg-area-sistemi",
    },
  },
} as const satisfies Record<AreaModuli, { nome: string; breve: string; colore: ColoreArea }>;

export type VoceModulo = {
  /** Segmento di rotta sotto `/aziende/[companyId]/`. */
  href: ModuloAzienda;
  /** Il nome del modulo. **Uno solo**, e vale ovunque.
   *
   * ⚠️ Qui c'era anche `etichetta`, una versione corta «per le caselle strette del
   * portafoglio». Quelle caselle erano undici, larghe un quinto di card, e dalla Fase 1
   * (25 agosto 2026) non esistono piu': la card porta tre caselle di gruppo. Il campo e'
   * sopravvissuto alla riorganizzazione come residuo, usato in due soli punti — e nel
   * frattempo cinque etichette su dodici avevano smesso di essere un accorciamento del
   * nome per diventare UN'ALTRA PAROLA: «Fornitore» per «Autovalutazione ESG»,
   * «ISO 37001» per «Prevenzione della corruzione».
   *
   * Chi leggeva «Fornitore» nel portafoglio e lo cercava nella barra laterale non lo
   * trovava. Non e' un dettaglio estetico: e' un fallimento di navigazione, e nessun
   * collaudo funzionale poteva vederlo perche' entrambe le pagine si aprono e i
   * collegamenti funzionano.
   *
   * Il campo non e' stato «corretto»: e' stato tolto. Un pericolo si evita, non si
   * filtra — senza secondo nome, due nomi non possono divergere. */
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
   *  scadenzario, fascicolo, stato del percorso. L'ordine non e' decorativo.
   *
   *  ⚠️ E puo' essere VUOTO, il che significa «questo percorso non pubblica ancora».
   *  Era una tupla non vuota, e la garanzia era comoda: il primo elemento esisteva
   *  sempre. Ma quel tipo mi avrebbe costretto, per registrare un percorso i cui
   *  documenti arrivano piu' avanti, a inventare un tipo di documento senza template —
   *  cioe' a rendere possibile pubblicare un documento vuoto e consegnarlo a un
   *  cliente. Meglio perdere la garanzia e gestire il vuoto nei tre punti che leggono
   *  `documenti[0]`: il fascicolo, lo scadenzario e la guida. Un percorso che esiste
   *  prima di produrre qualcosa non e' un caso teorico, e' come nascono tutti. */
  documenti: readonly TipoDocumento[];
  /** true se il lavoro è per esercizio (rotta `/[anno]`), false se è una
   *  fotografia corrente con revisioni. */
  perEsercizio: boolean;
};

// ⚠️ L'ORDINE E' PER GRUPPO, e non e' estetico: da questo elenco discendono la card
// del portafoglio, il fascicolo, la barra laterale, la guida e l'itinerario del giro
// guidato. Raggruppati qui, sono raggruppati ovunque; sparsi qui, ogni superficie si
// riscriverebbe il proprio ordine — che e' esattamente com'erano i cinque moduli prima
// che questo registro esistesse.
//
// Dentro ogni gruppo l'ordine e' quello che il committente ha dettato, dove l'ha
// dettato: 231, 37001, whistleblowing, due diligence.
export const MODULI_AZIENDA = [
  // ─── Ecosostenibilità ──────────────────────────────────────────────────────
  // La catena di un lavoro solo: che cosa consumi, che cosa emetti, come lo
  // racconti, come ti valuti.
  {
    href: "ghg",
    nome: "Inventario GHG",
    norma: "ISO 14064-1",
    icona: Factory,
    area: "ecosostenibilita",
    colore: AREE.ecosostenibilita.colore,
    documenti: ["ghg"],
    perEsercizio: true,
  },
  {
    href: "energetico",
    nome: "Bilancio energetico",
    norma: "UNI CEI EN 16247",
    icona: Zap,
    area: "ecosostenibilita",
    colore: AREE.ecosostenibilita.colore,
    documenti: ["energetico"],
    perEsercizio: true,
  },
  {
    href: "bilancio",
    nome: "Bilancio di sostenibilità e conformità ESG",
    norma: "GRI · ESRS VSME",
    icona: BookOpen,
    area: "ecosostenibilita",
    colore: AREE.ecosostenibilita.colore,
    documenti: ["bilancio"],
    perEsercizio: true,
  },
  {
    href: "sgesg",
    nome: "Implementazione del sistema di gestione ESG",
    // Non e' una norma: e' il metodo. Si dichiara verso quale standard il lavoro
    // rendicontera', perche' e' quello che il consulente cerca leggendo la riga.
    norma: "GRI · ESRS",
    icona: Compass,
    area: "ecosostenibilita",
    colore: AREE.ecosostenibilita.colore,
    // I quattro documenti del metodo. Il primo e' quello che rappresenta il percorso
    // dove ne serve uno solo (scadenzario, fascicolo, stato): il dossier di chiusura,
    // perche' e' cio' che dice che l'incarico e' finito.
    documenti: ["dossier_finale", "offerta_esg", "verbale_avvio", "diagnosi_esg"],
    perEsercizio: true,
  },
  {
    href: "fornitore",
    nome: "Autovalutazione ESG",
    norma: "ESRS · ISO 20400",
    icona: BadgeCheck,
    // ⚠️ Separata dalla Due diligence di filiera, che sta in «compliance», ed e' una
    // scelta del committente. Le due guardano davvero da parti opposte: qui il cliente
    // valuta se' stesso per rispondere a un committente — e' la sua postura ESG, roba
    // da mostrare al mercato — mentre la due diligence e' un obbligo che discende dalla
    // CSDDD. Il ponte fra le due (la partita IVA su `chain_partner`) attraversera' due
    // gruppi, e va bene: il gruppo e' navigazione, non e' un confine di dominio.
    area: "ecosostenibilita",
    colore: AREE.ecosostenibilita.colore,
    documenti: ["attestato"],
    perEsercizio: false,
  },
  // ─── Compliance ────────────────────────────────────────────────────────────
  // Obblighi che gravano sull'ente, non scelte volontarie. Il gruppo del
  // committente, nel suo ordine.
  {
    href: "mog231",
    nome: "Modello 231",
    norma: "D.Lgs. 231/2001",
    icona: Gavel,
    area: "compliance",
    colore: AREE.compliance.colore,
    // La Matrice reati-processi e' cio' che un giudice guarda per primo, quindi e' il
    // documento principale; la Relazione dell'OdV e' periodica e ha un destinatario
    // interno all'ente.
    documenti: ["matrice_231", "relazione_odv"],
    perEsercizio: false,
  },
  {
    href: "anticorruzione",
    nome: "Prevenzione della corruzione",
    norma: "UNI ISO 37001",
    icona: Scale,
    area: "compliance",
    colore: AREE.compliance.colore,
    // Due uscite, il principale per primo: la Relazione e' cio' che si porta all'organo
    // di governo, la Matrice e' cio' che l'auditor sfoglia. La prima rappresenta il
    // modulo dove ne serve una sola (scadenzario, fascicolo, stato del percorso).
    documenti: ["relazione_pc", "matrice_pc"],
    perEsercizio: false,
  },
  {
    href: "segnalazioni",
    nome: "Gestione delle segnalazioni",
    norma: "D.Lgs. 24/2023",
    icona: Megaphone,
    // I tre che precedono sono legati per legge: il Modello 231 contiene gia' una
    // procedura sul canale di segnalazione (art. 6 c. 2-quater), e ISO 37001 ha i
    // propri registri di segnalazione e indagine. Chi apre uno dei tre, prima o poi
    // apre gli altri.
    area: "compliance",
    colore: AREE.compliance.colore,
    // ⚠️ Un documento solo, ed e' una decisione. La Relazione periodica e' aggregata e
    // puo' essere consegnata; il FASCICOLO della singola segnalazione no — non per la
    // riservatezza soltanto, ma perche' la chiave di un documento pubblicato e'
    // (azienda, tipo, anno, versione) e per il fascicolo manca l'asse «quale
    // fascicolo». Vedi la migrazione 0028.
    documenti: ["relazione_wb"],
    perEsercizio: false,
  },
  {
    href: "filiera",
    nome: "Due diligence di filiera",
    norma: "Linee guida OCSE · CSDDD",
    icona: Network,
    area: "compliance",
    colore: AREE.compliance.colore,
    documenti: ["dichiarazione_filiera"],
    perEsercizio: false,
  },
  // ─── Sistemi di gestione ───────────────────────────────────────────────────
  // I tre certificabili da un ente terzo, con audit periodici e non conformita'.
  // E' il gruppo che il committente non ha nominato: sono i moduli che restavano,
  // e questa e' la cosa che hanno in comune.
  {
    href: "sgiqas",
    nome: "Sistema di gestione integrato QAS",
    norma: "ISO 9001 · 14001 · 45001",
    icona: ClipboardCheck,
    area: "sistemi",
    colore: AREE.sistemi.colore,
    documenti: ["riesame_qas", "analisi_ambientale", "valutazione_ssl"],
    perEsercizio: false,
  },
  {
    href: "sa8000",
    nome: "Sistema di gestione SA8000/2026",
    // ⚠️ L'anno fa parte del nome, ed e' una richiesta esplicita del committente: le
    // norme si datano perche' si superano, e un sistema costruito sull'edizione
    // precedente non e' lo stesso sistema.
    norma: "SA8000:2026",
    icona: HeartHandshake,
    // ⚠️ CAMBIO DI COLLOCAZIONE DA FAR CONFERMARE. Stava con il Bilancio, e la ragione
    // scritta allora era «e' rendicontazione sociale, non un sistema certificabile di
    // processo» — partizione confermata dal committente. Qui sta con QAS e SoA perche'
    // e' certificato da enti accreditati SAI con audit periodici: la stessa natura
    // degli altri due. Il committente non l'ha nominato nei due gruppi che ha dettato,
    // quindi questa e' una nostra lettura e va detta ad alta voce, non lasciata qui.
    area: "sistemi",
    colore: AREE.sistemi.colore,
    documenti: ["manuale_sa8000"],
    perEsercizio: false,
  },
  {
    href: "soa",
    nome: "Statement of Applicability (SoA)",
    norma: "ISO/IEC 27001",
    icona: ShieldCheck,
    area: "sistemi",
    colore: AREE.sistemi.colore,
    documenti: ["soa"],
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
 * I moduli raggruppati, nell'ordine dei gruppi.
 *
 * Si deriva da `MODULI_AZIENDA` e non si scrive a mano: un modulo aggiunto al registro
 * compare da solo nel proprio gruppo. I gruppi senza moduli non compaiono — oggi sono
 * tutti pieni, ma un'intestazione vuota sarebbe una promessa non mantenuta a schermo, e
 * il caso si ripresenta ogni volta che si apre un gruppo prima dei moduli che lo abitano.
 */
export const MODULI_PER_AREA = AREE_MODULI.map((area) => ({
  area,
  nome: AREE[area].nome,
  breve: AREE[area].breve,
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
