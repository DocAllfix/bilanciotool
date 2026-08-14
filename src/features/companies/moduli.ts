import { BadgeCheck, BookOpen, Factory, ShieldCheck, Zap, type LucideIcon } from "lucide-react";
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

export const MODULI = ["ghg", "bilancio", "energetico", "fornitore", "soa"] as const;
export type ModuloAzienda = (typeof MODULI)[number];

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
  /** Classi Tailwind del colore del modulo, nei tre stati in cui compare.
   *  Stanno qui e non sparse nei componenti perche il colore di un modulo deve
   *  essere lo stesso ovunque: card, fascicolo, banda dei servizi, archivio.
   *  I token sono definiti in globals.css (`--modulo-*`) e documentati in
   *  DESIGN.md; il contrasto e stato verificato su entrambi i temi. */
  colore: {
    /** Fondo pieno + icona in negativo: il percorso ha prodotto un documento. */
    pieno: string;
    /** Contorno e fondo tenue: il percorso e avviato ma non consegnato. */
    tenue: string;
    /** Solo il colore del tratto, per barre e segni. */
    tratto: string;
  };
  /** Documento che il modulo pubblica. */
  documento: TipoDocumento;
  /** true se il lavoro è per esercizio (rotta `/[anno]`), false se è una
   *  fotografia corrente con revisioni. */
  perEsercizio: boolean;
};

export const MODULI_AZIENDA = [
  {
    href: "ghg",
    etichetta: "GHG",
    nome: "Inventario GHG",
    norma: "ISO 14064-1",
    icona: Factory,
    colore: {
      pieno: "bg-modulo-ghg text-white",
      tenue: "border-modulo-ghg/35 bg-modulo-ghg/10 text-modulo-ghg",
      tratto: "bg-modulo-ghg",
    },
    documento: "ghg",
    perEsercizio: true,
  },
  {
    href: "bilancio",
    etichetta: "Bilancio",
    nome: "Bilancio di sostenibilità e conformità ESG",
    norma: "GRI · ESRS VSME",
    icona: BookOpen,
    colore: {
      pieno: "bg-modulo-bilancio text-white",
      tenue: "border-modulo-bilancio/35 bg-modulo-bilancio/10 text-modulo-bilancio",
      tratto: "bg-modulo-bilancio",
    },
    documento: "bilancio",
    perEsercizio: true,
  },
  {
    href: "energetico",
    etichetta: "Energia",
    nome: "Bilancio energetico",
    norma: "UNI CEI EN 16247",
    icona: Zap,
    colore: {
      pieno: "bg-modulo-energetico text-white",
      tenue: "border-modulo-energetico/35 bg-modulo-energetico/10 text-modulo-energetico",
      tratto: "bg-modulo-energetico",
    },
    documento: "energetico",
    perEsercizio: true,
  },
  {
    href: "fornitore",
    etichetta: "Fornitore",
    nome: "Autovalutazione ESG",
    norma: "ESRS · ISO 20400",
    icona: BadgeCheck,
    colore: {
      pieno: "bg-modulo-fornitore text-white",
      tenue: "border-modulo-fornitore/35 bg-modulo-fornitore/10 text-modulo-fornitore",
      tratto: "bg-modulo-fornitore",
    },
    documento: "attestato",
    perEsercizio: false,
  },
  {
    href: "soa",
    etichetta: "SoA",
    nome: "Statement of Applicability (SoA)",
    norma: "ISO/IEC 27001",
    icona: ShieldCheck,
    colore: {
      pieno: "bg-modulo-soa text-white",
      tenue: "border-modulo-soa/35 bg-modulo-soa/10 text-modulo-soa",
      tratto: "bg-modulo-soa",
    },
    documento: "soa",
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
