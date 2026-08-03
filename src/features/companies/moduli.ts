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
    documento: "ghg",
    perEsercizio: true,
  },
  {
    href: "bilancio",
    etichetta: "Bilancio",
    nome: "Bilancio di sostenibilità",
    norma: "GRI · ESRS VSME",
    icona: BookOpen,
    documento: "bilancio",
    perEsercizio: true,
  },
  {
    href: "energetico",
    etichetta: "Energia",
    nome: "Diagnosi energetica",
    norma: "UNI CEI EN 16247",
    icona: Zap,
    documento: "energetico",
    perEsercizio: true,
  },
  {
    href: "fornitore",
    etichetta: "Fornitore",
    nome: "Autovalutazione fornitore",
    norma: "ESRS · ISO 20400",
    icona: BadgeCheck,
    documento: "attestato",
    perEsercizio: false,
  },
  {
    href: "soa",
    etichetta: "SoA",
    nome: "Dichiarazione di Applicabilità",
    norma: "ISO/IEC 27001",
    icona: ShieldCheck,
    documento: "soa",
    perEsercizio: false,
  },
] as const satisfies readonly VoceModulo[];
